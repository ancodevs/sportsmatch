export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          email: string | null
          avatar_url: string | null
          bio: string | null
          telefono: string | null
          gender: string | null
          birth_date: string | null
          country_id: number | null
          region_id: number | null
          city_id: number | null
          premiumstatus: boolean
          premiumfinalizedat: string | null
          extra_matches_balance: number
          team_creation_tokens: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          avatar_url?: string | null
          bio?: string | null
          telefono?: string | null
          gender?: string | null
          birth_date?: string | null
          country_id?: number | null
          region_id?: number | null
          city_id?: number | null
          premiumstatus?: boolean
          premiumfinalizedat?: string | null
          extra_matches_balance?: number
          team_creation_tokens?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          avatar_url?: string | null
          bio?: string | null
          telefono?: string | null
          gender?: string | null
          birth_date?: string | null
          country_id?: number | null
          region_id?: number | null
          city_id?: number | null
          premiumstatus?: boolean
          premiumfinalizedat?: string | null
          extra_matches_balance?: number
          team_creation_tokens?: number
          created_at?: string
          updated_at?: string
        }
      }
      courts: {
        Row: {
          id: string
          name: string
          description: string | null
          sport_type: string | null
          surface_type: string | null
          has_lighting: boolean
          has_parking: boolean
          has_changing_rooms: boolean
          price_per_hour: number
          currency: string
          capacity: number | null
          admin_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sport_type?: string | null
          surface_type?: string | null
          has_lighting?: boolean
          has_parking?: boolean
          has_changing_rooms?: boolean
          price_per_hour: number
          currency?: string
          capacity?: number | null
          admin_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sport_type?: string | null
          surface_type?: string | null
          has_lighting?: boolean
          has_parking?: boolean
          has_changing_rooms?: boolean
          price_per_hour?: number
          currency?: string
          capacity?: number | null
          admin_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          court_id: string
          player_id: string
          booking_date: string
          start_time: string
          end_time: string
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          total_price: number
          currency: string
          payment_status: 'pending' | 'paid' | 'refunded'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          court_id: string
          player_id: string
          booking_date: string
          start_time: string
          end_time: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          total_price: number
          currency?: string
          payment_status?: 'pending' | 'paid' | 'refunded'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          court_id?: string
          player_id?: string
          booking_date?: string
          start_time?: string
          end_time?: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          total_price?: number
          currency?: string
          payment_status?: 'pending' | 'paid' | 'refunded'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      admin_users: {
        Row: {
          id: string
          user_id: string
          business_name: string | null
          phone: string | null
          address: string | null
          country_id: number | null
          region_id: number | null
          city_id: number | null
          latitude: number | null
          longitude: number | null
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name?: string | null
          phone?: string | null
          address?: string | null
          country_id?: number | null
          region_id?: number | null
          city_id?: number | null
          latitude?: number | null
          longitude?: number | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string | null
          phone?: string | null
          address?: string | null
          country_id?: number | null
          region_id?: number | null
          city_id?: number | null
          latitude?: number | null
          longitude?: number | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      cities: {
        Row: {
          id: number
          name: string
          region_id: number
          created_at: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_region_id_fkey"
            columns: ["region_id"]
            referencedRelation: "regions"
            referencedColumns: ["id"]
          }
        ]
      }
      regions: {
        Row: {
          id: number
          name: string
          country_id: number
          created_at: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_country_id_fkey"
            columns: ["country_id"]
            referencedRelation: "countries"
            referencedColumns: ["id"]
          }
        ]
      }
      countries: {
        Row: {
          id: number
          name: string
          code: string
          created_at: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
