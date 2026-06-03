export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          revoked: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          revoked?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          revoked?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          script_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          script_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          script_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          script_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          script_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          script_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          free_script: boolean
          free_source: boolean
          new_store: boolean
          paid_script: boolean
          paid_source: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          free_script?: boolean
          free_source?: boolean
          new_store?: boolean
          paid_script?: boolean
          paid_source?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          free_script?: boolean
          free_source?: boolean
          new_store?: boolean
          paid_script?: boolean
          paid_source?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read: boolean
          recipient_id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read?: boolean
          recipient_id: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read?: boolean
          recipient_id?: string
          title?: string
        }
        Relationships: []
      }
      premium_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          revoked: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          revoked?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          revoked?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      product_buyers: {
        Row: {
          approved_at: string
          approved_by: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_buyers_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_buyers_user_profiles_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string
          id: string
          product_id: string
          rating: number
          text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          rating: number
          text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_user_profiles_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          is_premium: boolean
          premium_since: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id: string
          is_premium?: boolean
          premium_since?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_premium?: boolean
          premium_since?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          rating: number
          script_id: string
          text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          script_id: string
          text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          script_id?: string
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_script_id_scripts_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          badges: string[] | null
          cover_screenshot: string | null
          created_at: string
          description: string | null
          developer: string | null
          discord_url: string | null
          features: string[] | null
          id: string
          is_premium: boolean
          ltc_address: string | null
          name: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          paypal_url: string | null
          screenshots: string[] | null
          sellauth_url: string | null
          slug: string
          source_code: string | null
          status: Database["public"]["Enums"]["script_status"]
          tags: string[] | null
          updated_at: string
          verified_by_nalyy: boolean
          views: number
          youtube_url: string | null
        }
        Insert: {
          badges?: string[] | null
          cover_screenshot?: string | null
          created_at?: string
          description?: string | null
          developer?: string | null
          discord_url?: string | null
          features?: string[] | null
          id?: string
          is_premium?: boolean
          ltc_address?: string | null
          name: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          paypal_url?: string | null
          screenshots?: string[] | null
          sellauth_url?: string | null
          slug: string
          source_code?: string | null
          status?: Database["public"]["Enums"]["script_status"]
          tags?: string[] | null
          updated_at?: string
          verified_by_nalyy?: boolean
          views?: number
          youtube_url?: string | null
        }
        Update: {
          badges?: string[] | null
          cover_screenshot?: string | null
          created_at?: string
          description?: string | null
          developer?: string | null
          discord_url?: string | null
          features?: string[] | null
          id?: string
          is_premium?: boolean
          ltc_address?: string | null
          name?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          paypal_url?: string | null
          screenshots?: string[] | null
          sellauth_url?: string | null
          slug?: string
          source_code?: string | null
          status?: Database["public"]["Enums"]["script_status"]
          tags?: string[] | null
          updated_at?: string
          verified_by_nalyy?: boolean
          views?: number
          youtube_url?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          default_ltc_address: string | null
          discord_url: string | null
          id: number
          premium_ltc_address: string | null
          premium_paypal_url: string | null
          premium_price: number
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          default_ltc_address?: string | null
          discord_url?: string | null
          id?: number
          premium_ltc_address?: string | null
          premium_paypal_url?: string | null
          premium_price?: number
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          default_ltc_address?: string | null
          discord_url?: string | null
          id?: number
          premium_ltc_address?: string | null
          premium_paypal_url?: string | null
          premium_price?: number
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      sources: {
        Row: {
          access_method: Database["public"]["Enums"]["access_method"]
          cover_screenshot: string | null
          created_at: string
          description: string | null
          discord_redirect_url: string | null
          discord_url: string | null
          id: string
          ltc_address: string | null
          name: string
          paypal_url: string | null
          screenshots: string[] | null
          sellauth_url: string | null
          slug: string
          source_code: string | null
          status: Database["public"]["Enums"]["source_status"]
          tags: string[] | null
          updated_at: string
          views: number
        }
        Insert: {
          access_method?: Database["public"]["Enums"]["access_method"]
          cover_screenshot?: string | null
          created_at?: string
          description?: string | null
          discord_redirect_url?: string | null
          discord_url?: string | null
          id?: string
          ltc_address?: string | null
          name: string
          paypal_url?: string | null
          screenshots?: string[] | null
          sellauth_url?: string | null
          slug: string
          source_code?: string | null
          status?: Database["public"]["Enums"]["source_status"]
          tags?: string[] | null
          updated_at?: string
          views?: number
        }
        Update: {
          access_method?: Database["public"]["Enums"]["access_method"]
          cover_screenshot?: string | null
          created_at?: string
          description?: string | null
          discord_redirect_url?: string | null
          discord_url?: string | null
          id?: string
          ltc_address?: string | null
          name?: string
          paypal_url?: string | null
          screenshots?: string[] | null
          sellauth_url?: string | null
          slug?: string
          source_code?: string | null
          status?: Database["public"]["Enums"]["source_status"]
          tags?: string[] | null
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      store_products: {
        Row: {
          access_method: string | null
          cover_screenshot: string | null
          created_at: string
          description: string | null
          discord_redirect_url: string | null
          discord_url: string | null
          features: string[] | null
          id: string
          image: string | null
          kind: string
          ltc_address: string | null
          name: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          paypal_url: string | null
          price: number
          screenshots: string[]
          sellauth_url: string | null
          slug: string
          source_code: string | null
          status: string | null
          store_id: string | null
          tags: string[] | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          access_method?: string | null
          cover_screenshot?: string | null
          created_at?: string
          description?: string | null
          discord_redirect_url?: string | null
          discord_url?: string | null
          features?: string[] | null
          id?: string
          image?: string | null
          kind?: string
          ltc_address?: string | null
          name: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          paypal_url?: string | null
          price?: number
          screenshots?: string[]
          sellauth_url?: string | null
          slug: string
          source_code?: string | null
          status?: string | null
          store_id?: string | null
          tags?: string[] | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          access_method?: string | null
          cover_screenshot?: string | null
          created_at?: string
          description?: string | null
          discord_redirect_url?: string | null
          discord_url?: string | null
          features?: string[] | null
          id?: string
          image?: string | null
          kind?: string
          ltc_address?: string | null
          name?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          paypal_url?: string | null
          price?: number
          screenshots?: string[]
          sellauth_url?: string | null
          slug?: string
          source_code?: string | null
          status?: string | null
          store_id?: string | null
          tags?: string[] | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_requests: {
        Row: {
          created_at: string
          id: string
          products: Json
          reviewed_at: string | null
          status: string
          store_logo: string | null
          store_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          products?: Json
          reviewed_at?: string | null
          status?: string
          store_logo?: string | null
          store_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          products?: Json
          reviewed_at?: string | null
          status?: string
          store_logo?: string | null
          store_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_requests_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          id: string
          logo: string | null
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo?: string | null
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo?: string | null
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_script_likes_count: { Args: { _script_id: string }; Returns: number }
      get_total_likes_count: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      access_method:
        | "free"
        | "sellauth"
        | "paypal"
        | "ltc"
        | "discord"
        | "premium"
      app_role: "admin" | "moderator" | "user"
      payment_method: "sellauth" | "paypal" | "ltc" | "premium"
      script_status: "working" | "patched" | "updating"
      source_status: "ready" | "needs_modification"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_method: [
        "free",
        "sellauth",
        "paypal",
        "ltc",
        "discord",
        "premium",
      ],
      app_role: ["admin", "moderator", "user"],
      payment_method: ["sellauth", "paypal", "ltc", "premium"],
      script_status: ["working", "patched", "updating"],
      source_status: ["ready", "needs_modification"],
    },
  },
} as const
