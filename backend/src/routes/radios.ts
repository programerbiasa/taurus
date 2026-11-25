import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Radio } from '../models/Radio';
import { RadioMovement } from '../models/RadioMovement';
import { VehicleUnit } from '../models/VehicleUnit';
import { User } from '../models/User';
import { verifyToken, requireStaff, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Helper untuk mendapatkan nama teknisi dari akun yang sedang login
async function getTechnicianName(req: AuthenticatedRequest, fallback?: string): Promise<string> {
  if (req.user?.userId) {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const u = await userRepo.findOne({ where: { id: req.user.userId } });
      if (u) {
        return u.name ? `${u.name} (@${u.username})` : u.username;
      }
    } catch (err) {
      console.error('Error fetching user for technician name:', err);
    }
  }
  return fallback || req.user?.username || 'Teknisi';
}

// GET /api/radios - Daftar radio dengan filter status & pencarian
router.get('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const all = req.query.all === 'true';

    const radioRepo = AppDataSource.getRepository(Radio);

    if (all) {
      const items = await radioRepo.find({
        order: { serial_number: 'ASC' },
      });
      return res.json(items);
    }

    const qb = radioRepo.createQueryBuilder('r');

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      qb.where(
        '(r.serial_number LIKE :s OR r.brand LIKE :s OR r.model_type LIKE :s OR r.current_unit_number LIKE :s OR r.notes LIKE :s)',
        { s }
      );
    }

    if (status && status !== 'all') {
      qb.andWhere('r.status = :status', { status });
    }

    qb.orderBy('r.updated_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Hitung statistik ringkas
    const totalCount = await radioRepo.count();
    const terpasangCount = await radioRepo.count({ where: { status: 'Terpasang' } });
    const standbyCount = await radioRepo.count({ where: { status: 'Standby' } });
    const rusakCount = await radioRepo.count({ where: { status: 'Rusak' } });

    return res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        total: totalCount,
        terpasang: terpasangCount,
        standby: standbyCount,
        rusak: rusakCount,
      },
    });
  } catch (error) {
    console.error('Error saat mengambil data radio:', error);
    return res.status(500).json({ message: 'Gagal mengambil data radio' });
  }
});

// GET /api/radios/movements - Riwayat mutasi/perpindahan radio
router.get('/movements', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const serial = req.query.serial as string | undefined;
    const unit = req.query.unit as string | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;

    const moveRepo = AppDataSource.getRepository(RadioMovement);
    const qb = moveRepo.createQueryBuilder('m');

    if (serial && serial.trim()) {
      qb.andWhere('m.serial_number = :serial', { serial: serial.trim() });
    }

    if (unit && unit.trim()) {
      qb.andWhere('(m.from_unit_number = :unit OR m.to_unit_number = :unit)', { unit: unit.trim() });
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      qb.andWhere(
        '(m.serial_number LIKE :s OR m.from_unit_number LIKE :s OR m.to_unit_number LIKE :s OR m.performed_by LIKE :s OR m.notes LIKE :s)',
        { s }
      );
    }

    qb.orderBy('m.moved_at', 'DESC')
      .addOrderBy('m.id', 'DESC')
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
    console.error('Error saat mengambil log perpindahan radio:', error);
    return res.status(500).json({ message: 'Gagal mengambil riwayat mutasi radio' });
  }
});

// GET /api/radios/track/:serial - Tracking posisi dan riwayat perpindahan radio
router.get('/track/:serial', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const serial = req.params.serial.trim().toUpperCase();
    const radioRepo = AppDataSource.getRepository(Radio);
    const radio = await radioRepo.findOne({ where: { serial_number: serial } });

    if (!radio) {
      return res.status(404).json({ message: `Radio dengan Serial Number "${serial}" tidak ditemukan` });
    }

    const moveRepo = AppDataSource.getRepository(RadioMovement);
    const movements = await moveRepo.find({
      where: { serial_number: serial },
      order: { moved_at: 'DESC', id: 'DESC' },
    });

    const isInstalled = radio.status === 'Terpasang' && Boolean(radio.current_unit_number);

    return res.json({
      radio,
      current_position: {
        unit_number: radio.current_unit_number || 'Standby / Gudang',
        is_installed: isInstalled,
        status: radio.status,
        last_updated: radio.updated_at,
      },
      total_transfers: movements.length,
      movements,
    });
  } catch (error) {
    console.error('Error saat tracking radio:', error);
    return res.status(500).json({ message: 'Gagal melacak jejak posisi radio' });
  }
});

