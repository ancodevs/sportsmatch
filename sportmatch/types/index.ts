export interface Country {
  id: number;
  name: string;
  code: string;
  created_at?: string;
}

export interface Region {
  id: number;
  name: string;
  country_id: number;
  created_at?: string;
}

export interface City {
  id: number;
  name: string;
  region_id: number;
  created_at?: string;
}

export interface PlayerStats {
  id: string;
  player_id: string;
  total_matches: number;
  wins: number;
  losses: number;
  draws: number;
  mvp_count: number;
  gk_count: number;  // Goalkeeper (Portero)
  df_count: number;  // Defender (Defensa)
  mf_count: number;  // Midfielder (Mediocampista)
  fw_count: number;  // Forward (Delantero)
  current_level: number;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  telefono?: string;
  gender?: 'masculino' | 'femenino' | 'otro' | null;
  birth_date?: string;
  country_id?: number;
  region_id?: number;
  city_id?: number;
  premiumstatus?: boolean;
  premiumfinalizedat?: string;
  extra_matches_balance?: number;
  team_creation_tokens?: number;
  created_at?: string;
  updated_at?: string;
  // Relación con estadísticas
  stats?: PlayerStats;
}

export interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  image?: any;
  field?: keyof User;
  type?: 'text' | 'date' | 'textarea' | 'image' | 'select';
}
