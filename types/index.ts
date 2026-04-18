export interface UserProfile {
  age: string;
  gender: string;
  goal: string[];
  energy: string;
  thinking: string;
  values_other: string[];
  values_self: string[];
  film: string;
  activities: string[];
  evening: string;
  group_type: string;
  after_dinner: string[];
  humor: number;
  academic: number;
  industry: string;
  relationship: string;
  kids: string;
}

export interface Meeting {
  id: string;
  format: 2 | 4 | 6;
  place_name: string;
  place_id: string;
  datetime: string;
  pay_scheme: "split" | "each";
  deposit_amount: number;
  status: "open" | "full" | "completed" | "cancelled";
  creator_id: string;
  created_at: string;
}

export interface Participant {
  id: string;
  meeting_id: string;
  user_id: string;
  role: "creator" | "guest";
  deposit_status: "pending" | "paid" | "refunded";
  arrived: boolean;
}
