import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assignment as JobIcon,
  PhotoCamera as CameraIcon,
  CloudUpload as UploadIcon,
  Clear as ClearIcon,
  AddCircleOutline as AddIcon,
  PlaylistAddCheck as ChecklistIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Ticket, Problem } from '../types';

const PROBLEM_CATEGORIES = [
  'Hardware - PC / Laptop / Server',
  'Hardware - Printer & Scanner',
  'Hardware - Monitor / Proyektor',
  'Software - OS & Driver',
  'Software - Aplikasi Internal',
  'Software - Antivirus & Security',
  'Jaringan - WiFi / LAN / Router',
  'Jaringan - Internet Lambat / Terputus',
  'CCTV & Keamanan Gedung',
  'Telephony / PABX',
  'Radio Rig / Dascam',
  'User Account / Password Reset',
  'Pemeliharaan Rutin / Maintenance',
  'Lain-lain',
];

export const JobCreate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Ambil parameter jika dibuat dari referensi Tiket
  const queryTicketId = searchParams.get('ticket_id');
  const queryCategory = searchParams.get('category');
  const queryUnit = searchParams.get('unit');
  const queryDetail = searchParams.get('detail');

  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const nowTime = new Date().toTimeString().slice(0, 5); // HH:MM

  const [ticketId, setTicketId] = useState<string>(queryTicketId || '');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [problemCategory, setProblemCategory] = useState<string>(
    queryCategory || 'Hardware - PC / Laptop / Server'
  );
  const [unitNumber, setUnitNumber] = useState<string>(queryUnit || '');
  const [problemDetail, setProblemDetail] = useState<string>(queryDetail || '');
  const [problemFinding, setProblemFinding] = useState<string>('');
  const [actionTaken, setActionTaken] = useState<string>('');
  const [status, setStatus] = useState<'Pending' | 'Completed'>('Pending');
  const [workDate, setWorkDate] = useState<string>(todayStr);
  const [startTime, setStartTime] = useState<string>(nowTime);
  const [endTime, setEndTime] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Master Gejala Kendala / Problem Checklist
  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);

  // Dialog Quick Add Problem
  const [openQuickAdd, setOpenQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddDesc, setQuickAddDesc] = useState('');
  const [quickAddSubmitting, setQuickAddSubmitting] = useState(false);
  const [quickAddError, setQuickAddError] = useState('');

  // Fetch daftar tiket aktif untuk pilihan dropdown tiket terkait
  useEffect(() => {
    const fetchOpenTickets = async () => {
      try {
        const res = await api.get<Ticket[]>('/tickets');
        setTickets(res.data);
      } catch (err) {
        console.error('Gagal mengambil daftar tiket untuk dropdown:', err);
      }
    };
    fetchOpenTickets();
  }, []);

  const handleSelectTicket = (idStr: string) => {
    setTicketId(idStr);
    const found = tickets.find((t) => String(t.id) === idStr);
    if (found) {
      if (found.category) setProblemCategory(found.category);
      if (found.unit_number) setUnitNumber(found.unit_number);
      if (!problemDetail.trim()) {
        setProblemDetail(`Penanganan Tiket #${found.id}: ${found.subject} - ${found.detail}`);
      }
    }
  };

  // Fetch daftar kendala sesuai kategori yang dipilih
  const fetchProblems = async (catName: string) => {
    try {
      setProblemsLoading(true);
      const res = await api.get('/problems', {
        params: {
          category: catName,
          active_only: true,
        },
      });
      setProblems(res.data || []);
    } catch (err) {
      console.error('Gagal mengambil daftar kendala:', err);
    } finally {
      setProblemsLoading(false);
    }
  };

  useEffect(() => {
    if (problemCategory) {
      fetchProblems(problemCategory);
    }
  }, [problemCategory]);

  // Sinkronisasi non-destructive antara checklist dan textarea problemDetail
  const handleToggleProblem = (probName: string) => {
    const isCurrentlySelected = selectedProblems.includes(probName);
    const newSelected = isCurrentlySelected
      ? selectedProblems.filter((p) => p !== probName)
      : [...selectedProblems, probName];

    setSelectedProblems(newSelected);

    setProblemDetail((prevDetail) => {
      const targetBullet = `• ${probName}`;
      if (!isCurrentlySelected) {
        if (prevDetail.includes(targetBullet)) {
          return prevDetail;
        }
        if (!prevDetail.trim()) {
          return targetBullet;
        }
        return `${prevDetail.trim()}\n${targetBullet}`;
      } else {
        const lines = prevDetail.split('\n');
        const filtered = lines.filter((l) => l.trim() !== targetBullet);
        return filtered.join('\n').trim();
      }
    });
  };

  const handleProblemDetailChange = (text: string) => {
    setProblemDetail(text);
    const lines = text.split('\n').map((l) => l.trim());
    const checkedFromText = problems
      .filter((p) => lines.includes(`• ${p.name}`))
      .map((p) => p.name);
    setSelectedProblems(checkedFromText);
  };

  const handleSaveQuickProblem = async () => {
    if (!quickAddName.trim()) {
      setQuickAddError('Nama kendala wajib diisi');
      return;
    }

    try {
      setQuickAddSubmitting(true);
      setQuickAddError('');

      const res = await api.post('/problems', {
        name: quickAddName.trim(),
        category: problemCategory,
        description: quickAddDesc.trim() || null,
        is_active: 1,
      });

      const newProblem: Problem = res.data;
      setProblems((prev) => [newProblem, ...prev]);
      handleToggleProblem(newProblem.name);

      setOpenQuickAdd(false);
      setQuickAddName('');
      setQuickAddDesc('');
    } catch (err: any) {
      setQuickAddError(err.response?.data?.message || 'Gagal menambahkan kendala baru');
    } finally {
      setQuickAddSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Upload otomatis saat file dipilih / diambil dari kamera
      const formData = new FormData();
      formData.append('file', file);

      try {
        setUploading(true);
        setErrorMsg('');
        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setUploadedUrl(res.data.url);
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Gagal mengunggah foto / file lampiran');
        setSelectedFile(null);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadedUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!workDate) {
      setErrorMsg('Tanggal pengerjaan wajib diisi');
      return;
    }
    if (!startTime) {
      setErrorMsg('Jam mulai pekerjaan wajib diisi');
      return;
    }
    if (!problemDetail.trim()) {
      setErrorMsg('Detail masalah / problem pekerjaan wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        ticket_id: ticketId ? Number(ticketId) : null,
        problem_category: problemCategory,
        unit_number: unitNumber.trim() || null,
        problem_detail: problemDetail.trim(),
        problem_finding: problemFinding.trim(),
        action_taken: actionTaken.trim(),
        attachment: uploadedUrl || null,
        status,
        work_date: workDate,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime ? (endTime.length === 5 ? `${endTime}:00` : endTime) : null,
      };

      const res = await api.post('/jobs', payload);
      navigate(`/jobs/${res.data.id}`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan catatan pekerjaan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto' }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <IconButton onClick={() => navigate('/jobs')} color="primary">
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === 'dark' ? '#ffd600' : '#1a237e' }}>
            Catat Pekerjaan IT (New Job)
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Dokumentasikan tindakan teknis yang Anda kerjakan hari ini.
          </Typography>
        </Box>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {errorMsg}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Relasi Tiket (Opsional) */}
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Tautkan dengan Tiket Terkait (Opsional)"
                  value={ticketId}
                  onChange={(e) => handleSelectTicket(e.target.value)}
                  helperText="Jika pekerjaan ini berdasarkan tiket bantuan client, pilih nomor tiketnya untuk menghubungkan otomatis."
                >
                  <MenuItem value="">-- Tidak Ditautkan ke Tiket Tertentu --</MenuItem>
                  {tickets.map((t) => (
                    <MenuItem key={t.id} value={String(t.id)}>
                      #{t.id} - {t.subject} ({t.status}) {t.reporter ? `- Pelapor: ${t.reporter.name || t.reporter.username}` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Tanggal & Hari Kerja */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Tanggal Pekerjaan"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              {/* Jam Mulai */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="time"
                  label="Jam Mulai"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              {/* Jam Selesai */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="time"
                  label="Jam Selesai (Opsional)"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText="Bisa diisi nanti jika masih berjalan"
                />
              </Grid>

              {/* Kategori Masalah */}
              <Grid item xs={12} sm={problemCategory.toLowerCase().includes('radio') || problemCategory.toLowerCase().includes('dascam') || unitNumber ? 5 : 8}>
                <TextField
                  select
                  fullWidth
                  label="Kategori Masalah (Problem Category)"
                  value={problemCategory}
                  onChange={(e) => setProblemCategory(e.target.value)}
                  required
                >
                  {PROBLEM_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Nomor Unit Kendaraan */}
              {(problemCategory.toLowerCase().includes('radio') || problemCategory.toLowerCase().includes('dascam') || unitNumber) && (
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Nomor Unit Kendaraan"
                    placeholder="Contoh: 840, 8142"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                  />
                </Grid>
              )}

              {/* Status Pekerjaan */}
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Status Pekerjaan"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  required
                >
                  <MenuItem value="Pending">Pending (Dalam Proses / Tertunda)</MenuItem>
                  <MenuItem value="Completed">Completed (Selesai Tuntas)</MenuItem>
                </TextField>
              </Grid>

              {/* Checklist Gejala Kendala dari Master Masalah */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    border: '1.5px solid',
                    borderColor: (theme) => (theme.palette.mode === 'dark' ? '#1e293b' : '#e2e8f0'),
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#091322' : '#f8fafc'),
                    boxShadow: (theme) => (theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.05)'),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                    <Box>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          color: (theme) => (theme.palette.mode === 'dark' ? '#ffd600' : '#1e293b'),
                        }}
                      >
                        <ChecklistIcon sx={{ fontSize: 22, color: (theme) => (theme.palette.mode === 'dark' ? '#ffd600' : '#2563eb') }} />
                        Daftar Centangan Kendala ({problemCategory})
                      </Typography>
                      <Typography variant="caption" sx={{ color: (theme) => (theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b'), display: 'block', mt: 0.2 }}>
                        Centang gejala kendala yang dilaporkan. Item tercentang otomatis masuk ke rincian masalah teknisi tanpa menghapus catatan manual Anda.
                      </Typography>
                    </Box>

                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setQuickAddError('');
                        setQuickAddName('');
                        setQuickAddDesc('');
                        setOpenQuickAdd(true);
                      }}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#ffd600' : '#2563eb'),
                        color: (theme) => (theme.palette.mode === 'dark' ? '#000000' : '#ffffff'),
                        '&:hover': {
                          bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#e6c200' : '#1d4ed8'),
                        },
                      }}
                    >
                      + Tambah Kendala Baru
                    </Button>
                  </Box>

                  {problemsLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" sx={{ color: (theme) => (theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b') }}>
                        Memuat daftar kendala {problemCategory}...
                      </Typography>
                    </Box>
                  ) : problems.length === 0 ? (
                    <Box
                      sx={{
                        p: 2.5,
                        textAlign: 'center',
                        borderRadius: 1.5,
                        bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#0d1929' : '#ffffff'),
                        border: '1px dashed #94a3b8',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: (theme) => (theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b'), mb: 1 }}>
                        Belum ada daftar kendala untuk kategori <strong>{problemCategory}</strong>.
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setQuickAddError('');
                          setQuickAddName('');
                          setQuickAddDesc('');
                          setOpenQuickAdd(true);
                        }}
                        sx={{ color: (theme) => (theme.palette.mode === 'dark' ? '#ffd600' : '#2563eb'), fontWeight: 700 }}
                      >
                        Tambah Kendala Baru ke Master
                      </Button>
                    </Box>
                  ) : (
                    <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                      {problems.map((p) => {
                        const isChecked = selectedProblems.includes(p.name);
                        return (
                          <Grid item xs={12} sm={6} md={4} key={p.id}>
                            <Box
                              onClick={() => handleToggleProblem(p.name)}
                              sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1,
                                p: 1.25,
                                borderRadius: 1.5,
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'all 0.15s ease',
                                border: '1.5px solid',
                                borderColor: isChecked
                                  ? (theme) => (theme.palette.mode === 'dark' ? '#ffd600' : '#2563eb')
                                  : (theme) => (theme.palette.mode === 'dark' ? '#1e293b' : '#cbd5e1'),
                                bgcolor: isChecked
                                  ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 214, 0, 0.14)' : '#eff6ff')
                                  : (theme) => (theme.palette.mode === 'dark' ? '#0d1929' : '#ffffff'),
                                '&:hover': {
                                  borderColor: (theme) => (theme.palette.mode === 'dark' ? '#ffd600' : '#2563eb'),
                                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 214, 0, 0.08)' : '#f8fafc'),
                                },
                              }}
                            >
                              <Checkbox
                                size="small"
                                checked={isChecked}
                                onChange={() => {}}
                                sx={{
                                  p: 0,
                                  mt: 0.15,
                                  color: (theme) => (theme.palette.mode === 'dark' ? '#64748b' : '#94a3b8'),
                                  '&.Mui-checked': {
                                    color: (theme) => (theme.palette.mode === 'dark' ? '#ffd600' : '#2563eb'),
                                  },
                                }}
                              />
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: isChecked ? 700 : 500,
                                    color: isChecked
                                      ? (theme) => (theme.palette.mode === 'dark' ? '#ffd600' : '#1d4ed8')
                                      : (theme) => (theme.palette.mode === 'dark' ? '#f1f5f9' : '#1e293b'),
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {p.name}
                                </Typography>
                                {p.description && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: (theme) => (theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b'),
                                      display: 'block',
                                      mt: 0.25,
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {p.description}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}
                </Box>
              </Grid>

              {/* Detail Masalah */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Detail Masalah / Keluhan User (Problem Detail)"
                  placeholder="Centang gejala kendala di atas atau ketik manual keluhan user..."
                  value={problemDetail}
                  onChange={(e) => handleProblemDetailChange(e.target.value)}
                  multiline
                  rows={3}
                  required
                  helperText="Gejala yang dicentang otomatis masuk ke teks ini dan catatan manual tetap tersimpan."
                />
              </Grid>

              {/* Temuan Masalah / Diagnosa */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Temuan Masalah / Diagnosa (Problem Finding)"
                  placeholder="Tuliskan temuan masalah, analisa teknis, atau komponen/konfigurasi yang rusak/bermasalah setelah diperiksa..."
                  value={problemFinding}
                  onChange={(e) => setProblemFinding(e.target.value)}
                  multiline
                  rows={3}
                  helperText="Diagnosa atau analisa teknisi terkait kondisi fisik atau akar penyebab kendala."
                />
              </Grid>

              {/* Tindakan yang Diambil */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tindakan / Solusi yang Dilakukan (Action Taken)"
                  placeholder="Contoh: Bongkar bagian roller penarik kertas, bersihkan sisa sobekan kertas, restart spooler printer..."
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  multiline
                  rows={4}
                  helperText="Tuliskan langkah-langkah perbaikan atau pergantian sparepart yang dilakukan."
                />
              </Grid>

              {/* Lampiran Foto Kamera HP / File Bukti Dokumentasi */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#334155' }}>
                  Dokumentasi Foto / Bukti Pekerjaan (Kamera HP / File)
                </Typography>

                <Box
                  sx={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: 2,
                    p: 3,
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
                    id="job-camera-input"
                    type="file"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />

                  {/* Input File / Galeri umum */}
                  <input
                    accept="image/*,.pdf,.doc,.docx"
                    style={{ display: 'none' }}
                    id="job-file-input"
                    type="file"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <label htmlFor="job-camera-input">
                      <Button
                        variant="contained"
                        color="secondary"
                        component="span"
                        startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CameraIcon />}
                        disabled={uploading}
                        sx={{ px: 2.5, py: 1 }}
                      >
                        {uploading ? 'Mengunggah...' : 'Ambil Foto dari Kamera'}
                      </Button>
                    </label>

                    <label htmlFor="job-file-input">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                        disabled={uploading}
                        sx={{ px: 2.5, py: 1 }}
                      >
                        {uploading ? 'Mengunggah...' : 'Pilih dari File / Galeri'}
                      </Button>
                    </label>
                  </Box>

                  <Typography variant="caption" display="block" sx={{ mt: 1.5, color: '#64748b' }}>
                    Bisa langsung jepret foto fisik perangkat/unit dengan kamera HP atau unggah gambar/file maksimal 15MB.
                  </Typography>

                  {/* Pratinjau / Status File Terpilih */}
                  {selectedFile && (
                    <Box
                      sx={{
                        mt: 2,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        px: 2,
                        borderRadius: 1.5,
                        bgcolor: '#e2e8f0',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b' }}>
                        📸 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </Typography>
                      {uploadedUrl && (
                        <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 600 }}>
                          ✓ Terunggah
                        </Typography>
                      )}
                      <IconButton size="small" onClick={handleRemoveFile} color="error">
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}

                  {uploadedUrl && uploadedUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) && (
                    <Box sx={{ mt: 2 }}>
                      <img
                        src={uploadedUrl}
                        alt="Preview Foto Pekerjaan"
                        style={{
                          maxWidth: '100%',
                          maxHeight: 220,
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          objectFit: 'cover',
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => navigate('/jobs')}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <JobIcon />}
                sx={{ px: 4, py: 1.2 }}
              >
                {submitting ? 'Menyimpan...' : 'Simpan Catatan Pekerjaan'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Modal Dialog Quick Add Problem Baru ke Master */}
      <Dialog
        open={openQuickAdd}
        onClose={() => !quickAddSubmitting && setOpenQuickAdd(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#0d1929' : '#ffffff'),
            border: (theme) => (theme.palette.mode === 'dark' ? '1px solid #1e293b' : 'none'),
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: (theme) => (theme.palette.mode === 'dark' ? '#ffd600' : '#1a237e'), display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddIcon />
          Tambah Kendala Baru ke Master
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: (theme) => (theme.palette.mode === 'dark' ? '#1e293b' : '#e2e8f0') }}>
          <Typography variant="body2" sx={{ color: (theme) => (theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b'), mb: 2.5 }}>
            Kendala baru yang ditambahkan di sini akan tersimpan secara permanen ke Master Kendala dan langsung tercentang untuk rincian pekerjaan ini.
          </Typography>

          {quickAddError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {quickAddError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Kategori Kendala"
              value={problemCategory}
              disabled
              helperText="Kategori otomatis mengikuti pilihan form pekerjaan"
              fullWidth
            />

            <TextField
              autoFocus
              label="Nama Gejala / Masalah Kendala *"
              placeholder="Misal: SWR tinggi / power transmit drop"
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
              fullWidth
              required
            />

            <TextField
              label="Deskripsi / Catatan Tambahan (Opsional)"
              placeholder="Penjelasan singkat mengenai gejala kendala ini..."
              value={quickAddDesc}
              onChange={(e) => setQuickAddDesc(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setOpenQuickAdd(false)}
            disabled={quickAddSubmitting}
            color="inherit"
          >
            Batal
          </Button>
          <Button
            onClick={handleSaveQuickProblem}
            disabled={quickAddSubmitting || !quickAddName.trim()}
            variant="contained"
            sx={{
              fontWeight: 700,
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#ffd600' : '#2563eb'),
              color: (theme) => (theme.palette.mode === 'dark' ? '#000000' : '#ffffff'),
              '&:hover': {
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#e6c200' : '#1d4ed8'),
              },
            }}
          >
            {quickAddSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Simpan & Centang'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobCreate;
