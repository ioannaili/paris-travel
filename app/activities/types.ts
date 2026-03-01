export type VoteValue = "yes" | "maybe" | "no";

export interface Activity {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  area: string | null;
  type: string | null;
  duration: number | null;
  price: string | null;
  booking_required: boolean;
  booking_link: string | null;
  google_maps_link: string | null;
  source_type: string | null;
  notes?: string | null;
  popularity: number;
  voting_phase: boolean;
}

export interface VoteRow {
  activity_id: string;
  user_id: string;
  vote: VoteValue;
  user_name: string;
}

export interface AddActivityForm {
  name: string;
  description: string;
  area: string;
  type: string;
  google_maps_link: string;
}
