import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { VehicleUnit } from '../models/VehicleUnit';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/units - Ambil daftar unit kendaraan (mendukung pagination dan pencarian)
router.get('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const all = req.query.all === 'true'; // jika all=true, kembalikan hanya unit_number untuk dropdown

    const unitRepo = AppDataSource.getRepository(VehicleUnit);

    if (all) {
      // Hanya kembalikan id & unit_number untuk select dropdown yang ringan
      const units = await unitRepo.createQueryBuilder('u')
        .select(['u.id', 'u.unit_number', 'u.vehicle_brand', 'u.radio_brand'])
        .orderBy('CAST(u.unit_number AS UNSIGNED)', 'ASC')
        .addOrderBy('u.unit_number', 'ASC')
        .getMany();
      return res.json(units);
    }

    const qb = unitRepo.createQueryBuilder('u');

    if (search && search.trim()) {
      qb.where(
        '(u.unit_number LIKE :s OR u.vehicle_brand LIKE :s OR u.radio_brand LIKE :s OR u.description LIKE :s)',
        { s: `%${search.trim()}%` }
      );
    }

    qb.orderBy('CAST(u.unit_number AS UNSIGNED)', 'ASC')
      .addOrderBy('u.unit_number', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error saat mengambil unit kendaraan:', error);
    return res.status(500).json({ message: 'Gagal mengambil data unit kendaraan' });
  }
});

// POST /api/units - Tambah unit kendaraan baru (Admin)
router.post('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      unit_number,
      vehicle_brand,
      unit_type,
      radio_brand,
      radio_type,
      antenna_type,
      antenna_base,
      description,
    } = req.body;

    if (!unit_number || !unit_number.trim()) {
      return res.status(400).json({ message: 'Nomor unit kendaraan wajib diisi' });
    }

    const unitRepo = AppDataSource.getRepository(VehicleUnit);
    const cleanUnit = unit_number.trim().toUpperCase();
    const existing = await unitRepo.findOne({ where: { unit_number: cleanUnit } });
    if (existing) {
      return res.status(400).json({ message: `Nomor unit "${cleanUnit}" sudah terdaftar` });
    }

    const newUnit = unitRepo.create({
      unit_number: cleanUnit,
      vehicle_brand: vehicle_brand || 'Mercedes Benz',
      unit_type: unit_type || '',
      radio_brand: radio_brand || 'Motorola',
      radio_type: radio_type || '',
      antenna_type: antenna_type || '',
      antenna_base: antenna_base || '',
      description: description || '',
    });

    await unitRepo.save(newUnit);
    return res.status(201).json({ message: 'Nomor unit kendaraan berhasil ditambahkan', unit: newUnit });
  } catch (error) {
    console.error('Error saat membuat unit kendaraan:', error);
    return res.status(500).json({ message: 'Gagal menambahkan unit kendaraan' });
  }
});

// PATCH /api/units/:id - Update unit kendaraan (Admin)
router.patch('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      unit_number,
      vehicle_brand,
      unit_type,
      radio_brand,
      radio_type,
      antenna_type,
      antenna_base,
      description,
    } = req.body;

    const unitRepo = AppDataSource.getRepository(VehicleUnit);
    const unit = await unitRepo.findOne({ where: { id } });
    if (!unit) {
      return res.status(404).json({ message: 'Unit kendaraan tidak ditemukan' });
    }

    if (unit_number && unit_number.trim()) {
      const cleanUnit = unit_number.trim().toUpperCase();
      const existing = await unitRepo.findOne({ where: { unit_number: cleanUnit } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ message: `Nomor unit "${cleanUnit}" sudah digunakan` });
      }
      unit.unit_number = cleanUnit;
    }

    if (vehicle_brand !== undefined) unit.vehicle_brand = vehicle_brand;
    if (unit_type !== undefined) unit.unit_type = unit_type;
    if (radio_brand !== undefined) unit.radio_brand = radio_brand;
    if (radio_type !== undefined) unit.radio_type = radio_type;
    if (antenna_type !== undefined) unit.antenna_type = antenna_type;
    if (antenna_base !== undefined) unit.antenna_base = antenna_base;
    if (description !== undefined) unit.description = description;

    await unitRepo.save(unit);
    return res.json({ message: 'Unit kendaraan berhasil diperbarui', unit });
  } catch (error) {
    console.error('Error saat memperbarui unit kendaraan:', error);
    return res.status(500).json({ message: 'Gagal memperbarui unit kendaraan' });
  }
});

// DELETE /api/units/:id - Hapus unit kendaraan (Admin)
router.delete('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const unitRepo = AppDataSource.getRepository(VehicleUnit);

    const unit = await unitRepo.findOne({ where: { id } });
    if (!unit) {
      return res.status(404).json({ message: 'Unit kendaraan tidak ditemukan' });
    }

    await unitRepo.remove(unit);
    return res.json({ message: `Unit kendaraan "${unit.unit_number}" berhasil dihapus` });
  } catch (error) {
    console.error('Error saat menghapus unit kendaraan:', error);
    return res.status(500).json({ message: 'Gagal menghapus unit kendaraan' });
  }
});

export default router;
