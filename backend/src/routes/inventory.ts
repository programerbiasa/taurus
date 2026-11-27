import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { InventoryItem } from '../models/InventoryItem';
import { InventoryTransaction } from '../models/InventoryTransaction';
import { InventoryLocation } from '../models/InventoryLocation';
import { InventoryPic } from '../models/InventoryPic';
import { InventoryCategory } from '../models/InventoryCategory';
import { InventoryBrand } from '../models/InventoryBrand';
import { InventoryType } from '../models/InventoryType';
import { User } from '../models/User';
import { verifyToken, requireStaff, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Helper untuk mendapatkan nama operator dari akun yang sedang login
async function getOperatorName(req: AuthenticatedRequest, fallback?: string): Promise<string> {
  if (req.user?.userId) {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const u = await userRepo.findOne({ where: { id: req.user.userId } });
      if (u) {
        return u.name ? `${u.name} (@${u.username})` : u.username;
      }
    } catch (err) {
      console.error('Error fetching user for operator name:', err);
    }
  }
  return fallback || req.user?.username || 'Petugas IT';
}

// Helper emit WebSocket
function emitInventoryUpdate(type: string, data: any) {
  try {
    const io = (global as any).io;
    if (io) {
      io.emit('inventoryUpdated', { type, data, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('Error emitting socket event inventoryUpdated:', err);
  }
}

// ==========================================
// 1. MASTER LOKASI (inventory_locations)
// ==========================================
router.get('/locations', verifyToken, async (_req, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(InventoryLocation);
    const locations = await repo.find({ order: { name: 'ASC' } });
    return res.json(locations);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal mengambil data lokasi', error: err.message });
  }
});

router.post('/locations', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Nama lokasi wajib diisi' });
    }
    const repo = AppDataSource.getRepository(InventoryLocation);
    const exists = await repo.findOne({ where: { name: name.trim() } });
    if (exists) {
      return res.status(400).json({ message: 'Lokasi dengan nama tersebut sudah ada' });
    }
    const loc = repo.create({ name: name.trim(), description: description?.trim() || null });
    await repo.save(loc);
    emitInventoryUpdate('location_created', loc);
    return res.status(201).json(loc);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal menambah lokasi', error: err.message });
  }
});

router.put('/locations/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description } = req.body;
    const repo = AppDataSource.getRepository(InventoryLocation);
    const loc = await repo.findOne({ where: { id } });
    if (!loc) return res.status(404).json({ message: 'Lokasi tidak ditemukan' });

    if (name && name.trim()) {
      const exists = await repo.findOne({ where: { name: name.trim() } });
      if (exists && exists.id !== id) {
        return res.status(400).json({ message: 'Lokasi dengan nama tersebut sudah digunakan' });
      }
      loc.name = name.trim();
    }
    if (description !== undefined) loc.description = description ? description.trim() : undefined;
    await repo.save(loc);
    emitInventoryUpdate('location_updated', loc);
    return res.json(loc);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal mengubah lokasi', error: err.message });
  }
});

router.delete('/locations/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const repo = AppDataSource.getRepository(InventoryLocation);
    const loc = await repo.findOne({ where: { id } });
    if (!loc) return res.status(404).json({ message: 'Lokasi tidak ditemukan' });
    await repo.remove(loc);
    emitInventoryUpdate('location_deleted', { id });
    return res.json({ message: 'Lokasi berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal menghapus lokasi', error: err.message });
  }
});

// ==========================================
// 2. MASTER PIC TERKAIT LOKASI (inventory_pics)
// ==========================================
router.get('/pics', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const locationId = req.query.location_id ? parseInt(req.query.location_id as string, 10) : undefined;
    const repo = AppDataSource.getRepository(InventoryPic);
    const qb = repo.createQueryBuilder('p')
      .leftJoinAndSelect('p.location', 'loc')
      .orderBy('p.name', 'ASC');

    if (locationId) {
      qb.where('p.location_id = :locationId', { locationId });
    }

    const pics = await qb.getMany();
    return res.json(pics);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal mengambil data PIC', error: err.message });
  }
});

