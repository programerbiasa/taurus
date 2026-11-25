import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Dashcam } from '../models/Dashcam';
import { DashcamMovement } from '../models/DashcamMovement';
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

// GET /api/dashcams - Daftar Dashcam dengan filter status & pencarian
router.get('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const all = req.query.all === 'true';

    const dashcamRepo = AppDataSource.getRepository(Dashcam);

    if (all) {
      const items = await dashcamRepo.find({
        order: { serial_number: 'ASC' },
      });
      return res.json(items);
    }

    const qb = dashcamRepo.createQueryBuilder('d');

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      qb.where(
        '(d.serial_number LIKE :s OR d.brand LIKE :s OR d.model_type LIKE :s OR d.current_unit_number LIKE :s OR d.sd_card_capacity LIKE :s OR d.notes LIKE :s)',
        { s }
      );
    }

    if (status && status !== 'all') {
      qb.andWhere('d.status = :status', { status });
    }

    qb.orderBy('d.updated_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    const totalCount = await dashcamRepo.count();
    const terpasangCount = await dashcamRepo.count({ where: { status: 'Terpasang' } });
    const standbyCount = await dashcamRepo.count({ where: { status: 'Standby' } });
    const rusakCount = await dashcamRepo.count({ where: { status: 'Rusak' } });

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
    console.error('Error saat mengambil data dascam:', error);
    return res.status(500).json({ message: 'Gagal mengambil data dascam' });
  }
});

// GET /api/dashcams/movements - Riwayat mutasi/perpindahan dascam global
router.get('/movements', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const serial = req.query.serial as string | undefined;
    const unit = req.query.unit as string | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;

    const moveRepo = AppDataSource.getRepository(DashcamMovement);
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
    console.error('Error saat mengambil log perpindahan dascam:', error);
    return res.status(500).json({ message: 'Gagal mengambil riwayat mutasi dascam' });
  }
});

// GET /api/dashcams/track/:serial - Tracking jejak posisi Dascam berdasarkan Serial Number
router.get('/track/:serial', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const serial = req.params.serial.trim().toUpperCase();
    const dashcamRepo = AppDataSource.getRepository(Dashcam);
    const dashcam = await dashcamRepo.findOne({ where: { serial_number: serial } });

    if (!dashcam) {
      return res.status(404).json({ message: `Dascam dengan Serial Number "${serial}" tidak ditemukan` });
    }

    const moveRepo = AppDataSource.getRepository(DashcamMovement);
    const movements = await moveRepo.find({
      where: { serial_number: serial },
      order: { moved_at: 'DESC', id: 'DESC' },
    });

    const isInstalled = dashcam.status === 'Terpasang' && Boolean(dashcam.current_unit_number);

    return res.json({
      dashcam,
      current_position: {
        unit_number: dashcam.current_unit_number || 'Standby / Gudang',
        is_installed: isInstalled,
        status: dashcam.status,
        last_updated: dashcam.updated_at,
      },
      total_transfers: movements.length,
      movements,
    });
  } catch (error) {
    console.error('Error saat tracking dascam:', error);
    return res.status(500).json({ message: 'Gagal melacak jejak posisi dascam' });
  }
});

// GET /api/dashcams/:id - Detail dascam
router.get('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const dashcamRepo = AppDataSource.getRepository(Dashcam);
    const dashcam = await dashcamRepo.findOne({ where: { id } });

    if (!dashcam) {
      return res.status(404).json({ message: 'Dascam tidak ditemukan' });
    }

    const moveRepo = AppDataSource.getRepository(DashcamMovement);
    const movements = await moveRepo.find({
      where: { dashcam_id: id },
      order: { moved_at: 'DESC', id: 'DESC' },
    });

    return res.json({ dashcam, movements });
  } catch (error) {
    console.error('Error saat mengambil detail dascam:', error);
    return res.status(500).json({ message: 'Gagal mengambil detail dascam' });
  }
});

