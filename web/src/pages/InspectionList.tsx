import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
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
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Chip,
  Pagination,
  Grid,
  Paper,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Print as PrintIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  AssignmentTurnedIn as InspectIcon,
  CheckCircle as OkIcon,
  Warning as AlertIcon,
  Close as CloseIcon,
  FileDownload as ExcelIcon,
  PhotoCamera as PhotoIcon,
  FileUpload as UploadIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Description as TemplateIcon,
  Radio as RadioIcon,
  Videocam as CameraIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../api';
import { UnitInspection } from '../types';
import { useAppTheme } from '../ThemeContext';

export const InspectionList: React.FC = () => {
  const navigate = useNavigate();
  const { mode } = useAppTheme();
  const isDark = mode === 'dark';

  const [inspections, setInspections] = useState<UnitInspection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const limit = 25;

  const [dateFilter, setDateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const [stats, setStats] = useState({ total: 0, open: 0, close: 0 });

  // Modal Detail & Foto Preview
  const [detailModal, setDetailModal] = useState<{ open: boolean; item: UnitInspection | null }>({
    open: false,
    item: null,
  });

  // Modal Print Form Resmi
  const [printModal, setPrintModal] = useState<{ open: boolean; date: string; items: UnitInspection[] }>({
    open: false,
    date: '',
    items: [],
  });

  // Modal Delete
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item: UnitInspection | null }>({
    open: false,
    item: null,
  });
  const [deleting, setDeleting] = useState<boolean>(false);

  // Modal & State Import Excel
  const [importModal, setImportModal] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchInspections = async (targetPage = page) => {
    try {
      setLoading(true);
      const params: any = {
        page: targetPage,
        limit,
      };
      if (dateFilter && dateFilter !== 'all') params.date = dateFilter;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (search && search.trim()) params.search = search.trim();

      const res = await api.get('/inspections', { params });
      setInspections(res.data.items || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
      if (res.data.stats) setStats(res.data.stats);
      if (res.data.availableDates) setAvailableDates(res.data.availableDates);
    } catch (err) {
      console.error('Gagal mengambil data inspeksi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections(1);
  }, [dateFilter, statusFilter]);

  const handleDelete = async () => {
    if (!deleteModal.item) return;
    try {
      setDeleting(true);
      await api.delete(`/inspections/${deleteModal.item.id}`);
      setDeleteModal({ open: false, item: null });
      fetchInspections(page);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus data inspeksi');
    } finally {
      setDeleting(false);
    }
  };

  // Helper format tanggal resmi Indonesia (contoh: 24 November 2026)
  const formatFormalDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = clean.split('-');
    if (parts.length !== 3) return clean;
    const [y, m, d] = parts;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${parseInt(d, 10)} ${monthName} ${y}`;
  };

  // Buka Modal Cetak Form Standar PT LANCAR JAYA MITRA ABADI
  const handleOpenPrint = async () => {
    // Tanggal aktif yang dipilih atau tanggal dari baris pertama data inspeksi yang sedang aktif
    const activeDate = (dateFilter !== 'all' 
      ? dateFilter 
      : (inspections[0]?.inspection_date || availableDates[0] || new Date().toISOString())
    ).split('T')[0];

    try {
      // Ambil data inspeksi lengkap
      const res = await api.get('/inspections', {
        params: {
          date: dateFilter !== 'all' ? activeDate : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search.trim() || undefined,
          all: true,
        },
      });

      const fetchedItems = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.items && Array.isArray(res.data.items) ? res.data.items : []);
      const itemsToPrint = fetchedItems.length > 0 ? fetchedItems : (inspections.length > 0 ? inspections : []);

      setPrintModal({
        open: true,
        date: activeDate,
        items: itemsToPrint,
      });
    } catch (err) {
      console.error('Gagal memuat data print:', err);
      // Fallback langsung menggunakan data yang ada di tabel saat ini
      setPrintModal({
        open: true,
        date: activeDate,
        items: inspections && inspections.length > 0 ? inspections : [],
      });
    }
  };

  // Export ke Excel format resmi PT LANCAR JAYA MITRA ABADI (sesuai contoh.xlsx Sheet 1)
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      const activeDate = dateFilter !== 'all' ? dateFilter.split('T')[0] : '';
      const res = await api.get('/inspections/export-excel', {
        params: {
          date: activeDate || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search.trim() || undefined,
        },
        responseType: 'blob',
      });

      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      if (blob.type === 'application/json') {
        const errText = await blob.text();
        console.error('Export error JSON from server:', errText);
        alert('Gagal mengunduh file Excel: ' + errText);
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const downloadName = activeDate
        ? `Form_Inspeksi_ELMA_${activeDate}.xlsx`
        : `Form_Inspeksi_ELMA_Semua.xlsx`;
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
        window.URL.revokeObjectURL(url);
      }, 500);
    } catch (e) {
      console.error('Gagal export excel dari backend:', e);
      alert('Gagal mengekspor file Excel resmi dari server. Silakan periksa koneksi atau coba lagi.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Helper memformat tanggal dari file Excel
  const formatExcelDate = (raw: any): string => {
    if (!raw) return new Date().toISOString().split('T')[0];
    if (typeof raw === 'number') {
      const jsDate = new Date(Math.round((raw - 25569) * 86400 * 1000));
      return jsDate.toISOString().split('T')[0];
    }
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const parts = s.split(/[\/\-\.]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    return s || new Date().toISOString().split('T')[0];
  };

  // Download Template Excel resmi untuk Import
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Template Inspeksi
    const tplData: any[][] = [
      ['', '', '', 'PT LANCAR JAYA MITRA ABADI', '', '', '', '', '', '', '', '', '', '', 'ELMA IV-BEK-GA-046.04'],
      ['', '', '', 'TEMPLATE IMPORT INSPEKSI RADIO RIG, CAMERA CABIN, CAMERA FATIQUE', '', '', '', '', '', '', '', '', '', '', 'REV 04, 2025-09-01'],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'HAL 1 DARI 1'],
      [],
      [
        'NO.',
        'SITE ( LOKASI )',
        'JENIS',
        'NOMOR LAMBUNG',
        'NOMOR LAMBUNG LAMA',
        'MERK',
        'MODEL/TYPE',
        'Foto barang di unit',
        'NAMA BARANG',
        'Ada/layak',
        'Tidak ada',
        'Keterangan untuk kondisi barang',
        'Open',
        'Close',
        'Tgl Inspeksi',
        'Ttd penanggung jawab',
      ],
      // Contoh 1: Unit 844 (Close / Normal)
      [
        '(Contoh 1)', 'BEK / BIANGAN', 'PM', '844', '', 'MERCEDES BENZ', 'ACTROS 4048 S 6X4 A/T', '', '1. Radio rig', 'v', '', 'OK', '', '1', '2025-10-03', 'Twom',
      ],
      [
        '', '', '', '', '', '', '', '', '2. Camera cabin', 'v', '', 'OK', '', '', '', '',
      ],
      [
        '', '', '', '', '', '', '', '', '3. Camera fatique', 'v', '', 'OK', '', '', '', '',
      ],
      // Contoh 2: Unit 847 (Open / Ada Kendala Kamera)
      [
        '(Contoh 2)', 'BEK / BIANGAN', 'PM', '847', '', 'MERCEDES BENZ', 'ACTROS 4048 S 6X4 A/T', '', '1. Radio rig', 'v', '', 'OK', '1', '', '2025-10-03', 'Twom',
      ],
      [
        '', '', '', '', '', '', '', '', '2. Camera cabin', '', 'v', 'Kamera Rusak', '', '', '', '',
      ],
      [
        '', '', '', '', '', '', '', '', '3. Camera fatique', '', 'v', 'Kabel Putus', '', '', '', '',
      ],
      // Baris Siap Diisi Pengguna:
      [
        '', 'BEK / BIANGAN', 'PM', '848', '', 'MERCEDES BENZ', 'ACTROS 4048 S 6X4 A/T', '', '1. Radio rig', 'v', '', 'OK', '', '1', new Date().toISOString().split('T')[0], 'Twom',
      ],
      [
        '', '', '', '', '', '', '', '', '2. Camera cabin', 'v', '', 'OK', '', '', '', '',
      ],
      [
        '', '', '', '', '', '', '', '', '3. Camera fatique', 'v', '', 'OK', '', '', '', '',
      ],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(tplData);
    ws1['!cols'] = [
      { wch: 10 }, // NO
      { wch: 18 }, // SITE
      { wch: 8 },  // JENIS
      { wch: 16 }, // NO LAMBUNG
      { wch: 20 }, // NO LAMA
      { wch: 18 }, // MERK
      { wch: 26 }, // MODEL
      { wch: 18 }, // FOTO
      { wch: 20 }, // NAMA BARANG
      { wch: 12 }, // ADA/LAYAK
      { wch: 12 }, // TIDAK ADA
      { wch: 32 }, // KETERANGAN
      { wch: 8 },  // OPEN
      { wch: 8 },  // CLOSE
      { wch: 14 }, // TGL
      { wch: 22 }, // TTD
    ];

    // Sheet 2: Petunjuk Pengisian
    const guideData: any[][] = [
      ['PANDUAN & PETUNJUK PENGISIAN TEMPLATE IMPORT INSPEKSI UNIT'],
      ['PT LANCAR JAYA MITRA ABADI - ELMA IV-BEK-GA-046.04 REV 04'],
      [],
      ['KOLOM / FIELD', 'PETUNJUK PENGISIAN', 'CONTOH NILAI'],
      ['NOMOR LAMBUNG', 'Wajib diisi pada baris pertama setiap unit kendaraan.', '844, 847, 850'],
      ['NAMA BARANG', 'Setiap unit diisi dalam 3 baris berturut-turut:', '1. Radio rig, 2. Camera cabin, 3. Camera fatique'],
      ['Kondisi: Ada/layak', 'Isi "v" atau "1" jika barang ada dan berfungsi normal.', 'v'],
      ['Kondisi: Tidak ada', 'Isi "v" atau "1" jika barang tidak ada atau rusak.', 'v'],
      ['Keterangan', 'Keterangan kondisi fisik/fungsi barang.', 'OK, Antena Rusak, Kabel Putus, dll.'],
      ['Status Inspeksi', 'Isi "1" atau "v" pada Close (jika normal) atau Open (jika ada temuan).', 'Close / Open'],
      ['Tgl Inspeksi', 'Format tanggal YYYY-MM-DD atau DD/MM/YYYY.', '2025-10-03'],
      ['Petugas IT', 'Nama personil IT penanggung jawab inspeksi.', 'Twom / Ali'],
      [],
      ['CATATAN:'],
      ['1. Anda juga dapat langsung mengupload file Summary Inspeksi resmi yang sudah berjalan.'],
      ['2. Sistem otomatis mengenali format 3 baris per unit maupun format tabel ringkas.'],
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(guideData);
    ws2['!cols'] = [{ wch: 22 }, { wch: 60 }, { wch: 45 }];

    XLSX.utils.book_append_sheet(wb, ws1, 'Template Inspeksi');
    XLSX.utils.book_append_sheet(wb, ws2, 'Petunjuk Pengisian');

    XLSX.writeFile(wb, 'TEMPLATE_IMPORT_INSPEKSI_UNIT.xlsx');
  };

  // Parsing file Excel yang diunggah
  const handleFileSelect = (file: File) => {
    setImportFile(file);
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });

        let sheetName = wb.SheetNames[0];
        const preferredSheets = ['contoh', 'template', 'summary', 'inspeksi'];
        for (const pref of preferredSheets) {
          const found = wb.SheetNames.find((s) => s.toLowerCase().includes(pref));
          if (found) {
            sheetName = found;
            break;
          }
        }

        const ws = wb.Sheets[sheetName];
        if (!ws) {
          setImportError('Sheet tidak ditemukan dalam file Excel');
          return;
        }

        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const parsedResults: any[] = [];
        let currentUnit: any = null;

        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const colUnitVal = row[3] !== undefined && row[3] !== '' ? String(row[3]).trim() : '';
          const colItemName = (row[9] ? String(row[9]) : (row[8] ? String(row[8]) : '')).trim().toLowerCase();

          const isRadio = colItemName.includes('radio');
          const isCabin = colItemName.includes('cabin');
          const isFatigue = colItemName.includes('fati') || colItemName.includes('fatigue');

          const isNewUnitHeader = colUnitVal && !colUnitVal.toLowerCase().includes('lambung') && !colUnitVal.toLowerCase().includes('unit');

          if (isNewUnitHeader) {
            if (currentUnit) {
              parsedResults.push(currentUnit);
            }
            currentUnit = {
              unit_number: colUnitVal.replace(/[^a-zA-Z0-9_\-]/g, ''),
              site_location: row[1] ? String(row[1]).trim() : 'BEK / BIANGAN',
              inspection_type: row[2] ? String(row[2]).trim() : 'PM',
              old_unit_number: row[4] ? String(row[4]).trim() : '',
              vehicle_brand: row[5] ? String(row[5]).trim() : '',
              vehicle_model: row[6] ? String(row[6]).trim() : '',
              radio_status: 'Ada/layak',
              radio_notes: '',
              camera_cabin_status: 'Ada/layak',
              camera_cabin_notes: '',
              camera_fatigue_status: 'Ada/layak',
              camera_fatigue_notes: '',
              inspection_status: 'Close',
              inspection_date: formatExcelDate(row[15] || row[14]),
              inspector_name: row[16] || row[15] ? String(row[16] || row[15]).trim() : 'Twom',
            };
          }

          if (currentUnit) {
            const adaVal = String(row[10] || row[9] || '').toLowerCase().trim();
            const tdkVal = String(row[11] || row[10] || '').toLowerCase().trim();
            const ket = String(row[12] || row[11] || '').trim();
            const openVal = String(row[13] || '').trim().toLowerCase();
            const closeVal = String(row[14] || '').trim().toLowerCase();

            if (openVal === '1' || openVal === 'v' || openVal === 'open') {
              currentUnit.inspection_status = 'Open';
            }

            if (isRadio) {
              if (tdkVal === 'v' || tdkVal === '1' || adaVal === 'tidak ada' || adaVal === 'rusak') {
                currentUnit.radio_status = 'Tidak ada';
                currentUnit.inspection_status = 'Open';
              } else {
                currentUnit.radio_status = 'Ada/layak';
              }
              if (ket && ket !== 'OK') currentUnit.radio_notes = ket;
            } else if (isCabin) {
              if (tdkVal === 'v' || tdkVal === '1' || adaVal === 'tidak ada' || adaVal === 'rusak') {
                currentUnit.camera_cabin_status = 'Tidak ada';
                currentUnit.inspection_status = 'Open';
              } else {
                currentUnit.camera_cabin_status = 'Ada/layak';
              }
              if (ket && ket !== 'OK') currentUnit.camera_cabin_notes = ket;
            } else if (isFatigue) {
              if (tdkVal === 'v' || tdkVal === '1' || adaVal === 'tidak ada' || adaVal === 'rusak') {
                currentUnit.camera_fatigue_status = 'Tidak ada';
                currentUnit.inspection_status = 'Open';
              } else {
                currentUnit.camera_fatigue_status = 'Ada/layak';
              }
              if (ket && ket !== 'OK') currentUnit.camera_fatigue_notes = ket;
            }
          }
        }

        if (currentUnit) {
          parsedResults.push(currentUnit);
        }

        const cleanResults = parsedResults.filter(
          (u) => u.unit_number && !u.unit_number.toLowerCase().includes('contoh') && !u.unit_number.toLowerCase().includes('isi')
        );

        if (cleanResults.length === 0) {
          setImportError('Tidak ditemukan baris data inspeksi unit yang valid pada sheet "' + sheetName + '"');
          setImportPreview([]);
        } else {
          setImportPreview(cleanResults);
        }
      } catch (err: any) {
        console.error('Error parsing excel:', err);
        setImportError('Gagal membaca file Excel: ' + (err.message || 'Format tidak dikenali'));
        setImportPreview([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Simpan data hasil import ke database
  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    try {
      setImportLoading(true);
      setImportError(null);
      const res = await api.post('/inspections/bulk', { items: importPreview });
      setImportSuccess(res.data.message || `Berhasil mengimport ${importPreview.length} data inspeksi`);
      setTimeout(() => {
        setImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImportSuccess(null);
        fetchInspections(1);
      }, 1200);
    } catch (err: any) {
      console.error('Gagal import inspeksi bulk:', err);
      setImportError(err.response?.data?.message || 'Gagal menyimpan data import ke database');
    } finally {
      setImportLoading(false);
    }
  };

  const cardBg = isDark ? '#0d1929' : '#ffffff';
  const textTitle = isDark ? '#ffd600' : '#1e3a8a';
  const sectionBorder = isDark ? '1px solid #1e293b' : '1px solid #e2e8f0';

  return (
    <Box className="no-print" sx={{ maxWidth: 1400, mx: 'auto', pb: 6 }}>
      {/* Header Halaman */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: textTitle, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InspectIcon sx={{ color: isDark ? '#ffd600' : '#2563eb' }} />
            Rekap Inspeksi Unit
          </Typography>
          <Typography variant="caption" sx={{ color: isDark ? '#cbd5e1' : '#64748b' }}>
            Formulir Standar: ELMA IV-BEK-GA-046.04 REV 04 (Radio Rig, Camera Cabin, Camera Fatigue)
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handleOpenPrint}
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              px: 2,
              py: 0.8,
              borderColor: isDark ? '#ffd600' : '#2563eb',
              color: isDark ? '#ffd600' : '#2563eb',
              bgcolor: isDark ? 'rgba(255, 214, 0, 0.05)' : '#eff6ff',
              '&:hover': {
                bgcolor: isDark ? 'rgba(255, 214, 0, 0.15)' : '#dbeafe',
                borderColor: isDark ? '#ffd600' : '#1d4ed8',
              },
            }}
          >
            Cetak Form Resmi (PDF/Print)
          </Button>

          <Button
            variant="contained"
            disabled={exportingExcel}
            startIcon={exportingExcel ? <CircularProgress size={18} color="inherit" /> : <ExcelIcon />}
            onClick={handleExportExcel}
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              px: 2,
              py: 0.8,
              bgcolor: '#16a34a',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
              '&:hover': {
                bgcolor: '#15803d',
              },
            }}
          >
            {exportingExcel ? 'Mengekspor Excel...' : 'Export ke Excel (.xlsx)'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              px: 2,
              py: 0.8,
              borderColor: isDark ? '#10b981' : '#059669',
              color: isDark ? '#10b981' : '#059669',
              bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ecfdf5',
              '&:hover': {
                bgcolor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5',
                borderColor: isDark ? '#34d399' : '#047857',
              },
            }}
          >
            Template Import Excel (.xlsx)
          </Button>

          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => {
              setImportFile(null);
              setImportPreview([]);
              setImportError(null);
              setImportSuccess(null);
              setImportModal(true);
            }}
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              px: 2,
              py: 0.8,
              bgcolor: '#0284c7',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
              '&:hover': {
                bgcolor: '#0369a1',
              },
            }}
          >
            Import Excel (.xlsx)
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/inspections/create')}
            sx={{
              fontWeight: 800,
              textTransform: 'none',
              borderRadius: 2,
              px: 2.5,
              py: 0.8,
              bgcolor: isDark ? '#ffd600' : '#1e3a8a',
              color: isDark ? '#000000' : '#ffffff',
              boxShadow: isDark ? 'none' : '0 2px 8px rgba(30, 58, 138, 0.25)',
              '&:hover': {
                bgcolor: isDark ? '#e6c200' : '#172554',
              },
            }}
          >
            + Tambah Inspeksi Baru
          </Button>
        </Box>
      </Box>

      {/* Tab Navigasi Tambah dan Rekap */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, borderBottom: sectionBorder, pb: 1 }}>
        <Button
          variant="contained"
          startIcon={<InspectIcon />}
          sx={{
            fontWeight: 800,
            textTransform: 'none',
            bgcolor: isDark ? '#ffd600' : '#2563eb',
            color: isDark ? '#000000' : '#ffffff',
            borderRadius: 2,
            px: 2.5,
          }}
        >
          Rekap Inspeksi
        </Button>
        <Button
          variant="text"
          startIcon={<AddIcon />}
          onClick={() => navigate('/inspections/create')}
          sx={{
            fontWeight: 700,
            textTransform: 'none',
            color: isDark ? '#94a3b8' : '#64748b',
            borderRadius: 2,
            px: 2.5,
            '&:hover': {
              bgcolor: isDark ? 'rgba(255, 214, 0, 0.08)' : '#eff6ff',
              color: isDark ? '#ffd600' : '#2563eb',
            },
          }}
        >
          Tambah Inspeksi
        </Button>
      </Box>

      {/* Widget Statistik Ringkas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: cardBg, border: sectionBorder, borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: isDark ? '#cbd5e1' : '#64748b', fontWeight: 600 }}>
                TOTAL INSPEKSI TERCATAT
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#1e293b', mt: 0.5 }}>
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: cardBg, border: sectionBorder, borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: isDark ? '#4ade80' : '#16a34a', fontWeight: 600 }}>
                STATUS CLOSE (NORMAL / SELESAI)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: isDark ? '#4ade80' : '#16a34a', mt: 0.5 }}>
                {stats.close}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: cardBg, border: sectionBorder, borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: isDark ? '#f87171' : '#dc2626', fontWeight: 600 }}>
                STATUS OPEN (TEMUAN GANGGUAN)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: isDark ? '#f87171' : '#dc2626', mt: 0.5 }}>
                {stats.open}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <Card sx={{ mb: 3, p: 2, bgcolor: cardBg, border: sectionBorder, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Pilih Tanggal Inspeksi"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <MenuItem value="all">-- Semua Tanggal --</MenuItem>
              {availableDates.map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Status Inspeksi"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">Semua Status</MenuItem>
              <MenuItem value="Close">Close (Normal)</MenuItem>
              <MenuItem value="Open">Open (Ada Kendala)</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Cari Nomor Unit, Merk, atau Catatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchInspections(1);
              }}
            />
          </Grid>

          <Grid item xs={12} sm={1} sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={() => fetchInspections(1)} color="primary" sx={{ border: sectionBorder }}>
              <SearchIcon />
            </IconButton>
            <IconButton onClick={() => { setDateFilter('all'); setStatusFilter('all'); setSearch(''); }} sx={{ border: sectionBorder }}>
              <RefreshIcon />
            </IconButton>
          </Grid>
        </Grid>
      </Card>

      {/* Tabel Summary Data Inspeksi */}
      <Card sx={{ borderRadius: 2, bgcolor: cardBg, border: sectionBorder, overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2} sx={{ fontWeight: 800, textAlign: 'center', width: 45 }}>NO.</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 800 }}>SITE (LOKASI)</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 800 }}>JENIS</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 800 }}>NOMOR LAMBUNG</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 800 }}>MERK & MODEL/TYPE</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 800, textAlign: 'center', width: 50 }}>FOTO</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 800, minWidth: 160 }}>NAMA BARANG</TableCell>
                <TableCell colSpan={2} align="center" sx={{ fontWeight: 800, borderBottom: '1px solid rgba(226, 232, 240, 0.4)' }}>KONDISI BARANG</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 800, minWidth: 120 }}>KETERANGAN</TableCell>
                <TableCell colSpan={2} align="center" sx={{ fontWeight: 800, borderBottom: '1px solid rgba(226, 232, 240, 0.4)' }}>STATUS INSPEKSI</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 800 }}>TGL INSPEKSI</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 800 }}>PETUGAS IT</TableCell>
                <TableCell rowSpan={2} align="center" sx={{ fontWeight: 800, width: 80 }}>AKSI</TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', py: 0.5, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>Ada/layak</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', py: 0.5, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>Tidak ada</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', py: 0.5, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>Open</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', py: 0.5, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>Close</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={14} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" sx={{ mt: 1, color: isDark ? '#cbd5e1' : '#64748b' }}>
                      Memuat rekap inspeksi...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : inspections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} align="center" sx={{ py: 6 }}>
                    <InspectIcon sx={{ fontSize: 44, color: isDark ? '#ffd600' : '#94a3b8', mb: 1 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600, color: isDark ? '#ffffff' : '#64748b' }}>
                      Belum ada data inspeksi untuk filter yang dipilih
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/inspections/create')}
                      sx={{ mt: 1, fontWeight: 700 }}
                    >
                      Tambah Inspeksi Pertama
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                inspections.map((row, idx) => {
                  const no = (page - 1) * limit + idx + 1;
                  const isRadioOk = row.radio_status === 'Ada/layak';
                  const isCameraOk = (row.camera_status || row.camera_cabin_status) === 'Ada/layak';
                  const isOpen = row.inspection_status === 'Open';
                  const isClose = row.inspection_status === 'Close';
                  const unitBorderBottom = isDark ? '2.5px solid rgba(255, 255, 255, 0.22)' : '2.5px solid #94a3b8';
                  const rowBorder = isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(226, 232, 240, 0.8)';
                  const subBorder = isDark ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(241, 245, 249, 1)';
                  const groupBorder = isDark ? '1.5px solid rgba(255, 255, 255, 0.12)' : '1.5px solid rgba(203, 213, 225, 0.9)';

                  // Sub items radio (1.1 - 1.4)
                  const radioItems = [
                    { num: '1.1', name: 'Kelistrikan', ok: (row.radio_kelistrikan || (isRadioOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { num: '1.2', name: 'Antena',      ok: (row.radio_antena || (isRadioOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { num: '1.3', name: 'Kabel',       ok: (row.radio_kabel || (isRadioOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { num: '1.4', name: 'Chanel',      ok: (row.radio_chanel || (isRadioOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                  ];

                  // Sub items kamera (2.1 - 2.8)
                  const cameraItems = [
                    { num: '2.1', name: 'Kelistrikan', ok: (row.camera_kelistrikan || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { num: '2.2', name: 'Posisi',      ok: (row.camera_posisi || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { num: '2.3', name: 'Internet',    ok: (row.camera_internet || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { num: '2.4', name: 'GPS',         ok: (row.camera_gps || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { num: '2.5', name: 'Dascam',      ok: (row.camera_dascam || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { num: '2.6', name: 'Kabin',       ok: (row.camera_kabin || row.camera_cabin_status || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { num: '2.7', name: 'Fatigue',     ok: (row.camera_fatigue || row.camera_fatigue_status || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { num: '2.8', name: 'Memcard',     ok: (row.camera_memcard || row.camera_penyimpanan || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                  ];

                  const unitBg = idx % 2 === 0 ? (isDark ? 'rgba(255,255,255,0.015)' : 'rgba(248, 250, 252, 0.7)') : 'inherit';

                  return (
                    <React.Fragment key={row.id}>
                      {/* BARIS 1: Radio 1.1 Kelistrikan (dengan Left columns rowSpan=12) */}
                      <TableRow hover sx={{ bgcolor: unitBg }}>
                        <TableCell rowSpan={12} align="center" sx={{ fontWeight: 800, borderRight: rowBorder, borderBottom: unitBorderBottom }}>
                          {no}
                        </TableCell>
                        <TableCell rowSpan={12} sx={{ borderRight: rowBorder, borderBottom: unitBorderBottom, whiteSpace: 'nowrap' }}>
                          {row.site_location || 'BEK / BIANGAN'}
                        </TableCell>
                        <TableCell rowSpan={12} sx={{ borderRight: rowBorder, borderBottom: unitBorderBottom }}>
                          <Chip label={row.inspection_type || 'PM'} size="small" variant="outlined" sx={{ fontWeight: 700, height: 20, fontSize: '0.65rem' }} />
                        </TableCell>
                        <TableCell rowSpan={12} sx={{ fontWeight: 800, color: isDark ? '#ffd600' : '#1e3a8a', borderRight: rowBorder, borderBottom: unitBorderBottom }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.9rem' }}>
                            {row.unit_number}
                          </Typography>
                          {row.old_unit_number && (
                            <Typography variant="caption" sx={{ display: 'block', color: isDark ? '#cbd5e1' : '#94a3b8', fontSize: '0.68rem' }}>
                              Lama: {row.old_unit_number}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell rowSpan={12} sx={{ borderRight: rowBorder, borderBottom: unitBorderBottom }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                            {row.vehicle_brand || '-'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: isDark ? '#cbd5e1' : '#94a3b8', display: 'block', fontSize: '0.7rem' }}>
                            {row.vehicle_model || '-'}
                          </Typography>
                        </TableCell>

                        {/* Foto Radio Rig (rowSpan=4) */}
                        <TableCell rowSpan={4} align="center" sx={{ borderRight: rowBorder, borderBottom: groupBorder, py: 0.5 }}>
                          {row.radio_photo_url ? (
                            <Tooltip title="Foto Radio Rig (Klik untuk perbesar)">
                              <Box
                                component="img"
                                src={row.radio_photo_url}
                                alt="Foto Radio"
                                onClick={() => setDetailModal({ open: true, item: row })}
                                sx={{ width: 44, height: 44, borderRadius: 1, objectFit: 'cover', cursor: 'pointer', border: '2px solid #16a34a' }}
                              />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>-</Typography>
                          )}
                        </TableCell>

                        {/* NAMA BARANG 1: 1.1 Kelistrikan */}
                        <TableCell sx={{ fontWeight: 700, color: textTitle, py: 0.5, borderBottom: subBorder }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Chip label="1. RADIO RIG" size="small" sx={{ bgcolor: isDark ? 'rgba(22, 163, 74, 0.2)' : '#dcfce7', color: '#16a34a', fontWeight: 800, height: 18, fontSize: '0.65rem' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.78rem' }}>{radioItems[0].num} {radioItems[0].name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.5, borderBottom: subBorder }}>
                          {radioItems[0].ok ? <OkIcon sx={{ color: '#16a34a', fontSize: 18 }} /> : '-'}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.5, borderBottom: subBorder }}>
                          {!radioItems[0].ok ? <CloseIcon sx={{ color: '#dc2626', fontSize: 18 }} /> : '-'}
                        </TableCell>

                        {/* Keterangan Radio (rowSpan=4) */}
                        <TableCell rowSpan={4} sx={{ py: 0.5, fontSize: '0.8rem', borderRight: rowBorder, borderBottom: groupBorder }}>
                          <Chip
                            label={row.radio_notes || (isRadioOk ? 'OK' : 'Rusak / Tdk Ada')}
                            size="small"
                            color={isRadioOk ? 'success' : 'error'}
                            variant={isRadioOk ? 'filled' : 'outlined'}
                            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                          />
                        </TableCell>

                        {/* STATUS INSPEKSI Open (rowSpan=12) */}
                        <TableCell rowSpan={12} align="center" sx={{ borderRight: rowBorder, borderBottom: unitBorderBottom }}>
                          {isOpen ? <Chip label="Open" size="small" sx={{ bgcolor: '#fef08a', color: '#854d0e', fontWeight: 900, height: 24 }} /> : ''}
                        </TableCell>
                        {/* STATUS INSPEKSI Close (rowSpan=12) */}
                        <TableCell rowSpan={12} align="center" sx={{ borderRight: rowBorder, borderBottom: unitBorderBottom }}>
                          {isClose ? <Chip label="Close" size="small" sx={{ bgcolor: '#bbf7d0', color: '#166534', fontWeight: 900, height: 24 }} /> : ''}
                        </TableCell>

                        {/* TGL INSPEKSI (rowSpan=12) */}
                        <TableCell rowSpan={12} sx={{ whiteSpace: 'nowrap', fontWeight: 600, borderRight: rowBorder, borderBottom: unitBorderBottom }}>
                          {row.inspection_date}
                        </TableCell>

                        {/* PETUGAS IT (rowSpan=12) */}
                        <TableCell rowSpan={12} sx={{ borderRight: rowBorder, borderBottom: unitBorderBottom }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                            {row.inspector_name || 'Twom'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: isDark ? '#cbd5e1' : '#94a3b8', fontSize: '0.7rem' }}>
                            {row.inspector_role || 'IT Support'}
                          </Typography>
                          {row.inspector2_name && (
                            <Typography variant="caption" sx={{ display: 'block', color: isDark ? '#ffd600' : '#64748b', fontSize: '0.7rem' }}>
                              & {row.inspector2_name}
                            </Typography>
                          )}
                        </TableCell>

                        {/* AKSI (rowSpan=12) */}
                        <TableCell rowSpan={12} align="center" sx={{ borderBottom: unitBorderBottom, whiteSpace: 'nowrap' }}>
                          <Tooltip title="Lihat Detail Lengkap">
                            <IconButton size="small" onClick={() => setDetailModal({ open: true, item: row })} color="primary">
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Hapus Data">
                            <IconButton size="small" onClick={() => setDeleteModal({ open: true, item: row })} color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>

                      {/* BARIS 2-4: Radio 1.2, 1.3, 1.4 */}
                      {radioItems.slice(1).map((ri, riIdx) => (
                        <TableRow key={`radio-${riIdx}`} hover sx={{ bgcolor: unitBg }}>
                          <TableCell sx={{ py: 0.4, borderBottom: riIdx === 2 ? groupBorder : subBorder }}>
                            <Typography variant="body2" sx={{ pl: 4, fontWeight: 500, fontSize: '0.76rem' }}>
                              {ri.num} {ri.name}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ py: 0.4, borderBottom: riIdx === 2 ? groupBorder : subBorder }}>
                            {ri.ok ? <OkIcon sx={{ color: '#16a34a', fontSize: 18 }} /> : '-'}
                          </TableCell>
                          <TableCell align="center" sx={{ py: 0.4, borderBottom: riIdx === 2 ? groupBorder : subBorder }}>
                            {!ri.ok ? <CloseIcon sx={{ color: '#dc2626', fontSize: 18 }} /> : '-'}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* BARIS 5: Kamera 2.1 Kelistrikan (dengan Foto Kamera rowSpan=8 & Keterangan rowSpan=8) */}
                      <TableRow hover sx={{ bgcolor: unitBg }}>
                        {/* Foto Kamera (rowSpan=8) */}
                        <TableCell rowSpan={8} align="center" sx={{ borderRight: rowBorder, borderBottom: unitBorderBottom, py: 0.5 }}>
                          {row.camera_photo_url ? (
                            <Tooltip title="Foto Kamera & Dascam (Klik untuk perbesar)">
                              <Box
                                component="img"
                                src={row.camera_photo_url}
                                alt="Foto Kamera"
                                onClick={() => setDetailModal({ open: true, item: row })}
                                sx={{ width: 44, height: 44, borderRadius: 1, objectFit: 'cover', cursor: 'pointer', border: '2px solid #2563eb' }}
                              />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>-</Typography>
                          )}
                        </TableCell>

                        {/* NAMA BARANG 2: 2.1 Kelistrikan */}
                        <TableCell sx={{ fontWeight: 700, color: textTitle, py: 0.5, borderBottom: subBorder }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Chip label="2. KAMERA" size="small" sx={{ bgcolor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#dbeafe', color: '#2563eb', fontWeight: 800, height: 18, fontSize: '0.65rem' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.78rem' }}>{cameraItems[0].num} {cameraItems[0].name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.5, borderBottom: subBorder }}>
                          {cameraItems[0].ok ? <OkIcon sx={{ color: '#16a34a', fontSize: 18 }} /> : '-'}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.5, borderBottom: subBorder }}>
                          {!cameraItems[0].ok ? <CloseIcon sx={{ color: '#dc2626', fontSize: 18 }} /> : '-'}
                        </TableCell>

                        {/* Keterangan Kamera (rowSpan=8) */}
                        <TableCell rowSpan={8} sx={{ py: 0.5, fontSize: '0.8rem', borderRight: rowBorder, borderBottom: unitBorderBottom }}>
                          <Chip
                            label={row.camera_notes || row.camera_cabin_notes || (isCameraOk ? 'OK' : 'Rusak / Tdk Ada')}
                            size="small"
                            color={isCameraOk ? 'success' : 'error'}
                            variant={isCameraOk ? 'filled' : 'outlined'}
                            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                          />
                        </TableCell>
                      </TableRow>

                      {/* BARIS 6-12: Kamera 2.2 sampai 2.8 */}
                      {cameraItems.slice(1).map((ci, ciIdx) => {
                        const isLastCamRow = ciIdx === cameraItems.length - 2;
                        return (
                          <TableRow key={`cam-${ciIdx}`} hover sx={{ bgcolor: unitBg }}>
                            <TableCell sx={{ py: 0.4, borderBottom: isLastCamRow ? unitBorderBottom : subBorder }}>
                              <Typography variant="body2" sx={{ pl: 4, fontWeight: 500, fontSize: '0.76rem' }}>
                                {ci.num} {ci.name}
                              </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 0.4, borderBottom: isLastCamRow ? unitBorderBottom : subBorder }}>
                              {ci.ok ? <OkIcon sx={{ color: '#16a34a', fontSize: 18 }} /> : '-'}
                            </TableCell>
                            <TableCell align="center" sx={{ py: 0.4, borderBottom: isLastCamRow ? unitBorderBottom : subBorder }}>
                              {!ci.ok ? <CloseIcon sx={{ color: '#dc2626', fontSize: 18 }} /> : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {total > limit && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderTop: sectionBorder }}>
            <Pagination
              count={Math.ceil(total / limit)}
              page={page}
              onChange={(_, p) => {
                setPage(p);
                fetchInspections(p);
              }}
              color="primary"
            />
          </Box>
        )}
      </Card>

      {/* MODAL DETAIL INSPEKSI */}
      <Dialog
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, item: null })}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: cardBg, borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: textTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Rincian Inspeksi Unit #{detailModal.item?.unit_number}</span>
          <IconButton size="small" onClick={() => setDetailModal({ open: false, item: null })}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: sectionBorder }}>
          {detailModal.item && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Tanggal & Lokasi:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {detailModal.item.inspection_date} ({detailModal.item.site_location} - {detailModal.item.inspection_type})
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Kendaraan:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Unit {detailModal.item.unit_number} - {detailModal.item.vehicle_brand} {detailModal.item.vehicle_model}
                </Typography>
              </Grid>

              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

              {/* Rincian Radio */}
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, bgcolor: isDark ? '#081220' : '#f8fafc', borderRadius: 2, height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: textTitle, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <RadioIcon fontSize="small" sx={{ color: isDark ? '#ffd600' : '#2563eb' }} />
                    1. Rincian Radio Rig
                  </Typography>
                  <Typography variant="body2">Status Kondisi: <strong>{detailModal.item.radio_status}</strong></Typography>
                  <Typography variant="body2">1.1 Kelistrikan: <strong>{detailModal.item.radio_kelistrikan || 'Ada'}</strong></Typography>
                  <Typography variant="body2">1.2 Antena: <strong>{detailModal.item.radio_antena || 'Ada'}</strong></Typography>
                  <Typography variant="body2">1.3 Kabel: <strong>{detailModal.item.radio_kabel || 'Ada'}</strong></Typography>
                  <Typography variant="body2">1.4 Chanel: <strong>{detailModal.item.radio_chanel || 'Ada'}</strong></Typography>
                  {detailModal.item.radio_notes && (
                    <Typography variant="body2" sx={{ mt: 1, color: isDark ? '#ffd600' : '#b45309' }}>
                      Catatan: {detailModal.item.radio_notes}
                    </Typography>
                  )}
                  {detailModal.item.radio_photo_url && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5, fontWeight: 700 }}>
                        Foto Barang di Unit (Radio Rig):
                      </Typography>
                      <Box
                        component="img"
                        src={detailModal.item.radio_photo_url}
                        alt="Foto Radio Rig"
                        sx={{ maxWidth: '100%', maxHeight: 220, borderRadius: 1.5, objectFit: 'contain', border: '2px solid #16a34a' }}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Rincian Kamera & Dascam */}
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, bgcolor: isDark ? '#081220' : '#f8fafc', borderRadius: 2, height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: textTitle, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CameraIcon fontSize="small" sx={{ color: isDark ? '#ffd600' : '#2563eb' }} />
                    2. Rincian Camera & Dascam
                  </Typography>
                  <Typography variant="body2">Status Kondisi: <strong>{detailModal.item.camera_status || detailModal.item.camera_cabin_status || 'Ada/layak'}</strong></Typography>
                  <Typography variant="body2">2.1 Kelistrikan: <strong>{detailModal.item.camera_kelistrikan || 'Ada'}</strong></Typography>
                  <Typography variant="body2">2.2 Posisi: <strong>{detailModal.item.camera_posisi || 'Ada'}</strong></Typography>
                  <Typography variant="body2">2.3 Internet: <strong>{detailModal.item.camera_internet || 'Ada'}</strong></Typography>
                  <Typography variant="body2">2.4 GPS: <strong>{detailModal.item.camera_gps || 'Ada'}</strong></Typography>
                  <Typography variant="body2">2.5 Dascam: <strong>{detailModal.item.camera_dascam || 'Ada'}</strong></Typography>
                  <Typography variant="body2">2.6 Kabin: <strong>{detailModal.item.camera_kabin || detailModal.item.camera_cabin_status || 'Ada'}</strong></Typography>
                  <Typography variant="body2">2.7 Fatigue: <strong>{detailModal.item.camera_fatigue || detailModal.item.camera_fatigue_status || 'Ada'}</strong></Typography>
                  <Typography variant="body2">2.8 Memcard: <strong>{detailModal.item.camera_memcard || detailModal.item.camera_penyimpanan || 'Ada'}</strong></Typography>
                  {(detailModal.item.camera_notes || detailModal.item.camera_cabin_notes || detailModal.item.camera_fatigue_notes) && (
                    <Typography variant="body2" sx={{ mt: 1, color: isDark ? '#ffd600' : '#b45309' }}>
                      Catatan: {detailModal.item.camera_notes || detailModal.item.camera_cabin_notes || detailModal.item.camera_fatigue_notes}
                    </Typography>
                  )}
                  {detailModal.item.camera_photo_url && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5, fontWeight: 700 }}>
                        Foto Barang di Unit (Kamera & Dascam):
                      </Typography>
                      <Box
                        component="img"
                        src={detailModal.item.camera_photo_url}
                        alt="Foto Kamera"
                        sx={{ maxWidth: '100%', maxHeight: 220, borderRadius: 1.5, objectFit: 'contain', border: '2px solid #2563eb' }}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Foto Dokumentasi Umum jika ada & bukan radio/camera */}
              {detailModal.item.photo_url && !detailModal.item.radio_photo_url && !detailModal.item.camera_photo_url && (
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1 }}>
                    Foto Dokumentasi di Unit:
                  </Typography>
                  <Box
                    component="img"
                    src={detailModal.item.photo_url}
                    alt="Foto Dokumentasi Unit"
                    sx={{ maxWidth: '100%', maxHeight: 320, borderRadius: 2, objectFit: 'contain' }}
                  />
                </Grid>
              )}

              {/* Petugas Inspeksi */}
              <Grid item xs={12}>
                <Paper sx={{ p: 1.5, bgcolor: isDark ? '#081220' : '#f1f5f9', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                    Penanggung Jawab Inspeksi:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    1. {detailModal.item.inspector_name} ({detailModal.item.inspector_role})
                  </Typography>
                  {detailModal.item.inspector2_name && (
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      2. {detailModal.item.inspector2_name} ({detailModal.item.inspector2_role})
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailModal({ open: false, item: null })} variant="contained">
            Tutup
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL PRINT RESMI PT LANCAR JAYA MITRA ABADI */}
      <Dialog
        open={printModal.open}
        onClose={() => setPrintModal({ open: false, date: '', items: [] })}
        maxWidth="lg"
        fullWidth
        className="print-preview-modal"
        id="print-preview-dialog"
        PaperProps={{
          id: 'print-preview-paper',
          sx: { bgcolor: '#ffffff !important', color: '#000000 !important', borderRadius: 2 }
        }}
      >
        <DialogTitle className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, bgcolor: '#ffffff', color: '#000000' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#000000 !important' }}>
            Preview Cetak: Form & Summary Inspeksi Resmi
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={() => window.print()}
              sx={{ bgcolor: '#1e3a8a !important', color: '#ffffff !important' }}
            >
              Cetak / Simpan PDF
            </Button>
            <IconButton onClick={() => setPrintModal({ open: false, date: '', items: [] })}>
              <CloseIcon sx={{ color: '#000000 !important' }} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4, bgcolor: '#ffffff !important', color: '#000000 !important' }}>
          {/* KOP SURAT FORMAL */}
          <Box sx={{ borderBottom: '2px solid #000000', pb: 1.5, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  component="img"
                  src="/taurus/logo-elma.png"
                  alt="Logo PT ELMA"
                  sx={{ height: 46, width: 'auto', objectFit: 'contain' }}
                />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#000000 !important', letterSpacing: 1, lineHeight: 1.1 }}>
                    PT LANCAR JAYA MITRA ABADI
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#000000 !important', mt: 0.3 }}>
                    SUMMARY INSPEKSI RADIO RIG, CAMERA CABIN, CAMERA FATIQUE
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#000000 !important' }}>
                  ELMA IV-BEK-GA-046.04
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#000000 !important', display: 'block', mt: 0.5 }}>
                  REV 04, 2025-09-01 | HAL 1 DARI 1
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
              <Typography variant="caption" sx={{ color: '#000000 !important' }}>
                <strong>SITE (LOKASI):</strong> BEK / BIANGAN
              </Typography>
              <Typography variant="caption" sx={{ color: '#000000 !important' }}>
                <strong>JENIS:</strong> PM
              </Typography>
              <Typography variant="caption" sx={{ color: '#000000 !important' }}>
                <strong>TANGGAL INSPEKSI:</strong> {formatFormalDate(printModal.date)}
              </Typography>
            </Box>
          </Box>

          {/* TABEL CETAK BERSTANDAR EXCEL RESMI */}
          <TableContainer sx={{ border: '2px solid #000000' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell rowSpan={2} sx={{ fontWeight: 800, border: '1px solid #000', color: '#000 !important', textAlign: 'center', py: 0.5, fontSize: '0.72rem', width: 35 }}>NO.</TableCell>
                  <TableCell rowSpan={2} sx={{ fontWeight: 800, border: '1px solid #000', color: '#000 !important', py: 0.5, fontSize: '0.72rem' }}>NOMOR LAMBUNG</TableCell>
                  <TableCell rowSpan={2} sx={{ fontWeight: 800, border: '1px solid #000', color: '#000 !important', py: 0.5, fontSize: '0.72rem' }}>MERK</TableCell>
                  <TableCell rowSpan={2} sx={{ fontWeight: 800, border: '1px solid #000', color: '#000 !important', py: 0.5, fontSize: '0.72rem' }}>MODEL/TYPE</TableCell>
                  <TableCell rowSpan={2} align="center" sx={{ fontWeight: 800, border: '1px solid #000', color: '#000 !important', py: 0.5, fontSize: '0.72rem', minWidth: 80 }}>Foto barang di unit</TableCell>
                  <TableCell rowSpan={2} sx={{ fontWeight: 800, border: '1px solid #000', color: '#000 !important', py: 0.5, fontSize: '0.72rem', minWidth: 140 }}>NAMA BARANG</TableCell>
                  <TableCell colSpan={2} align="center" sx={{ fontWeight: 800, border: '1px solid #000', color: '#000 !important', py: 0.5, fontSize: '0.72rem' }}>Kondisi barang</TableCell>
                  <TableCell rowSpan={2} sx={{ fontWeight: 800, border: '1px solid #000', color: '#000 !important', py: 0.5, fontSize: '0.72rem', minWidth: 110 }}>Keterangan untuk kondisi barang</TableCell>
                  <TableCell colSpan={2} align="center" sx={{ fontWeight: 800, border: '1px solid #000', color: '#000 !important', py: 0.5, fontSize: '0.72rem' }}>Status inspeksi</TableCell>
                  <TableCell rowSpan={2} sx={{ fontWeight: 800, border: '1px solid #000', color: '#000 !important', py: 0.5, fontSize: '0.72rem' }}>Tgl Inspeksi</TableCell>
                  <TableCell rowSpan={2} sx={{ fontWeight: 800, border: '1px solid #000', color: '#000 !important', py: 0.5, fontSize: '0.72rem' }}>Ttd penanggung jawab</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 800, border: '1px solid #000', color: '#000 !important', fontSize: '0.68rem', py: 0.3 }}>Ada/layak</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, border: '1px solid #000', color: '#000 !important', fontSize: '0.68rem', py: 0.3 }}>Tidak ada</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, border: '1px solid #000', color: '#000 !important', bgcolor: '#fde047', fontSize: '0.68rem', py: 0.3 }}>Open</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, border: '1px solid #000', color: '#000 !important', bgcolor: '#86efac', fontSize: '0.68rem', py: 0.3 }}>Close</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {printModal.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 4, color: '#000000 !important', fontWeight: 700 }}>
                      Tidak ada data inspeksi untuk ditampilkan. Silakan pilih tanggal atau filter lain.
                    </TableCell>
                  </TableRow>
                ) : (
                printModal.items.map((it, idx) => {
                  const no = idx + 1;
                  const isRadioOk = it.radio_status === 'Ada/layak';
                  const isCameraOk = (it.camera_status || it.camera_cabin_status) === 'Ada/layak';
                  const isOpen = it.inspection_status === 'Open';
                  const isClose = it.inspection_status === 'Close';

                  // Radio items (1.1 - 1.4)
                  const radioItems = [
                    { label: '1.1 Kelistrikan', ok: (it.radio_kelistrikan || (isRadioOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { label: '1.2 Antena',      ok: (it.radio_antena || (isRadioOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { label: '1.3 Kabel',       ok: (it.radio_kabel || (isRadioOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { label: '1.4 Chanel',      ok: (it.radio_chanel || (isRadioOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                  ];

                  // Camera items (2.1 - 2.8)
                  const cameraItems = [
                    { label: '2.1 Kelistrikan', ok: (it.camera_kelistrikan || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { label: '2.2 Posisi',      ok: (it.camera_posisi || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { label: '2.3 Internet',    ok: (it.camera_internet || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { label: '2.4 GPS',         ok: (it.camera_gps || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { label: '2.5 Dascam',      ok: (it.camera_dascam || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { label: '2.6 Kabin',       ok: (it.camera_kabin || it.camera_cabin_status || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { label: '2.7 Fatigue',     ok: (it.camera_fatigue || it.camera_fatigue_status || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                    { label: '2.8 Memcard',     ok: (it.camera_memcard || it.camera_penyimpanan || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada' },
                  ];

                  return (
                    <React.Fragment key={it.id}>
                      {/* BARIS 1: Radio 1.1 Kelistrikan (Dengan Left Columns rowSpan=12) */}
                      <TableRow>
                        <TableCell rowSpan={12} align="center" sx={{ border: '1px solid #000', color: '#000', fontWeight: 800, py: 0.3, fontSize: '0.75rem' }}>
                          {no}
                        </TableCell>
                        <TableCell rowSpan={12} sx={{ border: '1px solid #000', color: '#000', fontWeight: 800, py: 0.3, fontSize: '0.78rem' }}>
                          {it.unit_number}
                          {it.old_unit_number && <div style={{ fontSize: '0.65rem', color: '#555', fontWeight: 400 }}>Lama: {it.old_unit_number}</div>}
                        </TableCell>
                        <TableCell rowSpan={12} sx={{ border: '1px solid #000', color: '#000', fontSize: '0.72rem', py: 0.3, fontWeight: 700 }}>
                          {it.vehicle_brand || '-'}
                        </TableCell>
                        <TableCell rowSpan={12} sx={{ border: '1px solid #000', color: '#000', fontSize: '0.7rem', py: 0.3 }}>
                          {it.vehicle_model || '-'}
                        </TableCell>

                        {/* Foto Radio Rig (rowSpan=4) */}
                        <TableCell rowSpan={4} align="center" sx={{ border: '1px solid #000', p: 0.3 }}>
                          {it.radio_photo_url ? (
                            <Box
                              component="img"
                              src={it.radio_photo_url}
                              alt="Foto Radio"
                              sx={{ width: 64, height: 50, objectFit: 'cover', borderRadius: 0.5, border: '1px solid #999' }}
                            />
                          ) : (
                            <span style={{ fontSize: '0.65rem', color: '#888' }}>-</span>
                          )}
                        </TableCell>

                        {/* Nama Barang Radio 1.1 */}
                        <TableCell sx={{ border: '1px solid #000', color: '#000', fontWeight: 700, py: 0.3, fontSize: '0.7rem' }}>
                          <span style={{ fontWeight: 800 }}>1 RADIO RIG</span><br/>
                          {radioItems[0].label}
                        </TableCell>
                        <TableCell align="center" sx={{ border: '1px solid #000', color: '#000', fontWeight: 800, py: 0.3, fontSize: '0.7rem' }}>
                          {radioItems[0].ok ? 'Ada' : ''}
                        </TableCell>
                        <TableCell align="center" sx={{ border: '1px solid #000', color: '#000', fontWeight: 800, py: 0.3, fontSize: '0.7rem' }}>
                          {!radioItems[0].ok ? 'v' : ''}
                        </TableCell>

                        {/* Keterangan Radio (rowSpan=4) */}
                        <TableCell rowSpan={4} sx={{ border: '1px solid #000', color: '#000', fontSize: '0.7rem', py: 0.3 }}>
                          {it.radio_notes || (isRadioOk ? 'OK' : 'Rusak')}
                        </TableCell>

                        {/* Status Open / Close (rowSpan=12) */}
                        <TableCell rowSpan={12} align="center" sx={{ border: '1px solid #000', color: '#000', fontWeight: 900, py: 0.3, bgcolor: isOpen ? '#fef08a' : 'transparent' }}>
                          {isOpen ? '1' : ''}
                        </TableCell>
                        <TableCell rowSpan={12} align="center" sx={{ border: '1px solid #000', color: '#000', fontWeight: 900, py: 0.3, bgcolor: isClose ? '#bbf7d0' : 'transparent' }}>
                          {isClose ? '1' : ''}
                        </TableCell>

                        {/* Tgl Inspeksi (rowSpan=12) */}
                        <TableCell rowSpan={12} sx={{ border: '1px solid #000', color: '#000', whiteSpace: 'nowrap', py: 0.3, fontSize: '0.7rem' }}>
                          {it.inspection_date}
                        </TableCell>

                        {/* Ttd Penanggung Jawab (rowSpan=12) */}
                        <TableCell rowSpan={12} sx={{ border: '1px solid #000', color: '#000', fontSize: '0.7rem', py: 0.3 }}>
                          <strong>{it.inspector_name || 'IT Support'}</strong>
                          {it.inspector2_name && (
                            <div style={{ fontSize: '0.65rem', color: '#333' }}>& {it.inspector2_name}</div>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* BARIS 2-4: Radio 1.2, 1.3, 1.4 */}
                      {radioItems.slice(1).map((r, rIdx) => (
                        <TableRow key={`radio-${rIdx}`}>
                          <TableCell sx={{ border: '1px solid #000', color: '#000', py: 0.3, fontSize: '0.7rem' }}>
                            {r.label}
                          </TableCell>
                          <TableCell align="center" sx={{ border: '1px solid #000', color: '#000', fontWeight: 800, py: 0.3, fontSize: '0.7rem' }}>
                            {r.ok ? 'Ada' : ''}
                          </TableCell>
                          <TableCell align="center" sx={{ border: '1px solid #000', color: '#000', fontWeight: 800, py: 0.3, fontSize: '0.7rem' }}>
                            {!r.ok ? 'v' : ''}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* BARIS 5: Kamera 2.1 (Dengan Foto Kamera rowSpan=8 & Keterangan rowSpan=8) */}
                      <TableRow>
                        {/* Foto Kamera (rowSpan=8) */}
                        <TableCell rowSpan={8} align="center" sx={{ border: '1px solid #000', p: 0.3 }}>
                          {it.camera_photo_url ? (
                            <Box
                              component="img"
                              src={it.camera_photo_url}
                              alt="Foto Kamera"
                              sx={{ width: 64, height: 50, objectFit: 'cover', borderRadius: 0.5, border: '1px solid #999' }}
                            />
                          ) : (
                            <span style={{ fontSize: '0.65rem', color: '#888' }}>-</span>
                          )}
                        </TableCell>

                        {/* Nama Barang Kamera 2.1 */}
                        <TableCell sx={{ border: '1px solid #000', color: '#000', fontWeight: 700, py: 0.3, fontSize: '0.7rem' }}>
                          <span style={{ fontWeight: 800 }}>2 KAMERA</span><br/>
                          {cameraItems[0].label}
                        </TableCell>
                        <TableCell align="center" sx={{ border: '1px solid #000', color: '#000', fontWeight: 800, py: 0.3, fontSize: '0.7rem' }}>
                          {cameraItems[0].ok ? 'Ada' : ''}
                        </TableCell>
                        <TableCell align="center" sx={{ border: '1px solid #000', color: '#000', fontWeight: 800, py: 0.3, fontSize: '0.7rem' }}>
                          {!cameraItems[0].ok ? 'v' : ''}
                        </TableCell>

                        {/* Keterangan Kamera (rowSpan=8) */}
                        <TableCell rowSpan={8} sx={{ border: '1px solid #000', color: '#000', fontSize: '0.7rem', py: 0.3 }}>
                          {it.camera_notes || it.camera_cabin_notes || (isCameraOk ? 'OK' : 'Rusak')}
                        </TableCell>
                      </TableRow>

                      {/* BARIS 6-12: Kamera 2.2 sampai 2.8 */}
                      {cameraItems.slice(1).map((c, cIdx) => (
                        <TableRow key={`cam-${cIdx}`}>
                          <TableCell sx={{ border: '1px solid #000', color: '#000', py: 0.3, fontSize: '0.7rem' }}>
                            {c.label}
                          </TableCell>
                          <TableCell align="center" sx={{ border: '1px solid #000', color: '#000', fontWeight: 800, py: 0.3, fontSize: '0.7rem' }}>
                            {c.ok ? 'Ada' : ''}
                          </TableCell>
                          <TableCell align="center" sx={{ border: '1px solid #000', color: '#000', fontWeight: 800, py: 0.3, fontSize: '0.7rem' }}>
                            {!c.ok ? 'v' : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                }))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* TANDA TANGAN 2 PERSONIL IT */}
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <Box sx={{ width: 340 }}>
              <Typography variant="body2" sx={{ color: '#000000 !important', mb: 1, textAlign: 'center' }}>
                Biangan, {formatFormalDate(printModal.date)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#000000 !important', mb: 2, textAlign: 'center' }}>
                Penanggung Jawab Inspeksi:
              </Typography>

              <Table size="small" sx={{ border: '1px solid #000' }}>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ border: '1px solid #000', color: '#000000 !important', fontWeight: 800 }}>Nama</TableCell>
                    <TableCell sx={{ border: '1px solid #000', color: '#000000 !important', fontWeight: 800 }}>Jabatan</TableCell>
                    <TableCell sx={{ border: '1px solid #000', color: '#000000 !important', fontWeight: 800 }} align="center">Ttd</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ border: '1px solid #000', color: '#000000 !important', fontWeight: 700 }}>
                      1. {printModal.items[0]?.inspector_name || 'Twom'}
                    </TableCell>
                    <TableCell sx={{ border: '1px solid #000', color: '#000000 !important' }}>
                      {printModal.items[0]?.inspector_role || 'IT Support'}
                    </TableCell>
                    <TableCell sx={{ border: '1px solid #000', color: '#000000 !important', height: 40 }} align="center">
                      (Paraf)
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ border: '1px solid #000', color: '#000000 !important', fontWeight: 700 }}>
                      2. {printModal.items[0]?.inspector2_name && printModal.items[0]?.inspector2_name !== '-' ? printModal.items[0]?.inspector2_name : 'Ali'}
                    </TableCell>
                    <TableCell sx={{ border: '1px solid #000', color: '#000000 !important' }}>
                      {printModal.items[0]?.inspector2_role && printModal.items[0]?.inspector2_role !== '-' ? printModal.items[0]?.inspector2_role : 'IT Support'}
                    </TableCell>
                    <TableCell sx={{ border: '1px solid #000', color: '#000000 !important', height: 40 }} align="center">
                      (Paraf)
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* DIALOG IMPORT EXCEL */}
      <Dialog
        open={importModal}
        onClose={() => !importLoading && setImportModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: cardBg,
            border: sectionBorder,
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: textTitle, display: 'flex', alignItems: 'center', gap: 1 }}>
            <UploadIcon color="primary" />
            Import Data Inspeksi dari Excel (.xlsx)
          </Typography>
          <IconButton onClick={() => setImportModal(false)} disabled={importLoading} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {/* BANNER TEMPLATE INFO */}
          <Paper
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
                  Template Resmi: PT LANCAR JAYA MITRA ABADI
                </Typography>
                <Typography variant="caption" sx={{ color: isDark ? '#a7f3d0' : '#047857', display: 'block' }}>
                  ELMA IV-BEK-GA-046.04 REV 04 (Radio Rig, Camera Cabin, Camera Fatigue)
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
          </Paper>

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
              Mendukung file template resmi atau format Summary Inspeksi PT LANCAR JAYA MITRA ABADI
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
                  Preview Data Inspeksi yang Terdeteksi:
                </Typography>
                <Chip
                  label={`${importPreview.length} Unit Siap Di-import`}
                  color="success"
                  size="small"
                  sx={{ fontWeight: 800 }}
                />
              </Box>

              <TableContainer sx={{ maxHeight: 320, border: sectionBorder, borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>NO.</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>NO. UNIT</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>MERK & MODEL</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>RADIO RIG</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>CAMERA CABIN</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>CAMERA FATIGUE</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>STATUS</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>TGL</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>PETUGAS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importPreview.map((item, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: isDark ? '#ffd600' : '#1e3a8a', fontSize: '0.75rem' }}>
                          {item.unit_number}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          {item.vehicle_brand} {item.vehicle_model}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          <Chip
                            label={item.radio_status}
                            size="small"
                            color={item.radio_status === 'Ada/layak' ? 'success' : 'error'}
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          <Chip
                            label={item.camera_cabin_status}
                            size="small"
                            color={item.camera_cabin_status === 'Ada/layak' ? 'success' : 'error'}
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          <Chip
                            label={item.camera_fatigue_status}
                            size="small"
                            color={item.camera_fatigue_status === 'Ada/layak' ? 'success' : 'error'}
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          <Chip
                            label={item.inspection_status}
                            size="small"
                            color={item.inspection_status === 'Close' ? 'success' : 'error'}
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {item.inspection_date}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{item.inspector_name}</TableCell>
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
            {importLoading ? 'Menyimpan...' : `Proses & Simpan (${importPreview.length} Data)`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG KONFIRMASI HAPUS */}
      <Dialog open={deleteModal.open} onClose={() => setDeleteModal({ open: false, item: null })}>
        <DialogTitle sx={{ fontWeight: 800 }}>Hapus Data Inspeksi?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Apakah Anda yakin ingin menghapus catatan inspeksi unit <strong>{deleteModal.item?.unit_number}</strong> pada tanggal <strong>{deleteModal.item?.inspection_date}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModal({ open: false, item: null })} disabled={deleting}>
            Batal
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InspectionList;
