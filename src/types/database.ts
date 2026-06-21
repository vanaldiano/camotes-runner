export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'runner_arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'Cash' | 'GCash';
export type UserRole = 'customer' | 'rider' | 'admin';
export type NotificationRecipientType = 'customer' | 'rider' | 'admin' | 'unknown';
export type NotificationLogStatus = 'queued' | 'sent' | 'failed' | 'skipped';
export type PartnerOrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'picked_up'
  | 'on_the_way'
  | 'completed'
  | 'cancelled';

export type FoodOrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          customer_since: string;
          email: string | null;
          full_name: string;
          id: string;
          phone: string | null;
          push_token: string | null;
          role: UserRole;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          customer_since?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          phone?: string | null;
          push_token?: string | null;
          role?: UserRole;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          customer_since?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          phone?: string | null;
          push_token?: string | null;
          role?: UserRole;
          updated_at?: string;
        };
        Relationships: [];
      };
      riders: {
        Row: {
          auth_user_id: string | null;
          created_at: string;
          current_location: string | null;
          full_name: string;
          id: string;
          is_available: boolean;
          motorcycle_model: string;
          phone: string | null;
          photo_url: string | null;
          plate_number: string;
          push_token: string | null;
          rating: number;
          updated_at: string;
        };
        Insert: {
          auth_user_id?: string | null;
          created_at?: string;
          current_location?: string | null;
          full_name: string;
          id?: string;
          is_available?: boolean;
          motorcycle_model: string;
          phone?: string | null;
          photo_url?: string | null;
          plate_number: string;
          push_token?: string | null;
          rating?: number;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string | null;
          created_at?: string;
          current_location?: string | null;
          full_name?: string;
          id?: string;
          is_available?: boolean;
          motorcycle_model?: string;
          phone?: string | null;
          photo_url?: string | null;
          plate_number?: string;
          push_token?: string | null;
          rating?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      rider_locations: {
        Row: {
          booking_id: string | null;
          food_order_id: string | null;
          heading: number | null;
          id: string;
          latitude: number;
          longitude: number;
          partner_order_id: string | null;
          rider_id: string;
          speed: number | null;
          updated_at: string;
        };
        Insert: {
          booking_id?: string | null;
          food_order_id?: string | null;
          heading?: number | null;
          id?: string;
          latitude: number;
          longitude: number;
          partner_order_id?: string | null;
          rider_id: string;
          speed?: number | null;
          updated_at?: string;
        };
        Update: {
          booking_id?: string | null;
          food_order_id?: string | null;
          heading?: number | null;
          id?: string;
          latitude?: number;
          longitude?: number;
          partner_order_id?: string | null;
          rider_id?: string;
          speed?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rider_locations_booking_id_fkey';
            columns: ['booking_id'];
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rider_locations_food_order_id_fkey';
            columns: ['food_order_id'];
            referencedRelation: 'food_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rider_locations_partner_order_id_fkey';
            columns: ['partner_order_id'];
            referencedRelation: 'partner_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rider_locations_rider_id_fkey';
            columns: ['rider_id'];
            referencedRelation: 'riders';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: {
          base_fare: number;
          created_at: string;
          customer_id: string | null;
          destination: string;
          destination_lat: number | null;
          destination_lng: number | null;
          distance_km: number | null;
          estimated_fare: number;
          fare_estimate: number | null;
          final_fare: number | null;
          id: string;
          notes: string | null;
          payment_method: PaymentMethod;
          pickup_lat: number | null;
          pickup_lng: number | null;
          pickup_location: string;
          assigned_rider_id: string | null;
          rider_id: string | null;
          service_type: string;
          status: BookingStatus;
          updated_at: string;
        };
        Insert: {
          base_fare?: number;
          created_at?: string;
          customer_id?: string | null;
          destination: string;
          destination_lat?: number | null;
          destination_lng?: number | null;
          distance_km?: number | null;
          estimated_fare?: number;
          fare_estimate?: number | null;
          final_fare?: number | null;
          id?: string;
          notes?: string | null;
          payment_method?: PaymentMethod;
          pickup_lat?: number | null;
          pickup_lng?: number | null;
          pickup_location: string;
          assigned_rider_id?: string | null;
          rider_id?: string | null;
          service_type: string;
          status?: BookingStatus;
          updated_at?: string;
        };
        Update: {
          base_fare?: number;
          created_at?: string;
          customer_id?: string | null;
          destination?: string;
          destination_lat?: number | null;
          destination_lng?: number | null;
          distance_km?: number | null;
          estimated_fare?: number;
          fare_estimate?: number | null;
          final_fare?: number | null;
          id?: string;
          notes?: string | null;
          payment_method?: PaymentMethod;
          pickup_lat?: number | null;
          pickup_lng?: number | null;
          pickup_location?: string;
          assigned_rider_id?: string | null;
          rider_id?: string | null;
          service_type?: string;
          status?: BookingStatus;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_assigned_rider_id_fkey';
            columns: ['assigned_rider_id'];
            referencedRelation: 'riders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_rider_id_fkey';
            columns: ['rider_id'];
            referencedRelation: 'riders';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_status_logs: {
        Row: {
          booking_id: string;
          created_at: string;
          id: string;
          message: string | null;
          status: BookingStatus;
        };
        Insert: {
          booking_id: string;
          created_at?: string;
          id?: string;
          message?: string | null;
          status: BookingStatus;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          id?: string;
          message?: string | null;
          status?: BookingStatus;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_status_logs_booking_id_fkey';
            columns: ['booking_id'];
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      fare_settings: {
        Row: {
          base_fare: number;
          created_at: string;
          id: string;
          is_active: boolean;
          minimum_fare: number;
          per_km_rate: number;
          service_type: string;
          updated_at: string;
        };
        Insert: {
          base_fare: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          minimum_fare: number;
          per_km_rate: number;
          service_type: string;
          updated_at?: string;
        };
        Update: {
          base_fare?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          minimum_fare?: number;
          per_km_rate?: number;
          service_type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_logs: {
        Row: {
          body: string;
          created_at: string;
          data: Json;
          error_message: string | null;
          id: string;
          push_token: string | null;
          recipient_id: string | null;
          recipient_type: NotificationRecipientType;
          status: NotificationLogStatus;
          title: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          data?: Json;
          error_message?: string | null;
          id?: string;
          push_token?: string | null;
          recipient_id?: string | null;
          recipient_type: NotificationRecipientType;
          status?: NotificationLogStatus;
          title: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          data?: Json;
          error_message?: string | null;
          id?: string;
          push_token?: string | null;
          recipient_id?: string | null;
          recipient_type?: NotificationRecipientType;
          status?: NotificationLogStatus;
          title?: string;
        };
        Relationships: [];
      };
      service_categories: {
        Row: {
          created_at: string;
          description: string | null;
          icon: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_subcategories: {
        Row: {
          category_id: string | null;
          created_at: string;
          description: string | null;
          icon: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_subcategories_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      business_partners: {
        Row: {
          address: string | null;
          business_hours: string | null;
          category_id: string | null;
          created_at: string;
          delivery_fee_label: string | null;
          description: string | null;
          estimated_time: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          is_open: boolean;
          latitude: number | null;
          longitude: number | null;
          name: string;
          owner_email: string | null;
          owner_name: string | null;
          owner_phone: string | null;
          partner_notes: string | null;
          phone: string | null;
          rating: number | null;
          restaurant_id: string | null;
          status: string;
          subcategory_id: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          business_hours?: string | null;
          category_id?: string | null;
          created_at?: string;
          delivery_fee_label?: string | null;
          description?: string | null;
          estimated_time?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_open?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
          owner_email?: string | null;
          owner_name?: string | null;
          owner_phone?: string | null;
          partner_notes?: string | null;
          phone?: string | null;
          rating?: number | null;
          restaurant_id?: string | null;
          status?: string;
          subcategory_id?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          business_hours?: string | null;
          category_id?: string | null;
          created_at?: string;
          delivery_fee_label?: string | null;
          description?: string | null;
          estimated_time?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_open?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
          owner_email?: string | null;
          owner_name?: string | null;
          owner_phone?: string | null;
          partner_notes?: string | null;
          phone?: string | null;
          rating?: number | null;
          restaurant_id?: string | null;
          status?: string;
          subcategory_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'business_partners_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'business_partners_restaurant_id_fkey';
            columns: ['restaurant_id'];
            referencedRelation: 'restaurants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'business_partners_subcategory_id_fkey';
            columns: ['subcategory_id'];
            referencedRelation: 'service_subcategories';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_delivery_rate_profiles: {
        Row: {
          base_fee: number;
          base_km: number;
          category_id: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          is_manual_quote: boolean;
          minimum_fee: number;
          name: string;
          partner_id: string | null;
          per_km_fee: number;
          service_fee: number;
          service_type: string;
          subcategory_id: string | null;
          updated_at: string;
        };
        Insert: {
          base_fee?: number;
          base_km?: number;
          category_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_manual_quote?: boolean;
          minimum_fee?: number;
          name: string;
          partner_id?: string | null;
          per_km_fee?: number;
          service_fee?: number;
          service_type: string;
          subcategory_id?: string | null;
          updated_at?: string;
        };
        Update: {
          base_fee?: number;
          base_km?: number;
          category_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_manual_quote?: boolean;
          minimum_fee?: number;
          name?: string;
          partner_id?: string | null;
          per_km_fee?: number;
          service_fee?: number;
          service_type?: string;
          subcategory_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_delivery_rate_profiles_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_delivery_rate_profiles_partner_id_fkey';
            columns: ['partner_id'];
            referencedRelation: 'business_partners';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_delivery_rate_profiles_subcategory_id_fkey';
            columns: ['subcategory_id'];
            referencedRelation: 'service_subcategories';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_users: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          is_active: boolean;
          partner_id: string;
          phone: string | null;
          role: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          partner_id: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          partner_id?: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_users_partner_id_fkey';
            columns: ['partner_id'];
            referencedRelation: 'business_partners';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_products: {
        Row: {
          category_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          image_path: string | null;
          image_url: string | null;
          is_active: boolean;
          is_available: boolean;
          name: string;
          partner_id: string;
          price: number;
          sku: string | null;
          sort_order: number;
          subcategory_id: string | null;
          unit_label: string | null;
          updated_at: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          is_available?: boolean;
          name: string;
          partner_id: string;
          price?: number;
          sku?: string | null;
          sort_order?: number;
          subcategory_id?: string | null;
          unit_label?: string | null;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          is_available?: boolean;
          name?: string;
          partner_id?: string;
          price?: number;
          sku?: string | null;
          sort_order?: number;
          subcategory_id?: string | null;
          unit_label?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_products_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_products_partner_id_fkey';
            columns: ['partner_id'];
            referencedRelation: 'business_partners';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_products_subcategory_id_fkey';
            columns: ['subcategory_id'];
            referencedRelation: 'service_subcategories';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_product_audit: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          new_data: Json | null;
          old_data: Json | null;
          partner_id: string | null;
          product_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
          partner_id?: string | null;
          product_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
          partner_id?: string | null;
          product_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_product_audit_partner_id_fkey';
            columns: ['partner_id'];
            referencedRelation: 'business_partners';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_product_audit_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'partner_products';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_orders: {
        Row: {
          accepted_at: string | null;
          assigned_at: string | null;
          assigned_rider_id: string | null;
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          customer_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          customer_tracking_token: string | null;
          customer_tracking_token_created_at: string | null;
          delivery_address: string | null;
          delivery_fee: number;
          delivery_lat: number | null;
          delivery_lng: number | null;
          id: string;
          notes: string | null;
          partner_id: string;
          partner_status: string;
          payment_method: string;
          rider_status: string | null;
          service_fee: number;
          status: PartnerOrderStatus;
          subtotal: number;
          total_amount: number;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          assigned_at?: string | null;
          assigned_rider_id?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_tracking_token?: string | null;
          customer_tracking_token_created_at?: string | null;
          delivery_address?: string | null;
          delivery_fee?: number;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          id?: string;
          notes?: string | null;
          partner_id: string;
          partner_status?: string;
          payment_method?: string;
          rider_status?: string | null;
          service_fee?: number;
          status?: PartnerOrderStatus;
          subtotal?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          assigned_at?: string | null;
          assigned_rider_id?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_tracking_token?: string | null;
          customer_tracking_token_created_at?: string | null;
          delivery_address?: string | null;
          delivery_fee?: number;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          id?: string;
          notes?: string | null;
          partner_id?: string;
          partner_status?: string;
          payment_method?: string;
          rider_status?: string | null;
          service_fee?: number;
          status?: PartnerOrderStatus;
          subtotal?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_orders_assigned_rider_id_fkey';
            columns: ['assigned_rider_id'];
            referencedRelation: 'riders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_orders_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_orders_partner_id_fkey';
            columns: ['partner_id'];
            referencedRelation: 'business_partners';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_order_items: {
        Row: {
          created_at: string;
          id: string;
          line_total: number;
          partner_order_id: string;
          product_description: string | null;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          line_total?: number;
          partner_order_id: string;
          product_description?: string | null;
          product_id?: string | null;
          product_name: string;
          quantity?: number;
          unit_price?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          line_total?: number;
          partner_order_id?: string;
          product_description?: string | null;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_order_items_partner_order_id_fkey';
            columns: ['partner_order_id'];
            referencedRelation: 'partner_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_order_items_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'partner_products';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_order_status_logs: {
        Row: {
          changed_by: string | null;
          created_at: string;
          id: string;
          new_status: PartnerOrderStatus;
          note: string | null;
          old_status: PartnerOrderStatus | null;
          partner_order_id: string;
        };
        Insert: {
          changed_by?: string | null;
          created_at?: string;
          id?: string;
          new_status: PartnerOrderStatus;
          note?: string | null;
          old_status?: PartnerOrderStatus | null;
          partner_order_id: string;
        };
        Update: {
          changed_by?: string | null;
          created_at?: string;
          id?: string;
          new_status?: PartnerOrderStatus;
          note?: string | null;
          old_status?: PartnerOrderStatus | null;
          partner_order_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_order_status_logs_partner_order_id_fkey';
            columns: ['partner_order_id'];
            referencedRelation: 'partner_orders';
            referencedColumns: ['id'];
          },
        ];
      };
      restaurants: {
        Row: {
          address: string;
          category: string;
          created_at: string;
          delivery_fee: number;
          description: string | null;
          estimated_delivery_time: string;
          estimated_prep_minutes: number;
          id: string;
          image_url: string | null;
          is_active: boolean;
          latitude: number | null;
          longitude: number | null;
          name: string;
          opening_hours: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address: string;
          category?: string;
          created_at?: string;
          delivery_fee?: number;
          description?: string | null;
          estimated_delivery_time?: string;
          estimated_prep_minutes?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
          opening_hours?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string;
          category?: string;
          created_at?: string;
          delivery_fee?: number;
          description?: string | null;
          estimated_delivery_time?: string;
          estimated_prep_minutes?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
          opening_hours?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_categories: {
        Row: {
          created_at: string;
          display_order: number;
          id: string;
          is_active: boolean;
          name: string;
          restaurant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          name: string;
          restaurant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          restaurant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'menu_categories_restaurant_id_fkey';
            columns: ['restaurant_id'];
            referencedRelation: 'restaurants';
            referencedColumns: ['id'];
          },
        ];
      };
      menu_items: {
        Row: {
          category_id: string;
          created_at: string;
          description: string | null;
          display_order: number;
          id: string;
          image_url: string | null;
          is_available: boolean;
          name: string;
          price: number;
          restaurant_id: string;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          is_available?: boolean;
          name: string;
          price: number;
          restaurant_id: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          is_available?: boolean;
          name?: string;
          price?: number;
          restaurant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'menu_items_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'menu_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'menu_items_restaurant_id_fkey';
            columns: ['restaurant_id'];
            referencedRelation: 'restaurants';
            referencedColumns: ['id'];
          },
        ];
      };
      food_orders: {
        Row: {
          assigned_rider_id: string | null;
          created_at: string;
          customer_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          delivery_fee: number;
          delivery_distance_km: number | null;
          delivery_lat: number | null;
          delivery_lng: number | null;
          delivery_location: string;
          id: string;
          notes: string | null;
          order_subtotal: number | null;
          order_total: number | null;
          payment_method: PaymentMethod;
          partner_id: string | null;
          partner_notification_status: string;
          partner_notified_at: string | null;
          restaurant_id: string;
          service_fee: number | null;
          status: FoodOrderStatus;
          subtotal: number;
          total_amount: number;
          updated_at: string;
        };
        Insert: {
          assigned_rider_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          delivery_fee?: number;
          delivery_distance_km?: number | null;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          delivery_location: string;
          id?: string;
          notes?: string | null;
          order_subtotal?: number | null;
          order_total?: number | null;
          payment_method?: PaymentMethod;
          partner_id?: string | null;
          partner_notification_status?: string;
          partner_notified_at?: string | null;
          restaurant_id: string;
          service_fee?: number | null;
          status?: FoodOrderStatus;
          subtotal?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Update: {
          assigned_rider_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          delivery_fee?: number;
          delivery_distance_km?: number | null;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          delivery_location?: string;
          id?: string;
          notes?: string | null;
          order_subtotal?: number | null;
          order_total?: number | null;
          payment_method?: PaymentMethod;
          partner_id?: string | null;
          partner_notification_status?: string;
          partner_notified_at?: string | null;
          restaurant_id?: string;
          service_fee?: number | null;
          status?: FoodOrderStatus;
          subtotal?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'food_orders_assigned_rider_id_fkey';
            columns: ['assigned_rider_id'];
            referencedRelation: 'riders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'food_orders_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'food_orders_restaurant_id_fkey';
            columns: ['restaurant_id'];
            referencedRelation: 'restaurants';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_order_notifications: {
        Row: {
          created_at: string;
          food_order_id: string | null;
          id: string;
          message: string;
          notification_type: string;
          partner_order_id: string | null;
          partner_id: string;
          read_at: string | null;
          status: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          food_order_id?: string | null;
          id?: string;
          message: string;
          notification_type?: string;
          partner_order_id?: string | null;
          partner_id: string;
          read_at?: string | null;
          status?: string;
          title: string;
        };
        Update: {
          created_at?: string;
          food_order_id?: string | null;
          id?: string;
          message?: string;
          notification_type?: string;
          partner_order_id?: string | null;
          partner_id?: string;
          read_at?: string | null;
          status?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_order_notifications_food_order_id_fkey';
            columns: ['food_order_id'];
            referencedRelation: 'food_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_order_notifications_partner_order_id_fkey';
            columns: ['partner_order_id'];
            referencedRelation: 'partner_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_order_notifications_partner_id_fkey';
            columns: ['partner_id'];
            referencedRelation: 'business_partners';
            referencedColumns: ['id'];
          },
        ];
      };
      food_order_status_logs: {
        Row: {
          created_at: string;
          food_order_id: string;
          id: string;
          message: string | null;
          status: FoodOrderStatus;
        };
        Insert: {
          created_at?: string;
          food_order_id: string;
          id?: string;
          message?: string | null;
          status: FoodOrderStatus;
        };
        Update: {
          created_at?: string;
          food_order_id?: string;
          id?: string;
          message?: string | null;
          status?: FoodOrderStatus;
        };
        Relationships: [
          {
            foreignKeyName: 'food_order_status_logs_food_order_id_fkey';
            columns: ['food_order_id'];
            referencedRelation: 'food_orders';
            referencedColumns: ['id'];
          },
        ];
      };
      food_order_items: {
        Row: {
          created_at: string;
          food_order_id: string;
          id: string;
          item_name: string;
          line_total: number;
          menu_item_id: string | null;
          notes: string | null;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          food_order_id: string;
          id?: string;
          item_name: string;
          line_total: number;
          menu_item_id?: string | null;
          notes?: string | null;
          quantity?: number;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          food_order_id?: string;
          id?: string;
          item_name?: string;
          line_total?: number;
          menu_item_id?: string | null;
          notes?: string | null;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'food_order_items_food_order_id_fkey';
            columns: ['food_order_id'];
            referencedRelation: 'food_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'food_order_items_menu_item_id_fkey';
            columns: ['menu_item_id'];
            referencedRelation: 'menu_items';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_partner_order_with_items: {
        Args: {
          p_customer_id: string | null;
          p_customer_name: string | null;
          p_customer_phone: string | null;
          p_delivery_address: string | null;
          p_delivery_lat: number | null;
          p_delivery_lng: number | null;
          p_delivery_fee?: number | null;
          p_items: Json;
          p_notes: string | null;
          p_partner_id: string;
          p_payment_method: string | null;
          p_service_fee?: number | null;
          p_total_amount?: number | null;
        };
        Returns: Json;
      };
      get_assigned_partner_orders_for_rider: {
        Args: {
          target_rider_id: string;
        };
        Returns: Json;
      };
      get_partner_order_by_tracking_token: {
        Args: {
          p_order_id: string;
          p_tracking_token: string;
        };
        Returns: Json;
      };
      update_partner_order_status_for_rider: {
        Args: {
          next_status: string;
          target_partner_order_id: string;
          target_rider_id: string;
        };
        Returns: Json;
      };
      get_partner_order_items_by_tracking_token: {
        Args: {
          p_order_id: string;
          p_tracking_token: string;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<TableName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TableName]['Row'];

export type TablesInsert<TableName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TableName]['Insert'];

export type TablesUpdate<TableName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TableName]['Update'];