// POST /api/dashcams/bulk - Bulk Import Dascam dari Excel
router.post('/bulk', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Daftar data dascam tidak boleh kosong' });
    }

    const dashcamRepo = AppDataSource.getRepository(Dashcam);
    const unitRepo = AppDataSource.getRepository(VehicleUnit);
    const moveRepo = AppDataSource.getRepository(DashcamMovement);

    // Cache semua unit kendaraan
    const allUnits = await unitRepo.find();
    const unitMap = new Map<string, VehicleUnit>();
    allUnits.forEach((u) => {
      if (u.unit_number) {
        unitMap.set(u.unit_number.trim().toUpperCase(), u);
      }
    });

    // Cache existing dashcams by serial_number
    const allExisting = await dashcamRepo.find();
    const existingMap = new Map<string, Dashcam>();
    allExisting.forEach((d) => {
      existingMap.set(d.serial_number.trim().toUpperCase(), d);
    });

    const technicianName = await getTechnicianName(req, 'Import Excel');
    const toSave: Dashcam[] = [];
    const newMovements: DashcamMovement[] = [];

    for (const raw of items) {
      if (!raw.serial_number || !String(raw.serial_number).trim()) continue;

      const cleanSerial = String(raw.serial_number).trim().toUpperCase();
      let cleanUnitNum: string | null = null;
      let unitId: number | null = null;

      if (raw.current_unit_number && String(raw.current_unit_number).trim()) {
        cleanUnitNum = String(raw.current_unit_number).trim().toUpperCase();
        const matched = unitMap.get(cleanUnitNum);
        if (matched) {
          unitId = matched.id;
        }
      }

      const initialStatus = cleanUnitNum ? (raw.status || 'Terpasang') : (raw.status || 'Standby');

      const existing = existingMap.get(cleanSerial);
      if (existing) {
        // Update existing dascam
        const oldUnit = existing.current_unit_number;
        existing.brand = raw.brand?.trim() || existing.brand;
        existing.model_type = raw.model_type?.trim() || existing.model_type;
        existing.status = initialStatus;
        existing.current_unit_id = unitId;
        existing.current_unit_number = cleanUnitNum;
        existing.sd_card_capacity = raw.sd_card_capacity?.trim() || existing.sd_card_capacity;
        existing.internet_provider = raw.internet_provider?.trim() || existing.internet_provider;
        existing.sim_card_number = raw.sim_card_number !== undefined ? (raw.sim_card_number ? String(raw.sim_card_number).trim() : null) : existing.sim_card_number;
        existing.electrical_condition = raw.electrical_condition?.trim() || existing.electrical_condition;
        existing.gps_condition = raw.gps_condition?.trim() || existing.gps_condition;
        existing.camera_status = raw.camera_status?.trim() || existing.camera_status;
        if (raw.has_front_camera !== undefined) existing.has_front_camera = Boolean(raw.has_front_camera);
        if (raw.has_cabin_camera !== undefined) existing.has_cabin_camera = Boolean(raw.has_cabin_camera);
        if (raw.has_fatigue_camera !== undefined) existing.has_fatigue_camera = Boolean(raw.has_fatigue_camera);
        if (raw.notes !== undefined) existing.notes = raw.notes?.trim() || '';

        toSave.push(existing);

        // Jika unit berubah, catat perpindahan
        if (oldUnit !== cleanUnitNum && cleanUnitNum) {
          newMovements.push(
            moveRepo.create({
              dashcam_id: existing.id,
              serial_number: cleanSerial,
              from_unit_id: null,
              from_unit_number: oldUnit || 'Gudang / Standby',
              to_unit_id: unitId,
              to_unit_number: cleanUnitNum,
              action_type: 'PINDAH',
              moved_at: new Date(),
              performed_by: technicianName,
              notes: 'Update mutasi melalui Import Excel',
            })
          );
        }
      } else {
        // Create new
        const newD = dashcamRepo.create({
          serial_number: cleanSerial,
          brand: raw.brand?.trim() || 'Hikvision',
          model_type: raw.model_type?.trim() || 'FHD 1080p',
          status: initialStatus,
          current_unit_id: unitId,
          current_unit_number: cleanUnitNum,
          sd_card_capacity: raw.sd_card_capacity?.trim() || '128 GB',
          internet_provider: raw.internet_provider?.trim() || 'Telkomsel',
          sim_card_number: raw.sim_card_number ? String(raw.sim_card_number).trim() : null,
          electrical_condition: raw.electrical_condition?.trim() || 'Baik',
          gps_condition: raw.gps_condition?.trim() || 'Baik',
          camera_status: raw.camera_status?.trim() || 'Aktif',
          has_front_camera: raw.has_front_camera !== undefined ? Boolean(raw.has_front_camera) : true,
          has_cabin_camera: raw.has_cabin_camera !== undefined ? Boolean(raw.has_cabin_camera) : true,
          has_fatigue_camera: raw.has_fatigue_camera !== undefined ? Boolean(raw.has_fatigue_camera) : true,
          notes: raw.notes?.trim() || 'Import Excel',
          photo_url: raw.photo_url?.trim() || null,
        });

        toSave.push(newD);
      }
    }

    if (toSave.length === 0) {
      return res.status(400).json({ message: 'Tidak ada data dascam yang valid untuk di-import' });
    }

    const saved = await dashcamRepo.save(toSave, { chunk: 50 });

    // Jika ada dascam baru yang terpasang di unit, catat log awal
    for (const d of saved) {
      if (d.current_unit_number && !existingMap.has(d.serial_number)) {
        newMovements.push(
          moveRepo.create({
            dashcam_id: d.id,
            serial_number: d.serial_number,
            from_unit_id: null,
            from_unit_number: null,
            to_unit_id: d.current_unit_id,
            to_unit_number: d.current_unit_number,
            action_type: 'PASANG',
            moved_at: new Date(),
            performed_by: technicianName,
            notes: 'Pemasangan perdana via Import Excel',
          })
        );
      }
    }

    if (newMovements.length > 0) {
      await moveRepo.save(newMovements, { chunk: 50 });
    }

    const io = (global as any).io;
    if (io) {
      io.emit('dashcamUpdated', { action: 'bulkImport', count: saved.length });
    }

    return res.status(201).json({
      message: `Berhasil mengimport/memperbarui ${saved.length} data dascam`,
      count: saved.length,
      items: saved,
    });
  } catch (error) {
    console.error('Error saat bulk import dascam:', error);
    return res.status(500).json({ message: 'Gagal melakukan import data dascam' });
  }
});

