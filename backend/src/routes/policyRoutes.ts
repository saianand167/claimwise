import { Router, Response } from 'express';
import { z } from 'zod';
import { Policy } from '../models/Policy';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validatePolicyForClaim } from '../services/policyValidationService';
import { logAudit } from '../services/auditService';

const router = Router();

const policySchema = z.object({
  policyNumber: z.string().min(3).optional(),
  customerId: z.string().min(1),
  policyType: z.enum(['Health', 'Auto', 'Property', 'Life']),
  coverageAmount: z.number().positive(),
  premium: z.number().nonnegative(),
  startDate: z.string(),
  expiryDate: z.string(),
  status: z.enum(['Active', 'Expired', 'Suspended', 'Cancelled']).default('Active'),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { search, status, policyType } = req.query;
    const filter: Record<string, unknown> = {};

    if (req.user!.role === 'customer') {
      filter.customerId = req.user!.id;
    }
    if (status && status !== 'All') filter.status = status;
    if (policyType && policyType !== 'All') filter.policyType = policyType;
    if (search && typeof search === 'string') {
      filter.policyNumber = { $regex: search.trim(), $options: 'i' };
    }

    const policies = await Policy.find(filter)
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ policies });
  } catch (err) {
    next(err);
  }
});

router.post('/validate', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      policyNumber: z.string().min(1),
      incidentDate: z.string(),
      claimAmount: z.number().positive(),
    });
    const { policyNumber, incidentDate, claimAmount } = schema.parse(req.body);
    const policy = await Policy.findOne({ policyNumber: policyNumber.toUpperCase().trim() });
    const customerId = req.user!.role === 'customer' ? req.user!.id : policy?.customerId.toString() || '';

    const validation = validatePolicyForClaim({
      policy,
      customerId,
      incidentDate: new Date(incidentDate),
      claimAmount,
    });

    res.json({ validation, policy });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = policySchema.parse(req.body);
    const policyNumber =
      data.policyNumber?.toUpperCase().trim() ||
      `POL-${data.policyType.slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const policy = await Policy.create({
      ...data,
      policyNumber,
      startDate: new Date(data.startDate),
      expiryDate: new Date(data.expiryDate),
    });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'POLICY_CREATED',
      entityType: 'Policy',
      entityId: policy.policyNumber,
      details: `${policy.policyType} policy with $${policy.coverageAmount} coverage`,
    });

    const populated = await policy.populate('customerId', 'name email phone');
    res.status(201).json({ policy: populated });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = policySchema.partial().parse(req.body);
    const updateData: Record<string, unknown> = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.expiryDate) updateData.expiryDate = new Date(data.expiryDate);

    const policy = await Policy.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate(
      'customerId',
      'name email phone'
    );
    if (!policy) {
      res.status(404).json({ message: 'Policy not found' });
      return;
    }

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'POLICY_UPDATED',
      entityType: 'Policy',
      entityId: policy.policyNumber,
    });

    res.json({ policy });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response, next) => {
  try {
    const policy = await Policy.findByIdAndDelete(req.params.id);
    if (!policy) {
      res.status(404).json({ message: 'Policy not found' });
      return;
    }

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'POLICY_DELETED',
      entityType: 'Policy',
      entityId: policy.policyNumber,
    });

    res.json({ message: 'Policy deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;

