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
  Autocomplete,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
  Clear as ClearIcon,
  AddCircleOutline as AddIcon,
  PlaylistAddCheck as ChecklistIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Category, Priority, VehicleUnit, Problem } from '../types';

const CATEGORIES = [
  'Hardware',
  'Software',
  'Network / Internet',
  'Email & Akun',
  'Printer & Scanner',
  'Server / Database',
  'Keamanan / Security',
  'General IT Support',
];

export const TicketCreate: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [units, setUnits] = useState<VehicleUnit[]>([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Hardware');
  const [unitNumber, setUnitNumber] = useState('');
  const [priority, setPriority] = useState<string>('Medium');
  const [detail, setDetail] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successTicketId, setSuccessTicketId] = useState<number | null>(null);

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

  const navigate = useNavigate();

  const userJson = localStorage.getItem('taurus_user');
  const currentUser = userJson ? JSON.parse(userJson) : { role: 'client' };
  const isClient = currentUser.role === 'client';

  const requiresVehicleUnit =
    category.toLowerCase().includes('radio rig') ||
    category.toLowerCase().includes('dascam') ||
    category.toLowerCase().includes('dashcam');

  useEffect(() => {
    // Ambil kategori dinamis dari server
    api.get('/categories').then((res) => {
      if (res.data && res.data.length > 0) {
        setCategories(res.data);
        setCategory(res.data[0].name);
      }
    }).catch(() => {});

    // Ambil prioritas dinamis dari server
    api.get('/priorities').then((res) => {
      if (res.data && res.data.length > 0) {
        setPriorities(res.data);
        const med = res.data.find((p: Priority) => p.name.toLowerCase() === 'medium') || res.data[0];
        setPriority(med.name);
      }
    }).catch(() => {});

    // Ambil master nomor unit kendaraan (hanya unit_number agar ringan)
    api.get('/units?all=true').then((res) => {
      if (res.data && res.data.length > 0) {
        setUnits(res.data);
      }
    }).catch(() => {});
  }, []);

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
    if (category) {
      fetchProblems(category);
    }
  }, [category]);

  // Sinkronisasi non-destructive antara checklist dan textarea detail
  const handleToggleProblem = (probName: string) => {
    const isCurrentlySelected = selectedProblems.includes(probName);
    const newSelected = isCurrentlySelected
      ? selectedProblems.filter((p) => p !== probName)
      : [...selectedProblems, probName];

    setSelectedProblems(newSelected);

    setDetail((prevDetail) => {
      const targetBullet = `• ${probName}`;
      if (!isCurrentlySelected) {
        // Jika dicentang dan belum ada di teks, tambahkan
        if (prevDetail.includes(targetBullet)) {
          return prevDetail;
        }
        if (!prevDetail.trim()) {
          return targetBullet;
        }
        return `${prevDetail.trim()}\n${targetBullet}`;
      } else {
        // Jika di-uncheck, hapus baris bullet target
        const lines = prevDetail.split('\n');
        const filtered = lines.filter((l) => l.trim() !== targetBullet);
        return filtered.join('\n').trim();
      }
    });
  };

  // Handler jika user mengetik bebas di textarea detail
  const handleDetailChange = (text: string) => {
    setDetail(text);
    // Sinkronkan selectedProblems dengan teks yang berawalan "• "
    const lines = text.split('\n').map((l) => l.trim());
    const checkedFromText = problems
      .filter((p) => lines.includes(`• ${p.name}`))
      .map((p) => p.name);
    setSelectedProblems(checkedFromText);
  };

  // Quick Add Problem Baru ke Master
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
        category: category,
        description: quickAddDesc.trim() || null,
        is_active: 1,
      });

      const newProblem: Problem = res.data;

      // Masukkan ke daftar state problems
      setProblems((prev) => [newProblem, ...prev]);

      // Otomatis centang item yang baru ditambahkan
      handleToggleProblem(newProblem.name);

      // Tutup dialog
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

      // Upload otomatis saat file dipilih
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
        setErrorMsg(err.response?.data?.message || 'Gagal mengunggah file lampiran');
        setSelectedFile(null);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!subject.trim()) {
      setErrorMsg('Subjek tiket tidak boleh kosong');
      return;
    }
    if (!detail.trim()) {
      setErrorMsg('Detail kendala tidak boleh kosong');
      return;
    }

    const requiresVehicleUnit = 
      category.toLowerCase().includes('radio rig') || 
      category.toLowerCase().includes('dascam') || 
      category.toLowerCase().includes('dashcam');
    if (requiresVehicleUnit && !unitNumber) {
      setErrorMsg(`Untuk kategori ${category}, Nomor Unit Kendaraan wajib dipilih`);
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        subject: subject.trim(),
        category,
        unit_number: requiresVehicleUnit ? unitNumber : null,
        priority,
        detail: detail.trim(),
        attachment: uploadedUrl || null,
      };

      const res = await api.post('/tickets', payload);

      if (isClient) {
        // Untuk client: tampilkan konfirmasi sukses langsung di halaman
        setSuccessTicketId(res.data.id);
        setSubject('');
        setDetail('');
        setUnitNumber('');
        setSelectedFile(null);
        setUploadedUrl('');
      } else {
        // Untuk IT Support dan Admin: buka halaman detail tiket
        navigate(`/tickets/${res.data.id}`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan tiket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto' }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        {!isClient && (
          <IconButton onClick={() => navigate('/tickets')} color="primary">
            <ArrowBackIcon />
          </IconButton>
        )}
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === 'dark' ? '#ffd600' : '#1a237e' }}>
            Buat Tiket Baru
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {isClient
              ? 'Laporkan kendala perangkat, jaringan, radio, atau operasional ke tim IT Support.'
              : 'Isi formulir di bawah ini untuk melaporkan insiden atau mengajukan permintaan IT.'}
          </Typography>
        </Box>
      </Box>

      {/* Banner Sukses Pembuatan Tiket Khusus Client */}
      {successTicketId && (
        <Card sx={{ mb: 4, bgcolor: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 2 }}>
          <CardContent sx={{ p: 3, textAlign: 'center' }}>
            <SuccessIcon sx={{ fontSize: 56, color: '#2e7d32', mb: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1b5e20', mb: 1 }}>
              Tiket Berhasil Dibuat! (Nomor Tiket #{successTicketId})
            </Typography>
            <Typography variant="body1" sx={{ color: '#2e7d32', mb: 2.5, maxWidth: 600, mx: 'auto' }}>
              Laporan gangguan Anda telah masuk ke sistem operasional. Tim IT Support akan segera menangani kendala Anda.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate('/')}
                sx={{ px: 3, py: 1 }}
              >
                Lihat Antrian Tiket Saya
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setSuccessTicketId(null)}
                sx={{ px: 3, py: 1 }}
              >
                Buat Tiket Baru Lainnya
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {errorMsg}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Subjek */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Subjek Kendala / Permintaan"
                  placeholder="Contoh: Radio Rig Unit 840 Mati / Tidak Ada Suara"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  variant="outlined"
                />
              </Grid>

              {/* Kategori */}
              <Grid item xs={12} sm={requiresVehicleUnit ? 6 : 6}>
                <TextField
                  select
                  fullWidth
                  label="Kategori Masalah"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </MenuItem>
                    ))
                  ) : (
                    CATEGORIES.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))
                  )}
                </TextField>
              </Grid>

              {/* Inputan Khusus Jika Kategori Radio Rig / Dascam: Nomor Unit Kendaraan dengan Autocomplete */}
              {requiresVehicleUnit ? (
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={units}
                    getOptionLabel={(option) =>
                      typeof option === 'string'
                        ? option
                        : `${option.unit_number} ${option.vehicle_brand ? `(${option.vehicle_brand})` : ''}`
                    }
                    value={units.find((u) => u.unit_number === unitNumber) || null}
                    onChange={(_, newValue) => {
                      setUnitNumber(newValue ? newValue.unit_number : '');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Nomor Unit Kendaraan (Wajib untuk Radio Rig / Dascam)"
                        placeholder="Ketik nomor unit (misal: 840, 8142, 8164)..."
                        required
                        helperText="Pilih nomor lambung unit kendaraan tambang"
                      />
                    )}
                  />
                </Grid>
              ) : null}

              {/* Prioritas */}
              <Grid item xs={12} sm={requiresVehicleUnit ? 12 : 6}>
                <TextField
                  select
                  fullWidth
                  label="Tingkat Prioritas"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  required
                >
                  {priorities.length > 0 ? (
                    priorities.map((p) => (
                      <MenuItem key={p.id} value={p.name}>
                        {p.name}
                      </MenuItem>
                    ))
                  ) : (
                    ['Low', 'Medium', 'High', 'Critical'].map((p) => (
                      <MenuItem key={p} value={p}>
                        {p}
                      </MenuItem>
                    ))
                  )}
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
                        Daftar Centangan Kendala ({category})
                      </Typography>
                      <Typography variant="caption" sx={{ color: (theme) => (theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b'), display: 'block', mt: 0.2 }}>
                        Centang gejala kendala yang dialami. Gejala yang dicentang otomatis menjadi poin deskripsi di bawah tanpa menghapus catatan manual Anda.
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
                        Memuat daftar kendala {category}...
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
                        Belum ada daftar kendala untuk kategori <strong>{category}</strong>.
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
                                onChange={() => {}} // dikendalikan oleh parent Box
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
                  multiline
                  rows={4}
                  label="Detail Deskripsi Kendala (Otomatis terisi dari centangan, bisa diketik bebas)"
                  placeholder="Centang masalah di atas atau ketik langsung kendala yang dialami, lokasi unit atau ruangan, dan catatan tambahan..."
                  value={detail}
                  onChange={(e) => handleDetailChange(e.target.value)}
                  required
                  helperText="Anda dapat menambah catatan manual di bawah poin centangan kapan saja."
                />
              </Grid>

              {/* Lampiran Bukti File / Foto */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#334155' }}>
                  Lampiran Pendukung (Foto / Screenshot / Dokumen)
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
                  <input
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    style={{ display: 'none' }}
                    id="attachment-file-input"
                    type="file"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  <label htmlFor="attachment-file-input">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                      disabled={uploading}
                    >
                      {uploading ? 'Mengunggah File...' : 'Pilih File Lampiran'}
                    </Button>
                  </label>

                  {selectedFile && uploadedUrl && (
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <SuccessIcon color="success" fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                        {selectedFile.name} (Terunggah)
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelectedFile(null);
                          setUploadedUrl('');
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              {!isClient && (
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => navigate('/tickets')}
                >
                  Batal
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                disabled={submitting || uploading}
                sx={{ px: 4, py: 1.2 }}
              >
                {submitting ? <CircularProgress size={24} color="inherit" /> : 'Kirim Tiket Sekarang'}
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
            Kendala baru yang ditambahkan di sini akan tersimpan secara permanen ke Master Kendala dan langsung tercentang untuk laporan tiket ini.
          </Typography>

          {quickAddError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {quickAddError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Kategori Kendala"
              value={category}
              disabled
              helperText="Kategori otomatis mengikuti pilihan form tiket"
              fullWidth
            />

            <TextField
              autoFocus
              label="Nama Gejala / Masalah Kendala *"
              placeholder="Misal: GPS tidak terkunci / no lock signal"
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

export default TicketCreate;
