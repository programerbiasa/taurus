import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User, UserRole, UserStatus } from '../models/User';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'taurus2024secret';

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    // CEK STATUS APPROVAL
    if (user.status === 'pending') {
      return res.status(403).json({
        message: 'Akun Anda sedang menunggu persetujuan (approval) dari Administrator IT. Silakan hubungi admin.',
        status: 'pending',
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        message: 'Pendaftaran akun Anda ditolak oleh Administrator.',
        status: 'rejected',
      });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error saat login:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server saat login' });
  }
});

// POST /api/auth/register (Client mendaftar - status otomatis pending)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const existing = await userRepo.findOne({ where: { username } });
    if (existing) {
      return res.status(400).json({ message: 'Username sudah digunakan, silakan pilih yang lain' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = userRepo.create({
      username,
      password_hash,
      name: name || username,
      status: 'pending',
      role: 'client',
    });

    await userRepo.save(newUser);

    // Beritahu admin lewat WebSocket jika ada client baru yang daftar
    const io = (global as any).io;
    if (io) {
      io.emit('userRegistered', {
        userId: newUser.id,
        username: newUser.username,
        name: newUser.name,
      });
    }

    return res.status(201).json({
      message: 'Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan dari Administrator sebelum dapat digunakan untuk login.',
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('Error saat registrasi:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server saat registrasi' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: req.userId },
      select: ['id', 'username', 'name', 'role', 'status', 'created_at'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Error saat mengambil profile user:', error);
    return res.status(500).json({ message: 'Gagal mengambil data user' });
  }
});

// ==========================================
// PENGATURAN USER & APPROVAL OLEH ADMIN
// ==========================================

// GET /api/auth/users - Ambil daftar semua user (dengan filter status)
router.get('/users', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status as UserStatus | undefined;
    const userRepo = AppDataSource.getRepository(User);

    const queryBuilder = userRepo.createQueryBuilder('user')
      .select(['user.id', 'user.username', 'user.name', 'user.status', 'user.role', 'user.created_at'])
      .orderBy('user.created_at', 'DESC');

    if (status) {
      queryBuilder.where('user.status = :status', { status });
    }

    const users = await queryBuilder.getMany();
    return res.json(users);
  } catch (error) {
    console.error('Error saat mengambil daftar user:', error);
    return res.status(500).json({ message: 'Gagal mengambil data pengguna' });
  }
});

// PATCH /api/auth/users/:id/status - Approve / Reject user
router.patch('/users/:id/status', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { status, role } = req.body;

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    if (status) {
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Status tidak valid (pending, approved, rejected)' });
      }
      user.status = status;
    }

    if (role) {
      let mappedRole = role;
      if (mappedRole === 'technician') mappedRole = 'it_support';
      if (!['admin', 'it_support', 'client'].includes(mappedRole)) {
        return res.status(400).json({ message: 'Role tidak valid (admin, it_support, client)' });
      }
      user.role = mappedRole;
    }

    await userRepo.save(user);

    // Emit event WebSocket
    const io = (global as any).io;
    if (io) {
      io.emit('userStatusChanged', {
        userId: user.id,
        username: user.username,
        status: user.status,
        role: user.role,
      });
    }

    return res.json({
      message: `Data akun ${user.username} berhasil diperbarui (Status: ${user.status}, Role: ${user.role})`,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        status: user.status,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error saat update status user:', error);
    return res.status(500).json({ message: 'Gagal memperbarui status pengguna' });
  }
});

// PATCH /api/auth/users/:id/role - Update role user (admin, it_support, client)
router.patch('/users/:id/role', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { role } = req.body;

    let mappedRole = role;
    if (mappedRole === 'technician') mappedRole = 'it_support';
    if (!['admin', 'it_support', 'client'].includes(mappedRole)) {
      return res.status(400).json({ message: 'Role tidak valid (admin, it_support, client)' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    user.role = mappedRole;
    await userRepo.save(user);

    const io = (global as any).io;
    if (io) {
      io.emit('userRoleChanged', {
        userId: user.id,
        username: user.username,
        role: user.role,
      });
    }

    return res.json({
      message: `Hak akses akun ${user.username} berhasil diubah menjadi ${user.role}`,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        status: user.status,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error saat update role user:', error);
    return res.status(500).json({ message: 'Gagal memperbarui hak akses pengguna' });
  }
});

// DELETE /api/auth/users/:id - Hapus akun pengguna
router.delete('/users/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    if (user.username === 'admin') {
      return res.status(400).json({ message: 'Akun admin utama tidak boleh dihapus' });
    }

    await userRepo.remove(user);
    return res.json({ message: `Pengguna ${user.username} berhasil dihapus` });
  } catch (error) {
    console.error('Error saat menghapus user:', error);
    return res.status(500).json({ message: 'Gagal menghapus pengguna' });
  }
});

export default router;
