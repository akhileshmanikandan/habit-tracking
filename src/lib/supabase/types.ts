export type HabitCategory = "running" | "gym" | "general";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
}

export interface Habit {
  id: string;
  creator_id: string;
  group_id: string;
  title: string;
  category: HabitCategory;
  is_private: boolean;
  goal_value: number | null;
  unit: string | null;
  created_at: string;
}

export interface Log {
  id: string;
  habit_id: string;
  user_id: string;
  value: number | null;
  duration_minutes: number | null;
  pace: string | null;
  notes: string | null;
  is_rest_day: boolean;
  created_at: string;
}

export interface Streak {
  user_id: string;
  habit_id: string;
  current_streak: number;
  longest_streak: number;
  last_log_date: string;
  shields: number;
}

export interface Reaction {
  id: string;
  from_user_id: string;
  to_user_id: string;
  log_id: string | null;
  type: "water" | "fire" | "flex" | "rage";
  created_at: string;
}

export interface MarathonGoal {
  id: string;
  group_id: string;
  title: string;
  target_km: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}
