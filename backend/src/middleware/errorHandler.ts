import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation failed',
      errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  if (err instanceof Error) {
    const status = err.message.includes('Only PDF, JPG, and PNG') ? 400 : 500;
    res.status(status).json({ message: err.message });
    return;
  }

  res.status(500).json({ message: 'Internal server error' });
}

