import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AppDataSource, connectDatabase } from './config/database';
import { User } from './models/User';

const seed = async () => {
  try {
    console.log('🌱 Menjalankan seeder database TAURUS...');
    await connectDatabase();

    const userRepo = AppDataSource.getRepository(User);
    const existingAdmin = await userRepo.findOne({ where: { username: 'admin' } });

    if (existingAdmin) {
      console.log('ℹ️ User default "admin" sudah ada di database.');
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      const adminUser = userRepo.create({
        username: 'admin',
        password_hash: hashedPassword,
        name: 'Administrator IT Support',
      });

      await userRepo.save(adminUser);
      console.log('✅ User default "admin" (password: "admin123") berhasil dibuat.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat seeding:', error);
    process.exit(1);
  }
};

seed();
