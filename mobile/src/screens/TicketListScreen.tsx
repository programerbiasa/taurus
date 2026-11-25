import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Searchbar,
  Chip,
  ActivityIndicator,
  FAB,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Ticket } from '../types';
import api from '../api';
import socket from '../socket';

type TicketListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TicketList'>;

interface Props {
  navigation: TicketListNavigationProp;
}

export const TicketListScreen: React.FC<Props> = ({ navigation }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  const fetchTickets = async () => {
    try {
      const params: any = {};
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (search.trim()) params.search = search.trim();

      const res = await api.get<Ticket[]>('/tickets', { params });
      setTickets(res.data);
    } catch (err) {
      console.warn('Gagal memuat tiket:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [selectedStatus]);

  useEffect(() => {
    const handleUpdate = () => fetchTickets();
    socket.on('ticketCreated', handleUpdate);
    socket.on('ticketUpdated', handleUpdate);
    socket.on('ticketDeleted', handleUpdate);

    return () => {
      socket.off('ticketCreated', handleUpdate);
      socket.off('ticketUpdated', handleUpdate);
      socket.off('ticketDeleted', handleUpdate);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return '#0288d1';
      case 'InProgress':
        return '#ed6c02';
      case 'Resolved':
        return '#2e7d32';
      case 'Closed':
        return '#64748b';
      default:
        return '#64748b';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return '#d32f2f';
      case 'High':
        return '#e65100';
      case 'Medium':
        return '#0288d1';
      default:
        return '#757575';
    }
  };

  const renderTicketItem = ({ item }: { item: Ticket }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation.navigate('TicketDetail', { id: item.id })}
    >
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          {/* Header Row: ID, Category & Priority */}
          <View style={styles.cardHeader}>
            <View style={styles.idBadge}>
              <Text style={styles.idText}>#{item.id}</Text>
            </View>
            <Text style={styles.categoryText}>{item.category || 'General'}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
              <Text style={styles.priorityText}>{item.priority}</Text>
            </View>
          </View>

          {/* Subject & Detail */}
          <Text style={styles.subjectText} numberOfLines={2}>
            {item.subject}
          </Text>
          <Text style={styles.detailSnippet} numberOfLines={2}>
            {item.detail}
          </Text>

          {/* Footer: Reporter, Date & Status */}
          <View style={styles.cardFooter}>
            <Text style={styles.reporterText}>
              👤 {item.reporter?.name || item.reporter?.username}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <Searchbar
        placeholder="Cari subjek / keluhan..."
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={fetchTickets}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
      />

      {/* Filter Status Chips */}
      <View style={styles.chipsRow}>
        {['All', 'Open', 'InProgress', 'Resolved', 'Closed'].map((st) => (
          <Chip
            key={st}
            selected={selectedStatus === st}
            onPress={() => setSelectedStatus(st)}
            style={[styles.chip, selectedStatus === st && styles.chipSelected]}
            textStyle={selectedStatus === st ? styles.chipTextSelected : styles.chipText}
          >
            {st === 'All' ? 'Semua' : st}
          </Chip>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#1a237e" />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTicketItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchTickets();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Tidak ada tiket yang ditemukan.</Text>
            </View>
          }
        />
      )}

      {/* FAB Buat Tiket */}
      <FAB
        icon="plus"
        color="#ffffff"
        style={styles.fab}
        onPress={() => navigation.navigate('TicketCreate')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  searchbar: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#ffffff',
    elevation: 2,
    borderRadius: 10,
  },
  searchInput: {
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    backgroundColor: '#e2e8f0',
  },
  chipSelected: {
    backgroundColor: '#1a237e',
  },
  chipText: {
    color: '#334155',
    fontSize: 12,
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
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
    alignItems: 'center',
    marginBottom: 8,
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
    fontWeight: '600',
    fontSize: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  subjectText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  detailSnippet: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  reporterText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 11,
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
    backgroundColor: '#ff6f00',
    borderRadius: 28,
  },
});

export default TicketListScreen;
