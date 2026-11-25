import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  IconButton,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  AttachFile as AttachFileIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import socket from '../socket';
import { Ticket } from '../types';
import StatusBadge from '../components/StatusBadge';
import { useAppTheme } from '../ThemeContext';

export const TicketList: React.FC = () => {
  const { mode } = useAppTheme();
  const isDark = mode === 'dark';
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const navigate = useNavigate();

  const userJson = localStorage.getItem('taurus_user');
  const currentUser = userJson ? JSON.parse(userJson) : { role: 'client' };
  const isAdmin = currentUser.role === 'admin' || currentUser.username === 'admin';
  const isITSupport = currentUser.role === 'it_support' || currentUser.role === 'technician';

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (priorityFilter !== 'All') params.priority = priorityFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get<Ticket[]>('/tickets', { params });
      setTickets(res.data);
    } catch (err) {
      console.error('Gagal mengambil daftar tiket:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  // Listener socket.io real-time
  useEffect(() => {
    const handleUpdate = () => fetchTickets();

    socket.on('ticketCreated', handleUpdate);
    socket.on('ticketUpdated', handleUpdate);
    socket.on('ticketDeleted', handleUpdate);

    return () => {
      socket.off('ticketCreated', handleUpdate);
      socket.off('ticketUpdated', handleUpdate);
      socket.off('ticketDeleted', handleUpdate);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  return (
    <Box>
      {/* Header & Quick Action */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: isDark ? '#ffd600' : '#1a237e' }}>
            Daftar Tiket IT
          </Typography>
          <Typography variant="body2" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b' }}>
            Kelola seluruh laporan kendala teknis dan permintaan layanan IT.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/tickets/create')}
        >
          Buat Tiket Baru
        </Button>
      </Box>

      {/* Filter & Search Bar */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            size="small"
            placeholder="Cari subjek, detail, atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSearch('');
                      setTimeout(fetchTickets, 0);
                    }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="All">Semua Status</MenuItem>
            <MenuItem value="Open">Open</MenuItem>
            <MenuItem value="InProgress">In Progress</MenuItem>
            <MenuItem value="Resolved">Resolved</MenuItem>
            <MenuItem value="Closed">Closed</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label="Prioritas"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="All">Semua Prioritas</MenuItem>
            <MenuItem value="Low">Low</MenuItem>
            <MenuItem value="Medium">Medium</MenuItem>
            <MenuItem value="High">High</MenuItem>
            <MenuItem value="Critical">Critical</MenuItem>
          </TextField>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<SearchIcon />}
          >
            Cari
          </Button>

          <IconButton color="primary" onClick={fetchTickets} title="Muat Ulang">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Card>

      {/* Ticket Table */}
      <Card sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Subjek & Kategori</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Pelapor</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Assignee</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Prioritas</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>SLA / Tanggal</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={36} />
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                    Tidak ada tiket yang cocok dengan kriteria pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <TableCell sx={{ fontWeight: 700, color: isDark ? '#ffd600' : '#1a237e' }}>
                      #{ticket.id}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {ticket.subject}
                        </Typography>
                        {ticket.attachment && (
                          <Tooltip title="Memiliki Lampiran File">
                            <AttachFileIcon sx={{ fontSize: 16, color: '#64748b' }} />
                          </Tooltip>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <Chip
                          label={ticket.category || 'General'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                        {ticket.unit_number && (
                          <Chip
                            label={ticket.unit_number}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: 20, bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {ticket.reporter?.name || ticket.reporter?.username}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {ticket.assignee ? (
                        <Typography variant="body2" sx={{ fontWeight: 600, color: isDark ? '#ffd600' : '#1a237e' }}>
                          {ticket.assignee.name || ticket.assignee.username}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#d97706', fontWeight: 600 }}>
                          Belum ditugaskan
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      {ticket.sla ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 14, color: '#d32f2f' }} />
                          <Typography variant="caption" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                            {new Date(ticket.sla).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b' }}>
                          {new Date(ticket.created_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        {isAdmin && !ticket.assignee && ticket.status !== 'Closed' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tickets/${ticket.id}`);
                            }}
                            sx={{ textTransform: 'none', fontSize: '0.78rem', py: 0.4 }}
                          >
                            Tugaskan
                          </Button>
                        )}
                        {isITSupport && ticket.status !== 'Closed' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/jobs/create?ticket_id=${ticket.id}&category=${encodeURIComponent(
                                  ticket.category
                                )}&unit=${encodeURIComponent(ticket.unit_number || '')}&detail=${encodeURIComponent(
                                  ticket.subject + ': ' + ticket.detail
                                )}`
                              );
                            }}
                            sx={{ textTransform: 'none', fontSize: '0.78rem', py: 0.4 }}
                          >
                            Kerjakan Job
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tickets/${ticket.id}`);
                          }}
                          sx={{ textTransform: 'none', fontSize: '0.78rem', py: 0.4 }}
                        >
                          Detail
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default TicketList;
