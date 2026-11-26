import mongoose, { Schema, Document as MDoc } from 'mongoose';

export interface INotification extends MDoc {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  claimId?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    claimId: { type: Schema.Types.ObjectId, ref: 'Claim' },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

