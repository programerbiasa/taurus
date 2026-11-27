export type UserStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'admin' | 'it_support' | 'client';

export interface User {
  id: number;
  username: string;
  name?: string;
  status?: UserStatus;
  role?: UserRole;
  created_at?: string;
}

export interface AppSettings {
  app_name: string;
  app_tagline: string;
  app_logo_url: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

export interface Priority {
  id: number;
  name: string;
  level: number;
  color: string;
  description?: string;
  created_at?: string;
}

export interface VehicleUnit {
  id: number;
  unit_number: string;
  vehicle_brand?: string;
  unit_type?: string;
  radio_brand?: string;
  radio_type?: string;
  antenna_type?: string;
  antenna_base?: string;
  description?: string;
  created_at?: string;
}

export type TicketPriority = string;
export type TicketStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';

export interface TicketComment {
  id: number;
  ticket_id: number;
  author_id: number;
  author: User;
  comment: string;
  created_at: string;
}

export interface Ticket {
  id: number;
  subject: string;
  category: string;
  unit_number?: string | null;
  detail: string;
  priority: TicketPriority;
  attachment?: string | null;
  sla?: string | null;
  status: TicketStatus;
  reporter_id: number;
  reporter: User;
  assignee_id?: number | null;
  assignee?: User | null;
  comments?: TicketComment[];
  created_at: string;
  updated_at: string;
}

export type JobStatus = 'Pending' | 'Completed';

export interface Job {
  id: number;
  user_id: number;
  user: User;
  ticket_id?: number | null;
  ticket?: Ticket | null;
  problem_category: string;
  unit_number?: string | null;
  problem_detail: string;
  problem_finding?: string;
  action_taken: string;
  attachment?: string | null;
  status: JobStatus;
  work_date: string; // YYYY-MM-DD
  work_day: string; // Senin, Selasa, ...
  start_time: string; // HH:MM:SS
  end_time?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPayload {
  title: string;
  message: string;
  type?: 'ticket' | 'job' | 'system';
  id?: number;
}

export interface ChatMessage {
  id: number;
  user_id: number;
  target_user_id?: number | null;
  is_broadcast: boolean;
  sender_name: string;
  sender_role: UserRole;
  message: string;
  created_at: string;
}

export interface ChatConversationMember {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  status?: string;
  last_message: string;
  last_time?: string | null;
}

export interface TicketStatusNotification {
  ticketId: number;
  subject: string;
  oldStatus?: string;
  newStatus: string;
  reporterId: number;
  assigneeName?: string;
  message: string;
}

export type DeviceStatus = 'Terpasang' | 'Standby' | 'Rusak' | 'Perbaikan';

export interface Radio {
  id: number;
  serial_number: string;
  brand: string;
  model_type?: string;
  status: DeviceStatus;
  current_unit_id?: number | null;
  current_unit_number?: string | null;
  notes?: string;
  photo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RadioMovement {
  id: number;
  radio_id: number;
  serial_number: string;
  from_unit_id?: number | null;
  from_unit_number?: string | null;
  to_unit_id?: number | null;
  to_unit_number?: string | null;
  action_type: 'PASANG' | 'PINDAH' | 'LEPAS';
  moved_at: string;
  performed_by: string;
  notes?: string;
  created_at?: string;
}

export interface DashcamBrand {
  id: number;
  name: string;
  vendor_name?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InternetProvider {
  id: number;
  name: string;
  type?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Dashcam {
  id: number;
  serial_number: string;
  brand: string;
  model_type?: string;
  status: DeviceStatus;
  current_unit_id?: number | null;
  current_unit_number?: string | null;
  sd_card_capacity?: string | null;
  internet_provider?: string;
  sim_card_number?: string | null;
  electrical_condition?: string;
  gps_condition?: string;
  camera_status?: string;
  has_front_camera?: boolean;
  has_cabin_camera?: boolean;
  has_fatigue_camera?: boolean;
  notes?: string;
  photo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DashcamMovement {
  id: number;
  dashcam_id: number;
  serial_number: string;
  from_unit_id?: number | null;
  from_unit_number?: string | null;
  to_unit_id?: number | null;
  to_unit_number?: string | null;
  action_type: 'PASANG' | 'PINDAH' | 'LEPAS';
  moved_at: string;
  performed_by: string;
  notes?: string;
  created_at?: string;
}

export interface Problem {
  id: number;
  name: string;
  category?: string | null;
  category_id?: number | null;
  description?: string | null;
  is_active: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UnitInspection {
  id: number;
  inspection_date: string; // YYYY-MM-DD
  site_location: string;
  inspection_type: string;
  unit_id?: number | null;
  unit_number: string;
  old_unit_number?: string | null;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;

  // 1. Radio Rig
  radio_status: string; // 'Ada/layak' | 'Tidak ada' | 'Rusak'
  radio_kelistrikan: string; // 'Ada' | 'Tidak ada' | 'Layak'
  radio_antena: string;
  radio_kabel: string;
  radio_chanel: string;
  radio_notes?: string | null;
  radio_photo_url?: string | null;

  // 2. Camera (2.1 - 2.8)
  camera_kelistrikan: string;
  camera_posisi: string;
  camera_internet: string;
  camera_gps: string;
  camera_dascam?: string;
  camera_kabin?: string;
  camera_fatigue?: string;
  camera_memcard?: string;
  camera_penyimpanan: string;
  camera_status?: string;
  camera_notes?: string | null;
  camera_photo_url?: string | null;
  camera_cabin_status: string;
  camera_cabin_notes?: string | null;
  camera_fatigue_status: string;
  camera_fatigue_notes?: string | null;

  // Status & Bukti
  inspection_status: 'Open' | 'Close';
  photo_url?: string | null;
  general_notes?: string | null;

  // Penanggung Jawab
  inspector_id?: number | null;
  inspector_name: string;
  inspector_role: string;
  inspector2_name?: string | null;
  inspector2_role: string;

  created_at?: string;
  updated_at?: string;
}

// ==========================================
// INVENTARIS BARANG (KELUAR MASUK BARANG)
// ==========================================

export interface InventoryLocation {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryPic {
  id: number;
  name: string;
  location_id?: number | null;
  location?: InventoryLocation | null;
  phone?: string | null;
  department?: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface InventoryCategory {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryBrand {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryType {
  id: number;
  name: string;
  brand_id?: number | null;
  brand?: InventoryBrand | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ItemCondition = 'Baik' | 'Rusak' | 'Hilang' | 'Scrap';
export type ItemStatus = 'in_stock' | 'deployed' | 'maintenance' | 'scrap';

export interface InventoryItem {
  id: number;
  item_code: string; // IDBarang
  name: string; // Nama Barang
  serial_number?: string | null;
  category_id?: number | null;
  category?: InventoryCategory | null;
  brand_id?: number | null;
  brand?: InventoryBrand | null;
  type_id?: number | null;
  type?: InventoryType | null;
  current_location_id?: number | null;
  current_location?: InventoryLocation | null;
  current_pic_id?: number | null;
  current_pic?: InventoryPic | null;
  condition_status: ItemCondition;
  status: ItemStatus;
  entry_date: string; // YYYY-MM-DD
  last_update_date?: string | null; // TanggalUpdate
  notes?: string | null;
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'masuk' | 'keluar' | 'mutasi' | 'kembali';

export interface InventoryTransaction {
  id: number;
  item_id: number;
  item?: InventoryItem;
  transaction_type: TransactionType;
  transaction_date: string;
  from_location_id?: number | null;
  from_location?: InventoryLocation | null;
  to_location_id?: number | null;
  to_location?: InventoryLocation | null;
  from_pic_id?: number | null;
  from_pic?: InventoryPic | null;
  to_pic_id?: number | null;
  to_pic?: InventoryPic | null;
  condition_status: ItemCondition;
  recipient_name?: string | null;
  doc_number?: string | null;
  notes?: string | null;
  operator_id?: number | null;
  operator_name?: string | null;
  created_at: string;
}



