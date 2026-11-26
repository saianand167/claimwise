import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Policy } from '../models/Policy';
import { Claim } from '../models/Claim';
import { Prediction } from '../models/Prediction';
import { ClaimAssignment } from '../models/ClaimAssignment';
import { InvestigationNote } from '../models/InvestigationNote';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';

export async function seedIfEmpty(): Promise<void> {
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) return;

  console.log('[ClaimWise Seed] Seeding initial demo database...');
  const passwordHash = await bcrypt.hash('Demo@123', 10);

  const [admin, officer1, officer2, customer1, customer2] = await User.create([
    { name: 'Elena Vance', email: 'admin@claimwise.ai', passwordHash, role: 'admin', department: 'Operations', phone: '555-0100' },
    { name: 'Marcus Chen', email: 'officer@claimwise.ai', passwordHash, role: 'officer', department: 'Special Investigations', phone: '555-0101' },
    { name: 'Priya Nair', email: 'officer2@claimwise.ai', passwordHash, role: 'officer', department: 'Auto & Property', phone: '555-0102' },
    { name: 'Jordan Blake', email: 'customer@claimwise.ai', passwordHash, role: 'customer', phone: '555-0201' },
    { name: 'Aria Patel', email: 'aria@claimwise.ai', passwordHash, role: 'customer', phone: '555-0202' },
  ]);

  const now = new Date();
  const monthsAgo = (m: number) => new Date(now.getFullYear(), now.getMonth() - m, 15);
  const monthsAhead = (m: number) => new Date(now.getFullYear(), now.getMonth() + m, 15);

  const [polAuto, polHealth, polProperty, polLife] = await Policy.create([
    {
      policyNumber: 'POL-AUT-10421',
      customerId: customer1._id,
      policyType: 'Auto',
      coverageAmount: 60000,
      premium: 1450,
      startDate: monthsAgo(10),
      expiryDate: monthsAhead(14),
      status: 'Active',
    },
    {
      policyNumber: 'POL-HLT-20892',
      customerId: customer1._id,
      policyType: 'Health',
      coverageAmount: 150000,
      premium: 3200,
      startDate: monthsAgo(8),
      expiryDate: monthsAhead(16),
      status: 'Active',
    },
    {
      policyNumber: 'POL-PRP-30519',
      customerId: customer2._id,
      policyType: 'Property',
      coverageAmount: 250000,
      premium: 2400,
      startDate: monthsAgo(1),
      expiryDate: monthsAhead(11),
      status: 'Active',
    },
    {
      policyNumber: 'POL-LIF-40110',
      customerId: customer2._id,
      policyType: 'Life',
      coverageAmount: 300000,
      premium: 1900,
      startDate: monthsAgo(18),
      expiryDate: monthsAgo(2),
      status: 'Expired',
    },
  ]);

  const claims = await Claim.create([
    {
      claimId: 'CLM-2026-1001',
      policyId: polAuto._id,
      policyNumber: polAuto.policyNumber,
      customerId: customer1._id,
      claimType: 'Accident',
      incidentDate: monthsAgo(1),
      claimAmount: 8400,
      description: 'Rear-end collision at downtown intersection during evening commute. Bumper and trunk damage.',
      incidentHour: 18,
      witnessesCount: 2,
      policeReportFiled: true,
      status: 'Approved',
      validationResult: {
        isValid: true,
        policyExists: true,
        belongsToCustomer: true,
        activeOnIncidentDate: true,
        withinCoverage: true,
        warnings: [],
      },
      assignedOfficerId: officer1._id,
      decisionReason: 'Police report and repair estimate verified against policy coverage.',
      statusHistory: [
        { status: 'Submitted', changedBy: customer1._id, note: 'Submitted online', timestamp: monthsAgo(1) },
        { status: 'Under Review', changedBy: officer1._id, note: 'Assigned to Marcus Chen', timestamp: monthsAgo(1) },
        { status: 'Approved', changedBy: officer1._id, note: 'Approved for payout', timestamp: now },
      ],
    },
    {
      claimId: 'CLM-2026-1002',
      policyId: polHealth._id,
      policyNumber: polHealth.policyNumber,
      customerId: customer1._id,
      claimType: 'Medical',
      incidentDate: new Date(now.getTime() - 6 * 86400000),
      claimAmount: 24500,
      description: 'Emergency orthopedic surgery following sports injury. Hospitalization for 3 days.',
      incidentHour: 15,
      witnessesCount: 1,
      policeReportFiled: false,
      status: 'Under Review',
      validationResult: {
        isValid: true,
        policyExists: true,
        belongsToCustomer: true,
        activeOnIncidentDate: true,
        withinCoverage: true,
        warnings: [],
      },
      assignedOfficerId: officer1._id,
      statusHistory: [
        { status: 'Submitted', changedBy: customer1._id, note: 'Submitted with hospital invoice', timestamp: new Date(now.getTime() - 5 * 86400000) },
        { status: 'Under Review', changedBy: officer1._id, note: 'Pending medical bill line-item check', timestamp: now },
      ],
    },
    {
      claimId: 'CLM-2026-1003',
      policyId: polProperty._id,
      policyNumber: polProperty.policyNumber,
      customerId: customer2._id,
      claimType: 'Theft',
      incidentDate: new Date(now.getTime() - 25 * 86400000),
      claimAmount: 215000,
      description: 'High-value electronics and jewelry reported stolen from residence late at night.',
      incidentHour: 2,
      witnessesCount: 0,
      policeReportFiled: false,
      status: 'Under Review',
      validationResult: {
        isValid: true,
        policyExists: true,
        belongsToCustomer: true,
        activeOnIncidentDate: true,
        withinCoverage: true,
        warnings: [],
      },
      assignedOfficerId: officer1._id,
      statusHistory: [
        { status: 'Submitted', changedBy: customer2._id, note: 'Submitted online', timestamp: new Date(now.getTime() - 2 * 86400000) },
        { status: 'Under Review', changedBy: officer1._id, note: 'Flagged for high-risk SIU review', timestamp: now },
      ],
    },
    {
      claimId: 'CLM-2026-1004',
      policyId: polAuto._id,
      policyNumber: polAuto.policyNumber,
      customerId: customer1._id,
      claimType: 'Theft',
      incidentDate: new Date(now.getTime() - 3 * 86400000),
      claimAmount: 4200,
      description: 'Side mirror and catalytic converter stolen from parked vehicle overnight.',
      incidentHour: 3,
      witnessesCount: 0,
      policeReportFiled: true,
      status: 'Additional Information Required',
      validationResult: {
        isValid: true,
        policyExists: true,
        belongsToCustomer: true,
        activeOnIncidentDate: true,
        withinCoverage: true,
        warnings: [],
      },
      assignedOfficerId: officer2._id,
      decisionReason: 'Please upload the garage repair quote and police incident number.',
      statusHistory: [
        { status: 'Submitted', changedBy: customer1._id, note: 'Submitted online', timestamp: new Date(now.getTime() - 2 * 86400000) },
        { status: 'Additional Information Required', changedBy: officer2._id, note: 'Requested repair quote', timestamp: now },
      ],
    },
  ]);

  await Prediction.create([
    {
      claimId: claims[0]._id,
      riskScore: 0.14,
      riskLevel: 'Low',
      modelName: 'RandomForestClassifier',
      contributingFactors: [
        { feature: 'baseline', label: 'Standard Claim Profile', value: '14% coverage', impact: 'low', reason: 'Police report and 2 witnesses corroborated the incident.' },
      ],
      advisoryNotice: 'ML risk score is an investigation signal only and does not constitute proof of fraud.',
    },
    {
      claimId: claims[1]._id,
      riskScore: 0.42,
      riskLevel: 'Medium',
      modelName: 'RandomForestClassifier',
      contributingFactors: [
        { feature: 'claim_amount', label: 'Moderate Claim Value', value: '$24,500', impact: 'medium', reason: 'Surgical billing requires standard itemized audit.' },
      ],
      advisoryNotice: 'ML risk score is an investigation signal only and does not constitute proof of fraud.',
    },
    {
      claimId: claims[2]._id,
      riskScore: 0.86,
      riskLevel: 'High',
      modelName: 'RandomForestClassifier',
      contributingFactors: [
        { feature: 'claim_to_coverage_ratio', label: 'High Claim-to-Coverage Ratio', value: '86.0%', impact: 'high', reason: 'Claim requests 86.0% of total policy coverage.' },
        { feature: 'policy_age_days', label: 'Recently Issued Policy', value: '30 days', impact: 'high', reason: 'Incident occurred shortly after policy start.' },
        { feature: 'police_report_filed', label: 'No Witness or Police Report', value: '0 witnesses / No report', impact: 'medium', reason: 'No police report or witness attached for high-value theft.' },
      ],
      advisoryNotice: 'ML risk score is an investigation signal only and does not constitute proof of fraud.',
    },
    {
      claimId: claims[3]._id,
      riskScore: 0.49,
      riskLevel: 'Medium',
      modelName: 'RandomForestClassifier',
      contributingFactors: [
        { feature: 'incident_hour', label: 'Late-Night Incident Hour', value: '3:00', impact: 'low', reason: 'Incident occurred between midnight and 04:00.' },
      ],
      advisoryNotice: 'ML risk score is an investigation signal only and does not constitute proof of fraud.',
    },
  ]);

  await ClaimAssignment.create([
    { claimId: claims[0]._id, officerId: officer1._id, assignedBy: admin._id, status: 'Completed' },
    { claimId: claims[1]._id, officerId: officer1._id, assignedBy: admin._id, status: 'Active' },
    { claimId: claims[2]._id, officerId: officer1._id, assignedBy: admin._id, status: 'Active' },
    { claimId: claims[3]._id, officerId: officer2._id, assignedBy: admin._id, status: 'Active' },
  ]);

  await InvestigationNote.create([
    {
      claimId: claims[2]._id,
      authorId: officer1._id,
      authorName: officer1.name,
      note: 'High-value theft claim on a 1-month-old property policy. Scheduled phone interview and requested purchase receipts.',
      noteType: 'Investigation',
    },
  ]);

  await Notification.create([
    {
      userId: customer1._id,
      title: 'Claim CLM-2026-1001: Approved',
      message: 'Your auto accident claim ($8,400) has been approved.',
      claimId: claims[0]._id,
    },
    {
      userId: customer1._id,
      title: 'Claim CLM-2026-1004: Additional Information Required',
      message: 'Please upload the garage repair quote and police incident number.',
      claimId: claims[3]._id,
    },
    {
      userId: officer1._id,
      title: 'High-Risk Claim Assigned: CLM-2026-1003',
      message: 'Property theft claim ($215,000) flagged at 86% risk signal.',
      claimId: claims[2]._id,
    },
  ]);

  await AuditLog.create([
    {
      actorId: admin._id,
      actorEmail: admin.email,
      actorRole: 'admin',
      action: 'SYSTEM_SEEDED',
      entityType: 'System',
      entityId: 'ClaimWise',
      details: 'Initialized demo users, policies, claims, and ML risk predictions',
    },
  ]);

  console.log('[ClaimWise Seed] Demo data seeded successfully.');
}

