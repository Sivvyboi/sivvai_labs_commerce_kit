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
      admin_invitations: {
        Row: {
          id: string;
          email: string;
          role_id: string | null;
          invited_by: string | null;
          token: string;
          status: "pending" | "accepted" | "expired" | "revoked";
          message: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role_id?: string | null;
          invited_by?: string | null;
          token?: string;
          status?: "pending" | "accepted" | "expired" | "revoked";
          message?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role_id?: string | null;
          invited_by?: string | null;
          token?: string;
          status?: "pending" | "accepted" | "expired" | "revoked";
          message?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_users: {
        Row: {
          id: string;
          auth_user_id: string;
          role_id: string | null;
          is_active: boolean;
          is_protected_owner: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          role_id?: string | null;
          is_active?: boolean;
          is_protected_owner?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          role_id?: string | null;
          is_active?: boolean;
          is_protected_owner?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_user_permissions: {
        Row: {
          admin_user_id: string;
          permission_id: string;
          is_granted: boolean;
          created_at: string;
        };
        Insert: {
          admin_user_id: string;
          permission_id: string;
          is_granted?: boolean;
          created_at?: string;
        };
        Update: {
          admin_user_id?: string;
          permission_id?: string;
          is_granted?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          admin_user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_user_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_user_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          key: string;
          description: string | null;
        };
        Insert: {
          id?: string;
          key: string;
          description?: string | null;
        };
        Update: {
          id?: string;
          key?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
        };
        Relationships: [];
      };
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
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          contact_email: string;
          contact_phone?: string | null;
          seo_title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          contact_email?: string;
          contact_phone?: string | null;
          seo_title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          currency?: string;
          tax_mode?: string;
          active_payment_provider?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          currency?: string;
          tax_mode?: string;
          active_payment_provider?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          key: string;
          enabled?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          enabled?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          parent_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          seo_title: string | null;
          seo_description: string | null;
          og_image: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          og_image?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          parent_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          og_image?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          slug: string;
          name: string;
          description?: string | null;
          status?: string;
          visibility?: string;
          published_at?: string | null;
          base_price: number;
          sale_price?: number | null;
          compare_at_price?: number | null;
          cost_price?: number | null;
          is_featured?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          archived_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string | null;
          slug?: string;
          name?: string;
          description?: string | null;
          status?: string;
          visibility?: string;
          published_at?: string | null;
          base_price?: number;
          sale_price?: number | null;
          compare_at_price?: number | null;
          cost_price?: number | null;
          is_featured?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          archived_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          alt_text?: string | null;
          display_order?: number;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          url?: string;
          alt_text?: string | null;
          display_order?: number;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      option_groups: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          display_order: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          display_order?: number;
        };
        Update: {
          id?: string;
          product_id?: string;
          name?: string;
          display_order?: number;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          option_group_id: string;
          label: string;
          display_order?: number;
          swatch_type?: string | null;
          swatch_value?: string | null;
        };
        Update: {
          id?: string;
          option_group_id?: string;
          label?: string;
          display_order?: number;
          swatch_type?: string | null;
          swatch_value?: string | null;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          product_id: string;
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
        Update: {
          id?: string;
          product_id?: string;
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
        Relationships: [];
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
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          slug: string;
          name: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
        };
        Relationships: [];
      };
      product_tags: {
        Row: {
          product_id: string;
          tag_id: string;
        };
        Insert: {
          product_id: string;
          tag_id: string;
        };
        Update: {
          product_id?: string;
          tag_id?: string;
        };
        Relationships: [];
      };
      collection_products: {
        Row: {
          collection_id: string;
          product_id: string;
          display_order: number;
        };
        Insert: {
          collection_id: string;
          product_id: string;
          display_order?: number;
        };
        Update: {
          collection_id?: string;
          product_id?: string;
          display_order?: number;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          variant_id: string;
          on_hand_quantity?: number;
          reserved_quantity?: number;
          incoming_quantity?: number;
          low_stock_threshold?: number;
          track_inventory?: boolean;
          allow_backorders?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          on_hand_quantity?: number;
          reserved_quantity?: number;
          incoming_quantity?: number;
          low_stock_threshold?: number;
          track_inventory?: boolean;
          allow_backorders?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          inventory_record_id: string;
          movement_type: string;
          quantity_delta: number;
          reason?: string | null;
          reference_id?: string | null;
          performed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          inventory_record_id?: string;
          movement_type?: string;
          quantity_delta?: number;
          reason?: string | null;
          reference_id?: string | null;
          performed_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          inventory_record_id: string;
          variant_id: string;
          checkout_session_id?: string | null;
          quantity: number;
          status?: "active" | "released" | "converted";
          expires_at: string;
          created_at?: string;
          released_at?: string | null;
        };
        Update: {
          id?: string;
          inventory_record_id?: string;
          variant_id?: string;
          checkout_session_id?: string | null;
          quantity?: number;
          status?: "active" | "released" | "converted";
          expires_at?: string;
          created_at?: string;
          released_at?: string | null;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          auth_id?: string | null;
          email: string;
          phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string | null;
          email?: string;
          phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          customer_id: string;
          label?: string;
          street_line_1: string;
          street_line_2?: string | null;
          city: string;
          state: string;
          country?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          label?: string;
          street_line_1?: string;
          street_line_2?: string | null;
          city?: string;
          state?: string;
          country?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      carts: {
        Row: {
          id: string;
          customer_id: string | null;
          cart_token_hash: string | null;
          status: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          cart_token_hash?: string | null;
          status?: string;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          cart_token_hash?: string | null;
          status?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          cart_id: string;
          variant_id: string;
          quantity: number;
          unit_price_snapshot: number;
          added_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          variant_id?: string;
          quantity?: number;
          unit_price_snapshot?: number;
          added_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          subtotal: number;
          shipping_total: number;
          discount_total: number;
          tax_total: number;
          grand_total: number;
          currency: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          customer_id?: string | null;
          guest_contact?: Json | null;
          shipping_address?: Json | null;
          fulfilment_method_id?: string | null;
          payment_method?: string | null;
          promo_code?: string | null;
          idempotency_key?: string | null;
          status?: string;
          subtotal?: number;
          shipping_total?: number;
          discount_total?: number;
          tax_total?: number;
          grand_total?: number;
          currency?: string;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          customer_id?: string | null;
          guest_contact?: Json | null;
          shipping_address?: Json | null;
          fulfilment_method_id?: string | null;
          payment_method?: string | null;
          promo_code?: string | null;
          idempotency_key?: string | null;
          status?: string;
          subtotal?: number;
          shipping_total?: number;
          discount_total?: number;
          tax_total?: number;
          grand_total?: number;
          currency?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          type: string;
          name: string;
          description?: string | null;
          is_enabled?: boolean;
          estimated_days_min?: number;
          estimated_days_max?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          name?: string;
          description?: string | null;
          is_enabled?: boolean;
          estimated_days_min?: number;
          estimated_days_max?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shipping_zones: {
        Row: {
          id: string;
          name: string;
          regions: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          regions?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          regions?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          fulfilment_method_id: string;
          zone_id: string;
          rate_type: string;
          flat_amount?: number;
          per_kg_amount?: number;
          free_above_order_total?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fulfilment_method_id?: string;
          zone_id?: string;
          rate_type?: string;
          flat_amount?: number;
          per_kg_amount?: number;
          free_above_order_total?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          customer_id?: string | null;
          order_number: string;
          guest_contact?: Json | null;
          status?: string;
          shipping_address?: Json | null;
          billing_address?: Json | null;
          shipping_method_snapshot?: Json | null;
          shipping_rate_snapshot?: Json | null;
          subtotal: number;
          shipping_total?: number;
          discount_total?: number;
          tax_total?: number;
          grand_total: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          order_number?: string;
          guest_contact?: Json | null;
          status?: string;
          shipping_address?: Json | null;
          billing_address?: Json | null;
          shipping_method_snapshot?: Json | null;
          shipping_rate_snapshot?: Json | null;
          subtotal?: number;
          shipping_total?: number;
          discount_total?: number;
          tax_total?: number;
          grand_total?: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_lines: {
        Row: {
          id: string;
          order_id: string;
          variant_id: string | null;
          product_name_snapshot: string;
          variant_label_snapshot: string;
          selected_options_snapshot: Record<string, string>;
          sku_snapshot: string | null;
          image_url_snapshot: string | null;
          unit_price_snapshot: number;
          quantity: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          variant_id?: string | null;
          product_name_snapshot: string;
          variant_label_snapshot: string;
          selected_options_snapshot?: Record<string, string>;
          sku_snapshot?: string | null;
          image_url_snapshot?: string | null;
          unit_price_snapshot: number;
          quantity: number;
          line_total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          variant_id?: string | null;
          product_name_snapshot?: string;
          variant_label_snapshot?: string;
          selected_options_snapshot?: Record<string, string>;
          sku_snapshot?: string | null;
          image_url_snapshot?: string | null;
          unit_price_snapshot?: number;
          quantity?: number;
          line_total?: number;
          created_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          order_id: string;
          from_status: string;
          to_status: string;
          actor: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          from_status?: string;
          to_status?: string;
          actor?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      order_notes: {
        Row: {
          id: string;
          order_id: string;
          body: string;
          author_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          body: string;
          author_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          body?: string;
          author_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      payment_attempts: {
        Row: {
          id: string;
          order_id: string | null;
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
        Insert: {
          id?: string;
          order_id?: string | null;
          attempt_number?: number;
          provider: string;
          provider_reference?: string | null;
          idempotency_key: string;
          amount: number;
          currency: string;
          status?: string;
          initiated_at?: string;
          confirmed_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          attempt_number?: number;
          provider?: string;
          provider_reference?: string | null;
          idempotency_key?: string;
          amount?: number;
          currency?: string;
          status?: string;
          initiated_at?: string;
          confirmed_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_events: {
        Row: {
          id: string;
          payment_attempt_id: string;
          event_type: string;
          raw_payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_attempt_id: string;
          event_type: string;
          raw_payload: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_attempt_id?: string;
          event_type?: string;
          raw_payload?: Json;
          created_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          event_type: string;
          channel: string;
          subject_template?: string | null;
          body_template: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          channel?: string;
          subject_template?: string | null;
          body_template?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          error_message: string | null;
          metadata: Json | null;
          idempotency_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          customer_id?: string | null;
          channel: string;
          recipient: string;
          status?: string;
          sent_at?: string | null;
          error_message?: string | null;
          metadata?: Json | null;
          idempotency_key?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          customer_id?: string | null;
          channel?: string;
          recipient?: string;
          status?: string;
          sent_at?: string | null;
          error_message?: string | null;
          metadata?: Json | null;
          idempotency_key?: string | null;
          created_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          name: string;
          type: string;
          value: number;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          value?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      promotion_rules: {
        Row: {
          id: string;
          promotion_id: string;
          rule_type: string;
          conditions: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          promotion_id: string;
          rule_type: string;
          conditions: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          promotion_id?: string;
          rule_type?: string;
          conditions?: Json;
          created_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          promotion_id: string;
          code: string;
          max_uses?: number | null;
          current_uses?: number;
          max_uses_per_customer?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          promotion_id?: string;
          code?: string;
          max_uses?: number | null;
          current_uses?: number;
          max_uses_per_customer?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_order_from_checkout_rpc: {
        Args: {
          p_checkout_session_id: string;
          p_payment_reference: string;
        };
        Returns: Json;
      };
    };
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
