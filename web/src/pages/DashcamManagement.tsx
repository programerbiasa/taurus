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
  FormControlLabel,
  Checkbox,
  FormGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Videocam as DashcamIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  CompareArrows as TransferIcon,
  Timeline as TrackingIcon,
  CheckCircle as ActiveIcon,
  Inventory as StandbyIcon,
  Warning as AlertIcon,
  Place as PinIcon,
  ArrowForward as ArrowIcon,
  Person as PersonIcon,
  Event as DateIcon,
  PhotoCamera as CameraIcon,
  Close as CloseIcon,
  Storefront as VendorIcon,
  SignalCellularAlt as SignalIcon,
  FlashOn as PowerIcon,
  GpsFixed as GpsIcon,
  Wifi as WifiIcon,
  FileUpload as UploadIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  FileDownload as ExcelIcon,
  Description as TemplateIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import api from '../api';
import socket from '../socket';
import { Dashcam, DashcamMovement, VehicleUnit, DashcamBrand, InternetProvider } from '../types';
import { useAppTheme } from '../ThemeContext';

export const DashcamManagement: React.FC = () => {
  const { mode } = useAppTheme();
  const isDark = mode === 'dark';
  const textNavy = isDark ? '#ffd600' : '#1a237e';
  const textMuted = isDark ? '#cbd5e1' : '#64748b';
  const textSec = isDark ? '#e2e8f0' : '#475569';
  const [currentTab, setCurrentTab] = useState(0);

  // Data Master Dascam
  const [dashcams, setDashcams] = useState<Dashcam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({ total: 0, terpasang: 0, standby: 0, rusak: 0 });

  // Data Unit Kendaraan
  const [vehicleUnits, setVehicleUnits] = useState<VehicleUnit[]>([]);

  // Data Master Merk & Vendor Dascam
  const [brands, setBrands] = useState<DashcamBrand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);

  // Data Master Provider Internet
  const [providers, setProviders] = useState<InternetProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);

  // Modal Tambah / Edit Provider
  const [openProviderModal, setOpenProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<InternetProvider | null>(null);
  const [formProviderName, setFormProviderName] = useState('');
  const [formProviderType, setFormProviderType] = useState('Cellular / GSM');
  const [formProviderContact, setFormProviderContact] = useState('');
  const [formProviderPhone, setFormProviderPhone] = useState('');
  const [formProviderDesc, setFormProviderDesc] = useState('');
  const [providerSubmitting, setProviderSubmitting] = useState(false);

  // Modal Hapus Provider
  const [deleteProviderDialog, setDeleteProviderDialog] = useState<{ open: boolean; provider: InternetProvider | null }>({
    open: false,
    provider: null,
  });

  // Alert State
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal Tambah / Edit Dascam
  const [openModal, setOpenModal] = useState(false);
  const [editingDashcam, setEditingDashcam] = useState<Dashcam | null>(null);
  const [formSerial, setFormSerial] = useState('');
  const [formBrand, setFormBrand] = useState('Hikvision');
  const [formModelType, setFormModelType] = useState('FHD 1080p');
  const [formStatus, setFormStatus] = useState<string>('Standby');
  const [formUnitNumber, setFormUnitNumber] = useState<string>('');
  const [formSdCard, setFormSdCard] = useState('64GB');
  const [formInternetProvider, setFormInternetProvider] = useState('Telkomsel');
  const [formSimCard, setFormSimCard] = useState('');
  const [formElectrical, setFormElectrical] = useState('Baik');
  const [formGps, setFormGps] = useState('Baik');
  const [formCameraStatus, setFormCameraStatus] = useState('Aktif');
  const [formHasFrontCam, setFormHasFrontCam] = useState(true);
  const [formHasCabinCam, setFormHasCabinCam] = useState(false);
  const [formHasFatigueCam, setFormHasFatigueCam] = useState(false);
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

  // Modal Pindah Dascam
  const [openMoveModal, setOpenMoveModal] = useState(false);
  const [selectedDashcamForMove, setSelectedDashcamForMove] = useState<Dashcam | null>(null);
  const [moveTargetUnit, setMoveTargetUnit] = useState<string>('');
  const [movePerformedBy, setMovePerformedBy] = useState(currentUserName);
  const [moveNotes, setMoveNotes] = useState('');
  const [moveSubmitting, setMoveSubmitting] = useState(false);

  // Modal Tambah / Edit Merk Vendor
  const [openBrandModal, setOpenBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<DashcamBrand | null>(null);
  const [formBrandName, setFormBrandName] = useState('');
  const [formVendorName, setFormVendorName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBrandDesc, setFormBrandDesc] = useState('');
  const [brandSubmitting, setBrandSubmitting] = useState(false);

  // Modal Konfirmasi Hapus Merk
  const [deleteBrandDialog, setDeleteBrandDialog] = useState<{ open: boolean; brand: DashcamBrand | null }>({
    open: false,
    brand: null,
  });

  // Tab Tracking Posisi Dascam
  const [trackSerialInput, setTrackSerialInput] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<{
    dashcam: Dashcam;
    current_position: { unit_number: string; is_installed: boolean; status: string; last_updated?: string };
    total_transfers: number;
    movements: DashcamMovement[];
  } | null>(null);

  // Global Movements Log
  const [movements, setMovements] = useState<DashcamMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [moveSearch, setMoveSearch] = useState('');
  const [movePage, setMovePage] = useState(1);
  const [moveTotalPages, setMoveTotalPages] = useState(1);

  // Modal Konfirmasi Hapus Dascam
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; dashcam: Dashcam | null }>({
    open: false,
    dashcam: null,
  });

  // Modal & State Import Excel Dascam
  const [importModal, setImportModal] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const fetchVehicleUnits = async () => {
    try {
      const res = await api.get('/units', { params: { all: 'true' } });
      setVehicleUnits(res.data || []);
    } catch (err) {
      console.error('Gagal mengambil unit kendaraan:', err);
    }
  };

  const fetchBrands = async () => {
    try {
      setBrandsLoading(true);
      const res = await api.get('/dashcam-brands');
      setBrands(res.data || []);
    } catch (err) {
      console.error('Gagal mengambil daftar merk/vendor dascam:', err);
    } finally {
      setBrandsLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      setProvidersLoading(true);
      const res = await api.get('/internet-providers');
      setProviders(res.data || []);
    } catch (err) {
      console.error('Gagal mengambil daftar provider internet:', err);
    } finally {
      setProvidersLoading(false);
    }
  };

  const fetchDashcams = async (targetPage = page, searchTerm = search, currentStatus = statusFilter) => {
    try {
      setLoading(true);
      const res = await api.get('/dashcams', {
        params: {
          page: targetPage,
          limit: 25,
          search: searchTerm.trim() || undefined,
          status: currentStatus !== 'all' ? currentStatus : undefined,
        },
      });
      setDashcams(res.data.items || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalItems(res.data.total || 0);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal memuat master dascam',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async (targetPage = movePage, searchTerm = moveSearch) => {
    try {
      setMovementsLoading(true);
      const res = await api.get('/dashcams/movements', {
        params: {
          page: targetPage,
          limit: 25,
          search: searchTerm.trim() || undefined,
        },
      });
      setMovements(res.data.items || []);
      setMoveTotalPages(res.data.totalPages || 1);
    } catch (err: any) {
      console.error('Gagal memuat riwayat mutasi dascam:', err);
    } finally {
      setMovementsLoading(false);
    }
  };

  const handleTrackSerial = async (serial: string) => {
    if (!serial || !serial.trim()) {
      setAlertInfo({ type: 'error', message: 'Masukkan serial number untuk melacak' });
      return;
    }
    try {
      setTrackLoading(true);
      setAlertInfo(null);
      const res = await api.get(`/dashcams/track/${encodeURIComponent(serial.trim())}`);
      setTrackingResult(res.data);
    } catch (err: any) {
      setTrackingResult(null);
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || `Dascam dengan SN "${serial}" tidak ditemukan`,
      });
    } finally {
      setTrackLoading(false);
    }
  };

  useEffect(() => {
    fetchDashcams(1, '', 'all');
    fetchVehicleUnits();
    fetchBrands();
    fetchProviders();
    fetchMovements(1, '');

    const handleDashcamUpdated = () => {
      fetchDashcams(page, search, statusFilter);
      fetchMovements(movePage, moveSearch);
      if (trackSerialInput.trim()) {
        handleTrackSerial(trackSerialInput.trim());
      }
    };

    socket.on('dashcamUpdated', handleDashcamUpdated);
    return () => {
      socket.off('dashcamUpdated', handleDashcamUpdated);
    };
  }, []);

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
      setAlertInfo({ type: 'success', message: 'Foto dascam berhasil diunggah' });
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal mengunggah foto dascam',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingDashcam(null);
    setFormSerial('');
    setFormBrand(brands.length > 0 ? brands[0].name : 'Hikvision');
    setFormModelType('FHD 1080p');
    setFormStatus('Standby');
    setFormUnitNumber('');
    setFormSdCard('64GB');
    setFormInternetProvider('Telkomsel');
    setFormSimCard('');
    setFormElectrical('Baik');
    setFormGps('Baik');
    setFormCameraStatus('Aktif');
    setFormHasFrontCam(true);
    setFormHasCabinCam(false);
    setFormHasFatigueCam(false);
    setFormNotes('');
    setFormPhotoUrl('');
    setOpenModal(true);
  };

  const handleOpenEditModal = (dashcam: Dashcam) => {
    setEditingDashcam(dashcam);
    setFormSerial(dashcam.serial_number);
    setFormBrand(dashcam.brand || 'Hikvision');
    setFormModelType(dashcam.model_type || 'FHD 1080p');
    setFormStatus(dashcam.status || 'Standby');
    setFormUnitNumber(dashcam.current_unit_number || '');
    setFormSdCard(dashcam.sd_card_capacity || '64GB');
    setFormInternetProvider(dashcam.internet_provider || 'Telkomsel');
    setFormSimCard(dashcam.sim_card_number || '');
    setFormElectrical(dashcam.electrical_condition || 'Baik');
    setFormGps(dashcam.gps_condition || 'Baik');
    setFormCameraStatus(dashcam.camera_status || 'Aktif');
    setFormHasFrontCam(dashcam.has_front_camera ?? true);
    setFormHasCabinCam(dashcam.has_cabin_camera ?? false);
    setFormHasFatigueCam(dashcam.has_fatigue_camera ?? false);
    setFormNotes(dashcam.notes || '');
    setFormPhotoUrl(dashcam.photo_url || '');
    setOpenModal(true);
  };

  const handleOpenMoveModal = (dashcam?: Dashcam) => {
    if (dashcam) {
      setSelectedDashcamForMove(dashcam);
    } else if (dashcams.length > 0) {
      setSelectedDashcamForMove(dashcams[0]);
    }
    setMoveTargetUnit('');
    setMovePerformedBy(currentUserName);
    setMoveNotes('');
    setOpenMoveModal(true);
  };

  const handleQuickTrack = (serial: string) => {
    setTrackSerialInput(serial);
    setCurrentTab(2);
    handleTrackSerial(serial);
  };

  // Handler CRUD Merk Vendor
  const handleOpenAddBrand = () => {
    setEditingBrand(null);
    setFormBrandName('');
    setFormVendorName('');
    setFormContactPerson('');
    setFormPhone('');
    setFormBrandDesc('');
    setOpenBrandModal(true);
  };

  const handleOpenEditBrand = (brand: DashcamBrand) => {
    setEditingBrand(brand);
    setFormBrandName(brand.name);
    setFormVendorName(brand.vendor_name || '');
    setFormContactPerson(brand.contact_person || '');
    setFormPhone(brand.phone || '');
    setFormBrandDesc(brand.description || '');
    setOpenBrandModal(true);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBrandName.trim()) {
      setAlertInfo({ type: 'error', message: 'Nama merk wajib diisi' });
      return;
    }
    try {
      setBrandSubmitting(true);
      if (editingBrand) {
        await api.patch(`/dashcam-brands/${editingBrand.id}`, {
          name: formBrandName.trim(),
          vendor_name: formVendorName,
          contact_person: formContactPerson,
          phone: formPhone,
          description: formBrandDesc,
        });
        setAlertInfo({ type: 'success', message: 'Data merk/vendor berhasil diperbarui' });
      } else {
        await api.post('/dashcam-brands', {
          name: formBrandName.trim(),
          vendor_name: formVendorName,
          contact_person: formContactPerson,
          phone: formPhone,
          description: formBrandDesc,
        });
        setAlertInfo({ type: 'success', message: 'Merk/vendor baru berhasil ditambahkan' });
      }
      setOpenBrandModal(false);
      fetchBrands();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menyimpan merk/vendor',
      });
    } finally {
      setBrandSubmitting(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!deleteBrandDialog.brand) return;
    try {
      await api.delete(`/dashcam-brands/${deleteBrandDialog.brand.id}`);
      setAlertInfo({
        type: 'success',
        message: `Merk "${deleteBrandDialog.brand.name}" berhasil dihapus`,
      });
      setDeleteBrandDialog({ open: false, brand: null });
      fetchBrands();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menghapus merk',
      });
    }
  };

  const handleOpenAddProvider = () => {
    setEditingProvider(null);
    setFormProviderName('');
    setFormProviderType('Cellular / GSM');
    setFormProviderContact('');
    setFormProviderPhone('');
    setFormProviderDesc('');
    setOpenProviderModal(true);
  };

  const handleOpenEditProvider = (p: InternetProvider) => {
    setEditingProvider(p);
    setFormProviderName(p.name);
    setFormProviderType(p.type || 'Cellular / GSM');
    setFormProviderContact(p.contact_person || '');
    setFormProviderPhone(p.phone || '');
    setFormProviderDesc(p.description || '');
    setOpenProviderModal(true);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProviderName.trim()) {
      setAlertInfo({ type: 'error', message: 'Nama provider internet wajib diisi' });
      return;
    }
    try {
      setProviderSubmitting(true);
      if (editingProvider) {
        await api.patch(`/internet-providers/${editingProvider.id}`, {
          name: formProviderName.trim(),
          type: formProviderType,
          contact_person: formProviderContact,
          phone: formProviderPhone,
          description: formProviderDesc,
        });
        setAlertInfo({ type: 'success', message: 'Data provider internet berhasil diperbarui' });
      } else {
        await api.post('/internet-providers', {
          name: formProviderName.trim(),
          type: formProviderType,
          contact_person: formProviderContact,
          phone: formProviderPhone,
          description: formProviderDesc,
        });
        setAlertInfo({ type: 'success', message: 'Provider internet baru berhasil ditambahkan' });
      }
      setOpenProviderModal(false);
      fetchProviders();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menyimpan provider internet',
      });
    } finally {
      setProviderSubmitting(false);
    }
  };

  const handleDeleteProvider = async () => {
    if (!deleteProviderDialog.provider) return;
    try {
      await api.delete(`/internet-providers/${deleteProviderDialog.provider.id}`);
      setAlertInfo({
        type: 'success',
        message: `Provider "${deleteProviderDialog.provider.name}" berhasil dihapus`,
      });
      setDeleteProviderDialog({ open: false, provider: null });
      fetchProviders();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menghapus provider internet',
      });
    }
  };

  const handleSaveDashcam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSerial.trim()) {
      setAlertInfo({ type: 'error', message: 'Serial number wajib diisi' });
      return;
    }

    try {
      setSubmitting(true);
      if (editingDashcam) {
        await api.patch(`/dashcams/${editingDashcam.id}`, {
          serial_number: formSerial.trim().toUpperCase(),
          brand: formBrand,
          model_type: formModelType,
          status: formStatus,
          sd_card_capacity: formSdCard,
          internet_provider: formInternetProvider,
          sim_card_number: formSimCard,
          electrical_condition: formElectrical,
          gps_condition: formGps,
          camera_status: formCameraStatus,
          has_front_camera: formHasFrontCam,
          has_cabin_camera: formHasCabinCam,
          has_fatigue_camera: formHasFatigueCam,
          notes: formNotes,
          photo_url: formPhotoUrl || null,
        });
        setAlertInfo({ type: 'success', message: 'Data dascam berhasil diperbarui' });
      } else {
        await api.post('/dashcams', {
          serial_number: formSerial.trim().toUpperCase(),
          brand: formBrand,
          model_type: formModelType,
          status: formUnitNumber ? 'Terpasang' : formStatus,
          current_unit_number: formUnitNumber || null,
          sd_card_capacity: formSdCard,
          internet_provider: formInternetProvider,
          sim_card_number: formSimCard,
          electrical_condition: formElectrical,
          gps_condition: formGps,
          camera_status: formCameraStatus,
          has_front_camera: formHasFrontCam,
          has_cabin_camera: formHasCabinCam,
          has_fatigue_camera: formHasFatigueCam,
          notes: formNotes,
          photo_url: formPhotoUrl || null,
        });
        setAlertInfo({ type: 'success', message: 'Dascam baru berhasil ditambahkan' });
      }
      setOpenModal(false);
      fetchDashcams(page, search, statusFilter);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menyimpan data dascam',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessMoveDashcam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDashcamForMove) {
      setAlertInfo({ type: 'error', message: 'Pilih dascam yang akan dipindahkan' });
      return;
    }

    try {
      setMoveSubmitting(true);
      const res = await api.post('/dashcams/move', {
        dashcam_id: selectedDashcamForMove.id,
        serial_number: selectedDashcamForMove.serial_number,
        to_unit_number: moveTargetUnit === 'STANDBY' ? null : moveTargetUnit,
        performed_by: movePerformedBy.trim() || currentUserName,
        notes: moveNotes.trim() || undefined,
      });

      setAlertInfo({ type: 'success', message: res.data.message || 'Dascam berhasil dipindahkan' });
      setOpenMoveModal(false);
      fetchDashcams(page, search, statusFilter);
      fetchMovements(1, '');
      if (trackSerialInput === selectedDashcamForMove.serial_number) {
        handleTrackSerial(selectedDashcamForMove.serial_number);
      }
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal memproses pemindahan dascam',
      });
    } finally {
      setMoveSubmitting(false);
    }
  };

  const handleDeleteDashcam = async () => {
    if (!deleteDialog.dashcam) return;
    try {
      await api.delete(`/dashcams/${deleteDialog.dashcam.id}`);
      setAlertInfo({
        type: 'success',
        message: `Dascam ${deleteDialog.dashcam.serial_number} berhasil dihapus`,
      });
      setDeleteDialog({ open: false, dashcam: null });
      fetchDashcams(page, search, statusFilter);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menghapus dascam',
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
          label="Standby / Gudang"
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
  };

  // Download Template Excel Master Dascam
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Template Dascam
    const tplData: any[][] = [
      ['', '', '', 'PT LANCAR JAYA MITRA ABADI', '', '', '', '', '', '', '', '', '', '', '', 'SISTEM TAURUS'],
      ['', '', '', 'TEMPLATE IMPORT MASTER DATA DASCAM (DASHBOARD CAMERA)', '', '', '', '', '', '', '', '', '', '', '', 'REV 01, 2025'],
      [],
      [
        'NO.',
        'SERIAL NUMBER *',
        'MERK / BRAND',
        'TIPE / MODEL',
        'STATUS',
        'NOMOR UNIT KENDARAAN',
        'KAPASITAS SD CARD',
        'PROVIDER INTERNET',
        'NOMOR SIM CARD',
        'KONDISI KELISTRIKAN',
        'KONDISI GPS',
        'STATUS KAMERA',
        'KAMERA DEPAN',
        'KAMERA KABIN',
        'KAMERA FATIGUE',
        'CATATAN / KETERANGAN',
      ],
      // Contoh 1: Terpasang di unit 844
      [
        1,
        'HKV-844-01',
        'Hikvision',
        'AE-DI5042-G4',
        'Terpasang',
        '844',
        '128 GB',
        'Telkomsel',
        '081234567891',
        'Baik',
        'Baik',
        'Aktif',
        'Ya',
        'Ya',
        'Ya',
        'Dascam aktif di unit 844',
      ],
      // Contoh 2: Terpasang di unit 847
      [
        2,
        'HKV-847-01',
        'Hikvision',
        'AE-DI5042-G4',
        'Terpasang',
        '847',
        '128 GB',
        'Telkomsel',
        '081234567892',
        'Baik',
        'Baik',
        'Aktif',
        'Ya',
        'Ya',
        'Ya',
        'Dascam aktif di unit 847',
      ],
      // Contoh 3: Standby di gudang IT
      [
        3,
        'HKV-STB-01',
        'Hikvision',
        'FHD 1080p',
        'Standby',
        '',
        '64 GB',
        'Telkomsel',
        '',
        'Baik',
        'Baik',
        'Aktif',
        'Ya',
        'Tidak',
        'Tidak',
        'Unit cadangan di gudang IT',
      ],
      // Baris kosong siap diisi
      [
        4,
        'SN-DASCAM-CONTOH',
        'Hikvision',
        'AE-DI5042-G4',
        'Standby',
        '',
        '128 GB',
        'Telkomsel',
        '',
        'Baik',
        'Baik',
        'Aktif',
        'Ya',
        'Ya',
        'Ya',
        '',
      ],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(tplData);
    ws1['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 14 },
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 30 },
    ];

    // Sheet 2: Petunjuk Pengisian
    const guideData: any[][] = [
      ['PANDUAN & PETUNJUK IMPORT EXCEL MASTER DASCAM'],
      ['SISTEM TAURUS - PT LANCAR JAYA MITRA ABADI'],
      [],
      ['KOLOM / FIELD', 'KEWAJIBAN', 'PETUNJUK PENGISIAN', 'CONTOH NILAI'],
      ['SERIAL NUMBER', 'Wajib', 'Nomor seri unik perangkat dascam. Huruf kapital otomatis.', 'HKV-98234-A'],
      ['MERK / BRAND', 'Opsional', 'Merk dascam. Default: Hikvision bila dikosongkan.', 'Hikvision, 70mai, Blackvue'],
      ['TIPE / MODEL', 'Opsional', 'Model / tipe spesifik dascam.', 'AE-DI5042-G4, FHD 1080p'],
      ['STATUS', 'Opsional', 'Pilihan: Terpasang, Standby, Rusak, Perbaikan. Otomatis "Terpasang" jika nomor unit diisi.', 'Terpasang / Standby'],
      ['NOMOR UNIT KENDARAAN', 'Opsional', 'Nomor lambung unit tempat dascam dipasang. Kosongkan jika berada di gudang.', '844, 847, 850'],
      ['KAPASITAS SD CARD', 'Opsional', 'Kapasitas memori micro SD yang terpasang.', '128 GB, 64 GB, 256 GB'],
      ['PROVIDER INTERNET', 'Opsional', 'Penyedia kartu SIM internet. Default: Telkomsel.', 'Telkomsel, Indosat, XL'],
      ['NOMOR SIM CARD', 'Opsional', 'Nomor kartu seluler SIM card GSM yang terpasang.', '081234567890'],
      ['KONDISI KELISTRIKAN', 'Opsional', 'Pilihan: Baik atau Rusak. Default: Baik.', 'Baik / Rusak'],
      ['KONDISI GPS', 'Opsional', 'Pilihan: Baik atau Rusak. Default: Baik.', 'Baik / Rusak'],
      ['STATUS KAMERA', 'Opsional', 'Pilihan: Aktif atau Tidak Aktif. Default: Aktif.', 'Aktif / Tidak Aktif'],
      ['KAMERA DEPAN/KABIN/FATIGUE', 'Opsional', 'Isi "Ya" atau "Tidak" untuk kelengkapan kamera channel.', 'Ya / Tidak'],
      ['CATATAN', 'Opsional', 'Keterangan tambahan teknis atau kondisi fisik unit.', 'Dascam operasional unit 844'],
      [],
      ['CATATAN IMPORT:'],
      ['1. Jika Serial Number sudah terdaftar, sistem akan memperbarui (update) data dascam tersebut.'],
      ['2. Jika nomor unit diubah, sistem otomatis mencatat riwayat mutasi perpindahan dascam.'],
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(guideData);
    ws2['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 65 }, { wch: 30 }];

    XLSX.utils.book_append_sheet(wb, ws1, 'Template Dascam');
    XLSX.utils.book_append_sheet(wb, ws2, 'Petunjuk Pengisian');

    XLSX.writeFile(wb, 'TEMPLATE_IMPORT_DASCAM.xlsx');
  };

  // Export Data Dascam ke Excel
  const handleExportExcel = async () => {
    try {
      const res = await api.get('/dashcams', { params: { all: true } });
      const items: Dashcam[] = res.data || [];
      const exportData: any[][] = [
        ['', '', '', 'PT LANCAR JAYA MITRA ABADI', '', '', '', '', '', '', '', '', '', '', '', 'SISTEM TAURUS'],
        ['', '', '', 'MASTER DATA DASCAM / DASHBOARD CAMERA', '', '', '', '', '', '', '', '', '', '', '', new Date().toISOString().split('T')[0]],
        [],
        [
          'NO.',
          'SERIAL NUMBER',
          'MERK / BRAND',
          'TIPE / MODEL',
          'STATUS',
          'NOMOR UNIT KENDARAAN',
          'KAPASITAS SD CARD',
          'PROVIDER INTERNET',
          'NOMOR SIM CARD',
          'KONDISI KELISTRIKAN',
          'KONDISI GPS',
          'STATUS KAMERA',
          'KAMERA DEPAN',
          'KAMERA KABIN',
          'KAMERA FATIGUE',
          'CATATAN',
        ],
      ];

      items.forEach((d, idx) => {
        exportData.push([
          idx + 1,
          d.serial_number,
          d.brand,
          d.model_type || '-',
          d.status,
          d.current_unit_number || 'Standby / Gudang',
          d.sd_card_capacity || '-',
          d.internet_provider || 'Telkomsel',
          d.sim_card_number || '-',
          d.electrical_condition || 'Baik',
          d.gps_condition || 'Baik',
          d.camera_status || 'Aktif',
          d.has_front_camera ? 'Ya' : 'Tidak',
          d.has_cabin_camera ? 'Ya' : 'Tidak',
          d.has_fatigue_camera ? 'Ya' : 'Tidak',
          d.notes || '-',
        ]);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 6 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 14 },
        { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 30 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Data Dascam');
      XLSX.writeFile(wb, `DATA_DASCAM_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xlsx`);
    } catch (e) {
      console.error('Gagal export excel dascam:', e);
    }
  };

  // Parser file Excel Dascam
  const handleFileSelect = (file: File) => {
    setImportFile(file);
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        if (!ws) {
          setImportError('Sheet tidak ditemukan dalam file Excel');
          return;
        }

        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        let headerRowIndex = -1;
        let colIndexMap: Record<string, number> = {};

        for (let i = 0; i < Math.min(15, rows.length); i++) {
          const row = rows[i];
          const rowStr = row.map((cell) => String(cell).toLowerCase().trim());
          if (rowStr.some((c) => c.includes('serial') || c.includes('nomor seri') || c === 'sn')) {
            headerRowIndex = i;
            rowStr.forEach((headerText, colIdx) => {
              if (headerText.includes('serial') || headerText.includes('nomor seri') || headerText === 'sn') {
                colIndexMap['serial_number'] = colIdx;
              } else if (headerText.includes('merk') || headerText.includes('brand')) {
                colIndexMap['brand'] = colIdx;
              } else if (headerText.includes('model') || headerText.includes('tipe') || headerText.includes('type')) {
                colIndexMap['model_type'] = colIdx;
              } else if (headerText.includes('status') && !headerText.includes('kamera')) {
                colIndexMap['status'] = colIdx;
              } else if (headerText.includes('unit') || headerText.includes('lambung')) {
                colIndexMap['current_unit_number'] = colIdx;
              } else if (headerText.includes('sd') || headerText.includes('memori') || headerText.includes('kapasitas')) {
                colIndexMap['sd_card_capacity'] = colIdx;
              } else if (headerText.includes('provider') || headerText.includes('operator')) {
                colIndexMap['internet_provider'] = colIdx;
              } else if (headerText.includes('sim') || headerText.includes('kartu')) {
                colIndexMap['sim_card_number'] = colIdx;
              } else if (headerText.includes('listrik') || headerText.includes('power')) {
                colIndexMap['electrical_condition'] = colIdx;
              } else if (headerText.includes('gps')) {
                colIndexMap['gps_condition'] = colIdx;
              } else if (headerText.includes('status kamera') || headerText.includes('kondisi kamera')) {
                colIndexMap['camera_status'] = colIdx;
              } else if (headerText.includes('depan')) {
                colIndexMap['has_front_camera'] = colIdx;
              } else if (headerText.includes('kabin') || headerText.includes('cabin')) {
                colIndexMap['has_cabin_camera'] = colIdx;
              } else if (headerText.includes('fatigue') || headerText.includes('fati')) {
                colIndexMap['has_fatigue_camera'] = colIdx;
              } else if (headerText.includes('catatan') || headerText.includes('notes') || headerText.includes('keterangan')) {
                colIndexMap['notes'] = colIdx;
              }
            });
            break;
          }
        }

        if (headerRowIndex === -1 || colIndexMap['serial_number'] === undefined) {
          colIndexMap = {
            serial_number: 1,
            brand: 2,
            model_type: 3,
            status: 4,
            current_unit_number: 5,
            sd_card_capacity: 6,
            internet_provider: 7,
            sim_card_number: 8,
            electrical_condition: 9,
            gps_condition: 10,
            camera_status: 11,
            has_front_camera: 12,
            has_cabin_camera: 13,
            has_fatigue_camera: 14,
            notes: 15,
          };
          headerRowIndex = 3;
        }

        const parsedItems: any[] = [];
        for (let r = headerRowIndex + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const rawSerial = row[colIndexMap['serial_number']];
          if (!rawSerial) continue;

          const cleanSerial = String(rawSerial).trim().toUpperCase();
          if (
            cleanSerial === '' ||
            cleanSerial.includes('SERIAL') ||
            cleanSerial.includes('CONTOH') ||
            cleanSerial.includes('TOTAL')
          ) {
            continue;
          }

          const rawUnit = colIndexMap['current_unit_number'] !== undefined ? String(row[colIndexMap['current_unit_number']] || '').trim() : '';
          const cleanUnit = rawUnit.replace(/[^a-zA-Z0-9_\-]/g, '');

          const rawStatus = colIndexMap['status'] !== undefined ? String(row[colIndexMap['status']] || '').trim() : '';
          const finalStatus = cleanUnit ? (rawStatus || 'Terpasang') : (rawStatus || 'Standby');

          const isYes = (val: any) => {
            if (typeof val === 'boolean') return val;
            const s = String(val).toLowerCase().trim();
            return s === 'ya' || s === 'yes' || s === '1' || s === 'v' || s === 'true';
          };

          parsedItems.push({
            serial_number: cleanSerial,
            brand: colIndexMap['brand'] !== undefined && row[colIndexMap['brand']] ? String(row[colIndexMap['brand']]).trim() : 'Hikvision',
            model_type: colIndexMap['model_type'] !== undefined && row[colIndexMap['model_type']] ? String(row[colIndexMap['model_type']]).trim() : 'AE-DI5042-G4',
            status: finalStatus,
            current_unit_number: cleanUnit || null,
            sd_card_capacity: colIndexMap['sd_card_capacity'] !== undefined && row[colIndexMap['sd_card_capacity']] ? String(row[colIndexMap['sd_card_capacity']]).trim() : '128 GB',
            internet_provider: colIndexMap['internet_provider'] !== undefined && row[colIndexMap['internet_provider']] ? String(row[colIndexMap['internet_provider']]).trim() : 'Telkomsel',
            sim_card_number: colIndexMap['sim_card_number'] !== undefined && row[colIndexMap['sim_card_number']] ? String(row[colIndexMap['sim_card_number']]).trim() : null,
            electrical_condition: colIndexMap['electrical_condition'] !== undefined && row[colIndexMap['electrical_condition']] ? String(row[colIndexMap['electrical_condition']]).trim() : 'Baik',
            gps_condition: colIndexMap['gps_condition'] !== undefined && row[colIndexMap['gps_condition']] ? String(row[colIndexMap['gps_condition']]).trim() : 'Baik',
            camera_status: colIndexMap['camera_status'] !== undefined && row[colIndexMap['camera_status']] ? String(row[colIndexMap['camera_status']]).trim() : 'Aktif',
            has_front_camera: colIndexMap['has_front_camera'] !== undefined ? isYes(row[colIndexMap['has_front_camera']]) : true,
            has_cabin_camera: colIndexMap['has_cabin_camera'] !== undefined ? isYes(row[colIndexMap['has_cabin_camera']]) : true,
            has_fatigue_camera: colIndexMap['has_fatigue_camera'] !== undefined ? isYes(row[colIndexMap['has_fatigue_camera']]) : true,
            notes: colIndexMap['notes'] !== undefined && row[colIndexMap['notes']] ? String(row[colIndexMap['notes']]).trim() : 'Import Excel',
          });
        }

        if (parsedItems.length === 0) {
          setImportError('Tidak ditemukan baris data dascam yang valid pada file Excel yang dipilih');
          setImportPreview([]);
        } else {
          setImportPreview(parsedItems);
        }
      } catch (err: any) {
        console.error('Error saat membaca excel dascam:', err);
        setImportError('Gagal membaca file Excel: ' + (err.message || 'Format tidak valid'));
        setImportPreview([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Simpan hasil import ke backend
  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    try {
      setImportLoading(true);
      setImportError(null);
      const res = await api.post('/dashcams/bulk', { items: importPreview });
      setAlertInfo({
        type: 'success',
        message: res.data.message || `Berhasil mengimport ${importPreview.length} data dascam`,
      });
      setImportModal(false);
      setImportFile(null);
      setImportPreview([]);
      fetchDashcams(1);
    } catch (err: any) {
      console.error('Gagal import dascam bulk:', err);
      setImportError(err.response?.data?.message || 'Gagal menyimpan data import dascam ke database');
    } finally {
      setImportLoading(false);
    }
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
              <DashcamIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: textNavy, display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.1rem' }}>
                Manajemen Dascam Kendaraan
              </Typography>
              <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b' }}>
                Master dascam, vendor/merk, kondisi kelistrikan, GPS, provider internet, dan pelacakan unit
              </Typography>
            </Box>
          </Box>
        </Box>

        {!isClient ? (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ExcelIcon fontSize="small" />}
              onClick={handleExportExcel}
              sx={{
                borderColor: '#16a34a',
                color: '#16a34a',
                fontWeight: 700,
                fontSize: '0.78rem',
                py: 0.6,
                px: 1.5,
                '&:hover': {
                  borderColor: '#15803d',
                  bgcolor: 'rgba(22, 163, 74, 0.08)',
                },
              }}
            >
              Export Excel (.xlsx)
            </Button>

            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon fontSize="small" />}
              onClick={handleDownloadTemplate}
              sx={{
                borderColor: isDark ? '#10b981' : '#059669',
                color: isDark ? '#10b981' : '#059669',
                fontWeight: 700,
                fontSize: '0.78rem',
                py: 0.6,
                px: 1.5,
                bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ecfdf5',
                '&:hover': {
                  borderColor: isDark ? '#34d399' : '#047857',
                  bgcolor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5',
                },
              }}
            >
              Template Import (.xlsx)
            </Button>

            <Button
              size="small"
              variant="contained"
              startIcon={<UploadIcon fontSize="small" />}
              onClick={() => {
                setImportFile(null);
                setImportPreview([]);
                setImportError(null);
                setImportSuccess(null);
                setImportModal(true);
              }}
              sx={{
                bgcolor: '#0284c7',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.78rem',
                py: 0.6,
                px: 1.5,
                '&:hover': {
                  bgcolor: '#0369a1',
                },
              }}
            >
              Import Excel (.xlsx)
            </Button>

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
              Pindah Dascam
            </Button>

            <Button
              size="small"
              variant="contained"
              color="secondary"
              startIcon={<AddIcon fontSize="small" />}
              onClick={handleOpenAddModal}
              sx={{ fontWeight: 700, fontSize: '0.78rem', py: 0.6, px: 1.5 }}
            >
              Tambah Dascam
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

      {/* Alert */}
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
                TOTAL DASCAM
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_e, v) => setCurrentTab(v)}
          textColor="secondary"
          indicatorColor="secondary"
        >
          <Tab
            label={`Daftar Dascam (${totalItems})`}
            icon={<DashcamIcon />}
            iconPosition="start"
            sx={{ fontWeight: 700 }}
          />
          <Tab
            label="Riwayat Mutasi Antar Unit"
            icon={<TransferIcon />}
            iconPosition="start"
            sx={{ fontWeight: 700 }}
          />
          <Tab
            label="Tracking Posisi Dascam"
            icon={<TrackingIcon />}
            iconPosition="start"
            sx={{ fontWeight: 700 }}
          />
          <Tab
            label={`Master Merk / Vendor (${brands.length})`}
            icon={<VendorIcon />}
            iconPosition="start"
            sx={{ fontWeight: 700 }}
          />
          <Tab
            label={`Provider Internet (${providers.length})`}
            icon={<WifiIcon />}
            iconPosition="start"
            sx={{ fontWeight: 700 }}
          />
        </Tabs>
      </Box>

      {/* TAB 0: DAFTAR DASCAM (CRUD) */}
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
                placeholder="Cari Serial Number, Nomor Unit, Provider, atau Merk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    fetchDashcams(1, search, statusFilter);
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
                          fetchDashcams(1, '', statusFilter);
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
                  fetchDashcams(1, search, statusFilter);
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
                  fetchDashcams(1, search, e.target.value);
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
                <IconButton onClick={() => fetchDashcams(page, search, statusFilter)}>
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
                  <TableCell sx={{ fontWeight: 800 }}>STATUS / UNIT</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>PROVIDER & SIM</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>KONDISI (LISTRIK / GPS / KAMERA)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>TIPE KAMERA</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>AKSI</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={36} />
                      <Typography variant="body2" sx={{ mt: 1, color: textMuted }}>
                        Memuat data dascam...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : dashcams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <DashcamIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                      <Typography variant="body1" sx={{ color: textMuted, fontWeight: 600 }}>
                        Tidak ada data dascam ditemukan
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        Klik tombol "Tambah Dascam" untuk mendaftarkan dascam baru
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  dashcams.map((dashcam, idx) => (
                    <TableRow key={dashcam.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      {/* NO. URUT */}
                      <TableCell align="center" sx={{ fontWeight: 700, color: textMuted, width: 50 }}>
                        {(page - 1) * 25 + idx + 1}
                      </TableCell>
                      {/* FOTO */}
                      <TableCell>
                        {dashcam.photo_url ? (
                          <Box
                            component="img"
                            src={dashcam.photo_url}
                            alt="Foto Dascam"
                            onClick={() =>
                              setPreviewPhoto({
                                open: true,
                                url: dashcam.photo_url!,
                                title: `Foto Dascam: ${dashcam.serial_number} (${dashcam.brand} ${dashcam.model_type || ''})`,
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
                            <DashcamIcon sx={{ fontSize: 22 }} />
                          </Box>
                        )}
                      </TableCell>

                      {/* SERIAL NUMBER */}
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: textNavy, fontSize: '0.92rem' }}>
                        {dashcam.serial_number}
                      </TableCell>

                      {/* MERK & TIPE */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? '#ffffff' : '#1e293b' }}>
                          {dashcam.brand}
                        </Typography>
                        <Typography variant="caption" sx={{ color: textMuted }}>
                          {dashcam.model_type || '-'}
                        </Typography>
                      </TableCell>

                      {/* STATUS / POSISI */}
                      <TableCell>
                        {getStatusChip(dashcam.status, dashcam.current_unit_number)}
                      </TableCell>

                      {/* PROVIDER & SIM */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                          <SignalIcon sx={{ fontSize: 14, color: '#d97706' }} />
                          <Typography variant="body2" sx={{ fontWeight: 700, color: textNavy }}>
                            {dashcam.internet_provider || 'Telkomsel'}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: textMuted, fontFamily: 'monospace' }}>
                          {dashcam.sim_card_number ? `SIM: ${dashcam.sim_card_number}` : 'No SIM terdaftar'}
                        </Typography>
                      </TableCell>

                      {/* KONDISI LISTRIK / GPS / STATUS */}
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PowerIcon sx={{ fontSize: 14, color: dashcam.electrical_condition === 'Baik' ? '#2e7d32' : '#d32f2f' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: dashcam.electrical_condition === 'Baik' ? '#2e7d32' : '#d32f2f' }}>
                              Listrik: {dashcam.electrical_condition || 'Baik'}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <GpsIcon sx={{ fontSize: 14, color: dashcam.gps_condition === 'Baik' ? '#0288d1' : '#d32f2f' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: dashcam.gps_condition === 'Baik' ? '#0288d1' : '#d32f2f' }}>
                              GPS: {dashcam.gps_condition || 'Baik'}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ActiveIcon sx={{ fontSize: 14, color: dashcam.camera_status === 'Aktif' ? '#2e7d32' : '#64748b' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: dashcam.camera_status === 'Aktif' ? '#2e7d32' : '#64748b' }}>
                              Kamera: {dashcam.camera_status || 'Aktif'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* OPSI CENTANG KAMERA */}
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 160 }}>
                          {dashcam.has_front_camera && (
                            <Chip label="Depan" size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700 }} />
                          )}
                          {dashcam.has_cabin_camera && (
                            <Chip label="Kabin" size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700 }} />
                          )}
                          {dashcam.has_fatigue_camera && (
                            <Chip label="Fatigue" size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#fce7f3', color: '#be185d', fontWeight: 700 }} />
                          )}
                          {!dashcam.has_front_camera && !dashcam.has_cabin_camera && !dashcam.has_fatigue_camera && (
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>-</Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* AKSI */}
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="Lacak Riwayat Posisi Dascam">
                            <IconButton
                              size="small"
                              onClick={() => handleQuickTrack(dashcam.serial_number)}
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
                              <Tooltip title="Pindah Dascam ke Unit Lain">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenMoveModal(dashcam)}
                                  sx={{
                                    color: '#b45309',
                                    bgcolor: 'rgba(212, 175, 55, 0.1)',
                                    '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.25)' },
                                  }}
                                >
                                  <TransferIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Edit Dascam">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleOpenEditModal(dashcam)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Hapus Dascam">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setDeleteDialog({ open: true, dashcam })}
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
                  fetchDashcams(v, search, statusFilter);
                }}
                color="primary"
              />
            </Box>
          )}
        </Card>
      )}

      {/* TAB 1: RIWAYAT MUTASI ANTAR UNIT */}
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
                        Belum ada riwayat perpindahan dascam
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

      {/* TAB 2: TRACKING POSISI DASCAM */}
      {currentTab === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: textNavy, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrackingIcon sx={{ color: '#d97706' }} /> Cek & Lacak Posisi Dascam
            </Typography>
            <Typography variant="body2" sx={{ color: textMuted, mb: 2.5 }}>
              Masukkan Serial Number dascam untuk melacak posisi kendaraan saat ini dan jejak mutasi dari awal pemasangan.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, maxWidth: 600 }}>
              <Autocomplete
                freeSolo
                fullWidth
                options={dashcams.map((d) => d.serial_number)}
                value={trackSerialInput}
                onChange={(_e, val) => {
                  setTrackSerialInput(val || '');
                  if (val) handleTrackSerial(val);
                }}
                onInputChange={(_e, val) => setTrackSerialInput(val)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Contoh SN: DC-HIK-9921..."
                    label="Serial Number Dascam"
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
                  {trackingResult.dashcam.photo_url && (
                    <Box
                      component="img"
                      src={trackingResult.dashcam.photo_url}
                      alt="Foto Dascam"
                      onClick={() =>
                        setPreviewPhoto({
                          open: true,
                          url: trackingResult.dashcam.photo_url!,
                          title: `Dascam ${trackingResult.dashcam.serial_number}`,
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
                        {trackingResult.dashcam.serial_number}
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
                      Merk: <strong>{trackingResult.dashcam.brand}</strong> • Model: {trackingResult.dashcam.model_type || '-'} • Provider: <strong>{trackingResult.dashcam.internet_provider || 'Telkomsel'}</strong>
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
                      Dascam ini belum memiliki riwayat mutasi perpindahan.
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
                            display: 'flex',
                            gap: 2,
                            position: 'relative',
                            pb: idx === trackingResult.movements.length - 1 ? 0 : 3.5,
                            borderLeft: idx === trackingResult.movements.length - 1 ? 'none' : '2px solid #e2e8f0',
                            ml: 1.5,
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

      {/* TAB 3: MASTER MERK & VENDOR DASCAM */}
      {currentTab === 3 && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: textNavy }}>
                Master Merk & Vendor Dascam
              </Typography>
              <Typography variant="body2" sx={{ color: textMuted }}>
                Kelola daftar merk dascam, supplier vendor, contact person, dan dukungan garansi
              </Typography>
            </Box>

            {!isClient && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={handleOpenAddBrand}
                sx={{ fontWeight: 700 }}
              >
                Tambah Merk / Vendor
              </Button>
            )}
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? '#0a1220' : '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 800, width: 50, textAlign: 'center', color: isDark ? '#00ff66' : '#334155' }}>NO.</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: isDark ? '#00ff66' : '#334155' }}>NAMA MERK</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: isDark ? '#00ff66' : '#334155' }}>NAMA VENDOR / PT</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: isDark ? '#00ff66' : '#334155' }}>CONTACT PERSON</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: isDark ? '#00ff66' : '#334155' }}>NO. TELEPON / HP</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: isDark ? '#00ff66' : '#334155' }}>KETERANGAN</TableCell>
                  {!isClient && <TableCell align="center" sx={{ fontWeight: 800, color: isDark ? '#00ff66' : '#334155' }}>AKSI</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {brandsLoading ? (
                  <TableRow>
                    <TableCell colSpan={isClient ? 6 : 7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={36} />
                    </TableCell>
                  </TableRow>
                ) : brands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isClient ? 6 : 7} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" sx={{ color: textMuted }}>
                        Belum ada data merk/vendor dascam terdaftar
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  brands.map((b, idx) => (
                    <TableRow key={b.id} hover>
                      <TableCell align="center" sx={{ fontWeight: 700, color: textMuted, width: 50 }}>
                        {idx + 1}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: textNavy }}>
                        {b.name}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {b.vendor_name || '-'}
                      </TableCell>
                      <TableCell>{b.contact_person || '-'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{b.phone || '-'}</TableCell>
                      <TableCell sx={{ color: textMuted }}>{b.description || '-'}</TableCell>
                      {!isClient && (
                        <TableCell align="center">
                          <IconButton size="small" color="primary" onClick={() => handleOpenEditBrand(b)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => setDeleteBrandDialog({ open: true, brand: b })}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* TAB 4: MASTER PROVIDER INTERNET */}
      {currentTab === 4 && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                <WifiIcon color="secondary" /> Master Provider Internet / SIM
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Daftar operator seluler, paket data, dan jenis koneksi internet untuk armada dascam
              </Typography>
            </Box>

            {!isClient && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={handleOpenAddProvider}
                sx={{ fontWeight: 700 }}
              >
                Tambah Provider
              </Button>
            )}
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, width: 50, textAlign: 'center' }}>NO.</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>NAMA PROVIDER</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>TIPE JARINGAN</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>PIC / ACCOUNT MANAGER</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>KONTAK / CS</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>KETERANGAN / PAKET</TableCell>
                  {!isClient && <TableCell align="center" sx={{ fontWeight: 800 }}>AKSI</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {providersLoading ? (
                  <TableRow>
                    <TableCell colSpan={isClient ? 6 : 7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={36} />
                    </TableCell>
                  </TableRow>
                ) : providers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isClient ? 6 : 7} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Belum ada data provider internet terdaftar
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  providers.map((p, idx) => (
                    <TableRow key={p.id} hover>
                      <TableCell align="center" sx={{ fontWeight: 700, color: textMuted, width: 50 }}>
                        {idx + 1}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>
                        {p.name}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={p.type || 'Cellular'}
                          size="small"
                          variant="outlined"
                          color="info"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>{p.contact_person || '-'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{p.phone || '-'}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{p.description || '-'}</TableCell>
                      {!isClient && (
                        <TableCell align="center">
                          <IconButton size="small" color="primary" onClick={() => handleOpenEditProvider(p)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => setDeleteProviderDialog({ open: true, provider: p })}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* DIALOG 1: TAMBAH / EDIT DASCAM */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSaveDashcam}>
          <DialogTitle sx={{ fontWeight: 800, color: textNavy, borderBottom: '1px solid #e2e8f0', pb: 2 }}>
            {editingDashcam ? `Edit Data Dascam (${editingDashcam.serial_number})` : 'Tambah Master Dascam Baru'}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              {/* Row 1: Serial Number & Unit */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Nomor Seri (Serial Number)"
                    required
                    fullWidth
                    value={formSerial}
                    onChange={(e) => setFormSerial(e.target.value.toUpperCase())}
                    placeholder="Contoh: DC-HIK-9921"
                    helperText="Nomor seri unik yang tertera pada unit dascam"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  {editingDashcam ? (
                    <TextField
                      select
                      label="Status Dascam"
                      fullWidth
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                    >
                      <MenuItem value="Terpasang">Terpasang di Unit</MenuItem>
                      <MenuItem value="Standby">Standby / Gudang</MenuItem>
                      <MenuItem value="Rusak">Rusak</MenuItem>
                      <MenuItem value="Perbaikan">Dalam Perbaikan</MenuItem>
                    </TextField>
                  ) : (
                    <Autocomplete
                      freeSolo
                      options={vehicleUnits.map((u) => u.unit_number)}
                      value={formUnitNumber}
                      onChange={(_e, newValue) => setFormUnitNumber(newValue || '')}
                      onInputChange={(_e, newInputValue) => setFormUnitNumber(newInputValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Nomor Unit (Kosongkan jika Standby)"
                          placeholder="Nomor Unit (e.g. 844)"
                          helperText="Jika diisi, status otomatis menjadi Terpasang"
                        />
                      )}
                    />
                  )}
                </Grid>
              </Grid>

              {/* Row 2: Merk / Vendor & Tipe */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={brands.map((b) => b.name)}
                    value={formBrand}
                    onChange={(_e, newVal) => setFormBrand(newVal || 'Hikvision')}
                    onInputChange={(_e, newVal) => setFormBrand(newVal)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Merk / Vendor Dascam"
                        required
                        placeholder="Pilih merk atau ketik baru"
                        helperText="Pilihan diambil dari Master Merk & Vendor"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Tipe / Model"
                    fullWidth
                    value={formModelType}
                    onChange={(e) => setFormModelType(e.target.value)}
                    placeholder="Contoh: FHD 1080p Dual Cam"
                  />
                </Grid>
              </Grid>

              {/* Row 3: Provider Internet, No SIM, SD Card */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Autocomplete
                    freeSolo
                    options={providers.map((p) => p.name)}
                    value={formInternetProvider}
                    onChange={(_e, newVal) => setFormInternetProvider(newVal || 'Telkomsel')}
                    onInputChange={(_e, newVal) => setFormInternetProvider(newVal)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Provider Internet"
                        required
                        placeholder="Pilih provider atau ketik baru"
                        helperText="Pilihan dari Master Provider"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Nomor Kartu SIM / GSM"
                    fullWidth
                    value={formSimCard}
                    onChange={(e) => setFormSimCard(e.target.value)}
                    placeholder="Contoh: 081234567890"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="Kapasitas SD Card"
                    fullWidth
                    value={formSdCard}
                    onChange={(e) => setFormSdCard(e.target.value)}
                  >
                    <MenuItem value="32GB">32 GB</MenuItem>
                    <MenuItem value="64GB">64 GB</MenuItem>
                    <MenuItem value="128GB">128 GB</MenuItem>
                    <MenuItem value="256GB">256 GB</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              {/* Row 4: Kondisi Listrik, Kondisi GPS, Status Kamera */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="Kondisi Listrik"
                    fullWidth
                    value={formElectrical}
                    onChange={(e) => setFormElectrical(e.target.value)}
                  >
                    <MenuItem value="Baik">Baik (Normal)</MenuItem>
                    <MenuItem value="Rusak">Rusak / Tidak Ada Arus</MenuItem>
                    <MenuItem value="Drop">Drop / Tegangan Rendah</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="Kondisi GPS"
                    fullWidth
                    value={formGps}
                    onChange={(e) => setFormGps(e.target.value)}
                  >
                    <MenuItem value="Baik">Baik (Lock Signal)</MenuItem>
                    <MenuItem value="Rusak">Rusak / No Signal</MenuItem>
                    <MenuItem value="Tanpa GPS">Tanpa Modul GPS</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="Status Kamera"
                    fullWidth
                    value={formCameraStatus}
                    onChange={(e) => setFormCameraStatus(e.target.value)}
                  >
                    <MenuItem value="Aktif">Aktif</MenuItem>
                    <MenuItem value="Tidak Aktif">Tidak Aktif</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              {/* Row 5: Opsi Centang Kamera (Kamera Depan, Kabin, Fatigue) */}
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: textNavy, mb: 1 }}>
                  Kelengkapan Sensor & Kamera (Centang yang terpasang):
                </Typography>
                <FormGroup row sx={{ gap: 3 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formHasFrontCam}
                        onChange={(e) => setFormHasFrontCam(e.target.checked)}
                        color="secondary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>Kamera Depan</Typography>
                        <Typography variant="caption" sx={{ color: textMuted }}>Road Facing (Jalan)</Typography>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formHasCabinCam}
                        onChange={(e) => setFormHasCabinCam(e.target.checked)}
                        color="secondary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>Kamera Kabin</Typography>
                        <Typography variant="caption" sx={{ color: textMuted }}>Driver / Kabin Supir</Typography>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formHasFatigueCam}
                        onChange={(e) => setFormHasFatigueCam(e.target.checked)}
                        color="secondary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>Kamera Fatigue</Typography>
                        <Typography variant="caption" sx={{ color: textMuted }}>DSM / Sensor Mengantuk</Typography>
                      </Box>
                    }
                  />
                </FormGroup>
              </Box>

              {/* Row 6: Upload Foto Dascam */}
              <Box sx={{ border: isDark ? '1px dashed #334155' : '1px dashed #cbd5e1', borderRadius: 2, p: 2, textAlign: 'center', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: textSec, display: 'block', mb: 1.5 }}>
                  FOTO UNIT DASCAM
                </Typography>
                {formPhotoUrl ? (
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Box
                      component="img"
                      src={formPhotoUrl}
                      alt="Foto Dascam"
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
                      {uploadingPhoto ? 'Mengunggah Foto...' : 'Unggah / Ambil Foto Dascam'}
                      <input type="file" accept="image/*" capture="environment" hidden onChange={handlePhotoUpload} />
                    </Button>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      Format: JPG, PNG, WEBP (Maksimal 15 MB)
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Catatan */}
              <TextField
                label="Catatan / Keterangan Tambahan"
                fullWidth
                multiline
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Kondisi bracket, perkabelan, keluhan teknis, dll..."
              />
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
              {submitting ? 'Menyimpan...' : 'Simpan Dascam'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG 2: SUB-MENU PINDAH DASCAM */}
      <Dialog open={openMoveModal} onClose={() => setOpenMoveModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleProcessMoveDashcam}>
          <DialogTitle sx={{ fontWeight: 800, color: textNavy, borderBottom: '1px solid #e2e8f0', pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TransferIcon sx={{ color: '#d97706' }} /> Mutasi & Pindah Dascam
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <Autocomplete
                options={dashcams}
                getOptionLabel={(d) => `${d.serial_number} - ${d.brand} (${d.current_unit_number ? `Unit ${d.current_unit_number}` : 'Standby'})`}
                value={selectedDashcamForMove}
                onChange={(_e, newValue) => setSelectedDashcamForMove(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Pilih Dascam (Serial Number)"
                    required
                    helperText="Pilih dascam yang akan dipindahkan posisinya"
                  />
                )}
              />

              {selectedDashcamForMove && (
                <Card sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: textMuted, fontWeight: 600, display: 'block' }}>
                    POSISI DASCAM SAAT INI:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800, color: textNavy, mt: 0.5 }}>
                    {selectedDashcamForMove.current_unit_number
                      ? `Terpasang di Unit: ${selectedDashcamForMove.current_unit_number}`
                      : 'Status: Standby / Tersedia di Gudang'}
                  </Typography>
                </Card>
              )}

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
                    helperText="Pilih nomor unit kendaraan tujuan, atau ketik 'STANDBY' untuk melepas dascam ke gudang"
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
                placeholder="Contoh: Unit rusak masuk workshop, dascam dipindahkan ke unit cadangan..."
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
              disabled={moveSubmitting || !selectedDashcamForMove || !moveTargetUnit}
              sx={{ fontWeight: 700 }}
            >
              {moveSubmitting ? 'Memproses...' : 'Konfirmasi Pindah Dascam'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG 3: TAMBAH / EDIT MERK & VENDOR */}
      <Dialog open={openBrandModal} onClose={() => setOpenBrandModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveBrand}>
          <DialogTitle sx={{ fontWeight: 800, color: textNavy, borderBottom: '1px solid #e2e8f0', pb: 2 }}>
            {editingBrand ? `Edit Merk (${editingBrand.name})` : 'Tambah Master Merk / Vendor Baru'}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <TextField
                label="Nama Merk Dascam"
                required
                fullWidth
                value={formBrandName}
                onChange={(e) => setFormBrandName(e.target.value)}
                placeholder="Contoh: Hikvision, 70mai, BlackVue"
              />

              <TextField
                label="Nama Vendor / Perusahaan Supplier"
                fullWidth
                value={formVendorName}
                onChange={(e) => setFormVendorName(e.target.value)}
                placeholder="Contoh: PT. Solusi Telematika Armada"
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Contact Person"
                    fullWidth
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="Nama PIC"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="No. Telepon / HP"
                    fullWidth
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0812xxxx"
                  />
                </Grid>
              </Grid>

              <TextField
                label="Keterangan / Dukungan Garansi"
                fullWidth
                multiline
                rows={2}
                value={formBrandDesc}
                onChange={(e) => setFormBrandDesc(e.target.value)}
                placeholder="Informasi garansi, kontak teknis..."
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e2e8f0' }}>
            <Button onClick={() => setOpenBrandModal(false)} color="inherit">
              Batal
            </Button>
            <Button type="submit" variant="contained" color="secondary" disabled={brandSubmitting} sx={{ fontWeight: 700 }}>
              {brandSubmitting ? 'Menyimpan...' : 'Simpan Merk'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG 4: KONFIRMASI HAPUS DASCAM */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, dashcam: null })}>
        <DialogTitle sx={{ fontWeight: 700, color: '#d32f2f' }}>Hapus Dascam?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Apakah Anda yakin ingin menghapus dascam dengan Serial Number{' '}
            <strong>"{deleteDialog.dashcam?.serial_number}"</strong>? Tindakan ini tidak dapat dibatalkan.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, dashcam: null })} color="inherit">
            Batal
          </Button>
          <Button onClick={handleDeleteDashcam} color="error" variant="contained">
            Hapus
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 5: KONFIRMASI HAPUS MERK */}
      <Dialog open={deleteBrandDialog.open} onClose={() => setDeleteBrandDialog({ open: false, brand: null })}>
        <DialogTitle sx={{ fontWeight: 700, color: '#d32f2f' }}>Hapus Merk / Vendor?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Apakah Anda yakin ingin menghapus merk <strong>"{deleteBrandDialog.brand?.name}"</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteBrandDialog({ open: false, brand: null })} color="inherit">
            Batal
          </Button>
          <Button onClick={handleDeleteBrand} color="error" variant="contained">
            Hapus
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG TAMBAH / EDIT MASTER PROVIDER INTERNET */}
      <Dialog open={openProviderModal} onClose={() => setOpenProviderModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveProvider}>
          <DialogTitle sx={{ fontWeight: 800, color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
            {editingProvider ? `Edit Provider Internet: ${editingProvider.name}` : 'Tambah Master Provider Internet'}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <TextField
                label="Nama Provider Internet"
                required
                fullWidth
                value={formProviderName}
                onChange={(e) => setFormProviderName(e.target.value)}
                placeholder="Contoh: Telkomsel, Indosat Ooredoo, XL Axiata, Starlink"
                helperText="Nama resmi operator seluler atau penyedia koneksi data"
              />
              <TextField
                label="Tipe Jaringan / Koneksi"
                fullWidth
                value={formProviderType}
                onChange={(e) => setFormProviderType(e.target.value)}
                placeholder="Contoh: Cellular / GSM 4G, Satelit, WiFi Hotspot"
              />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="PIC / Kontak Sales"
                    fullWidth
                    value={formProviderContact}
                    onChange={(e) => setFormProviderContact(e.target.value)}
                    placeholder="Nama Account Manager"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Nomor Telepon / CS"
                    fullWidth
                    value={formProviderPhone}
                    onChange={(e) => setFormProviderPhone(e.target.value)}
                    placeholder="0812xxxx / Call Center"
                  />
                </Grid>
              </Grid>
              <TextField
                label="Keterangan / Paket Data"
                fullWidth
                multiline
                rows={2}
                value={formProviderDesc}
                onChange={(e) => setFormProviderDesc(e.target.value)}
                placeholder="Contoh: Paket Halo Corporate 50GB / APN khusus M2M"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button onClick={() => setOpenProviderModal(false)} color="inherit" disabled={providerSubmitting}>
              Batal
            </Button>
            <Button type="submit" variant="contained" color="secondary" disabled={providerSubmitting}>
              {providerSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Simpan Provider'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG KONFIRMASI HAPUS PROVIDER */}
      <Dialog open={deleteProviderDialog.open} onClose={() => setDeleteProviderDialog({ open: false, provider: null })}>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Hapus Provider Internet?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Apakah Anda yakin ingin menghapus provider <strong>"{deleteProviderDialog.provider?.name}"</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteProviderDialog({ open: false, provider: null })} color="inherit">
            Batal
          </Button>
          <Button onClick={handleDeleteProvider} color="error" variant="contained">
            Hapus
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG PREVIEW FOTO */}
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

      {/* DIALOG IMPORT EXCEL DASCAM */}
      <Dialog
        open={importModal}
        onClose={() => !importLoading && setImportModal(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: isDark ? '#0d1929' : '#ffffff',
            border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: textNavy, display: 'flex', alignItems: 'center', gap: 1 }}>
            <UploadIcon color="primary" />
            Import Master Data Dascam dari Excel (.xlsx)
          </Typography>
          <IconButton onClick={() => setImportModal(false)} disabled={importLoading} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {/* BANNER TEMPLATE */}
          <Box
            sx={{
              p: 2,
              mb: 3,
              bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ecfdf5',
              border: isDark ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid #a7f3d0',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TemplateIcon sx={{ color: '#059669', fontSize: 32 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#34d399' : '#065f46' }}>
                  Template Master Data Dascam (Sistem Taurus)
                </Typography>
                <Typography variant="caption" sx={{ color: isDark ? '#a7f3d0' : '#047857', display: 'block' }}>
                  Gunakan format template resmi untuk memastikan Serial Number, Unit, dan Kondisi terpetakan otomatis.
                </Typography>
              </Box>
            </Box>

            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadTemplate}
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                borderColor: '#059669',
                color: '#059669',
                bgcolor: '#ffffff',
                '&:hover': { bgcolor: '#f0fdf4', borderColor: '#047857' },
              }}
            >
              Download Template Excel (.xlsx)
            </Button>
          </Box>

          {/* DROPZONE / FILE SELECTOR */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />

          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: '2px dashed',
              borderColor: isDark ? '#334155' : '#cbd5e1',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: isDark ? '#ffd600' : '#2563eb',
                bgcolor: isDark ? 'rgba(255, 214, 0, 0.04)' : '#eff6ff',
              },
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 44, color: isDark ? '#ffd600' : '#2563eb', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {importFile ? importFile.name : 'Klik atau Tarik File Excel (.xlsx) ke Sini'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Format didukung: .xlsx atau .xls (Sistem otomatis mengenali Serial Number, Unit, Provider, dll)
            </Typography>
          </Box>

          {/* ALERT PESAN */}
          {importError && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setImportError(null)}>
              {importError}
            </Alert>
          )}

          {importSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {importSuccess}
            </Alert>
          )}

          {/* PREVIEW HASIL PARSING */}
          {importPreview.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Preview Data Dascam yang Terdeteksi:
                </Typography>
                <Chip
                  label={`${importPreview.length} Dascam Siap Di-import`}
                  color="success"
                  size="small"
                  sx={{ fontWeight: 800 }}
                />
              </Box>

              <TableContainer sx={{ maxHeight: 320, border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0', borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>NO.</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>SERIAL NUMBER</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>MERK & MODEL</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>STATUS</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>UNIT KENDARAAN</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>SD CARD</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>PROVIDER & SIM</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>KONDISI</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>KAMERA</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>CATATAN</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importPreview.map((item, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: textNavy, fontSize: '0.75rem' }}>
                          {item.serial_number}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          {item.brand} {item.model_type}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          <Chip
                            label={item.status}
                            size="small"
                            color={item.status === 'Terpasang' ? 'success' : item.status === 'Standby' ? 'info' : 'error'}
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
                          {item.current_unit_number || <span style={{ color: '#94a3b8' }}>Standby</span>}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{item.sd_card_capacity || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          {item.internet_provider} {item.sim_card_number ? `(${item.sim_card_number})` : ''}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          Listrik: {item.electrical_condition} | GPS: {item.gps_condition}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          {[
                            item.has_front_camera ? 'Depan' : null,
                            item.has_cabin_camera ? 'Kabin' : null,
                            item.has_fatigue_camera ? 'Fatigue' : null,
                          ]
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{item.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setImportModal(false)} disabled={importLoading} sx={{ textTransform: 'none' }}>
            Batal
          </Button>
          <Button
            onClick={handleConfirmImport}
            variant="contained"
            color="primary"
            disabled={importPreview.length === 0 || importLoading}
            startIcon={importLoading ? <CircularProgress size={18} color="inherit" /> : <UploadIcon />}
            sx={{ fontWeight: 800, textTransform: 'none', px: 3 }}
          >
            {importLoading ? 'Menyimpan...' : `Proses & Simpan (${importPreview.length} Dascam)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashcamManagement;
