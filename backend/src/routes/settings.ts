import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { AppSetting } from '../models/AppSetting';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/settings - Ambil semua setting aplikasi (nama, tagline, logo url)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const settingRepo = AppDataSource.getRepository(AppSetting);
    const settings = await settingRepo.find();

    const result: Record<string, string> = {
      app_name: 'TAURUS',
      app_tagline: 'IT SUPPORT SYSTEM',
      app_logo_url: '',
    };

    settings.forEach((s) => {
      result[s.setting_key] = s.setting_value || '';
    });

    return res.json(result);
  } catch (error) {
    console.error('Error saat mengambil setting aplikasi:', error);
    return res.status(500).json({ message: 'Gagal mengambil setting aplikasi' });
  }
});

// POST /api/settings - Update setting aplikasi (Khusus Administrator)
router.post('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { app_name, app_tagline, app_logo_url } = req.body;
    const settingRepo = AppDataSource.getRepository(AppSetting);

    const updateOrInsert = async (key: string, val: string) => {
      let record = await settingRepo.findOne({ where: { setting_key: key } });
      if (record) {
        record.setting_value = val;
      } else {
        record = settingRepo.create({ setting_key: key, setting_value: val });
      }
      await settingRepo.save(record);
    };

    if (app_name !== undefined) await updateOrInsert('app_name', app_name.trim());
    if (app_tagline !== undefined) await updateOrInsert('app_tagline', app_tagline.trim());
    if (app_logo_url !== undefined) await updateOrInsert('app_logo_url', app_logo_url.trim());

    // Broadcast ke semua client agar logo & nama langsung berubah secara realtime
    const io = (global as any).io;
    if (io) {
      io.emit('settingsUpdated', {
        app_name: app_name?.trim() || 'TAURUS',
        app_tagline: app_tagline?.trim() || 'IT SUPPORT SYSTEM',
        app_logo_url: app_logo_url?.trim() || '',
      });
    }

    return res.json({
      message: 'Pengaturan identitas aplikasi berhasil diperbarui!',
      settings: {
        app_name,
        app_tagline,
        app_logo_url,
      },
    });
  } catch (error) {
    console.error('Error saat menyimpan setting aplikasi:', error);
    return res.status(500).json({ message: 'Gagal menyimpan setting aplikasi' });
  }
});

export default router;