router.post('/pics', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, location_id, phone, department, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Nama PIC wajib diisi' });
    }
    const repo = AppDataSource.getRepository(InventoryPic);
    const pic = repo.create({
      name: name.trim(),
      location_id: location_id ? parseInt(location_id, 10) : null,
      phone: phone?.trim() || null,
      department: department?.trim() || null,
      status: status || 'active',
    });
    await repo.save(pic);
    const saved = await repo.findOne({ where: { id: pic.id }, relations: ['location'] });
    emitInventoryUpdate('pic_created', saved);
    return res.status(201).json(saved);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal menambah PIC', error: err.message });
  }
});

router.put('/pics/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, location_id, phone, department, status } = req.body;
    const repo = AppDataSource.getRepository(InventoryPic);
    const pic = await repo.findOne({ where: { id } });
    if (!pic) return res.status(404).json({ message: 'PIC tidak ditemukan' });

    if (name !== undefined) pic.name = name.trim();
    if (location_id !== undefined) pic.location_id = location_id ? parseInt(location_id, 10) : null;
    if (phone !== undefined) pic.phone = phone ? phone.trim() : undefined;
    if (department !== undefined) pic.department = department ? department.trim() : undefined;
    if (status !== undefined) pic.status = status;

    await repo.save(pic);
    const updated = await repo.findOne({ where: { id }, relations: ['location'] });
    emitInventoryUpdate('pic_updated', updated);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal mengubah PIC', error: err.message });
  }
});

router.delete('/pics/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const repo = AppDataSource.getRepository(InventoryPic);
    const pic = await repo.findOne({ where: { id } });
    if (!pic) return res.status(404).json({ message: 'PIC tidak ditemukan' });
    await repo.remove(pic);
    emitInventoryUpdate('pic_deleted', { id });
    return res.json({ message: 'PIC berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal menghapus PIC', error: err.message });
  }
});

// ==========================================
// 3. MASTER JENIS BARANG (inventory_categories)
// ==========================================
router.get('/categories', verifyToken, async (_req, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(InventoryCategory);
    const categories = await repo.find({ order: { name: 'ASC' } });
    return res.json(categories);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal mengambil jenis barang', error: err.message });
  }
});

router.post('/categories', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Nama jenis barang wajib diisi' });
    const repo = AppDataSource.getRepository(InventoryCategory);
    const exists = await repo.findOne({ where: { name: name.trim() } });
    if (exists) return res.status(400).json({ message: 'Jenis barang tersebut sudah ada' });

    const cat = repo.create({ name: name.trim(), description: description?.trim() || null });
    await repo.save(cat);
    emitInventoryUpdate('category_created', cat);
    return res.status(201).json(cat);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal menambah jenis barang', error: err.message });
  }
});

router.put('/categories/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description } = req.body;
    const repo = AppDataSource.getRepository(InventoryCategory);
    const cat = await repo.findOne({ where: { id } });
    if (!cat) return res.status(404).json({ message: 'Jenis barang tidak ditemukan' });

    if (name && name.trim()) {
      const exists = await repo.findOne({ where: { name: name.trim() } });
      if (exists && exists.id !== id) return res.status(400).json({ message: 'Nama jenis barang sudah digunakan' });
      cat.name = name.trim();
    }
    if (description !== undefined) cat.description = description ? description.trim() : undefined;
    await repo.save(cat);
    emitInventoryUpdate('category_updated', cat);
    return res.json(cat);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal mengubah jenis barang', error: err.message });
  }
});

router.delete('/categories/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const repo = AppDataSource.getRepository(InventoryCategory);
    const cat = await repo.findOne({ where: { id } });
    if (!cat) return res.status(404).json({ message: 'Jenis barang tidak ditemukan' });
    await repo.remove(cat);
    emitInventoryUpdate('category_deleted', { id });
    return res.json({ message: 'Jenis barang berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal menghapus jenis barang', error: err.message });
  }
});

// ==========================================
// 4. MASTER MERK & TIPE (inventory_brands, inventory_types)
// ==========================================
router.get('/brands', verifyToken, async (_req, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(InventoryBrand);
    const brands = await repo.find({ order: { name: 'ASC' } });
    return res.json(brands);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal mengambil data merk', error: err.message });
  }
});

