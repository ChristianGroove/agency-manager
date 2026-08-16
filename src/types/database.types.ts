// ==============================================================================
// SUPABASE DATABASE TYPE DEFINITIONS
// File: src/types/database.types.ts
// ==============================================================================

import { Database as SupabaseGeneratedDatabase, Json } from './supabase';

export type JsonValue = Json;

export type Database = Omit<SupabaseGeneratedDatabase, 'public'> & {
  public: Omit<SupabaseGeneratedDatabase['public'], 'Tables'> & {
    Tables: Omit<
      SupabaseGeneratedDatabase['public']['Tables'],
      'service_catalog' | 'organization_settings'
    > & {
      service_catalog: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          category: string;
          base_price: number | null;
          compare_at_price: number | null;
          type: string;
          classification: string | null;
          frequency: string | null;
          image_url: string | null;
          images: Json | null;
          gallery_images?: Json | null;
          video_url: string | null;
          sku: string | null;
          barcode: string | null;
          stock_quantity: number | null;
          inventory_quantity?: number | null;
          track_inventory: boolean | null;
          allow_backorders: boolean | null;
          low_stock_threshold: number | null;
          has_variants: boolean | null;
          variants_config: Json | null;
          variant_attributes?: Json | null;
          variants?: Json | null;
          add_ons?: Json | null;
          addon_groups?: Json | null;
          badges?: Json | null;
          featured_badge: string | null;
          spec_tabs: Json | null;
          specs_tabs?: Json | null;
          classification_metadata: Json | null;
          physical_details?: Json | null;
          digital_details?: Json | null;
          service_details?: Json | null;
          subscription_details?: Json | null;
          seo_title: string | null;
          seo_description: string | null;
          seo_metadata?: Json | null;
          order_index: number | null;
          is_visible_in_portal: boolean | null;
          is_system_template: boolean | null;
          ai_generated_image: boolean | null;
          insights_access: string | null;
          metadata: Json | null;
          created_at: string | null;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          category: string;
          base_price?: number | null;
          compare_at_price?: number | null;
          type: string;
          classification?: string | null;
          frequency?: string | null;
          image_url?: string | null;
          images?: Json | null;
          gallery_images?: Json | null;
          video_url?: string | null;
          sku?: string | null;
          barcode?: string | null;
          stock_quantity?: number | null;
          inventory_quantity?: number | null;
          track_inventory?: boolean | null;
          allow_backorders?: boolean | null;
          low_stock_threshold?: number | null;
          has_variants?: boolean | null;
          variants_config?: Json | null;
          variant_attributes?: Json | null;
          variants?: Json | null;
          add_ons?: Json | null;
          addon_groups?: Json | null;
          badges?: Json | null;
          featured_badge?: string | null;
          spec_tabs?: Json | null;
          specs_tabs?: Json | null;
          classification_metadata?: Json | null;
          physical_details?: Json | null;
          digital_details?: Json | null;
          service_details?: Json | null;
          subscription_details?: Json | null;
          seo_title?: string | null;
          seo_description?: string | null;
          seo_metadata?: Json | null;
          order_index?: number | null;
          is_visible_in_portal?: boolean | null;
          is_system_template?: boolean | null;
          ai_generated_image?: boolean | null;
          insights_access?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          base_price?: number | null;
          compare_at_price?: number | null;
          type?: string;
          classification?: string | null;
          frequency?: string | null;
          image_url?: string | null;
          images?: Json | null;
          gallery_images?: Json | null;
          video_url?: string | null;
          sku?: string | null;
          barcode?: string | null;
          stock_quantity?: number | null;
          inventory_quantity?: number | null;
          track_inventory?: boolean | null;
          allow_backorders?: boolean | null;
          low_stock_threshold?: number | null;
          has_variants?: boolean | null;
          variants_config?: Json | null;
          variant_attributes?: Json | null;
          variants?: Json | null;
          add_ons?: Json | null;
          addon_groups?: Json | null;
          badges?: Json | null;
          featured_badge?: string | null;
          spec_tabs?: Json | null;
          specs_tabs?: Json | null;
          classification_metadata?: Json | null;
          physical_details?: Json | null;
          digital_details?: Json | null;
          service_details?: Json | null;
          subscription_details?: Json | null;
          seo_title?: string | null;
          seo_description?: string | null;
          seo_metadata?: Json | null;
          order_index?: number | null;
          is_visible_in_portal?: boolean | null;
          is_system_template?: boolean | null;
          ai_generated_image?: boolean | null;
          insights_access?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "service_catalog_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };

      service_catalog_attributes: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          display_type: string;
          type: string;
          options: Json;
          order_index: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          display_type?: string;
          type?: string;
          options?: Json;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          display_type?: string;
          type?: string;
          options?: Json;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_catalog_attributes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };

      service_catalog_variants: {
        Row: {
          id: string;
          organization_id: string;
          catalog_item_id: string;
          name: string;
          sku: string | null;
          barcode: string | null;
          price_override: number | null;
          price_modifier: number;
          price_type: string;
          inventory_quantity: number;
          stock_quantity: number | null;
          track_inventory: boolean;
          track_stock: boolean;
          is_active: boolean;
          order_index: number;
          attributes: Json;
          image_url: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          catalog_item_id: string;
          name: string;
          sku?: string | null;
          barcode?: string | null;
          price_override?: number | null;
          price_modifier?: number;
          price_type?: string;
          inventory_quantity?: number;
          stock_quantity?: number | null;
          track_inventory?: boolean;
          track_stock?: boolean;
          is_active?: boolean;
          order_index?: number;
          attributes?: Json;
          image_url?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          catalog_item_id?: string;
          name?: string;
          sku?: string | null;
          barcode?: string | null;
          price_override?: number | null;
          price_modifier?: number;
          price_type?: string;
          inventory_quantity?: number;
          stock_quantity?: number | null;
          track_inventory?: boolean;
          track_stock?: boolean;
          is_active?: boolean;
          order_index?: number;
          attributes?: Json;
          image_url?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_catalog_variants_catalog_item_id_fkey";
            columns: ["catalog_item_id"];
            isOneToOne: false;
            referencedRelation: "service_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_catalog_variants_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };

      service_catalog_addons: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          price: number;
          price_type: string;
          selection_type: string;
          is_required: boolean;
          min_selections: number;
          max_selections: number;
          max_quantity: number;
          options: Json;
          is_active: boolean;
          scope: string;
          order_index: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          price?: number;
          price_type?: string;
          selection_type?: string;
          is_required?: boolean;
          min_selections?: number;
          max_selections?: number;
          max_quantity?: number;
          options?: Json;
          is_active?: boolean;
          scope?: string;
          order_index?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          price_type?: string;
          selection_type?: string;
          is_required?: boolean;
          min_selections?: number;
          max_selections?: number;
          max_quantity?: number;
          options?: Json;
          is_active?: boolean;
          scope?: string;
          order_index?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_catalog_addons_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };

      service_catalog_item_addons: {
        Row: {
          item_id: string;
          addon_id: string;
          order_index: number;
        };
        Insert: {
          item_id: string;
          addon_id: string;
          order_index?: number;
        };
        Update: {
          item_id?: string;
          addon_id?: string;
          order_index?: number;
        };
        Relationships: [
          {
            foreignKeyName: "service_catalog_item_addons_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "service_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_catalog_item_addons_addon_id_fkey";
            columns: ["addon_id"];
            isOneToOne: false;
            referencedRelation: "service_catalog_addons";
            referencedColumns: ["id"];
          }
        ];
      };

      organization_settings: {
        Row: SupabaseGeneratedDatabase['public']['Tables']['organization_settings']['Row'] & {
          portal_theme_config: Json | null;
        };
        Insert: SupabaseGeneratedDatabase['public']['Tables']['organization_settings']['Insert'] & {
          portal_theme_config?: Json | null;
        };
        Update: SupabaseGeneratedDatabase['public']['Tables']['organization_settings']['Update'] & {
          portal_theme_config?: Json | null;
        };
        Relationships: SupabaseGeneratedDatabase['public']['Tables']['organization_settings']['Relationships'];
      };
    };
  };
};
