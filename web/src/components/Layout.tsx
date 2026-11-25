import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Avatar,
  Snackbar,
  Alert,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ConfirmationNumber as TicketIcon,
  AddCircleOutline as AddTicketIcon,
  Assignment as JobIcon,
  PostAdd as AddJobIcon,
  ExitToApp as LogoutIcon,
  SupportAgent as TaurusIcon,
  People as PeopleIcon,
  Category as CategoryIcon,
  ReportProblem as ProblemIcon,
  Flag as PriorityIcon,
  DirectionsCar as VehicleIcon,
  Tune as SettingsAppIcon,
  Radio as RadioIcon,
  Videocam as DashcamIcon,
  AssignmentTurnedIn as InspectIcon,
  PlaylistAddCheck as AddInspectIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import socket from '../socket';
import api from '../api';
import { NotificationPayload } from '../types';
import FloatingChat from './FloatingChat';
import { playNotificationSound, showDesktopNotification } from '../utils/sound';
import { useAppTheme } from '../ThemeContext';

const drawerWidth = 225;

export const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'info' | 'success' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Logo default PT ELMA — digunakan jika belum ada logo kustom dari pengaturan
  const DEFAULT_LOGO = '/taurus/logo-elma.png';

  const [settings, setSettings] = useState<{ app_name: string; app_tagline: string; app_logo_url: string }>({
    app_name: localStorage.getItem('taurus_app_name') || 'TAURUS',
    app_tagline: localStorage.getItem('taurus_app_tagline') || 'IT SUPPORT SYSTEM',
    app_logo_url: localStorage.getItem('taurus_app_logo') || DEFAULT_LOGO,
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleTheme } = useAppTheme();

  const userJson = localStorage.getItem('taurus_user');
  const currentUser = userJson ? JSON.parse(userJson) : { name: 'User', username: 'user', role: 'client' };
  
  // Tentukan 3 role utama secara tegas: admin, it_support, client
  const role: 'admin' | 'it_support' | 'client' =
    currentUser.role === 'admin' || currentUser.username === 'admin'
      ? 'admin'
      : currentUser.role === 'it_support' || currentUser.role === 'technician'
      ? 'it_support'
      : 'client';

  // Fetch identitas aplikasi (Nama, Tagline, Logo)
  useEffect(() => {
    api.get('/settings')
      .then((res) => {
        if (res.data) {
          setSettings({
            app_name: res.data.app_name || 'TAURUS',
            app_tagline: res.data.app_tagline || 'IT SUPPORT SYSTEM',
            app_logo_url: res.data.app_logo_url || DEFAULT_LOGO,
          });
          localStorage.setItem('taurus_app_name', res.data.app_name || 'TAURUS');
          localStorage.setItem('taurus_app_tagline', res.data.app_tagline || 'IT SUPPORT SYSTEM');
          localStorage.setItem('taurus_app_logo', res.data.app_logo_url || DEFAULT_LOGO);
        }
      })
      .catch((err) => console.log('Gagal load app settings:', err));

    const handleSettingsUpdated = (data: any) => {
      const logoUrl = data.app_logo_url || DEFAULT_LOGO;
      setSettings({
        app_name: data.app_name || 'TAURUS',
        app_tagline: data.app_tagline || 'IT SUPPORT SYSTEM',
        app_logo_url: logoUrl,
      });
      localStorage.setItem('taurus_app_name', data.app_name || 'TAURUS');
      localStorage.setItem('taurus_app_tagline', data.app_tagline || 'IT SUPPORT SYSTEM');
      localStorage.setItem('taurus_app_logo', logoUrl);
    };

    socket.on('settingsUpdated', handleSettingsUpdated);
    return () => {
      socket.off('settingsUpdated', handleSettingsUpdated);
    };
  }, []);

  // Listener WebSocket untuk Notifikasi Real-Time
  useEffect(() => {
    const handleNotification = (data: NotificationPayload) => {
      playNotificationSound();
      setNotification({
        open: true,
        message: `${data.title}: ${data.message}`,
        severity: 'info',
      });
      showDesktopNotification(data.title, data.message);
    };

    const handleTicketCreated = (data: any) => {
      playNotificationSound();
      setNotification({
        open: true,
        message: `Tiket Baru #${data.id}: "${data.subject}" baru saja dibuat!`,
        severity: 'success',
      });
      showDesktopNotification(`Tiket Baru #${data.id}`, data.subject);
    };

    const handleJobCreated = (data: any) => {
      playNotificationSound();
      setNotification({
        open: true,
        message: `Job Baru #${data.id} (${data.problem_category}) telah ditambahkan!`,
        severity: 'info',
      });
      showDesktopNotification(`Job Baru #${data.id}`, `${data.problem_category}: ${data.problem_description || ''}`);
    };

    const handleTicketStatusNotification = (data: any) => {
      if (data.reporterId === currentUser.id) {
        playNotificationSound();
        setNotification({
          open: true,
          message: data.message,
          severity: 'success',
        });
        showDesktopNotification('Status Tiket Diperbarui', data.message);
      }
    };

    socket.on('notification', handleNotification);
    socket.on('ticketCreated', handleTicketCreated);
    socket.on('jobCreated', handleJobCreated);
    socket.on('ticketStatusNotification', handleTicketStatusNotification);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('ticketCreated', handleTicketCreated);
      socket.off('jobCreated', handleJobCreated);
      socket.off('ticketStatusNotification', handleTicketStatusNotification);
    };
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('taurus_token');
    localStorage.removeItem('taurus_user');
    navigate('/login');
  };

  // STRICT 3 ROLES MENU DEFINITION
  let navItems: { text: string; path: string; icon: React.ReactElement }[] = [];

  if (role === 'client') {
    // 1. CLIENT: Antrian Tiket Saya, Buat Tiket Baru, Radio, Dascam (Read-Only)
    navItems = [
      { text: 'Antrian Tiket Saya', path: '/', icon: <TicketIcon /> },
      { text: 'Buat Tiket Baru', path: '/tickets/create', icon: <AddTicketIcon /> },
      { text: 'Radio', path: '/radios', icon: <RadioIcon /> },
      { text: 'Dascam', path: '/dashcams', icon: <DashcamIcon /> },
    ];
  } else if (role === 'it_support') {
    // 2. IT SUPPORT: Dashboard, Daftar Tiket, Buat Tiket, Daftar Job, Buat Job Baru, Radio, Dascam
    navItems = [
      { text: 'Dashboard', path: '/', icon: <DashboardIcon /> },
      { text: 'Daftar Tiket', path: '/tickets', icon: <TicketIcon /> },
      { text: 'Buat Tiket Baru', path: '/tickets/create', icon: <AddTicketIcon /> },
      { text: 'Daftar Job Teknisi', path: '/jobs', icon: <JobIcon /> },
      { text: 'Buat Job Baru', path: '/jobs/create', icon: <AddJobIcon /> },
      { text: 'Radio', path: '/radios', icon: <RadioIcon /> },
      { text: 'Dascam', path: '/dashcams', icon: <DashcamIcon /> },
      { text: 'Tambah Inspeksi', path: '/inspections/create', icon: <AddInspectIcon /> },
      { text: 'Rekap Inspeksi', path: '/inspections', icon: <InspectIcon /> },
    ];
  } else if (role === 'admin') {
    // 3. ADMINISTRATOR: Dashboard pengawas, Daftar Tiket, Buat Tiket, Daftar Job (Read-Only),
    // Radio, Dascam, Pengaturan User, Kelola Kategori, Tingkat Prioritas, Nomor Unit Kendaraan, Pengaturan Aplikasi (Logo & Nama)
    navItems = [
      { text: 'Dashboard', path: '/', icon: <DashboardIcon /> },
      { text: 'Daftar Tiket', path: '/tickets', icon: <TicketIcon /> },
      { text: 'Buat Tiket Baru', path: '/tickets/create', icon: <AddTicketIcon /> },
      { text: 'Daftar Job Teknisi', path: '/jobs', icon: <JobIcon /> },
      { text: 'Radio', path: '/radios', icon: <RadioIcon /> },
      { text: 'Dascam', path: '/dashcams', icon: <DashcamIcon /> },
      { text: 'Tambah Inspeksi', path: '/inspections/create', icon: <AddInspectIcon /> },
      { text: 'Rekap Inspeksi', path: '/inspections', icon: <InspectIcon /> },
      { text: 'Pengaturan User', path: '/users', icon: <PeopleIcon /> },
      { text: 'Kelola Kategori', path: '/categories', icon: <CategoryIcon /> },
      { text: 'Master Kendala', path: '/problems', icon: <ProblemIcon /> },
      { text: 'Tingkat Prioritas', path: '/priorities', icon: <PriorityIcon /> },
      { text: 'Nomor Unit Kendaraan', path: '/units', icon: <VehicleIcon /> },
      { text: 'Pengaturan Aplikasi', path: '/settings', icon: <SettingsAppIcon /> },
    ];
  }

  const roleLabel =
    role === 'admin' ? 'Administrator' : role === 'it_support' ? 'IT Support' : 'Client';

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: mode === 'dark' ? '#070d18' : '#0f172a',
        color: '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* Brand Header dengan Logo dan Nama Dinamis */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <Box
          component="img"
          src={settings.app_logo_url || DEFAULT_LOGO}
          alt="Logo"
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            objectFit: 'contain',
            bgcolor: '#ffffff',
            p: 0.5,
            boxShadow: '0 4px 14px rgba(212, 175, 55, 0.45)',
            border: '1.5px solid #d4af37',
          }}
        />
        <Box sx={{ overflow: 'hidden' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              letterSpacing: 1.2,
              color: '#ffffff',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {settings.app_name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: mode === 'dark' ? '#00ff66' : '#fbbf24',
              fontSize: '0.70rem',
              fontWeight: 600,
              letterSpacing: 0.5,
              display: 'block',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {settings.app_tagline}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: mode === 'dark' ? '#1e293b' : 'rgba(212, 175, 55, 0.25)', flexShrink: 0 }} />

      {/* Navigation Links (Scrollable tersendiri jika layar pendek) */}
      <List
        sx={{
          px: 1.2,
          py: 1,
          flexGrow: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: mode === 'dark' ? 'rgba(0, 255, 102, 0.25)' : 'rgba(255, 255, 255, 0.18)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: mode === 'dark' ? '#00ff66' : 'rgba(255, 255, 255, 0.35)',
          },
        }}
      >
        {navItems.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (mobileOpen) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  py: 0.9,
                  px: 1.5,
                  background: isSelected
                    ? (mode === 'dark'
                        ? 'linear-gradient(90deg, rgba(255, 214, 0, 0.22) 0%, rgba(255, 214, 0, 0.08) 100%)'
                        : 'linear-gradient(90deg, rgba(212, 175, 55, 0.22) 0%, rgba(245, 158, 11, 0.10) 100%)')
                    : 'transparent',
                  color: isSelected ? (mode === 'dark' ? '#ffd600' : '#fbbf24') : '#cbd5e1',
                  borderLeft: isSelected
                    ? (mode === 'dark' ? '4px solid #ffd600' : '4px solid #d4af37')
                    : '4px solid transparent',
                  boxShadow: isSelected ? '0 2px 10px rgba(0,0,0,0.3)' : 'none',
                  '&:hover': {
                    bgcolor: isSelected
                      ? (mode === 'dark' ? 'rgba(255, 214, 0, 0.28)' : 'rgba(212, 175, 55, 0.28)')
                      : (mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.08)'),
                    color: isSelected ? (mode === 'dark' ? '#ffd600' : '#fde047') : '#ffffff',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isSelected
                      ? (mode === 'dark' ? '#ffd600' : '#fbbf24')
                      : '#94a3b8',
                    minWidth: 36,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? 700 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: mode === 'dark' ? '#1e293b' : 'rgba(212, 175, 55, 0.25)', flexShrink: 0 }} />

      {/* User Info & Logout (Footer Terkunci di Bawah) */}
      <Box
        sx={{
          p: 1.8,
          bgcolor: mode === 'dark' ? '#0a1220' : '#1e293b',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ background: 'linear-gradient(135deg, #d97706 0%, #d4af37 100%)', color: '#ffffff', width: 38, height: 38, fontWeight: 700, boxShadow: '0 2px 8px rgba(212, 175, 55, 0.35)' }}>
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {currentUser.name || currentUser.username}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
              <Chip
                label={roleLabel}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor:
                    role === 'admin'
                      ? '#d97706'
                      : role === 'it_support'
                      ? '#0284c7'
                      : '#475569',
                  color: '#ffffff',
                }}
              />
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                @{currentUser.username}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          size="small"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            borderColor: '#475569',
            color: '#f8fafc',
            '&:hover': {
              borderColor: '#d4af37',
              bgcolor: 'rgba(212, 175, 55, 0.12)',
              color: '#fbbf24',
            },
          }}
        >
          Keluar
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* Top App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: mode === 'dark'
            ? 'linear-gradient(90deg, #070d18 0%, #0d1829 100%)'
            : 'linear-gradient(90deg, #1a237e 0%, #172554 100%)',
          borderBottom: mode === 'dark' ? '2px solid #00ff66' : '2.5px solid #d4af37',
          boxShadow: mode === 'dark' ? '0 4px 20px rgba(0, 255, 102, 0.15)' : '0 4px 14px rgba(0,0,0,0.25)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ color: mode === 'dark' ? '#00ff66' : '#fbbf24', textShadow: mode === 'dark' ? '0 0 10px rgba(0,255,102,0.6)' : 'none' }}>
              {settings.app_name}
            </span>
            <span style={{ opacity: 0.95 }}>Support Workspace</span>
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Tombol Switch Tema Hacker / Terang */}
            <Tooltip title={mode === 'dark' ? 'Ganti ke Tema Terang (Light)' : 'Ganti ke Tema Hacker (Dark)'}>
              <Button
                size="small"
                onClick={toggleTheme}
                startIcon={mode === 'dark' ? <LightModeIcon sx={{ color: '#fbbf24' }} /> : <DarkModeIcon sx={{ color: '#00ff66' }} />}
                sx={{
                  bgcolor: mode === 'dark' ? 'rgba(0, 255, 102, 0.12)' : 'rgba(255, 255, 255, 0.12)',
                  color: mode === 'dark' ? '#00ff66' : '#ffffff',
                  border: mode === 'dark' ? '1px solid #00ff66' : '1px solid rgba(255,255,255,0.3)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  boxShadow: mode === 'dark' ? '0 0 10px rgba(0,255,102,0.3)' : 'none',
                  '&:hover': {
                    bgcolor: mode === 'dark' ? 'rgba(0, 255, 102, 0.25)' : 'rgba(255, 255, 255, 0.2)',
                  },
                }}
              >
                {mode === 'dark' ? 'HACKER ON' : 'TERANG'}
              </Button>
            </Tooltip>

            <Tooltip title="Mode Server Online">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.8,
                  bgcolor: 'rgba(255,255,255,0.12)',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 4,
                  border: mode === 'dark' ? '1px solid #00ff6688' : '1px solid rgba(212, 175, 55, 0.4)',
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: '#4caf50',
                    boxShadow: '0 0 8px #4caf50',
                  }}
                />
                <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 600 }}>
                  Live Connected
                </Typography>
              </Box>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Side Drawer Navigation */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none',
              bgcolor: mode === 'dark' ? '#070d18' : '#0f172a',
              color: '#f8fafc',
              backgroundImage: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none',
              bgcolor: mode === 'dark' ? '#070d18' : '#0f172a',
              color: '#f8fafc',
              backgroundImage: 'none',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      {/* Floating Corner Chat Anggota & Admin */}
      <FloatingChat />

      {/* Realtime Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 8, zIndex: 1400 }}
      >
        <Alert
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Layout;
