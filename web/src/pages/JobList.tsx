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
  Tabs,
  Tab,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  CheckCircle as CompleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import socket from '../socket';
import { Job } from '../types';
import StatusBadge from '../components/StatusBadge';
import { useAppTheme } from '../ThemeContext';

export const JobList: React.FC = () => {
  const { mode } = useAppTheme();
  const isDark = mode === 'dark';
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [workDateFilter, setWorkDateFilter] = useState('');

  const navigate = useNavigate();

  const userJson = localStorage.getItem('taurus_user');
  const currentUser = userJson ? JSON.parse(userJson) : { role: 'client' };
  const isAdmin = currentUser.role === 'admin' || currentUser.username === 'admin';

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusTab !== 'All') params.status = statusTab;
      if (workDateFilter) params.work_date = workDateFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get<Job[]>('/jobs', { params });
      setJobs(res.data);
    } catch (err) {
      console.error('Gagal mengambil daftar pekerjaan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [statusTab, workDateFilter]);

  useEffect(() => {
    const handleJobChange = () => fetchJobs();

    socket.on('jobCreated', handleJobChange);
    socket.on('jobUpdated', handleJobChange);
    socket.on('jobDeleted', handleJobChange);

    return () => {
      socket.off('jobCreated', handleJobChange);
      socket.off('jobUpdated', handleJobChange);
      socket.off('jobDeleted', handleJobChange);
    };
  }, []);

  const handleMarkComplete = async (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    try {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
      await api.patch(`/jobs/${job.id}`, {
        status: 'Completed',
        end_time: job.end_time || timeStr,
      });
      fetchJobs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menandai pekerjaan selesai');
    }
  };

  return (
    <Box>
      {/* Header & Quick Action */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: isDark ? '#ffd600' : '#1a237e' }}>
            Daftar Pekerjaan IT (Job Log)
          </Typography>
          <Typography variant="body2" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b' }}>
            Riwayat pengerjaan teknisi, penanganan kendala, dan log waktu kerja harian.
          </Typography>
        </Box>
        {!isAdmin && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/jobs/create')}
          >
            Catat Pekerjaan Baru
          </Button>
        )}
      </Box>

      {/* Filter Tabs & Search */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Tabs
          value={statusTab}
          onChange={(_, val) => setStatusTab(val)}
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 2, borderBottom: '1px solid #e2e8f0' }}
        >
          <Tab label="Semua Pekerjaan" value="All" sx={{ fontWeight: 600 }} />
          <Tab label="Pending (Belum Selesai)" value="Pending" sx={{ fontWeight: 600 }} />
          <Tab label="Completed (Selesai)" value="Completed" sx={{ fontWeight: 600 }} />
        </Tabs>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Cari kategori masalah, detail problem, tindakan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
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
                      setTimeout(fetchJobs, 0);
                    }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          <TextField
            type="date"
            size="small"
            label="Filter Tanggal"
            value={workDateFilter}
            onChange={(e) => setWorkDateFilter(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
          />

          {workDateFilter && (
            <Button
              size="small"
              onClick={() => setWorkDateFilter('')}
              color="inherit"
            >
              Reset Tanggal
            </Button>
          )}

          <Button
            variant="contained"
            color="primary"
            startIcon={<SearchIcon />}
            onClick={fetchJobs}
          >
            Filter
          </Button>

          <IconButton color="primary" onClick={fetchJobs} title="Muat Ulang">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Card>

      {/* Job Table */}
      <Card sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Tanggal & Hari</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Waktu</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Kategori Masalah</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Detail Masalah & Tindakan</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tiket Terkait</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Teknisi</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
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
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                    Tidak ada catatan pekerjaan yang cocok.
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow
                    key={job.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? '#ffd600' : '#1a237e' }}>
                        {job.work_date}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#ff6f00', fontWeight: 600 }}>
                        {job.work_day}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {job.start_time.slice(0, 5)} - {job.end_time ? job.end_time.slice(0, 5) : '...'}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ fontWeight: 600 }}>
                      {job.problem_category}
                    </TableCell>

                    <TableCell sx={{ maxWidth: 260 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {job.problem_detail || '-'}
                      </Typography>
                      {job.problem_finding && (
                        <Typography variant="caption" noWrap sx={{ color: '#0284c7', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Temuan: {job.problem_finding}
                        </Typography>
                      )}
                      {job.action_taken && (
                        <Typography variant="caption" noWrap sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#475569', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Solusi: {job.action_taken}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      {job.ticket ? (
                        <Typography
                          variant="caption"
                          sx={{
                            color: isDark ? '#ffd600' : '#1a237e',
                            fontWeight: 700,
                            bgcolor: isDark ? 'rgba(255, 214, 0, 0.15)' : '#e8eaf6',
                            border: isDark ? '1px solid rgba(255, 214, 0, 0.3)' : 'none',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            display: 'inline-block',
                          }}
                        >
                          #{job.ticket.id} {job.ticket.subject.slice(0, 18)}...
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          Non-Tiket
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {job.user?.name || job.user?.username}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>

                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        {job.status === 'Pending' && (
                          <Tooltip title="Tandai Selesai Sekarang">
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={(e) => handleMarkComplete(e, job)}
                              sx={{ minWidth: 32, p: '4px 8px' }}
                            >
                              Selesai
                            </Button>
                          </Tooltip>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/jobs/${job.id}`);
                          }}
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

export default JobList;
