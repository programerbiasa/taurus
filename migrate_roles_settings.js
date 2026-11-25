const mysql = require('./node_modules/mysql2/promise');
const dotenv = require('./node_modules/dotenv');
dotenv.config();

async function migrateRolesAndSettings() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '172.16.5.254',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '4dm1nlm4',
    database: process.env.DB_NAME || 'taurus'
  });

  console.log('Connected to MariaDB!');

  // 1. Update enum role di users menjadi admin, it_support, client
  await conn.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'it_support', 'client') DEFAULT 'client'");
  await conn.query("UPDATE users SET role = 'admin' WHERE username IN ('admin')");
  await conn.query("UPDATE users SET role = 'it_support' WHERE username IN ('it_admin')");
  console.log('ROLES_UPDATED_SUCCESS');

  // 2. Buat tabel app_settings
  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(50) NOT NULL UNIQUE,
      setting_value TEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // 3. Masukkan setting default jika belum ada
  const defaultSettings = [
    ['app_name', 'TAURUS'],
    ['app_tagline', 'IT SUPPORT SYSTEM'],
    ['app_logo_url', '']
  ];

  for (const [key, val] of defaultSettings) {
    await conn.query(
      'INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)',
      [key, val]
    );
  }

  const [settings] = await conn.query('SELECT * FROM app_settings');
  console.log('CURRENT SETTINGS:', settings);

  const [users] = await conn.query('SELECT id, username, name, role, status FROM users');
  console.log('CURRENT USERS WITH ROLES:', users);

  await conn.end();
}

migrateRolesAndSettings().catch(console.error);