// POST /api/dashcams - Tambah Master Data Dascam Baru
router.post('/', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      serial_number,
      brand,
      model_type,
      status,
      current_unit_number,
      sd_card_capacity,
      internet_provider,
      sim_card_number,
      electrical_condition,
      gps_condition,
      camera_status,
      has_front_camera,
      has_cabin_camera,
      has_fatigue_camera,
      notes,
      photo_url,
    } = req.body;

    if (!serial_number || !serial_number.trim()) {
      return res.status(400).json({ message: 'Nomor seri (Serial Number) Dascam wajib diisi' });
    }

    const cleanSerial = serial_number.trim().toUpperCase();
    const dashcamRepo = AppDataSource.getRepository(Dashcam);

    const existing = await dashcamRepo.findOne({ where: { serial_number: cleanSerial } });
    if (existing) {
      return res.status(400).json({ message: `Dascam dengan Serial Number "${cleanSerial}" sudah terdaftar` });
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

    const newDashcam = dashcamRepo.create({
      serial_number: cleanSerial,
      brand: brand?.trim() || 'Hikvision',
      model_type: model_type?.trim() || 'FHD 1080p',
      status: initialStatus,
      current_unit_id: unitId,
      current_unit_number: cleanUnitNumber,
      sd_card_capacity: sd_card_capacity?.trim() || '64GB',
      internet_provider: internet_provider?.trim() || 'Telkomsel',
      sim_card_number: sim_card_number?.trim() || null,
      electrical_condition: electrical_condition?.trim() || 'Baik',
      gps_condition: gps_condition?.trim() || 'Baik',
      camera_status: camera_status?.trim() || 'Aktif',
      has_front_camera: has_front_camera !== undefined ? Boolean(has_front_camera) : true,
      has_cabin_camera: has_cabin_camera !== undefined ? Boolean(has_cabin_camera) : false,
      has_fatigue_camera: has_fatigue_camera !== undefined ? Boolean(has_fatigue_camera) : false,
      notes: notes?.trim() || '',
      photo_url: photo_url?.trim() || null,
    });

    await dashcamRepo.save(newDashcam);

    // Jika langsung terpasang di unit kendaraan, catat log riwayat posisi awal
    if (cleanUnitNumber) {
      const technicianName = await getTechnicianName(req);
      const moveRepo = AppDataSource.getRepository(DashcamMovement);
      const initialMovement = moveRepo.create({
        dashcam_id: newDashcam.id,
        serial_number: newDashcam.serial_number,
        from_unit_id: null,
        from_unit_number: null,
        to_unit_id: unitId,
        to_unit_number: cleanUnitNumber,
        action_type: 'PASANG',
        moved_at: new Date(),
        performed_by: technicianName,
        notes: 'Pemasangan awal registrasi dascam',
      });
      await moveRepo.save(initialMovement);
    }

    const io = (global as any).io;
    if (io) {
      io.emit('dashcamUpdated', { dashcam: newDashcam, action: 'create' });
    }

    return res.status(201).json({ message: 'Dascam berhasil ditambahkan', dashcam: newDashcam });
  } catch (error) {
    console.error('Error saat menambah dascam:', error);
    return res.status(500).json({ message: 'Gagal menambahkan dascam' });
  }
});

