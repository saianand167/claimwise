export type UserRole = 'customer' | 'officer' | 'admin';

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  department?: string;
  isActive?: boolean;
}

export interface Policy {
  _id: string;
  policyNumber: string;
  customerId: User | string;
  policyType: 'Health' | 'Auto' | 'Property' | 'Life';
  coverageAmount: number;
  premium: number;
  startDate: string;
  expiryDate: string;
  status: 'Active' | 'Expired' | 'Suspended' | 'Cancelled';
}

export interface ValidationResult {
  isValid: boolean;
  policyExists: boolean;
  belongsToCustomer: boolean;
  activeOnIncidentDate: boolean;
  withinCoverage: boolean;
  warnings: string[];
}

export interface Prediction {
  _id?: string;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  modelName: string;
  contributingFactors: Array<{
    feature: string;
    label: string;
    value: string;
    impact: string;
    reason: string;
  }>;
  advisoryNotice: string;
}

export interface Claim {
  _id: string;
  claimId: string;
  policyNumber: string;
  policyId?: Policy;
  customerId: User;
  assignedOfficerId?: User;
  claimType: string;
  incidentDate: string;
  claimAmount: number;
  description: string;
  incidentHour: number;
  witnessesCount: number;
  policeReportFiled: boolean;
  status: string;
  validationResult: ValidationResult;
  statusHistory: Array<{ status: string; note?: string; timestamp: string }>;
  decisionReason?: string;
  prediction?: Prediction | null;
  createdAt: string;
}

export interface ClaimDocument {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  verified: boolean;
  createdAt: string;
}

export interface InvestigationNote {
  _id: string;
  authorName: string;
  note: string;
  noteType: string;
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  claimId?: string;
  isRead: boolean;
  createdAt: string;
}

