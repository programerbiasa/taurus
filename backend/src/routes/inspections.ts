import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { UnitInspection } from '../models/UnitInspection';
import { VehicleUnit } from '../models/VehicleUnit';
import { User } from '../models/User';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { generateInspectionExcel } from '../utils/exportInspectionExcel';

const router = Router();

// Helper untuk mendapatkan nama dan jabatan personil IT
async function resolveInspectors(req: AuthenticatedRequest, payloadInspectorName?: string, payloadInspector2Name?: string) {
  let primaryName = payloadInspectorName;
  let primaryRole = 'IT Support';
  let secondaryName = payloadInspector2Name;
  let secondaryRole = 'IT Support';

  if (!primaryName && req.user?.userId) {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const u = await userRepo.findOne({ where: { id: req.user.userId } });
      if (u) {
        primaryName = u.name || u.username;
        primaryRole = u.role === 'admin' ? 'Administrator IT' : 'IT Support';
      }
    } catch (e) {
      console.error('Error fetching inspector user:', e);
    }
  }

  if (!primaryName) {
    primaryName = req.user?.username || 'IT Support';
  }

  // Karena IT di lokasi ada 2 orang (Twom & Ali), tentukan otomatis pasangan tandemnya
  if (!secondaryName) {
    const pLower = primaryName.toLowerCase();
    if (pLower.includes('twom')) {
      secondaryName = 'Ali';
      secondaryRole = 'IT Support';
    } else if (pLower.includes('ali')) {
      secondaryName = 'Twom';
      secondaryRole = 'IT Support';
    } else {
      secondaryName = 'Ali'; // Fallback default
      secondaryRole = 'IT Support';
    }
  }

  return { primaryName, primaryRole, secondaryName, secondaryRole };
}

// 1. GET /api/inspections - List inspeksi dengan filter tanggal, pencarian, & status
router.get('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, search, status, page = 1, limit = 50, all } = req.query;
    const repo = AppDataSource.getRepository(UnitInspection);

    if (all === 'true') {
      const qb = repo.createQueryBuilder('i');
      if (date && typeof date === 'string' && date.trim() !== '' && date !== 'all') {
        const cleanDate = date.includes('T') ? date.split('T')[0] : date.trim();
        qb.andWhere("DATE_FORMAT(i.inspection_date, '%Y-%m-%d') = :date", { date: cleanDate });
      }
      if (status && typeof status === 'string' && status !== 'all') {
        qb.andWhere('i.inspection_status = :status', { status });
      }
      if (search && typeof search === 'string' && search.trim() !== '') {
        const s = `%${search.trim()}%`;
        qb.andWhere(
          '(i.unit_number LIKE :s OR i.vehicle_brand LIKE :s OR i.vehicle_model LIKE :s OR i.general_notes LIKE :s OR i.inspector_name LIKE :s)',
          { s }
        );
      }
      qb.orderBy('i.inspection_date', 'DESC').addOrderBy('i.unit_number', 'ASC');
      const items = await qb.getMany();
      const cleanedItems = items.map(it => ({
        ...it,
        inspection_date: String(it.inspection_date || '').split('T')[0]
      }));
      return res.json(cleanedItems);
    }

    const qb = repo.createQueryBuilder('i');

    if (date && typeof date === 'string' && date.trim() !== '' && date !== 'all') {
      const cleanDate = date.includes('T') ? date.split('T')[0] : date.trim();
      qb.andWhere("DATE_FORMAT(i.inspection_date, '%Y-%m-%d') = :date", { date: cleanDate });
    }

    if (status && typeof status === 'string' && status !== 'all') {
      qb.andWhere('i.inspection_status = :status', { status });
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const s = `%${search.trim()}%`;
      qb.andWhere(
        '(i.unit_number LIKE :s OR i.vehicle_brand LIKE :s OR i.vehicle_model LIKE :s OR i.general_notes LIKE :s OR i.inspector_name LIKE :s)',
        { s }
      );
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 50);

    qb.orderBy('i.inspection_date', 'DESC')
      .addOrderBy('i.id', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum);

    const [items, total] = await qb.getManyAndCount();

    // Statistik inspeksi
    const totalCount = await repo.count();
    const openCount = await repo.count({ where: { inspection_status: 'Open' } });
    const closeCount = await repo.count({ where: { inspection_status: 'Close' } });

    // Daftar tanggal inspeksi unik yang tersedia (format YYYY-MM-DD murni)
    const distinctDates = await repo
      .createQueryBuilder('i')
      .select("DISTINCT DATE_FORMAT(i.inspection_date, '%Y-%m-%d')", 'date')
      .orderBy("DATE_FORMAT(i.inspection_date, '%Y-%m-%d')", 'DESC')
      .limit(30)
      .getRawMany();

    const availableDates = distinctDates
      .map((d: any) => {
        if (!d || !d.date) return null;
        if (d.date instanceof Date) {
          const y = d.date.getFullYear();
          const m = String(d.date.getMonth() + 1).padStart(2, '0');
          const day = String(d.date.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        }
        const s = String(d.date);
        return s.includes('T') ? s.split('T')[0] : s;
      })
      .filter((d): d is string => !!d);

    const cleanedItems = items.map(it => ({
      ...it,
      inspection_date: String(it.inspection_date || '').split('T')[0]
    }));

    return res.json({
      items: cleanedItems,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      stats: {
        total: totalCount,
        open: openCount,
        close: closeCount,
      },
      availableDates,
    });
  } catch (error) {
    console.error('Error fetching inspections:', error);
    return res.status(500).json({ message: 'Gagal mengambil data inspeksi unit' });
  }
});

