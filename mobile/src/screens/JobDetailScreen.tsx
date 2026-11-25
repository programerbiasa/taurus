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
} from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Job } from '../types';
import api from '../api';
import socket from '../socket';

type JobDetailRouteProp = RouteProp<RootStackParamList, 'JobDetail'>;
type JobDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'JobDetail'>;

interface Props {
  route: JobDetailRouteProp;
  navigation: JobDetailNavigationProp;
}

export const JobDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { id } = route.params;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [actionTaken, setActionTaken] = useState('');
  const [endTime, setEndTime] = useState('');

  const fetchJob = async () => {
    try {
      const res = await api.get<Job>(`/jobs/${id}`);
      setJob(res.data);
      setActionTaken(res.data.action_taken || '');
      setEndTime(res.data.end_time ? res.data.end_time.slice(0, 5) : '');
    } catch (err) {
      console.warn('Gagal memuat detail job:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  useEffect(() => {
    const handleJobUpdated = (updated: Job) => {
      if (updated.id === id) setJob((prev) => (prev ? { ...prev, ...updated } : updated));
    };

    socket.on('jobUpdated', handleJobUpdated);
    return () => {
      socket.off('jobUpdated', handleJobUpdated);
    };
  }, [id]);

  const handleMarkComplete = async () => {
    try {
      setUpdating(true);
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const res = await api.patch(`/jobs/${id}`, {
        status: 'Completed',
        end_time: job?.end_time || timeStr,
      });
      setJob(res.data);
      Alert.alert('Pekerjaan Selesai!', 'Status pekerjaan telah Completed. Tiket terkait otomatis ditutup (Closed).');
    } catch (err: any) {
      Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setUpdating(true);
      const payload: any = {
        action_taken: actionTaken,
        end_time: endTime ? (endTime.length === 5 ? `${endTime}:00` : endTime) : null,
      };
      const res = await api.patch(`/jobs/${id}`, payload);
      setJob(res.data);
      setIsEditing(false);
      Alert.alert('Sukses', 'Catatan tindakan perbaikan berhasil diperbarui.');
    } catch (err: any) {
      Alert.alert('Gagal', err.response?.data?.message || 'Gagal menyimpan pembaruan');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.centerLoading}>
        <Text>Pekerjaan tidak ditemukan</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.idBadge}>
                <Text style={styles.idText}>Job #{job.id}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: job.status === 'Completed' ? '#2e7d32' : '#ed6c02' },
                ]}
              >
                <Text style={styles.statusText}>{job.status}</Text>
              </View>
            </View>

            <Text style={styles.categoryTitle}>{job.problem_category}</Text>

            <Divider style={styles.divider} />

            {/* Waktu & Jadwal */}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Hari & Tanggal:</Text>
              <Text style={styles.metaValue}>
                {job.work_day}, {job.work_date}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Waktu Kerja:</Text>
              <Text style={styles.metaValue}>
                {job.start_time.slice(0, 5)} - {job.end_time ? job.end_time.slice(0, 5) : 'Sedang Berjalan'}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Teknisi:</Text>
              <Text style={styles.metaValue}>
                {job.user?.name || job.user?.username}
              </Text>
            </View>

            {job.ticket && (
              <View style={styles.ticketLinkedBox}>
                <Text style={styles.ticketLinkedText}>
                  🎟️ Terkait Tiket #{job.ticket.id}: {job.ticket.subject}
                </Text>
                <Button
                  compact
                  mode="text"
                  textColor="#1a237e"
                  onPress={() => navigation.navigate('TicketDetail', { id: job.ticket!.id })}
                >
                  Buka Tiket &rarr;
                </Button>
              </View>
            )}

            <Divider style={styles.divider} />

            {/* Problem Detail */}
            <Text style={styles.sectionLabel}>Masalah / Gejala Teknis:</Text>
            <Text style={styles.problemBox}>{job.problem_detail}</Text>

            {/* Action Taken */}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
              Tindakan Penanganan (Action Taken):
            </Text>

            {!isEditing ? (
              <Text style={styles.actionBox}>
                {job.action_taken || 'Belum ada tindakan yang dicatat.'}
              </Text>
            ) : (
              <View style={{ marginTop: 8 }}>
                <TextInput
                  label="Tindakan / Solusi"
                  mode="outlined"
                  value={actionTaken}
                  onChangeText={setActionTaken}
                  multiline
                  numberOfLines={4}
                  style={styles.input}
                  outlineColor="#cbd5e1"
                  activeOutlineColor="#1a237e"
                />
                <TextInput
                  label="Jam Selesai (HH:MM)"
                  mode="outlined"
                  value={endTime}
                  onChangeText={setEndTime}
                  style={styles.input}
                  outlineColor="#cbd5e1"
                  activeOutlineColor="#1a237e"
                />
                <Button
                  mode="contained"
                  buttonColor="#1a237e"
                  onPress={handleSaveEdit}
                  disabled={updating}
                  style={{ marginTop: 8 }}
                >
                  {updating ? 'Menyimpan...' : 'Simpan Tindakan'}
                </Button>
              </View>
            )}

            {/* Tombol Aksi */}
            <View style={styles.actionRow}>
              {job.status === 'Pending' && (
                <Button
                  mode="contained"
                  buttonColor="#2e7d32"
                  style={styles.btn}
                  disabled={updating}
                  onPress={handleMarkComplete}
                >
                  Tandai Selesai (Completed)
                </Button>
              )}

              <Button
                mode="outlined"
                textColor="#1a237e"
                style={styles.btn}
                onPress={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Batal Edit' : 'Edit Tindakan'}
              </Button>
            </View>
          </Card.Content>
        </Card>
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
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  idBadge: {
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  idText: {
    color: '#1a237e',
    fontWeight: '800',
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  divider: {
    marginVertical: 12,
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
  ticketLinkedBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
  },
  ticketLinkedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a237e',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  problemBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionBox: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  input: {
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  actionRow: {
    marginTop: 20,
    gap: 10,
  },
  btn: {
    borderRadius: 8,
  },
});

export default JobDetailScreen;
