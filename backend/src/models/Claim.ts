import mongoose, { Schema, Document as MDoc } from 'mongoose';

export type ClaimStatus =
  | 'Submitted'
  | 'Processing'
  | 'Pending Documents'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Additional Information Required';

export interface IValidationResult {
  isValid: boolean;
  policyExists: boolean;
  belongsToCustomer: boolean;
  activeOnIncidentDate: boolean;
  withinCoverage: boolean;
  warnings: string[];
}

export interface IStatusHistoryItem {
  status: ClaimStatus;
  changedBy?: mongoose.Types.ObjectId;
  note?: string;
  timestamp: Date;
}

export interface IClaim extends MDoc {
  claimId: string;
  policyId?: mongoose.Types.ObjectId;
  policyNumber: string;
  customerId: mongoose.Types.ObjectId;
  claimType: string;
  incidentDate: Date;
  claimAmount: number;
  description: string;
  incidentHour: number;
  witnessesCount: number;
  policeReportFiled: boolean;
  status: ClaimStatus;
  validationResult: IValidationResult;
  statusHistory: IStatusHistoryItem[];
  assignedOfficerId?: mongoose.Types.ObjectId;
  decisionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClaimSchema = new Schema<IClaim>(
  {
    claimId: { type: String, required: true, unique: true, index: true },
    policyId: { type: Schema.Types.ObjectId, ref: 'Policy' },
    policyNumber: { type: String, required: true, uppercase: true, trim: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    claimType: { type: String, required: true, trim: true, index: true },
    incidentDate: { type: Date, required: true },
    claimAmount: { type: Number, required: true, min: 1 },
    description: { type: String, required: true, trim: true },
    incidentHour: { type: Number, default: 14, min: 0, max: 23 },
    witnessesCount: { type: Number, default: 1, min: 0 },
    policeReportFiled: { type: Boolean, default: false },
    status: {
      type: String,
      enum: [
        'Submitted',
        'Processing',
        'Pending Documents',
        'Under Review',
        'Approved',
        'Rejected',
        'Additional Information Required',
      ],
      default: 'Submitted',
      index: true,
    },
    validationResult: {
      isValid: { type: Boolean, default: false },
      policyExists: { type: Boolean, default: false },
      belongsToCustomer: { type: Boolean, default: false },
      activeOnIncidentDate: { type: Boolean, default: false },
      withinCoverage: { type: Boolean, default: false },
      warnings: [{ type: String }],
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        note: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    assignedOfficerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    decisionReason: { type: String },
  },
  { timestamps: true }
);

export const Claim = mongoose.model<IClaim>('Claim', ClaimSchema);

