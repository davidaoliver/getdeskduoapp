import { Timestamp } from "firebase/firestore";

export type UserRole = "client" | "admin" | "super_admin";
export type AppointmentStatus = "booked" | "completed" | "cancelled" | "no_show";
export type AppointmentSource = "app" | "web" | "ai" | "walk_in";

export interface DayHours {
  open: string; // "09:00"
  close: string; // "17:00"
  closed: boolean;
}

export interface Shop {
  shop_id: string;
  owner_id: string;
  name: string;
  address: string;
  phone: string;
  forwarding_number?: string;
  ai_enabled: boolean;
  ai_settings?: Record<string, any>;
  timezone: string;
  operating_hours: { [day: number]: DayHours }; // 0 = Sunday, 6 = Saturday
  cancellation_cutoff_hours: number; // default 2
  created_at: Timestamp;
}

export interface AppUser {
  uid: string;
  email: string;
  phone?: string;
  display_name: string;
  role: UserRole;
  shop_id?: string;
  push_token?: string;
  no_show_count: number;
  created_at: Timestamp;
}

export interface Service {
  service_id: string;
  shop_id: string;
  name: string;
  duration_minutes: number;
  buffer_minutes: number;
  price: number;
  active: boolean;
}

export interface Barber {
  barber_id: string;
  shop_id: string;
  user_id: string;
  display_name: string;
  bio?: string;
  services_offered: string[];
  active: boolean;
}

export interface Availability {
  availability_id: string;
  barber_id: string;
  shop_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string; // "09:00" in shop local time
  end_time: string; // "17:00" in shop local time
}

export interface Appointment {
  apt_id: string;
  shop_id: string;
  barber_id: string;
  client_id: string;
  service_ids: string[];
  start_time: Timestamp;
  end_time: Timestamp;
  status: AppointmentStatus;
  source: AppointmentSource;
  client_name?: string; // for walk-ins without accounts
  client_phone?: string; // for walk-ins without accounts
  cancelled_at?: Timestamp;
  cancelled_by?: string; // uid of who cancelled
  rescheduled_from?: string; // apt_id of original appointment
  created_at: Timestamp;
}

export interface TimeOffBlock {
  block_id: string;
  barber_id: string;
  shop_id: string;
  start_time: Timestamp;
  end_time: Timestamp;
  reason?: string;
  all_day: boolean;
}

export interface PendingStaff {
  email: string;
  shop_id: string;
  role: UserRole;
  invited_by: string;
  created_at: Timestamp;
}
