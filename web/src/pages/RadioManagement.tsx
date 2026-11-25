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
  Tabs,
  Tab,
  Autocomplete,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Radio as RadioIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  CompareArrows as TransferIcon,
  History as HistoryIcon,
  CheckCircle as ActiveIcon,
  Inventory as StandbyIcon,
  Warning as AlertIcon,
  PhotoCamera as CameraIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Timeline as TrackingIcon,
  Place as PinIcon,
  ArrowForward as ArrowIcon,
  Event as DateIcon,
} from '@mui/icons-material';
import api from '../api';
import socket from '../socket';
import { Radio, RadioMovement, VehicleUnit } from '../types';
import { useAppTheme } from '../ThemeContext';

export const RadioManagement: React.FC = () => {
  const { mode } = useAppTheme();
  const isDark = mode === 'dark';
  const textNavy = isDark ? '#ffd600' : '#1a237e';
  const textMuted = isDark ? '#cbd5e1' : '#64748b';
  const textSec = isDark ? '#e2e8f0' : '#475569';
  const [currentTab, setCurrentTab] = useState(0);

  // Data Master Radio
  const [radios, setRadios] = useState<Radio[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({ total: 0, terpasang: 0, standby: 0, rusak: 0 });

  // Data Unit Kendaraan untuk Dropdown
  const [vehicleUnits, setVehicleUnits] = useState<VehicleUnit[]>([]);

  // Alert State
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal Tambah / Edit Radio
  const [openModal, setOpenModal] = useState(false);
  const [editingRadio, setEditingRadio] = useState<Radio | null>(null);
  const [formSerial, setFormSerial] = useState('');
  const [formBrand, setFormBrand] = useState('Motorola');
  const [formModelType, setFormModelType] = useState('GM338');
  const [formStatus, setFormStatus] = useState<string>('Standby');
  const [formUnitNumber, setFormUnitNumber] = useState<string>('');
  const [formNotes, setFormNotes] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal Preview Foto
  const [previewPhoto, setPreviewPhoto] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: '',
    title: '',
  });

  // User yang sedang login (Teknisi)
  const userJson = localStorage.getItem('taurus_user');
  const currentUser = userJson ? JSON.parse(userJson) : null;
  const currentUserName = currentUser
    ? (currentUser.name ? `${currentUser.name} (@${currentUser.username})` : currentUser.username)
    : 'Teknisi';
  const isClient = currentUser?.role === 'client';

  // Modal Pindah Radio Cepat
  const [openMoveModal, setOpenMoveModal] = useState(false);
  const [selectedRadioForMove, setSelectedRadioForMove] = useState<Radio | null>(null);
  const [moveTargetUnit, setMoveTargetUnit] = useState<string>('');
  const [movePerformedBy, setMovePerformedBy] = useState(currentUserName);
  const [moveNotes, setMoveNotes] = useState('');
  const [moveSubmitting, setMoveSubmitting] = useState(false);

  // Tab Tracking Posisi Radio
  const [trackSerialInput, setTrackSerialInput] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<{
    radio: Radio;
    current_position: { unit_number: string; is_installed: boolean; status: string; last_updated?: string };
    total_transfers: number;
    movements: RadioMovement[];
  } | null>(null);

  const handleTrackSerial = async (serial: string) => {
    if (!serial || !serial.trim()) return;
    try {
      setTrackLoading(true);
      const res = await api.get(`/radios/track/${encodeURIComponent(serial.trim().toUpperCase())}`);
      setTrackingResult(res.data);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || `Gagal melacak radio dengan serial "${serial}"`,
      });
      setTrackingResult(null);
    } finally {
      setTrackLoading(false);
    }
  };

  const handleQuickTrack = (serial: string) => {
    setTrackSerialInput(serial);
    setCurrentTab(2);
    handleTrackSerial(serial);
  };

  // Tab Riwayat Perpindahan
  const [movements, setMovements] = useState<RadioMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [moveSearch, setMoveSearch] = useState('');
  const [movePage, setMovePage] = useState(1);
  const [moveTotalPages, setMoveTotalPages] = useState(1);

  // Modal Konfirmasi Hapus
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; radio: Radio | null }>({
    open: false,
    radio: null,
  });

  // Ambil data unit kendaraan untuk dropdown
  const fetchVehicleUnits = async () => {
    try {
      const res = await api.get('/units', { params: { all: 'true' } });
      setVehicleUnits(res.data || []);
    } catch (err) {
      console.error('Gagal mengambil data unit kendaraan:', err);
    }
  };

  // Ambil daftar master radio
  const fetchRadios = async (targetPage = page, searchTerm = search, currentStatus = statusFilter) => {
    try {
      setLoading(true);
      const res = await api.get('/radios', {
        params: {
          page: targetPage,
          limit: 25,
          search: searchTerm.trim() || undefined,
          status: currentStatus !== 'all' ? currentStatus : undefined,
        },
      });
      setRadios(res.data.items || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalItems(res.data.total || 0);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal memuat daftar radio',
      });
    } finally {
      setLoading(false);
    }
  };

  // Ambil riwayat perpindahan
  const fetchMovements = async (targetPage = movePage, searchTerm = moveSearch) => {
    try {
      setMovementsLoading(true);
      const res = await api.get('/radios/movements', {
        params: {
          page: targetPage,
          limit: 25,
          search: searchTerm.trim() || undefined,
        },
      });
      setMovements(res.data.items || []);
      setMoveTotalPages(res.data.totalPages || 1);
    } catch (err: any) {
      console.error('Gagal memuat riwayat mutasi radio:', err);
    } finally {
      setMovementsLoading(false);
    }
  };

  useEffect(() => {
    fetchRadios(1, '', 'all');
    fetchVehicleUnits();
    fetchMovements(1, '');

    const handleRadioUpdated = () => {
      fetchRadios(page, search, statusFilter);
      fetchMovements(movePage, moveSearch);
      if (trackSerialInput.trim()) {
        handleTrackSerial(trackSerialInput.trim());
      }
    };

    socket.on('radioUpdated', handleRadioUpdated);
    return () => {
      socket.off('radioUpdated', handleRadioUpdated);
    };
  }, []);

  const handleOpenAddModal = () => {
    setEditingRadio(null);
    setFormSerial('');
    setFormBrand('Motorola');
    setFormModelType('GM338');
    setFormStatus('Standby');
    setFormUnitNumber('');
    setFormNotes('');
    setFormPhotoUrl('');
    setOpenModal(true);
  };

  const handleOpenEditModal = (radio: Radio) => {
    setEditingRadio(radio);
    setFormSerial(radio.serial_number);
    setFormBrand(radio.brand || 'Motorola');
    setFormModelType(radio.model_type || 'GM338');
    setFormStatus(radio.status || 'Standby');
    setFormUnitNumber(radio.current_unit_number || '');
    setFormNotes(radio.notes || '');
    setFormPhotoUrl(radio.photo_url || '');
    setOpenModal(true);
  };

  const handleOpenMoveModal = (radio?: Radio) => {
    if (radio) {
      setSelectedRadioForMove(radio);
    } else if (radios.length > 0) {
      setSelectedRadioForMove(radios[0]);
    }
    setMoveTargetUnit('');
    setMovePerformedBy(currentUserName);
    setMoveNotes('');
    setOpenMoveModal(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormPhotoUrl(res.data.url);
      setAlertInfo({ type: 'success', message: 'Foto radio berhasil diunggah' });
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal mengunggah foto radio',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveRadio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSerial.trim()) {
      setAlertInfo({ type: 'error', message: 'Serial number wajib diisi' });
      return;
    }

    try {
      setSubmitting(true);
      if (editingRadio) {
        await api.patch(`/radios/${editingRadio.id}`, {
          serial_number: formSerial.trim().toUpperCase(),
          brand: formBrand,
          model_type: formModelType,
          status: formStatus,
          notes: formNotes,
          photo_url: formPhotoUrl || null,
        });
        setAlertInfo({ type: 'success', message: 'Data radio berhasil diperbarui' });
      } else {
        await api.post('/radios', {
          serial_number: formSerial.trim().toUpperCase(),
          brand: formBrand,
          model_type: formModelType,
          status: formUnitNumber ? 'Terpasang' : formStatus,
          current_unit_number: formUnitNumber || null,
          notes: formNotes,
          photo_url: formPhotoUrl || null,
        });
        setAlertInfo({ type: 'success', message: 'Radio baru berhasil ditambahkan' });
      }
      setOpenModal(false);
      fetchRadios(page, search, statusFilter);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menyimpan data radio',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessMoveRadio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRadioForMove) {
      setAlertInfo({ type: 'error', message: 'Pilih radio yang akan dipindahkan' });
      return;
    }

    try {
      setMoveSubmitting(true);
      const res = await api.post('/radios/move', {
        radio_id: selectedRadioForMove.id,
        serial_number: selectedRadioForMove.serial_number,
        to_unit_number: moveTargetUnit === 'STANDBY' ? null : moveTargetUnit,
        performed_by: movePerformedBy.trim() || currentUserName,
        notes: moveNotes.trim() || undefined,
      });

      setAlertInfo({ type: 'success', message: res.data.message || 'Radio berhasil dipindahkan' });
      setOpenMoveModal(false);
      fetchRadios(page, search, statusFilter);
      fetchMovements(1, '');
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal memproses pemindahan radio',
      });
    } finally {
      setMoveSubmitting(false);
    }
  };

  const handleDeleteRadio = async () => {
    if (!deleteDialog.radio) return;
    try {
      await api.delete(`/radios/${deleteDialog.radio.id}`);
      setAlertInfo({
        type: 'success',
        message: `Radio ${deleteDialog.radio.serial_number} berhasil dihapus`,
      });
      setDeleteDialog({ open: false, radio: null });
      fetchRadios(page, search, statusFilter);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menghapus radio',
      });
    }
  };

  const getStatusChip = (status: string, unitNumber?: string | null) => {
    if (status === 'Terpasang') {
      return (
        <Chip
          label={`Unit: ${unitNumber || '-'}`}
          size="small"
          sx={{
            bgcolor: 'rgba(46, 125, 50, 0.15)',
            color: '#2e7d32',
            fontWeight: 700,
            border: '1px solid #2e7d32',
          }}
        />
      );
    }
    if (status === 'Standby') {
      return (
        <Chip
          label="Standby"
          size="small"
          sx={{
            bgcolor: 'rgba(2, 136, 209, 0.15)',
            color: '#0288d1',
            fontWeight: 700,
            border: '1px solid #0288d1',
          }}
        />
      );
    }
    if (status === 'Rusak' || status === 'Perbaikan') {
      return (
        <Chip
          label={status}
          size="small"
          sx={{
            bgcolor: 'rgba(211, 47, 47, 0.15)',
            color: '#d32f2f',
            fontWeight: 700,
            border: '1px solid #d32f2f',
          }}
        />
      );
    }
    return <Chip label={status} size="small" />;
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 1.5 } }}>
      {/* Header Banner */}
      <Box sx={{ mb: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.2 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
                border: '1.5px solid #d4af37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)',
              }}
            >
              <RadioIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: textNavy, display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.1rem' }}>
                Manajemen Radio Komunikasi
              </Typography>
              <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b' }}>
                Master data radio, nomor seri, dan mutasi unit kendaraan
              </Typography>
            </Box>
          </Box>
        </Box>

        {!isClient ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<TransferIcon fontSize="small" />}
              onClick={() => handleOpenMoveModal()}
              sx={{
                borderColor: '#d4af37',
                color: '#b45309',
                fontWeight: 700,
                fontSize: '0.78rem',
                py: 0.6,
                px: 1.5,
                '&:hover': {
                  borderColor: '#b45309',
                  bgcolor: 'rgba(212, 175, 55, 0.08)',
                },
              }}
            >
              Pindah Radio
            </Button>

            <Button
              size="small"
              variant="contained"
              color="secondary"
              startIcon={<AddIcon fontSize="small" />}
              onClick={handleOpenAddModal}
              sx={{ fontWeight: 700, fontSize: '0.78rem', py: 0.6, px: 1.5 }}
            >
              Tambah Radio
            </Button>
          </Box>
        ) : (
          <Chip
            label="Akses Klien: Mode Lihat (Read-Only)"
            color="info"
            size="small"
            variant="outlined"
            sx={{ fontWeight: 700, borderColor: '#0284c7', color: '#0369a1', bgcolor: 'rgba(2, 132, 199, 0.08)' }}
          />
        )}
      </Box>

      {/* Alert Notifikasi */}
      {alertInfo && (
        <Alert
          severity={alertInfo.type}
          onClose={() => setAlertInfo(null)}
          sx={{ mb: 2, borderRadius: 1.5, py: 0.5 }}
        >
          {alertInfo.message}
        </Alert>
      )}

      {/* Ringkasan Statistik */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderLeft: '4px solid #1a237e', borderRadius: 1.5 }}>
            <CardContent sx={{ py: 1.2, px: 2, '&:last-child': { pb: 1.2 } }}>
              <Typography variant="caption" sx={{ color: textMuted, fontWeight: 600, fontSize: '0.7rem' }}>
                TOTAL RADIO
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: textNavy, mt: 0.2 }}>
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderLeft: '4px solid #2e7d32', borderRadius: 1.5 }}>
            <CardContent sx={{ py: 1.2, px: 2, '&:last-child': { pb: 1.2 } }}>
              <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem' }}>
                <ActiveIcon sx={{ fontSize: 14 }} /> TERPASANG DI UNIT
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#2e7d32', mt: 0.2 }}>
                {stats.terpasang}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderLeft: '4px solid #0288d1', borderRadius: 1.5 }}>
            <CardContent sx={{ py: 1.2, px: 2, '&:last-child': { pb: 1.2 } }}>
              <Typography variant="caption" sx={{ color: '#0288d1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem' }}>
                <StandbyIcon sx={{ fontSize: 14 }} /> STANDBY / GUDANG
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0288d1', mt: 0.2 }}>
                {stats.standby}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderLeft: '4px solid #d32f2f', borderRadius: 1.5 }}>
            <CardContent sx={{ py: 1.2, px: 2, '&:last-child': { pb: 1.2 } }}>
              <Typography variant="caption" sx={{ color: '#d32f2f', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem' }}>
                <AlertIcon sx={{ fontSize: 14 }} /> RUSAK / PERBAIKAN
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#d32f2f', mt: 0.2 }}>
                {stats.rusak}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Navigasi: Master Radio, Riwayat Mutasi, & Tracking Posisi */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_e, v) => setCurrentTab(v)}
          textColor="secondary"
          indicatorColor="secondary"
        >
          <Tab
            label={`Daftar Radio (${totalItems})`}
            icon={<RadioIcon />}
            iconPosition="start"
            sx={{ fontWeight: 700 }}
          />
          <Tab
            label="Riwayat Mutasi / Perpindahan"
            icon={<HistoryIcon />}
            iconPosition="start"
            sx={{ fontWeight: 700 }}
          />
          <Tab
            label="Tracking Posisi Radio"
            icon={<TrackingIcon />}
            iconPosition="start"
            sx={{ fontWeight: 700 }}
          />
        </Tabs>
      </Box>

      {/* TAB 0: DAFTAR RADIO (CRUD) */}
      {currentTab === 0 && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              bgcolor: '#ffffff',
              p: 2.5,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1.5, width: { xs: '100%', md: 'auto' }, flexGrow: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Cari Serial Number, Nomor Unit, atau Merk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    fetchRadios(1, search, statusFilter);
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearch('');
                          setPage(1);
                          fetchRadios(1, '', statusFilter);
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
              <Button
                variant="contained"
                onClick={() => {
                  setPage(1);
                  fetchRadios(1, search, statusFilter);
                }}
                sx={{ bgcolor: textNavy, '&:hover': { bgcolor: '#0d1642' }, px: 3 }}
              >
                Cari
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, width: { xs: '100%', md: 'auto' } }}>
              <TextField
                select
                size="small"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                  fetchRadios(1, search, e.target.value);
                }}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="all">Semua Status</MenuItem>
                <MenuItem value="Terpasang">Terpasang di Unit</MenuItem>
                <MenuItem value="Standby">Standby / Gudang</MenuItem>
                <MenuItem value="Rusak">Rusak</MenuItem>
                <MenuItem value="Perbaikan">Dalam Perbaikan</MenuItem>
              </TextField>

              <Tooltip title="Muat Ulang">
                <IconButton onClick={() => fetchRadios(page, search, statusFilter)}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, width: 50, textAlign: 'center' }}>NO.</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 70 }}>FOTO</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>SERIAL NUMBER</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>MERK & TIPE</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>STATUS / POSISI UNIT</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>CATATAN</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>TERAKHIR UPDATE</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>AKSI</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={36} />
                      <Typography variant="body2" sx={{ mt: 1, color: textMuted }}>
                        Memuat data radio...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : radios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <RadioIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                      <Typography variant="body1" sx={{ color: textMuted, fontWeight: 600 }}>
                        Tidak ada data radio ditemukan
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        Klik tombol "Tambah Radio" untuk mendaftarkan radio baru
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  radios.map((radio, idx) => (
                    <TableRow key={radio.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell align="center" sx={{ fontWeight: 700, color: textMuted, width: 50 }}>
                        {(page - 1) * 25 + idx + 1}
                      </TableCell>
                      <TableCell>
                        {radio.photo_url ? (
                          <Box
                            component="img"
                            src={radio.photo_url}
                            alt="Foto Radio"
                            onClick={() =>
                              setPreviewPhoto({
                                open: true,
                                url: radio.photo_url!,
                                title: `Foto Radio: ${radio.serial_number} (${radio.brand} ${radio.model_type || ''})`,
                              })
                            }
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 2,
                              objectFit: 'cover',
                              cursor: 'pointer',
                              border: '1.5px solid #d4af37',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              transition: '0.2s',
                              '&:hover': { transform: 'scale(1.1)', boxShadow: '0 4px 12px rgba(212, 175, 55, 0.4)' },
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 2,
                              bgcolor: '#f1f5f9',
                              border: '1px dashed #cbd5e1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94a3b8',
                            }}
                          >
                            <RadioIcon sx={{ fontSize: 22 }} />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: textNavy, fontSize: '0.95rem' }}>
                        {radio.serial_number}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {radio.brand}
                        </Typography>
                        <Typography variant="caption" sx={{ color: textMuted }}>
                          {radio.model_type || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {getStatusChip(radio.status, radio.current_unit_number)}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography variant="body2" sx={{ color: textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {radio.notes || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: textMuted, fontSize: '0.85rem' }}>
                        {radio.updated_at ? new Date(radio.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="Lacak Riwayat Posisi Radio">
                            <IconButton
                              size="small"
                              onClick={() => handleQuickTrack(radio.serial_number)}
                              sx={{
                                color: '#0284c7',
                                bgcolor: 'rgba(2, 132, 199, 0.1)',
                                '&:hover': { bgcolor: 'rgba(2, 132, 199, 0.25)' },
                              }}
                            >
                              <TrackingIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {!isClient && (
                            <>
                              <Tooltip title="Pindah Radio ke Unit Lain">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenMoveModal(radio)}
                                  sx={{
                                    color: '#b45309',
                                    bgcolor: 'rgba(212, 175, 55, 0.1)',
                                    '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.25)' },
                                  }}
                                >
                                  <TransferIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Edit Radio">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleOpenEditModal(radio)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Hapus Radio">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setDeleteDialog({ open: true, radio })}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'center', borderTop: '1px solid #f1f5f9' }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_e, v) => {
                  setPage(v);
                  fetchRadios(v, search, statusFilter);
                }}
                color="primary"
              />
            </Box>
          )}
        </Card>
      )}

      {/* TAB 1: RIWAYAT MUTASI / PERPINDAHAN RADIO */}
      {currentTab === 1 && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              bgcolor: '#ffffff',
              p: 2.5,
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1.5, flexGrow: 1, maxWidth: 500 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Cari Serial Number, Unit Asal/Tujuan, atau Teknisi..."
                value={moveSearch}
                onChange={(e) => setMoveSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setMovePage(1);
                    fetchMovements(1, moveSearch);
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                onClick={() => {
                  setMovePage(1);
                  fetchMovements(1, moveSearch);
                }}
                sx={{ bgcolor: textNavy }}
              >
                Cari
              </Button>
            </Box>

            <Tooltip title="Muat Ulang">
              <IconButton onClick={() => fetchMovements(movePage, moveSearch)}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, width: 50, textAlign: 'center' }}>NO.</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>WAKTU PINDAH</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>SERIAL NUMBER</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>DARI UNIT</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>KE UNIT TUJUAN</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>TEKNISI / PETUGAS</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>ALASAN / CATATAN</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movementsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={36} />
                    </TableCell>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" sx={{ color: textMuted }}>
                        Belum ada riwayat perpindahan radio
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((m, idx) => (
                    <TableRow key={m.id} hover>
                      <TableCell align="center" sx={{ fontWeight: 700, color: textMuted, width: 50 }}>
                        {(movePage - 1) * 25 + idx + 1}
                      </TableCell>
                      <TableCell sx={{ color: textSec, fontSize: '0.85rem' }}>
                        {m.moved_at ? new Date(m.moved_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: textNavy }}>
                        {m.serial_number}
                      </TableCell>
                      <TableCell>
                        {m.from_unit_number ? (
                          <Chip label={`Unit ${m.from_unit_number}`} size="small" variant="outlined" />
                        ) : (
                          <Chip label="Standby / Baru" size="small" sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', color: isDark ? '#ffffff' : undefined }} />
                        )}
                      </TableCell>
                      <TableCell>
                        {m.to_unit_number ? (
                          <Chip label={`Unit ${m.to_unit_number}`} size="small" sx={{ bgcolor: 'rgba(46, 125, 50, 0.15)', color: '#2e7d32', fontWeight: 700 }} />
                        ) : (
                          <Chip label="Dilepas (Standby)" size="small" sx={{ bgcolor: 'rgba(2, 136, 209, 0.15)', color: '#0288d1', fontWeight: 700 }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: isDark ? '#ffffff' : '#334155' }}>
                        {m.performed_by || '-'}
                      </TableCell>
                      <TableCell sx={{ color: textSec }}>
                        {m.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {moveTotalPages > 1 && (
            <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'center', borderTop: '1px solid #f1f5f9' }}>
              <Pagination
                count={moveTotalPages}
                page={movePage}
                onChange={(_e, v) => {
                  setMovePage(v);
                  fetchMovements(v, moveSearch);
                }}
                color="primary"
              />
            </Box>
          )}
        </Card>
      )}

      {/* TAB 2: TRACKING POSISI RADIO */}
      {currentTab === 2 && (
        <Box>
          <Card sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: textNavy, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrackingIcon sx={{ color: '#d97706' }} /> Lacak Posisi Radio Antar-Unit
            </Typography>
            <Typography variant="body2" sx={{ color: textMuted, mb: 2.5 }}>
              Ketik atau pilih nomor seri (Serial Number) radio untuk melacak unit tempat radio aktif terpasang dan riwayat mutasinya.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Autocomplete
                freeSolo
                sx={{ flexGrow: 1, minWidth: 260 }}
                options={radios.map((r) => r.serial_number)}
                value={trackSerialInput}
                onChange={(_e, v) => {
                  setTrackSerialInput(v || '');
                  if (v) handleTrackSerial(v);
                }}
                onInputChange={(_e, v) => setTrackSerialInput(v)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Contoh: 103TNX9918 (Ketik / Pilih Serial Number)"
                    label="Serial Number Radio"
                  />
                )}
              />
              <Button
                variant="contained"
                color="secondary"
                disabled={trackLoading || !trackSerialInput.trim()}
                onClick={() => handleTrackSerial(trackSerialInput)}
                sx={{ px: 3, fontWeight: 700 }}
              >
                {trackLoading ? <CircularProgress size={24} color="inherit" /> : 'Lacak Posisi'}
              </Button>
            </Box>
          </Card>

          {trackingResult && (
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <Box
                sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, #1a237e 0%, #172554 100%)',
                  color: '#ffffff',
                  borderBottom: '3px solid #d4af37',
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', md: 'center' },
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {trackingResult.radio.photo_url && (
                    <Box
                      component="img"
                      src={trackingResult.radio.photo_url}
                      alt="Foto Radio"
                      onClick={() =>
                        setPreviewPhoto({
                          open: true,
                          url: trackingResult.radio.photo_url!,
                          title: `Radio ${trackingResult.radio.serial_number}`,
                        })
                      }
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        objectFit: 'cover',
                        cursor: 'pointer',
                        border: '2px solid #d4af37',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      }}
                    />
                  )}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 1, color: '#fbbf24' }}>
                        {trackingResult.radio.serial_number}
                      </Typography>
                      <Chip
                        label={trackingResult.current_position.status}
                        size="small"
                        sx={{
                          bgcolor: trackingResult.current_position.is_installed ? '#2e7d32' : '#0288d1',
                          color: '#fff',
                          fontWeight: 700,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Merk: <strong>{trackingResult.radio.brand}</strong> • Model: {trackingResult.radio.model_type || '-'}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.12)',
                    px: 3,
                    py: 1.5,
                    borderRadius: 2,
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    textAlign: { xs: 'left', md: 'right' },
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PinIcon fontSize="small" /> POSISI TERKINI
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffffff', mt: 0.2 }}>
                    {trackingResult.current_position.is_installed
                      ? `UNIT ${trackingResult.current_position.unit_number}`
                      : trackingResult.current_position.unit_number}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                    {trackingResult.total_transfers > 0
                      ? `Telah dimutasi sebanyak ${trackingResult.total_transfers} kali`
                      : 'Belum pernah dipindahkan'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ p: { xs: 2.5, md: 4 } }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: textNavy, mb: 3 }}>
                  Jejak Historis Perpindahan Unit
                </Typography>

                {trackingResult.movements.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="body1" sx={{ color: textMuted, fontWeight: 600 }}>
                      Radio ini belum memiliki riwayat mutasi perpindahan.
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      Status saat ini terdaftar langsung saat registrasi awal.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ position: 'relative', pl: { xs: 2, sm: 3 } }}>
                    {trackingResult.movements.map((move, idx) => {
                      const isLatest = idx === 0;
                      return (
                        <Box
                          key={move.id}
                          sx={{
                            position: 'relative',
                            pb: idx === trackingResult.movements.length - 1 ? 0 : 3.5,
                            borderLeft: idx === trackingResult.movements.length - 1 ? 'none' : '2px dashed #cbd5e1',
                            pl: 3,
                          }}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              left: -11,
                              top: 0,
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              bgcolor: isLatest ? '#d97706' : '#94a3b8',
                              border: '3px solid #ffffff',
                              boxShadow: isLatest ? '0 0 10px rgba(217, 119, 6, 0.6)' : 'none',
                            }}
                          />

                          <Card
                            sx={{
                              flexGrow: 1,
                              p: 2,
                              borderRadius: 2,
                              border: isLatest ? '1.5px solid #d97706' : '1px solid #e2e8f0',
                              bgcolor: isLatest ? 'rgba(217, 119, 6, 0.04)' : '#ffffff',
                            }}
                          >
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {move.from_unit_number ? (
                                  <Chip label={`Unit ${move.from_unit_number}`} size="small" variant="outlined" />
                                ) : (
                                  <Chip label="Standby / Gudang" size="small" sx={{ bgcolor: '#e2e8f0' }} />
                                )}

                                <ArrowIcon fontSize="small" sx={{ color: '#d97706' }} />

                                {move.to_unit_number ? (
                                  <Chip
                                    label={`Unit ${move.to_unit_number}`}
                                    size="small"
                                    sx={{ bgcolor: 'rgba(46, 125, 50, 0.15)', color: '#2e7d32', fontWeight: 800 }}
                                  />
                                ) : (
                                  <Chip
                                    label="Dilepas ke Standby"
                                    size="small"
                                    sx={{ bgcolor: 'rgba(2, 136, 209, 0.15)', color: '#0288d1', fontWeight: 800 }}
                                  />
                                )}

                                {isLatest && (
                                  <Chip label="POSISI SEKARANG" size="small" sx={{ bgcolor: '#d97706', color: '#fff', fontWeight: 700 }} />
                                )}
                              </Box>

                              <Typography variant="caption" sx={{ color: textMuted, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <DateIcon sx={{ fontSize: 15 }} />
                                {move.moved_at ? new Date(move.moved_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                              </Typography>
                            </Box>

                            <Divider sx={{ my: 1, borderColor: '#f1f5f9' }} />

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ color: isDark ? '#ffffff' : '#334155' }}>
                                <strong>Keterangan:</strong> {move.notes || 'Pemindahan unit'}
                              </Typography>
                              <Typography variant="caption" sx={{ color: textMuted, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PersonIcon sx={{ fontSize: 15 }} /> Teknisi: <strong>{move.performed_by}</strong>
                              </Typography>
                            </Box>
                          </Card>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            </Card>
          )}
        </Box>
      )}

      {/* DIALOG 1: TAMBAH / EDIT MASTER RADIO */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveRadio}>
          <DialogTitle sx={{ fontWeight: 800, color: textNavy, borderBottom: '1px solid #e2e8f0', pb: 2 }}>
            {editingRadio ? `Edit Data Radio (${editingRadio.serial_number})` : 'Tambah Master Radio Baru'}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <TextField
                label="Nomor Seri (Serial Number)"
                required
                fullWidth
                value={formSerial}
                onChange={(e) => setFormSerial(e.target.value.toUpperCase())}
                placeholder="Contoh: 103TNX9918"
                helperText="Nomor seri unik yang tertera pada unit radio"
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Merk Radio"
                    fullWidth
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="Contoh: Motorola"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Tipe / Model"
                    fullWidth
                    value={formModelType}
                    onChange={(e) => setFormModelType(e.target.value)}
                    placeholder="Contoh: GM338"
                  />
                </Grid>
              </Grid>

              {!editingRadio && (
                <Autocomplete
                  freeSolo
                  options={vehicleUnits.map((u) => u.unit_number)}
                  value={formUnitNumber}
                  onChange={(_e, newValue) => setFormUnitNumber(newValue || '')}
                  onInputChange={(_e, newInputValue) => setFormUnitNumber(newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Nomor Unit Kendaraan (Kosongkan jika Standby)"
                      placeholder="Pilih atau ketik nomor unit (e.g. 844)"
                      helperText="Jika diisi, status radio otomatis menjadi 'Terpasang'"
                    />
                  )}
                />
              )}

              {editingRadio && (
                <TextField
                  select
                  label="Status Radio"
                  fullWidth
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                >
                  <MenuItem value="Terpasang">Terpasang di Unit</MenuItem>
                  <MenuItem value="Standby">Standby / Gudang</MenuItem>
                  <MenuItem value="Rusak">Rusak</MenuItem>
                  <MenuItem value="Perbaikan">Dalam Perbaikan</MenuItem>
                </TextField>
              )}

              <TextField
                label="Catatan / Keterangan"
                fullWidth
                multiline
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Kondisi, riwayat kelengkapan, dll..."
              />

              {/* Upload Foto Radio */}
              <Box sx={{ border: '1px dashed #cbd5e1', borderRadius: 2, p: 2, textAlign: 'center', bgcolor: '#f8fafc' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: textSec, display: 'block', mb: 1.5 }}>
                  FOTO UNIT RADIO
                </Typography>
                {formPhotoUrl ? (
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Box
                      component="img"
                      src={formPhotoUrl}
                      alt="Foto Radio"
                      sx={{ width: 160, height: 120, borderRadius: 2, objectFit: 'cover', border: '2px solid #d4af37', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setFormPhotoUrl('')}
                      sx={{ position: 'absolute', top: -10, right: -10, bgcolor: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={uploadingPhoto ? <CircularProgress size={18} /> : <CameraIcon />}
                      disabled={uploadingPhoto}
                      sx={{ borderColor: '#d4af37', color: '#b45309', fontWeight: 700 }}
                    >
                      {uploadingPhoto ? 'Mengunggah Foto...' : 'Unggah / Ambil Foto Radio'}
                      <input type="file" accept="image/*" capture="environment" hidden onChange={handlePhotoUpload} />
                    </Button>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      Format: JPG, PNG, WEBP (Maksimal 15 MB)
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e2e8f0' }}>
            <Button onClick={() => setOpenModal(false)} color="inherit">
              Batal
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="secondary"
              disabled={submitting}
              sx={{ fontWeight: 700 }}
            >
              {submitting ? 'Menyimpan...' : 'Simpan Radio'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG 2: SUB-MENU PINDAH RADIO (MUTASI UNIT) */}
      <Dialog open={openMoveModal} onClose={() => setOpenMoveModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleProcessMoveRadio}>
          <DialogTitle sx={{ fontWeight: 800, color: textNavy, borderBottom: '1px solid #e2e8f0', pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TransferIcon sx={{ color: '#d97706' }} /> Mutasi & Pindah Radio
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              {/* Radio Selector */}
              <Autocomplete
                options={radios}
                getOptionLabel={(r) => `${r.serial_number} - ${r.brand} ${r.model_type || ''} (${r.current_unit_number ? `Unit ${r.current_unit_number}` : 'Standby'})`}
                value={selectedRadioForMove}
                onChange={(_e, newValue) => setSelectedRadioForMove(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Pilih Radio (Serial Number)"
                    required
                    helperText="Pilih radio yang akan dipindahkan posisinya"
                  />
                )}
              />

              {selectedRadioForMove && (
                <Card sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: textMuted, fontWeight: 600, display: 'block' }}>
                    POSISI RADIO SAAT INI:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800, color: textNavy, mt: 0.5 }}>
                    {selectedRadioForMove.current_unit_number
                      ? `Terpasang di Unit: ${selectedRadioForMove.current_unit_number}`
                      : 'Status: Standby / Tersedia di Gudang'}
                  </Typography>
                </Card>
              )}

              {/* Target Unit Selector */}
              <Autocomplete
                freeSolo
                options={['STANDBY', ...vehicleUnits.map((u) => u.unit_number)]}
                value={moveTargetUnit}
                onChange={(_e, newValue) => setMoveTargetUnit(newValue || '')}
                onInputChange={(_e, newInputValue) => setMoveTargetUnit(newInputValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Pindah ke Nomor Unit Berapa?"
                    required
                    placeholder="Pilih atau ketik Nomor Unit (atau STANDBY untuk lepas)"
                    helperText="Pilih nomor unit kendaraan tujuan, atau ketik 'STANDBY' untuk melepas radio ke gudang"
                  />
                )}
              />

              <TextField
                label="Nama Teknisi / Petugas Pemindah"
                fullWidth
                value={movePerformedBy || currentUserName}
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: '#d97706' }} />
                    </InputAdornment>
                  ),
                }}
                helperText="Otomatis diambil dari akun yang sedang login saat ini"
                sx={{
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                  '& .MuiInputBase-input': { fontWeight: 700, color: isDark ? '#ffffff' : '#1e293b' },
                }}
              />

              <TextField
                label="Alasan Pemindahan / Catatan"
                fullWidth
                multiline
                rows={2}
                value={moveNotes}
                onChange={(e) => setMoveNotes(e.target.value)}
                placeholder="Contoh: Penggantian radio rusak, pemindahan unit kerja..."
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e2e8f0' }}>
            <Button onClick={() => setOpenMoveModal(false)} color="inherit">
              Batal
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="secondary"
              disabled={moveSubmitting || !selectedRadioForMove || !moveTargetUnit}
              sx={{ fontWeight: 700 }}
            >
              {moveSubmitting ? 'Memproses...' : 'Konfirmasi Pindah Radio'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG 3: KONFIRMASI HAPUS */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, radio: null })}>
        <DialogTitle sx={{ fontWeight: 700, color: '#d32f2f' }}>Hapus Radio?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Apakah Anda yakin ingin menghapus radio dengan Serial Number{' '}
            <strong>"{deleteDialog.radio?.serial_number}"</strong>? Tindakan ini tidak dapat dibatalkan.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, radio: null })} color="inherit">
            Batal
          </Button>
          <Button onClick={handleDeleteRadio} color="error" variant="contained">
            Hapus
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 4: PREVIEW FOTO */}
      <Dialog open={previewPhoto.open} onClose={() => setPreviewPhoto({ open: false, url: '', title: '' })} maxWidth="md">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: textNavy }}>
          {previewPhoto.title}
          <IconButton onClick={() => setPreviewPhoto({ open: false, url: '', title: '' })}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2, textAlign: 'center', bgcolor: '#0f172a' }}>
          <Box
            component="img"
            src={previewPhoto.url}
            alt="Preview Foto"
            sx={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 2, objectFit: 'contain' }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default RadioManagement;
