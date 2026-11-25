import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    role?: string;
  };
  userId?: number;
}

const SECRET = process.env.JWT_SECRET || 'taurus2024secret';

export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Akses ditolak. Token tidak disediakan.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, SECRET) as { userId: number; username: string; role?: string };
    req.user = payload;
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid atau telah kadaluarsa.' });
  }
};

export const requireStaff = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role === 'client') {
    return res.status(403).json({
      message: 'Akses ditolak. Akun Client hanya memiliki hak akses melihat data (read-only) dan tidak diizinkan melakukan perubahan/CRUD.',
    });
  }
  next();
};
