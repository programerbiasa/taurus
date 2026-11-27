const mysql = require('./backend/node_modules/mysql2/promise');
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '172.16.5.254',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '4dm1nlm4',
    database: process.env.DB_NAME || 'taurus'
  });

  console.log('Connected to MariaDB at', process.env.DB_HOST || '172.16.5.254');

  // 1. Table: inventory_locations (Lokasi Barang)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS inventory_locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Created table inventory_locations');

  // 2. Table: inventory_pics (PIC terkait dengan Lokasi)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS inventory_pics (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      location_id INT NULL,
      phone VARCHAR(50) NULL,
      department VARCHAR(100) NULL,
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (location_id) REFERENCES inventory_locations(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Created table inventory_pics');

  // 3. Table: inventory_categories (Jenis Barang)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS inventory_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Created table inventory_categories');

  // 4. Table: inventory_brands (Merk Barang)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS inventory_brands (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Created table inventory_brands');

  // 5. Table: inventory_types (Tipe / Model Barang)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS inventory_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      brand_id INT NULL,
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES inventory_brands(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Created table inventory_types');

  // 6. Table: inventory_items (Master Barang)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      item_code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      serial_number VARCHAR(100) NULL,
      category_id INT NULL,
      brand_id INT NULL,
      type_id INT NULL,
      current_location_id INT NULL,
      current_pic_id INT NULL,
      condition_status ENUM('Baik', 'Rusak', 'Hilang', 'Scrap') DEFAULT 'Baik',
      status ENUM('in_stock', 'deployed', 'maintenance', 'scrap') DEFAULT 'in_stock',
      entry_date DATE NOT NULL,
      last_update_date DATETIME NULL,
      notes TEXT NULL,
      photo_url VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES inventory_categories(id) ON DELETE SET NULL,
      FOREIGN KEY (brand_id) REFERENCES inventory_brands(id) ON DELETE SET NULL,
      FOREIGN KEY (type_id) REFERENCES inventory_types(id) ON DELETE SET NULL,
      FOREIGN KEY (current_location_id) REFERENCES inventory_locations(id) ON DELETE SET NULL,
      FOREIGN KEY (current_pic_id) REFERENCES inventory_pics(id) ON DELETE SET NULL,
      INDEX (item_code),
      INDEX (serial_number),
      INDEX (condition_status),
      INDEX (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Created table inventory_items');

  // 7. Table: inventory_transactions (Riwayat Keluar Masuk & Mutasi Barang)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      item_id INT NOT NULL,
      transaction_type ENUM('masuk', 'keluar', 'mutasi', 'kembali') NOT NULL,
      transaction_date DATETIME NOT NULL,
      from_location_id INT NULL,
      to_location_id INT NULL,
      from_pic_id INT NULL,
      to_pic_id INT NULL,
      condition_status ENUM('Baik', 'Rusak', 'Hilang', 'Scrap') DEFAULT 'Baik',
      recipient_name VARCHAR(100) NULL,
      doc_number VARCHAR(100) NULL,
      notes TEXT NULL,
      operator_id INT NULL,
      operator_name VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
      FOREIGN KEY (from_location_id) REFERENCES inventory_locations(id) ON DELETE SET NULL,
      FOREIGN KEY (to_location_id) REFERENCES inventory_locations(id) ON DELETE SET NULL,
      FOREIGN KEY (from_pic_id) REFERENCES inventory_pics(id) ON DELETE SET NULL,
      FOREIGN KEY (to_pic_id) REFERENCES inventory_pics(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Created table inventory_transactions');

  // Seed Locations
  const locations = [
    ['Ruang IT', 'Gudang Utama & Ruang IT Support'],
    ['EMCC', 'Area Operasional EMCC'],
    ['PLANT', 'Area Pabrik & Pengolahan (Plant)'],
    ['OFFICE', 'Kantor Utama / Head Office'],
    ['WORKSHOP', 'Area Bengkel & Workshop Unit'],
    ['WAREHOUSE', 'Gudang Logistik Tambang']
  ];
  for (const [name, desc] of locations) {
    await conn.query(
      'INSERT IGNORE INTO inventory_locations (name, description) VALUES (?, ?)',
      [name, desc]
    );
  }
  console.log('Seeded locations');

  // Fetch location ids to link PICs properly
  const [locRows] = await conn.query('SELECT id, name FROM inventory_locations');
  const locMap = {};
  locRows.forEach(r => { locMap[r.name] = r.id; });

  // Seed PICs related to locations (EMCC: Tono, Tini, Tene; PLANT: Vika, Viki, Vuku, etc.)
  const pics = [
    ['Tono', locMap['EMCC'], '08123456701', 'Staff Operasional EMCC'],
    ['Tini', locMap['EMCC'], '08123456702', 'Supervisor EMCC'],
    ['Tene', locMap['EMCC'], '08123456703', 'Staff Lapangan EMCC'],
    ['Vika', locMap['PLANT'], '08123456704', 'Staff Control Room Plant'],
    ['Viki', locMap['PLANT'], '08123456705', 'Operator Plant'],
    ['Vuku', locMap['PLANT'], '08123456706', 'Foreman Plant'],
    ['Budi', locMap['OFFICE'], '08123456707', 'Admin Office'],
    ['Siti', locMap['OFFICE'], '08123456708', 'Finance & Logistik'],
    ['Joko', locMap['WORKSHOP'], '08123456709', 'Mekanik Senior'],
    ['Agus', locMap['WORKSHOP'], '08123456710', 'Staff Workshop']
  ];
  for (const [name, locId, phone, dept] of pics) {
    await conn.query(
      `INSERT INTO inventory_pics (name, location_id, phone, department) 
       SELECT ?, ?, ?, ? 
       WHERE NOT EXISTS (SELECT 1 FROM inventory_pics WHERE name = ? AND location_id = ?)`,
      [name, locId, phone, dept, name, locId]
    );
  }
  console.log('Seeded PICs');

  // Seed Categories
  const categories = [
    ['Radio Rig', 'Perangkat komunikasi radio rig pada unit/kantor'],
    ['Radio Handy Talkie (HT)', 'Perangkat komunikasi HT portable'],
    ['Dashcam', 'Kamera kabin & fatigue pengawas kendaraan tambang'],
    ['Laptop', 'Laptop kerja staf & manajemen'],
    ['Komputer / PC', 'PC Desktop & All-in-One'],
    ['Switch / Router', 'Perangkat jaringan switch & router'],
    ['Access Point', 'Perangkat pemancar Wi-Fi'],
    ['Printer / Scanner', 'Perangkat cetak dan scan dokumen'],
    ['CCTV', 'Kamera pengawas keamanan site'],
    ['Power Supply / Adaptor', 'Adaptor daya, inverter, & baterai']
  ];
  for (const [name, desc] of categories) {
    await conn.query(
      'INSERT IGNORE INTO inventory_categories (name, description) VALUES (?, ?)',
      [name, desc]
    );
  }
  console.log('Seeded categories');

  // Seed Brands
  const brands = [
    ['Motorola', 'Perangkat radio & telekomunikasi'],
    ['Hytera', 'Perangkat radio komunikasi digital & analog'],
    ['Hikvision', 'Kamera pengawas, dashcam, dan NVR'],
    ['Dell', 'Laptop, server, dan workstation'],
    ['Lenovo', 'Laptop dan PC desktop'],
    ['Asus', 'Laptop dan motherboard'],
    ['MikroTik', 'Routerboard dan wireless outdoor'],
    ['Cisco', 'Switch jaringan enterprise'],
    ['Ubiquiti', 'UniFi AP dan wireless bridge'],
    ['Epson', 'Printer tinta dan laser']
  ];
  for (const [name, desc] of brands) {
    await conn.query(
      'INSERT IGNORE INTO inventory_brands (name, description) VALUES (?, ?)',
      [name, desc]
    );
  }
  console.log('Seeded brands');

  // Seed Types
  const [brandRows] = await conn.query('SELECT id, name FROM inventory_brands');
  const brandMap = {};
  brandRows.forEach(b => { brandMap[b.name] = b.id; });

  const types = [
    ['DM4600', brandMap['Motorola'], 'Radio Rig Digital DMR'],
    ['XiR M3688', brandMap['Motorola'], 'Radio Rig Voice Analog/Digital'],
    ['MD788', brandMap['Hytera'], 'Radio Rig Digital DMR'],
    ['HM788', brandMap['Hytera'], 'Radio Rig Next Gen DMR'],
    ['AE-DI5042-G4', brandMap['Hikvision'], 'AI Dashcam ADAS & DSM'],
    ['DS-2CD2043G2-I', brandMap['Hikvision'], 'IP Camera Bullet 4MP'],
    ['Latitude 5420', brandMap['Dell'], 'Laptop Core i5 16GB'],
    ['OptiPlex 7090', brandMap['Dell'], 'Desktop PC'],
    ['RB1100AHx4', brandMap['MikroTik'], 'Routerboard 13 Port Gigabit'],
    ['UniFi AC Mesh', brandMap['Ubiquiti'], 'Access Point Outdoor']
  ];
  for (const [name, brandId, desc] of types) {
    await conn.query(
      `INSERT INTO inventory_types (name, brand_id, description)
       SELECT ?, ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM inventory_types WHERE name = ? AND brand_id = ?)`,
      [name, brandId, desc, name, brandId]
    );
  }
  console.log('Seeded types');

  // Seed some sample Items (Barang) if empty
  await conn.query('DELETE FROM inventory_transactions');
  await conn.query('DELETE FROM inventory_items');
  const [itemCount] = await conn.query('SELECT COUNT(*) as cnt FROM inventory_items');
  if (itemCount[0].cnt === 0) {
    const [catRows] = await conn.query('SELECT id, name FROM inventory_categories');
    const catMap = {};
    catRows.forEach(c => { catMap[c.name] = c.id; });

    const [typeRows] = await conn.query('SELECT id, name FROM inventory_types');
    const typeMap = {};
    typeRows.forEach(t => { typeMap[t.name] = t.id; });

    const sampleItems = [
      {
        item_code: 'BRG-202611-001',
        name: 'Radio Rig Motorola DM4600 #01',
        serial_number: 'MOT-DM46-8821',
        category_id: catMap['Radio Rig'],
        brand_id: brandMap['Motorola'],
        type_id: typeMap['DM4600'],
        current_location_id: locMap['Ruang IT'],
        current_pic_id: null,
        condition_status: 'Baik',
        status: 'in_stock',
        entry_date: '2026-11-01',
        last_update_date: '2026-11-01 09:00:00',
        notes: 'Barang baru standby di Ruang IT'
      },
      {
        item_code: 'BRG-202611-002',
        name: 'Radio Rig Motorola DM4600 #02',
        serial_number: 'MOT-DM46-8822',
        category_id: catMap['Radio Rig'],
        brand_id: brandMap['Motorola'],
        type_id: typeMap['DM4600'],
        current_location_id: locMap['EMCC'],
        current_pic_id: (await conn.query("SELECT id FROM inventory_pics WHERE name='Tono'"))[0][0]?.id,
        condition_status: 'Baik',
        status: 'deployed',
        entry_date: '2026-11-02',
        last_update_date: '2026-11-10 14:30:00',
        notes: 'Dipasang untuk operasional pos EMCC diterima Tono'
      },
      {
        item_code: 'BRG-202611-003',
        name: 'AI Dashcam Hikvision AE-DI5042 #01',
        serial_number: 'HIK-CAM-9901',
        category_id: catMap['Dashcam'],
        brand_id: brandMap['Hikvision'],
        type_id: typeMap['AE-DI5042-G4'],
        current_location_id: locMap['PLANT'],
        current_pic_id: (await conn.query("SELECT id FROM inventory_pics WHERE name='Vika'"))[0][0]?.id,
        condition_status: 'Baik',
        status: 'deployed',
        entry_date: '2026-11-05',
        last_update_date: '2026-11-15 11:20:00',
        notes: 'Dipasang di unit loader plant, PIC Vika'
      },
      {
        item_code: 'BRG-202611-004',
        name: 'Laptop Dell Latitude 5420',
        serial_number: 'DELL-LAT-5420-998',
        category_id: catMap['Laptop'],
        brand_id: brandMap['Dell'],
        type_id: typeMap['Latitude 5420'],
        current_location_id: locMap['Ruang IT'],
        current_pic_id: null,
        condition_status: 'Baik',
        status: 'in_stock',
        entry_date: '2026-11-10',
        last_update_date: '2026-11-10 10:00:00',
        notes: 'Laptop cadangan IT standby'
      }
    ];

    for (const item of sampleItems) {
      const [res] = await conn.query(`
        INSERT INTO inventory_items 
        (item_code, name, serial_number, category_id, brand_id, type_id, current_location_id, current_pic_id, condition_status, status, entry_date, last_update_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.item_code,
        item.name,
        item.serial_number,
        item.category_id,
        item.brand_id,
        item.type_id,
        item.current_location_id,
        item.current_pic_id,
        item.condition_status,
        item.status,
        item.entry_date,
        item.last_update_date,
        item.notes
      ]);

      // Clean any partially inserted items
      // Record initial transaction
      await conn.query(`
        INSERT INTO inventory_transactions
        (item_id, transaction_type, transaction_date, to_location_id, to_pic_id, condition_status, notes, operator_name)
        VALUES (?, 'masuk', ?, ?, ?, ?, 'Registrasi barang masuk awal', 'Administrator')
      `, [
        res.insertId,
        item.entry_date,
        item.current_location_id,
        item.current_pic_id,
        item.condition_status
      ]);

      if (item.status === 'deployed') {
        await conn.query(`
          INSERT INTO inventory_transactions
          (item_id, transaction_type, transaction_date, from_location_id, to_location_id, to_pic_id, condition_status, notes, operator_name)
          VALUES (?, 'keluar', ?, ?, ?, ?, ?, 'Pengeluaran barang ke lapangan', 'Administrator')
        `, [
          res.insertId,
          item.last_update_date,
          locMap['Ruang IT'],
          item.current_location_id,
          item.current_pic_id,
          item.condition_status
        ]);
      }
    }
    console.log('Seeded sample items and transactions');
  }

  await conn.end();
  console.log('MIGRATION COMPLETED SUCCESSFULLY!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
