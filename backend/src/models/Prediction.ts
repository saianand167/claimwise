import mongoose, { Schema, Document as MDoc } from 'mongoose';

export interface IPrediction extends MDoc {
  claimId: mongoose.Types.ObjectId;
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
  createdAt: Date;
}

const PredictionSchema = new Schema<IPrediction>(
  {
    claimId: { type: Schema.Types.ObjectId, ref: 'Claim', required: true, unique: true, index: true },
    riskScore: { type: Number, required: true, min: 0, max: 1 },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], required: true, index: true },
    modelName: { type: String, required: true },
    contributingFactors: [
      {
        feature: String,
        label: String,
        value: String,
        impact: String,
        reason: String,
      },
    ],
    advisoryNotice: { type: String, required: true },
  },
  { timestamps: true }
);

export const Prediction = mongoose.model<IPrediction>('Prediction', PredictionSchema);

