import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { Policy } from '../models/Policy';
import { Claim } from '../models/Claim';
import { Prediction } from '../models/Prediction';
import { AuditLog } from '../models/AuditLog';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';
import { getMlMetrics } from '../services/mlService';

const router = Router();

router.get('/users', authenticate, authorize('admin'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { role } = req.query;
    const filter: Record<string, unknown> = {};
    if (role && role !== 'All') filter.role = role;
    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.post('/users', authenticate, authorize('admin'), async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['customer', 'officer', 'admin']),
      department: z.string().optional(),
      phone: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const exists = await User.findOne({ email: data.email.toLowerCase() });
    if (exists) {
      res.status(409).json({ message: 'Email already exists' });
      return;
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      department: data.department,
      phone: data.phone,
    });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'USER_CREATED_BY_ADMIN',
      entityType: 'User',
      entityId: user.email,
      details: `Role: ${user.role}`,
    });

    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, isActive: user.isActive },
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      isActive: z.boolean().optional(),
      role: z.enum(['customer', 'officer', 'admin']).optional(),
      department: z.string().optional(),
    });
    const updates = schema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-passwordHash');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user.email,
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.get('/analytics', authenticate, authorize('admin', 'officer'), async (_req: AuthRequest, res: Response, next) => {
  try {
    const [
      totalCustomers,
      totalOfficers,
      totalPolicies,
      claims,
      predictions,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'officer' }),
      Policy.countDocuments(),
      Claim.find().lean(),
      Prediction.find().lean(),
    ]);

    const approvedClaims = claims.filter((c) => c.status === 'Approved').length;
    const rejectedClaims = claims.filter((c) => c.status === 'Rejected').length;
    const pendingClaims = claims.filter((c) => !['Approved', 'Rejected'].includes(c.status)).length;
    const totalClaimAmount = claims.reduce((sum, c) => sum + c.claimAmount, 0);

    const riskDistribution = ['Low', 'Medium', 'High'].map((level) => ({
      name: level,
      value: predictions.filter((p) => p.riskLevel === level).length,
    }));

    const categoryMap = new Map<string, { category: string; count: number; amount: number }>();
    for (const c of claims) {
      const entry = categoryMap.get(c.claimType) || { category: c.claimType, count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += c.claimAmount;
      categoryMap.set(c.claimType, entry);
    }

    const monthMap = new Map<string, { month: string; claims: number; amount: number }>();
    for (const c of claims) {
      const d = new Date(c.createdAt || c.incidentDate);
      const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const entry = monthMap.get(label) || { month: label, claims: 0, amount: 0 };
      entry.claims += 1;
      entry.amount += c.claimAmount;
      monthMap.set(label, entry);
    }

    let mlMetrics: unknown = null;
    try {
      mlMetrics = await getMlMetrics();
    } catch {
      mlMetrics = null;
    }

    res.json({
      summary: {
        totalCustomers,
        totalOfficers,
        totalPolicies,
        totalClaims: claims.length,
        approvedClaims,
        rejectedClaims,
        pendingClaims,
        totalClaimAmount,
      },
      riskDistribution,
      categoryBreakdown: Array.from(categoryMap.values()),
      monthlyTrends: Array.from(monthMap.values()),
      mlMetrics,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/audit-logs', authenticate, authorize('admin'), async (_req: AuthRequest, res: Response, next) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

export default router;

