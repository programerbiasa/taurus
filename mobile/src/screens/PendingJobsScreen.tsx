import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  FAB,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Job } from '../types';
import api from '../api';
import socket from '../socket';

type PendingJobsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PendingJobs'>;

interface Props {
  navigation: PendingJobsNavigationProp;
}

export const PendingJobsScreen: React.FC<Props> = ({ navigation }) => {
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPendingJobs = async () => {
    try {
      const res = await api.get<Job[]>('/jobs', {
        params: { status: 'Pending' },
      });
      setPendingJobs(res.data);
    } catch (err) {
      console.warn('Gagal memuat pending jobs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingJobs();
  }, []);

  useEffect(() => {
    const handleJobChange = () => fetchPendingJobs();
    socket.on('jobCreated', handleJobChange);
    socket.on('jobUpdated', handleJobChange);

    return () => {
      socket.off('jobCreated', handleJobChange);
      socket.off('jobUpdated', handleJobChange);
    };
  }, []);

  const handleMarkComplete = async (job: Job) => {
    try {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      await api.patch(`/jobs/${job.id}`, {
        status: 'Completed',
        end_time: job.end_time || timeStr,
      });
      Alert.alert('Sukses', `Job #${job.id} telah diselesaikan.`);
      fetchPendingJobs();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Gagal mengubah status');
    }
  };

  const renderJobItem = ({ item }: { item: Job }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation.navigate('JobDetail', { id: item.id })}
    >
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Job #{item.id}</Text>
            </View>
            <Text style={styles.dateText}>
              📅 {item.work_day}, {item.work_date} ({item.start_time.slice(0, 5)})
            </Text>
          </View>

          <Text style={styles.categoryTitle}>{item.problem_category}</Text>
          <Text style={styles.detailText} numberOfLines={2}>
            {item.problem_detail}
          </Text>

          {item.ticket ? (
            <Text style={styles.ticketBadge}>
              🎟️ Tiket Terkait: #{item.ticket.id} - {item.ticket.subject}
            </Text>
          ) : null}

          <View style={styles.footerRow}>
            <Text style={styles.userText}>
              Teknisi: {item.user?.name || item.user?.username}
            </Text>
            <Button
              mode="contained"
              buttonColor="#2e7d32"
              compact
              style={styles.doneBtn}
              labelStyle={styles.doneBtnLabel}
              onPress={() => handleMarkComplete(item)}
            >
              Tandai Selesai
            </Button>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          ⚡ Menampilkan semua pekerjaan yang berstatus <Text style={{ fontWeight: '800' }}>Pending</Text>.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#1a237e" />
        </View>
      ) : (
        <FlatList
          data={pendingJobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderJobItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPendingJobs();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>🎉 Kerja Hebat!</Text>
              <Text style={styles.emptyText}>Tidak ada pekerjaan pending yang tersisa.</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        color="#ffffff"
        style={styles.fab}
        onPress={() => navigation.navigate('JobCreate', {})}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  infoBanner: {
    backgroundColor: '#fff3e0',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ed6c02',
  },
  infoText: {
    color: '#b45309',
    fontSize: 13,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ed6c02',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#b45309',
    fontWeight: '800',
    fontSize: 12,
  },
  dateText: {
    color: '#64748b',
    fontSize: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  ticketBadge: {
    fontSize: 12,
    color: '#1a237e',
    backgroundColor: '#e8eaf6',
    padding: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  userText: {
    fontSize: 12,
    color: '#64748b',
  },
  doneBtn: {
    borderRadius: 6,
  },
  doneBtnLabel: {
    fontSize: 11,
    marginVertical: 2,
    marginHorizontal: 8,
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a237e',
    marginBottom: 6,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    backgroundColor: '#ed6c02',
    borderRadius: 28,
  },
});

export default PendingJobsScreen;