// GET /api/radios/by-serial/:serial - Cari data radio spesifik beserta log historisnya
router.get('/by-serial/:serial', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const serial = req.params.serial.trim();
    const radioRepo = AppDataSource.getRepository(Radio);
    const radio = await radioRepo.findOne({ where: { serial_number: serial } });

    if (!radio) {
      return res.status(404).json({ message: `Radio dengan nomor seri "${serial}" tidak ditemukan` });
    }

    const moveRepo = AppDataSource.getRepository(RadioMovement);
    const movements = await moveRepo.find({
      where: { serial_number: serial },
      order: { moved_at: 'DESC', id: 'DESC' },
    });

    return res.json({ radio, movements });
  } catch (error) {
    console.error('Error saat mencari radio by serial:', error);
    return res.status(500).json({ message: 'Gagal mengambil data radio' });
  }
});

// GET /api/radios/:id - Detail radio tunggal beserta riwayatnya
router.get('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const radioRepo = AppDataSource.getRepository(Radio);
    const radio = await radioRepo.findOne({ where: { id } });

    if (!radio) {
      return res.status(404).json({ message: 'Radio tidak ditemukan' });
    }

    const moveRepo = AppDataSource.getRepository(RadioMovement);
    const movements = await moveRepo.find({
      where: { radio_id: id },
      order: { moved_at: 'DESC', id: 'DESC' },
    });

    return res.json({ radio, movements });
  } catch (error) {
    console.error('Error saat mengambil detail radio:', error);
    return res.status(500).json({ message: 'Gagal mengambil detail radio' });
  }
});

// POST /api/radios - Tambah Master Data Radio Baru
router.post('/', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { serial_number, brand, model_type, status, current_unit_number, notes, photo_url } = req.body;

    if (!serial_number || !serial_number.trim()) {
      return res.status(400).json({ message: 'Nomor seri (Serial Number) radio wajib diisi' });
    }

    const cleanSerial = serial_number.trim().toUpperCase();
    const radioRepo = AppDataSource.getRepository(Radio);

    const existing = await radioRepo.findOne({ where: { serial_number: cleanSerial } });
    if (existing) {
      return res.status(400).json({ message: `Radio dengan Serial Number "${cleanSerial}" sudah terdaftar` });
    }

    let unitId: number | null = null;
    let cleanUnitNumber: string | null = null;

    if (current_unit_number && current_unit_number.trim()) {
      const uStr = current_unit_number.trim().toUpperCase();
      cleanUnitNumber = uStr;
      const unitRepo = AppDataSource.getRepository(VehicleUnit);
      const unit = await unitRepo.findOne({ where: { unit_number: uStr } });
      if (unit) {
        unitId = unit.id;
      }
    }

    const initialStatus = cleanUnitNumber ? 'Terpasang' : (status || 'Standby');

    const newRadio = radioRepo.create({
      serial_number: cleanSerial,
      brand: brand?.trim() || 'Motorola',
      model_type: model_type?.trim() || 'GM338',
      status: initialStatus,
      current_unit_id: unitId,
      current_unit_number: cleanUnitNumber,
      notes: notes?.trim() || '',
      photo_url: photo_url?.trim() || null,
    });

    await radioRepo.save(newRadio);

    // Jika langsung dipasang di unit kendaraan, catat log pemasangan awal
    if (cleanUnitNumber) {
      const technicianName = await getTechnicianName(req);
      const moveRepo = AppDataSource.getRepository(RadioMovement);
      const initialMovement = moveRepo.create({
        radio_id: newRadio.id,
        serial_number: newRadio.serial_number,
        from_unit_id: null,
        from_unit_number: null,
        to_unit_id: unitId,
        to_unit_number: cleanUnitNumber,
        action_type: 'PASANG',
        moved_at: new Date(),
        performed_by: technicianName,
        notes: 'Pemasangan awal registrasi radio',
      });
      await moveRepo.save(initialMovement);
    }

    // Broadcast WebSocket jika ada
    const io = (global as any).io;
    if (io) {
      io.emit('radioUpdated', { radio: newRadio, action: 'create' });
    }

    return res.status(201).json({ message: 'Radio berhasil ditambahkan', radio: newRadio });
  } catch (error) {
    console.error('Error saat menambah radio:', error);
    return res.status(500).json({ message: 'Gagal menambahkan radio' });
  }
});

