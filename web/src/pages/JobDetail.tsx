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
  MenuItem,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CompleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  ConfirmationNumber as TicketIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  PhotoCamera as CameraIcon,
  CloudUpload as UploadIcon,
  Clear as ClearIcon,
  OpenInNew as OpenInNewIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import socket from '../socket';
import { Job } from '../types';
import StatusBadge from '../components/StatusBadge';
import { useAppTheme } from '../ThemeContext';

export const JobDetail: React.FC = () => {
  const { mode } = useAppTheme();
  const isDark = mode === 'dark';
  const textNavy = isDark ? '#ffd600' : '#1a237e';
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Mode Edit
  const [isEditing, setIsEditing] = useState(false);
  const [editProblemFinding, setEditProblemFinding] = useState('');
  const [editActionTaken, setEditActionTaken] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editStatus, setEditStatus] = useState<'Pending' | 'Completed'>('Pending');
  const [editAttachment, setEditAttachment] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const navigate = useNavigate();

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get<Job>(`/jobs/${id}`);
      setJob(res.data);
      setEditProblemFinding(res.data.problem_finding || '');
      setEditActionTaken(res.data.action_taken || '');
      setEditEndTime(res.data.end_time ? res.data.end_time.slice(0, 5) : '');
      setEditStatus(res.data.status);
      setEditAttachment(res.data.attachment || '');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat detail pekerjaan');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);

      try {
        setUploading(true);
        setErrorMsg('');
        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setEditAttachment(res.data.url);
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Gagal mengunggah foto / file lampiran');
      } finally {
        setUploading(false);
      }
    }
  };

  useEffect(() => {
    if (id) fetchJobDetails();
  }, [id]);

  useEffect(() => {
    const handleJobUpdated = (updatedJob: Job) => {
      if (updatedJob.id === Number(id)) {
        setJob((prev) => (prev ? { ...prev, ...updatedJob } : updatedJob));
      }
    };

    socket.on('jobUpdated', handleJobUpdated);
    return () => {
      socket.off('jobUpdated', handleJobUpdated);
    };
  }, [id]);

  const handleQuickMarkCompleted = async () => {
    try {
      setUpdating(true);
      setErrorMsg('');
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
      const res = await api.patch(`/jobs/${id}`, {
        status: 'Completed',
        end_time: job?.end_time || timeStr,
      });
      setJob(res.data);
      setSuccessMsg('Pekerjaan berhasil diselesaikan! Tiket terkait otomatis berstatus Closed.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengubah status pekerjaan');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdating(true);
      setErrorMsg('');
      setSuccessMsg('');
      const payload: any = {
        problem_finding: editProblemFinding,
        action_taken: editActionTaken,
        attachment: editAttachment || null,
        status: editStatus,
        end_time: editEndTime ? (editEndTime.length === 5 ? `${editEndTime}:00` : editEndTime) : null,
      };

      const res = await api.patch(`/jobs/${id}`, payload);
      setJob(res.data);
      setIsEditing(false);
      setSuccessMsg('Perubahan pekerjaan berhasil disimpan.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan perubahan pekerjaan');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={45} />
      </Box>
    );
  }

  if (!job) {
    return (
      <Alert severity="error">
        Data pekerjaan tidak ditemukan. <Button onClick={() => navigate('/jobs')}>Kembali</Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      {/* Header & Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate('/jobs')} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: textNavy }}>
                Job #{job.id} - {job.problem_category}
              </Typography>
              <StatusBadge status={job.status} />
            </Box>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Dikerjakan pada {job.work_day}, {job.work_date}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {job.status === 'Pending' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CompleteIcon />}
              onClick={handleQuickMarkCompleted}
              disabled={updating}
            >
              Tandai Selesai (Completed)
            </Button>
          )}

          <Button
            variant="outlined"
            startIcon={isEditing ? <SaveIcon /> : <EditIcon />}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Batal Edit' : 'Edit Pekerjaan / Temuan'}
          </Button>
        </Box>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          {successMsg}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Kolom Kiri: Detail & Tindakan */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3.5 }}>
              <Typography variant="overline" sx={{ color: '#ff6f00', fontWeight: 700 }}>
                DETAIL PERMASALAHAN TEKNIS
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-wrap',
                  color: '#1e293b',
                  lineHeight: 1.6,
                  bgcolor: '#f8fafc',
                  p: 2.5,
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  mt: 1,
                  mb: 3,
                }}
              >
                {job.problem_detail || 'Tidak ada keterangan problem detail.'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="overline" sx={{ color: '#0284c7', fontWeight: 700 }}>
                TEMUAN MASALAH / DIAGNOSA (PROBLEM FINDING)
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-wrap',
                  color: '#1e293b',
                  lineHeight: 1.6,
                  bgcolor: '#f0f9ff',
                  p: 2.5,
                  borderRadius: 2,
                  border: '1px solid #bae6fd',
                  mt: 1,
                  mb: 3,
                }}
              >
                {job.problem_finding || (
                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                    Belum ada temuan masalah / diagnosa yang dicatat. Klik tombol "Edit Pekerjaan / Temuan" di atas untuk menambahkan.
                  </span>
                )}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="overline" sx={{ color: textNavy, fontWeight: 700 }}>
                TINDAKAN PERBAIKAN / SOLUSI (ACTION TAKEN)
              </Typography>

              {!isEditing ? (
                <>
                  <Box
                    sx={{
                      bgcolor: job.action_taken ? '#f0fdf4' : '#f8fafc',
                      p: 2.5,
                      borderRadius: 2,
                      border: '1px solid #e2e8f0',
                      mt: 1,
                    }}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: '#1e293b' }}>
                      {job.action_taken || (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                          Belum ada tindakan yang dicatat. Klik tombol "Edit Pekerjaan / Temuan" di atas untuk menambahkan solusi.
                        </span>
                      )}
                    </Typography>
                  </Box>

                  {/* Lampiran / Foto Bukti Pekerjaan */}
                  {job.attachment && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="overline" sx={{ color: textNavy, fontWeight: 700, display: 'block', mb: 1 }}>
                        DOKUMENTASI FOTO / BUKTI PEKERJAAN
                      </Typography>
                      {job.attachment.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                        <Box sx={{ mt: 1 }}>
                          <a href={job.attachment} target="_blank" rel="noopener noreferrer">
                            <img
                              src={job.attachment}
                              alt="Dokumentasi Pekerjaan"
                              style={{
                                maxWidth: '100%',
                                maxHeight: 380,
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                objectFit: 'contain',
                                display: 'block',
                                cursor: 'pointer',
                              }}
                            />
                          </a>
                          <Button
                            size="small"
                            startIcon={<OpenInNewIcon />}
                            href={job.attachment}
                            target="_blank"
                            sx={{ mt: 1, textTransform: 'none' }}
                          >
                            Buka Foto Ukuran Penuh
                          </Button>
                        </Box>
                      ) : (
                        <Button
                          variant="outlined"
                          startIcon={<AttachFileIcon />}
                          href={job.attachment}
                          target="_blank"
                          sx={{ textTransform: 'none' }}
                        >
                          Unduh / Lihat File Lampiran
                        </Button>
                      )}
                    </Box>
                  )}
                </>
              ) : (
                <Box component="form" onSubmit={handleSaveUpdate} sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Temuan Masalah / Diagnosa (Problem Finding)"
                    multiline
                    rows={3}
                    value={editProblemFinding}
                    onChange={(e) => setEditProblemFinding(e.target.value)}
                    placeholder="Tuliskan temuan masalah, analisa teknis, atau akar penyebab kendala..."
                    sx={{ mb: 2.5 }}
                  />

                  <TextField
                    fullWidth
                    label="Tindakan / Solusi yang Dilakukan (Action Taken)"
                    multiline
                    rows={5}
                    value={editActionTaken}
                    onChange={(e) => setEditActionTaken(e.target.value)}
                    placeholder="Tuliskan langkah-langkah perbaikan atau pergantian sparepart yang dilakukan..."
                    sx={{ mb: 2.5 }}
                  />

                  {/* Dokumentasi Foto / Bukti Pekerjaan (Kamera HP / File) */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#334155' }}>
                      Dokumentasi Foto / Bukti Pekerjaan (Kamera HP / File)
                    </Typography>

                    <Box
                      sx={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: 2,
                        p: 2.5,
                        textAlign: 'center',
                        bgcolor: '#f8fafc',
                        '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' },
                      }}
                    >
                      {/* Input khusus Kamera HP */}
                      <input
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        id="edit-job-camera-input"
                        type="file"
                        onChange={handleFileChange}
                        disabled={uploading}
                      />

                      {/* Input File / Galeri umum */}
                      <input
                        accept="image/*,.pdf,.doc,.docx"
                        style={{ display: 'none' }}
                        id="edit-job-file-input"
                        type="file"
                        onChange={handleFileChange}
                        disabled={uploading}
                      />

                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <label htmlFor="edit-job-camera-input">
                          <Button
                            variant="contained"
                            color="secondary"
                            component="span"
                            size="small"
                            startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CameraIcon />}
                            disabled={uploading}
                            sx={{ px: 2, py: 0.8 }}
                          >
                            {uploading ? 'Mengunggah...' : 'Ambil Foto dari Kamera HP'}
                          </Button>
                        </label>

                        <label htmlFor="edit-job-file-input">
                          <Button
                            variant="outlined"
                            component="span"
                            size="small"
                            startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
                            disabled={uploading}
                            sx={{ px: 2, py: 0.8 }}
                          >
                            {uploading ? 'Mengunggah...' : 'Pilih dari File / Galeri'}
                          </Button>
                        </label>
                      </Box>

                      {editAttachment && (
                        <Box sx={{ mt: 2 }}>
                          {editAttachment.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                            <Box sx={{ position: 'relative', display: 'inline-block' }}>
                              <img
                                src={editAttachment}
                                alt="Pratinjau Foto"
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: 180,
                                  borderRadius: 8,
                                  border: '1px solid #cbd5e1',
                                }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => setEditAttachment('')}
                                color="error"
                                sx={{
                                  position: 'absolute',
                                  top: -10,
                                  right: -10,
                                  bgcolor: 'white',
                                  boxShadow: 2,
                                  '&:hover': { bgcolor: '#fee2e2' },
                                }}
                              >
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 1,
                                p: 1,
                                px: 2,
                                borderRadius: 1.5,
                                bgcolor: '#e2e8f0',
                              }}
                            >
                              <AttachFileIcon fontSize="small" />
                              <Typography variant="body2">{editAttachment.split('/').pop()}</Typography>
                              <IconButton size="small" onClick={() => setEditAttachment('')} color="error">
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 2.5 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="time"
                        label="Jam Selesai (End Time)"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        fullWidth
                        label="Status Pekerjaan"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as any)}
                      >
                        <MenuItem value="Pending">Pending</MenuItem>
                        <MenuItem value="Completed">Completed</MenuItem>
                      </TextField>
                    </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setIsEditing(false);
                        setEditAttachment(job.attachment || '');
                      }}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={updating}
                      startIcon={updating ? <CircularProgress size={18} /> : <SaveIcon />}
                    >
                      Simpan Perubahan
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Kolom Kanan: Meta Job & Tiket Terkait */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                Informasi Pengerjaan
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <CalendarIcon sx={{ color: textNavy }} />
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    HARI & TANGGAL
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {job.work_day}, {job.work_date}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <AccessTimeIcon sx={{ color: '#ff6f00' }} />
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    DURASI / JAM KERJA
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {job.start_time.slice(0, 5)} s/d {job.end_time ? job.end_time.slice(0, 5) : 'Sedang Berjalan'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <PersonIcon sx={{ color: '#64748b' }} />
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    TEKNISI PELAKSANA
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {job.user?.name || job.user?.username}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
                Tiket yang Terkait
              </Typography>

              {job.ticket ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f1f5f9' },
                  }}
                  onClick={() => navigate(`/tickets/${job.ticket?.id}`)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <TicketIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: textNavy }}>
                      Tiket #{job.ticket.id}
                    </Typography>
                    <StatusBadge status={job.ticket.status} size="small" />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155' }}>
                    {job.ticket.subject}
                  </Typography>
                  <Button
                    size="small"
                    color="primary"
                    sx={{ mt: 1, p: 0, fontSize: '0.75rem' }}
                  >
                    Buka Detail Tiket &rarr;
                  </Button>
                </Paper>
              ) : (
                <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                  Pekerjaan ini dilakukan tanpa keterkaitan tiket langsung.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default JobDetail;
