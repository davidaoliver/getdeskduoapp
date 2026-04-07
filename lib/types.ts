import { Timestamp } from "firebase/firestore";

export type UserRole = "client" | "admin" | "super_admin";
export type AppointmentStatus = "booked" | "completed" | "cancelled" | "no_show";
export type AppointmentSource = "app" | "web" | "ai" | "walk_in";

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
  service_id: string;
  start_time: Timestamp;
  end_time: Timestamp;
  status: AppointmentStatus;
  source: AppointmentSource;
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
