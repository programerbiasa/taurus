import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  SupportAgent as TaurusIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export const Login: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0); // 0 = Login, 1 = Register
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const DEFAULT_LOGO_ELMA = '/taurus/logo-elma.png';

  const [appName, setAppName] = useState(localStorage.getItem('taurus_app_name') || 'TAURUS');
  const [appTagline, setAppTagline] = useState(localStorage.getItem('taurus_app_tagline') || 'IT Support Management System');
  const [appLogoUrl, setAppLogoUrl] = useState(localStorage.getItem('taurus_app_logo') || DEFAULT_LOGO_ELMA);

  const navigate = useNavigate();

  useEffect(() => {
    api.get('/settings')
      .then((res) => {
        if (res.data) {
          setAppName(res.data.app_name || 'TAURUS');
          setAppTagline(res.data.app_tagline || 'IT Support Management System');
          const logo = res.data.app_logo_url || DEFAULT_LOGO_ELMA;
          setAppLogoUrl(logo);
          localStorage.setItem('taurus_app_name', res.data.app_name || 'TAURUS');
          localStorage.setItem('taurus_app_tagline', res.data.app_tagline || 'IT Support Management System');
          localStorage.setItem('taurus_app_logo', logo);
        }
      })
      .catch(() => {});
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username dan password harus diisi');
      return;
    }

    try {
      setLoading(true);

      if (tabIndex === 0) {
        // Mode Login
        const res = await api.post('/auth/login', { username, password });
        localStorage.setItem('taurus_token', res.data.token);
        localStorage.setItem('taurus_user', JSON.stringify(res.data.user));

        // Redirect sesuai hak akses pengguna:
        // Client langsung ke form Buat Tiket Baru
        // IT Support & Admin ke Dashboard
        if (res.data.user?.role === 'client') {
          navigate('/tickets/create');
        } else {
          navigate('/');
        }
      } else {
        // Mode Registrasi Akun Baru
        const res = await api.post('/auth/register', { username, password, name });
        setSuccessMsg(res.data.message || 'Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan Administrator.');
        setTabIndex(0);
        setPassword('');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal melakukan autentikasi ke server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0d1b2a 0%, #1a237e 50%, #1b263b 100%)',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 440,
          width: '100%',
          borderRadius: 4,
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Brand Banner dengan Logo dan Nama Dinamis */}
        <Box
          sx={{
            bgcolor: '#1a237e',
            py: 4,
            px: 3,
            textAlign: 'center',
            color: '#ffffff',
            borderBottom: '3.5px solid #d4af37',
          }}
        >
          <Box
            component="img"
            src={appLogoUrl || DEFAULT_LOGO_ELMA}
            alt="Logo"
            sx={{
              width: 80,
              height: 52,
              borderRadius: 2,
              objectFit: 'contain',
              bgcolor: '#ffffff',
              boxShadow: '0 4px 18px rgba(212, 175, 55, 0.45)',
              mb: 1.5,
              p: 0.6,
              border: '2px solid #d4af37',
            }}
          />

          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: 2 }}>
            {appName}
          </Typography>
          <Typography variant="body2" sx={{ color: '#fbbf24', fontWeight: 600, mt: 0.5 }}>
            {appTagline}
          </Typography>
        </Box>

        <CardContent sx={{ p: 3.5 }}>
          <Tabs
            value={tabIndex}
            onChange={(_, val) => {
              setTabIndex(val);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            variant="fullWidth"
            textColor="secondary"
            indicatorColor="secondary"
            sx={{ mb: 3 }}
          >
            <Tab label="Masuk (Login)" sx={{ fontWeight: 600 }} />
            <Tab label="Daftar Akun" sx={{ fontWeight: 600 }} />
          </Tabs>

          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {errorMsg}
            </Alert>
          )}

          {successMsg && (
            <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }}>
              {successMsg}
            </Alert>
          )}

          <form onSubmit={handleAuthSubmit}>
            {tabIndex === 1 && (
              <TextField
                fullWidth
                label="Nama Lengkap Karyawan"
                placeholder="Contoh: Budi Santoso"
                margin="normal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            <TextField
              fullWidth
              label="Username Akun"
              placeholder="Masukkan username"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Masukkan kata sandi"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                py: 1.4,
                fontWeight: 700,
                fontSize: '1rem',
                borderRadius: 2,
              }}
            >
              {loading ? (
                <CircularProgress size={26} color="inherit" />
              ) : tabIndex === 0 ? (
                'Masuk ke Sistem'
              ) : (
                'Daftar Akun Baru'
              )}
            </Button>
          </form>

          {tabIndex === 1 && (
            <Typography variant="caption" sx={{ display: 'block', mt: 2, textAlign: 'center', color: '#64748b' }}>
              *Setelah mendaftar, akun Anda harus disetujui oleh Administrator IT sebelum dapat digunakan untuk login.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
