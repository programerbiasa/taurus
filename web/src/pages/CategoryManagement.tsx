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
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '../api';
import { Category } from '../types';

export const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State Modal Tambah/Edit
  const [openModal, setOpenModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // State Modal Konfirmasi Hapus
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; category: Category | null }>({
    open: false,
    category: null,
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal memuat kategori',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormName('');
    setFormDesc('');
    setOpenModal(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDesc(cat.description || '');
    setOpenModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setAlertInfo({ type: 'error', message: 'Nama kategori wajib diisi' });
      return;
    }

    try {
      setSubmitting(true);
      if (editingCategory) {
        // Edit
        const res = await api.patch(`/categories/${editingCategory.id}`, {
          name: formName,
          description: formDesc,
        });
        setAlertInfo({ type: 'success', message: res.data.message });
      } else {
        // Tambah Baru
        const res = await api.post('/categories', {
          name: formName,
          description: formDesc,
        });
        setAlertInfo({ type: 'success', message: res.data.message });
      }
      setOpenModal(false);
      fetchCategories();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menyimpan kategori',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.category) return;
    try {
      const res = await api.delete(`/categories/${deleteDialog.category.id}`);
      setAlertInfo({ type: 'success', message: res.data.message });
      setDeleteDialog({ open: false, category: null });
      fetchCategories();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menghapus kategori',
      });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: (theme) => theme.palette.mode === 'dark' ? '#ffd600' : '#1a237e' }}>
            Kelola Kategori Masalah
          </Typography>
          <Typography variant="body2" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b' }}>
            Atur daftar kategori masalah IT (Hardware, Jaringan, Printer, Server, PC, dll) untuk formulir tiket & pekerjaan.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchCategories}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            Muat Ulang
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{ textTransform: 'none', px: 2 }}
          >
            Tambah Kategori
          </Button>
        </Box>
      </Box>

      {alertInfo && (
        <Alert
          severity={alertInfo.type}
          onClose={() => setAlertInfo(null)}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {alertInfo.message}
        </Alert>
      )}

      {/* Tabel Kategori */}
      <Card sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : categories.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}>
              <CategoryIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography variant="body1">Belum ada kategori yang ditambahkan.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 70 }}>No</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Nama Kategori</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Deskripsi / Keterangan</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: 140 }}>
                      Aksi
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((cat, idx) => (
                    <TableRow key={cat.id} hover>
                      <TableCell sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#ffd600' : '#64748b', fontWeight: 700 }}>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#1a237e' }}>
                        {cat.name}
                      </TableCell>
                      <TableCell sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#e2e8f0' : '#475569' }}>
                        {cat.description || '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Tooltip title="Ubah Kategori">
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => handleOpenEdit(cat)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Hapus Kategori">
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => setDeleteDialog({ open: true, category: cat })}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Modal Form Tambah / Edit */}
      <Dialog open={openModal} onClose={() => !submitting && setOpenModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700, color: (theme) => theme.palette.mode === 'dark' ? '#ffd600' : '#1a237e' }}>
            {editingCategory ? 'Ubah Kategori Masalah' : 'Tambah Kategori Masalah Baru'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nama Kategori (contoh: Jaringan, Printer, PC)"
              fullWidth
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              margin="dense"
              label="Deskripsi / Ruang Lingkup Masalah"
              fullWidth
              multiline
              rows={3}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Jelaskan jenis masalah atau perangkat yang masuk dalam kategori ini"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={submitting}>
              {submitting ? <CircularProgress size={22} /> : 'Simpan Kategori'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Konfirmasi Hapus */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, category: null })}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#d32f2f' }}>
          Hapus Kategori?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Apakah Anda yakin ingin menghapus kategori <b>{deleteDialog.category?.name}</b>?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, category: null })}>Batal</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Hapus
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoryManagement;
