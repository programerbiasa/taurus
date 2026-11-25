import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Priority } from '../models/Priority';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/priorities - Ambil semua prioritas (dapat diakses semua pengguna login)
router.get('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const priorityRepo = AppDataSource.getRepository(Priority);
    const priorities = await priorityRepo.find({ order: { level: 'ASC' } });
    return res.json(priorities);
  } catch (error) {
    console.error('Error saat mengambil data prioritas:', error);
    return res.status(500).json({ message: 'Gagal mengambil data prioritas' });
  }
});

// POST /api/priorities - Buat prioritas baru (Admin)
router.post('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, level, color, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Nama prioritas wajib diisi' });
    }

    const priorityRepo = AppDataSource.getRepository(Priority);
    const existing = await priorityRepo.findOne({ where: { name: name.trim() } });
    if (existing) {
      return res.status(400).json({ message: 'Tingkat prioritas dengan nama tersebut sudah ada' });
    }

    const newPriority = priorityRepo.create({
      name: name.trim(),
      level: level ? parseInt(level, 10) : 1,
      color: color || '#1976d2',
      description: description ? description.trim() : '',
    });

    await priorityRepo.save(newPriority);
    return res.status(201).json({ message: 'Prioritas berhasil ditambahkan', priority: newPriority });
  } catch (error) {
    console.error('Error saat membuat prioritas:', error);
    return res.status(500).json({ message: 'Gagal menambahkan prioritas' });
  }
});

// PATCH /api/priorities/:id - Update prioritas (Admin)
router.patch('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, level, color, description } = req.body;

    const priorityRepo = AppDataSource.getRepository(Priority);
    const priority = await priorityRepo.findOne({ where: { id } });
    if (!priority) {
      return res.status(404).json({ message: 'Prioritas tidak ditemukan' });
    }

    if (name && name.trim()) {
      const existing = await priorityRepo.findOne({ where: { name: name.trim() } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ message: 'Nama prioritas sudah digunakan' });
      }
      priority.name = name.trim();
    }

    if (level !== undefined) {
      priority.level = parseInt(level, 10);
    }

    if (color) {
      priority.color = color;
    }

    if (description !== undefined) {
      priority.description = description.trim();
    }

    await priorityRepo.save(priority);
    return res.json({ message: 'Prioritas berhasil diperbarui', priority });
  } catch (error) {
    console.error('Error saat memperbarui prioritas:', error);
    return res.status(500).json({ message: 'Gagal memperbarui prioritas' });
  }
});

// DELETE /api/priorities/:id - Hapus prioritas (Admin)
router.delete('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const priorityRepo = AppDataSource.getRepository(Priority);

    const priority = await priorityRepo.findOne({ where: { id } });
    if (!priority) {
      return res.status(404).json({ message: 'Prioritas tidak ditemukan' });
    }

    await priorityRepo.remove(priority);
    return res.json({ message: `Prioritas "${priority.name}" berhasil dihapus` });
  } catch (error) {
    console.error('Error saat menghapus prioritas:', error);
    return res.status(500).json({ message: 'Gagal menghapus prioritas' });
  }
});

export default router;
