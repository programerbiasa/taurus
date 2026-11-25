import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Ticket } from '../models/Ticket';
import { TicketComment } from '../models/TicketComment';
import { Job } from '../models/Job';
import { Category } from '../models/Category';
import { Priority } from '../models/Priority';
import { VehicleUnit } from '../models/VehicleUnit';
import { AppSetting } from '../models/AppSetting';
import { ChatMessage } from '../models/ChatMessage';
import { Radio } from '../models/Radio';
import { RadioMovement } from '../models/RadioMovement';
import { Dashcam } from '../models/Dashcam';
import { DashcamMovement } from '../models/DashcamMovement';
import { DashcamBrand } from '../models/DashcamBrand';
import { InternetProvider } from '../models/InternetProvider';
import { Problem } from '../models/Problem';
import { UnitInspection } from '../models/UnitInspection';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mariadb',
  host: process.env.DB_HOST || '172.16.5.254',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'taurus',
  synchronize: false,
  logging: false,
  entities: [
    User,
    Ticket,
    TicketComment,
    Job,
    Category,
    Priority,
    VehicleUnit,
    AppSetting,
    ChatMessage,
    Radio,
    RadioMovement,
    Dashcam,
    DashcamMovement,
    DashcamBrand,
    InternetProvider,
    Problem,
    UnitInspection,
  ],
});

export const connectDatabase = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('📦 Database MariaDB terhubung dengan sukses ke host:', process.env.DB_HOST);
    }
  } catch (error) {
    console.error('❌ Gagal terhubung ke Database MariaDB:', error);
  }
};