router.post('/brands', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Nama merk wajib diisi' });
    const repo = AppDataSource.getRepository(InventoryBrand);
    const exists = await repo.findOne({ where: { name: name.trim() } });
    if (exists) return res.status(400).json({ message: 'Merk tersebut sudah ada' });

    const brand = repo.create({ name: name.trim(), description: description?.trim() || null });
    await repo.save(brand);
    emitInventoryUpdate('brand_created', brand);
    return res.status(201).json(brand);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal menambah merk', error: err.message });
  }
});

router.put('/brands/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description } = req.body;
    const repo = AppDataSource.getRepository(InventoryBrand);
    const brand = await repo.findOne({ where: { id } });
    if (!brand) return res.status(404).json({ message: 'Merk tidak ditemukan' });

    if (name && name.trim()) {
      const exists = await repo.findOne({ where: { name: name.trim() } });
      if (exists && exists.id !== id) return res.status(400).json({ message: 'Nama merk sudah digunakan' });
      brand.name = name.trim();
    }
    if (description !== undefined) brand.description = description ? description.trim() : undefined;
    await repo.save(brand);
    emitInventoryUpdate('brand_updated', brand);
    return res.json(brand);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal mengubah merk', error: err.message });
  }
});

router.delete('/brands/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const repo = AppDataSource.getRepository(InventoryBrand);
    const brand = await repo.findOne({ where: { id } });
    if (!brand) return res.status(404).json({ message: 'Merk tidak ditemukan' });
    await repo.remove(brand);
    emitInventoryUpdate('brand_deleted', { id });
    return res.json({ message: 'Merk berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal menghapus merk', error: err.message });
  }
});

// TYPES
router.get('/types', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const brandId = req.query.brand_id ? parseInt(req.query.brand_id as string, 10) : undefined;
    const repo = AppDataSource.getRepository(InventoryType);
    const qb = repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.brand', 'brand')
      .orderBy('t.name', 'ASC');

    if (brandId) {
      qb.where('t.brand_id = :brandId', { brandId });
    }
    const types = await qb.getMany();
    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal mengambil data tipe', error: err.message });
  }
});

router.post('/types', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, brand_id, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Nama tipe/model wajib diisi' });
    const repo = AppDataSource.getRepository(InventoryType);
    const t = repo.create({
      name: name.trim(),
      brand_id: brand_id ? parseInt(brand_id, 10) : null,
      description: description?.trim() || null,
    });
    await repo.save(t);
    const saved = await repo.findOne({ where: { id: t.id }, relations: ['brand'] });
    emitInventoryUpdate('type_created', saved);
    return res.status(201).json(saved);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal menambah tipe', error: err.message });
  }
});

router.put('/types/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, brand_id, description } = req.body;
    const repo = AppDataSource.getRepository(InventoryType);
    const t = await repo.findOne({ where: { id } });
    if (!t) return res.status(404).json({ message: 'Tipe tidak ditemukan' });

    if (name !== undefined) t.name = name.trim();
    if (brand_id !== undefined) t.brand_id = brand_id ? parseInt(brand_id, 10) : null;
    if (description !== undefined) t.description = description ? description.trim() : undefined;

    await repo.save(t);
    const updated = await repo.findOne({ where: { id }, relations: ['brand'] });
    emitInventoryUpdate('type_updated', updated);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal mengubah tipe', error: err.message });
  }
});

router.delete('/types/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const repo = AppDataSource.getRepository(InventoryType);
    const t = await repo.findOne({ where: { id } });
    if (!t) return res.status(404).json({ message: 'Tipe tidak ditemukan' });
    await repo.remove(t);
    emitInventoryUpdate('type_deleted', { id });
    return res.json({ message: 'Tipe berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal menghapus tipe', error: err.message });
  }
});

// ==========================================
// 5. MASTER BARANG (inventory_items)
// ==========================================

