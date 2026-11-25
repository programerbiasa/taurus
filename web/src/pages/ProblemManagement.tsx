import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Chip,
  InputAdornment,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ReportProblem as ProblemIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import api from '../api';
import { Problem, Category } from '../types';
import { useAppTheme } from '../ThemeContext';

export const ProblemManagement: React.FC = () => {
  const { mode } = useAppTheme();
  const isDark = mode === 'dark';
  const textNavy = isDark ? '#ffd600' : '#1a237e';

  const [problems, setProblems] = useState<Problem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State Modal Tambah/Edit
  const [openModal, setOpenModal] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // State Modal Konfirmasi Hapus
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; problem: Problem | null }>({
    open: false,
    problem: null,
  });

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data || []);
    } catch (err) {
      console.error('Gagal mengambil kategori:', err);
    }
  };

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedCategory && selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (search.trim()) {
        params.search = search.trim();
      }
      const res = await api.get('/problems', { params });
      setProblems(res.data || []);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal memuat master kendala masalah',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProblems();
  };

  const handleOpenAdd = () => {
    setEditingProblem(null);
    setFormName('');
    setFormCategory(selectedCategory !== 'all' ? selectedCategory : (categories[0]?.name || 'Dascam'));
    setFormDesc('');
    setFormIsActive(true);
    setOpenModal(true);
  };

  const handleOpenEdit = (prob: Problem) => {
    setEditingProblem(prob);
    setFormName(prob.name);
    setFormCategory(prob.category || '');
    setFormDesc(prob.description || '');
    setFormIsActive(Boolean(prob.is_active));
    setOpenModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setAlertInfo({ type: 'error', message: 'Nama kendala / masalah wajib diisi' });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formName.trim(),
        category: formCategory.trim() || null,
        description: formDesc.trim() || null,
        is_active: formIsActive ? 1 : 0,
      };

      if (editingProblem) {
        await api.patch(`/problems/${editingProblem.id}`, payload);
        setAlertInfo({ type: 'success', message: 'Master kendala berhasil diperbarui' });
      } else {
        await api.post('/problems', payload);
        setAlertInfo({ type: 'success', message: 'Master kendala baru berhasil ditambahkan' });
      }

      setOpenModal(false);
      fetchProblems();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menyimpan master kendala masalah',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.problem) return;

    try {
      await api.delete(`/problems/${deleteDialog.problem.id}`);
      setAlertInfo({ type: 'success', message: 'Master kendala berhasil dihapus' });
      setDeleteDialog({ open: false, problem: null });
      fetchProblems();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menghapus master kendala masalah',
      });
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: textNavy, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ProblemIcon sx={{ color: isDark ? '#ffd600' : '#d97706' }} /> Master Kendala / Masalah (Checklist Gejala)
          </Typography>
          <Typography variant="body2" sx={{ color: isDark ? '#94a3b8' : '#64748b', mt: 0.3 }}>
            Katalog gejala kendala operasional untuk mempermudah centangan cepat pada tiket dan pencatatan pekerjaan.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchProblems()}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            Segarkan
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{ fontWeight: 700 }}
          >
            Tambah Kendala Baru
          </Button>
        </Box>
      </Box>

      {/* Alert Notifikasi */}
      {alertInfo && (
        <Alert
          severity={alertInfo.type}
          onClose={() => setAlertInfo(null)}
          sx={{ mb: 2.5, borderRadius: 2 }}
        >
          {alertInfo.message}
        </Alert>
      )}

      {/* Filter & Pencarian Sticky */}
      <Card sx={{ mb: 2.5, p: 2 }}>
        <form onSubmit={handleSearchSubmit}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ minWidth: 220, flex: { xs: '1 1 100%', sm: '0 0 250px' } }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Filter Kategori"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FilterIcon fontSize="small" sx={{ color: isDark ? '#ffd600' : '#d97706' }} />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="all">Semua Kategori ({problems.length})</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ flex: 1, minWidth: 220 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Cari nama kendala, gejala, atau kata kunci..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: isDark ? '#00ff66' : '#64748b' }} />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearch('');
                          // fetch ulang
                          setTimeout(() => fetchProblems(), 50);
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="secondary"
              sx={{ fontWeight: 700, px: 3 }}
            >
              Cari
            </Button>
          </Box>
        </form>
      </Card>

      {/* Tabel Master Kendala dengan Scroll Tersendiri */}
      <Card sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 60, fontWeight: 800 }}>No</TableCell>
                <TableCell sx={{ fontWeight: 800, minWidth: 260 }}>Nama Kendala / Gejala Masalah</TableCell>
                <TableCell sx={{ fontWeight: 800, minWidth: 160 }}>Kategori</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Deskripsi / Catatan Bawaan</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 110, textAlign: 'center' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 100, textAlign: 'center' }}>Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={36} />
                    <Typography variant="body2" sx={{ mt: 1.5, color: '#94a3b8' }}>
                      Memuat data kendala masalah...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : problems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <ProblemIcon sx={{ fontSize: 44, color: '#94a3b8', opacity: 0.5, mb: 1 }} />
                    <Typography variant="body1" sx={{ fontWeight: 700, color: textNavy }}>
                      Tidak ada master kendala ditemukan
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      Silakan klik tombol "Tambah Kendala Baru" di atas untuk mendaftarkan opsi kendala.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                problems.map((prob, idx) => (
                  <TableRow key={prob.id} hover>
                    <TableCell sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#ffd600' : '#64748b', fontWeight: 700 }}>{idx + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: textNavy, fontSize: '0.88rem' }}>
                      {prob.name}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={prob.category || 'Umum'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          bgcolor: isDark ? 'rgba(0, 229, 255, 0.15)' : '#e0f2fe',
                          color: isDark ? '#00e5ff' : '#0369a1',
                          border: isDark ? '1px solid rgba(0, 229, 255, 0.3)' : 'none',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: '0.82rem' }}>
                      {prob.description || '-'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={Boolean(prob.is_active) ? 'Aktif' : 'Nonaktif'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          bgcolor: Boolean(prob.is_active)
                            ? (isDark ? 'rgba(0, 255, 102, 0.15)' : '#dcfce7')
                            : (isDark ? 'rgba(255, 51, 102, 0.15)' : '#fee2e2'),
                          color: Boolean(prob.is_active)
                            ? (isDark ? '#00ff66' : '#15803d')
                            : (isDark ? '#ff3366' : '#b91c1c'),
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Ubah Kendala">
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleOpenEdit(prob)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Hapus Kendala">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => setDeleteDialog({ open: true, problem: prob })}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Modal Form Tambah / Edit Kendala */}
      <Dialog open={openModal} onClose={() => !submitting && setOpenModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 800, color: textNavy }}>
            {editingProblem ? 'Ubah Master Kendala / Masalah' : 'Tambah Master Kendala / Masalah Baru'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <TextField
                autoFocus
                label="Nama Kendala / Gejala Masalah"
                required
                fullWidth
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Kamera depan mati / no signal, PTT rusak, SWR tinggi"
                helperText="Nama masalah yang akan muncul sebagai opsi centangan pada formulir"
              />

              <TextField
                select
                label="Kategori Masalah"
                fullWidth
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                helperText="Pilih kategori terkait agar muncul saat kategori dipilih"
              >
                <MenuItem value="">-- Umum (Muncul di semua kategori) --</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Keterangan / Deskripsi Bawaan (Opsional)"
                fullWidth
                multiline
                rows={2}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Penjelasan ringkas penyebab atau solusi default..."
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Status Aktif (Tampilkan di pilihan centangan tiket & job)
                  </Typography>
                }
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button onClick={() => setOpenModal(false)} color="inherit" disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" variant="contained" color="secondary" disabled={submitting} sx={{ fontWeight: 700 }}>
              {submitting ? <CircularProgress size={22} color="inherit" /> : 'Simpan Master Kendala'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal Dialog Konfirmasi Hapus */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, problem: null })}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>
          Hapus Master Kendala?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Apakah Anda yakin ingin menghapus kendala <strong>"{deleteDialog.problem?.name}"</strong>?
            Kendala ini tidak akan muncul lagi di daftar centangan baru.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, problem: null })} color="inherit">
            Batal
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Hapus
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProblemManagement;
