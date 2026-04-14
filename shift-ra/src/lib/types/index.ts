export type UserRole = "admin" | "ra";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  residence_hall_id: number | null;
  active: boolean;
  created_at?: string;
};

export type ResidenceHall = {
  id: number;
  name: string;
  capacity: number;
  weekday_staff_needed: number;
  weekend_staff_needed: number;
  created_at?: string;
};

export type AvailabilityRow = {
  id: number;
  ra_id: string;
  day_of_week: number; // 1=Mon ... 7=Sun
  is_available: boolean;
  created_at?: string;
};

export type ScheduleRecord = {
  id: number;
  residence_hall_id: number;
  start_date: string;
  end_date: string;
  created_by: string | null;
  created_at?: string;
};

export type ScheduleShiftRole = "Primary" | "Secondary";

export type ScheduleShift = {
  id?: number;
  schedule_id?: number;
  residence_hall_id: number;
  assignment_date: string;
  day_of_week: number;
  role: ScheduleShiftRole;
  assigned_ra_id: string | null;
  created_at?: string;
};

export type SwapStatus = "pending" | "approved" | "rejected" | "failed";

export type SwapRequest = {
  id: number;
  requester_ra_id: string;
  target_ra_id: string;
  requester_assignment_id: number;
  target_assignment_id: number;
  residence_hall_id: number;
  status: SwapStatus;
  created_at: string;
  responded_at: string | null;
};