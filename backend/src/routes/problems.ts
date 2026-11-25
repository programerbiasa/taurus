import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Problem } from '../models/Problem';

const router = Router();

// GET /api/problems - List all problem templates
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search, active_only } = req.query;
    const repo = AppDataSource.getRepository(Problem);

    const qb = repo.createQueryBuilder('p');

    if (active_only === 'true' || active_only === '1') {
      qb.andWhere('p.is_active = 1');
    }

    if (category && typeof category === 'string' && category.trim() !== '' && category.trim() !== 'all') {
      const catTrim = category.trim();
      // Fleksibel: cocok persis, substring dua arah, atau kendala umum/global
      qb.andWhere(
        '(p.category = :category OR :category LIKE CONCAT("%", p.category, "%") OR p.category LIKE CONCAT("%", :category, "%") OR p.category IS NULL OR p.category = "" OR p.category = "Umum")',
        { category: catTrim }
      );
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const s = `%${search.trim()}%`;
      qb.andWhere('(p.name LIKE :s OR p.description LIKE :s OR p.category LIKE :s)', { s });
    }

    qb.orderBy('p.category', 'ASC').addOrderBy('p.name', 'ASC');

    const problems = await qb.getMany();
    return res.json(problems);
  } catch (error) {
    console.error('Error fetching problems:', error);
    return res.status(500).json({ message: 'Gagal mengambil master kendala masalah' });
  }
});

// POST /api/problems - Tambah master kendala baru
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, category, description, is_active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Nama kendala / masalah wajib diisi' });
    }

    const repo = AppDataSource.getRepository(Problem);

    // Cek duplikasi nama pada kategori yang sama
    const existing = await repo.findOne({
      where: {
        name: name.trim(),
        category: category?.trim() || null,
      },
    });

    if (existing) {
      return res.status(400).json({ message: 'Kendala dengan nama dan kategori tersebut sudah terdaftar' });
    }

    const problem = repo.create({
      name: name.trim(),
      category: category?.trim() || null,
      description: description?.trim() || null,
      is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1,
    });

    await repo.save(problem);
    return res.status(201).json(problem);
  } catch (error) {
    console.error('Error creating problem:', error);
    return res.status(500).json({ message: 'Gagal menambahkan master kendala masalah' });
  }
});

// PATCH /api/problems/:id - Update master kendala
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, category, description, is_active } = req.body;

    const repo = AppDataSource.getRepository(Problem);
    const problem = await repo.findOne({ where: { id } });

    if (!problem) {
      return res.status(404).json({ message: 'Kendala tidak ditemukan' });
    }

    if (name !== undefined) problem.name = name.trim();
    if (category !== undefined) problem.category = category ? category.trim() : null;
    if (description !== undefined) problem.description = description ? description.trim() : null;
    if (is_active !== undefined) problem.is_active = is_active ? 1 : 0;

    await repo.save(problem);
    return res.json(problem);
  } catch (error) {
    console.error('Error updating problem:', error);
    return res.status(500).json({ message: 'Gagal memperbarui master kendala masalah' });
  }
});

// DELETE /api/problems/:id - Hapus master kendala
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const repo = AppDataSource.getRepository(Problem);
    const problem = await repo.findOne({ where: { id } });

    if (!problem) {
      return res.status(404).json({ message: 'Kendala tidak ditemukan' });
    }

    await repo.remove(problem);
    return res.json({ message: 'Master kendala berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting problem:', error);
    return res.status(500).json({ message: 'Gagal menghapus master kendala masalah' });
  }
});

export default router;
