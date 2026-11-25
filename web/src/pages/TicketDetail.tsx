import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  TextField,
  Avatar,
  Paper,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  AccessTime as AccessTimeIcon,
  AssignmentTurnedIn as CreateJobIcon,
  CheckCircleOutline as ResolveIcon,
  LockOpen as ReopenIcon,
  HighlightOff as CloseIcon,
  PersonAdd as AssignIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import socket from '../socket';
import { Ticket, TicketComment, User } from '../types';
import StatusBadge from '../components/StatusBadge';
import { useAppTheme } from '../ThemeContext';

export const TicketDetail: React.FC = () => {
  const { mode } = useAppTheme();
  const isDark = mode === 'dark';
  const textNavy = isDark ? '#ffd600' : '#1a237e';
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusDialog, setStatusDialog] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');

  // Penugasan IT Support oleh Admin
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [itSupportList, setItSupportList] = useState<User[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | ''>('');
  const [autoStartWork, setAutoStartWork] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const navigate = useNavigate();

  const userJson = localStorage.getItem('taurus_user');
  const currentUser: User | null = userJson ? JSON.parse(userJson) : null;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.username === 'admin';
  const isITSupport = currentUser?.role === 'it_support';
  const isClient = currentUser?.role === 'client';

  // Ambil daftar akun IT Support untuk pilihan penugasan oleh Admin
  useEffect(() => {
    if (isAdmin) {
      api
        .get<User[]>('/auth/users')
        .then((res) => {
          const itUsers = res.data.filter(
            (u) =>
              (u.role === 'it_support' || (u.role as string) === 'technician') &&
              u.status === 'approved'
          );
          setItSupportList(itUsers);
        })
        .catch((err) => console.error('Gagal mengambil daftar IT Support:', err));
    }
  }, [isAdmin]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const [ticketRes, commentsRes] = await Promise.all([
        api.get<Ticket>(`/tickets/${id}`),
        api.get<TicketComment[]>(`/tickets/${id}/comments`),
      ]);
      setTicket(ticketRes.data);
      setComments(commentsRes.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat detail tiket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchTicketDetails();
  }, [id]);

  useEffect(() => {
    const handleTicketUpdate = (updated: Ticket) => {
      if (updated.id === Number(id)) {
        setTicket((prev) => (prev ? { ...prev, ...updated } : updated));
      }
    };

    const handleCommentAdded = (comment: TicketComment) => {
      if (comment.ticket_id === Number(id)) {
        setComments((prev) => [...prev, comment]);
      }
    };

    socket.on('ticketUpdated', handleTicketUpdate);
    socket.on('commentAdded', handleCommentAdded);

    return () => {
      socket.off('ticketUpdated', handleTicketUpdate);
      socket.off('commentAdded', handleCommentAdded);
    };
  }, [id]);

  const handleUpdateStatus = async (status: string) => {
    try {
      await api.patch(`/tickets/${id}`, { status });
      setTicket((prev) => (prev ? { ...prev, status: status as any } : prev));
      setStatusDialog(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengubah status tiket');
    }
  };

  const handleAssignToMe = async () => {
    if (!currentUser) return;
    try {
      const res = await api.patch(`/tickets/${id}`, { assignee_id: currentUser.id });
      setTicket(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menugaskan tiket');
    }
  };

  const handleAdminAssign = async () => {
    if (!selectedAssigneeId) return;
    try {
      setAssigning(true);
      const payload: any = { assignee_id: Number(selectedAssigneeId) };
      if (ticket?.status === 'Open' && autoStartWork) {
        payload.status = 'InProgress';
      }
      const res = await api.patch(`/tickets/${id}`, payload);
      setTicket(res.data);
      setAssignDialogOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menugaskan tiket ke IT Support');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (!window.confirm('Yakin ingin melepas penugasan teknisi dari tiket ini?')) return;
    try {
      const res = await api.patch(`/tickets/${id}`, { assignee_id: null });
      setTicket(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal melepas penugasan');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const res = await api.post(`/tickets/${id}/comments`, { comment: newComment.trim() });
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menambahkan komentar');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={45} />
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Alert severity="error">
        Tiket tidak ditemukan. <Button onClick={() => navigate('/tickets')}>Kembali ke Daftar Tiket</Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 1050, mx: 'auto' }}>
      {/* Top Bar Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate('/tickets')} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: textNavy }}>
                Tiket #{ticket.id}
              </Typography>
              <StatusBadge status={ticket.status} />
              <StatusBadge status={ticket.priority} />
            </Box>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Dibuat pada {new Date(ticket.created_at).toLocaleString('id-ID')}
            </Typography>
          </Box>
        </Box>

        {/* Action Controls */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {/* Admin: Berikan Tugas ke IT Support */}
          {isAdmin && ticket.status !== 'Closed' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AssignIcon />}
              onClick={() => {
                if (ticket.assignee_id) {
                  setSelectedAssigneeId(ticket.assignee_id);
                } else if (itSupportList.length > 0) {
                  setSelectedAssigneeId(itSupportList[0].id);
                }
                setAssignDialogOpen(true);
              }}
            >
              {ticket.assignee ? 'Ganti Penugasan IT' : 'Tugaskan ke IT Support'}
            </Button>
          )}

          {/* IT Support: Buat Job Terkait (Hanya IT Support yang mengeksekusi Job) */}
          {isITSupport && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<CreateJobIcon />}
              onClick={() =>
                navigate(
                  `/jobs/create?ticket_id=${ticket.id}&category=${encodeURIComponent(
                    ticket.category
                  )}&unit=${encodeURIComponent(ticket.unit_number || '')}&detail=${encodeURIComponent(
                    ticket.subject + ' - ' + ticket.detail
                  )}`
                )
              }
            >
              Buat Job Terkait
            </Button>
          )}

          {/* IT Support: Mulai Kerjakan jika status Open */}
          {isITSupport && ticket.status === 'Open' && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleUpdateStatus('InProgress')}
            >
              Mulai Kerjakan (In Progress)
            </Button>
          )}

          {/* IT Support / Admin: Tandai Resolved */}
          {(isITSupport || isAdmin) && ticket.status === 'InProgress' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<ResolveIcon />}
              onClick={() => handleUpdateStatus('Resolved')}
            >
              Tandai Resolved
            </Button>
          )}

          {/* Tutup Tiket */}
          {ticket.status !== 'Closed' && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<CloseIcon />}
              onClick={() => handleUpdateStatus('Closed')}
            >
              Tutup Tiket
            </Button>
          )}

          {/* Buka Kembali jika status Closed */}
          {ticket.status === 'Closed' && (isAdmin || isITSupport) && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<ReopenIcon />}
              onClick={() => handleUpdateStatus('Open')}
            >
              Buka Kembali
            </Button>
          )}
        </Box>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Kolom Kiri: Informasi Utama & Detail Tiket */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="overline" sx={{ color: '#ff6f00', fontWeight: 700, letterSpacing: 1 }}>
                  {ticket.category.toUpperCase()}
                </Typography>
                {ticket.unit_number && (
                  <Chip
                    label={`Unit: ${ticket.unit_number}`}
                    size="small"
                    sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}
                  />
                )}
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
                {ticket.subject}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 1 }}>
                Deskripsi Kendala:
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-wrap',
                  color: '#334155',
                  lineHeight: 1.7,
                  bgcolor: '#f8fafc',
                  p: 2.5,
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                }}
              >
                {ticket.detail}
              </Typography>

              {/* Attachment File Preview */}
              {ticket.attachment && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 1 }}>
                    Lampiran Berkas:
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      bgcolor: '#f1f5f9',
                      borderRadius: 2,
                    }}
                  >
                    <AttachFileIcon color="primary" />
                    <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {ticket.attachment.split('/').pop()}
                      </Typography>
                      <Link
                        href={ticket.attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ fontSize: '0.8rem', color: textNavy, fontWeight: 600 }}
                      >
                        Buka / Unduh Lampiran
                      </Link>
                    </Box>
                  </Paper>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Diskusi & Komentar Tiket */}
          <Card>
            <CardContent sx={{ p: 3.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Aktivitas & Diskusi ({comments.length})
              </Typography>

              {/* List Komentar */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mb: 4 }}>
                {comments.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', py: 3 }}>
                    Belum ada komentar untuk tiket ini. Tulis tanggapan pertama di bawah.
                  </Typography>
                ) : (
                  comments.map((c) => (
                    <Box
                      key={c.id}
                      sx={{
                        display: 'flex',
                        gap: 2,
                        p: 2,
                        borderRadius: 2,
                        bgcolor: c.author?.id === currentUser?.id ? '#f0f4ff' : '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <Avatar sx={{ bgcolor: textNavy, width: 36, height: 36, fontSize: '0.9rem' }}>
                        {c.author?.name ? c.author.name.charAt(0).toUpperCase() : 'U'}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {c.author?.name || c.author?.username}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            {new Date(c.created_at).toLocaleString('id-ID')}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#334155', whiteSpace: 'pre-wrap' }}>
                          {c.comment}
                        </Typography>
                      </Box>
                    </Box>
                  ))
                )}
              </Box>

              {/* Form Tambah Komentar */}
              <Box component="form" onSubmit={handleCommentSubmit}>
                <TextField
                  fullWidth
                  placeholder="Ketik catatan teknisi atau balasan untuk tiket ini..."
                  multiline
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={submittingComment ? <CircularProgress size={18} /> : <SendIcon />}
                    disabled={submittingComment || !newComment.trim()}
                  >
                    Kirim Komentar
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Kolom Kanan: Metadata & Penugasan */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                Informasi Pelapor & Teknisi
              </Typography>

              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  DILAPORKAN OLEH
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {ticket.reporter?.name || ticket.reporter?.username}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  @{ticket.reporter?.username}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  DITUGASKAN KEPADA (ASSIGNEE)
                </Typography>
                {ticket.assignee ? (
                  <Box sx={{ mt: 0.8 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: textNavy }}>
                        {ticket.assignee.name || ticket.assignee.username}
                      </Typography>
                      <Chip
                        label="IT Support"
                        size="small"
                        sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 700, fontSize: '0.7rem', height: 20 }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1 }}>
                      @{ticket.assignee.username}
                    </Typography>

                    {/* Jika login sebagai Admin: Tombol Ganti / Lepas Penugasan */}
                    {isAdmin && (
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<AssignIcon />}
                          onClick={() => {
                            setSelectedAssigneeId(ticket.assignee_id || '');
                            setAssignDialogOpen(true);
                          }}
                          sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                        >
                          Ganti Teknisi IT
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={handleUnassign}
                          sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                        >
                          Lepas
                        </Button>
                      </Box>
                    )}

                    {/* Jika login sebagai IT Support dan ini adalah tugasnya */}
                    {isITSupport && ticket.assignee.id === currentUser?.id && (
                      <Chip
                        label="Tugas Anda"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 700, fontSize: '0.72rem', mt: 0.5 }}
                      />
                    )}
                  </Box>
                ) : (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic', mb: 1 }}>
                      Belum ada teknisi IT Support yang ditugaskan.
                    </Typography>

                    {/* Admin: Berikan Tugas ke IT Support */}
                    {isAdmin && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<AssignIcon />}
                        onClick={() => {
                          if (itSupportList.length > 0) {
                            setSelectedAssigneeId(itSupportList[0].id);
                          }
                          setAssignDialogOpen(true);
                        }}
                        sx={{ textTransform: 'none', mt: 0.5 }}
                      >
                        Tugaskan ke IT Support
                      </Button>
                    )}

                    {/* IT Support: Ambil Tiket Ini (Tugaskan ke Saya) */}
                    {isITSupport && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<AssignIcon />}
                        onClick={handleAssignToMe}
                        sx={{ textTransform: 'none', mt: 0.5 }}
                      >
                        Ambil Tiket Ini (Tugaskan ke Saya)
                      </Button>
                    )}

                    {/* Client: Menunggu penugasan */}
                    {isClient && (
                      <Typography variant="caption" sx={{ color: '#0284c7', display: 'block', mt: 0.5 }}>
                        Menunggu Administrator menugaskan teknisi IT Support.
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  BATAS WAKTU (SLA)
                </Typography>
                {ticket.sla ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <AccessTimeIcon sx={{ color: '#d32f2f', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#d32f2f' }}>
                      {new Date(ticket.sla).toLocaleString('id-ID')}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Tidak ada batas waktu (Standard SLA)
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog Penugasan IT Support oleh Administrator */}
      <Dialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: textNavy }}>
          Tugaskan Tiket ke IT Support
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 2, mt: 0.5 }}>
            Pilih teknisi IT Support yang akan menangani Tiket #{ticket.id}:
          </Typography>

          <Box sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 1.5, border: '1px solid #e2e8f0', mb: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {ticket.subject}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Kategori: {ticket.category} {ticket.unit_number ? `| Unit: ${ticket.unit_number}` : ''}
            </Typography>
          </Box>

          {itSupportList.length === 0 ? (
            <Alert severity="warning">
              Belum ada akun pengguna dengan role IT Support yang berstatus aktif/disetujui.
            </Alert>
          ) : (
            <TextField
              select
              fullWidth
              label="Pilih Teknisi IT Support"
              value={selectedAssigneeId}
              onChange={(e) => setSelectedAssigneeId(Number(e.target.value))}
              sx={{ mb: 2 }}
            >
              {itSupportList.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name || user.username} (@{user.username})
                </MenuItem>
              ))}
            </TextField>
          )}

          {ticket.status === 'Open' && (
            <Box sx={{ mt: 1 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoStartWork}
                  onChange={(e) => setAutoStartWork(e.target.checked)}
                />
                Otomatis ubah status tiket menjadi <strong>In Progress</strong>
              </label>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAssignDialogOpen(false)} color="inherit" disabled={assigning}>
            Batal
          </Button>
          <Button
            onClick={handleAdminAssign}
            variant="contained"
            color="primary"
            disabled={assigning || !selectedAssigneeId || itSupportList.length === 0}
            startIcon={assigning ? <CircularProgress size={18} /> : <AssignIcon />}
          >
            {assigning ? 'Menugaskan...' : 'Tugaskan Sekarang'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TicketDetail;
