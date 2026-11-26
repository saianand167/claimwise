import { Router, Response } from 'express';
import { Notification } from '../models/Notification';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user!.id }).sort({ createdAt: -1 }).limit(30);
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      { isRead: true },
      { new: true }
    );
    res.json({ notification });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    await Notification.updateMany({ userId: req.user!.id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

export default router;