// POST /api/radios/move - Sub-menu Pindah Radio (Mutasi Unit Kendaraan)
router.post('/move', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      radio_id,
      serial_number,
      to_unit_number,
      moved_at,
      performed_by,
      notes,
    } = req.body;

    const radioRepo = AppDataSource.getRepository(Radio);
    let radio: Radio | null = null;

    if (radio_id) {
      radio = await radioRepo.findOne({ where: { id: parseInt(radio_id, 10) } });
    } else if (serial_number && serial_number.trim()) {
      radio = await radioRepo.findOne({ where: { serial_number: serial_number.trim().toUpperCase() } });
    }

    if (!radio) {
      return res.status(404).json({ message: 'Data Radio tidak ditemukan. Periksa kembali Serial Number.' });
    }

    const fromUnitId = radio.current_unit_id;
    const fromUnitNumber = radio.current_unit_number;

    let targetUnitId: number | null = null;
    let targetUnitNumber: string | null = null;
    let actionType = 'PINDAH';

    if (to_unit_number && to_unit_number.trim() && to_unit_number.trim().toUpperCase() !== 'STANDBY') {
      const uTarget = to_unit_number.trim().toUpperCase();
      targetUnitNumber = uTarget;
      const unitRepo = AppDataSource.getRepository(VehicleUnit);
      const unit = await unitRepo.findOne({ where: { unit_number: uTarget } });
      if (unit) {
        targetUnitId = unit.id;
      }
      radio.current_unit_id = targetUnitId;
      radio.current_unit_number = targetUnitNumber;
      radio.status = 'Terpasang';
      actionType = fromUnitNumber ? 'PINDAH' : 'PASANG';
    } else {
      // Dilepas dari kendaraan -> kembali ke Standby / Gudang
      radio.current_unit_id = null;
      radio.current_unit_number = null;
      radio.status = 'Standby';
      actionType = 'LEPAS';
    }

    if (notes && notes.trim()) {
      radio.notes = notes.trim();
    }

    await radioRepo.save(radio);

    // Simpan riwayat mutasi (teknisi diambil dari user yang sedang login)
    const technicianName = await getTechnicianName(req, performed_by?.trim());
    const moveRepo = AppDataSource.getRepository(RadioMovement);
    const movement = moveRepo.create({
      radio_id: radio.id,
      serial_number: radio.serial_number,
      from_unit_id: fromUnitId,
      from_unit_number: fromUnitNumber,
      to_unit_id: targetUnitId,
      to_unit_number: targetUnitNumber,
      action_type: actionType,
      moved_at: moved_at ? new Date(moved_at) : new Date(),
      performed_by: technicianName,
      notes: notes?.trim() || (actionType === 'LEPAS' ? 'Dilepas dari unit ke Standby' : `Dipindahkan ke Unit ${targetUnitNumber}`),
    });

    await moveRepo.save(movement);

    const io = (global as any).io;
    if (io) {
      io.emit('radioUpdated', { radio, movement, action: 'move' });
    }

    return res.json({
      message: actionType === 'LEPAS'
        ? `Radio ${radio.serial_number} berhasil dilepas dari Unit ${fromUnitNumber || '-'} ke status Standby.`
        : `Radio ${radio.serial_number} berhasil dipindahkan ke Unit ${targetUnitNumber}.`,
      radio,
      movement,
    });
  } catch (error) {
    console.error('Error saat proses pindah radio:', error);
    return res.status(500).json({ message: 'Gagal memproses pemindahan radio' });
  }
});

// PATCH /api/radios/:id - Update data radio
router.patch('/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { serial_number, brand, model_type, status, notes, photo_url } = req.body;

    const radioRepo = AppDataSource.getRepository(Radio);
    const radio = await radioRepo.findOne({ where: { id } });

    if (!radio) {
      return res.status(404).json({ message: 'Radio tidak ditemukan' });
    }

    if (serial_number && serial_number.trim()) {
      const cleanSerial = serial_number.trim().toUpperCase();
      const existing = await radioRepo.findOne({ where: { serial_number: cleanSerial } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ message: `Serial Number "${cleanSerial}" sudah digunakan oleh radio lain` });
      }
      radio.serial_number = cleanSerial;
    }

    if (brand !== undefined) radio.brand = brand.trim();
    if (model_type !== undefined) radio.model_type = model_type.trim();
    if (status !== undefined) radio.status = status;
    if (notes !== undefined) radio.notes = notes.trim();
    if (photo_url !== undefined) radio.photo_url = photo_url ? photo_url.trim() : null;

    await radioRepo.save(radio);

    const io = (global as any).io;
    if (io) {
      io.emit('radioUpdated', { radio, action: 'update' });
    }

    return res.json({ message: 'Data radio berhasil diperbarui', radio });
  } catch (error) {
    console.error('Error saat update radio:', error);
    return res.status(500).json({ message: 'Gagal memperbarui data radio' });
  }
});

// DELETE /api/radios/:id - Hapus radio
router.delete('/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const radioRepo = AppDataSource.getRepository(Radio);
    const radio = await radioRepo.findOne({ where: { id } });

    if (!radio) {
      return res.status(404).json({ message: 'Radio tidak ditemukan' });
    }

    await radioRepo.remove(radio);

    const io = (global as any).io;
    if (io) {
      io.emit('radioUpdated', { id, action: 'delete' });
    }

    return res.json({ message: `Radio ${radio.serial_number} berhasil dihapus` });
  } catch (error) {
    console.error('Error saat menghapus radio:', error);
    return res.status(500).json({ message: 'Gagal menghapus data radio' });
  }
});

export default router;
