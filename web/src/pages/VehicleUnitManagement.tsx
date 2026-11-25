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
  Pagination,
  InputAdornment,
  Grid,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DirectionsCar as VehicleIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import api from '../api';
import { VehicleUnit } from '../types';
import { useAppTheme } from '../ThemeContext';

const RADIO_TYPES = [
  'GM338',
  'XIR3688',
];

export const VehicleUnitManagement: React.FC = () => {
  const { mode } = useAppTheme();
  const isDark = mode === 'dark';
  const [units, setUnits] = useState<VehicleUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State Modal Tambah/Edit
  const [openModal, setOpenModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<VehicleUnit | null>(null);
  const [formNumber, setFormNumber] = useState('');
  const [formVehicleBrand, setFormVehicleBrand] = useState('Mercedes Benz');
  const [formUnitType, setFormUnitType] = useState('');
  const [formRadioBrand, setFormRadioBrand] = useState('Motorola');
  const [formRadioType, setFormRadioType] = useState('');
  const [formAntennaType, setFormAntennaType] = useState('');
  const [formAntennaBase, setFormAntennaBase] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // State Modal Konfirmasi Hapus
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; unit: VehicleUnit | null }>({
    open: false,
    unit: null,
  });

  const fetchUnits = async (targetPage = page, searchTerm = search) => {
    try {
      setLoading(true);
      const res = await api.get('/units', {
        params: {
          page: targetPage,
          limit: 25,
          search: searchTerm.trim() || undefined,
        },
      });
      setUnits(res.data.items || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalItems(res.data.total || 0);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal memuat master unit kendaraan',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits(1, '');
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUnits(1, search);
  };

  const handlePageChange = (_: any, newPage: number) => {
    setPage(newPage);
    fetchUnits(newPage, search);
  };

  const handleOpenAdd = () => {
    setEditingUnit(null);
    setFormNumber('');
    setFormVehicleBrand('Mercedes Benz');
    setFormUnitType('');
    setFormRadioBrand('Motorola');
    setFormRadioType('');
    setFormAntennaType('');
    setFormAntennaBase('');
    setFormDesc('');
    setOpenModal(true);
  };

  const handleOpenEdit = (unit: VehicleUnit) => {
    setEditingUnit(unit);
    setFormNumber(unit.unit_number);
    setFormVehicleBrand(unit.vehicle_brand || 'Mercedes Benz');
    setFormUnitType(unit.unit_type || '');
    setFormRadioBrand(unit.radio_brand || 'Motorola');
    setFormRadioType(unit.radio_type || '');
    setFormAntennaType(unit.antenna_type || '');
    setFormAntennaBase(unit.antenna_base || '');
    setFormDesc(unit.description || '');
    setOpenModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNumber.trim()) {
      setAlertInfo({ type: 'error', message: 'Nomor unit kendaraan wajib diisi' });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        unit_number: formNumber,
        vehicle_brand: formVehicleBrand,
        unit_type: formUnitType,
        radio_brand: formRadioBrand,
        radio_type: formRadioType,
        antenna_type: formAntennaType,
        antenna_base: formAntennaBase,
        description: formDesc,
      };

      if (editingUnit) {
        // Edit
        const res = await api.patch(`/units/${editingUnit.id}`, payload);
        setAlertInfo({ type: 'success', message: res.data.message });
      } else {
        // Tambah Baru
        const res = await api.post('/units', payload);
        setAlertInfo({ type: 'success', message: res.data.message });
      }
      setOpenModal(false);
      fetchUnits(page, search);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menyimpan unit kendaraan',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.unit) return;
    try {
      const res = await api.delete(`/units/${deleteDialog.unit.id}`);
      setAlertInfo({ type: 'success', message: res.data.message });
      setDeleteDialog({ open: false, unit: null });
      fetchUnits(page, search);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menghapus unit kendaraan',
      });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: isDark ? '#ffd600' : '#1a237e' }}>
            Master Nomor Unit Kendaraan Tambang
          </Typography>
          <Typography variant="body2" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b' }}>
            Database unit kendaraan (total {totalItems.toLocaleString()} unit, dari 840 s/d 8164) beserta kelengkapan Radio Rig & Antena.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchUnits(page, search)}
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
            Tambah Unit
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

      {/* Filter / Search Bar */}
      <Card sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <form onSubmit={handleSearchSubmit}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Cari nomor unit (misal: 840, 1000, 8164), merk, dll..."
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearch('');
                        fetchUnits(1, '');
                      }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
            <Button type="submit" variant="contained" sx={{ px: 3, textTransform: 'none' }}>
              Cari
            </Button>
          </Box>
        </form>
      </Card>

      {/* Tabel Unit Kendaraan */}
      <Card sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : units.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}>
              <VehicleIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography variant="body1">Tidak ditemukan unit kendaraan yang sesuai.</Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: 60 }}>No</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Nomor Unit</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Merk Unit</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tipe Unit</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Merk Radio</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tipe Radio</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Jenis Antena</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Bonggol Antena</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: 110 }}>
                        Aksi
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {units.map((unit, idx) => (
                      <TableRow key={unit.id} hover>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {(page - 1) * 25 + idx + 1}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem', fontFamily: 'monospace' }}>
                          <Chip
                            label={unit.unit_number}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 800,
                              borderRadius: 1.5,
                              borderColor: 'primary.main',
                              color: 'primary.main',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {unit.vehicle_brand || '-'}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {unit.unit_type || '-'}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'info.main' }}>
                          {unit.radio_brand || '-'}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {unit.radio_type || '-'}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {unit.antenna_type || '-'}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {unit.antenna_base || '-'}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <Tooltip title="Ubah Unit">
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => handleOpenEdit(unit)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Hapus Unit">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => setDeleteDialog({ open: true, unit })}
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

              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="body2" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b' }}>
                  Menampilkan {(page - 1) * 25 + 1} - {Math.min(page * 25, totalItems)} dari total {totalItems.toLocaleString()} unit
                </Typography>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  shape="rounded"
                  showFirstButton
                  showLastButton
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal Form Tambah / Edit */}
      <Dialog open={openModal} onClose={() => !submitting && setOpenModal(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700, color: isDark ? '#ffd600' : '#1a237e' }}>
            {editingUnit ? 'Ubah Informasi Unit Kendaraan' : 'Tambah Unit Kendaraan Baru'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  autoFocus
                  label="Nomor Unit Kendaraan"
                  fullWidth
                  required
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value.toUpperCase())}
                  placeholder="Contoh: 840, 8164, DT-101"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Merk Unit Kendaraan"
                  fullWidth
                  value={formVehicleBrand}
                  onChange={(e) => setFormVehicleBrand(e.target.value)}
                  placeholder="Mercedes Benz"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Tipe / Jenis Unit Kendaraan"
                  fullWidth
                  value={formUnitType}
                  onChange={(e) => setFormUnitType(e.target.value)}
                  placeholder="Dump Truck / Light Vehicle / Kosongkan"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Merk Radio"
                  fullWidth
                  value={formRadioBrand}
                  onChange={(e) => setFormRadioBrand(e.target.value)}
                  placeholder="Motorola"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  label="Tipe Radio"
                  fullWidth
                  value={formRadioType}
                  onChange={(e) => setFormRadioType(e.target.value)}
                  helperText="Pilih GM338 atau XIR3688"
                >
                  <MenuItem value="">
                    <em>- Belum Ditentukan / Kosong -</em>
                  </MenuItem>
                  {RADIO_TYPES.map((rt) => (
                    <MenuItem key={rt} value={rt}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={rt}
                          size="small"
                          color={rt === 'GM338' ? 'primary' : 'secondary'}
                          sx={{ fontWeight: 700 }}
                        />
                        <span>Motorola {rt}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Jenis Antena"
                  fullWidth
                  value={formAntennaType}
                  onChange={(e) => setFormAntennaType(e.target.value)}
                  placeholder="Kosongkan jika belum ada"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Bonggol Antena"
                  fullWidth
                  value={formAntennaBase}
                  onChange={(e) => setFormAntennaBase(e.target.value)}
                  placeholder="Kosongkan jika belum ada"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Keterangan / Lokasi Pit / Catatan Lain"
                  fullWidth
                  multiline
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Catatan tambahan kondisi radio / kendaraan"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={submitting}>
              {submitting ? <CircularProgress size={22} /> : 'Simpan Unit'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Konfirmasi Hapus */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, unit: null })}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#d32f2f' }}>
          Hapus Unit Kendaraan?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Apakah Anda yakin ingin menghapus unit kendaraan <b>{deleteDialog.unit?.unit_number}</b>?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, unit: null })}>Batal</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Hapus
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VehicleUnitManagement;
