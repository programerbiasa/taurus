import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import api from '../api';
import { getUnsyncedJobs, markJobSynced } from '../db/localdb';

let isSyncing = false;

// Fungsi untuk mengeksekusi sinkronisasi data antrian offline ke backend MariaDB
export const syncOfflineDataNow = async (): Promise<{ successCount: number; failCount: number }> => {
  if (isSyncing) return { successCount: 0, failCount: 0 };

  const netState = await NetInfo.fetch();
  if (!netState.isConnected || !netState.isInternetReachable) {
    console.log('📡 Perangkat offline, menunda proses sinkronisasi...');
    return { successCount: 0, failCount: 0 };
  }

  isSyncing = true;
  let successCount = 0;
  let failCount = 0;

  try {
    const unsyncedJobs = await getUnsyncedJobs();
    if (unsyncedJobs.length === 0) {
      isSyncing = false;
      return { successCount: 0, failCount: 0 };
    }

    console.log(`🔄 Memulai sinkronisasi ${unsyncedJobs.length} job offline ke server...`);

    for (const job of unsyncedJobs) {
      try {
        const payload = {
          ticket_id: job.ticket_id || null,
          problem_category: job.problem_category,
          problem_detail: job.problem_detail,
          action_taken: job.action_taken,
          status: job.status,
          work_date: job.work_date,
          start_time: job.start_time,
          end_time: job.end_time || null,
        };

        await api.post('/jobs', payload);

        if (job.local_id) {
          await markJobSynced(job.local_id);
        }
        successCount++;
      } catch (err) {
        console.error(`❌ Gagal sinkronisasi job ID lokal #${job.local_id}:`, err);
        failCount++;
      }
    }

    console.log(`✅ Sinkronisasi selesai: ${successCount} berhasil, ${failCount} gagal.`);
  } catch (err) {
    console.error('Error saat menjalankan syncOfflineDataNow:', err);
  } finally {
    isSyncing = false;
  }

  return { successCount, failCount };
};

// Pasang listener NetInfo untuk sinkronisasi otomatis setiap kali koneksi internet pulih
export const setupAutoSync = (onSyncComplete?: (count: number) => void) => {
  const unsubscribe = NetInfo.addEventListener(async (state: NetInfoState) => {
    if (state.isConnected && state.isInternetReachable) {
      console.log('🌐 Koneksi internet terdeteksi online! Memeriksa antrian sinkronisasi...');
      const { successCount } = await syncOfflineDataNow();
      if (successCount > 0 && onSyncComplete) {
        onSyncComplete(successCount);
      }
    }
  });

  return unsubscribe;
};
