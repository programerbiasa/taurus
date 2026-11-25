import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Category } from '../models/Category';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/categories - Ambil semua kategori (dapat diakses semua pengguna login)
router.get('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const catRepo = AppDataSource.getRepository(Category);
    const categories = await catRepo.find({ order: { name: 'ASC' } });
    return res.json(categories);
  } catch (error) {
    console.error('Error saat mengambil kategori:', error);
    return res.status(500).json({ message: 'Gagal mengambil data kategori' });
  }
});

// POST /api/categories - Buat kategori baru (Admin)
router.post('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Nama kategori wajib diisi' });
    }

    const catRepo = AppDataSource.getRepository(Category);
    const existing = await catRepo.findOne({ where: { name: name.trim() } });
    if (existing) {
      return res.status(400).json({ message: 'Kategori dengan nama tersebut sudah ada' });
    }

    const newCat = catRepo.create({
      name: name.trim(),
      description: description ? description.trim() : '',
    });

    await catRepo.save(newCat);
    return res.status(201).json({ message: 'Kategori berhasil ditambahkan', category: newCat });
  } catch (error) {
    console.error('Error saat membuat kategori:', error);
    return res.status(500).json({ message: 'Gagal menambahkan kategori' });
  }
});

// PATCH /api/categories/:id - Update kategori (Admin)
router.patch('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description } = req.body;

    const catRepo = AppDataSource.getRepository(Category);
    const category = await catRepo.findOne({ where: { id } });
    if (!category) {
      return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    }

    if (name && name.trim()) {
      const existing = await catRepo.findOne({ where: { name: name.trim() } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ message: 'Nama kategori sudah digunakan' });
      }
      category.name = name.trim();
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    await catRepo.save(category);
    return res.json({ message: 'Kategori berhasil diperbarui', category });
  } catch (error) {
    console.error('Error saat memperbarui kategori:', error);
    return res.status(500).json({ message: 'Gagal memperbarui kategori' });
  }
});

// DELETE /api/categories/:id - Hapus kategori (Admin)
router.delete('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const catRepo = AppDataSource.getRepository(Category);

    const category = await catRepo.findOne({ where: { id } });
    if (!category) {
      return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    }

    await catRepo.remove(category);
    return res.json({ message: `Kategori "${category.name}" berhasil dihapus` });
  } catch (error) {
    console.error('Error saat menghapus kategori:', error);
    return res.status(500).json({ message: 'Gagal menghapus kategori' });
  }
});

export default router;
