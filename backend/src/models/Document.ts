import mongoose, { Schema, Document as MDoc } from 'mongoose';

export interface IClaimDocument extends MDoc {
  claimId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  url: string;
  verified: boolean;
  createdAt: Date;
}

const DocumentSchema = new Schema<IClaimDocument>(
  {
    claimId: { type: Schema.Types.ObjectId, ref: 'Claim', required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    verified: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ClaimDocument = mongoose.model<IClaimDocument>('Document', DocumentSchema);

