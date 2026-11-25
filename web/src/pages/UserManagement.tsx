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
  Paper,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';
import api from '../api';
import socket from '../socket';
import { User, UserRole, UserStatus } from '../types';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabFilter, setTabFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal dialog konfirmasi delete
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal memuat daftar pengguna',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Listen to real-time events
    const handleUserRegistered = () => fetchUsers();
    const handleUserStatusChanged = () => fetchUsers();
    const handleUserRoleChanged = () => fetchUsers();

    socket.on('userRegistered', handleUserRegistered);
    socket.on('userStatusChanged', handleUserStatusChanged);
    socket.on('userRoleChanged', handleUserRoleChanged);

    return () => {
      socket.off('userRegistered', handleUserRegistered);
      socket.off('userStatusChanged', handleUserStatusChanged);
      socket.off('userRoleChanged', handleUserRoleChanged);
    };
  }, []);

  const handleUpdateStatus = async (userId: number, newStatus: UserStatus, targetRole?: UserRole) => {
    try {
      const payload: any = { status: newStatus };
      if (targetRole) payload.role = targetRole;

      const res = await api.patch(`/auth/users/${userId}/status`, payload);
      setAlertInfo({ type: 'success', message: res.data.message });
      // Update data di state lokal
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus, role: targetRole || u.role } : u))
      );
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal memperbarui status pengguna',
      });
    }
  };

  const handleUpdateRole = async (userId: number, newRole: UserRole) => {
    try {
      const res = await api.patch(`/auth/users/${userId}/role`, { role: newRole });
      setAlertInfo({ type: 'success', message: res.data.message });
      // Update data di state lokal
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal memperbarui hak akses pengguna',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;
    try {
      const res = await api.delete(`/auth/users/${deleteDialog.user.id}`);
      setAlertInfo({ type: 'success', message: res.data.message });
      setUsers((prev) => prev.filter((u) => u.id !== deleteDialog.user!.id));
      setDeleteDialog({ open: false, user: null });
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menghapus pengguna',
      });
    }
  };

  const filteredUsers = users.filter((u) => {
    if (tabFilter === 'all') return true;
    return u.status === tabFilter;
  });

  const pendingCount = users.filter((u) => u.status === 'pending').length;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === 'dark' ? '#ffd600' : '#1a237e' }}>
            Pengaturan Pengguna & Hak Akses
          </Typography>
          <Typography variant="body2" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b' }}>
            Atur 3 hak akses pengguna (Client, IT Support, Administrator) dan persetujuan akun pendaftar baru.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchUsers}
          disabled={loading}
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

      {/* Tabs Filter */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tabFilter}
          onChange={(_, val) => setTabFilter(val)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            value="pending"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PendingIcon fontSize="small" />
                <span>Menunggu Persetujuan</span>
                {pendingCount > 0 && (
                  <Chip
                    label={pendingCount}
                    size="small"
                    color="warning"
                    sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
                  />
                )}
              </Box>
            }
          />
          <Tab value="approved" label="Disetujui (Aktif)" />
          <Tab value="rejected" label="Ditolak" />
          <Tab value="all" label={`Semua Pengguna (${users.length})`} />
        </Tabs>
      </Paper>

      {/* Tabel Pengguna */}
      <Card sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : filteredUsers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}>
              <PersonIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography variant="body1">
                {tabFilter === 'pending'
                  ? 'Tidak ada akun yang sedang menunggu persetujuan.'
                  : 'Tidak ada data pengguna pada kategori ini.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Nama Lengkap</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Hak Akses (Role)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Tanggal Daftar</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      Aksi Persetujuan & Kelola
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{user.name || '-'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', color: (theme) => theme.palette.mode === 'dark' ? '#ffd600' : '#1a237e', fontWeight: 700 }}>
                        {user.username}
                      </TableCell>
                      <TableCell>
                        {user.username === 'admin' ? (
                          <Chip
                            label="Administrator (Utama)"
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 700 }}
                          />
                        ) : (
                          <FormControl size="small" fullWidth sx={{ maxWidth: 180 }}>
                            <Select
                              value={user.role}
                              onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                              sx={{
                                height: 32,
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                bgcolor:
                                  user.role === 'admin'
                                    ? '#fff7ed'
                                    : user.role === 'it_support'
                                    ? '#f0f9ff'
                                    : '#f8fafc',
                              }}
                            >
                              <MenuItem value="client">Client (Tiketing Saja)</MenuItem>
                              <MenuItem value="it_support">IT Support (Tiket & Job)</MenuItem>
                              <MenuItem value="admin">Administrator (Pengawas)</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.status === 'approved' && (
                          <Chip label="Disetujui" color="success" size="small" />
                        )}
                        {user.status === 'pending' && (
                          <Chip label="Menunggu Approve" color="warning" size="small" />
                        )}
                        {user.status === 'rejected' && (
                          <Chip label="Ditolak" color="error" size="small" />
                        )}
                      </TableCell>
                      <TableCell sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b', fontSize: '0.85rem' }}>
                        {user.created_at
                          ? new Date(user.created_at).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          {user.status !== 'approved' && (
                            <Tooltip title="Setujui (Approve) Akun">
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                startIcon={<ApproveIcon />}
                                onClick={() => handleUpdateStatus(user.id, 'approved')}
                                sx={{ textTransform: 'none', px: 1.5 }}
                              >
                                Setujui
                              </Button>
                            </Tooltip>
                          )}

                          {user.status !== 'rejected' && user.username !== 'admin' && (
                            <Tooltip title="Tolak Pendaftaran">
                              <Button
                                variant="outlined"
                                color="warning"
                                size="small"
                                startIcon={<RejectIcon />}
                                onClick={() => handleUpdateStatus(user.id, 'rejected')}
                                sx={{ textTransform: 'none', px: 1.5 }}
                              >
                                Tolak
                              </Button>
                            </Tooltip>
                          )}

                          {user.username !== 'admin' && (
                            <Tooltip title="Hapus Pengguna">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => setDeleteDialog({ open: true, user })}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
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

      {/* Dialog Konfirmasi Hapus */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, user: null })}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#d32f2f' }}>
          Hapus Akun Pengguna?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Apakah Anda yakin ingin menghapus akun <b>{deleteDialog.user?.username}</b> (
            {deleteDialog.user?.name})? Tindakan ini tidak dapat dibatalkan.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })}>Batal</Button>
          <Button variant="contained" color="error" onClick={handleDeleteUser}>
            Hapus Akun
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
