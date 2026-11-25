import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { DashcamBrand } from '../models/DashcamBrand';
import { verifyToken, requireStaff, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashcam-brands - Daftar semua merk & vendor dascam
router.get('/', verifyToken, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const brandRepo = AppDataSource.getRepository(DashcamBrand);
    const brands = await brandRepo.find({
      order: { name: 'ASC' },
    });
    return res.json(brands);
  } catch (error) {
    console.error('Error saat mengambil daftar merk dascam:', error);
    return res.status(500).json({ message: 'Gagal mengambil data merk dascam' });
  }
});

// POST /api/dashcam-brands - Tambah merk / vendor baru
router.post('/', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, vendor_name, contact_person, phone, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Nama merk dascam wajib diisi' });
    }

    const cleanName = name.trim();
    const brandRepo = AppDataSource.getRepository(DashcamBrand);

    const existing = await brandRepo.findOne({ where: { name: cleanName } });
    if (existing) {
      return res.status(400).json({ message: `Merk dascam "${cleanName}" sudah terdaftar` });
    }

    const newBrand = brandRepo.create({
      name: cleanName,
      vendor_name: vendor_name?.trim() || null,
      contact_person: contact_person?.trim() || null,
      phone: phone?.trim() || null,
      description: description?.trim() || null,
    });

    await brandRepo.save(newBrand);
    return res.status(201).json({ message: 'Merk dascam berhasil ditambahkan', brand: newBrand });
  } catch (error) {
    console.error('Error saat menambah merk dascam:', error);
    return res.status(500).json({ message: 'Gagal menambahkan merk dascam' });
  }
});

// PATCH /api/dashcam-brands/:id - Update merk / vendor
router.patch('/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, vendor_name, contact_person, phone, description } = req.body;

    const brandRepo = AppDataSource.getRepository(DashcamBrand);
    const brand = await brandRepo.findOne({ where: { id } });

    if (!brand) {
      return res.status(404).json({ message: 'Merk dascam tidak ditemukan' });
    }

    if (name && name.trim()) {
      const cleanName = name.trim();
      const existing = await brandRepo.findOne({ where: { name: cleanName } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ message: `Merk dascam "${cleanName}" sudah digunakan` });
      }
      brand.name = cleanName;
    }

    if (vendor_name !== undefined) brand.vendor_name = vendor_name ? vendor_name.trim() : null;
    if (contact_person !== undefined) brand.contact_person = contact_person ? contact_person.trim() : null;
    if (phone !== undefined) brand.phone = phone ? phone.trim() : null;
    if (description !== undefined) brand.description = description ? description.trim() : null;

    await brandRepo.save(brand);
    return res.json({ message: 'Data merk dascam berhasil diperbarui', brand });
  } catch (error) {
    console.error('Error saat update merk dascam:', error);
    return res.status(500).json({ message: 'Gagal memperbarui merk dascam' });
  }
});

// DELETE /api/dashcam-brands/:id - Hapus merk / vendor
router.delete('/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const brandRepo = AppDataSource.getRepository(DashcamBrand);
    const brand = await brandRepo.findOne({ where: { id } });

    if (!brand) {
      return res.status(404).json({ message: 'Merk dascam tidak ditemukan' });
    }

    await brandRepo.remove(brand);
    return res.json({ message: `Merk dascam "${brand.name}" berhasil dihapus` });
  } catch (error) {
    console.error('Error saat menghapus merk dascam:', error);
    return res.status(500).json({ message: 'Gagal menghapus merk dascam' });
  }
});

export default router;
