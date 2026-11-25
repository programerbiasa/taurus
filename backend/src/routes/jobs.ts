import { Router, Response } from 'express';
import { parseISO, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { AppDataSource } from '../config/database';
import { Job } from '../models/Job';
import { Ticket } from '../models/Ticket';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Helper untuk menghitung nama hari (Bahasa Indonesia)
const calculateWorkDay = (dateStr: string): string => {
  try {
    const date = parseISO(dateStr);
    return format(date, 'EEEE', { locale: idLocale });
  } catch {
    const d = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[d.getDay()] || 'Senin';
  }
};

// GET /api/jobs - Ambil semua job (dengan filter status, tanggal, atau ticket_id)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, work_date, ticket_id, search } = req.query;
    const jobRepo = AppDataSource.getRepository(Job);

    const queryBuilder = jobRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.user', 'user')
      .leftJoinAndSelect('job.ticket', 'ticket')
      .orderBy('job.work_date', 'DESC')
      .addOrderBy('job.start_time', 'DESC');

    if (status && typeof status === 'string' && status !== 'All') {
      queryBuilder.andWhere('job.status = :status', { status });
    }

    if (work_date && typeof work_date === 'string') {
      queryBuilder.andWhere('job.work_date = :work_date', { work_date });
    }

    if (ticket_id) {
      queryBuilder.andWhere('job.ticket_id = :ticket_id', { ticket_id: Number(ticket_id) });
    }

    if (search && typeof search === 'string') {
      queryBuilder.andWhere(
        '(job.problem_category LIKE :search OR job.problem_detail LIKE :search OR job.problem_finding LIKE :search OR job.action_taken LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const jobs = await queryBuilder.getMany();
    return res.json(jobs);
  } catch (error) {
    console.error('Error saat mengambil daftar job:', error);
    return res.status(500).json({ message: 'Gagal mengambil daftar pekerjaan' });
  }
});

// GET /api/jobs/:id - Ambil detail satu job
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    if (isNaN(jobId)) {
      return res.status(400).json({ message: 'ID Job tidak valid' });
    }

    const jobRepo = AppDataSource.getRepository(Job);
    const job = await jobRepo.findOne({
      where: { id: jobId },
      relations: ['user', 'ticket', 'ticket.reporter', 'ticket.assignee'],
    });

    if (!job) {
      return res.status(404).json({ message: 'Job pekerjaan tidak ditemukan' });
    }

    return res.json(job);
  } catch (error) {
    console.error('Error saat mengambil detail job:', error);
    return res.status(500).json({ message: 'Gagal mengambil detail pekerjaan' });
  }
});

// POST /api/jobs - Buat job baru
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      ticket_id,
      problem_category,
      unit_number,
      problem_detail,
      problem_finding,
      action_taken,
      attachment,
      status,
      work_date,
      start_time,
      end_time,
    } = req.body;

    const currentUserId = req.userId;

    if (!work_date || !start_time) {
      return res.status(400).json({ message: 'Tanggal pekerjaan (work_date) dan jam mulai (start_time) wajib diisi' });
    }

    const jobRepo = AppDataSource.getRepository(Job);
    const userRepo = AppDataSource.getRepository(User);
    const ticketRepo = AppDataSource.getRepository(Ticket);

    const user = await userRepo.findOne({ where: { id: currentUserId } });
    if (!user) {
      return res.status(404).json({ message: 'User pembuat job tidak ditemukan' });
    }

    let ticket: Ticket | null = null;
    if (ticket_id) {
      ticket = await ticketRepo.findOne({ where: { id: Number(ticket_id) } });
    }

    const calculatedDay = calculateWorkDay(work_date);
    const jobStatus = status || 'Pending';

    const job = jobRepo.create({
      user,
      user_id: user.id,
      ticket,
      ticket_id: ticket ? ticket.id : null,
      problem_category: problem_category || 'Hardware',
      unit_number: unit_number ? unit_number.trim() : null,
      problem_detail: problem_detail || '',
      problem_finding: problem_finding || '',
      action_taken: action_taken || '',
      attachment: attachment || null,
      status: jobStatus,
      work_date,
      work_day: calculatedDay,
      start_time,
      end_time: end_time || null,
    });

    await jobRepo.save(job);

    // Hubungkan dengan tiket jika ada
    if (ticket) {
      ticket.assignee = user;
      ticket.assignee_id = user.id;

      if (jobStatus === 'Completed') {
        ticket.status = 'Closed';
      } else if (ticket.status === 'Open') {
        ticket.status = 'InProgress';
      }

      await ticketRepo.save(ticket);

      const io = (global as any).io;
      if (io) {
        io.emit('ticketUpdated', ticket);
        io.emit('ticketStatusNotification', {
          ticketId: ticket.id,
          subject: ticket.subject,
          newStatus: ticket.status,
          reporterId: ticket.reporter_id,
          assigneeName: user.name || user.username,
          message: `Tiket Anda #${ticket.id} "${ticket.subject}" sedang dikerjakan oleh teknisi ${user.name || user.username}!`,
        });
      }
    }

    const fullJob = await jobRepo.findOne({
      where: { id: job.id },
      relations: ['user', 'ticket'],
    });

    const io = (global as any).io;
    if (io) {
      io.emit('jobCreated', fullJob || job);
      io.emit('notification', {
        title: 'Job Baru Dibuat',
        message: `${user.name || user.username} mencatat pekerjaan: ${job.problem_category} (${job.status})`,
        type: 'job',
        id: job.id,
      });
    }

    return res.status(201).json(fullJob || job);
  } catch (error) {
    console.error('Error saat membuat job:', error);
    return res.status(500).json({ message: 'Gagal membuat catatan pekerjaan baru' });
  }
});