// 2. GET /api/inspections/summary - Summary khusus per tanggal untuk Form ELMA IV-BEK-GA-046.04
router.get('/summary', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date } = req.query;
    const rawDate = (date as string) || new Date().toISOString().split('T')[0];
    const targetDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.trim();

    const repo = AppDataSource.getRepository(UnitInspection);
    const qb = repo.createQueryBuilder('i');
    qb.where("DATE_FORMAT(i.inspection_date, '%Y-%m-%d') = :date", { date: targetDate });
    qb.orderBy('i.unit_number', 'ASC');
    const items = await qb.getMany();

    const cleanedItems = items.map(it => ({
      ...it,
      inspection_date: String(it.inspection_date || '').split('T')[0]
    }));

    const openCount = cleanedItems.filter((x) => x.inspection_status === 'Open').length;
    const closeCount = cleanedItems.filter((x) => x.inspection_status === 'Close').length;

    return res.json({
      date: targetDate,
      form_number: 'ELMA IV-BEK-GA-046.04',
      rev: 'REV 04, 2025-09-01',
      company: 'PT LANCAR JAYA MITRA ABADI',
      site_location: 'BEK / BIANGAN',
      inspection_type: 'PM',
      total_inspected: cleanedItems.length,
      open_count: openCount,
      close_count: closeCount,
      items: cleanedItems,
    });
  } catch (error) {
    console.error('Error fetching inspection summary:', error);
    return res.status(500).json({ message: 'Gagal mengambil summary inspeksi' });
  }
});

