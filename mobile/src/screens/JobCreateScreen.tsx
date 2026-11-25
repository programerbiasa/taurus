import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  HelperText,
  SegmentedButtons,
  ActivityIndicator,
} from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import api from '../api';
import { insertOfflineJob } from '../db/localdb';
import NetInfo from '@react-native-community/netinfo';

type JobCreateRouteProp = RouteProp<RootStackParamList, 'JobCreate'>;
type JobCreateNavigationProp = NativeStackNavigationProp<RootStackParamList, 'JobCreate'>;

interface Props {
  route: JobCreateRouteProp;
  navigation: JobCreateNavigationProp;
}

const CATEGORIES = [
  'Hardware - PC / Laptop',
  'Hardware - Printer / Scanner',
  'Software - OS & Driver',
  'Software - Aplikasi Internal',
  'Jaringan - WiFi / LAN',
  'CCTV & Keamanan',
  'Akun / Password Reset',
  'Maintenance Rutin',
  'Lain-lain',
];

export const JobCreateScreen: React.FC<Props> = ({ route, navigation }) => {
  const prefillTicketId = route.params?.ticket_id;
  const prefillCategory = route.params?.category;
  const prefillDetail = route.params?.detail;

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().slice(0, 5);

  const [ticketId, setTicketId] = useState<string>(prefillTicketId ? String(prefillTicketId) : '');
  const [problemCategory, setProblemCategory] = useState<string>(
    prefillCategory || 'Hardware - PC / Laptop'
  );
  const [problemDetail, setProblemDetail] = useState<string>(prefillDetail || '');
  const [actionTaken, setActionTaken] = useState<string>('');
  const [status, setStatus] = useState<'Pending' | 'Completed'>('Pending');
  const [workDate, setWorkDate] = useState<string>(today);
  const [startTime, setStartTime] = useState<string>(now);
  const [endTime, setEndTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const calculateDayName = (dateStr: string) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const d = new Date(dateStr);
    return days[d.getDay()] || 'Senin';
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!workDate.trim()) {
      setErrorMsg('Tanggal pengerjaan wajib diisi');
      return;
    }
    if (!startTime.trim()) {
      setErrorMsg('Jam mulai pengerjaan wajib diisi');
      return;
    }
    if (!problemDetail.trim()) {
      setErrorMsg('Detail masalah teknis wajib diisi');
      return;
    }

    setLoading(true);

    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable;

    const payload = {
      ticket_id: ticketId ? Number(ticketId) : null,
      problem_category: problemCategory,
      problem_detail: problemDetail.trim(),
      action_taken: actionTaken.trim(),
      status,
      work_date: workDate,
      work_day: calculateDayName(workDate),
      start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
      end_time: endTime ? (endTime.length === 5 ? `${endTime}:00` : endTime) : null,
    };

    if (isOnline) {
      try {
        const res = await api.post('/jobs', payload);
        Alert.alert('Sukses', 'Catatan pekerjaan berhasil disimpan ke server!', [
          {
            text: 'Lihat Detail',
            onPress: () => navigation.replace('JobDetail', { id: res.data.id }),
          },
        ]);
        return;
      } catch (err: any) {
        console.warn('Gagal kirim ke server online, beralih ke penyimpanan lokal offline...', err);
      } finally {
        setLoading(false);
      }
    }

    // Fallback: Simpan ke SQLite Lokal (Offline Mode)
    try {
      await insertOfflineJob({
        ...payload,
        synced: 0,
      });

      Alert.alert(
        'Tersimpan Offline',
        'Pekerjaan berhasil disimpan di memori HP (SQLite lokal) karena koneksi ke server tidak stabil. Data akan otomatis disinkronkan saat terhubung kembali!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Dashboard'),
          },
        ]
      );
    } catch (dbErr: any) {
      setErrorMsg('Gagal menyimpan ke database lokal: ' + dbErr.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.title}>Catat Pekerjaan Teknisi</Text>
            <Text style={styles.subtitle}>
              Mendukung penyimpanan offline saat tidak ada jaringan.
            </Text>

            {errorMsg ? (
              <HelperText type="error" visible={true} style={styles.errorText}>
                {errorMsg}
              </HelperText>
            ) : null}

            {ticketId ? (
              <View style={styles.linkedTicketBox}>
                <Text style={styles.linkedTicketText}>
                  🔗 Terhubung ke Tiket #{ticketId}
                </Text>
              </View>
            ) : null}

            {/* Kategori Masalah */}
            <Text style={styles.fieldLabel}>Kategori Permasalahan:</Text>
            <View style={styles.categoryContainer}>
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  mode={problemCategory === cat ? 'contained' : 'outlined'}
                  buttonColor={problemCategory === cat ? '#1a237e' : undefined}
                  textColor={problemCategory === cat ? '#ffffff' : '#1e293b'}
                  style={styles.catButton}
                  labelStyle={styles.catButtonLabel}
                  onPress={() => setProblemCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </View>

            {/* Tanggal & Waktu */}
            <TextInput
              label="Tanggal Kerja (YYYY-MM-DD) *"
              mode="outlined"
              value={workDate}
              onChangeText={setWorkDate}
              style={styles.input}
              outlineColor="#cbd5e1"
              activeOutlineColor="#1a237e"
            />

            <View style={styles.row}>
              <TextInput
                label="Jam Mulai (HH:MM) *"
                mode="outlined"
                value={startTime}
                onChangeText={setStartTime}
                style={[styles.input, { flex: 1 }]}
                outlineColor="#cbd5e1"
                activeOutlineColor="#1a237e"
              />
              <TextInput
                label="Jam Selesai (HH:MM)"
                mode="outlined"
                value={endTime}
                onChangeText={setEndTime}
                style={[styles.input, { flex: 1 }]}
                outlineColor="#cbd5e1"
                activeOutlineColor="#1a237e"
              />
            </View>

            {/* Status */}
            <Text style={styles.fieldLabel}>Status Pekerjaan:</Text>
            <SegmentedButtons
              value={status}
              onValueChange={(val) => setStatus(val as any)}
              style={styles.segmented}
              buttons={[
                { value: 'Pending', label: 'Pending (Berjalan)' },
                { value: 'Completed', label: 'Completed (Selesai)' },
              ]}
            />

            {/* Detail Masalah */}
            <TextInput
              label="Keluhan / Problem Detail *"
              mode="outlined"
              placeholder="Contoh: Lampu indikator LAN router berkedip merah..."
              multiline
              numberOfLines={3}
              value={problemDetail}
              onChangeText={setProblemDetail}
              style={[styles.input, { minHeight: 80 }]}
              outlineColor="#cbd5e1"
              activeOutlineColor="#1a237e"
            />

            {/* Tindakan / Action */}
            <TextInput
              label="Tindakan yang Diambil (Action Taken)"
              mode="outlined"
              placeholder="Contoh: Crimping ulang konektor RJ45, tes ping berhasil 1ms..."
              multiline
              numberOfLines={4}
              value={actionTaken}
              onChangeText={setActionTaken}
              style={[styles.input, { minHeight: 90 }]}
              outlineColor="#cbd5e1"
              activeOutlineColor="#1a237e"
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              disabled={loading}
              buttonColor="#1a237e"
              style={styles.submitBtn}
              contentStyle={styles.submitBtnContent}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size={20} />
              ) : (
                'Simpan Catatan Pekerjaan'
              )}
            </Button>
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a237e',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  linkedTicketBox: {
    backgroundColor: '#e8eaf6',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  linkedTicketText: {
    color: '#1a237e',
    fontWeight: '700',
    fontSize: 13,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    marginBottom: 14,
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  catButton: {
    borderRadius: 8,
    borderColor: '#cbd5e1',
  },
  catButtonLabel: {
    fontSize: 11,
    marginVertical: 4,
    marginHorizontal: 6,
  },
  segmented: {
    marginBottom: 16,
  },
  submitBtn: {
    marginTop: 10,
    borderRadius: 10,
  },
  submitBtnContent: {
    paddingVertical: 8,
  },
});

export default JobCreateScreen;
