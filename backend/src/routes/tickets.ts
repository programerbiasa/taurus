import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Ticket } from '../models/Ticket';
import { TicketComment } from '../models/TicketComment';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/tickets - Ambil semua tiket (dengan filter status opsional & search)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, priority, search } = req.query;
    const ticketRepo = AppDataSource.getRepository(Ticket);
    const userRepo = AppDataSource.getRepository(User);

    const currentUser = await userRepo.findOne({ where: { id: req.userId } });

    const queryBuilder = ticketRepo
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.reporter', 'reporter')
      .leftJoinAndSelect('ticket.assignee', 'assignee')
      .leftJoinAndSelect('ticket.comments', 'comments')
      .orderBy('ticket.created_at', 'DESC');

    // Jika Client atau query my_tickets=true, hanya tampilkan tiket miliknya sendiri
    if (currentUser?.role === 'client' || req.query.my_tickets === 'true') {
      queryBuilder.andWhere('ticket.reporter_id = :reporter_id', { reporter_id: req.userId });
    }

    if (status && typeof status === 'string' && status !== 'All') {
      queryBuilder.andWhere('ticket.status = :status', { status });
    }

    if (priority && typeof priority === 'string' && priority !== 'All') {
      queryBuilder.andWhere('ticket.priority = :priority', { priority });
    }

    if (search && typeof search === 'string') {
      queryBuilder.andWhere(
        '(ticket.subject LIKE :search OR ticket.detail LIKE :search OR ticket.category LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const tickets = await queryBuilder.getMany();
    return res.json(tickets);
  } catch (error) {
    console.error('Error saat mengambil tiket:', error);
    return res.status(500).json({ message: 'Gagal mengambil daftar tiket' });
  }
});

// GET /api/tickets/:id - Ambil detail satu tiket
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: 'ID Tiket tidak valid' });
    }

    const ticketRepo = AppDataSource.getRepository(Ticket);
    const ticket = await ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['reporter', 'assignee', 'comments', 'comments.author'],
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Tiket tidak ditemukan' });
    }

    return res.json(ticket);
  } catch (error) {
    console.error('Error saat mengambil detail tiket:', error);
    return res.status(500).json({ message: 'Gagal mengambil detail tiket' });
  }
});

// POST /api/tickets - Buat tiket baru
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subject, category, unit_number, detail, priority, attachment, sla, assignee_id } = req.body;
    const reporterId = req.userId;

    if (!subject || !detail) {
      return res.status(400).json({ message: 'Subject dan detail tiket wajib diisi' });
    }

    const ticketRepo = AppDataSource.getRepository(Ticket);
    const userRepo = AppDataSource.getRepository(User);

    const reporter = await userRepo.findOne({ where: { id: reporterId } });
    if (!reporter) {
      return res.status(404).json({ message: 'User pembuat tiket tidak ditemukan' });
    }

    let assignee: User | null = null;
    if (assignee_id) {
      assignee = await userRepo.findOne({ where: { id: Number(assignee_id) } });
    }

    const ticket = ticketRepo.create({
      subject,
      category: category || 'General',
      unit_number: unit_number ? unit_number.trim() : null,
      detail,
      priority: priority || 'Medium',
      attachment: attachment || null,
      sla: sla ? new Date(sla) : null,
      status: 'Open',
      reporter,
      reporter_id: reporter.id,
      assignee,
      assignee_id: assignee ? assignee.id : null,
    });

    await ticketRepo.save(ticket);

    // Ambil tiket lengkap dengan relasi untuk dikirimkan melalui WebSocket
    const fullTicket = await ticketRepo.findOne({
      where: { id: ticket.id },
      relations: ['reporter', 'assignee'],
    });

    const io = (global as any).io;
    if (io) {
      io.emit('ticketCreated', fullTicket || ticket);
      io.emit('notification', {
        title: 'Tiket Baru Dibuat',
        message: `${reporter.name || reporter.username} membuat tiket: ${ticket.subject}`,
        type: 'ticket',
        id: ticket.id,
      });
    }

    return res.status(201).json(fullTicket || ticket);
  } catch (error) {
    console.error('Error saat membuat tiket:', error);
    return res.status(500).json({ message: 'Gagal membuat tiket baru' });
  }
});

