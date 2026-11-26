import mongoose, { Schema, Document as MDoc } from 'mongoose';

export type PolicyType = 'Health' | 'Auto' | 'Property' | 'Life';
export type PolicyStatus = 'Active' | 'Expired' | 'Suspended' | 'Cancelled';

export interface IPolicy extends MDoc {
  policyNumber: string;
  customerId: mongoose.Types.ObjectId;
  policyType: PolicyType;
  coverageAmount: number;
  premium: number;
  startDate: Date;
  expiryDate: Date;
  status: PolicyStatus;
  createdAt: Date;
}

const PolicySchema = new Schema<IPolicy>(
  {
    policyNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    policyType: { type: String, enum: ['Health', 'Auto', 'Property', 'Life'], required: true },
    coverageAmount: { type: Number, required: true, min: 1 },
    premium: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: ['Active', 'Expired', 'Suspended', 'Cancelled'], default: 'Active', index: true },
  },
  { timestamps: true }
);

export const Policy = mongoose.model<IPolicy>('Policy', PolicySchema);

