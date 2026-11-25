import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Avatar,
  IconButton,
  ActivityIndicator,
  Badge,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Job, Ticket } from '../types';
import api, { clearAuthSession, getStoredUser } from '../api';
import socket from '../socket';
import { syncOfflineDataNow } from '../sync/syncManager';
import { getUnsyncedJobs } from '../db/localdb';

type DashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface Props {
  navigation: DashboardNavigationProp;
}

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const [userName, setUserName] = useState('Teknisi');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  const loadData = async () => {
    try {
      const user = await getStoredUser();
      if (user) {
        setUserName(user.name || user.username);
      }

      const [jobsRes, ticketsRes] = await Promise.all([
        api.get<Job[]>('/jobs'),
        api.get<Ticket[]>('/tickets'),
      ]);

      setJobs(jobsRes.data);
      setTickets(ticketsRes.data);

      const unsynced = await getUnsyncedJobs();
      setUnsyncedCount(unsynced.length);
    } catch (err) {
      console.warn('Gagal memuat data dashboard mobile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen WebSocket events
    const handleRefresh = () => loadData();
    socket.on('ticketCreated', handleRefresh);
    socket.on('ticketUpdated', handleRefresh);
    socket.on('jobCreated', handleRefresh);
    socket.on('jobUpdated', handleRefresh);

    return () => {
      socket.off('ticketCreated', handleRefresh);
      socket.off('ticketUpdated', handleRefresh);
      socket.off('jobCreated', handleRefresh);
      socket.off('jobUpdated', handleRefresh);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleManualSync = async () => {
    const { successCount, failCount } = await syncOfflineDataNow();
    if (successCount > 0) {
      Alert.alert('Sukses Sinkronisasi', `${successCount} data pekerjaan berhasil diunggah ke server.`);
      loadData();
    } else if (failCount > 0) {
      Alert.alert('Gagal', 'Beberapa data gagal diunggah. Pastikan terhubung ke jaringan server.');
    } else {
      Alert.alert('Informasi', 'Semua data lokal telah sinkron dengan server.');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Konfirmasi Keluar', 'Apakah Anda yakin ingin keluar dari aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await clearAuthSession();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  // Metrik pekerjaan
  const totalJobs = jobs.length;
  const pendingJobs = jobs.filter((j) => j.status === 'Pending').length;
  const completedJobs = jobs.filter((j) => j.status === 'Completed').length;
  const openTickets = tickets.filter((t) => t.status === 'Open' || t.status === 'InProgress').length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Top Banner */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.welcomeText}>Halo, Teknisi</Text>
          <Text style={styles.nameText}>{userName}</Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon="sync"
            iconColor="#ffffff"
            size={24}
            onPress={handleManualSync}
          />
          <IconButton
            icon="logout"
            iconColor="#ffffff"
            size={24}
            onPress={handleLogout}
          />
        </View>
      </View>

      {/* Offline Alert Bar jika ada antrian yang belum sync */}
      {unsyncedCount > 0 && (
        <TouchableOpacity style={styles.syncBanner} onPress={handleManualSync}>
          <Text style={styles.syncBannerText}>
            ⚠️ Ada {unsyncedCount} job offline menunggu sinkronisasi. Tekan untuk sync.
          </Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#1a237e" />
        </View>
      ) : (
        <View style={styles.content}>
          {/* Quick Metrics Grid */}
          <Text style={styles.sectionTitle}>Ringkasan Tugas Hari Ini</Text>
          <View style={styles.grid}>
            {/* Total Jobs */}
            <Card style={[styles.statCard, { borderLeftColor: '#1a237e' }]} mode="elevated">
              <Card.Content>
                <Text style={styles.statLabel}>Total Job</Text>
                <Text style={[styles.statNumber, { color: '#1a237e' }]}>{totalJobs}</Text>
                <Text style={styles.statSub}>Riwayat pengerjaan</Text>
              </Card.Content>
            </Card>

            {/* Pending Jobs */}
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => navigation.navigate('PendingJobs')}
            >
              <Card style={[styles.statCard, { borderLeftColor: '#ed6c02' }]} mode="elevated">
                <Card.Content>
                  <Text style={styles.statLabel}>Job Pending</Text>
                  <Text style={[styles.statNumber, { color: '#ed6c02' }]}>{pendingJobs}</Text>
                  <Text style={styles.statSub}>Perlu diselesaikan &rarr;</Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {/* Completed Jobs */}
            <Card style={[styles.statCard, { borderLeftColor: '#2e7d32' }]} mode="elevated">
              <Card.Content>
                <Text style={styles.statLabel}>Job Selesai</Text>
                <Text style={[styles.statNumber, { color: '#2e7d32' }]}>{completedJobs}</Text>
                <Text style={styles.statSub}>Tuntas dikerjakan</Text>
              </Card.Content>
            </Card>

            {/* Tiket Aktif */}
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => navigation.navigate('TicketList')}
            >
              <Card style={[styles.statCard, { borderLeftColor: '#d32f2f' }]} mode="elevated">
                <Card.Content>
                  <Text style={styles.statLabel}>Tiket Aktif</Text>
                  <Text style={[styles.statNumber, { color: '#d32f2f' }]}>{openTickets}</Text>
                  <Text style={styles.statSub}>Tiket Open &rarr;</Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Menu & Aksi Cepat</Text>
          <View style={styles.actionColumn}>
            <Button
              mode="contained"
              icon="plus-circle"
              buttonColor="#ff6f00"
              style={styles.actionBtn}
              contentStyle={styles.actionBtnContent}
              onPress={() => navigation.navigate('JobCreate', {})}
            >
              Catat Pekerjaan Baru (Job)
            </Button>

            <Button
              mode="contained"
              icon="ticket-confirmation"
              buttonColor="#1a237e"
              style={styles.actionBtn}
              contentStyle={styles.actionBtnContent}
              onPress={() => navigation.navigate('TicketCreate')}
            >
              Buat Tiket Bantuan Baru
            </Button>

            <Button
              mode="outlined"
              icon="format-list-checks"
              textColor="#1a237e"
              style={[styles.actionBtn, { borderColor: '#1a237e' }]}
              contentStyle={styles.actionBtnContent}
              onPress={() => navigation.navigate('JobList', { filterStatus: 'All' })}
            >
              Semua Daftar Pekerjaan IT
            </Button>

            <Button
              mode="outlined"
              icon="clipboard-list-outline"
              textColor="#1a237e"
              style={[styles.actionBtn, { borderColor: '#1a237e' }]}
              contentStyle={styles.actionBtnContent}
              onPress={() => navigation.navigate('TicketList')}
            >
              Semua Daftar Tiket IT
            </Button>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  header: {
    backgroundColor: '#1a237e',
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  welcomeText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '500',
  },
  nameText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  syncBanner: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#ff6f00',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  syncBannerText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '600',
  },
  centerLoading: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderLeftWidth: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    marginVertical: 4,
  },
  statSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
  actionColumn: {
    gap: 12,
  },
  actionBtn: {
    borderRadius: 10,
  },
  actionBtnContent: {
    paddingVertical: 6,
  },
});

export default DashboardScreen;