// PATCH /api/tickets/:id - Update tiket (status, assignee, priority, dll)
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: 'ID Tiket tidak valid' });
    }

    const ticketRepo = AppDataSource.getRepository(Ticket);
    const ticket = await ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['reporter', 'assignee'],
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Tiket tidak ditemukan' });
    }

    const { subject, category, detail, priority, status, attachment, sla, assignee_id } = req.body;

    const oldStatus = ticket.status;
    if (subject !== undefined) ticket.subject = subject;
    if (category !== undefined) ticket.category = category;
    if (detail !== undefined) ticket.detail = detail;
    if (priority !== undefined) ticket.priority = priority;
    if (status !== undefined) ticket.status = status;
    if (attachment !== undefined) ticket.attachment = attachment;
    if (sla !== undefined) ticket.sla = sla ? new Date(sla) : null;

    if (assignee_id !== undefined) {
      if (assignee_id === null) {
        ticket.assignee = null;
        ticket.assignee_id = null;
      } else {
        const userRepo = AppDataSource.getRepository(User);
        const assignee = await userRepo.findOne({ where: { id: Number(assignee_id) } });
        if (assignee) {
          ticket.assignee = assignee;
          ticket.assignee_id = assignee.id;
        }
      }
    }

    await ticketRepo.save(ticket);

    const fullTicket = await ticketRepo.findOne({
      where: { id: ticket.id },
      relations: ['reporter', 'assignee'],
    });

    const io = (global as any).io;
    if (io) {
      io.emit('ticketUpdated', fullTicket || ticket);
      io.emit('notification', {
        title: 'Status Tiket Diperbarui',
        message: `Tiket #${ticket.id} (${ticket.subject}) berstatus ${ticket.status}`,
        type: 'ticket',
        id: ticket.id,
      });

      if (assignee_id !== undefined && ticket.assignee) {
        io.emit('notification', {
          title: 'Penugasan Tiket IT Support',
          message: `Tiket #${ticket.id} "${ticket.subject}" telah ditugaskan kepada teknisi ${ticket.assignee.name || ticket.assignee.username}`,
          type: 'ticket',
          id: ticket.id,
        });
      }

      if (status !== undefined && status !== oldStatus) {
        io.emit('ticketStatusNotification', {
          ticketId: ticket.id,
          subject: ticket.subject,
          oldStatus,
          newStatus: ticket.status,
          reporterId: ticket.reporter_id,
          assigneeName: ticket.assignee ? ticket.assignee.name || ticket.assignee.username : 'Tim IT Support',
          message: `Tiket #${ticket.id} "${ticket.subject}" sekarang berstatus: ${ticket.status}${ticket.assignee ? ` oleh ${ticket.assignee.name || ticket.assignee.username}` : ''}`,
        });
      }
    }

    return res.json(fullTicket || ticket);
  } catch (error) {
    console.error('Error saat update tiket:', error);
    return res.status(500).json({ message: 'Gagal memperbarui tiket' });
  }
});

// DELETE /api/tickets/:id - Hapus tiket
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: 'ID Tiket tidak valid' });
    }

    const ticketRepo = AppDataSource.getRepository(Ticket);
    const ticket = await ticketRepo.findOne({ where: { id: ticketId } });

    if (!ticket) {
      return res.status(404).json({ message: 'Tiket tidak ditemukan' });
    }

    await ticketRepo.remove(ticket);

    const io = (global as any).io;
    if (io) {
      io.emit('ticketDeleted', { id: ticketId });
    }

    return res.json({ message: 'Tiket berhasil dihapus', id: ticketId });
  } catch (error) {
    console.error('Error saat menghapus tiket:', error);
    return res.status(500).json({ message: 'Gagal menghapus tiket' });
  }
});

// GET /api/tickets/:id/comments - Ambil komentar tiket
router.get('/:id/comments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: 'ID Tiket tidak valid' });
    }

    const commentRepo = AppDataSource.getRepository(TicketComment);
    const comments = await commentRepo.find({
      where: { ticket_id: ticketId },
      relations: ['author'],
      order: { created_at: 'ASC' },
    });

    return res.json(comments);
  } catch (error) {
    console.error('Error saat mengambil komentar:', error);
    return res.status(500).json({ message: 'Gagal mengambil komentar tiket' });
  }
});

// POST /api/tickets/:id/comments - Tambah komentar tiket
router.post('/:id/comments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const { comment } = req.body;
    const authorId = req.userId;

    if (isNaN(ticketId)) {
      return res.status(400).json({ message: 'ID Tiket tidak valid' });
    }
    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({ message: 'Isi komentar tidak boleh kosong' });
    }

    const ticketRepo = AppDataSource.getRepository(Ticket);
    const ticket = await ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ message: 'Tiket tidak ditemukan' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const author = await userRepo.findOne({ where: { id: authorId } });
    if (!author) {
      return res.status(404).json({ message: 'User pembuat komentar tidak ditemukan' });
    }

    const commentRepo = AppDataSource.getRepository(TicketComment);
    const newComment = commentRepo.create({
      ticket_id: ticket.id,
      ticket,
      author_id: author.id,
      author,
      comment: comment.trim(),
    });

    await commentRepo.save(newComment);

    const io = (global as any).io;
    if (io) {
      io.emit('commentAdded', newComment);
    }

    return res.status(201).json(newComment);
  } catch (error) {
    console.error('Error saat menambah komentar:', error);
    return res.status(500).json({ message: 'Gagal menambahkan komentar' });
  }
});

export default router;
