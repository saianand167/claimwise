import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';

export async function logAudit(params: {
  actorId?: string | mongoose.Types.ObjectId;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
}): Promise<void> {
  await AuditLog.create({
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    details: params.details,
  });
}

export async function createNotification(params: {
  userId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  claimId?: string | mongoose.Types.ObjectId;
}): Promise<void> {
  await Notification.create({
    userId: params.userId,
    title: params.title,
    message: params.message,
    claimId: params.claimId,
  });
}