// Helper auto-generate Item Code: BRG-YYYYMM-XXXX
router.get('/items/generate-code', verifyToken, async (_req, res: Response) => {
  try {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `BRG-${yearMonth}-`;

    const repo = AppDataSource.getRepository(InventoryItem);
    const lastItem = await repo.createQueryBuilder('item')
      .where('item.item_code LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('item.item_code', 'DESC')
      .getOne();

    let seq = 1;
    if (lastItem && lastItem.item_code) {
      const parts = lastItem.item_code.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }
    const newCode = `${prefix}${String(seq).padStart(3, '0')}`;
    return res.json({ code: newCode });
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal membuat kode barang', error: err.message });
  }
});

// GET /api/inventory/items (Dengan search, filter, pagination, dan summary counters)
router.get('/items', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const category_id = req.query.category_id ? parseInt(req.query.category_id as string, 10) : undefined;
    const brand_id = req.query.brand_id ? parseInt(req.query.brand_id as string, 10) : undefined;
    const location_id = req.query.location_id ? parseInt(req.query.location_id as string, 10) : undefined;
    const condition_status = req.query.condition_status as string | undefined;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 25;
    const all = req.query.all === 'true';

    const repo = AppDataSource.getRepository(InventoryItem);

    const qb = repo.createQueryBuilder('i')
      .leftJoinAndSelect('i.category', 'cat')
      .leftJoinAndSelect('i.brand', 'brand')
      .leftJoinAndSelect('i.type', 'type')
      .leftJoinAndSelect('i.current_location', 'loc')
      .leftJoinAndSelect('i.current_pic', 'pic');

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      qb.andWhere(
        '(i.item_code LIKE :s OR i.name LIKE :s OR i.serial_number LIKE :s OR cat.name LIKE :s OR brand.name LIKE :s OR type.name LIKE :s OR loc.name LIKE :s OR pic.name LIKE :s)',
        { s }
      );
    }

    if (category_id) qb.andWhere('i.category_id = :category_id', { category_id });
    if (brand_id) qb.andWhere('i.brand_id = :brand_id', { brand_id });
    if (location_id) qb.andWhere('i.current_location_id = :location_id', { location_id });
    if (condition_status) qb.andWhere('i.condition_status = :condition_status', { condition_status });
    if (status) qb.andWhere('i.status = :status', { status });

    qb.orderBy('i.id', 'DESC');

    if (all) {
      const items = await qb.getMany();
      return res.json(items);
    }

    const total = await qb.getCount();
    const items = await qb.skip((page - 1) * limit).take(limit).getMany();

    // Summary counters
    const [counts] = await repo.query(`
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) as in_stock_count,
        SUM(CASE WHEN status = 'deployed' THEN 1 ELSE 0 END) as deployed_count,
        SUM(CASE WHEN condition_status = 'Rusak' THEN 1 ELSE 0 END) as damaged_count,
        SUM(CASE WHEN condition_status = 'Hilang' THEN 1 ELSE 0 END) as lost_count,
        SUM(CASE WHEN condition_status = 'Scrap' THEN 1 ELSE 0 END) as scrap_count
      FROM inventory_items
    `);

    return res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: counts,
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal mengambil data barang', error: err.message });
  }
});

// GET /api/inventory/items/:id (Detail barang + riwayat mutasi/transaksi)
router.get('/items/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const repo = AppDataSource.getRepository(InventoryItem);
    const item = await repo.findOne({
      where: { id },
      relations: ['category', 'brand', 'type', 'current_location', 'current_pic'],
    });

    if (!item) return res.status(404).json({ message: 'Barang tidak ditemukan' });

    // Ambil riwayat mutasi / transaksi barang ini
    const txRepo = AppDataSource.getRepository(InventoryTransaction);
    const transactions = await txRepo.find({
      where: { item_id: id },
      relations: ['from_location', 'to_location', 'from_pic', 'to_pic'],
      order: { transaction_date: 'DESC', id: 'DESC' },
    });

    return res.json({ item, transactions });
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal mengambil detail barang', error: err.message });
  }
});