// 2.5. GET /api/inspections/export-excel - Export Excel Resmi PT LANCAR JAYA MITRA ABADI
router.get('/export-excel', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, search, status } = req.query;
    const repo = AppDataSource.getRepository(UnitInspection);
    const qb = repo.createQueryBuilder('i');

    if (date && typeof date === 'string' && date.trim() !== '' && date !== 'all') {
      const cleanDate = date.includes('T') ? date.split('T')[0] : date.trim();
      qb.andWhere("DATE_FORMAT(i.inspection_date, '%Y-%m-%d') = :date", { date: cleanDate });
    }

    if (status && typeof status === 'string' && status !== 'all') {
      qb.andWhere('i.inspection_status = :status', { status });
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const s = `%${search.trim()}%`;
      qb.andWhere(
        '(i.unit_number LIKE :s OR i.vehicle_brand LIKE :s OR i.vehicle_model LIKE :s OR i.general_notes LIKE :s OR i.inspector_name LIKE :s)',
        { s }
      );
    }

    qb.orderBy('i.inspection_date', 'DESC').addOrderBy('i.unit_number', 'ASC');
    const items = await qb.getMany();

    const targetDate = typeof date === 'string' && date !== 'all' ? date : (items[0]?.inspection_date || new Date().toISOString().split('T')[0]);
    const cleanDate = targetDate.includes('T') ? targetDate.split('T')[0] : targetDate;

    const workbook = await generateInspectionExcel(items, cleanDate);

    const filename = `Form_Inspeksi_ELMA_${cleanDate}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting inspection excel:', error);
    return res.status(500).json({ message: 'Gagal mengekspor data inspeksi ke Excel resmi' });
  }
});

// 3. GET /api/inspections/:id - Detail 1 inspeksi
router.get('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const repo = AppDataSource.getRepository(UnitInspection);
    const item = await repo.findOne({ where: { id } });

    if (!item) {
      return res.status(404).json({ message: 'Data inspeksi tidak ditemukan' });
    }

    return res.json(item);
  } catch (error) {
    console.error('Error fetching inspection detail:', error);
    return res.status(500).json({ message: 'Gagal mengambil rincian inspeksi' });
  }
});

// 3.5. POST /api/inspections/bulk - Import banyak data inspeksi sekaligus
router.post('/bulk', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Daftar data inspeksi tidak boleh kosong' });
    }

    const repo = AppDataSource.getRepository(UnitInspection);
    const unitRepo = AppDataSource.getRepository(VehicleUnit);

    // Ambil master unit untuk pemetaan otomatis
    const allUnits = await unitRepo.find();
    const unitMap = new Map<string, VehicleUnit>();
    allUnits.forEach((u) => {
      if (u.unit_number) {
        unitMap.set(u.unit_number.trim().toLowerCase(), u);
      }
    });

    const defaultInspectors = await resolveInspectors(req);
    const savedInspections: UnitInspection[] = [];

    for (const raw of items) {
      if (!raw.unit_number || !String(raw.unit_number).trim()) continue;

      const unitNum = String(raw.unit_number).trim();
      const matchedUnit = unitMap.get(unitNum.toLowerCase());
      const targetDate = raw.inspection_date || new Date().toISOString().split('T')[0];

      const inspection = repo.create({
        inspection_date: targetDate,
        site_location: raw.site_location?.trim() || 'BEK / BIANGAN',
        inspection_type: raw.inspection_type?.trim() || 'PM',
        unit_id: matchedUnit ? matchedUnit.id : (raw.unit_id || null),
        unit_number: unitNum,
        old_unit_number: raw.old_unit_number?.trim() || null,
        vehicle_brand: raw.vehicle_brand?.trim() || (matchedUnit ? matchedUnit.vehicle_brand : null),
        vehicle_model: raw.vehicle_model?.trim() || (matchedUnit ? matchedUnit.unit_type : null),

        // Radio Rig
        radio_status: raw.radio_status === 'Tidak ada' ? 'Tidak ada' : 'Ada/layak',
        radio_kelistrikan: raw.radio_kelistrikan || 'Ada',
        radio_antena: raw.radio_antena || 'Ada',
        radio_kabel: raw.radio_kabel || 'Ada',
        radio_chanel: raw.radio_chanel || 'Ada',
        radio_notes: raw.radio_notes?.trim() || null,
        radio_photo_url: raw.radio_photo_url?.trim() || raw.photo_url?.trim() || null,

        // Camera
        camera_kelistrikan: raw.camera_kelistrikan || 'Ada',
        camera_posisi: raw.camera_posisi || 'Ada',
        camera_internet: raw.camera_internet || 'Ada',
        camera_gps: raw.camera_gps || 'Ada',
        camera_dascam: raw.camera_dascam || 'Ada',
        camera_kabin: raw.camera_kabin || 'Ada',
        camera_fatigue: raw.camera_fatigue || 'Ada',
        camera_memcard: raw.camera_memcard || 'Ada',
        camera_penyimpanan: raw.camera_penyimpanan || raw.camera_memcard || 'Ada',
        camera_status: raw.camera_status || 'Ada/layak',
        camera_notes: raw.camera_notes?.trim() || raw.camera_cabin_notes?.trim() || null,
        camera_photo_url: raw.camera_photo_url?.trim() || null,
        camera_cabin_status: raw.camera_cabin_status || (raw.camera_kabin === 'Tidak ada' ? 'Tidak ada' : 'Ada/layak'),
        camera_cabin_notes: raw.camera_cabin_notes?.trim() || null,
        camera_fatigue_status: raw.camera_fatigue_status || (raw.camera_fatigue === 'Tidak ada' ? 'Tidak ada' : 'Ada/layak'),
        camera_fatigue_notes: raw.camera_fatigue_notes?.trim() || null,

        // Status & Bukti
        inspection_status: raw.inspection_status === 'Open' ? 'Open' : 'Close',
        photo_url: raw.photo_url?.trim() || raw.radio_photo_url?.trim() || raw.camera_photo_url?.trim() || null,
        general_notes: raw.general_notes?.trim() || null,

        // Personil
        inspector_id: req.user?.userId || null,
        inspector_name: raw.inspector_name?.trim() || defaultInspectors.primaryName,
        inspector_role: raw.inspector_role?.trim() || defaultInspectors.primaryRole,
        inspector2_name: raw.inspector2_name?.trim() || defaultInspectors.secondaryName,
        inspector2_role: raw.inspector2_role?.trim() || defaultInspectors.secondaryRole,
      });

      savedInspections.push(inspection);
    }

    if (savedInspections.length === 0) {
      return res.status(400).json({ message: 'Tidak ada data valid yang dapat disimpan' });
    }

    const result = await repo.save(savedInspections, { chunk: 50 });

    const io = (global as any).io;
    if (io) {
      io.emit('inspectionsBulkCreated', { count: result.length });
    }

    return res.status(201).json({
      message: `Berhasil mengimport ${result.length} data inspeksi unit`,
      count: result.length,
      items: result,
    });
  } catch (error) {
    console.error('Error bulk importing inspections:', error);
    return res.status(500).json({ message: 'Gagal melakukan bulk import inspeksi' });
  }
});

// 4. POST /api/inspections - Tambah hasil inspeksi unit baru
router.post('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      inspection_date,
      site_location,
      inspection_type,
      unit_id,
      unit_number,
      old_unit_number,
      vehicle_brand,
      vehicle_model,
      // Radio
      radio_status,
      radio_kelistrikan,
      radio_antena,
      radio_kabel,
      radio_chanel,
      radio_notes,
      radio_photo_url,
      // Camera
      camera_status,
      camera_notes,
      camera_photo_url,
      camera_kelistrikan,
      camera_posisi,
      camera_internet,
      camera_gps,
      camera_dascam,
      camera_kabin,
      camera_fatigue,
      camera_memcard,
      camera_penyimpanan,
      camera_cabin_status,
      camera_cabin_notes,
      camera_fatigue_status,
      camera_fatigue_notes,
      // Status & Bukti
      inspection_status,
      photo_url,
      general_notes,
      // Petugas
      inspector_name,
      inspector_role,
      inspector2_name,
      inspector2_role,
    } = req.body;

    if (!unit_number || !unit_number.trim()) {
      return res.status(400).json({ message: 'Nomor lambung unit kendaraan wajib diisi' });
    }

    const repo = AppDataSource.getRepository(UnitInspection);
    const unitRepo = AppDataSource.getRepository(VehicleUnit);

    const targetDate = inspection_date || new Date().toISOString().split('T')[0];

    // Coba lengkapi data merk/model jika unit_id atau nomor lambung tersedia di master
    let resolvedUnitId = unit_id || null;
    let resolvedBrand = vehicle_brand || null;
    let resolvedModel = vehicle_model || null;

    if (!resolvedBrand || !resolvedUnitId) {
      const foundUnit = await unitRepo.findOne({ where: { unit_number: unit_number.trim() } });
      if (foundUnit) {
        resolvedUnitId = foundUnit.id;
        if (!resolvedBrand) resolvedBrand = foundUnit.vehicle_brand;
        if (!resolvedModel) resolvedModel = foundUnit.unit_type;
      }
    }

    // Tentukan personil inspeksi
    const inspectors = await resolveInspectors(req, inspector_name, inspector2_name);

    const inspection = repo.create({
      inspection_date: targetDate,
      site_location: site_location?.trim() || 'BEK / BIANGAN',
      inspection_type: inspection_type?.trim() || 'PM',
      unit_id: resolvedUnitId,
      unit_number: unit_number.trim(),
      old_unit_number: old_unit_number?.trim() || null,
      vehicle_brand: resolvedBrand,
      vehicle_model: resolvedModel,

      // 1. Radio Rig
      radio_status: radio_status || 'Ada/layak',
      radio_kelistrikan: radio_kelistrikan || 'Ada',
      radio_antena: radio_antena || 'Ada',
      radio_kabel: radio_kabel || 'Ada',
      radio_chanel: radio_chanel || 'Ada',
      radio_notes: radio_notes?.trim() || null,
      radio_photo_url: radio_photo_url?.trim() || photo_url?.trim() || null,

      // 2. Camera
      camera_kelistrikan: camera_kelistrikan || 'Ada',
      camera_posisi: camera_posisi || 'Ada',
      camera_internet: camera_internet || 'Ada',
      camera_gps: camera_gps || 'Ada',
      camera_dascam: camera_dascam || 'Ada',
      camera_kabin: camera_kabin || 'Ada',
      camera_fatigue: camera_fatigue || 'Ada',
      camera_memcard: camera_memcard || 'Ada',
      camera_penyimpanan: camera_penyimpanan || camera_memcard || 'Ada',
      camera_status: camera_status || 'Ada/layak',
      camera_notes: camera_notes?.trim() || camera_cabin_notes?.trim() || null,
      camera_photo_url: camera_photo_url?.trim() || null,
      camera_cabin_status: camera_cabin_status || (camera_kabin === 'Tidak ada' ? 'Tidak ada' : 'Ada/layak'),
      camera_cabin_notes: camera_cabin_notes?.trim() || null,
      camera_fatigue_status: camera_fatigue_status || (camera_fatigue === 'Tidak ada' ? 'Tidak ada' : 'Ada/layak'),
      camera_fatigue_notes: camera_fatigue_notes?.trim() || null,

      // Status Inspeksi & Bukti
      inspection_status: inspection_status === 'Open' ? 'Open' : 'Close',
      photo_url: photo_url?.trim() || radio_photo_url?.trim() || camera_photo_url?.trim() || null,
      general_notes: general_notes?.trim() || null,

      // Personil Inspeksi
      inspector_id: req.user?.userId || null,
      inspector_name: inspector_name?.trim() || inspectors.primaryName,
      inspector_role: inspector_role?.trim() || inspectors.primaryRole,
      inspector2_name: inspector2_name?.trim() || inspectors.secondaryName,
      inspector2_role: inspector2_role?.trim() || inspectors.secondaryRole,
    });

    await repo.save(inspection);

    // Socket.IO real-time notification
    const io = (global as any).io;
    if (io) {
      io.emit('inspectionCreated', inspection);
    }

    return res.status(201).json(inspection);
  } catch (error) {
    console.error('Error creating inspection:', error);
    return res.status(500).json({ message: 'Gagal menyimpan hasil inspeksi unit' });
  }
});

// 5. PATCH /api/inspections/:id - Update hasil inspeksi
router.patch('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const repo = AppDataSource.getRepository(UnitInspection);
    const item = await repo.findOne({ where: { id } });

    if (!item) {
      return res.status(404).json({ message: 'Data inspeksi tidak ditemukan' });
    }

    // Merge perubahan yang dikirim
    Object.assign(item, req.body);
    await repo.save(item);

    const io = (global as any).io;
    if (io) {
      io.emit('inspectionUpdated', item);
    }

    return res.json(item);
  } catch (error) {
    console.error('Error updating inspection:', error);
    return res.status(500).json({ message: 'Gagal memperbarui data inspeksi' });
  }
});

// 6. DELETE /api/inspections/:id - Hapus hasil inspeksi
router.delete('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const repo = AppDataSource.getRepository(UnitInspection);
    const item = await repo.findOne({ where: { id } });

    if (!item) {
      return res.status(404).json({ message: 'Data inspeksi tidak ditemukan' });
    }

    await repo.remove(item);

    const io = (global as any).io;
    if (io) {
      io.emit('inspectionDeleted', { id });
    }

    return res.json({ message: 'Data inspeksi berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting inspection:', error);
    return res.status(500).json({ message: 'Gagal menghapus data inspeksi' });
  }
});

export default router;
