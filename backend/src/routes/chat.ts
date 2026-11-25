import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { ChatMessage } from '../models/ChatMessage';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/chat/conversations - Ambil daftar percakapan (Chat Bersama & Semua Anggota/Kontak)
router.get('/conversations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const chatRepo = AppDataSource.getRepository(ChatMessage);

    const currentUser = await userRepo.findOne({ where: { id: req.userId } });
    if (!currentUser) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // 1. Ambil pesan terakhir untuk Chat Bersama
    const lastBroadcast = await chatRepo.findOne({
      where: { is_broadcast: true },
      order: { created_at: 'DESC' },
    });

    // 2. Ambil seluruh anggota/user lain (kecuali akun sendiri)
    const allUsers = await userRepo.find({
      order: { name: 'ASC' },
    });

    const otherUsers = allUsers.filter((u) => u.id !== currentUser.id);

    // Ambil pesan terakhir direct chat antara currentUser dan tiap user
    const memberConversations = await Promise.all(
      otherUsers.map(async (u) => {
        const lastMsg = await chatRepo
          .createQueryBuilder('c')
          .where('c.is_broadcast = false')
          .andWhere(
            '((c.user_id = :myId AND c.target_user_id = :otherId) OR (c.user_id = :otherId AND c.target_user_id = :myId) OR (c.target_user_id = :otherId AND c.user_id = :otherId AND :myRole = "admin") OR (c.target_user_id = :myId AND c.user_id = :myId AND :otherRole = "admin"))',
            {
              myId: currentUser.id,
              otherId: u.id,
              myRole: currentUser.role,
              otherRole: u.role,
            }
          )
          .orderBy('c.created_at', 'DESC')
          .getOne();

        return {
          id: u.id,
          username: u.username,
          name: u.name || u.username,
          role: u.role,
          status: u.status,
          last_message: lastMsg ? lastMsg.message : 'Mulai percakapan baru...',
          last_time: lastMsg ? lastMsg.created_at : null,
        };
      })
    );

    // Urutkan kontak: yang memiliki pesan terbaru berada di urutan atas
    memberConversations.sort((a, b) => {
      if (!a.last_time && !b.last_time) return a.name.localeCompare(b.name);
      if (!a.last_time) return 1;
      if (!b.last_time) return -1;
      return new Date(b.last_time).getTime() - new Date(a.last_time).getTime();
    });

    return res.json({
      broadcast: {
        id: 'broadcast',
        name: '📢 Chat Bersama (Grup Semua Anggota)',
        last_message: lastBroadcast ? lastBroadcast.message : 'Belum ada pengumuman bersama',
        last_time: lastBroadcast ? lastBroadcast.created_at : null,
      },
      members: memberConversations,
    });
  } catch (error) {
    console.error('Error saat mengambil daftar percakapan:', error);
    return res.status(500).json({ message: 'Gagal mengambil daftar percakapan' });
  }
});

// GET /api/chat/messages - Ambil riwayat pesan dalam thread
router.get('/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { target_user_id, is_broadcast } = req.query;
    const chatRepo = AppDataSource.getRepository(ChatMessage);
    const userRepo = AppDataSource.getRepository(User);

    const currentUser = await userRepo.findOne({ where: { id: req.userId } });
    if (!currentUser) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    if (is_broadcast === 'true') {
      // Thread Chat Bersama
      const messages = await chatRepo.find({
        where: { is_broadcast: true },
        order: { created_at: 'ASC' },
        take: 200,
      });
      return res.json(messages);
    } else {
      // Thread Direct Message
      if (!target_user_id) {
        return res.status(400).json({ message: 'target_user_id wajib ditentukan' });
      }

      const targetId = parseInt(target_user_id as string, 10);
      const targetUser = await userRepo.findOne({ where: { id: targetId } });

      const messages = await chatRepo
        .createQueryBuilder('c')
        .where('c.is_broadcast = false')
        .andWhere(
          '((c.user_id = :myId AND c.target_user_id = :targetId) OR (c.user_id = :targetId AND c.target_user_id = :myId) OR (c.target_user_id = :targetId AND c.user_id = :targetId AND :myRole = "admin") OR (c.target_user_id = :myId AND c.user_id = :myId AND :targetRole = "admin"))',
          {
            myId: currentUser.id,
            targetId,
            myRole: currentUser.role,
            targetRole: targetUser?.role || 'client',
          }
        )
        .orderBy('c.created_at', 'ASC')
        .take(200)
        .getMany();

      return res.json(messages);
    }
  } catch (error) {
    console.error('Error saat mengambil pesan chat:', error);
    return res.status(500).json({ message: 'Gagal mengambil pesan chat' });
  }
});