// POST /api/inventory/items (Tambah Master Barang & catat transaksi Masuk awal)
router.post('/items', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      item_code,
      name,
      serial_number,
      category_id,
      brand_id,
      type_id,
      current_location_id,
      current_pic_id,
      condition_status,
      entry_date,
      notes,
      photo_url,
    } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ message: 'Nama barang wajib diisi' });

    const repo = AppDataSource.getRepository(InventoryItem);

    // Pastikan kode barang unik
    let code = item_code ? item_code.trim() : '';
    if (!code) {
      const now = new Date();
      const prefix = `BRG-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;
      const lastItem = await repo.createQueryBuilder('item')
        .where('item.item_code LIKE :prefix', { prefix: `${prefix}%` })
        .orderBy('item.item_code', 'DESC')
        .getOne();
      let seq = 1;
      if (lastItem) {
        const parts = lastItem.item_code.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
      }
      code = `${prefix}${String(seq).padStart(3, '0')}`;
    } else {
      const exists = await repo.findOne({ where: { item_code: code } });
      if (exists) return res.status(400).json({ message: `ID Barang '${code}' sudah digunakan` });
    }

    const operatorName = await getOperatorName(req);

    const isDeployed = Boolean(current_pic_id);
    const item = repo.create({
      item_code: code,
      name: name.trim(),
      serial_number: serial_number?.trim() || null,
      category_id: category_id ? parseInt(category_id, 10) : null,
      brand_id: brand_id ? parseInt(brand_id, 10) : null,
      type_id: type_id ? parseInt(type_id, 10) : null,
      current_location_id: current_location_id ? parseInt(current_location_id, 10) : null,
      current_pic_id: current_pic_id ? parseInt(current_pic_id, 10) : null,
      condition_status: condition_status || 'Baik',
      status: isDeployed ? 'deployed' : 'in_stock',
      entry_date: entry_date || new Date().toISOString().split('T')[0],
      last_update_date: new Date(),
      notes: notes?.trim() || null,
      photo_url: photo_url?.trim() || null,
    });

    await repo.save(item);

    // Catat log transaksi masuk awal
    const txRepo = AppDataSource.getRepository(InventoryTransaction);
    const tx = txRepo.create({
      item_id: item.id,
      transaction_type: 'masuk',
      transaction_date: new Date(),
      to_location_id: item.current_location_id,
      to_pic_id: item.current_pic_id,
      condition_status: item.condition_status,
      notes: notes || 'Registrasi barang baru masuk gudang / ruang IT',
      operator_id: req.user?.userId,
      operator_name: operatorName,
    });
    await txRepo.save(tx);

    const savedItem = await repo.findOne({
      where: { id: item.id },
      relations: ['category', 'brand', 'type', 'current_location', 'current_pic'],
    });

    emitInventoryUpdate('item_created', savedItem);
    return res.status(201).json(savedItem);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal menambah barang', error: err.message });
  }
});

// PUT /api/inventory/items/:id (Edit data master barang)
router.put('/items/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const repo = AppDataSource.getRepository(InventoryItem);
    const item = await repo.findOne({ where: { id } });
    if (!item) return res.status(404).json({ message: 'Barang tidak ditemukan' });

    const {
      item_code,
      name,
      serial_number,
      category_id,
      brand_id,
      type_id,
      current_location_id,
      current_pic_id,
      condition_status,
      status,
      entry_date,
      notes,
      photo_url,
    } = req.body;

    if (item_code && item_code.trim()) {
      const code = item_code.trim();
      const exists = await repo.findOne({ where: { item_code: code } });
      if (exists && exists.id !== id) {
        return res.status(400).json({ message: `ID Barang '${code}' sudah digunakan oleh barang lain` });
      }
      item.item_code = code;
    }

    if (name !== undefined) item.name = name.trim();
    if (serial_number !== undefined) item.serial_number = serial_number ? serial_number.trim() : undefined;
    if (category_id !== undefined) item.category_id = category_id ? parseInt(category_id, 10) : null;
    if (brand_id !== undefined) item.brand_id = brand_id ? parseInt(brand_id, 10) : null;
    if (type_id !== undefined) item.type_id = type_id ? parseInt(type_id, 10) : null;
    if (current_location_id !== undefined) item.current_location_id = current_location_id ? parseInt(current_location_id, 10) : null;
    if (current_pic_id !== undefined) item.current_pic_id = current_pic_id ? parseInt(current_pic_id, 10) : null;
    if (condition_status !== undefined) item.condition_status = condition_status;
    if (status !== undefined) item.status = status;
    if (entry_date !== undefined) item.entry_date = entry_date;
    if (notes !== undefined) item.notes = notes ? notes.trim() : undefined;
    if (photo_url !== undefined) item.photo_url = photo_url ? photo_url.trim() : undefined;

    item.last_update_date = new Date();
    await repo.save(item);

    const updated = await repo.findOne({
      where: { id },
      relations: ['category', 'brand', 'type', 'current_location', 'current_pic'],
    });

    emitInventoryUpdate('item_updated', updated);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal mengubah data barang', error: err.message });
  }
});

// DELETE /api/inventory/items/:id (Hapus barang)
router.delete('/items/:id', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const repo = AppDataSource.getRepository(InventoryItem);
    const item = await repo.findOne({ where: { id } });
    if (!item) return res.status(404).json({ message: 'Barang tidak ditemukan' });

    await repo.remove(item);
    emitInventoryUpdate('item_deleted', { id });
    return res.json({ message: 'Barang berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal menghapus barang', error: err.message });
  }
});

// ==========================================
// 6. PROSES BARANG KELUAR (Dispatch to Location & PIC)
// ==========================================
router.post('/out', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      item_id,
      to_location_id,
      to_pic_id,
      transaction_date,
      condition_status,
      recipient_name,
      doc_number,
      notes,
    } = req.body;

    if (!item_id) return res.status(400).json({ message: 'Pilih barang yang akan dikeluarkan' });
    if (!to_location_id) return res.status(400).json({ message: 'Lokasi tujuan wajib dipilih' });
    if (!to_pic_id) return res.status(400).json({ message: 'PIC penerima wajib dipilih' });

    const itemRepo = AppDataSource.getRepository(InventoryItem);
    const item = await repoFindItem(item_id);
    if (!item) return res.status(404).json({ message: 'Barang tidak ditemukan' });

    const fromLocId = item.current_location_id;
    const fromPicId = item.current_pic_id;
    const operatorName = await getOperatorName(req);
    const txDate = transaction_date ? new Date(transaction_date) : new Date();

    // 1. Update item status to deployed, set new location, new PIC, and update last_update_date
    item.current_location_id = parseInt(to_location_id, 10);
    item.current_pic_id = parseInt(to_pic_id, 10);
    item.status = 'deployed';
    item.last_update_date = txDate;
    if (condition_status) item.condition_status = condition_status;
    if (notes) item.notes = notes;

    await itemRepo.save(item);

    // 2. Insert transaction log
    const txRepo = AppDataSource.getRepository(InventoryTransaction);
    const tx = txRepo.create({
      item_id: item.id,
      transaction_type: 'keluar',
      transaction_date: txDate,
      from_location_id: fromLocId,
      to_location_id: item.current_location_id,
      from_pic_id: fromPicId,
      to_pic_id: item.current_pic_id,
      condition_status: item.condition_status,
      recipient_name: recipient_name?.trim() || null,
      doc_number: doc_number?.trim() || null,
      notes: notes?.trim() || 'Barang dikeluarkan ke PIC terkait',
      operator_id: req.user?.userId,
      operator_name: operatorName,
    });
    await txRepo.save(tx);

    const updatedItem = await repoFindItem(item.id);
    emitInventoryUpdate('item_dispatched', { item: updatedItem, transaction: tx });
    return res.status(201).json({ message: 'Barang berhasil dikeluarkan ke PIC terkait', item: updatedItem, transaction: tx });
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal memproses barang keluar', error: err.message });
  }
});

// ==========================================
// 7. PROSES BARANG MASUK / KEMBALI KE RUANG IT
// ==========================================
router.post('/in', verifyToken, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      item_id, // jika mengembalikan barang lama yang sedang keluar
      to_location_id, // default ruang IT jika tidak diisi
      condition_status,
      transaction_date,
      notes,
      doc_number,
    } = req.body;

    if (!item_id) {
      return res.status(400).json({ message: 'Pilih barang yang masuk/kembali' });
    }

    const itemRepo = AppDataSource.getRepository(InventoryItem);
    const item = await repoFindItem(item_id);
    if (!item) return res.status(404).json({ message: 'Barang tidak ditemukan' });

    // Cari ID Ruang IT jika to_location_id tidak diisi
    let targetLocId = to_location_id ? parseInt(to_location_id, 10) : null;
    if (!targetLocId) {
      const locRepo = AppDataSource.getRepository(InventoryLocation);
      const itRoom = await locRepo.findOne({ where: { name: 'Ruang IT' } });
      targetLocId = itRoom ? itRoom.id : (item.current_location_id ?? null);
    }

    const fromLocId = item.current_location_id;
    const fromPicId = item.current_pic_id;
    const operatorName = await getOperatorName(req);
    const txDate = transaction_date ? new Date(transaction_date) : new Date();

    // Update item: kembali ke gudang/ruang IT, PIC kosong, status in_stock
    item.current_location_id = targetLocId;
    item.current_pic_id = null;
    item.status = 'in_stock';
    item.last_update_date = txDate;
    if (condition_status) item.condition_status = condition_status;
    if (notes) item.notes = notes;

    await itemRepo.save(item);

    // Insert transaction log
    const txRepo = AppDataSource.getRepository(InventoryTransaction);
    const tx = txRepo.create({
      item_id: item.id,
      transaction_type: 'kembali',
      transaction_date: txDate,
      from_location_id: fromLocId,
      to_location_id: targetLocId,
      from_pic_id: fromPicId,
      to_pic_id: null,
      condition_status: item.condition_status,
      doc_number: doc_number?.trim() || null,
      notes: notes?.trim() || 'Barang kembali masuk ke Ruang IT',
      operator_id: req.user?.userId,
      operator_name: operatorName,
    });
    await txRepo.save(tx);

    const updatedItem = await repoFindItem(item.id);
    emitInventoryUpdate('item_returned', { item: updatedItem, transaction: tx });
    return res.status(201).json({ message: 'Barang berhasil dicatat masuk ke Ruang IT', item: updatedItem, transaction: tx });
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal memproses barang masuk', error: err.message });
  }
});

// ==========================================
// 8. RIWAYAT TRANSAKSI (inventory_transactions)
// ==========================================
router.get('/transactions', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const type = req.query.type as string | undefined; // 'masuk' | 'keluar' | 'mutasi' | 'kembali'
    const itemId = req.query.item_id ? parseInt(req.query.item_id as string, 10) : undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 25;
    const search = req.query.search as string | undefined;

    const txRepo = AppDataSource.getRepository(InventoryTransaction);
    const qb = txRepo.createQueryBuilder('tx')
      .leftJoinAndSelect('tx.item', 'item')
      .leftJoinAndSelect('item.category', 'cat')
      .leftJoinAndSelect('item.brand', 'brand')
      .leftJoinAndSelect('item.type', 'itype')
      .leftJoinAndSelect('tx.from_location', 'fromLoc')
      .leftJoinAndSelect('tx.to_location', 'toLoc')
      .leftJoinAndSelect('tx.from_pic', 'fromPic')
      .leftJoinAndSelect('tx.to_pic', 'toPic')
      .orderBy('tx.transaction_date', 'DESC')
      .addOrderBy('tx.id', 'DESC');

    if (type) {
      if (type === 'masuk') {
        qb.andWhere("tx.transaction_type IN ('masuk', 'kembali')");
      } else if (type === 'keluar') {
        qb.andWhere("tx.transaction_type IN ('keluar', 'mutasi')");
      } else {
        qb.andWhere('tx.transaction_type = :type', { type });
      }
    }

    if (itemId) {
      qb.andWhere('tx.item_id = :itemId', { itemId });
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      qb.andWhere(
        '(item.item_code LIKE :s OR item.name LIKE :s OR item.serial_number LIKE :s OR toLoc.name LIKE :s OR toPic.name LIKE :s OR tx.doc_number LIKE :s OR tx.notes LIKE :s)',
        { s }
      );
    }

    const total = await qb.getCount();
    const transactions = await qb.skip((page - 1) * limit).take(limit).getMany();

    return res.json({
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Gagal mengambil riwayat transaksi', error: err.message });
  }
});

// Helper finder
async function repoFindItem(id: number) {
  const itemRepo = AppDataSource.getRepository(InventoryItem);
  return itemRepo.findOne({
    where: { id },
    relations: ['category', 'brand', 'type', 'current_location', 'current_pic'],
  });
}

export default router;
