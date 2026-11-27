import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Pagination,
  Divider,
  Stack,
  FormHelperText,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Inventory2Outlined as InventoryIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  BrandingWatermark as BrandIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon,
  DeleteSweep as ScrapIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import socket from '../socket';
import { useAppTheme } from '../ThemeContext';
import {
  InventoryItem,
  InventoryLocation,
  InventoryPic,
  InventoryCategory,
  InventoryBrand,
  InventoryType,
  ItemCondition,
} from '../types';

export const InventoryManagement: React.FC = () => {
  const { mode } = useAppTheme();
  const isDark = mode === 'dark';
  const location = useLocation();
  const navigate = useNavigate();

  // User role checking
  const userJson = localStorage.getItem('taurus_user');
  const currentUser = userJson ? JSON.parse(userJson) : { name: 'User', role: 'client' };
  const isClient = currentUser.role === 'client';

  // Active Tab: 0 = Master Barang, 1 = Master Data Dropdown
  const [activeTab, setActiveTab] = useState(location.pathname.includes('/settings') ? 1 : 0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (newValue === 1) navigate('/inventory/settings');
    else navigate('/inventory');
  };

  // Master Dropdown Data
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [pics, setPics] = useState<InventoryPic[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [brands, setBrands] = useState<InventoryBrand[]>([]);
  const [types, setTypes] = useState<InventoryType[]>([]);

  // Feedback Alert State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ==========================================
  // TAB 0: MASTER BARANG STATES
  // ==========================================
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [searchItem, setSearchItem] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [pageItem, setPageItem] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesItem, setTotalPagesItem] = useState(1);
  const [summary, setSummary] = useState({
    total_items: 0,
    in_stock_count: 0,
    deployed_count: 0,
    damaged_count: 0,
    lost_count: 0,
    scrap_count: 0,
  });

  // Modal Item (Tambah / Edit)
  const [openItemModal, setOpenItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({
    item_code: '',
    name: '',
    serial_number: '',
    category_id: '',
    brand_id: '',
    type_id: '',
    current_location_id: '',
    current_pic_id: '',
    condition_status: 'Baik' as ItemCondition,
    entry_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [generatingCode, setGeneratingCode] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  // Modal Detail Item
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<InventoryItem | null>(null);

  // Modal Delete Item
  const [deleteItemDialog, setDeleteItemDialog] = useState<{ open: boolean; item: InventoryItem | null }>({
    open: false,
    item: null,
  });

  // ==========================================
  // TAB 1: MASTER DROPDOWNS CRUD STATES
  // ==========================================
  const [masterSubTab, setMasterSubTab] = useState(0); // 0: Lokasi, 1: PIC, 2: Jenis, 3: Merk & Tipe

  // Modal Lokasi
  const [openLocModal, setOpenLocModal] = useState(false);
  const [locForm, setLocForm] = useState({ id: 0, name: '', description: '' });

  // Modal PIC
  const [openPicModal, setOpenPicModal] = useState(false);
  const [picForm, setPicForm] = useState({ id: 0, name: '', location_id: '', phone: '', department: '' });

  // Modal Category (Jenis)
  const [openCatModal, setOpenCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ id: 0, name: '', description: '' });

  // Modal Brand (Merk)
  const [openBrandModal, setOpenBrandModal] = useState(false);
  const [brandForm, setBrandForm] = useState({ id: 0, name: '', description: '' });

  // Modal Type (Tipe)
  const [openTypeModal, setOpenTypeModal] = useState(false);
  const [typeForm, setTypeForm] = useState({ id: 0, name: '', brand_id: '', description: '' });

  // Delete master dialog
  const [deleteMasterDialog, setDeleteMasterDialog] = useState<{
    open: boolean;
    type: 'location' | 'pic' | 'category' | 'brand' | 'type';
    id: number;
    name: string;
  }>({
    open: false,
    type: 'location',
    id: 0,
    name: '',
  });

  // Load all master dropdowns
  const fetchMasterData = async () => {
    try {
      const [resLoc, resPic, resCat, resBrand, resType] = await Promise.all([
        api.get('/inventory/locations'),
        api.get('/inventory/pics'),
        api.get('/inventory/categories'),
        api.get('/inventory/brands'),
        api.get('/inventory/types'),
      ]);
      setLocations(resLoc.data || []);
      setPics(resPic.data || []);
      setCategories(resCat.data || []);
      setBrands(resBrand.data || []);
      setTypes(resType.data || []);
    } catch (err: any) {
      console.error('Gagal mengambil master data inventaris:', err);
    }
  };

  // Fetch Items
  const fetchItems = async () => {
    setLoadingItems(true);
    try {
      const params: any = {
        page: pageItem,
        limit: 25,
      };
      if (searchItem.trim()) params.search = searchItem.trim();
      if (filterLocation !== 'all') params.location_id = filterLocation;
      if (filterCategory !== 'all') params.category_id = filterCategory;
      if (filterBrand !== 'all') params.brand_id = filterBrand;
      if (filterCondition !== 'all') params.condition_status = filterCondition;

      const res = await api.get('/inventory/items', { params });
      setItems(res.data.items || []);
      setTotalItems(res.data.total || 0);
      setTotalPagesItem(res.data.totalPages || 1);
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Gagal memuat daftar barang: ' + (err.response?.data?.message || err.message) });
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (activeTab === 0) fetchItems();
  }, [activeTab, pageItem, filterLocation, filterCategory, filterBrand, filterCondition]);

  // Real-time socket listener
  useEffect(() => {
    const handleInventoryUpdated = () => {
      fetchMasterData();
      if (activeTab === 0) fetchItems();
    };

    socket.on('inventoryUpdated', handleInventoryUpdated);
    return () => {
      socket.off('inventoryUpdated', handleInventoryUpdated);
    };
  }, [activeTab]);

  // ==========================================
  // RELATION LOGIC: PIC Filtered by Location
  // ==========================================
  // In Item Add/Edit Modal: PICs filtered by itemForm.current_location_id
  const filteredItemPics = useMemo(() => {
    if (!itemForm.current_location_id) return [];
    const locId = parseInt(itemForm.current_location_id, 10);
    return pics.filter((p) => p.location_id === locId);
  }, [pics, itemForm.current_location_id]);

  // Filtered types by selected brand
  const filteredTypesByBrand = (brandId: string) => {
    if (!brandId) return types;
    const bId = parseInt(brandId, 10);
    return types.filter((t) => t.brand_id === bId || !t.brand_id);
  };

  // Generate Item Code
  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await api.get('/inventory/items/generate-code');
      if (res.data?.code) {
        setItemForm((prev) => ({ ...prev, item_code: res.data.code }));
      }
    } catch (err: any) {
      console.error('Gagal generate kode:', err);
    } finally {
      setGeneratingCode(false);
    }
  };

  // Open Add Item Modal
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemForm({
      item_code: '',
      name: '',
      serial_number: '',
      category_id: categories[0]?.id ? String(categories[0].id) : '',
      brand_id: brands[0]?.id ? String(brands[0].id) : '',
      type_id: '',
      current_location_id: locations.find((l) => l.name.toLowerCase().includes('it'))?.id
        ? String(locations.find((l) => l.name.toLowerCase().includes('it'))?.id)
        : locations[0]?.id
        ? String(locations[0].id)
        : '',
      current_pic_id: '',
      condition_status: 'Baik',
      entry_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setOpenItemModal(true);
    handleGenerateCode();
  };

  // Open Edit Item Modal
  const handleOpenEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      item_code: item.item_code,
      name: item.name,
      serial_number: item.serial_number || '',
      category_id: item.category_id ? String(item.category_id) : '',
      brand_id: item.brand_id ? String(item.brand_id) : '',
      type_id: item.type_id ? String(item.type_id) : '',
      current_location_id: item.current_location_id ? String(item.current_location_id) : '',
      current_pic_id: item.current_pic_id ? String(item.current_pic_id) : '',
      condition_status: item.condition_status,
      entry_date: item.entry_date || new Date().toISOString().split('T')[0],
      notes: item.notes || '',
    });
    setOpenItemModal(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      setFeedback({ type: 'error', message: 'Nama barang wajib diisi' });
      return;
    }
    setSavingItem(true);
    try {
      const payload = {
        item_code: itemForm.item_code.trim(),
        name: itemForm.name.trim(),
        serial_number: itemForm.serial_number.trim() || null,
        category_id: itemForm.category_id ? parseInt(itemForm.category_id, 10) : null,
        brand_id: itemForm.brand_id ? parseInt(itemForm.brand_id, 10) : null,
        type_id: itemForm.type_id ? parseInt(itemForm.type_id, 10) : null,
        current_location_id: itemForm.current_location_id ? parseInt(itemForm.current_location_id, 10) : null,
        current_pic_id: itemForm.current_pic_id ? parseInt(itemForm.current_pic_id, 10) : null,
        condition_status: itemForm.condition_status,
        entry_date: itemForm.entry_date,
        notes: itemForm.notes.trim() || null,
      };

      if (editingItem) {
        await api.put(`/inventory/items/${editingItem.id}`, payload);
        setFeedback({ type: 'success', message: `Data barang ${itemForm.name} berhasil diperbarui (Tanggal Update otomatis diperbarui)` });
      } else {
        await api.post('/inventory/items', payload);
        setFeedback({ type: 'success', message: `Barang baru ${itemForm.name} berhasil didaftarkan ke sistem` });
      }
      setOpenItemModal(false);
      fetchItems();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Gagal menyimpan data barang' });
    } finally {
      setSavingItem(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async () => {
    if (!deleteItemDialog.item) return;
    try {
      await api.delete(`/inventory/items/${deleteItemDialog.item.id}`);
      setFeedback({ type: 'success', message: `Barang ${deleteItemDialog.item.name} berhasil dihapus` });
      setDeleteItemDialog({ open: false, item: null });
      fetchItems();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Gagal menghapus barang' });
    }
  };

  // Open Detail Modal
  const handleOpenDetail = (item: InventoryItem) => {
    setSelectedItemDetail(item);
    setDetailModalOpen(true);
  };

  // ==========================================
  // MASTER DATA MODAL HANDLERS
  // ==========================================
  // Save Location
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locForm.name.trim()) return;
    try {
      if (locForm.id) {
        await api.put(`/inventory/locations/${locForm.id}`, locForm);
      } else {
        await api.post('/inventory/locations', locForm);
      }
      setOpenLocModal(false);
      fetchMasterData();
      setFeedback({ type: 'success', message: `Lokasi ${locForm.name} berhasil disimpan` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Gagal menyimpan lokasi' });
    }
  };

  // Save PIC
  const handleSavePic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picForm.name.trim()) return;
    try {
      const payload = {
        name: picForm.name.trim(),
        location_id: picForm.location_id ? parseInt(picForm.location_id, 10) : null,
        phone: picForm.phone.trim() || null,
        department: picForm.department.trim() || null,
      };
      if (picForm.id) {
        await api.put(`/inventory/pics/${picForm.id}`, payload);
      } else {
        await api.post('/inventory/pics', payload);
      }
      setOpenPicModal(false);
      fetchMasterData();
      setFeedback({ type: 'success', message: `PIC ${picForm.name} berhasil disimpan` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Gagal menyimpan PIC' });
    }
  };

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    try {
      if (catForm.id) {
        await api.put(`/inventory/categories/${catForm.id}`, catForm);
      } else {
        await api.post('/inventory/categories', catForm);
      }
      setOpenCatModal(false);
      fetchMasterData();
      setFeedback({ type: 'success', message: `Jenis barang ${catForm.name} berhasil disimpan` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Gagal menyimpan jenis barang' });
    }
  };

  // Save Brand
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim()) return;
    try {
      if (brandForm.id) {
        await api.put(`/inventory/brands/${brandForm.id}`, brandForm);
      } else {
        await api.post('/inventory/brands', brandForm);
      }
      setOpenBrandModal(false);
      fetchMasterData();
      setFeedback({ type: 'success', message: `Merk ${brandForm.name} berhasil disimpan` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Gagal menyimpan merk' });
    }
  };

  // Save Type
  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeForm.name.trim()) return;
    try {
      const payload = {
        name: typeForm.name.trim(),
        brand_id: typeForm.brand_id ? parseInt(typeForm.brand_id, 10) : null,
        description: typeForm.description.trim() || null,
      };
      if (typeForm.id) {
        await api.put(`/inventory/types/${typeForm.id}`, payload);
      } else {
        await api.post('/inventory/types', payload);
      }
      setOpenTypeModal(false);
      fetchMasterData();
      setFeedback({ type: 'success', message: `Tipe ${typeForm.name} berhasil disimpan` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Gagal menyimpan tipe' });
    }
  };

  // Delete Master Handler
  const handleDeleteMaster = async () => {
    try {
      if (deleteMasterDialog.type === 'location') await api.delete(`/inventory/locations/${deleteMasterDialog.id}`);
      else if (deleteMasterDialog.type === 'pic') await api.delete(`/inventory/pics/${deleteMasterDialog.id}`);
      else if (deleteMasterDialog.type === 'category') await api.delete(`/inventory/categories/${deleteMasterDialog.id}`);
      else if (deleteMasterDialog.type === 'brand') await api.delete(`/inventory/brands/${deleteMasterDialog.id}`);
      else if (deleteMasterDialog.type === 'type') await api.delete(`/inventory/types/${deleteMasterDialog.id}`);

      setFeedback({ type: 'success', message: `Data ${deleteMasterDialog.name} berhasil dihapus` });
      setDeleteMasterDialog({ open: false, type: 'location', id: 0, name: '' });
      fetchMasterData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Gagal menghapus data master' });
    }
  };

  // Helper Badge Colors for Condition
  const renderConditionChip = (cond: ItemCondition) => {
    switch (cond) {
      case 'Baik':
        return <Chip icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />} label="Baik" size="small" sx={{ bgcolor: 'rgba(46, 125, 50, 0.15)', color: '#2e7d32', fontWeight: 700 }} />;
      case 'Rusak':
        return <Chip icon={<WarningIcon sx={{ fontSize: '14px !important' }} />} label="Rusak" size="small" sx={{ bgcolor: 'rgba(237, 108, 2, 0.15)', color: '#ed6c02', fontWeight: 700 }} />;
      case 'Hilang':
        return <Chip icon={<CancelIcon sx={{ fontSize: '14px !important' }} />} label="Hilang" size="small" sx={{ bgcolor: 'rgba(211, 47, 47, 0.15)', color: '#d32f2f', fontWeight: 700 }} />;
      case 'Scrap':
        return <Chip icon={<ScrapIcon sx={{ fontSize: '14px !important' }} />} label="Scrap" size="small" sx={{ bgcolor: 'rgba(100, 116, 139, 0.2)', color: isDark ? '#cbd5e1' : '#475569', fontWeight: 700 }} />;
      default:
        return <Chip label={cond} size="small" />;
    }
  };

  const formatDate = (dateStr?: string | null, withTime = false) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      if (withTime) {
        return d.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      {/* HEADER BANNER */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#00ff66' : '#1a237e', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <InventoryIcon sx={{ fontSize: 32 }} />
            Master Barang
          </Typography>
          <Typography variant="body2" sx={{ color: isDark ? '#94a3b8' : '#64748b', mt: 0.5 }}>
            Pencatatan inventaris barang, lokasi barang, dan PIC penanggung jawab terkait (EMCC, PLANT, Workshop, dll.)
          </Typography>
        </Box>

        {/* Action Buttons Top */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => { fetchItems(); fetchMasterData(); }}
            sx={{ fontWeight: 700 }}
          >
            Refresh
          </Button>
          {!isClient && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenAddItem}
              sx={{
                fontWeight: 700,
                bgcolor: isDark ? '#00ff66' : '#1a237e',
                color: isDark ? '#0a1220' : '#ffffff',
                '&:hover': { bgcolor: isDark ? '#00cc52' : '#283593' },
              }}
            >
              Tambah Master Barang
            </Button>
          )}
        </Stack>
      </Box>

      {/* ALERT FEEDBACK */}
      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 2.5 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {/* KPI SUMMARY CARDS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2.4}>
          <Card sx={{ bgcolor: isDark ? '#0f172a' : '#ffffff', borderRadius: 2.5, border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Barang
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#1a237e', mt: 0.5 }}>
                {summary.total_items}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <Card sx={{ bgcolor: isDark ? '#0f172a' : '#ffffff', borderRadius: 2.5, border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: isDark ? '#00ff66' : '#0284c7', fontWeight: 700, textTransform: 'uppercase' }}>
                Di Ruang IT
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: isDark ? '#00ff66' : '#0284c7', mt: 0.5 }}>
                {summary.in_stock_count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <Card sx={{ bgcolor: isDark ? '#0f172a' : '#ffffff', borderRadius: 2.5, border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                Di Lapangan / PIC
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#f59e0b', mt: 0.5 }}>
                {summary.deployed_count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={2.4}>
          <Card sx={{ bgcolor: isDark ? '#0f172a' : '#ffffff', borderRadius: 2.5, border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>
                Kondisi Rusak
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#ef4444', mt: 0.5 }}>
                {summary.damaged_count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={2.4}>
          <Card sx={{ bgcolor: isDark ? '#0f172a' : '#ffffff', borderRadius: 2.5, border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: isDark ? '#cbd5e1' : '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Scrap / Hilang
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: isDark ? '#cbd5e1' : '#64748b', mt: 0.5 }}>
                {Number(summary.lost_count) + Number(summary.scrap_count)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* NAVIGATION TABS (Master Barang | Master Data Dropdown) */}
      <Paper sx={{ mb: 3, borderRadius: 2.5, bgcolor: isDark ? '#0f172a' : '#ffffff' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            px: 2,
            borderBottom: 1,
            borderColor: isDark ? '#1e293b' : '#e2e8f0',
            '& .MuiTab-root': { fontWeight: 700, minHeight: 48, fontSize: '0.9rem' },
          }}
        >
          <Tab icon={<InventoryIcon fontSize="small" />} iconPosition="start" label="Daftar Master Barang" />
          {!isClient && <Tab icon={<SettingsIcon fontSize="small" />} iconPosition="start" label="Master Data Dropdown (Lokasi, PIC, Jenis, Merk/Tipe)" />}
        </Tabs>

        {/* ========================================================
            TAB 0: MASTER BARANG
        ======================================================== */}
        {activeTab === 0 && (
          <Box sx={{ p: 2.5 }}>
            {/* Search and Filters */}
            <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
              <Grid item xs={12} md={3.6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Cari ID, nama, SN, PIC..."
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchItems(); }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={6} sm={4} md={2.1}>
                <FormControl fullWidth size="small">
                  <InputLabel>Lokasi Barang</InputLabel>
                  <Select value={filterLocation} label="Lokasi Barang" onChange={(e) => setFilterLocation(e.target.value)}>
                    <MenuItem value="all">Semua Lokasi</MenuItem>
                    {locations.map((loc) => (
                      <MenuItem key={loc.id} value={String(loc.id)}>{loc.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={4} md={2.1}>
                <FormControl fullWidth size="small">
                  <InputLabel>Jenis Barang</InputLabel>
                  <Select value={filterCategory} label="Jenis Barang" onChange={(e) => setFilterCategory(e.target.value)}>
                    <MenuItem value="all">Semua Jenis</MenuItem>
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={4} md={2.1}>
                <FormControl fullWidth size="small">
                  <InputLabel>Merk</InputLabel>
                  <Select value={filterBrand} label="Merk" onChange={(e) => setFilterBrand(e.target.value)}>
                    <MenuItem value="all">Semua Merk</MenuItem>
                    {brands.map((b) => (
                      <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={4} md={2.1}>
                <FormControl fullWidth size="small">
                  <InputLabel>Kondisi</InputLabel>
                  <Select value={filterCondition} label="Kondisi" onChange={(e) => setFilterCondition(e.target.value)}>
                    <MenuItem value="all">Semua Kondisi</MenuItem>
                    <MenuItem value="Baik">Baik</MenuItem>
                    <MenuItem value="Rusak">Rusak</MenuItem>
                    <MenuItem value="Hilang">Hilang</MenuItem>
                    <MenuItem value="Scrap">Scrap</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Master Items Table */}
            <TableContainer sx={{ borderRadius: 2, border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: isDark ? '#1e293b' : '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: 50, textAlign: 'center' }}>NO.</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>ID BARANG</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>NAMA BARANG</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>SERIAL NUMBER</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>JENIS</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>MERK & TIPE</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>LOKASI BARANG</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>PIC TERKAIT</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>TGL MASUK</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>TGL UPDATE</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>KONDISI</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>AKSI</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingItems ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={36} />
                        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                          Memuat data inventaris...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center" sx={{ py: 6 }}>
                        <InventoryIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          Belum ada data barang ditemukan
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Klik "Tambah Master Barang" untuk mendaftarkan barang baru.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, idx) => (
                      <TableRow key={item.id} hover sx={{ '&:hover': { bgcolor: isDark ? '#1e293b' : '#f8fafc' } }}>
                        <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          {(pageItem - 1) * 25 + idx + 1}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, color: isDark ? '#00ff66' : '#1a237e' }}>
                            {item.item_code}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{item.name}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{item.serial_number || '-'}</TableCell>
                        <TableCell>{item.category?.name || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.brand?.name || '-'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {item.type?.name || ''}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<LocationIcon sx={{ fontSize: '14px !important' }} />}
                            label={item.current_location?.name || 'Ruang IT'}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          {item.current_pic ? (
                            <Chip
                              icon={<PersonIcon sx={{ fontSize: '14px !important' }} />}
                              label={item.current_pic.name}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontWeight: 700 }}
                            />
                          ) : (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>- (Ruang IT)</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {formatDate(item.entry_date)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {formatDate(item.last_update_date, true)}
                        </TableCell>
                        <TableCell>{renderConditionChip(item.condition_status)}</TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="Detail Lengkap">
                              <IconButton size="small" color="info" onClick={() => handleOpenDetail(item)}>
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            {!isClient && (
                              <>
                                <Tooltip title="Edit / Pindahkan ke PIC">
                                  <IconButton size="small" color="primary" onClick={() => handleOpenEditItem(item)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Hapus Barang">
                                  <IconButton size="small" color="error" onClick={() => setDeleteItemDialog({ open: true, item })}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {totalPagesItem > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Pagination
                  count={totalPagesItem}
                  page={pageItem}
                  onChange={(_, p) => setPageItem(p)}
                  color="primary"
                  size="small"
                />
              </Box>
            )}
          </Box>
        )}

        {/* ========================================================
            TAB 1: KELOLA MASTER DROPDOWN (Lokasi & PIC, Jenis, Merk/Tipe)
        ======================================================== */}
        {activeTab === 1 && !isClient && (
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                Kelola Data Master Dropdown
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Atur data dinamis Lokasi Barang & relasi PIC penanggung jawab, Jenis Barang, serta Merk & Tipe.
              </Typography>
            </Box>

            <Tabs
              value={masterSubTab}
              onChange={(_, v) => setMasterSubTab(v)}
              sx={{ mb: 2.5, borderBottom: 1, borderColor: isDark ? '#1e293b' : '#e2e8f0' }}
            >
              <Tab icon={<LocationIcon fontSize="small" />} iconPosition="start" label="1. Master Lokasi Barang" />
              <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="2. Master PIC (Terkait Lokasi)" />
              <Tab icon={<CategoryIcon fontSize="small" />} iconPosition="start" label="3. Master Jenis Barang" />
              <Tab icon={<BrandIcon fontSize="small" />} iconPosition="start" label="4. Master Merk & Tipe" />
            </Tabs>

            {/* SUB-TAB 0: LOKASI */}
            {masterSubTab === 0 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Daftar Lokasi Barang</Typography>
                  <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => { setLocForm({ id: 0, name: '', description: '' }); setOpenLocModal(true); }}>
                    Tambah Lokasi
                  </Button>
                </Box>
                <TableContainer sx={{ border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: isDark ? '#1e293b' : '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, width: 60, textAlign: 'center' }}>NO.</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>NAMA LOKASI</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>KETERANGAN</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>PIC TERDAFTAR</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>AKSI</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {locations.map((loc, idx) => {
                        const locPics = pics.filter((p) => p.location_id === loc.id);
                        return (
                          <TableRow key={loc.id} hover>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: isDark ? '#00ff66' : '#1a237e' }}>{loc.name}</TableCell>
                            <TableCell>{loc.description || '-'}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                {locPics.length > 0 ? (
                                  locPics.map((p) => <Chip key={p.id} label={p.name} size="small" variant="outlined" />)
                                ) : (
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Belum ada PIC</Typography>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell align="center">
                              <IconButton size="small" color="primary" onClick={() => { setLocForm({ id: loc.id, name: loc.name, description: loc.description || '' }); setOpenLocModal(true); }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => setDeleteMasterDialog({ open: true, type: 'location', id: loc.id, name: loc.name })}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* SUB-TAB 1: PIC TERKAIT LOKASI */}
            {masterSubTab === 1 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Daftar PIC (Person In Charge)</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Setiap PIC ditugaskan pada satu Lokasi (Contoh: EMCC → Tono, Tini, Tene; PLANT → Vika, Viki, Vuku)
                    </Typography>
                  </Box>
                  <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => { setPicForm({ id: 0, name: '', location_id: locations[0]?.id ? String(locations[0].id) : '', phone: '', department: '' }); setOpenPicModal(true); }}>
                    Tambah PIC
                  </Button>
                </Box>
                <TableContainer sx={{ border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: isDark ? '#1e293b' : '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, width: 60, textAlign: 'center' }}>NO.</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>NAMA PIC</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>LOKASI TERKAIT</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>NO TELEPON / WA</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>DEPARTEMEN / JABATAN</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>AKSI</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pics.map((p, idx) => (
                        <TableRow key={p.id} hover>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                          <TableCell>
                            <Chip icon={<LocationIcon sx={{ fontSize: '14px !important' }} />} label={p.location?.name || 'Tidak ada'} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{p.phone || '-'}</TableCell>
                          <TableCell>{p.department || '-'}</TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="primary" onClick={() => { setPicForm({ id: p.id, name: p.name, location_id: p.location_id ? String(p.location_id) : '', phone: p.phone || '', department: p.department || '' }); setOpenPicModal(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => setDeleteMasterDialog({ open: true, type: 'pic', id: p.id, name: p.name })}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* SUB-TAB 2: JENIS BARANG */}
            {masterSubTab === 2 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Daftar Jenis Barang (Kategori)</Typography>
                  <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => { setCatForm({ id: 0, name: '', description: '' }); setOpenCatModal(true); }}>
                    Tambah Jenis Barang
                  </Button>
                </Box>
                <TableContainer sx={{ border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: isDark ? '#1e293b' : '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, width: 60, textAlign: 'center' }}>NO.</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>NAMA JENIS BARANG</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>DESKRIPSI</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>AKSI</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {categories.map((c, idx) => (
                        <TableRow key={c.id} hover>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{c.name}</TableCell>
                          <TableCell>{c.description || '-'}</TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="primary" onClick={() => { setCatForm({ id: c.id, name: c.name, description: c.description || '' }); setOpenCatModal(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => setDeleteMasterDialog({ open: true, type: 'category', id: c.id, name: c.name })}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* SUB-TAB 3: MERK & TIPE */}
            {masterSubTab === 3 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Master Merk</Typography>
                    <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => { setBrandForm({ id: 0, name: '', description: '' }); setOpenBrandModal(true); }}>
                      Tambah Merk
                    </Button>
                  </Box>
                  <TableContainer sx={{ border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0', borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: isDark ? '#1e293b' : '#f8fafc' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800, width: 50, textAlign: 'center' }}>NO.</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>MERK</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>DESKRIPSI</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>AKSI</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {brands.map((b, idx) => (
                          <TableRow key={b.id} hover>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{b.name}</TableCell>
                            <TableCell>{b.description || '-'}</TableCell>
                            <TableCell align="center">
                              <IconButton size="small" color="primary" onClick={() => { setBrandForm({ id: b.id, name: b.name, description: b.description || '' }); setOpenBrandModal(true); }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => setDeleteMasterDialog({ open: true, type: 'brand', id: b.id, name: b.name })}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Master Tipe / Model</Typography>
                    <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => { setTypeForm({ id: 0, name: '', brand_id: brands[0]?.id ? String(brands[0].id) : '', description: '' }); setOpenTypeModal(true); }}>
                      Tambah Tipe
                    </Button>
                  </Box>
                  <TableContainer sx={{ border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0', borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: isDark ? '#1e293b' : '#f8fafc' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800, width: 50, textAlign: 'center' }}>NO.</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>TIPE</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>MERK</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>AKSI</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {types.map((t, idx) => (
                          <TableRow key={t.id} hover>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{t.name}</TableCell>
                            <TableCell>{t.brand?.name || '-'}</TableCell>
                            <TableCell align="center">
                              <IconButton size="small" color="primary" onClick={() => { setTypeForm({ id: t.id, name: t.name, brand_id: t.brand_id ? String(t.brand_id) : '', description: t.description || '' }); setOpenTypeModal(true); }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => setDeleteMasterDialog({ open: true, type: 'type', id: t.id, name: t.name })}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            )}
          </Box>
        )}
      </Paper>

      {/* ========================================================
          MODAL: TAMBAH / EDIT MASTER BARANG
      ======================================================== */}
      <Dialog open={openItemModal} onClose={() => setOpenItemModal(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSaveItem}>
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {editingItem ? `Edit Barang: ${editingItem.name}` : 'Tambah Master Barang Baru'}
            <IconButton size="small" onClick={() => setOpenItemModal(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="ID Barang (Kode Unik)"
                  value={itemForm.item_code}
                  onChange={(e) => setItemForm({ ...itemForm, item_code: e.target.value })}
                  helperText="Contoh: BRG-202611-001"
                  InputProps={{
                    endAdornment: !editingItem && (
                      <InputAdornment position="end">
                        <Button size="small" onClick={handleGenerateCode} disabled={generatingCode}>
                          Auto
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Nama Barang"
                  placeholder="Misal: Radio Rig Motorola DM4600"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Serial Number (SN)"
                  placeholder="SN / Nomor Seri pabrikan"
                  value={itemForm.serial_number}
                  onChange={(e) => setItemForm({ ...itemForm, serial_number: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Jenis Barang</InputLabel>
                  <Select
                    value={itemForm.category_id}
                    label="Jenis Barang"
                    onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                  >
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Merk</InputLabel>
                  <Select
                    value={itemForm.brand_id}
                    label="Merk"
                    onChange={(e) => {
                      setItemForm({ ...itemForm, brand_id: e.target.value, type_id: '' });
                    }}
                  >
                    <MenuItem value="">-- Tidak Dipilih --</MenuItem>
                    {brands.map((b) => (
                      <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipe / Model</InputLabel>
                  <Select
                    value={itemForm.type_id}
                    label="Tipe / Model"
                    onChange={(e) => setItemForm({ ...itemForm, type_id: e.target.value })}
                  >
                    <MenuItem value="">-- Tidak Dipilih --</MenuItem>
                    {filteredTypesByBrand(itemForm.brand_id).map((t) => (
                      <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Lokasi Barang</InputLabel>
                  <Select
                    value={itemForm.current_location_id}
                    label="Lokasi Barang"
                    onChange={(e) => {
                      setItemForm({
                        ...itemForm,
                        current_location_id: e.target.value,
                        current_pic_id: '', // Reset PIC when location changes!
                      });
                    }}
                  >
                    {locations.map((loc) => (
                      <MenuItem key={loc.id} value={String(loc.id)}>{loc.name}</MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Pilih lokasi fisik tempat barang berada</FormHelperText>
                </FormControl>
              </Grid>

              {/* DYNAMIC PIC DROPDOWN: Bound to Location */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!itemForm.current_location_id}>
                  <InputLabel>PIC Terkait (Otomatis Filter Lokasi)</InputLabel>
                  <Select
                    value={itemForm.current_pic_id}
                    label="PIC Terkait (Otomatis Filter Lokasi)"
                    onChange={(e) => setItemForm({ ...itemForm, current_pic_id: e.target.value })}
                  >
                    <MenuItem value="">-- Tidak Ada PIC (Standby di Ruang IT) --</MenuItem>
                    {filteredItemPics.map((p) => (
                      <MenuItem key={p.id} value={String(p.id)}>
                        {p.name} {p.department ? `(${p.department})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {itemForm.current_location_id ? (
                      filteredItemPics.length > 0
                        ? `Ditemukan ${filteredItemPics.length} PIC di ${locations.find((l) => l.id === parseInt(itemForm.current_location_id, 10))?.name}`
                        : 'Belum ada PIC terdaftar di lokasi ini. (Bisa kosong)'
                    ) : (
                      'Pilih lokasi barang terlebih dahulu'
                    )}
                  </FormHelperText>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Kondisi Barang</InputLabel>
                  <Select
                    value={itemForm.condition_status}
                    label="Kondisi Barang"
                    onChange={(e) => setItemForm({ ...itemForm, condition_status: e.target.value as ItemCondition })}
                  >
                    <MenuItem value="Baik">Baik</MenuItem>
                    <MenuItem value="Rusak">Rusak</MenuItem>
                    <MenuItem value="Hilang">Hilang</MenuItem>
                    <MenuItem value="Scrap">Scrap</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="Tanggal Masuk"
                  value={itemForm.entry_date}
                  onChange={(e) => setItemForm({ ...itemForm, entry_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Keterangan / Catatan Tambahan"
                  placeholder="Catatan aksesoris, kelengkapan, dll."
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenItemModal(false)}>Batal</Button>
            <Button type="submit" variant="contained" disabled={savingItem} sx={{ fontWeight: 700 }}>
              {savingItem ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Daftarkan Barang'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ========================================================
          MODAL: DETAIL BARANG
      ======================================================== */}
      <Dialog open={detailModalOpen} onClose={() => setDetailModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Detail Barang
          <IconButton size="small" onClick={() => setDetailModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedItemDetail && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>ID BARANG</Typography>
                  <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 800, color: isDark ? '#00ff66' : '#1a237e' }}>
                    {selectedItemDetail.item_code}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>NAMA BARANG</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{selectedItemDetail.name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>SERIAL NUMBER</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedItemDetail.serial_number || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>JENIS BARANG</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedItemDetail.category?.name || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>MERK & TIPE</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedItemDetail.brand?.name || '-'} {selectedItemDetail.type?.name || ''}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>KONDISI</Typography>
                  <Box sx={{ mt: 0.5 }}>{renderConditionChip(selectedItemDetail.condition_status)}</Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>LOKASI BARANG</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{selectedItemDetail.current_location?.name || 'Ruang IT'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>PIC TERKAIT</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{selectedItemDetail.current_pic?.name || '- (Ruang IT)'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>TANGGAL MASUK</Typography>
                  <Typography variant="body1">{formatDate(selectedItemDetail.entry_date)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>TANGGAL UPDATE</Typography>
                  <Typography variant="body1">{formatDate(selectedItemDetail.last_update_date, true)}</Typography>
                </Grid>
                {selectedItemDetail.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>CATATAN</Typography>
                    <Typography variant="body2">{selectedItemDetail.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailModalOpen(false)}>Tutup</Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================
          MODAL: HAPUS BARANG CONFIRMATION
      ======================================================== */}
      <Dialog open={deleteItemDialog.open} onClose={() => setDeleteItemDialog({ open: false, item: null })}>
        <DialogTitle sx={{ fontWeight: 800 }}>Hapus Barang?</DialogTitle>
        <DialogContent>
          <Typography>
            Apakah Anda yakin ingin menghapus barang <strong>{deleteItemDialog.item?.name}</strong> (ID: {deleteItemDialog.item?.item_code})?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteItemDialog({ open: false, item: null })}>Batal</Button>
          <Button color="error" variant="contained" onClick={handleDeleteItem} sx={{ fontWeight: 700 }}>
            Hapus Permanen
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================
          MODAL MASTER: LOKASI
      ======================================================== */}
      <Dialog open={openLocModal} onClose={() => setOpenLocModal(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSaveLocation}>
          <DialogTitle sx={{ fontWeight: 800 }}>{locForm.id ? 'Edit Lokasi' : 'Tambah Lokasi Barang'}</DialogTitle>
          <DialogContent dividers>
            <TextField
              fullWidth
              required
              label="Nama Lokasi"
              placeholder="Misal: EMCC, PLANT, WORKSHOP"
              value={locForm.name}
              onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Keterangan Lokasi"
              placeholder="Deskripsi area/pos"
              value={locForm.description}
              onChange={(e) => setLocForm({ ...locForm, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenLocModal(false)}>Batal</Button>
            <Button type="submit" variant="contained" sx={{ fontWeight: 700 }}>Simpan</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ========================================================
          MODAL MASTER: PIC (DENGAN PILIHAN LOKASI TERKAIT)
      ======================================================== */}
      <Dialog open={openPicModal} onClose={() => setOpenPicModal(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSavePic}>
          <DialogTitle sx={{ fontWeight: 800 }}>{picForm.id ? 'Edit PIC' : 'Tambah PIC Baru'}</DialogTitle>
          <DialogContent dividers>
            <TextField
              fullWidth
              required
              label="Nama PIC"
              placeholder="Misal: Tono / Vika"
              value={picForm.name}
              onChange={(e) => setPicForm({ ...picForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth required sx={{ mb: 2 }}>
              <InputLabel>Lokasi Penugasan PIC</InputLabel>
              <Select
                value={picForm.location_id}
                label="Lokasi Penugasan PIC"
                onChange={(e) => setPicForm({ ...picForm, location_id: e.target.value })}
              >
                {locations.map((loc) => (
                  <MenuItem key={loc.id} value={String(loc.id)}>{loc.name}</MenuItem>
                ))}
              </Select>
              <FormHelperText>PIC ini akan otomatis muncul saat memilih lokasi tersebut</FormHelperText>
            </FormControl>
            <TextField
              fullWidth
              label="No. Telepon / WhatsApp"
              placeholder="08123456789"
              value={picForm.phone}
              onChange={(e) => setPicForm({ ...picForm, phone: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Departemen / Jabatan"
              placeholder="Misal: Supervisor / Operator"
              value={picForm.department}
              onChange={(e) => setPicForm({ ...picForm, department: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenPicModal(false)}>Batal</Button>
            <Button type="submit" variant="contained" sx={{ fontWeight: 700 }}>Simpan</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ========================================================
          MODAL MASTER: JENIS BARANG (KATEGORI)
      ======================================================== */}
      <Dialog open={openCatModal} onClose={() => setOpenCatModal(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSaveCategory}>
          <DialogTitle sx={{ fontWeight: 800 }}>{catForm.id ? 'Edit Jenis Barang' : 'Tambah Jenis Barang'}</DialogTitle>
          <DialogContent dividers>
            <TextField
              fullWidth
              required
              label="Nama Jenis Barang"
              placeholder="Misal: Radio Rig, Dashcam, Laptop"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Deskripsi"
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCatModal(false)}>Batal</Button>
            <Button type="submit" variant="contained" sx={{ fontWeight: 700 }}>Simpan</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ========================================================
          MODAL MASTER: MERK
      ======================================================== */}
      <Dialog open={openBrandModal} onClose={() => setOpenBrandModal(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSaveBrand}>
          <DialogTitle sx={{ fontWeight: 800 }}>{brandForm.id ? 'Edit Merk' : 'Tambah Merk'}</DialogTitle>
          <DialogContent dividers>
            <TextField
              fullWidth
              required
              label="Nama Merk"
              placeholder="Misal: Motorola, Hytera, Hikvision"
              value={brandForm.name}
              onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Deskripsi"
              value={brandForm.description}
              onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBrandModal(false)}>Batal</Button>
            <Button type="submit" variant="contained" sx={{ fontWeight: 700 }}>Simpan</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ========================================================
          MODAL MASTER: TIPE / MODEL
      ======================================================== */}
      <Dialog open={openTypeModal} onClose={() => setOpenTypeModal(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSaveType}>
          <DialogTitle sx={{ fontWeight: 800 }}>{typeForm.id ? 'Edit Tipe' : 'Tambah Tipe / Model'}</DialogTitle>
          <DialogContent dividers>
            <TextField
              fullWidth
              required
              label="Nama Tipe / Model"
              placeholder="Misal: DM4600, Latitude 5420"
              value={typeForm.name}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Merk Terkait</InputLabel>
              <Select
                value={typeForm.brand_id}
                label="Merk Terkait"
                onChange={(e) => setTypeForm({ ...typeForm, brand_id: e.target.value })}
              >
                <MenuItem value="">-- Tidak Terikat Merk Khusus --</MenuItem>
                {brands.map((b) => (
                  <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Deskripsi / Catatan"
              value={typeForm.description}
              onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenTypeModal(false)}>Batal</Button>
            <Button type="submit" variant="contained" sx={{ fontWeight: 700 }}>Simpan</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ========================================================
          MODAL: HAPUS MASTER ITEM CONFIRMATION
      ======================================================== */}
      <Dialog open={deleteMasterDialog.open} onClose={() => setDeleteMasterDialog({ open: false, type: 'location', id: 0, name: '' })}>
        <DialogTitle sx={{ fontWeight: 800 }}>Hapus Data Master?</DialogTitle>
        <DialogContent>
          <Typography>
            Apakah Anda yakin ingin menghapus data master <strong>{deleteMasterDialog.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteMasterDialog({ open: false, type: 'location', id: 0, name: '' })}>Batal</Button>
          <Button color="error" variant="contained" onClick={handleDeleteMaster} sx={{ fontWeight: 700 }}>
            Hapus
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryManagement;
