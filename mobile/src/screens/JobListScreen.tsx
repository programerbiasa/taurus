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
  SegmentedButtons,
  ActivityIndicator,
  FAB,
  Button,
} from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Job } from '../types';
import api from '../api';
import socket from '../socket';

type JobListRouteProp = RouteProp<RootStackParamList, 'JobList'>;
type JobListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'JobList'>;

interface Props {
  route: JobListRouteProp;
  navigation: JobListNavigationProp;
}

export const JobListScreen: React.FC<Props> = ({ route, navigation }) => {
  const initialFilter = route.params?.filterStatus || 'All';
  const [statusTab, setStatusTab] = useState<string>(initialFilter);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
    try {
      const params: any = {};
      if (statusTab !== 'All') params.status = statusTab;

      const res = await api.get<Job[]>('/jobs', { params });
      setJobs(res.data);
    } catch (err) {
      console.warn('Gagal memuat daftar job:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [statusTab]);

  useEffect(() => {
    const handleJobEvent = () => fetchJobs();
    socket.on('jobCreated', handleJobEvent);
    socket.on('jobUpdated', handleJobEvent);
    socket.on('jobDeleted', handleJobEvent);

    return () => {
      socket.off('jobCreated', handleJobEvent);
      socket.off('jobUpdated', handleJobEvent);
      socket.off('jobDeleted', handleJobEvent);
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
      Alert.alert('Sukses', `Job #${job.id} ditandai selesai!`);
      fetchJobs();
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
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>{item.work_date}</Text>
              <Text style={styles.dayText}>{item.work_day}</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.timeText}>
                ⏱️ {item.start_time.slice(0, 5)} - {item.end_time ? item.end_time.slice(0, 5) : '...'}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: item.status === 'Completed' ? '#2e7d32' : '#ed6c02' },
                ]}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.categoryText}>{item.problem_category}</Text>
          <Text style={styles.problemText} numberOfLines={2}>
            {item.problem_detail}
          </Text>

          {item.action_taken ? (
            <Text style={styles.actionText} numberOfLines={2}>
              🛠️ Solusi: {item.action_taken}
            </Text>
          ) : null}

          <View style={styles.cardFooter}>
            <Text style={styles.userText}>
              Teknisi: {item.user?.name || item.user?.username}
            </Text>

            {item.status === 'Pending' && (
              <Button
                mode="contained"
                buttonColor="#2e7d32"
                compact
                style={styles.doneBtn}
                labelStyle={styles.doneBtnLabel}
                onPress={() => handleMarkComplete(item)}
              >
                Selesai
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Tab Segmented Buttons */}
      <View style={styles.segmentedContainer}>
        <SegmentedButtons
          value={statusTab}
          onValueChange={setStatusTab}
          buttons={[
            { value: 'All', label: 'Semua' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Completed', label: 'Selesai' },
          ]}
        />
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#1a237e" />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderJobItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchJobs();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Tidak ada catatan pekerjaan.</Text>
            </View>
          }
        />
      )}

      {/* FAB Buat Job */}
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
  segmentedContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
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
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateBadge: {
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateText: {
    fontWeight: '800',
    color: '#1a237e',
    fontSize: 12,
  },
  dayText: {
    fontWeight: '700',
    color: '#ff6f00',
    fontSize: 11,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  problemText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 6,
  },
  actionText: {
    fontSize: 12,
    color: '#166534',
    backgroundColor: '#f0fdf4',
    padding: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    marginTop: 4,
  },
  userText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
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
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    backgroundColor: '#1a237e',
    borderRadius: 28,
  },
});

export default JobListScreen;
