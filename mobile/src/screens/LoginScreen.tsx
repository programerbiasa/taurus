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
  Text,
  TextInput,
  Button,
  Card,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import api, { saveAuthSession } from '../api';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async () => {
    setErrorMsg('');
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username dan password wajib diisi');
      return;
    }

    try {
      setLoading(true);
      if (!isRegister) {
        // Login
        const res = await api.post('/auth/login', { username, password });
        await saveAuthSession(res.data.token, res.data.user);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      } else {
        // Register
        await api.post('/auth/register', { username, password, name });
        Alert.alert('Sukses', 'Akun berhasil dibuat! Silakan masuk dengan akun baru Anda.');
        setIsRegister(false);
        setPassword('');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal terhubung ke server');
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
        {/* Header / Brand */}
        <View style={styles.brandBox}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>⚡</Text>
          </View>
          <Text style={styles.brandTitle}>TAURUS</Text>
          <Text style={styles.brandSubtitle}>IT SUPPORT MOBILE SYSTEM</Text>
        </View>

        {/* Card Form */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.formTitle}>
              {isRegister ? 'Pendaftaran Akun Baru' : 'Masuk ke Aplikasi'}
            </Text>

            {errorMsg ? (
              <HelperText type="error" visible={true} style={styles.errorText}>
                {errorMsg}
              </HelperText>
            ) : null}

            {isRegister && (
              <TextInput
                label="Nama Lengkap"
                mode="outlined"
                value={name}
                onChangeText={setName}
                style={styles.input}
                outlineColor="#cbd5e1"
                activeOutlineColor="#1a237e"
              />
            )}

            <TextInput
              label="Username"
              mode="outlined"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              style={styles.input}
              outlineColor="#cbd5e1"
              activeOutlineColor="#1a237e"
            />

            <TextInput
              label="Password"
              mode="outlined"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
              outlineColor="#cbd5e1"
              activeOutlineColor="#1a237e"
            />

            <Button
              mode="contained"
              onPress={handleAuth}
              disabled={loading}
              style={styles.submitBtn}
              buttonColor="#1a237e"
              contentStyle={styles.btnContent}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size={20} />
              ) : isRegister ? (
                'Daftar Sekarang'
              ) : (
                'Masuk'
              )}
            </Button>

            <Button
              mode="text"
              onPress={() => {
                setIsRegister(!isRegister);
                setErrorMsg('');
              }}
              textColor="#ff6f00"
              style={styles.toggleBtn}
            >
              {isRegister ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Buat Akun Baru'}
            </Button>
          </Card.Content>
        </Card>

        <Text style={styles.footerNote}>
          Default login admin: admin / admin123
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1b2a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ff6f00',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 8,
  },
  logoBadgeText: {
    fontSize: 32,
    color: '#ffffff',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#ffb74d',
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    elevation: 4,
    paddingVertical: 10,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a237e',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  errorText: {
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  submitBtn: {
    marginTop: 10,
    borderRadius: 10,
  },
  btnContent: {
    paddingVertical: 6,
  },
  toggleBtn: {
    marginTop: 10,
  },
  footerNote: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 20,
  },
});

export default LoginScreen;
