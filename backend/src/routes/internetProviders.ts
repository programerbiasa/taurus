import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { InternetProvider } from '../models/InternetProvider';
import { verifyToken, requireStaff, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/internet-providers - Ambil semua master provider
router.get('/', verifyToken, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const providerRepo = AppDataSource.getRepository(InternetProvider);
    const providers = await providerRepo.find({
      order: { name: 'ASC' },
    });
    return res.json(providers);
  } catch (error) {
    console.error('Error saat mengambil data provider internet:', error);
    return res.status(500).json({ message: 'Gagal memuat master provider internet' });
  }
});

// POST /api/internet-providers - Tambah master provider baru
router.post('/', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, type, contact_person, phone, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Nama provider internet wajib diisi' });
    }

    const cleanName = name.trim();
    const providerRepo = AppDataSource.getRepository(InternetProvider);

    const existing = await providerRepo.findOne({ where: { name: cleanName } });
    if (existing) {
      return res.status(400).json({ message: `Provider "${cleanName}" sudah terdaftar` });
    }

    const newProvider = providerRepo.create({
      name: cleanName,
      type: type?.trim() || 'Cellular / GSM',
      contact_person: contact_person?.trim() || null,
      phone: phone?.trim() || null,
      description: description?.trim() || null,
    });

    await providerRepo.save(newProvider);
    return res.status(201).json(newProvider);
  } catch (error) {
    console.error('Error saat menambah provider internet:', error);
    return res.status(500).json({ message: 'Gagal menambahkan provider internet baru' });
  }
});

// PATCH /api/internet-providers/:id - Update provider
router.patch('/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, type, contact_person, phone, description } = req.body;

    const providerRepo = AppDataSource.getRepository(InternetProvider);
    const provider = await providerRepo.findOne({ where: { id } });

    if (!provider) {
      return res.status(404).json({ message: 'Provider internet tidak ditemukan' });
    }

    if (name && name.trim()) {
      provider.name = name.trim();
    }
    if (type !== undefined) provider.type = type ? type.trim() : null;
    if (contact_person !== undefined) provider.contact_person = contact_person ? contact_person.trim() : null;
    if (phone !== undefined) provider.phone = phone ? phone.trim() : null;
    if (description !== undefined) provider.description = description ? description.trim() : null;

    await providerRepo.save(provider);
    return res.json(provider);
  } catch (error) {
    console.error('Error saat mengupdate provider internet:', error);
    return res.status(500).json({ message: 'Gagal memperbarui provider internet' });
  }
});

// DELETE /api/internet-providers/:id - Hapus provider
router.delete('/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const providerRepo = AppDataSource.getRepository(InternetProvider);
    const provider = await providerRepo.findOne({ where: { id } });

    if (!provider) {
      return res.status(404).json({ message: 'Provider internet tidak ditemukan' });
    }

    await providerRepo.remove(provider);
    return res.json({ message: `Provider "${provider.name}" berhasil dihapus` });
  } catch (error) {
    console.error('Error saat menghapus provider internet:', error);
    return res.status(500).json({ message: 'Gagal menghapus provider internet' });
  }
});

export default router;
