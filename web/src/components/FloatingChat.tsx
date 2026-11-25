import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Fab,
  Badge,
  Card,
  CardHeader,
  CardContent,
  Typography,
  IconButton,
  TextField,
  Button,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Divider,
  InputAdornment,
  Snackbar,
} from '@mui/material';
import {
  Forum as ChatIcon,
  Close as CloseIcon,
  Send as SendIcon,
  DeleteForever as DeleteIcon,
  MoreVert as MoreVertIcon,
  ArrowBack as ArrowBackIcon,
  Campaign as BroadcastIcon,
  Person as PersonIcon,
  SupportAgent as TaurusIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  NotificationsActive as SoundIcon,
} from '@mui/icons-material';
import api from '../api';
import socket from '../socket';
import { ChatMessage, ChatConversationMember, UserRole } from '../types';
import {
  playKluntingSound,
  showDesktopNotification,
  requestDesktopNotificationPermission,
} from '../utils/sound';

export const FloatingChat: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Toast notifikasi saat ada pesan chat baru masuk
  const [chatToast, setChatToast] = useState<{
    id: number;
    sender_name: string;
    sender_role: string;
    message: string;
    is_broadcast: boolean;
    sender_id: number;
  } | null>(null);

  // activeTarget: null = Halaman Daftar Inbox/Kontak, 'broadcast' = Chat Bersama, number = ID User Lawan Chat
  const [activeTarget, setActiveTarget] = useState<number | 'broadcast' | null>(null);
  const [activeName, setActiveName] = useState<string>('');
  const [activeRole, setActiveRole] = useState<UserRole | 'broadcast' | ''>('');

  // Pencarian & Filter Kontak
  const [searchContact, setSearchContact] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'it_support' | 'client' | 'admin'>('all');

  const [conversations, setConversations] = useState<{
    broadcast: { id: string; name: string; last_message: string; last_time: string | null };
    members: ChatConversationMember[];
  }>({
    broadcast: { id: 'broadcast', name: '📢 Chat Bersama (Grup Semua Anggota)', last_message: '', last_time: null },
    members: [],
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userJson = localStorage.getItem('taurus_user');
  const currentUser = userJson ? JSON.parse(userJson) : { id: 0, name: 'User', role: 'client', username: 'user' };
  const isAdmin = currentUser.role === 'admin' || currentUser.username === 'admin';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch daftar percakapan & kontak
  const fetchConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      if (res.data) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar percakapan:', err);
    }
  };

  // Fetch riwayat pesan pada thread yang sedang aktif
  const fetchMessages = async () => {
    if (activeTarget === null) return;
    try {
      const isBroadcast = activeTarget === 'broadcast';
      const targetUserId = !isBroadcast ? activeTarget : undefined;

      const res = await api.get<ChatMessage[]>('/chat/messages', {
        params: {
          is_broadcast: isBroadcast ? 'true' : 'false',
          target_user_id: targetUserId,
        },
      });
      setMessages(res.data || []);
    } catch (err) {
      console.error('Gagal mengambil pesan chat:', err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchConversations();
      if (activeTarget !== null) {
        fetchMessages();
      }
      setUnreadCount(0);
    }
  }, [open, activeTarget]);

  useEffect(() => {
    if (open && activeTarget !== null) {
      scrollToBottom();
    }
  }, [messages, open, activeTarget]);

  // Listener WebSocket Real-Time untuk semua user
  useEffect(() => {
    const handleNewMessage = (msg: ChatMessage) => {
      const myId = Number(currentUser.id);
      const msgUserId = Number(msg.user_id);
      const msgTargetId = msg.target_user_id ? Number(msg.target_user_id) : null;

      // 0. Jangan bunyikan klunting atau beri notifikasi jika pesan dikirim oleh diri sendiri
      if (msgUserId === myId) return;

      // 1. Pesan Broadcast (Chat Bersama)
      if (msg.is_broadcast) {
        // Mainkan suara lonceng "Klunting"
        playKluntingSound();

        if (open && activeTarget === 'broadcast') {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } else {
          setUnreadCount((prev) => prev + 1);
          setChatToast({
            id: msg.id,
            sender_name: msg.sender_name || 'Anggota',
            sender_role: msg.sender_role || 'client',
            message: msg.message,
            is_broadcast: true,
            sender_id: msgUserId,
          });
          showDesktopNotification(
            `📢 Chat Bersama (${msg.sender_name})`,
            msg.message
          );
        }
        fetchConversations();
        return;
      }

      // 2. Pesan Direct Message (Pribadi)
      const isForMe = msgTargetId === myId;
      if (isForMe) {
        // Mainkan suara lonceng "Klunting"
        playKluntingSound();

        if (open && Number(activeTarget) === msgUserId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } else {
          setUnreadCount((prev) => prev + 1);
          setChatToast({
            id: msg.id,
            sender_name: msg.sender_name || 'Pengguna',
            sender_role: msg.sender_role || 'client',
            message: msg.message,
            is_broadcast: false,
            sender_id: msgUserId,
          });
          showDesktopNotification(
            `💬 Pesan dari ${msg.sender_name}`,
            msg.message
          );
        }
        fetchConversations();
      }
    };

    const handleChatCleared = (data: { is_broadcast?: boolean; user_id?: number; target_user_id?: number }) => {
      if (data.is_broadcast) {
        if (activeTarget === 'broadcast') {
          setMessages([]);
        }
      } else {
        if (
          (activeTarget === data.user_id && currentUser.id === data.target_user_id) ||
          (activeTarget === data.target_user_id && currentUser.id === data.user_id)
        ) {
          setMessages([]);
        }
      }
      fetchConversations();
    };

    socket.on('newChatMessage', handleNewMessage);
    socket.on('chatCleared', handleChatCleared);

    return () => {
      socket.off('newChatMessage', handleNewMessage);
      socket.off('chatCleared', handleChatCleared);
    };
  }, [open, activeTarget, currentUser.id]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending || activeTarget === null) return;

    try {
      setSending(true);
      const text = inputText.trim();
      setInputText('');

      const isBroadcast = activeTarget === 'broadcast';
      const targetUserId = !isBroadcast ? activeTarget : null;

      const res = await api.post('/chat/messages', {
        message: text,
        is_broadcast: isBroadcast,
        target_user_id: targetUserId,
      });

      if (res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
      }

      fetchConversations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengirim pesan');
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    if (activeTarget === null) return;
    try {
      const isBroadcast = activeTarget === 'broadcast';
      const targetUserId = !isBroadcast ? activeTarget : undefined;

      await api.delete('/chat/messages', {
        params: {
          is_broadcast: isBroadcast ? 'true' : 'false',
          target_user_id: targetUserId,
        },
      });

      setMessages([]);
      setConfirmDeleteOpen(false);
      setMenuAnchor(null);
      fetchConversations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus percakapan');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    if (role === 'admin') {
      return (
        <Chip
          label="Admin"
          size="small"
          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#d97706', color: '#fff' }}
        />
      );
    }
    if (role === 'it_support') {
      return (
        <Chip
          label="IT Support"
          size="small"
          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#0284c7', color: '#fff' }}
        />
      );
    }
    return (
      <Chip
        label="Client"
        size="small"
        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600, bgcolor: '#64748b', color: '#fff' }}
      />
    );
  };

  // Filter kontak berdasarkan search & tab role
  const filteredMembers = conversations.members.filter((m) => {
    if (filterRole !== 'all' && m.role !== filterRole) return false;
    if (searchContact.trim()) {
      const q = searchContact.toLowerCase().trim();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchUsername = m.username?.toLowerCase().includes(q);
      return matchName || matchUsername;
    }
    return true;
  });

  return (
    <>
      {/* Floating Action Button */}
      {!open && (
        <Tooltip title="Ruang Chat & Messenger IT" placement="left">
          <Fab
            color="primary"
            onClick={() => setOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1300,
              bgcolor: '#1a237e',
              border: '1.5px solid #d4af37',
              boxShadow: '0 6px 20px rgba(212, 175, 55, 0.45)',
              '&:hover': { bgcolor: '#0d1b2a', borderColor: '#fbbf24' },
            }}
          >
            <Badge badgeContent={unreadCount} color="error" overlap="circular">
              <ChatIcon sx={{ color: '#fbbf24', fontSize: 28 }} />
            </Badge>
          </Fab>
        </Tooltip>
      )}

      {/* Floating Messenger Window */}
      {open && (
        <Card
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: { xs: 'calc(100vw - 32px)', sm: 420 },
            height: 560,
            zIndex: 1350,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid rgba(212, 175, 55, 0.3)',
          }}
        >
          {/* Header Messenger */}
          <CardHeader
            sx={{
              bgcolor: '#1a237e',
              color: '#ffffff',
              borderBottom: '2px solid #d4af37',
              py: 1.5,
              px: 2,
              '& .MuiCardHeader-action': { m: 0, alignSelf: 'center' },
            }}
            avatar={
              activeTarget !== null ? (
                <IconButton
                  size="small"
                  onClick={() => {
                    setActiveTarget(null);
                    setActiveName('');
                    setActiveRole('');
                    setMessages([]);
                  }}
                  sx={{ color: '#ffffff', mr: -0.5 }}
                >
                  <ArrowBackIcon />
                </IconButton>
              ) : (
                <Avatar
                  sx={{
                    bgcolor: '#d97706',
                    width: 36,
                    height: 36,
                    border: '1.5px solid #d4af37',
                    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.4)',
                  }}
                >
                  <TaurusIcon sx={{ fontSize: 22, color: '#fff' }} />
                </Avatar>
              )
            }
            title={
              <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '0.94rem', color: '#ffffff', lineHeight: 1.2 }}>
                {activeTarget === null
                  ? 'Messenger & Diskusi IT'
                  : activeTarget === 'broadcast'
                  ? '📢 Chat Bersama'
                  : activeName}
              </Typography>
            }
            subheader={
              <Typography variant="caption" sx={{ color: '#fbbf24', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4caf50' }} />
                {activeTarget === null
                  ? `Halo, ${currentUser.name || currentUser.username} (${currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'it_support' ? 'IT Support' : 'Client'})`
                  : activeTarget === 'broadcast'
                  ? 'Diskusi Bebas Seluruh Anggota'
                  : 'Percakapan Pribadi (Direct)'}
              </Typography>
            }
            action={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Tooltip title="Tes Bunyi Klunting">
                  <IconButton
                    size="small"
                    onClick={() => {
                      playKluntingSound();
                      requestDesktopNotificationPermission();
                    }}
                    sx={{ color: '#fbbf24', mr: 0.5 }}
                  >
                    <SoundIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {activeTarget !== null && (
                  <IconButton
                    size="small"
                    onClick={(e) => setMenuAnchor(e.currentTarget)}
                    sx={{ color: '#ffffff' }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() => setOpen(false)}
                  sx={{ color: '#ffffff', ml: 0.5 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            }
          />

          {/* Menu Dropdown Header */}
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                setConfirmDeleteOpen(true);
              }}
              sx={{ color: '#d32f2f' }}
            >
              <ListItemIcon sx={{ color: '#d32f2f', minWidth: 32 }}>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Hapus Percakapan Ini" primaryTypographyProps={{ fontSize: '0.85rem' }} />
            </MenuItem>
          </Menu>

          {/* ============================================================== */}
          {/* VIEW A: DAFTAR INBOX PERCAKAPAN & KONTAK ANGGOTA               */}
          {/* ============================================================== */}
          {activeTarget === null ? (
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: '#ffffff', overflow: 'hidden' }}>
              {/* Opsi 1: Chat Bersama Pin di Bagian Paling Atas */}
              <Box sx={{ p: 1.5, pb: 1, bgcolor: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                <ListItemButton
                  onClick={() => {
                    setActiveTarget('broadcast');
                    setActiveName('📢 Chat Bersama');
                    setActiveRole('broadcast');
                  }}
                  sx={{
                    borderRadius: 2,
                    p: 1.2,
                    bgcolor: '#ffffff',
                    border: '1.5px solid #d4af37',
                    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.15)',
                    '&:hover': { bgcolor: '#fef3c7' },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#d97706', color: '#fff' }}>
                      <BroadcastIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#b45309' }}>
                          📢 Chat Bersama (Semua Anggota)
                        </Typography>
                        <Chip label="Grup" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#d97706', color: '#fff' }} />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', mt: 0.3 }}>
                        {conversations.broadcast.last_message || 'Diskusi umum bersama Admin, IT Support, dan Client'}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </Box>

              {/* Search & Filter Bar */}
              <Box sx={{ p: 1.5, borderBottom: '1px solid #f1f5f9', bgcolor: '#f8fafc' }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Cari nama kontak / username..."
                  value={searchContact}
                  onChange={(e) => setSearchContact(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchContact ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchContact('')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                  sx={{
                    bgcolor: '#ffffff',
                    '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.85rem' },
                    mb: 1,
                  }}
                />

                {/* Filter Chips: Semua, IT Support, Client, Admin */}
                <Box sx={{ display: 'flex', gap: 0.8, overflowX: 'auto', pb: 0.5 }}>
                  <Chip
                    label="Semua"
                    size="small"
                    clickable
                    color={filterRole === 'all' ? 'primary' : 'default'}
                    onClick={() => setFilterRole('all')}
                    sx={{ fontSize: '0.72rem', fontWeight: 600 }}
                  />
                  <Chip
                    label="IT Support"
                    size="small"
                    clickable
                    color={filterRole === 'it_support' ? 'info' : 'default'}
                    onClick={() => setFilterRole('it_support')}
                    sx={{ fontSize: '0.72rem', fontWeight: 600 }}
                  />
                  <Chip
                    label="Client"
                    size="small"
                    clickable
                    color={filterRole === 'client' ? 'default' : 'default'}
                    onClick={() => setFilterRole('client')}
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      bgcolor: filterRole === 'client' ? '#64748b' : undefined,
                      color: filterRole === 'client' ? '#fff' : undefined,
                    }}
                  />
                  <Chip
                    label="Admin"
                    size="small"
                    clickable
                    color={filterRole === 'admin' ? 'warning' : 'default'}
                    onClick={() => setFilterRole('admin')}
                    sx={{ fontSize: '0.72rem', fontWeight: 600 }}
                  />
                </Box>
              </Box>

              {/* Daftar Kontak Direct Chat */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                <List disablePadding>
                  {filteredMembers.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', color: '#94a3b8' }}>
                      <PersonIcon sx={{ fontSize: 36, mb: 1, opacity: 0.5 }} />
                      <Typography variant="body2">Tidak ada kontak yang sesuai</Typography>
                    </Box>
                  ) : (
                    filteredMembers.map((member) => (
                      <ListItem key={member.id} disablePadding divider>
                        <ListItemButton
                          onClick={() => {
                            setActiveTarget(member.id);
                            setActiveName(member.name || member.username);
                            setActiveRole(member.role);
                          }}
                          sx={{ py: 1.2, px: 2, '&:hover': { bgcolor: '#f8fafc' } }}
                        >
                          <ListItemAvatar>
                            <Avatar
                              sx={{
                                bgcolor:
                                  member.role === 'admin'
                                    ? '#d97706'
                                    : member.role === 'it_support'
                                    ? '#0284c7'
                                    : '#475569',
                                width: 38,
                                height: 38,
                                fontWeight: 700,
                              }}
                            >
                              {member.name ? member.name.charAt(0).toUpperCase() : member.username.charAt(0).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                  {member.name || member.username}
                                </Typography>
                                {getRoleBadge(member.role)}
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.3 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: '#64748b',
                                    display: 'block',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 220,
                                  }}
                                >
                                  {member.last_message}
                                </Typography>
                                {member.last_time && (
                                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', ml: 1 }}>
                                    {new Date(member.last_time).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))
                  )}
                </List>
              </Box>
            </Box>
          ) : (
            /* ============================================================== */
            /* VIEW B: CHAT THREAD AKTIF (Pesan Berjalan)                      */
            /* ============================================================== */
            <>
              <CardContent
                sx={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  p: 2,
                  bgcolor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                {/* Banner Info Thread */}
                <Box
                  sx={{
                    p: 1,
                    textAlign: 'center',
                    bgcolor: 'rgba(212, 175, 55, 0.08)',
                    borderRadius: 2,
                    border: '1px dashed #d4af37',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                    {activeTarget === 'broadcast'
                      ? '📢 Pesan ini terkirim ke seluruh anggota (Admin, IT Support, dan Client).'
                      : `🔒 Percakapan langsung dan pribadi antara Anda dan ${activeName}.`}
                  </Typography>
                </Box>

                {messages.length === 0 ? (
                  <Box sx={{ textAlign: 'center', my: 'auto', color: '#94a3b8', py: 4 }}>
                    <ChatIcon sx={{ fontSize: 44, opacity: 0.4, mb: 1, color: '#d97706' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                      Belum ada pesan pada percakapan ini.
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                      Tulis pesan di bawah untuk memulai obrolan langsung.
                    </Typography>
                  </Box>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.user_id === currentUser.id;
                    const timeStr = msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <Box
                        key={msg.id}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '100%',
                        }}
                      >
                        {!isMe && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.3, px: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.75rem' }}>
                              {msg.sender_name}
                            </Typography>
                            {getRoleBadge(msg.sender_role)}
                          </Box>
                        )}

                        <Box
                          sx={{
                            maxWidth: '82%',
                            p: 1.3,
                            borderRadius: 2.5,
                            bgcolor: isMe
                              ? ((theme) => theme.palette.mode === 'dark' ? '#00e5ff' : '#1a237e')
                              : ((theme) => theme.palette.mode === 'dark' ? '#162235' : '#ffffff'),
                            color: isMe
                              ? ((theme) => theme.palette.mode === 'dark' ? '#050b14' : '#ffffff')
                              : ((theme) => theme.palette.mode === 'dark' ? '#f1f5f9' : '#1e293b'),
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            borderBottomRightRadius: isMe ? 4 : 12,
                            borderBottomLeftRadius: !isMe ? 4 : 12,
                            border: !isMe ? ((theme) => theme.palette.mode === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0') : 'none',
                          }}
                        >
                          <Typography variant="body2" sx={{ fontSize: '0.88rem', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                            {msg.message}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              textAlign: 'right',
                              mt: 0.3,
                              fontSize: '0.65rem',
                              color: isMe ? '#90caf9' : '#94a3b8',
                            }}
                          >
                            {timeStr}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Form Input Kirim Pesan */}
              <Box
                component="form"
                onSubmit={handleSendMessage}
                sx={{
                  p: 1.5,
                  bgcolor: '#ffffff',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  gap: 1,
                }}
              >
                <TextField
                  size="small"
                  fullWidth
                  placeholder={
                    activeTarget === 'broadcast'
                      ? 'Kirim pesan ke grup bersama seluruh anggota...'
                      : `Ketik pesan ke ${activeName}...`
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      fontSize: '0.88rem',
                    },
                  }}
                />
                <IconButton
                  color="primary"
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  sx={{
                    bgcolor: '#d97706',
                    color: '#ffffff',
                    '&:hover': { bgcolor: '#b45309' },
                    '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' },
                    width: 40,
                    height: 40,
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Box>
            </>
          )}
        </Card>
      )}

      {/* Dialog Konfirmasi Hapus Percakapan */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#d32f2f' }}>
          Hapus Riwayat Percakapan?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Apakah Anda yakin ingin menghapus riwayat pesan pada percakapan ini?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Batal</Button>
          <Button variant="contained" color="error" onClick={handleClearChat}>
            Ya, Hapus Percakapan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pop-up Toast Notifikasi Pesan Chat Masuk */}
      <Snackbar
        open={Boolean(chatToast)}
        autoHideDuration={7000}
        onClose={() => setChatToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 8, zIndex: 1400 }}
      >
        {chatToast ? (
          <Box
            onClick={() => {
              setOpen(true);
              if (chatToast.is_broadcast) {
                setActiveTarget('broadcast');
                setActiveName('📢 Chat Bersama');
                setActiveRole('broadcast');
              } else {
                setActiveTarget(chatToast.sender_id);
                setActiveName(chatToast.sender_name);
                setActiveRole(chatToast.sender_role as any);
              }
              setChatToast(null);
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              bgcolor: '#0f172a',
              color: '#ffffff',
              p: 1.8,
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
              border: '1.5px solid #d4af37',
              maxWidth: 400,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.02)',
              },
            }}
          >
            <Avatar
              sx={{
                bgcolor:
                  chatToast.sender_role === 'admin'
                    ? '#d97706'
                    : chatToast.sender_role === 'it_support'
                    ? '#0284c7'
                    : '#475569',
                color: '#ffffff',
                fontWeight: 700,
                width: 40,
                height: 40,
                border: '1.5px solid #d4af37',
              }}
            >
              {chatToast.sender_name ? chatToast.sender_name.charAt(0).toUpperCase() : 'U'}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#fbbf24', fontSize: '0.88rem' }}>
                  {chatToast.is_broadcast ? `📢 ${chatToast.sender_name}` : chatToast.sender_name}
                </Typography>
                <Chip
                  label={
                    chatToast.is_broadcast
                      ? 'Chat Bersama'
                      : chatToast.sender_role === 'admin'
                      ? 'Admin'
                      : chatToast.sender_role === 'it_support'
                      ? 'IT Support'
                      : 'Client'
                  }
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                  }}
                />
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: '#e2e8f0',
                  fontSize: '0.82rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {chatToast.message}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="contained"
              sx={{
                bgcolor: '#d97706',
                color: '#ffffff',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.75rem',
                borderRadius: 2,
                px: 1.5,
                '&:hover': { bgcolor: '#b45309' },
                flexShrink: 0,
              }}
            >
              Buka
            </Button>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setChatToast(null);
              }}
              sx={{ color: '#94a3b8', p: 0.5 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : undefined}
      </Snackbar>
    </>
  );
};

export default FloatingChat;
