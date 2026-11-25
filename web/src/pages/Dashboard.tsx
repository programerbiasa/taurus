import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  ConfirmationNumber as TicketIcon,
  PendingActions as PendingIcon,
  CheckCircle as CompletedIcon,
  Warning as UrgentIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import socket from '../socket';
import { Ticket, Job } from '../types';
import StatusBadge from '../components/StatusBadge';
import { useAppTheme } from '../ThemeContext';

export const Dashboard: React.FC = () => {
  const { mode } = useAppTheme();
  const isDark = mode === 'dark';
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ticketRes, jobRes] = await Promise.all([
        api.get<Ticket[]>('/tickets'),
        api.get<Job[]>('/jobs'),
      ]);
      setTickets(ticketRes.data);
      setJobs(jobRes.data);
    } catch (err) {
      console.error('Gagal mengambil data dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen to real-time events to auto-refresh metrics
    const handleRefresh = () => {
      fetchData();
    };

    socket.on('ticketCreated', handleRefresh);
    socket.on('ticketUpdated', handleRefresh);
    socket.on('ticketDeleted', handleRefresh);
    socket.on('jobCreated', handleRefresh);
    socket.on('jobUpdated', handleRefresh);
    socket.on('jobDeleted', handleRefresh);

    return () => {
      socket.off('ticketCreated', handleRefresh);
      socket.off('ticketUpdated', handleRefresh);
      socket.off('ticketDeleted', handleRefresh);
      socket.off('jobCreated', handleRefresh);
      socket.off('jobUpdated', handleRefresh);
      socket.off('jobDeleted', handleRefresh);
    };
  }, []);

  // Metrik Statistik
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === 'Open' || t.status === 'InProgress').length;
  const pendingJobs = jobs.filter((j) => j.status === 'Pending').length;
  const completedJobs = jobs.filter((j) => j.status === 'Completed').length;

  const urgentTickets = tickets
    .filter((t) => (t.priority === 'High' || t.priority === 'Critical') && t.status !== 'Closed')
    .slice(0, 5);

  const recentJobs = jobs.slice(0, 5);

  const userJson = localStorage.getItem('taurus_user');
  const currentUser = userJson ? JSON.parse(userJson) : { role: 'client' };
  const isAdmin = currentUser.role === 'admin' || currentUser.username === 'admin';

  const statCards = [
    {
      title: 'Total Tiket IT',
      value: totalTickets,
      icon: <TicketIcon sx={{ fontSize: 36, color: isDark ? '#ffd600' : '#1a237e' }} />,
      bgColor: isDark ? 'rgba(255, 214, 0, 0.18)' : '#e8eaf6',
      sub: 'Semua tiket yang masuk',
    },
    {
      title: 'Tiket Aktif / Open',
      value: openTickets,
      icon: <UrgentIcon sx={{ fontSize: 36, color: isDark ? '#ff4d6d' : '#d32f2f' }} />,
      bgColor: isDark ? 'rgba(255, 77, 109, 0.18)' : '#ffebee',
      sub: 'Perlu penanganan teknisi',
    },
    {
      title: 'Job Pending',
      value: pendingJobs,
      icon: <PendingIcon sx={{ fontSize: 36, color: isDark ? '#ffaa00' : '#ed6c02' }} />,
      bgColor: isDark ? 'rgba(255, 170, 0, 0.18)' : '#fff3e0',
      sub: 'Pekerjaan dalam antrian',
    },
    {
      title: 'Job Selesai',
      value: completedJobs,
      icon: <CompletedIcon sx={{ fontSize: 36, color: isDark ? '#00ff66' : '#2e7d32' }} />,
      bgColor: isDark ? 'rgba(0, 255, 102, 0.18)' : '#e8f5e9',
      sub: 'Pekerjaan terselesaikan',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={50} thickness={4} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header Banner */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: isDark ? '#ffd600' : '#1a237e' }}>
            Dashboard IT Support
          </Typography>
          <Typography variant="body1" sx={{ color: isDark ? '#94a3b8' : '#64748b', mt: 0.5 }}>
            Pantau tiket gangguan dan aktivitas pekerjaan operasional teknisi secara real-time.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/tickets/create')}
          >
            Buat Tiket
          </Button>
          {!isAdmin && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate('/jobs/create')}
            >
              Catat Pekerjaan
            </Button>
          )}
        </Box>
      </Box>

      {/* KPI Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>
                      {stat.title}
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: isDark ? '#ffd600' : '#1e293b', my: 1 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                      {stat.sub}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: stat.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tables Row: Tiket Mendesak & Aktivitas Pekerjaan Terbaru */}
      <Grid container spacing={3}>
        {/* Tiket Mendesak */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: isDark ? '#ffd600' : '#1e293b' }}>
                Tiket Butuh Tindakan Segera
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/tickets')}
              >
                Lihat Semua
              </Button>
            </Box>
            <Divider />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Subjek</TableCell>
                    <TableCell>Prioritas</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {urgentTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                        Tidak ada tiket berprioritas tinggi yang aktif saat ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    urgentTickets.map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>#{t.id}</TableCell>
                        <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.subject}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={t.priority} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={t.status} />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/tickets/${t.id}`)}
                          >
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Pekerjaan Teknisi Terbaru */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: isDark ? '#ffd600' : '#1e293b' }}>
                Log Pekerjaan Terbaru
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/jobs')}
              >
                Lihat Semua
              </Button>
            </Box>
            <Divider />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tanggal / Hari</TableCell>
                    <TableCell>Kategori</TableCell>
                    <TableCell>Teknisi</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                        Belum ada catatan pekerjaan teknisi yang tercatat.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentJobs.map((j) => (
                      <TableRow key={j.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {j.work_date}
                          </Typography>
                          <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b' }}>
                            {j.work_day} ({j.start_time.slice(0, 5)})
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{j.problem_category}</TableCell>
                        <TableCell>{j.user?.name || j.user?.username || '-'}</TableCell>
                        <TableCell>
                          <StatusBadge status={j.status} />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/jobs/${j.id}`)}
                          >
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
