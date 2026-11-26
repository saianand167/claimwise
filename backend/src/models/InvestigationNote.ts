import mongoose, { Schema, Document as MDoc } from 'mongoose';

export interface IInvestigationNote extends MDoc {
  claimId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  note: string;
  noteType: 'Investigation' | 'InfoRequest' | 'Decision';
  createdAt: Date;
}

const InvestigationNoteSchema = new Schema<IInvestigationNote>(
  {
    claimId: { type: Schema.Types.ObjectId, ref: 'Claim', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    note: { type: String, required: true, trim: true },
    noteType: { type: String, enum: ['Investigation', 'InfoRequest', 'Decision'], default: 'Investigation' },
  },
  { timestamps: true }
);

export const InvestigationNote = mongoose.model<IInvestigationNote>('InvestigationNote', InvestigationNoteSchema);

