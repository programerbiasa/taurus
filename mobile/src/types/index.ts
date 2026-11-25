export interface User {
  id: number;
  username: string;
  name?: string;
  created_at?: string;
}

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
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
  problem_detail: string;
  action_taken: string;
  status: JobStatus;
  work_date: string; // YYYY-MM-DD
  work_day: string; // Senin, Selasa, dll
  start_time: string; // HH:MM:SS
  end_time?: string | null; // HH:MM:SS
  created_at: string;
  updated_at: string;
}

export interface OfflineJob {
  local_id?: number;
  ticket_id?: number | null;
  problem_category: string;
  problem_detail: string;
  action_taken: string;
  status: JobStatus;
  work_date: string;
  work_day?: string;
  start_time: string;
  end_time?: string | null;
  synced: number; // 0 = not synced, 1 = synced
  created_at?: string;
}

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  TicketList: undefined;
  TicketCreate: undefined;
  TicketDetail: { id: number };
  JobList: { filterStatus?: 'Pending' | 'Completed' | 'All' };
  PendingJobs: undefined;
  JobCreate: { ticket_id?: number; category?: string; detail?: string };
  JobDetail: { id: number };
};