// PATCH /api/jobs/:id - Update job (e.g. mark completed, update action_taken, end_time)
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    if (isNaN(jobId)) {
      return res.status(400).json({ message: 'ID Job tidak valid' });
    }

    const jobRepo = AppDataSource.getRepository(Job);
    const ticketRepo = AppDataSource.getRepository(Ticket);

    const job = await jobRepo.findOne({
      where: { id: jobId },
      relations: ['user', 'ticket'],
    });

    if (!job) {
      return res.status(404).json({ message: 'Pekerjaan tidak ditemukan' });
    }

    const {
      ticket_id,
      problem_category,
      unit_number,
      problem_detail,
      problem_finding,
      action_taken,
      attachment,
      status,
      work_date,
      start_time,
      end_time,
    } = req.body;

    if (problem_category !== undefined) job.problem_category = problem_category;
    if (problem_detail !== undefined) job.problem_detail = problem_detail;
    if (problem_finding !== undefined) job.problem_finding = problem_finding;
    if (action_taken !== undefined) job.action_taken = action_taken;
    if (attachment !== undefined) job.attachment = attachment;
    if (start_time !== undefined) job.start_time = start_time;
    if (end_time !== undefined) job.end_time = end_time;

    if (work_date !== undefined) {
      job.work_date = work_date;
      job.work_day = calculateWorkDay(work_date);
    }

    if (ticket_id !== undefined) {
      if (ticket_id === null) {
        job.ticket = null;
        job.ticket_id = null;
      } else {
        const ticket = await ticketRepo.findOne({ where: { id: Number(ticket_id) } });
        if (ticket) {
          job.ticket = ticket;
          job.ticket_id = ticket.id;
        }
      }
    }

    const oldStatus = job.status;
    if (status !== undefined) {
      job.status = status;
    }

    await jobRepo.save(job);

    // Aturan 8: Ketika status job menjadi Completed, tiket terkait otomatis Closed
    if (status === 'Completed' && job.ticket_id) {
      const ticket = await ticketRepo.findOne({ where: { id: job.ticket_id } });
      if (ticket && ticket.status !== 'Closed') {
        ticket.status = 'Closed';
        await ticketRepo.save(ticket);

        const io = (global as any).io;
        if (io) {
          io.emit('ticketUpdated', ticket);
          io.emit('notification', {
            title: 'Tiket Otomatis Closed',
            message: `Tiket #${ticket.id} (${ticket.subject}) otomatis Closed karena pekerjaan telah selesai`,
            type: 'ticket',
            id: ticket.id,
          });
          io.emit('ticketStatusNotification', {
            ticketId: ticket.id,
            subject: ticket.subject,
            newStatus: 'Closed',
            reporterId: ticket.reporter_id,
            assigneeName: job.user ? job.user.name || job.user.username : 'IT Support',
            message: `Pekerjaan telah selesai! Tiket #${ticket.id} "${ticket.subject}" telah diselesaikan.`,
          });
        }
      }
    }

    const updatedJob = await jobRepo.findOne({
      where: { id: job.id },
      relations: ['user', 'ticket'],
    });

    const io = (global as any).io;
    if (io) {
      io.emit('jobUpdated', updatedJob || job);
      if (oldStatus !== job.status) {
        io.emit('notification', {
          title: 'Status Job Diperbarui',
          message: `Job #${job.id} telah berstatus ${job.status}`,
          type: 'job',
          id: job.id,
        });
      }
    }

    return res.json(updatedJob || job);
  } catch (error) {
    console.error('Error saat update job:', error);
    return res.status(500).json({ message: 'Gagal memperbarui catatan pekerjaan' });
  }
});

// DELETE /api/jobs/:id - Hapus job
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    if (isNaN(jobId)) {
      return res.status(400).json({ message: 'ID Job tidak valid' });
    }

    const jobRepo = AppDataSource.getRepository(Job);
    const job = await jobRepo.findOne({ where: { id: jobId } });

    if (!job) {
      return res.status(404).json({ message: 'Pekerjaan tidak ditemukan' });
    }

    await jobRepo.remove(job);

    const io = (global as any).io;
    if (io) {
      io.emit('jobDeleted', { id: jobId });
    }

    return res.json({ message: 'Pekerjaan berhasil dihapus', id: jobId });
  } catch (error) {
    console.error('Error saat menghapus job:', error);
    return res.status(500).json({ message: 'Gagal menghapus catatan pekerjaan' });
  }
});

export default router;
