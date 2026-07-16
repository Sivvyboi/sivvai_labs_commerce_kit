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
      brand_profile: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          seo_title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          seo_title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          seo_title?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          id: string
          currency: string
          tax_mode: string
          active_payment_provider: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          currency?: string
          tax_mode?: string
          active_payment_provider?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          currency?: string
          tax_mode?: string
          active_payment_provider?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          id: string
          key: string
          enabled: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          enabled?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          enabled?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          parent_id: string | null
          name: string
          slug: string
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          parent_id?: string | null
          name: string
          slug: string
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          parent_id?: string | null
          name?: string
          slug?: string
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          category_id: string | null
          slug: string
          name: string
          description: string | null
          status: Database["public"]["Enums"]["product_status"]
          visibility: Database["public"]["Enums"]["product_visibility"]
          published_at: string | null
          base_price: number
          sale_price: number | null
          compare_at_price: number | null
          cost_price: number | null
          is_featured: boolean
          seo_title: string | null
          seo_description: string | null
          seo_keywords: string[] | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          slug: string
          name: string
          description?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          visibility?: Database["public"]["Enums"]["product_visibility"]
          published_at?: string | null
          base_price?: number
          sale_price?: number | null
          compare_at_price?: number | null
          cost_price?: number | null
          is_featured?: boolean
          seo_title?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          slug?: string
          name?: string
          description?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          visibility?: Database["public"]["Enums"]["product_visibility"]
          published_at?: string | null
          base_price?: number
          sale_price?: number | null
          compare_at_price?: number | null
          cost_price?: number | null
          is_featured?: boolean
          seo_title?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          url: string
          alt_text: string | null
          display_order: number
          is_primary: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          alt_text?: string | null
          display_order?: number
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          url?: string
          alt_text?: string | null
          display_order?: number
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      option_groups: {
        Row: {
          id: string
          product_id: string
          name: string
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          name: string
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          name?: string
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_groups_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      option_values: {
        Row: {
          id: string
          option_group_id: string
          label: string
          display_order: number
          swatch_type: string | null
          swatch_value: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          option_group_id: string
          label: string
          display_order?: number
          swatch_type?: string | null
          swatch_value?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          option_group_id?: string
          label?: string
          display_order?: number
          swatch_type?: string | null
          swatch_value?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_values_option_group_id_fkey"
            columns: ["option_group_id"]
            referencedRelation: "option_groups"
            referencedColumns: ["id"]
          }
        ]
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          image_id: string | null
          sku: string | null
          option_combination: Json
          price_override: number | null
          is_default: boolean
          status: Database["public"]["Enums"]["variant_status"]
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          image_id?: string | null
          sku?: string | null
          option_combination?: Json
          price_override?: number | null
          is_default?: boolean
          status?: Database["public"]["Enums"]["variant_status"]
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          image_id?: string | null
          sku?: string | null
          option_combination?: Json
          price_override?: number | null
          is_default?: boolean
          status?: Database["public"]["Enums"]["variant_status"]
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_image_id_fkey"
            columns: ["image_id"]
            referencedRelation: "product_images"
            referencedColumns: ["id"]
          }
        ]
      }
      collections: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          slug: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_tags: {
        Row: {
          product_id: string
          tag_id: string
        }
        Insert: {
          product_id: string
          tag_id: string
        }
        Update: {
          product_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tags_tag_id_fkey"
            columns: ["tag_id"]
            referencedRelation: "tags"
            referencedColumns: ["id"]
          }
        ]
      }
      collection_products: {
        Row: {
          collection_id: string
          product_id: string
          display_order: number
        }
        Insert: {
          collection_id: string
          product_id: string
          display_order?: number
        }
        Update: {
          collection_id?: string
          product_id?: string
          display_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey"
            columns: ["collection_id"]
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      inventory_records: {
        Row: {
          id: string
          variant_id: string
          on_hand_quantity: number
          reserved_quantity: number
          incoming_quantity: number
          low_stock_threshold: number
          track_inventory: boolean
          allow_backorders: boolean
          available_quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          variant_id: string
          on_hand_quantity?: number
          reserved_quantity?: number
          incoming_quantity?: number
          low_stock_threshold?: number
          track_inventory?: boolean
          allow_backorders?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          variant_id?: string
          on_hand_quantity?: number
          reserved_quantity?: number
          incoming_quantity?: number
          low_stock_threshold?: number
          track_inventory?: boolean
          allow_backorders?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_records_variant_id_fkey"
            columns: ["variant_id"]
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          }
        ]
      }
      stock_movements: {
        Row: {
          id: string
          inventory_record_id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          quantity_delta: number
          reason: string | null
          reference_id: string | null
          performed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          inventory_record_id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          quantity_delta: number
          reason?: string | null
          reference_id?: string | null
          performed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          inventory_record_id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          quantity_delta?: number
          reason?: string | null
          reference_id?: string | null
          performed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_inventory_record_id_fkey"
            columns: ["inventory_record_id"]
            referencedRelation: "inventory_records"
            referencedColumns: ["id"]
          }
        ]
      }
      inventory_reservations: {
        Row: {
          id: string
          inventory_record_id: string
          /** Soft reference — FK enforced at application layer. */
          cart_id: string | null
          /** Soft reference — FK enforced at application layer. */
          checkout_session_id: string | null
          /** Soft reference — FK enforced at application layer. */
          order_id: string | null
          quantity: number
          status: Database["public"]["Enums"]["reservation_status"]
          expires_at: string
          released_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          inventory_record_id: string
          cart_id?: string | null
          checkout_session_id?: string | null
          order_id?: string | null
          quantity: number
          status?: Database["public"]["Enums"]["reservation_status"]
          expires_at: string
          released_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          inventory_record_id?: string
          cart_id?: string | null
          checkout_session_id?: string | null
          order_id?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["reservation_status"]
          expires_at?: string
          released_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_inventory_record_id_fkey"
            columns: ["inventory_record_id"]
            referencedRelation: "inventory_records"
            referencedColumns: ["id"]
          }
        ]
      }
      customers: {
        Row: {
          id: string
          auth_id: string | null
          email: string
          phone: string | null
          first_name: string | null
          last_name: string | null
          status: Database["public"]["Enums"]["customer_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_id?: string | null
          email: string
          phone?: string | null
          first_name?: string | null
          last_name?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_id?: string | null
          email?: string
          phone?: string | null
          first_name?: string | null
          last_name?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          id: string
          customer_id: string
          label: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          street_line_1: string
          street_line_2: string | null
          city: string
          state: string
          postal_code: string | null
          country: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          label?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          street_line_1: string
          street_line_2?: string | null
          city: string
          state: string
          postal_code?: string | null
          country?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          label?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          street_line_1?: string
          street_line_2?: string | null
          city?: string
          state?: string
          postal_code?: string | null
          country?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      carts: {
        Row: {
          id: string
          customer_id: string | null
          status: Database["public"]["Enums"]["cart_status"]
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          status?: Database["public"]["Enums"]["cart_status"]
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          status?: Database["public"]["Enums"]["cart_status"]
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      cart_lines: {
        Row: {
          id: string
          cart_id: string
          variant_id: string
          quantity: number
          unit_price_snapshot: number | null
          added_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cart_id: string
          variant_id: string
          quantity?: number
          unit_price_snapshot?: number | null
          added_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cart_id?: string
          variant_id?: string
          quantity?: number
          unit_price_snapshot?: number | null
          added_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_lines_cart_id_fkey"
            columns: ["cart_id"]
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_lines_variant_id_fkey"
            columns: ["variant_id"]
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          }
        ]
      }
      checkout_sessions: {
        Row: {
          id: string
          cart_id: string
          customer_id: string | null
          guest_contact: Json | null
          shipping_address: Json | null
          fulfilment_method_id: string | null
          payment_method: string | null
          promo_code: string | null
          idempotency_key: string | null
          status: Database["public"]["Enums"]["checkout_status"]
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cart_id: string
          customer_id?: string | null
          guest_contact?: Json | null
          shipping_address?: Json | null
          fulfilment_method_id?: string | null
          payment_method?: string | null
          promo_code?: string | null
          idempotency_key?: string | null
          status?: Database["public"]["Enums"]["checkout_status"]
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cart_id?: string
          customer_id?: string | null
          guest_contact?: Json | null
          shipping_address?: Json | null
          fulfilment_method_id?: string | null
          payment_method?: string | null
          promo_code?: string | null
          idempotency_key?: string | null
          status?: Database["public"]["Enums"]["checkout_status"]
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_cart_id_fkey"
            columns: ["cart_id"]
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_fulfilment_method_id_fkey"
            columns: ["fulfilment_method_id"]
            referencedRelation: "fulfilment_methods"
            referencedColumns: ["id"]
          }
        ]
      }
      fulfilment_methods: {
        Row: {
          id: string
          type: Database["public"]["Enums"]["fulfilment_type"]
          name: string
          is_enabled: boolean
          estimated_days_min: number | null
          estimated_days_max: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: Database["public"]["Enums"]["fulfilment_type"]
          name: string
          is_enabled?: boolean
          estimated_days_min?: number | null
          estimated_days_max?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: Database["public"]["Enums"]["fulfilment_type"]
          name?: string
          is_enabled?: boolean
          estimated_days_min?: number | null
          estimated_days_max?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipping_zones: {
        Row: {
          id: string
          name: string
          regions: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          regions?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          regions?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipping_rates: {
        Row: {
          id: string
          fulfilment_method_id: string
          zone_id: string
          rate_type: Database["public"]["Enums"]["shipping_rate_type"]
          flat_amount: number
          per_kg_amount: number
          free_above_order_total: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fulfilment_method_id: string
          zone_id: string
          rate_type?: Database["public"]["Enums"]["shipping_rate_type"]
          flat_amount?: number
          per_kg_amount?: number
          free_above_order_total?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fulfilment_method_id?: string
          zone_id?: string
          rate_type?: Database["public"]["Enums"]["shipping_rate_type"]
          flat_amount?: number
          per_kg_amount?: number
          free_above_order_total?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_fulfilment_method_id_fkey"
            columns: ["fulfilment_method_id"]
            referencedRelation: "fulfilment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rates_zone_id_fkey"
            columns: ["zone_id"]
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          customer_id: string | null
          order_number: string
          guest_contact: Json | null
          status: Database["public"]["Enums"]["order_status"]
          shipping_address: Json
          billing_address: Json | null
          shipping_method_snapshot: Json | null
          shipping_rate_snapshot: Json | null
          subtotal: number
          shipping_total: number
          discount_total: number
          tax_total: number
          grand_total: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          order_number: string
          guest_contact?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          shipping_address: Json
          billing_address?: Json | null
          shipping_method_snapshot?: Json | null
          shipping_rate_snapshot?: Json | null
          subtotal?: number
          shipping_total?: number
          discount_total?: number
          tax_total?: number
          grand_total?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          order_number?: string
          guest_contact?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          shipping_address?: Json
          billing_address?: Json | null
          shipping_method_snapshot?: Json | null
          shipping_rate_snapshot?: Json | null
          subtotal?: number
          shipping_total?: number
          discount_total?: number
          tax_total?: number
          grand_total?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      order_lines: {
        Row: {
          id: string
          order_id: string
          variant_id: string | null
          product_name_snapshot: string
          variant_label_snapshot: string | null
          sku_snapshot: string | null
          image_url_snapshot: string | null
          unit_price_snapshot: number
          quantity: number
          line_total: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          variant_id?: string | null
          product_name_snapshot: string
          variant_label_snapshot?: string | null
          sku_snapshot?: string | null
          image_url_snapshot?: string | null
          unit_price_snapshot?: number
          quantity?: number
          line_total?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          variant_id?: string | null
          product_name_snapshot?: string
          variant_label_snapshot?: string | null
          sku_snapshot?: string | null
          image_url_snapshot?: string | null
          unit_price_snapshot?: number
          quantity?: number
          line_total?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_variant_id_fkey"
            columns: ["variant_id"]
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          }
        ]
      }
      order_status_events: {
        Row: {
          id: string
          order_id: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          to_status: Database["public"]["Enums"]["order_status"]
          actor: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          to_status: Database["public"]["Enums"]["order_status"]
          actor: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          to_status?: Database["public"]["Enums"]["order_status"]
          actor?: string
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_events_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      order_notes: {
        Row: {
          id: string
          order_id: string
          body: string
          author_type: Database["public"]["Enums"]["note_author_type"]
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          body: string
          author_type: Database["public"]["Enums"]["note_author_type"]
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          body?: string
          author_type?: Database["public"]["Enums"]["note_author_type"]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      payment_attempts: {
        Row: {
          id: string
          order_id: string
          attempt_number: number
          provider: string
          provider_reference: string | null
          idempotency_key: string
          amount: number
          currency: string
          status: Database["public"]["Enums"]["payment_status"]
          initiated_at: string
          confirmed_at: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          attempt_number?: number
          provider: string
          provider_reference?: string | null
          idempotency_key: string
          amount?: number
          currency?: string
          status?: Database["public"]["Enums"]["payment_status"]
          initiated_at?: string
          confirmed_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          attempt_number?: number
          provider?: string
          provider_reference?: string | null
          idempotency_key?: string
          amount?: number
          currency?: string
          status?: Database["public"]["Enums"]["payment_status"]
          initiated_at?: string
          confirmed_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      payment_events: {
        Row: {
          id: string
          payment_attempt_id: string
          event_type: string
          raw_payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          payment_attempt_id: string
          event_type: string
          raw_payload?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          payment_attempt_id?: string
          event_type?: string
          raw_payload?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_templates: {
        Row: {
          id: string
          event_type: string
          channel: Database["public"]["Enums"]["notification_channel"]
          subject_template: string | null
          body_template: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_type: string
          channel: Database["public"]["Enums"]["notification_channel"]
          subject_template?: string | null
          body_template: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          subject_template?: string | null
          body_template?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          id: string
          order_id: string | null
          customer_id: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          recipient: string
          status: Database["public"]["Enums"]["notification_status"]
          sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          customer_id?: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          recipient: string
          status?: Database["public"]["Enums"]["notification_status"]
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string | null
          customer_id?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          recipient?: string
          status?: Database["public"]["Enums"]["notification_status"]
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      promotions: {
        Row: {
          id: string
          name: string
          type: Database["public"]["Enums"]["promotion_type"]
          value: number
          starts_at: string | null
          ends_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: Database["public"]["Enums"]["promotion_type"]
          value?: number
          starts_at?: string | null
          ends_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["promotion_type"]
          value?: number
          starts_at?: string | null
          ends_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotion_rules: {
        Row: {
          id: string
          promotion_id: string
          rule_type: string
          conditions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          promotion_id: string
          rule_type: string
          conditions?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          promotion_id?: string
          rule_type?: string
          conditions?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_rules_promotion_id_fkey"
            columns: ["promotion_id"]
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          }
        ]
      }
      coupon_codes: {
        Row: {
          id: string
          promotion_id: string
          code: string
          max_uses: number | null
          current_uses: number
          max_uses_per_customer: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          promotion_id: string
          code: string
          max_uses?: number | null
          current_uses?: number
          max_uses_per_customer?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          promotion_id?: string
          code?: string
          max_uses?: number | null
          current_uses?: number
          max_uses_per_customer?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_codes_promotion_id_fkey"
            columns: ["promotion_id"]
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      product_status: "draft" | "published" | "archived"
      product_visibility: "public" | "hidden"
      variant_status: "active" | "archived"
      stock_movement_type: "in" | "out" | "adjustment" | "allocation"
      reservation_status: "active" | "released" | "expired" | "converted"
      customer_status: "active" | "blocked" | "guest"
      cart_status: "active" | "converted" | "expired"
      checkout_status: "open" | "completed" | "expired"
      fulfilment_type: "pickup" | "delivery" | "shipping"
      shipping_rate_type: "flat" | "weight_based" | "price_based"
      order_status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "returned"
      note_author_type: "customer" | "merchant" | "system"
      payment_status: "pending" | "authorized" | "captured" | "failed" | "voided" | "refunded"
      notification_channel: "email" | "sms" | "whatsapp"
      notification_status: "pending" | "sent" | "failed"
      promotion_type: "percentage" | "fixed_amount" | "free_shipping"
    }
  }
}

/** Shorthand for a table's full Row type. */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

/** Shorthand for a table's Insert type. */
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

/** Shorthand for a table's Update type. */
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

/** Shorthand for a database enum. */
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]
