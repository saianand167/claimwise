import { Router, Response } from 'express';
import { z } from 'zod';
import { Claim, ClaimStatus } from '../models/Claim';
import { Policy } from '../models/Policy';
import { ClaimDocument } from '../models/Document';
import { Prediction } from '../models/Prediction';
import { ClaimAssignment } from '../models/ClaimAssignment';
import { InvestigationNote } from '../models/InvestigationNote';
import { User } from '../models/User';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validatePolicyForClaim } from '../services/policyValidationService';
import { predictClaimRisk, queryClaimAssistant } from '../services/mlService';
import { createNotification, logAudit } from '../services/auditService';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { status, riskLevel, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (req.user!.role === 'customer') {
      filter.customerId = req.user!.id;
    } else if (req.user!.role === 'officer') {
      filter.assignedOfficerId = req.user!.id;
    }

    if (status && status !== 'All') filter.status = status;
    if (search && typeof search === 'string') {
      const rx = { $regex: search.trim(), $options: 'i' };
      filter.$or = [{ claimId: rx }, { policyNumber: rx }, { claimType: rx }];
    }

    const claims = await Claim.find(filter)
      .populate('customerId', 'name email phone')
      .populate('assignedOfficerId', 'name email department')
      .populate('policyId')
      .sort({ createdAt: -1 })
      .lean();

    const claimIds = claims.map((c) => c._id);
    const predictions = await Prediction.find({ claimId: { $in: claimIds } }).lean();
    const predMap = new Map(predictions.map((p) => [p.claimId.toString(), p]));

    let enriched = claims.map((c) => ({
      ...c,
      prediction: predMap.get(c._id.toString()) || null,
    }));

    if (riskLevel && riskLevel !== 'All') {
      enriched = enriched.filter((c) => c.prediction?.riskLevel === riskLevel);
    }

    res.json({ claims: enriched });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('assignedOfficerId', 'name email department')
      .populate('policyId')
      .lean();

    if (!claim) {
      res.status(404).json({ message: 'Claim not found' });
      return;
    }

    if (req.user!.role === 'customer' && (claim.customerId as any)._id.toString() !== req.user!.id) {
      res.status(403).json({ message: 'Access denied to this claim' });
      return;
    }

    const [documents, prediction, notes] = await Promise.all([
      ClaimDocument.find({ claimId: claim._id }).sort({ createdAt: -1 }),
      Prediction.findOne({ claimId: claim._id }),
      InvestigationNote.find({ claimId: claim._id }).sort({ createdAt: -1 }),
    ]);

    res.json({ claim, documents, prediction, notes });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  authenticate,
  authorize('customer', 'admin'),
  upload.array('documents', 5),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const schema = z.object({
        policyNumber: z.string().min(3),
        claimType: z.string().min(2),
        incidentDate: z.string(),
        claimAmount: z.coerce.number().positive(),
        description: z.string().min(10),
        incidentHour: z.coerce.number().min(0).max(23).optional(),
        witnessesCount: z.coerce.number().min(0).optional(),
        policeReportFiled: z.union([z.boolean(), z.string()]).optional(),
      });

      const body = schema.parse(req.body);
      const incidentDate = new Date(body.incidentDate);
      const policy = await Policy.findOne({ policyNumber: body.policyNumber.toUpperCase().trim() });
      const files = (req.files as Express.Multer.File[]) || [];

      const validationResult = validatePolicyForClaim({
        policy,
        customerId: req.user!.id,
        incidentDate,
        claimAmount: body.claimAmount,
      });

      const priorClaimsCount = await Claim.countDocuments({ customerId: req.user!.id });
      const claimId = `CLM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Determine initial workflow status (never auto-reject on validation/ML warning)
      let initialStatus: ClaimStatus = files.length === 0 ? 'Pending Documents' : 'Under Review';

      // Auto-assign to officer with fewest active claims
      const officers = await User.find({ role: 'officer', isActive: true });
      let assignedOfficer = officers[0] || null;
      if (officers.length > 1) {
        const counts = await Promise.all(
          officers.map(async (o) => ({
            officer: o,
            count: await Claim.countDocuments({ assignedOfficerId: o._id, status: { $nin: ['Approved', 'Rejected'] } }),
          }))
        );
        counts.sort((a, b) => a.count - b.count);
        assignedOfficer = counts[0].officer;
      }

      const statusHistory = [
        { status: 'Submitted' as ClaimStatus, changedBy: req.user!.id as any, note: 'Claim submitted by customer', timestamp: new Date() },
        {
          status: 'Processing' as ClaimStatus,
          note: validationResult.isValid
            ? 'Automated policy validation passed'
            : `Policy validation flagged warnings: ${validationResult.warnings.join(' | ')}`,
          timestamp: new Date(),
        },
        {
          status: initialStatus,
          note: files.length === 0 ? 'Awaiting supporting documents' : 'Routed to claims officer for review',
          timestamp: new Date(),
        },
      ];

      const policeReport = body.policeReportFiled === true || body.policeReportFiled === 'true';

      const claim = await Claim.create({
        claimId,
        policyId: policy?._id,
        policyNumber: body.policyNumber.toUpperCase().trim(),
        customerId: req.user!.id,
        claimType: body.claimType,
        incidentDate,
        claimAmount: body.claimAmount,
        description: body.description,
        incidentHour: body.incidentHour ?? 14,
        witnessesCount: body.witnessesCount ?? 1,
        policeReportFiled: policeReport,
        status: initialStatus,
        validationResult,
        statusHistory,
        assignedOfficerId: assignedOfficer?._id,
      });

      // Save uploaded documents
      if (files.length > 0) {
        await ClaimDocument.insertMany(
          files.map((f) => ({
            claimId: claim._id,
            uploadedBy: req.user!.id,
            originalName: f.originalname,
            storedName: f.filename,
            mimeType: f.mimetype,
            size: f.size,
            url: `/uploads/${f.filename}`,
            verified: true,
          }))
        );
      }

      // Compute ML features & call FastAPI ML service
      const policyAgeDays = policy
        ? Math.max(1, Math.round((incidentDate.getTime() - policy.startDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 30;
      const daysToReport = Math.max(0, Math.round((Date.now() - incidentDate.getTime()) / (1000 * 60 * 60 * 24)));
      const dayOfWeek = incidentDate.getDay();

      const mlResult = await predictClaimRisk({
        policy_type: policy?.policyType || 'Auto',
        claim_type: body.claimType,
        claim_amount: body.claimAmount,
        policy_coverage: policy?.coverageAmount || body.claimAmount,
        policy_age_days: policyAgeDays,
        days_to_report: daysToReport,
        prior_claims_count: priorClaimsCount,
        incident_hour: body.incidentHour ?? 14,
        witnesses_count: body.witnessesCount ?? 1,
        police_report_filed: policeReport ? 1 : 0,
        document_count: files.length,
        is_weekend_incident: dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0,
        description_length: body.description.length,
      });

      const prediction = await Prediction.create({
        claimId: claim._id,
        ...mlResult,
      });

      if (assignedOfficer) {
        await ClaimAssignment.create({
          claimId: claim._id,
          officerId: assignedOfficer._id,
          status: 'Active',
        });
        await createNotification({
          userId: assignedOfficer._id as any,
          title: `New Claim Assigned: ${claim.claimId}`,
          message: `A ${mlResult.riskLevel}-risk ${claim.claimType} claim ($${claim.claimAmount.toLocaleString()}) has been assigned to you.`,
          claimId: claim._id as any,
        });
      }

      await createNotification({
        userId: req.user!.id,
        title: `Claim ${claim.claimId} Submitted`,
        message: `Your claim is currently "${claim.status}".`,
        claimId: claim._id as any,
      });

      await logAudit({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'CLAIM_SUBMITTED',
        entityType: 'Claim',
        entityId: claim.claimId,
        details: `Amount: $${claim.claimAmount}, ML Risk: ${mlResult.riskLevel} (${Math.round(mlResult.riskScore * 100)}%)`,
      });

      res.status(201).json({ claim, prediction });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/documents',
  authenticate,
  upload.array('documents', 5),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const claim = await Claim.findById(req.params.id);
      if (!claim) {
        res.status(404).json({ message: 'Claim not found' });
        return;
      }
      if (req.user!.role === 'customer' && claim.customerId.toString() !== req.user!.id) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }

      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        res.status(400).json({ message: 'Please attach at least one PDF, JPG, or PNG file' });
        return;
      }

      const docs = await ClaimDocument.insertMany(
        files.map((f) => ({
          claimId: claim._id,
          uploadedBy: req.user!.id,
          originalName: f.originalname,
          storedName: f.filename,
          mimeType: f.mimetype,
          size: f.size,
          url: `/uploads/${f.filename}`,
          verified: true,
        }))
      );

      if (claim.status === 'Pending Documents' || claim.status === 'Additional Information Required') {
        claim.status = 'Under Review';
        claim.statusHistory.push({
          status: 'Under Review',
          changedBy: req.user!.id as any,
          note: `Customer uploaded ${files.length} additional document(s)`,
          timestamp: new Date(),
        });
        await claim.save();
      }

      await logAudit({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'DOCUMENTS_UPLOADED',
        entityType: 'Claim',
        entityId: claim.claimId,
        details: `${files.length} file(s) uploaded`,
      });

      res.status(201).json({ documents: docs, claim });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/:id/notes', authenticate, authorize('officer', 'admin'), async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      note: z.string().min(2),
      noteType: z.enum(['Investigation', 'InfoRequest', 'Decision']).default('Investigation'),
    });
    const { note, noteType } = schema.parse(req.body);
    const claim = await Claim.findById(req.params.id);
    if (!claim) {
      res.status(404).json({ message: 'Claim not found' });
      return;
    }

    const created = await InvestigationNote.create({
      claimId: claim._id,
      authorId: req.user!.id,
      authorName: req.user!.name,
      note,
      noteType,
    });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'INVESTIGATION_NOTE_ADDED',
      entityType: 'Claim',
      entityId: claim.claimId,
    });

    res.status(201).json({ note: created });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/assign', authenticate, authorize('admin'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { officerId } = z.object({ officerId: z.string().min(1) }).parse(req.body);
    const [claim, officer] = await Promise.all([
      Claim.findById(req.params.id),
      User.findOne({ _id: officerId, role: 'officer' }),
    ]);

    if (!claim || !officer) {
      res.status(404).json({ message: 'Claim or Claims Officer not found' });
      return;
    }

    await ClaimAssignment.updateMany({ claimId: claim._id, status: 'Active' }, { status: 'Reassigned' });
    await ClaimAssignment.create({
      claimId: claim._id,
      officerId: officer._id,
      assignedBy: req.user!.id,
      status: 'Active',
    });

    claim.assignedOfficerId = officer._id as any;
    claim.statusHistory.push({
      status: claim.status,
      changedBy: req.user!.id as any,
      note: `Assigned to officer ${officer.name}`,
      timestamp: new Date(),
    });
    await claim.save();

    await createNotification({
      userId: officer._id as any,
      title: `Claim Assigned: ${claim.claimId}`,
      message: `Admin assigned claim ${claim.claimId} to you for review.`,
      claimId: claim._id as any,
    });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CLAIM_ASSIGNED',
      entityType: 'Claim',
      entityId: claim.claimId,
      details: `Assigned to ${officer.email}`,
    });

    res.json({ claim });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/decision', authenticate, authorize('officer', 'admin'), async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      status: z.enum(['Approved', 'Rejected', 'Additional Information Required', 'Under Review']),
      reason: z.string().min(3),
    });
    const { status, reason } = schema.parse(req.body);

    const claim = await Claim.findById(req.params.id);
    if (!claim) {
      res.status(404).json({ message: 'Claim not found' });
      return;
    }

    claim.status = status;
    claim.decisionReason = reason;
    claim.statusHistory.push({
      status,
      changedBy: req.user!.id as any,
      note: reason,
      timestamp: new Date(),
    });
    await claim.save();

    await InvestigationNote.create({
      claimId: claim._id,
      authorId: req.user!.id,
      authorName: req.user!.name,
      note: `[${status}] ${reason}`,
      noteType: status === 'Additional Information Required' ? 'InfoRequest' : 'Decision',
    });

    if (status === 'Approved' || status === 'Rejected') {
      await ClaimAssignment.updateMany({ claimId: claim._id, status: 'Active' }, { status: 'Completed' });
    }

    await createNotification({
      userId: claim.customerId,
      title: `Claim ${claim.claimId}: ${status}`,
      message: reason,
      claimId: claim._id as any,
    });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CLAIM_DECISION',
      entityType: 'Claim',
      entityId: claim.claimId,
      details: `Status -> ${status}: ${reason}`,
    });

    res.json({ claim });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/assistant', authenticate, authorize('officer', 'admin'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { question } = z.object({ question: z.string().min(1) }).parse(req.body);
    const claim = await Claim.findById(req.params.id).lean();
    if (!claim) {
      res.status(404).json({ message: 'Claim not found' });
      return;
    }
    const [prediction, notes] = await Promise.all([
      Prediction.findOne({ claimId: claim._id }).lean(),
      InvestigationNote.find({ claimId: claim._id }).lean(),
    ]);

    const response = await queryClaimAssistant({ question, claim, prediction, notes });
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;

