import mongoose, { Schema, Document as MDoc } from 'mongoose';

export interface IClaimAssignment extends MDoc {
  claimId: mongoose.Types.ObjectId;
  officerId: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  status: 'Active' | 'Reassigned' | 'Completed';
  createdAt: Date;
}

const ClaimAssignmentSchema = new Schema<IClaimAssignment>(
  {
    claimId: { type: Schema.Types.ObjectId, ref: 'Claim', required: true, index: true },
    officerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Active', 'Reassigned', 'Completed'], default: 'Active' },
  },
  { timestamps: true }
);

export const ClaimAssignment = mongoose.model<IClaimAssignment>('ClaimAssignment', ClaimAssignmentSchema);