// POST /api/dashcams/move - Sub-menu Pindah Dascam (Mutasi & Tracking Antar Unit)
router.post('/move', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      dashcam_id,
      serial_number,
      to_unit_number,
      moved_at,
      performed_by,
      notes,
    } = req.body;

    const dashcamRepo = AppDataSource.getRepository(Dashcam);
    let dashcam: Dashcam | null = null;

    if (dashcam_id) {
      dashcam = await dashcamRepo.findOne({ where: { id: parseInt(dashcam_id, 10) } });
    } else if (serial_number && serial_number.trim()) {
      dashcam = await dashcamRepo.findOne({ where: { serial_number: serial_number.trim().toUpperCase() } });
    }

    if (!dashcam) {
      return res.status(404).json({ message: 'Data Dascam tidak ditemukan. Periksa kembali Serial Number.' });
    }

    const fromUnitId = dashcam.current_unit_id;
    const fromUnitNumber = dashcam.current_unit_number;

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
      dashcam.current_unit_id = targetUnitId;
      dashcam.current_unit_number = targetUnitNumber;
      dashcam.status = 'Terpasang';
      actionType = fromUnitNumber ? 'PINDAH' : 'PASANG';
    } else {
      // Dilepas ke Standby / Gudang
      dashcam.current_unit_id = null;
      dashcam.current_unit_number = null;
      dashcam.status = 'Standby';
      actionType = 'LEPAS';
    }

    if (notes && notes.trim()) {
      dashcam.notes = notes.trim();
    }

    await dashcamRepo.save(dashcam);

    // Simpan riwayat mutasi perpindahan dascam (nama teknisi diambil dari akun yang sedang login)
    const technicianName = await getTechnicianName(req, performed_by?.trim());
    const moveRepo = AppDataSource.getRepository(DashcamMovement);
    const movement = moveRepo.create({
      dashcam_id: dashcam.id,
      serial_number: dashcam.serial_number,
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
      io.emit('dashcamUpdated', { dashcam, movement, action: 'move' });
    }

    return res.json({
      message: actionType === 'LEPAS'
        ? `Dascam ${dashcam.serial_number} berhasil dilepas dari Unit ${fromUnitNumber || '-'} ke status Standby.`
        : `Dascam ${dashcam.serial_number} berhasil dipindahkan dari ${fromUnitNumber ? `Unit ${fromUnitNumber}` : 'Standby'} ke Unit ${targetUnitNumber}.`,
      dashcam,
      movement,
    });
  } catch (error) {
    console.error('Error saat proses pindah dascam:', error);
    return res.status(500).json({ message: 'Gagal memproses pemindahan dascam' });
  }
});

