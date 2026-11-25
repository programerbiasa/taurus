import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Save as SaveIcon,
  CloudUpload as UploadIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import api from '../api';
import { AppSettings } from '../types';

export const AppSettingsPage: React.FC = () => {
  // Logo default resmi PT ELMA
  const DEFAULT_LOGO_ELMA = '/taurus/logo-elma.png';

  const [appName, setAppName] = useState('TAURUS');
  const [appTagline, setAppTagline] = useState('IT SUPPORT SYSTEM');
  const [appLogoUrl, setAppLogoUrl] = useState(DEFAULT_LOGO_ELMA);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get<AppSettings>('/settings');
      if (res.data) {
        setAppName(res.data.app_name || 'TAURUS');
        setAppTagline(res.data.app_tagline || 'IT SUPPORT SYSTEM');
        setAppLogoUrl(res.data.app_logo_url || DEFAULT_LOGO_ELMA);
      }
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal memuat pengaturan aplikasi',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);

      try {
        setUploading(true);
        setAlertInfo(null);
        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setAppLogoUrl(res.data.url);
        setAlertInfo({ type: 'success', message: 'Logo berhasil diunggah! Jangan lupa klik Simpan Pengaturan.' });
      } catch (err: any) {
        setAlertInfo({
          type: 'error',
          message: err.response?.data?.message || 'Gagal mengunggah file logo',
        });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      setAlertInfo({ type: 'error', message: 'Nama aplikasi tidak boleh kosong' });
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/settings', {
        app_name: appName.trim(),
        app_tagline: appTagline.trim(),
        app_logo_url: (appLogoUrl || DEFAULT_LOGO_ELMA).trim(),
      });
      setAlertInfo({ type: 'success', message: res.data.message });
      // Update localStorage agar sidebar langsung ter-update
      localStorage.setItem('taurus_app_name', appName.trim());
      localStorage.setItem('taurus_app_tagline', appTagline.trim());
      localStorage.setItem('taurus_app_logo', (appLogoUrl || DEFAULT_LOGO_ELMA).trim());
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menyimpan pengaturan aplikasi',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === 'dark' ? '#ffd600' : '#1a237e' }}>
            Pengaturan Identitas & Logo Aplikasi
          </Typography>
          <Typography variant="body2" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b' }}>
            Ubah nama aplikasi, sub-judul tagline, dan logo visual yang tampil di sidebar serta halaman login.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchSettings}
          sx={{ textTransform: 'none' }}
        >
          Muat Ulang
        </Button>
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

      <Card sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSave}>
            <Grid container spacing={3}>
              {/* Preview Logo */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: (theme) => theme.palette.mode === 'dark' ? '#ffd600' : '#334155', mb: 1.5 }}>
                  Pratinjau Logo Aplikasi:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 2.5, bgcolor: '#0f172a', borderRadius: 2, color: '#fff' }}>
                  {/* Selalu tampil logo — kustom atau default ELMA */}
                  <Box
                    component="img"
                    src={appLogoUrl || DEFAULT_LOGO_ELMA}
                    alt="Logo Aplikasi"
                    sx={{
                      width: 56,
                      height: 56,
                      objectFit: 'contain',
                      borderRadius: 2,
                      bgcolor: '#ffffff',
                      p: 0.5,
                      border: '2px solid #d4af37',
                    }}
                  />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 1.5, lineHeight: 1.2 }}>
                      {appName || 'NAMA APLIKASI'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', letterSpacing: 1 }}>
                      {appTagline || 'TAGLINE APLIKASI'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Upload Logo / Reset ke Logo ELMA */}
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#475569', mb: 1 }}>
                  Logo Aplikasi:
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={uploading ? <CircularProgress size={18} /> : <UploadIcon />}
                    disabled={uploading}
                    sx={{ textTransform: 'none' }}
                  >
                    {uploading ? 'Mengunggah...' : 'Ganti Logo (PNG / JPG / SVG)'}
                    <input type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                  </Button>
                  {/* Tombol reset ke logo ELMA — tampil jika logo kustom (bukan default ELMA) */}
                  {appLogoUrl && appLogoUrl !== DEFAULT_LOGO_ELMA && (
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={
                        <Box
                          component="img"
                          src={DEFAULT_LOGO_ELMA}
                          alt="ELMA"
                          sx={{ width: 18, height: 18, objectFit: 'contain', bgcolor: '#fff', borderRadius: '3px' }}
                        />
                      }
                      onClick={() => setAppLogoUrl(DEFAULT_LOGO_ELMA)}
                      sx={{ textTransform: 'none' }}
                    >
                      Reset ke Logo ELMA
                    </Button>
                  )}
                </Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5, display: 'block' }}>
                  Logo default: Logo resmi PT ELMA. Upload untuk mengganti dengan logo kustom.
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Nama Aplikasi */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nama Aplikasi"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  required
                  helperText="Nama utama sistem (contoh: TAURUS, IT SUPPORT PORTAL)"
                />
              </Grid>

              {/* Tagline / Deskripsi Singkat */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Sub-Nama / Tagline"
                  value={appTagline}
                  onChange={(e) => setAppTagline(e.target.value)}
                  helperText="Keterangan singkat di bawah logo (contoh: IT SUPPORT SYSTEM)"
                />
              </Grid>

              {/* URL Logo Manual (Opsional) */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="URL Gambar Logo (Otomatis terisi saat upload)"
                  value={appLogoUrl}
                  onChange={(e) => setAppLogoUrl(e.target.value)}
                  placeholder="http://172.16.5.254/uploads/logo.png"
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>

              {/* Tombol Simpan */}
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={22} color="inherit" /> : <SaveIcon />}
                  sx={{ px: 4, py: 1.2, fontWeight: 700, textTransform: 'none' }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AppSettingsPage;