// POST /api/chat/messages - Kirim pesan baru (Support Broadcast & Direct Chat Semua Role)
router.post('/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, is_broadcast, target_user_id } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Pesan tidak boleh kosong' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const chatRepo = AppDataSource.getRepository(ChatMessage);

    const currentUser = await userRepo.findOne({ where: { id: req.userId } });
    if (!currentUser) {
      return res.status(404).json({ message: 'Pengirim tidak ditemukan' });
    }

    const broadcastFlag = Boolean(is_broadcast);
    let targetId: number | null = null;
    let targetUser: User | null = null;

    if (!broadcastFlag) {
      if (!target_user_id) {
        return res.status(400).json({ message: 'Penerima pesan (target_user_id) wajib dipilih' });
      }
      targetId = parseInt(String(target_user_id), 10);
      targetUser = await userRepo.findOne({ where: { id: targetId } });
      if (!targetUser) {
        return res.status(404).json({ message: 'Penerima tidak ditemukan' });
      }
    }

    const newMsg = chatRepo.create({
      user: currentUser,
      user_id: currentUser.id,
      target_user: targetUser,
      target_user_id: targetId,
      is_broadcast: broadcastFlag,
      sender_name: currentUser.name || currentUser.username,
      sender_role: currentUser.role,
      message: message.trim(),
    });

    await chatRepo.save(newMsg);

    // Broadcast event ke Socket.IO
    const io = (global as any).io;
    if (io) {
      io.emit('newChatMessage', {
        id: newMsg.id,
        user_id: newMsg.user_id,
        target_user_id: newMsg.target_user_id,
        is_broadcast: newMsg.is_broadcast,
        sender_name: newMsg.sender_name,
        sender_role: newMsg.sender_role,
        message: newMsg.message,
        created_at: newMsg.created_at,
      });
    }

    return res.status(201).json(newMsg);
  } catch (error) {
    console.error('Error saat mengirim pesan chat:', error);
    return res.status(500).json({ message: 'Gagal mengirim pesan chat' });
  }
});

// DELETE /api/chat/messages - Hapus percakapan pada thread
router.delete('/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { target_user_id, is_broadcast } = req.query;
    const chatRepo = AppDataSource.getRepository(ChatMessage);
    const userRepo = AppDataSource.getRepository(User);

    const currentUser = await userRepo.findOne({ where: { id: req.userId } });
    if (!currentUser) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const isAdmin = currentUser.role === 'admin' || currentUser.username === 'admin';
    const io = (global as any).io;

    if (is_broadcast === 'true') {
      if (!isAdmin) {
        return res.status(403).json({ message: 'Hanya Administrator yang dapat membersihkan Chat Bersama' });
      }

      await chatRepo
        .createQueryBuilder()
        .delete()
        .where('is_broadcast = :is_broadcast', { is_broadcast: true })
        .execute();

      if (io) {
        io.emit('chatCleared', { is_broadcast: true });
      }

      return res.json({ message: 'Percakapan Chat Bersama berhasil dibersihkan' });
    } else {
      if (!target_user_id) {
        return res.status(400).json({ message: 'target_user_id wajib ditentukan' });
      }
      const targetId = parseInt(target_user_id as string, 10);

      await chatRepo
        .createQueryBuilder()
        .delete()
        .where('is_broadcast = false')
        .andWhere(
          '((user_id = :myId AND target_user_id = :targetId) OR (user_id = :targetId AND target_user_id = :myId))',
          {
            myId: currentUser.id,
            targetId,
          }
        )
        .execute();

      if (io) {
        io.emit('chatCleared', { user_id: currentUser.id, target_user_id: targetId });
      }

      return res.json({ message: 'Riwayat percakapan direct berhasil dibersihkan' });
    }
  } catch (error) {
    console.error('Error saat menghapus percakapan:', error);
    return res.status(500).json({ message: 'Gagal menghapus percakapan' });
  }
});

export default router;