// PATCH /api/dashcams/:id - Update data dascam
router.patch('/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      serial_number,
      brand,
      model_type,
      status,
      sd_card_capacity,
      internet_provider,
      sim_card_number,
      electrical_condition,
      gps_condition,
      camera_status,
      has_front_camera,
      has_cabin_camera,
      has_fatigue_camera,
      notes,
      photo_url,
    } = req.body;

    const dashcamRepo = AppDataSource.getRepository(Dashcam);
    const dashcam = await dashcamRepo.findOne({ where: { id } });

    if (!dashcam) {
      return res.status(404).json({ message: 'Dascam tidak ditemukan' });
    }

    if (serial_number && serial_number.trim()) {
      const cleanSerial = serial_number.trim().toUpperCase();
      const existing = await dashcamRepo.findOne({ where: { serial_number: cleanSerial } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ message: `Serial Number "${cleanSerial}" sudah digunakan oleh dascam lain` });
      }
      dashcam.serial_number = cleanSerial;
    }

    if (brand !== undefined) dashcam.brand = brand.trim();
    if (model_type !== undefined) dashcam.model_type = model_type.trim();
    if (status !== undefined) dashcam.status = status;
    if (sd_card_capacity !== undefined) dashcam.sd_card_capacity = sd_card_capacity.trim();
    if (internet_provider !== undefined) dashcam.internet_provider = internet_provider.trim();
    if (sim_card_number !== undefined) dashcam.sim_card_number = sim_card_number ? sim_card_number.trim() : null;
    if (electrical_condition !== undefined) dashcam.electrical_condition = electrical_condition.trim();
    if (gps_condition !== undefined) dashcam.gps_condition = gps_condition.trim();
    if (camera_status !== undefined) dashcam.camera_status = camera_status.trim();
    if (has_front_camera !== undefined) dashcam.has_front_camera = Boolean(has_front_camera);
    if (has_cabin_camera !== undefined) dashcam.has_cabin_camera = Boolean(has_cabin_camera);
    if (has_fatigue_camera !== undefined) dashcam.has_fatigue_camera = Boolean(has_fatigue_camera);
    if (notes !== undefined) dashcam.notes = notes.trim();
    if (photo_url !== undefined) dashcam.photo_url = photo_url ? photo_url.trim() : null;

    await dashcamRepo.save(dashcam);

    const io = (global as any).io;
    if (io) {
      io.emit('dashcamUpdated', { dashcam, action: 'update' });
    }

    return res.json({ message: 'Data dascam berhasil diperbarui', dashcam });
  } catch (error) {
    console.error('Error saat update dascam:', error);
    return res.status(500).json({ message: 'Gagal memperbarui data dascam' });
  }
});

// DELETE /api/dashcams/:id - Hapus data dascam
router.delete('/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const dashcamRepo = AppDataSource.getRepository(Dashcam);
    const dashcam = await dashcamRepo.findOne({ where: { id } });

    if (!dashcam) {
      return res.status(404).json({ message: 'Dascam tidak ditemukan' });
    }

    await dashcamRepo.remove(dashcam);

    const io = (global as any).io;
    if (io) {
      io.emit('dashcamUpdated', { id, action: 'delete' });
    }

    return res.json({ message: `Dascam ${dashcam.serial_number} berhasil dihapus` });
  } catch (error) {
    console.error('Error saat menghapus dascam:', error);
    return res.status(500).json({ message: 'Gagal menghapus data dascam' });
  }
});

export default router;
