import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  Autocomplete,
  RadioGroup,
  FormControlLabel,
  Radio,
  Paper,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as SuccessIcon,
  Clear as ClearIcon,
  CloudUpload as UploadIcon,
  AssignmentTurnedIn as InspectIcon,
  Save as SaveIcon,
  Add as AddIcon,
  PhotoCamera as PhotoIcon,
  Visibility as ViewIcon,
  Radio as RadioIcon,
  Videocam as CameraIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { VehicleUnit } from '../types';
import { useAppTheme } from '../ThemeContext';

export const InspectionCreate: React.FC = () => {
  const navigate = useNavigate();
  const { mode } = useAppTheme();

  // Ambil data user yang sedang login
  const userJson = localStorage.getItem('taurus_user');
  const currentUser = userJson ? JSON.parse(userJson) : { name: 'IT Support', role: 'it_support' };

  // Menentukan otomatis 2 personil IT (Twom & Ali)
  const currentUserName = currentUser.name || currentUser.username || 'IT Support';
  const isTwom = currentUserName.toLowerCase().includes('twom');
  const isAli = currentUserName.toLowerCase().includes('ali');

  const defaultInspector1 = currentUserName;
  const defaultRole1 = currentUser.role === 'admin' ? 'Administrator IT' : 'IT Support';
  const defaultInspector2 = isTwom ? 'Ali' : isAli ? 'Twom' : 'Ali';
  const defaultRole2 = 'IT Support';

  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [inspectionDate, setInspectionDate] = useState<string>(todayStr);
  const [siteLocation, setSiteLocation] = useState<string>('BEK / BIANGAN');
  const [inspectionType, setInspectionType] = useState<string>('PM');
  const [unitNumber, setUnitNumber] = useState<string>('');
  const [oldUnitNumber, setOldUnitNumber] = useState<string>('');
  const [vehicleBrand, setVehicleBrand] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [units, setUnits] = useState<VehicleUnit[]>([]);

  // 1. Radio Rig (Point 2)
  const [radioStatus, setRadioStatus] = useState<string>('Ada/layak');
  const [radioKelistrikan, setRadioKelistrikan] = useState<string>('Ada');
  const [radioAntena, setRadioAntena] = useState<string>('Ada');
  const [radioKabel, setRadioKabel] = useState<string>('Ada');
  const [radioChanel, setRadioChanel] = useState<string>('Ada');
  const [radioNotes, setRadioNotes] = useState<string>('');
  const [radioPhotoUrl, setRadioPhotoUrl] = useState<string>('');
  const [radioUploading, setRadioUploading] = useState<boolean>(false);

  // 2. Kamera & Dascam (Point 3)
  const [cameraStatus, setCameraStatus] = useState<string>('Ada/layak');
  const [cameraKelistrikan, setCameraKelistrikan] = useState<string>('Ada');
  const [cameraPosisi, setCameraPosisi] = useState<string>('Ada');
  const [cameraInternet, setCameraInternet] = useState<string>('Ada');
  const [cameraGps, setCameraGps] = useState<string>('Ada');
  const [cameraDascam, setCameraDascam] = useState<string>('Ada');
  const [cameraKabin, setCameraKabin] = useState<string>('Ada');
  const [cameraFatigue, setCameraFatigue] = useState<string>('Ada');
  const [cameraMemcard, setCameraMemcard] = useState<string>('Ada');
  const [cameraNotes, setCameraNotes] = useState<string>('');
  const [cameraPhotoUrl, setCameraPhotoUrl] = useState<string>('');
  const [cameraUploading, setCameraUploading] = useState<boolean>(false);

  // Preview Gambar Popup
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Status Inspeksi & Lampiran
  const [inspectionStatus, setInspectionStatus] = useState<'Open' | 'Close'>('Close');
  const [generalNotes, setGeneralNotes] = useState<string>('');

  // Penanggung Jawab Inspeksi
  const [inspector1Name, setInspector1Name] = useState<string>(defaultInspector1);
  const [inspector1Role, setInspector1Role] = useState<string>(defaultRole1);
  const [inspector2Name, setInspector2Name] = useState<string>(defaultInspector2);
  const [inspector2Role, setInspector2Role] = useState<string>(defaultRole2);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    // Ambil daftar nomor unit
    api.get('/units?all=true')
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setUnits(res.data);
        }
      })
      .catch((err) => console.error('Gagal mengambil unit kendaraan:', err));
  }, []);

  // Saat nomor unit dipilih dari daftar
  const handleSelectUnit = (val: VehicleUnit | string | null) => {
    if (!val) {
      setUnitNumber('');
      setVehicleBrand('');
      setVehicleModel('');
      return;
    }
    if (typeof val === 'string') {
      setUnitNumber(val);
      const found = units.find((u) => u.unit_number === val);
      if (found) {
        setVehicleBrand(found.vehicle_brand || '');
        setVehicleModel(found.unit_type || '');
      }
    } else {
      setUnitNumber(val.unit_number);
      setVehicleBrand(val.vehicle_brand || '');
      setVehicleModel(val.unit_type || '');
    }
  };

  // Upload Foto Khusus Radio (Point 2)
  const handleRadioPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);

      try {
        setRadioUploading(true);
        setErrorMsg('');
        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setRadioPhotoUrl(res.data.url);
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Gagal mengunggah foto Radio Rig');
      } finally {
        setRadioUploading(false);
      }
    }
  };

  // Upload Foto Khusus Kamera (Point 3)
  const handleCameraPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);

      try {
        setCameraUploading(true);
        setErrorMsg('');
        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setCameraPhotoUrl(res.data.url);
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Gagal mengunggah foto Kamera');
      } finally {
        setCameraUploading(false);
      }
    }
  };

  const handleSave = async (continueNextUnit: boolean = false) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!unitNumber.trim()) {
      setErrorMsg('Nomor lambung unit kendaraan wajib diisi / dipilih');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        inspection_date: inspectionDate,
        site_location: siteLocation,
        inspection_type: inspectionType,
        unit_number: unitNumber.trim(),
        old_unit_number: oldUnitNumber.trim() || null,
        vehicle_brand: vehicleBrand.trim() || null,
        vehicle_model: vehicleModel.trim() || null,

        // 1. Radio Rig (Point 2)
        radio_status: radioStatus,
        radio_kelistrikan: radioKelistrikan,
        radio_antena: radioAntena,
        radio_kabel: radioKabel,
        radio_chanel: radioChanel,
        radio_notes: radioNotes.trim() || null,
        radio_photo_url: radioPhotoUrl || null,

        // 2. Camera & Dascam (Point 3)
        camera_status: cameraStatus,
        camera_kelistrikan: cameraKelistrikan,
        camera_posisi: cameraPosisi,
        camera_internet: cameraInternet,
        camera_gps: cameraGps,
        camera_dascam: cameraDascam,
        camera_kabin: cameraKabin,
        camera_fatigue: cameraFatigue,
        camera_memcard: cameraMemcard,
        camera_penyimpanan: cameraMemcard,
        camera_notes: cameraNotes.trim() || null,
        camera_photo_url: cameraPhotoUrl || null,
        camera_cabin_status: cameraKabin === 'Tidak ada' ? 'Tidak ada' : 'Ada/layak',
        camera_cabin_notes: cameraNotes.trim() || null,
        camera_fatigue_status: cameraFatigue === 'Tidak ada' ? 'Tidak ada' : 'Ada/layak',
        camera_fatigue_notes: cameraNotes.trim() || null,

        // Status & Bukti (Fallback generic photo)
        inspection_status: inspectionStatus,
        photo_url: radioPhotoUrl || cameraPhotoUrl || null,
        general_notes: generalNotes.trim() || null,

        // Penanggung Jawab
        inspector_name: inspector1Name.trim(),
        inspector_role: inspector1Role.trim(),
        inspector2_name: inspector2Name.trim(),
        inspector2_role: inspector2Role.trim(),
      };

      await api.post('/inspections', payload);

      if (continueNextUnit) {
        setSuccessMsg(`Inspeksi unit ${unitNumber} berhasil disimpan. Silakan lanjutkan unit berikutnya.`);
        // Reset form unit tapi pertahankan tanggal & lokasi & personil
        setUnitNumber('');
        setOldUnitNumber('');
        setVehicleBrand('');
        setVehicleModel('');
        
        // Reset Radio
        setRadioStatus('Ada/layak');
        setRadioKelistrikan('Ada');
        setRadioAntena('Ada');
        setRadioKabel('Ada');
        setRadioChanel('Ada');
        setRadioNotes('');
        setRadioPhotoUrl('');

        // Reset Kamera
        setCameraStatus('Ada/layak');
        setCameraKelistrikan('Ada');
        setCameraPosisi('Ada');
        setCameraInternet('Ada');
        setCameraGps('Ada');
        setCameraDascam('Ada');
        setCameraKabin('Ada');
        setCameraFatigue('Ada');
        setCameraMemcard('Ada');
        setCameraNotes('');
        setCameraPhotoUrl('');

        setGeneralNotes('');
        setInspectionStatus('Close');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        navigate('/inspections');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data inspeksi');
    } finally {
      setSubmitting(false);
    }
  };

  const isDark = mode === 'dark';
  const cardBg = isDark ? '#0d1929' : '#ffffff';
  const textTitle = isDark ? '#ffd600' : '#1e3a8a';
  const sectionBorder = isDark ? '1px solid #1e293b' : '1px solid #e2e8f0';

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', pb: 6 }}>
      {/* Top Header Navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate('/inspections')} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: textTitle, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InspectIcon sx={{ color: isDark ? '#ffd600' : '#2563eb' }} />
              Tambah Inspeksi Unit
            </Typography>
            <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              Formulir Resmi Inspeksi Radio Rig, Camera Cabin, & Camera Fatigue (ELMA IV-BEK-GA-046.04 REV 04)
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          startIcon={<InspectIcon />}
          onClick={() => navigate('/inspections')}
          sx={{
            fontWeight: 700,
            textTransform: 'none',
            borderColor: isDark ? '#ffd600' : '#2563eb',
            color: isDark ? '#ffd600' : '#2563eb',
          }}
        >
          Rekap Inspeksi
        </Button>
      </Box>

      {/* Tab Navigasi Tambah dan Rekap */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, borderBottom: sectionBorder, pb: 1 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            fontWeight: 800,
            textTransform: 'none',
            bgcolor: isDark ? '#ffd600' : '#2563eb',
            color: isDark ? '#000000' : '#ffffff',
            borderRadius: 2,
            px: 2.5,
          }}
        >
          Tambah Inspeksi
        </Button>
        <Button
          variant="text"
          startIcon={<InspectIcon />}
          onClick={() => navigate('/inspections')}
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
          Rekap Inspeksi
        </Button>
      </Box>

      {/* Kop Surat Header Formal */}
      <Card
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 2.5,
          bgcolor: cardBg,
          border: sectionBorder,
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.04)',
        }}
      >
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs={12} md={7}>
            <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: isDark ? '#00ff66' : '#059669' }}>
              PT LANCAR JAYA MITRA ABADI
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#ffd600' : '#1e3a8a', lineHeight: 1.2 }}>
              FORM INSPEKSI RADIO RIG, CAMERA CABIN, CAMERA FATIQUE
            </Typography>
            <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', display: 'block', mt: 0.5 }}>
              Standard Operational Procedure - Preventive Maintenance (PM) Sistem Telekomunikasi & Monitoring Tambang
            </Typography>
          </Grid>
          <Grid item xs={12} md={5} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Chip
              label="DOC: ELMA IV-BEK-GA-046.04"
              sx={{ fontWeight: 700, mr: 1, mb: 0.5, bgcolor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#ffd600' : '#1e293b' }}
            />
            <Chip
              label="REV 04, 2025-09-01"
              variant="outlined"
              sx={{ fontWeight: 600, mb: 0.5 }}
            />
          </Grid>
        </Grid>
      </Card>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          {successMsg}
        </Alert>
      )}

      {/* Form Input Container */}
      <Card
        sx={{
          borderRadius: 3,
          bgcolor: cardBg,
          border: sectionBorder,
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(false); }}>
            <Grid container spacing={3}>

              {/* 1. INFORMASI UMUM & IDENTITAS UNIT */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: textTitle, display: 'flex', alignItems: 'center', gap: 1 }}>
                  1. Informasi Sesi & Identitas Kendaraan
                </Typography>
                <Divider sx={{ mt: 0.5, mb: 2 }} />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Tanggal Inspeksi *"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Site (Lokasi)"
                  value={siteLocation}
                  onChange={(e) => setSiteLocation(e.target.value)}
                  placeholder="Contoh: BEK / BIANGAN"
                  required
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Jenis Inspeksi"
                  value={inspectionType}
                  onChange={(e) => setInspectionType(e.target.value)}
                  placeholder="Contoh: PM"
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={units}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return `${option.unit_number} - ${option.vehicle_brand || ''} ${option.unit_type || ''}`;
                  }}
                  value={units.find((u) => u.unit_number === unitNumber) || unitNumber}
                  onChange={(_, val) => handleSelectUnit(val)}
                  onInputChange={(_, val) => setUnitNumber(val)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Nomor Lambung Unit *"
                      placeholder="Ketik / pilih unit (misal: 843, 844, 847, 850, 8145)..."
                      required
                      helperText="Pilih dari daftar kendaraan operasional tambang"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nomor Lambung Lama (Jika Ada)"
                  placeholder="Kosongkan jika tidak ada nomor lama"
                  value={oldUnitNumber}
                  onChange={(e) => setOldUnitNumber(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Merk Kendaraan"
                  placeholder="Contoh: MERCEDES BENZ / FAW"
                  value={vehicleBrand}
                  onChange={(e) => setVehicleBrand(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Model / Type Kendaraan"
                  placeholder="Contoh: ACTROS 4048 S 6X4 A/T / FAW 550 HP"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                />
              </Grid>

              {/* 2. PENGECEKAN RADIO RIG */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: textTitle, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RadioIcon sx={{ color: isDark ? '#ffd600' : '#2563eb' }} />
                  2. Pengecekan Item Radio (RADIO RIG)
                </Typography>
                <Divider sx={{ mt: 0.5, mb: 2 }} />
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2.5, bgcolor: isDark ? '#081220' : '#f8fafc', border: sectionBorder, borderRadius: 2 }}>
                  <Grid container spacing={2.5}>
                    {/* Status & Keterangan Radio */}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Kondisi Radio Rig di Unit:
                      </Typography>
                      <RadioGroup
                        row
                        value={radioStatus}
                        onChange={(e) => setRadioStatus(e.target.value)}
                      >
                        <FormControlLabel value="Ada/layak" control={<Radio size="small" color="success" />} label="Ada/layak" />
                        <FormControlLabel value="Tidak ada" control={<Radio size="small" color="error" />} label="Tidak ada" />
                        <FormControlLabel value="Rusak" control={<Radio size="small" color="warning" />} label="Rusak" />
                      </RadioGroup>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Keterangan untuk Kondisi Radio"
                        placeholder="Contoh: OK / Rusak Mic / Kabel lecet / Perlu disetting ulang"
                        value={radioNotes}
                        onChange={(e) => setRadioNotes(e.target.value)}
                      />
                    </Grid>

                    {/* Sub-item Radio: 1.1 Kelistrikan, 1.2 Antena, 1.3 Kabel, 1.4 Chanel */}
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: isDark ? '#94a3b8' : '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Daftar Pemeriksaan Item Radio RIG (1.1 - 1.4):
                      </Typography>
                      <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                        {[
                          { key: '1.1 Kelistrikan', val: radioKelistrikan, set: setRadioKelistrikan },
                          { key: '1.2 Antena', val: radioAntena, set: setRadioAntena },
                          { key: '1.3 Kabel', val: radioKabel, set: setRadioKabel },
                          { key: '1.4 Chanel', val: radioChanel, set: setRadioChanel },
                        ].map((item, idx) => (
                          <Grid item xs={6} sm={3} key={idx}>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                bgcolor: isDark ? '#0d1929' : '#ffffff',
                                borderColor: item.val === 'Ada' ? (isDark ? '#00ff66' : '#16a34a') : (isDark ? '#ef4444' : '#dc2626'),
                                borderLeftWidth: 4,
                                borderRadius: 1.5,
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {item.key}
                              </Typography>
                              <RadioGroup
                                row
                                value={item.val}
                                onChange={(e) => item.set(e.target.value)}
                              >
                                <FormControlLabel value="Ada" control={<Radio size="small" color="success" />} label="Ada" />
                                <FormControlLabel value="Tidak ada" control={<Radio size="small" color="error" />} label="Tidak ada" />
                              </RadioGroup>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Grid>

                    {/* Foto Barang di Unit: Radio RIG */}
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhotoIcon fontSize="small" sx={{ color: isDark ? '#ffd600' : '#2563eb' }} />
                        Foto Barang di Unit (Foto Radio Rig):
                      </Typography>
                      <Box
                        sx={{
                          border: '1.5px dashed',
                          borderColor: isDark ? '#334155' : '#cbd5e1',
                          borderRadius: 2,
                          p: 2,
                          textAlign: 'center',
                          bgcolor: isDark ? '#0d1929' : '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <input
                          accept="image/*"
                          style={{ display: 'none' }}
                          id="radio-photo-input"
                          type="file"
                          onChange={handleRadioPhotoChange}
                          disabled={radioUploading}
                        />
                        {!radioPhotoUrl ? (
                          <label htmlFor="radio-photo-input">
                            <Button
                              variant="outlined"
                              component="span"
                              startIcon={radioUploading ? <CircularProgress size={18} /> : <UploadIcon />}
                              disabled={radioUploading}
                              sx={{ textTransform: 'none', fontWeight: 700 }}
                            >
                              {radioUploading ? 'Mengunggah Foto Radio...' : 'Pilih / Ambil Foto Radio Rig'}
                            </Button>
                          </label>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <Box
                              component="img"
                              src={radioPhotoUrl}
                              alt="Foto Radio Rig"
                              onClick={() => setPreviewImage(radioPhotoUrl)}
                              sx={{
                                width: 140,
                                height: 100,
                                objectFit: 'cover',
                                borderRadius: 1.5,
                                border: '2px solid #16a34a',
                                cursor: 'pointer',
                                '&:hover': { opacity: 0.9 },
                              }}
                            />
                            <Box sx={{ textAlign: 'left' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#16a34a', mb: 1 }}>
                                <SuccessIcon fontSize="small" />
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>Foto Radio Berhasil Terunggah</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<ViewIcon />}
                                  onClick={() => setPreviewImage(radioPhotoUrl)}
                                  sx={{ textTransform: 'none' }}
                                >
                                  Lihat Foto
                                </Button>
                                <label htmlFor="radio-photo-input">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    component="span"
                                    startIcon={<UploadIcon />}
                                    sx={{ textTransform: 'none' }}
                                  >
                                    Ganti
                                  </Button>
                                </label>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<ClearIcon />}
                                  onClick={() => setRadioPhotoUrl('')}
                                  sx={{ textTransform: 'none' }}
                                >
                                  Hapus
                                </Button>
                              </Box>
                            </Box>
                          </Box>
                        )}
                        <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', mt: 1 }}>
                          Format file: JPG, PNG, WEBP. Maksimal 10 MB.
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* 3. PENGECEKAN ITEM KAMERA */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: textTitle, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CameraIcon sx={{ color: isDark ? '#ffd600' : '#2563eb' }} />
                  3. Pengecekan Item Kamera (KAMERA & DASCAM)
                </Typography>
                <Divider sx={{ mt: 0.5, mb: 2 }} />
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2.5, bgcolor: isDark ? '#081220' : '#f8fafc', border: sectionBorder, borderRadius: 2 }}>
                  <Grid container spacing={2.5}>
                    {/* Status & Keterangan Kamera */}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Kondisi Kamera di Unit:
                      </Typography>
                      <RadioGroup
                        row
                        value={cameraStatus}
                        onChange={(e) => setCameraStatus(e.target.value)}
                      >
                        <FormControlLabel value="Ada/layak" control={<Radio size="small" color="success" />} label="Ada/layak" />
                        <FormControlLabel value="Tidak ada" control={<Radio size="small" color="error" />} label="Tidak ada" />
                        <FormControlLabel value="Rusak" control={<Radio size="small" color="warning" />} label="Rusak" />
                      </RadioGroup>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Keterangan untuk Kondisi Kamera"
                        placeholder="Contoh: OK / Layar mati / Posisi miring / Kabel putus"
                        value={cameraNotes}
                        onChange={(e) => setCameraNotes(e.target.value)}
                      />
                    </Grid>

                    {/* Sub-item Kamera: 2.1-2.8 */}
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: isDark ? '#94a3b8' : '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Daftar Pemeriksaan Item Kamera (2.1 - 2.8):
                      </Typography>
                      <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                        {[
                          { key: '2.1 Kelistrikan', val: cameraKelistrikan, set: setCameraKelistrikan },
                          { key: '2.2 Posisi', val: cameraPosisi, set: setCameraPosisi },
                          { key: '2.3 Internet', val: cameraInternet, set: setCameraInternet },
                          { key: '2.4 GPS', val: cameraGps, set: setCameraGps },
                          { key: '2.5 Dascam', val: cameraDascam, set: setCameraDascam },
                          { key: '2.6 Kabin', val: cameraKabin, set: setCameraKabin },
                          { key: '2.7 Fatigue (DSM)', val: cameraFatigue, set: setCameraFatigue },
                          { key: '2.8 Memcard (SD)', val: cameraMemcard, set: setCameraMemcard },
                        ].map((item, idx) => (
                          <Grid item xs={6} sm={3} key={idx}>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                bgcolor: isDark ? '#0d1929' : '#ffffff',
                                borderColor: item.val === 'Ada' ? (isDark ? '#00ff66' : '#16a34a') : (isDark ? '#ef4444' : '#dc2626'),
                                borderLeftWidth: 4,
                                borderRadius: 1.5,
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {item.key}
                              </Typography>
                              <RadioGroup
                                row
                                value={item.val}
                                onChange={(e) => item.set(e.target.value)}
                              >
                                <FormControlLabel value="Ada" control={<Radio size="small" color="success" />} label="Ada" />
                                <FormControlLabel value="Tidak ada" control={<Radio size="small" color="error" />} label="Tidak ada" />
                              </RadioGroup>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Grid>

                    {/* Foto Barang di Unit: Kamera */}
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhotoIcon fontSize="small" sx={{ color: isDark ? '#ffd600' : '#2563eb' }} />
                        Foto Barang di Unit (Foto Kamera & Dascam):
                      </Typography>
                      <Box
                        sx={{
                          border: '1.5px dashed',
                          borderColor: isDark ? '#334155' : '#cbd5e1',
                          borderRadius: 2,
                          p: 2,
                          textAlign: 'center',
                          bgcolor: isDark ? '#0d1929' : '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <input
                          accept="image/*"
                          style={{ display: 'none' }}
                          id="camera-photo-input"
                          type="file"
                          onChange={handleCameraPhotoChange}
                          disabled={cameraUploading}
                        />
                        {!cameraPhotoUrl ? (
                          <label htmlFor="camera-photo-input">
                            <Button
                              variant="outlined"
                              component="span"
                              startIcon={cameraUploading ? <CircularProgress size={18} /> : <UploadIcon />}
                              disabled={cameraUploading}
                              sx={{ textTransform: 'none', fontWeight: 700 }}
                            >
                              {cameraUploading ? 'Mengunggah Foto Kamera...' : 'Pilih / Ambil Foto Kamera di Unit'}
                            </Button>
                          </label>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <Box
                              component="img"
                              src={cameraPhotoUrl}
                              alt="Foto Kamera"
                              onClick={() => setPreviewImage(cameraPhotoUrl)}
                              sx={{
                                width: 140,
                                height: 100,
                                objectFit: 'cover',
                                borderRadius: 1.5,
                                border: '2px solid #16a34a',
                                cursor: 'pointer',
                                '&:hover': { opacity: 0.9 },
                              }}
                            />
                            <Box sx={{ textAlign: 'left' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#16a34a', mb: 1 }}>
                                <SuccessIcon fontSize="small" />
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>Foto Kamera Berhasil Terunggah</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<ViewIcon />}
                                  onClick={() => setPreviewImage(cameraPhotoUrl)}
                                  sx={{ textTransform: 'none' }}
                                >
                                  Lihat Foto
                                </Button>
                                <label htmlFor="camera-photo-input">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    component="span"
                                    startIcon={<UploadIcon />}
                                    sx={{ textTransform: 'none' }}
                                  >
                                    Ganti
                                  </Button>
                                </label>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<ClearIcon />}
                                  onClick={() => setCameraPhotoUrl('')}
                                  sx={{ textTransform: 'none' }}
                                >
                                  Hapus
                                </Button>
                              </Box>
                            </Box>
                          </Box>
                        )}
                        <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', mt: 1 }}>
                          Format file: JPG, PNG, WEBP. Maksimal 10 MB.
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* 4. STATUS INSPEKSI & CATATAN */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: textTitle, display: 'flex', alignItems: 'center', gap: 1 }}>
                  4. Status Akhir Inspeksi & Catatan Tambahan
                </Typography>
                <Divider sx={{ mt: 0.5, mb: 2 }} />
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: isDark ? '#081220' : '#f8fafc', border: sectionBorder, borderRadius: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Status Hasil Inspeksi Unit:
                      </Typography>
                      <RadioGroup
                        row
                        value={inspectionStatus}
                        onChange={(e) => setInspectionStatus(e.target.value as 'Open' | 'Close')}
                      >
                        <FormControlLabel
                          value="Close"
                          control={<Radio color="success" />}
                          label={
                            <Chip label="Close (Normal / Selesai)" color="success" size="small" sx={{ fontWeight: 700 }} />
                          }
                        />
                        <FormControlLabel
                          value="Open"
                          control={<Radio color="error" />}
                          label={
                            <Chip label="Open (Ada Temuan Gangguan)" color="error" size="small" sx={{ fontWeight: 700 }} />
                          }
                        />
                      </RadioGroup>
                      <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', display: 'block', mt: 0.5 }}>
                        Pilih "Open" jika ada komponen yang rusak/tidak ada dan perlu penanganan lebih lanjut.
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Catatan Tambahan Keseluruhan (General Notes)"
                        placeholder="Catatan tambahan teknisi saat inspeksi di lapangan..."
                        value={generalNotes}
                        onChange={(e) => setGeneralNotes(e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* 5. PENANGGUNG JAWAB INSPEKSI & TANDA TANGAN */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: textTitle, display: 'flex', alignItems: 'center', gap: 1 }}>
                  5. Penanggung Jawab Inspeksi (2 Personil IT)
                </Typography>
                <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  Lokasi: <strong>Biangan, {inspectionDate}</strong>. Petugas inspeksi otomatis mengambil nama akun yang sedang login, dengan jabatan ditaruh di tempatnya.
                </Typography>
                <Divider sx={{ mt: 0.5, mb: 2 }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, bgcolor: isDark ? '#081220' : '#f8fafc', border: sectionBorder, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: textTitle, mb: 1.5 }}>
                    Petugas 1 (Yang Melakukan Inspeksi):
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={7}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Nama Penanggung Jawab 1 *"
                        value={inspector1Name}
                        onChange={(e) => setInspector1Name(e.target.value)}
                        required
                        helperText="Otomatis mengikuti akun login"
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Jabatan *"
                        value={inspector1Role}
                        onChange={(e) => setInspector1Role(e.target.value)}
                        required
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, bgcolor: isDark ? '#081220' : '#f8fafc', border: sectionBorder, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: textTitle, mb: 1.5 }}>
                    Petugas 2 (Rekan Tandem IT):
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={7}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Nama Penanggung Jawab 2 *"
                        value={inspector2Name}
                        onChange={(e) => setInspector2Name(e.target.value)}
                        required
                        helperText="Rekan IT tandem di lokasi Biangan"
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Jabatan *"
                        value={inspector2Role}
                        onChange={(e) => setInspector2Role(e.target.value)}
                        required
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

            </Grid>

            <Divider sx={{ my: 4 }} />

            {/* Tombol Aksi */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => navigate('/inspections')}
                disabled={submitting}
              >
                Batal
              </Button>

              <Button
                variant="outlined"
                color="primary"
                onClick={() => handleSave(true)}
                disabled={submitting || radioUploading || cameraUploading}
                startIcon={<AddIcon />}
                sx={{ px: 3, fontWeight: 700 }}
              >
                Simpan & Lanjut Unit Berikutnya
              </Button>

              <Button
                type="submit"
                variant="contained"
                color="secondary"
                disabled={submitting || radioUploading || cameraUploading}
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                sx={{
                  px: 4,
                  py: 1.2,
                  fontWeight: 800,
                  bgcolor: isDark ? '#ffd600' : '#2563eb',
                  color: isDark ? '#000000' : '#ffffff',
                  '&:hover': {
                    bgcolor: isDark ? '#e6c200' : '#1d4ed8',
                  },
                }}
              >
                {submitting ? 'Menyimpan...' : 'Simpan Hasil Inspeksi'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Dialog Preview Foto Ukuran Penuh */}
      <Dialog
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Foto Dokumentasi Barang di Unit</span>
          <IconButton size="small" onClick={() => setPreviewImage(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 2 }}>
          {previewImage && (
            <Box
              component="img"
              src={previewImage}
              alt="Preview Full"
              sx={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 2, objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default InspectionCreate;
