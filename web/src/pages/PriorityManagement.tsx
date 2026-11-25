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
  Chip,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Flag as PriorityIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '../api';
import { Priority } from '../types';

const PRESET_COLORS = [
  { label: 'Hijau (Rendah / Normal)', value: '#10b981' },
  { label: 'Biru (Sedang / Standard)', value: '#3b82f6' },
  { label: 'Oranye (Tinggi / Urgent)', value: '#f59e0b' },
  { label: 'Merah (Kritis / Darurat)', value: '#ef4444' },
  { label: 'Ungu (Spesial / Proyek)', value: '#8b5cf6' },
  { label: 'Abu-abu (Netral)', value: '#6b7280' },
];

export const PriorityManagement: React.FC = () => {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State Modal Tambah/Edit
  const [openModal, setOpenModal] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [formName, setFormName] = useState('');
  const [formLevel, setFormLevel] = useState<number>(1);
  const [formColor, setFormColor] = useState('#3b82f6');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // State Modal Konfirmasi Hapus
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; priority: Priority | null }>({
    open: false,
    priority: null,
  });

  const fetchPriorities = async () => {
    try {
      setLoading(true);
      const res = await api.get('/priorities');
      setPriorities(res.data);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal memuat daftar prioritas',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriorities();
  }, []);

  const handleOpenAdd = () => {
    setEditingPriority(null);
    setFormName('');
    setFormLevel(priorities.length + 1);
    setFormColor('#3b82f6');
    setFormDesc('');
    setOpenModal(true);
  };

  const handleOpenEdit = (p: Priority) => {
    setEditingPriority(p);
    setFormName(p.name);
    setFormLevel(p.level || 1);
    setFormColor(p.color || '#3b82f6');
    setFormDesc(p.description || '');
    setOpenModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setAlertInfo({ type: 'error', message: 'Nama tingkat prioritas wajib diisi' });
      return;
    }

    try {
      setSubmitting(true);
      if (editingPriority) {
        // Edit
        const res = await api.patch(`/priorities/${editingPriority.id}`, {
          name: formName,
          level: formLevel,
          color: formColor,
          description: formDesc,
        });
        setAlertInfo({ type: 'success', message: res.data.message });
      } else {
        // Tambah Baru
        const res = await api.post('/priorities', {
          name: formName,
          level: formLevel,
          color: formColor,
          description: formDesc,
        });
        setAlertInfo({ type: 'success', message: res.data.message });
      }
      setOpenModal(false);
      fetchPriorities();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menyimpan tingkat prioritas',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.priority) return;
    try {
      const res = await api.delete(`/priorities/${deleteDialog.priority.id}`);
      setAlertInfo({ type: 'success', message: res.data.message });
      setDeleteDialog({ open: false, priority: null });
      fetchPriorities();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menghapus tingkat prioritas',
      });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: (theme) => theme.palette.mode === 'dark' ? '#ffd600' : '#1a237e' }}>
            Kelola Tingkat Prioritas
          </Typography>
          <Typography variant="body2" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b' }}>
            Atur tingkatan urgensi tiket perbaikan (Low, Medium, High, Critical) beserta warna label indikator.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchPriorities}
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
            Tambah Prioritas
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

      {/* Tabel Prioritas */}
      <Card sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : priorities.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}>
              <PriorityIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography variant="body1">Belum ada tingkat prioritas yang ditambahkan.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 80 }}>Level Urutan</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Label Prioritas</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Preview Badge</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Deskripsi / SLA Panduan</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: 140 }}>
                      Aksi
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {priorities.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: (theme) => theme.palette.mode === 'dark' ? '#ffd600' : '#64748b' }}>
                        #{p.level}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b', fontSize: '0.88rem' }}>
                        {p.name}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={p.name}
                          size="small"
                          sx={{
                            bgcolor: `${p.color}20`,
                            color: p.color,
                            border: `1px solid ${p.color}`,
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#e2e8f0' : '#475569', fontSize: '0.85rem' }}>
                        {p.description || '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Tooltip title="Ubah Prioritas">
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => handleOpenEdit(p)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Hapus Prioritas">
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => setDeleteDialog({ open: true, priority: p })}
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
            {editingPriority ? 'Ubah Tingkat Prioritas' : 'Tambah Tingkat Prioritas Baru'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nama Prioritas (contoh: Low, Medium, High, Critical)"
              fullWidth
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              sx={{ mb: 2, mt: 1 }}
            />
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                type="number"
                label="Tingkat Urutan Level (1 = Terendah, 4 = Tertinggi)"
                fullWidth
                value={formLevel}
                onChange={(e) => setFormLevel(parseInt(e.target.value, 10) || 1)}
              />
              <TextField
                select
                label="Pilihan Warna Label"
                fullWidth
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
              >
                {PRESET_COLORS.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          bgcolor: c.value,
                        }}
                      />
                      <span>{c.label}</span>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              margin="dense"
              label="Deskripsi / Target SLA"
              fullWidth
              multiline
              rows={3}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Jelaskan kondisi atau batas waktu penanganan prioritas ini"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={submitting}>
              {submitting ? <CircularProgress size={22} /> : 'Simpan Prioritas'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Konfirmasi Hapus */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, priority: null })}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#d32f2f' }}>
          Hapus Tingkat Prioritas?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Apakah Anda yakin ingin menghapus prioritas <b>{deleteDialog.priority?.name}</b>?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, priority: null })}>Batal</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Hapus
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PriorityManagement;
