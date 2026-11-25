import * as SQLite from 'expo-sqlite';
import { OfflineJob } from '../types';

let dbInstance: any = null;

export const getDb = () => {
  if (!dbInstance) {
    if (typeof (SQLite as any).openDatabaseSync === 'function') {
      dbInstance = (SQLite as any).openDatabaseSync('taurus_offline.db');
    } else {
      dbInstance = (SQLite as any).openDatabase('taurus_offline.db');
    }
  }
  return dbInstance;
};

// Inisialisasi tabel jobs_offline lokal
export const initLocalDatabase = async (): Promise<void> => {
  const db = getDb();

  return new Promise((resolve, reject) => {
    try {
      if (typeof db.execAsync === 'function') {
        db.execAsync(`
          CREATE TABLE IF NOT EXISTS jobs_offline (
            local_id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER,
            problem_category TEXT,
            problem_detail TEXT,
            action_taken TEXT,
            status TEXT DEFAULT 'Pending',
            work_date TEXT NOT NULL,
            work_day TEXT,
            start_time TEXT NOT NULL,
            end_time TEXT,
            synced INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `).then(() => resolve()).catch(reject);
      } else {
        db.transaction((tx: any) => {
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS jobs_offline (
              local_id INTEGER PRIMARY KEY AUTOINCREMENT,
              ticket_id INTEGER,
              problem_category TEXT,
              problem_detail TEXT,
              action_taken TEXT,
              status TEXT DEFAULT 'Pending',
              work_date TEXT NOT NULL,
              work_day TEXT,
              start_time TEXT NOT NULL,
              end_time TEXT,
              synced INTEGER DEFAULT 0,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`,
            [],
            () => resolve(),
            (_: any, err: any) => {
              reject(err);
              return false;
            }
          );
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

// Menyimpan job offline ke SQLite
export const insertOfflineJob = async (job: OfflineJob): Promise<number> => {
  const db = getDb();

  return new Promise((resolve, reject) => {
    try {
      if (typeof db.runAsync === 'function') {
        db.runAsync(
          `INSERT INTO jobs_offline 
           (ticket_id, problem_category, problem_detail, action_taken, status, work_date, work_day, start_time, end_time, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
          [
            job.ticket_id || null,
            job.problem_category,
            job.problem_detail,
            job.action_taken,
            job.status,
            job.work_date,
            job.work_day || 'Senin',
            job.start_time,
            job.end_time || null,
          ]
        ).then((res: any) => resolve(res.lastInsertRowId || 1)).catch(reject);
      } else {
        db.transaction((tx: any) => {
          tx.executeSql(
            `INSERT INTO jobs_offline 
             (ticket_id, problem_category, problem_detail, action_taken, status, work_date, work_day, start_time, end_time, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
            [
              job.ticket_id || null,
              job.problem_category,
              job.problem_detail,
              job.action_taken,
              job.status,
              job.work_date,
              job.work_day || 'Senin',
              job.start_time,
              job.end_time || null,
            ],
            (_: any, result: any) => {
              resolve(result.insertId);
            },
            (_: any, error: any) => {
              reject(error);
              return false;
            }
          );
        });
      }
    } catch (err) {
      reject(err);
    }
  });
};

// Mengambil semua job yang belum disinkronkan ke server (synced = 0)
export const getUnsyncedJobs = async (): Promise<OfflineJob[]> => {
  const db = getDb();

  return new Promise((resolve, reject) => {
    try {
      if (typeof db.getAllAsync === 'function') {
        db.getAllAsync('SELECT * FROM jobs_offline WHERE synced = 0 ORDER BY local_id ASC;')
          .then((rows: any) => resolve(rows as OfflineJob[]))
          .catch(reject);
      } else {
        db.transaction((tx: any) => {
          tx.executeSql(
            'SELECT * FROM jobs_offline WHERE synced = 0 ORDER BY local_id ASC;',
            [],
            (_: any, { rows }: any) => {
              const items: OfflineJob[] = [];
              for (let i = 0; i < rows.length; i++) {
                items.push(rows.item(i));
              }
              resolve(items);
            },
            (_: any, error: any) => {
              reject(error);
              return false;
            }
          );
        });
      }
    } catch (err) {
      reject(err);
    }
  });
};

// Menandai job telah berhasil diunggah ke backend MariaDB (synced = 1)
export const markJobSynced = async (localId: number): Promise<void> => {
  const db = getDb();

  return new Promise((resolve, reject) => {
    try {
      if (typeof db.runAsync === 'function') {
        db.runAsync('UPDATE jobs_offline SET synced = 1 WHERE local_id = ?;', [localId])
          .then(() => resolve())
          .catch(reject);
      } else {
        db.transaction((tx: any) => {
          tx.executeSql(
            'UPDATE jobs_offline SET synced = 1 WHERE local_id = ?;',
            [localId],
            () => resolve(),
            (_: any, err: any) => {
              reject(err);
              return false;
            }
          );
        });
      }
    } catch (err) {
      reject(err);
    }
  });
};
