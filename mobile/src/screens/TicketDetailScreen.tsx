import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  ActivityIndicator,
  Divider,
  Avatar,
  IconButton,
} from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Ticket, TicketComment } from '../types';
import api, { getStoredUser } from '../api';
import socket from '../socket';

type TicketDetailRouteProp = RouteProp<RootStackParamList, 'TicketDetail'>;
type TicketDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TicketDetail'>;

interface Props {
  route: TicketDetailRouteProp;
  navigation: TicketDetailNavigationProp;
}

export const TicketDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { id } = route.params;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const fetchDetails = async () => {
    try {
      const user = await getStoredUser();
      if (user) setCurrentUserId(user.id);

      const [ticketRes, commentsRes] = await Promise.all([
        api.get<Ticket>(`/tickets/${id}`),
        api.get<TicketComment[]>(`/tickets/${id}/comments`),
      ]);
      setTicket(ticketRes.data);
      setComments(commentsRes.data);
    } catch (err: any) {
      console.warn('Gagal memuat detail tiket:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  useEffect(() => {
    const handleTicketUpdated = (updated: Ticket) => {
      if (updated.id === id) setTicket((prev) => (prev ? { ...prev, ...updated } : updated));
    };
    const handleCommentAdded = (comment: TicketComment) => {
      if (comment.ticket_id === id) setComments((prev) => [...prev, comment]);
    };

    socket.on('ticketUpdated', handleTicketUpdated);
    socket.on('commentAdded', handleCommentAdded);

    return () => {
      socket.off('ticketUpdated', handleTicketUpdated);
      socket.off('commentAdded', handleCommentAdded);
    };
  }, [id]);

  const handleUpdateStatus = async (status: string) => {
    try {
      await api.patch(`/tickets/${id}`, { status });
      setTicket((prev) => (prev ? { ...prev, status: status as any } : prev));
      Alert.alert('Status Diperbarui', `Tiket sekarang berstatus ${status}`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Gagal mengubah status tiket');
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    try {
      setSubmittingComment(true);
      const res = await api.post(`/tickets/${id}/comments`, { comment: newComment.trim() });
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Gagal mengirim komentar');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.centerLoading}>
        <Text>Tiket tidak ditemukan</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Info Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={styles.idBadge}>
                <Text style={styles.idText}>#{ticket.id}</Text>
              </View>
              <Text style={styles.categoryText}>{ticket.category}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{ticket.status}</Text>
              </View>
            </View>

            <Text style={styles.subjectText}>{ticket.subject}</Text>

            <Divider style={styles.divider} />

            <Text style={styles.label}>Keterangan Masalah:</Text>
            <Text style={styles.detailText}>{ticket.detail}</Text>

            <Divider style={styles.divider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Pelapor:</Text>
              <Text style={styles.metaValue}>
                {ticket.reporter?.name || ticket.reporter?.username}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Prioritas:</Text>
              <Text style={[styles.metaValue, { color: '#ff6f00', fontWeight: '800' }]}>
                {ticket.priority}
              </Text>
            </View>

            {ticket.sla && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Batas Waktu (SLA):</Text>
                <Text style={[styles.metaValue, { color: '#d32f2f' }]}>
                  {new Date(ticket.sla).toLocaleString('id-ID')}
                </Text>
              </View>
            )}

            {/* Quick Actions */}
            <View style={styles.actionRow}>
              <Button
                mode="contained"
                buttonColor="#ff6f00"
                style={styles.actionBtn}
                labelStyle={styles.actionBtnLabel}
                onPress={() =>
                  navigation.navigate('JobCreate', {
                    ticket_id: ticket.id,
                    category: ticket.category,
                    detail: `${ticket.subject} - ${ticket.detail}`,
                  })
                }
              >
                Catat Job Terkait
              </Button>

              {ticket.status !== 'Closed' ? (
                <Button
                  mode="outlined"
                  textColor="#d32f2f"
                  style={[styles.actionBtn, { borderColor: '#d32f2f' }]}
                  labelStyle={styles.actionBtnLabel}
                  onPress={() => handleUpdateStatus('Closed')}
                >
                  Tutup Tiket
                </Button>
              ) : (
                <Button
                  mode="outlined"
                  textColor="#1a237e"
                  style={[styles.actionBtn, { borderColor: '#1a237e' }]}
                  labelStyle={styles.actionBtnLabel}
                  onPress={() => handleUpdateStatus('Open')}
                >
                  Buka Kembali
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Comments Section */}
        <Text style={styles.sectionHeader}>Diskusi & Tanggapan ({comments.length})</Text>

        {comments.map((c) => (
          <View
            key={c.id}
            style={[
              styles.commentItem,
              c.author?.id === currentUserId && styles.commentItemSelf,
            ]}
          >
            <View style={styles.commentHeader}>
              <Text style={styles.commentAuthor}>
                {c.author?.name || c.author?.username}
              </Text>
              <Text style={styles.commentTime}>
                {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Text style={styles.commentBody}>{c.comment}</Text>
          </View>
        ))}

        {/* Input Komentar */}
        <View style={styles.commentInputBox}>
          <TextInput
            placeholder="Tulis tanggapan atau catatan teknisi..."
            mode="outlined"
            value={newComment}
            onChangeText={setNewComment}
            multiline
            style={styles.inputComment}
            outlineColor="#cbd5e1"
            activeOutlineColor="#1a237e"
          />
          <Button
            mode="contained"
            buttonColor="#1a237e"
            disabled={submittingComment || !newComment.trim()}
            onPress={handleSendComment}
            style={styles.sendCommentBtn}
          >
            {submittingComment ? 'Mengirim...' : 'Kirim'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  idBadge: {
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  idText: {
    fontWeight: '800',
    color: '#1a237e',
    fontSize: 12,
  },
  categoryText: {
    flex: 1,
    color: '#64748b',
    fontWeight: '700',
    fontSize: 13,
  },
  statusBadge: {
    backgroundColor: '#1a237e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  subjectText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    lineHeight: 24,
  },
  divider: {
    marginVertical: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
  },
  actionBtnLabel: {
    fontSize: 12,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  commentItem: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  commentItemSelf: {
    backgroundColor: '#e8eaf6',
    borderColor: '#c5cae9',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontWeight: '700',
    fontSize: 13,
    color: '#1a237e',
  },
  commentTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  commentBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  commentInputBox: {
    marginTop: 10,
  },
  inputComment: {
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  sendCommentBtn: {
    borderRadius: 8,
  },
});

export default TicketDetailScreen;
