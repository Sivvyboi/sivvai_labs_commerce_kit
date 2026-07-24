/**
 * types/database.types.ts
 *
 * Automatically/hand-modeled Supabase database types matching migrations 001-016.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      brand_profile: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          contact_email: string;
          contact_phone: string | null;
          seo_title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["brand_profile"]["Row"], "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["brand_profile"]["Row"]>;
      };
      store_settings: {
        Row: {
          id: string;
          currency: string;
          tax_mode: string;
          active_payment_provider: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["store_settings"]["Row"], "created_at" | "updated_at"> & {
          id?: string;
          currency?: string;
          tax_mode?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["store_settings"]["Row"]>;
      };
      feature_flags: {
        Row: {
          id: string;
          key: string;
          enabled: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["feature_flags"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          enabled?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feature_flags"]["Row"]>;
      };
      categories: {
        Row: {
          id: string;
          parent_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["categories"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          parent_id?: string | null;
          description?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
      };
      products: {
        Row: {
          id: string;
          category_id: string | null;
          slug: string;
          name: string;
          description: string | null;
          status: string;
          visibility: string;
          published_at: string | null;
          base_price: number;
          sale_price: number | null;
          compare_at_price: number | null;
          cost_price: number | null;
          is_featured: boolean;
          seo_title: string | null;
          seo_description: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          category_id?: string | null;
          description?: string | null;
          status?: string;
          visibility?: string;
          published_at?: string | null;
          sale_price?: number | null;
          compare_at_price?: number | null;
          cost_price?: number | null;
          is_featured?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          alt_text: string | null;
          display_order: number;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["product_images"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          alt_text?: string | null;
          display_order?: number;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_images"]["Row"]>;
      };
      option_groups: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          display_order: number;
        };
        Insert: Omit<Database["public"]["Tables"]["option_groups"]["Row"], "id"> & {
          id?: string;
          display_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["option_groups"]["Row"]>;
      };
      option_values: {
        Row: {
          id: string;
          option_group_id: string;
          label: string;
          display_order: number;
          swatch_type: string | null;
          swatch_value: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["option_values"]["Row"], "id"> & {
          id?: string;
          display_order?: number;
          swatch_type?: string | null;
          swatch_value?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["option_values"]["Row"]>;
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          image_id: string | null;
          sku: string | null;
          option_combination: Json;
          price_override: number | null;
          is_default: boolean;
          status: string;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["product_variants"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          image_id?: string | null;
          sku?: string | null;
          option_combination?: Json;
          price_override?: number | null;
          is_default?: boolean;
          status?: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_variants"]["Row"]>;
      };
      collections: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["collections"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["collections"]["Row"]>;
      };
      tags: {
        Row: {
          id: string;
          slug: string;
          name: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tags"]["Row"], "id"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Row"]>;
      };
      product_tags: {
        Row: {
          product_id: string;
          tag_id: string;
        };
        Insert: Database["public"]["Tables"]["product_tags"]["Row"];
        Update: Partial<Database["public"]["Tables"]["product_tags"]["Row"]>;
      };
      collection_products: {
        Row: {
          collection_id: string;
          product_id: string;
          display_order: number;
        };
        Insert: Omit<Database["public"]["Tables"]["collection_products"]["Row"], "display_order"> & {
          display_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["collection_products"]["Row"]>;
      };
      inventory_records: {
        Row: {
          id: string;
          variant_id: string;
          on_hand_quantity: number;
          reserved_quantity: number;
          incoming_quantity: number;
          low_stock_threshold: number;
          track_inventory: boolean;
          allow_backorders: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["inventory_records"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          on_hand_quantity?: number;
          reserved_quantity?: number;
          incoming_quantity?: number;
          low_stock_threshold?: number;
          track_inventory?: boolean;
          allow_backorders?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["inventory_records"]["Row"]>;
      };
      stock_movements: {
        Row: {
          id: string;
          inventory_record_id: string;
          movement_type: string;
          quantity_delta: number;
          reason: string | null;
          reference_id: string | null;
          performed_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["stock_movements"]["Row"], "id" | "created_at"> & {
          id?: string;
          reason?: string | null;
          reference_id?: string | null;
          performed_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stock_movements"]["Row"]>;
      };
      inventory_reservations: {
        Row: {
          id: string;
          inventory_record_id: string;
          variant_id: string;
          checkout_session_id: string | null;
          quantity: number;
          status: Database["public"]["Enums"]["reservation_status"];
          expires_at: string;
          created_at: string;
          released_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["inventory_reservations"]["Row"], "id" | "created_at"> & {
          id?: string;
          checkout_session_id?: string | null;
          status?: Database["public"]["Enums"]["reservation_status"];
          created_at?: string;
          released_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["inventory_reservations"]["Row"]>;
      };
      customers: {
        Row: {
          id: string;
          auth_id: string | null;
          email: string;
          phone: string | null;
          first_name: string | null;
          last_name: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["customers"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          auth_id?: string | null;
          phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Row"]>;
      };
      customer_addresses: {
        Row: {
          id: string;
          customer_id: string;
          label: string;
          street_line_1: string;
          street_line_2: string | null;
          city: string;
          state: string;
          country: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["customer_addresses"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          label?: string;
          street_line_2?: string | null;
          country?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customer_addresses"]["Row"]>;
      };
      carts: {
        Row: {
          id: string;
          customer_id: string | null;
          status: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["carts"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          customer_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["carts"]["Row"]>;
      };
      cart_lines: {
        Row: {
          id: string;
          cart_id: string;
          variant_id: string;
          quantity: number;
          unit_price_snapshot: number;
          added_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["cart_lines"]["Row"], "id" | "added_at" | "updated_at"> & {
          id?: string;
          added_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cart_lines"]["Row"]>;
      };
      checkout_sessions: {
        Row: {
          id: string;
          cart_id: string;
          customer_id: string | null;
          guest_contact: Json | null;
          shipping_address: Json | null;
          fulfilment_method_id: string | null;
          payment_method: string | null;
          promo_code: string | null;
          idempotency_key: string | null;
          status: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["checkout_sessions"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          customer_id?: string | null;
          guest_contact?: Json | null;
          shipping_address?: Json | null;
          fulfilment_method_id?: string | null;
          payment_method?: string | null;
          promo_code?: string | null;
          idempotency_key?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["checkout_sessions"]["Row"]>;
      };
      fulfilment_methods: {
        Row: {
          id: string;
          type: string;
          name: string;
          description: string | null;
          is_enabled: boolean;
          estimated_days_min: number;
          estimated_days_max: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["fulfilment_methods"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          description?: string | null;
          is_enabled?: boolean;
          estimated_days_min?: number;
          estimated_days_max?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["fulfilment_methods"]["Row"]>;
      };
      shipping_zones: {
        Row: {
          id: string;
          name: string;
          regions: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["shipping_zones"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          regions?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shipping_zones"]["Row"]>;
      };
      shipping_rates: {
        Row: {
          id: string;
          fulfilment_method_id: string;
          zone_id: string;
          rate_type: string;
          flat_amount: number;
          per_kg_amount: number;
          free_above_order_total: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["shipping_rates"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          flat_amount?: number;
          per_kg_amount?: number;
          free_above_order_total?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shipping_rates"]["Row"]>;
      };
      orders: {
        Row: {
          id: string;
          customer_id: string | null;
          order_number: string;
          guest_contact: Json | null;
          status: string;
          shipping_address: Json | null;
          billing_address: Json | null;
          shipping_method_snapshot: Json | null;
          shipping_rate_snapshot: Json | null;
          subtotal: number;
          shipping_total: number;
          discount_total: number;
          tax_total: number;
          grand_total: number;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          customer_id?: string | null;
          guest_contact?: Json | null;
          status?: string;
          shipping_address?: Json | null;
          billing_address?: Json | null;
          shipping_method_snapshot?: Json | null;
          shipping_rate_snapshot?: Json | null;
          shipping_total?: number;
          discount_total?: number;
          tax_total?: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
      };
      order_lines: {
        Row: {
          id: string;
          order_id: string;
          variant_id: string | null;
          product_name_snapshot: string;
          variant_label_snapshot: string;
          sku_snapshot: string | null;
          image_url_snapshot: string | null;
          unit_price_snapshot: number;
          quantity: number;
          line_total: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["order_lines"]["Row"], "id" | "created_at"> & {
          id?: string;
          variant_id?: string | null;
          sku_snapshot?: string | null;
          image_url_snapshot?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_lines"]["Row"]>;
      };
      order_status_events: {
        Row: {
          id: string;
          order_id: string;
          from_status: string;
          to_status: string;
          actor: string;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["order_status_events"]["Row"], "id" | "created_at"> & {
          id?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_status_events"]["Row"]>;
      };
      order_notes: {
        Row: {
          id: string;
          order_id: string;
          body: string;
          author_type: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["order_notes"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_notes"]["Row"]>;
      };
      payment_attempts: {
        Row: {
          id: string;
          order_id: string;
          attempt_number: number;
          provider: string;
          provider_reference: string | null;
          idempotency_key: string;
          amount: number;
          currency: string;
          status: string;
          initiated_at: string;
          confirmed_at: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payment_attempts"]["Row"], "id" | "initiated_at" | "created_at" | "updated_at"> & {
          id?: string;
          attempt_number?: number;
          provider_reference?: string | null;
          status?: string;
          initiated_at?: string;
          confirmed_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payment_attempts"]["Row"]>;
      };
      payment_events: {
        Row: {
          id: string;
          payment_attempt_id: string;
          event_type: string;
          raw_payload: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payment_events"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payment_events"]["Row"]>;
      };
      notification_templates: {
        Row: {
          id: string;
          event_type: string;
          channel: string;
          subject_template: string | null;
          body_template: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notification_templates"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          subject_template?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_templates"]["Row"]>;
      };
      notification_logs: {
        Row: {
          id: string;
          order_id: string | null;
          customer_id: string | null;
          channel: string;
          recipient: string;
          status: string;
          sent_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notification_logs"]["Row"], "id" | "created_at"> & {
          id?: string;
          order_id?: string | null;
          customer_id?: string | null;
          status?: string;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_logs"]["Row"]>;
      };
      promotions: {
        Row: {
          id: string;
          name: string;
          type: string;
          value: number;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["promotions"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["promotions"]["Row"]>;
      };
      promotion_rules: {
        Row: {
          id: string;
          promotion_id: string;
          rule_type: string;
          conditions: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["promotion_rules"]["Row"], "id" | "created_at"> & {
          id?: string;
          conditions?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["promotion_rules"]["Row"]>;
      };
      coupon_codes: {
        Row: {
          id: string;
          promotion_id: string;
          code: string;
          max_uses: number | null;
          current_uses: number;
          max_uses_per_customer: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["coupon_codes"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          max_uses?: number | null;
          current_uses?: number;
          max_uses_per_customer?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["coupon_codes"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      reservation_status: "active" | "released" | "converted";
    };
  };
}

// ---------------------------------------------------------------------------
// Convenience helpers — mirrors the Supabase generated type helpers
// ---------------------------------------------------------------------------

/** Shorthand for a table's full Row type. */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/** Shorthand for a table's Insert type. */
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

/** Shorthand for a table's Update type. */
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

/** Shorthand for a database enum. */
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
