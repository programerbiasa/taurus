import React, { useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { MD3LightTheme as DefaultTheme, PaperProvider, ActivityIndicator } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';

import StackNavigator from './navigation/StackNavigator';
import { initLocalDatabase } from './db/localdb';
import { setupAutoSync } from './sync/syncManager';
import socket from './socket';
import { RootStackParamList } from './types';

// Konfigurasi Tema React Native Paper
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1a237e',
    secondary: '#ff6f00',
    tertiary: '#0288d1',
    background: '#f4f6f8',
    surface: '#ffffff',
  },
};

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    const bootstrapApp = async () => {
      try {
        // 1. Inisialisasi Database SQLite Lokal
        await initLocalDatabase();

        // 2. Pasang Listener Sinkronisasi Otomatis
        setupAutoSync((count) => {
          Alert.alert('Sinkronisasi Berhasil', `${count} data pekerjaan berhasil diunggah ke server.`);
        });

        // 3. Periksa Token Autentikasi di SecureStore
        const token = await SecureStore.getItemAsync('taurus_token');
        if (token) {
          setInitialRoute('Dashboard');
        } else {
          setInitialRoute('Login');
        }
      } catch (err) {
        console.warn('Error bootstrap app mobile:', err);
        setInitialRoute('Login');
      }
    };

    bootstrapApp();

    // 4. WebSocket Listener: Notifikasi Real-Time saat ada tiket baru
    const handleNotification = (notif: { title: string; message: string }) => {
      Alert.alert(notif.title || 'Pemberitahuan IT Support', notif.message);
    };

    const handleTicketCreated = (ticket: any) => {
      Alert.alert(
        '🔔 Tiket Baru Masuk!',
        `Tiket #${ticket.id}: "${ticket.subject}" telah dibuat oleh ${ticket.reporter?.name || ticket.reporter?.username || 'klien'}.`
      );
    };

    socket.on('notification', handleNotification);
    socket.on('ticketCreated', handleTicketCreated);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('ticketCreated', handleTicketCreated);
    };
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d1b2a' }}>
        <ActivityIndicator size="large" color="#ff6f00" />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#1a237e" />
        <StackNavigator initialRouteName={initialRoute} />
      </NavigationContainer>
    </PaperProvider>
  );
}
