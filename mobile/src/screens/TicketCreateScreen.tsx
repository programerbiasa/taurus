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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import api from '../api';

type TicketCreateNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TicketCreate'>;

interface Props {
  navigation: TicketCreateNavigationProp;
}

const CATEGORIES = [
  'Hardware',
  'Software',
  'Network / Internet',
  'Email & Akun',
  'Printer & Scanner',
  'General IT Support',
];

export const TicketCreateScreen: React.FC<Props> = ({ navigation }) => {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Hardware');
  const [priority, setPriority] = useState<string>('Medium');
  const [detail, setDetail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!subject.trim()) {
      setErrorMsg('Subjek tiket tidak boleh kosong');
      return;
    }
    if (!detail.trim()) {
      setErrorMsg('Detail kendala tidak boleh kosong');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        subject: subject.trim(),
        category,
        priority,
        detail: detail.trim(),
      };

      const res = await api.post('/tickets', payload);
      Alert.alert('Sukses', 'Tiket bantuan IT berhasil dibuat!', [
        {
          text: 'Lihat Tiket',
          onPress: () => navigation.replace('TicketDetail', { id: res.data.id }),
        },
      ]);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan tiket');
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
            <Text style={styles.title}>Buat Laporan / Tiket Baru</Text>
            <Text style={styles.subtitle}>
              Sampaikan kendala perangkat atau sistem IT yang Anda alami.
            </Text>

            {errorMsg ? (
              <HelperText type="error" visible={true} style={styles.errorText}>
                {errorMsg}
              </HelperText>
            ) : null}

            {/* Subjek */}
            <TextInput
              label="Subjek Kendala *"
              mode="outlined"
              placeholder="Contoh: Komputer Kasir Tidak Mau Menyala"
              value={subject}
              onChangeText={setSubject}
              style={styles.input}
              outlineColor="#cbd5e1"
              activeOutlineColor="#1a237e"
            />

            {/* Kategori Dropdown / Buttons */}
            <Text style={styles.fieldLabel}>Pilih Kategori:</Text>
            <View style={styles.categoryContainer}>
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  mode={category === cat ? 'contained' : 'outlined'}
                  buttonColor={category === cat ? '#1a237e' : undefined}
                  textColor={category === cat ? '#ffffff' : '#1e293b'}
                  style={styles.catButton}
                  labelStyle={styles.catButtonLabel}
                  onPress={() => setCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </View>

            {/* Tingkat Prioritas */}
            <Text style={styles.fieldLabel}>Tingkat Prioritas:</Text>
            <SegmentedButtons
              value={priority}
              onValueChange={setPriority}
              style={styles.segmented}
              buttons={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
                { value: 'Critical', label: 'Critical' },
              ]}
            />

            {/* Detail Masalah */}
            <TextInput
              label="Detail Kendala & Gejala *"
              mode="outlined"
              placeholder="Jelaskan secara detail pesan error atau kendala yang dialami..."
              multiline
              numberOfLines={5}
              value={detail}
              onChangeText={setDetail}
              style={[styles.input, { minHeight: 110 }]}
              outlineColor="#cbd5e1"
              activeOutlineColor="#1a237e"
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              disabled={loading}
              buttonColor="#ff6f00"
              style={styles.submitBtn}
              contentStyle={styles.submitBtnContent}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size={20} />
              ) : (
                'Kirim Tiket Sekarang'
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
  errorText: {
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    marginBottom: 14,
    backgroundColor: '#ffffff',
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
    marginBottom: 16,
  },
  catButton: {
    borderRadius: 8,
    borderColor: '#cbd5e1',
  },
  catButtonLabel: {
    fontSize: 12,
    marginVertical: 4,
    marginHorizontal: 8,
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

export default TicketCreateScreen;
