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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      club_miembros: {
        Row: {
          club_id: string
          deportista_id: string
        }
        Insert: {
          club_id: string
          deportista_id: string
        }
        Update: {
          club_id?: string
          deportista_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_miembros_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_miembros_deportista_id_fkey"
            columns: ["deportista_id"]
            isOneToOne: false
            referencedRelation: "deportistas"
            referencedColumns: ["id"]
          },
        ]
      }
      clubes: {
        Row: {
          created_at: string
          deporte_id: string | null
          es_ejemplo: boolean
          id: string
          nombre: string
          periodo_id: string | null
        }
        Insert: {
          created_at?: string
          deporte_id?: string | null
          es_ejemplo?: boolean
          id?: string
          nombre: string
          periodo_id?: string | null
        }
        Update: {
          created_at?: string
          deporte_id?: string | null
          es_ejemplo?: boolean
          id?: string
          nombre?: string
          periodo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubes_deporte_id_fkey"
            columns: ["deporte_id"]
            isOneToOne: false
            referencedRelation: "deportes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubes_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos"
            referencedColumns: ["id"]
          },
        ]
      }
      deportes: {
        Row: {
          created_at: string
          es_ejemplo: boolean
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          es_ejemplo?: boolean
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          es_ejemplo?: boolean
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      deportista_deportes: {
        Row: {
          deporte_id: string
          deportista_id: string
        }
        Insert: {
          deporte_id: string
          deportista_id: string
        }
        Update: {
          deporte_id?: string
          deportista_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deportista_deportes_deporte_id_fkey"
            columns: ["deporte_id"]
            isOneToOne: false
            referencedRelation: "deportes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deportista_deportes_deportista_id_fkey"
            columns: ["deportista_id"]
            isOneToOne: false
            referencedRelation: "deportistas"
            referencedColumns: ["id"]
          },
        ]
      }
      deportistas: {
        Row: {
          apellidos: string
          carrera: string | null
          cedula: string
          created_at: string
          es_ejemplo: boolean
          facultad: string | null
          fecha_nacimiento: string | null
          genero: string | null
          id: string
          nombres: string
          region: string | null
        }
        Insert: {
          apellidos: string
          carrera?: string | null
          cedula: string
          created_at?: string
          es_ejemplo?: boolean
          facultad?: string | null
          fecha_nacimiento?: string | null
          genero?: string | null
          id?: string
          nombres: string
          region?: string | null
        }
        Update: {
          apellidos?: string
          carrera?: string | null
          cedula?: string
          created_at?: string
          es_ejemplo?: boolean
          facultad?: string | null
          fecha_nacimiento?: string | null
          genero?: string | null
          id?: string
          nombres?: string
          region?: string | null
        }
        Relationships: []
      }
      escenarios: {
        Row: {
          capacidad: number | null
          created_at: string
          detalles: Json
          es_ejemplo: boolean
          id: string
          nombre: string
          observaciones: string | null
          tipo: string | null
          ubicacion: string | null
        }
        Insert: {
          capacidad?: number | null
          created_at?: string
          detalles?: Json
          es_ejemplo?: boolean
          id?: string
          nombre: string
          observaciones?: string | null
          tipo?: string | null
          ubicacion?: string | null
        }
        Update: {
          capacidad?: number | null
          created_at?: string
          detalles?: Json
          es_ejemplo?: boolean
          id?: string
          nombre?: string
          observaciones?: string | null
          tipo?: string | null
          ubicacion?: string | null
        }
        Relationships: []
      }
      periodos: {
        Row: {
          activo: boolean
          created_at: string
          es_ejemplo: boolean
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          es_ejemplo?: boolean
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          es_ejemplo?: boolean
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      seleccion_miembros: {
        Row: {
          deportista_id: string
          seleccion_id: string
        }
        Insert: {
          deportista_id: string
          seleccion_id: string
        }
        Update: {
          deportista_id?: string
          seleccion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seleccion_miembros_deportista_id_fkey"
            columns: ["deportista_id"]
            isOneToOne: false
            referencedRelation: "deportistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seleccion_miembros_seleccion_id_fkey"
            columns: ["seleccion_id"]
            isOneToOne: false
            referencedRelation: "selecciones"
            referencedColumns: ["id"]
          },
        ]
      }
      selecciones: {
        Row: {
          created_at: string
          deporte_id: string | null
          es_ejemplo: boolean
          id: string
          nombre: string
          periodo_id: string | null
        }
        Insert: {
          created_at?: string
          deporte_id?: string | null
          es_ejemplo?: boolean
          id?: string
          nombre: string
          periodo_id?: string | null
        }
        Update: {
          created_at?: string
          deporte_id?: string | null
          es_ejemplo?: boolean
          id?: string
          nombre?: string
          periodo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "selecciones_deporte_id_fkey"
            columns: ["deporte_id"]
            isOneToOne: false
            referencedRelation: "deportes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selecciones_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      claim_admin: { Args: never; Returns: boolean }
      definir_coordinador: {
        Args: { _es_coordinador: boolean; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      listar_cuentas: {
        Args: never
        Returns: {
          correo: string
          es_coordinador: boolean
          registrada_en: string
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin"],
    },
  },
} as const
