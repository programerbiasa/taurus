import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  ConfirmationNumber as TicketIcon,
  HourglassEmpty as PendingIcon,
  Engineering as InProgressIcon,
  CheckCircle as CompletedIcon,
  Refresh as RefreshIcon,
  DirectionsCar as VehicleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import socket from '../socket';
import { Ticket, TicketStatusNotification } from '../types';
import StatusBadge from '../components/StatusBadge';
import { useAppTheme } from '../ThemeContext';

export const ClientDashboard: React.FC = () => {
  const { mode } = useAppTheme();
  const isDark = mode === 'dark';
  const textNavy = isDark ? '#ffd600' : '#1a237e';
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<'All' | 'Open' | 'InProgress' | 'Closed'>('All');
  const [latestNotif, setLatestNotif] = useState<string | null>(null);

  const navigate = useNavigate();

  const userJson = localStorage.getItem('taurus_user');
  const currentUser = userJson ? JSON.parse(userJson) : { id: 0, name: 'Client' };

  const fetchMyTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get<Ticket[]>('/tickets', {
        params: { my_tickets: 'true' },
      });
      setTickets(res.data);
    } catch (err) {
      console.error('Gagal mengambil antrian tiket client:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();

    const handleTicketChange = () => fetchMyTickets();

    const handleStatusNotification = (data: TicketStatusNotification) => {
      // Jika tiket ini milik client yang sedang login, tampilkan notifikasi khusus
      if (data.reporterId === currentUser.id) {
        setLatestNotif(data.message);
        fetchMyTickets();
      }
    };

    socket.on('ticketCreated', handleTicketChange);
    socket.on('ticketUpdated', handleTicketChange);
    socket.on('ticketStatusNotification', handleStatusNotification);

    return () => {
      socket.off('ticketCreated', handleTicketChange);
      socket.off('ticketUpdated', handleTicketChange);
      socket.off('ticketStatusNotification', handleStatusNotification);
    };
  }, []);

  const totalTickets = tickets.length;
  const waitingTickets = tickets.filter((t) => t.status === 'Open').length;
  const inProgressTickets = tickets.filter((t) => t.status === 'InProgress').length;
  const closedTickets = tickets.filter((t) => t.status === 'Closed' || t.status === 'Resolved').length;

  const filteredTickets = tickets.filter((t) => {
    if (statusTab === 'All') return true;
    if (statusTab === 'Closed') return t.status === 'Closed' || t.status === 'Resolved';
    return t.status === statusTab;
  });

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      {/* Header Banner */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: textNavy }}>
            Antrian Tiket & Status Kendala
          </Typography>
          <Typography variant="body1" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b', mt: 0.5 }}>
            Halo <b>{currentUser.name || currentUser.username}</b>, pantau status pengerjaan tiket kendala Anda oleh teknisi IT Support secara langsung.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchMyTickets}
            disabled={loading}
          >
            Segarkan
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/tickets/create')}
            sx={{ px: 2.5, py: 1 }}
          >
            Buat Tiket Baru
          </Button>
        </Box>
      </Box>

      {/* Alert Pemberitahuan Khusus Realtime Jika Tiket Sedang Dikerjakan IT */}
      {latestNotif && (
        <Alert
          severity="info"
          onClose={() => setLatestNotif(null)}
          sx={{ mb: 3.5, borderRadius: 2, bgcolor: '#e0f2fe', border: '1px solid #7dd3fc', color: '#0369a1', fontWeight: 600 }}
        >
          {latestNotif}
        </Alert>
      )}

      {/* KPI Kartu Statistik Antrian */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, borderRadius: 3, borderLeft: '5px solid #1a237e' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  TOTAL TIKET SAYA
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: textNavy, mt: 0.5 }}>
                  {totalTickets}
                </Typography>
              </Box>
              <TicketIcon sx={{ fontSize: 38, color: textNavy, opacity: 0.3 }} />
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, borderRadius: 3, borderLeft: '5px solid #ff9800' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  MENUNGGU RESPON IT
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#e65100', mt: 0.5 }}>
                  {waitingTickets}
                </Typography>
              </Box>
              <PendingIcon sx={{ fontSize: 38, color: '#ff9800', opacity: 0.4 }} />
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, borderRadius: 3, borderLeft: '5px solid #0284c7' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  SEDANG DIKERJAKAN IT
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0284c7', mt: 0.5 }}>
                  {inProgressTickets}
                </Typography>
              </Box>
              <InProgressIcon sx={{ fontSize: 38, color: '#0284c7', opacity: 0.4 }} />
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, borderRadius: 3, borderLeft: '5px solid #2e7d32' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  TIKET SELESAI
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#2e7d32', mt: 0.5 }}>
                  {closedTickets}
                </Typography>
              </Box>
              <CompletedIcon sx={{ fontSize: 38, color: '#2e7d32', opacity: 0.4 }} />
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Tabs */}
      <Card sx={{ borderRadius: 3, mb: 4, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
          <Tabs
            value={statusTab}
            onChange={(_, val) => setStatusTab(val)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label={`Semua Tiket (${tickets.length})`} value="All" sx={{ fontWeight: 600 }} />
            <Tab label={`Menunggu IT (${waitingTickets})`} value="Open" sx={{ fontWeight: 600 }} />
            <Tab label={`Sedang Dikerjakan (${inProgressTickets})`} value="InProgress" sx={{ fontWeight: 600 }} />
            <Tab label={`Selesai (${closedTickets})`} value="Closed" sx={{ fontWeight: 600 }} />
          </Tabs>
        </Box>

        {/* Tabel Antrian Tiket */}
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <CircularProgress />
            </Box>
          ) : filteredTickets.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, color: '#94a3b8' }}>
              <TicketIcon sx={{ fontSize: 56, opacity: 0.4, mb: 1.5 }} />
              <Typography variant="h6" sx={{ color: '#475569' }}>
                Tidak ada tiket pada antrian ini
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Jika ada kendala perangkat, jaringan atau radio, klik tombol "Buat Tiket Baru".
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 90 }}>No. Tiket</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Subjek Kendala</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Kategori & Unit</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Prioritas</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status Antrian</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Teknisi Penanggung Jawab</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Waktu Lapor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTickets.map((t) => (
                    <TableRow key={t.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 800, color: textNavy }}>
                        #{t.id}
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                          {t.subject}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', maxWidth: 280, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {t.detail}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Chip label={t.category} size="small" variant="outlined" sx={{ fontWeight: 600, width: 'fit-content' }} />
                          {t.unit_number && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#e65100', fontSize: '0.78rem', fontWeight: 700 }}>
                              <VehicleIcon sx={{ fontSize: 16 }} />
                              <span>Unit {t.unit_number}</span>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={t.priority}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            bgcolor:
                              t.priority === 'Critical'
                                ? '#fee2e2'
                                : t.priority === 'High'
                                ? '#ffedd5'
                                : t.priority === 'Medium'
                                ? '#fef3c7'
                                : '#f1f5f9',
                            color:
                              t.priority === 'Critical'
                                ? '#991b1b'
                                : t.priority === 'High'
                                ? '#9a3412'
                                : t.priority === 'Medium'
                                ? '#92400e'
                                : '#475569',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {t.status === 'Open' && (
                          <Chip
                            icon={<PendingIcon />}
                            label="Menunggu Respon IT"
                            size="small"
                            color="warning"
                            sx={{ fontWeight: 700 }}
                          />
                        )}
                        {t.status === 'InProgress' && (
                          <Chip
                            icon={<InProgressIcon />}
                            label="Sedang Dikerjakan IT"
                            size="small"
                            color="info"
                            sx={{ fontWeight: 700 }}
                          />
                        )}
                        {(t.status === 'Closed' || t.status === 'Resolved') && (
                          <Chip
                            icon={<CompletedIcon />}
                            label="Selesai Ditangani"
                            size="small"
                            color="success"
                            sx={{ fontWeight: 700 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {t.assignee ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#0284c7' }} />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0284c7' }}>
                              {t.assignee.name || t.assignee.username}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                            Belum ada teknisi
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ color: '#64748b', fontSize: '0.82rem' }}>
                        {t.created_at
                          ? new Date(t.created_at).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ClientDashboard;
