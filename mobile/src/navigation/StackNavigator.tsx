import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TicketListScreen from '../screens/TicketListScreen';
import TicketCreateScreen from '../screens/TicketCreateScreen';
import TicketDetailScreen from '../screens/TicketDetailScreen';
import JobListScreen from '../screens/JobListScreen';
import PendingJobsScreen from '../screens/PendingJobsScreen';
import JobCreateScreen from '../screens/JobCreateScreen';
import JobDetailScreen from '../screens/JobDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const StackNavigator: React.FC<{ initialRouteName?: keyof RootStackParamList }> = ({
  initialRouteName = 'Login',
}) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1a237e',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TicketList"
        component={TicketListScreen}
        options={{ title: 'Daftar Tiket IT' }}
      />
      <Stack.Screen
        name="TicketCreate"
        component={TicketCreateScreen}
        options={{ title: 'Buat Tiket Baru' }}
      />
      <Stack.Screen
        name="TicketDetail"
        component={TicketDetailScreen}
        options={{ title: 'Detail Tiket' }}
      />
      <Stack.Screen
        name="JobList"
        component={JobListScreen}
        options={{ title: 'Daftar Pekerjaan IT' }}
      />
      <Stack.Screen
        name="PendingJobs"
        component={PendingJobsScreen}
        options={{ title: 'Pekerjaan Pending' }}
      />
      <Stack.Screen
        name="JobCreate"
        component={JobCreateScreen}
        options={{ title: 'Catat Pekerjaan Baru' }}
      />
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{ title: 'Detail Pekerjaan' }}
      />
    </Stack.Navigator>
  );
};

export default StackNavigator;
