export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<{
        id: string;
        email: string;
        full_name: string;
        role: 'admin' | 'librarian' | 'student' | 'teacher' | 'staff';
        approval_status: 'pending' | 'approved' | 'rejected';
        member_category: 'student' | 'teacher' | 'staff';
        class_or_department: string;
        phone: string;
        created_at: string;
        avatar_url: string | null;
      }>;
      books: Table<{
        id: string;
        title: string;
        author: string;
        isbn: string;
        book_code: string;
        publisher: string;
        publication_year: number;
        category: string;
        description: string;
        cover_image: string;
        total_stock: number;
        available_stock: number;
        shelf_location: string;
        is_digital: boolean;
        digital_file_url: string | null;
        page_count: number | null;
        rating: number;
        review_count: number;
        created_at: string;
      }>;
      members: Table<{
        id: string;
        user_id: string | null;
        full_name: string;
        member_number: string;
        category: 'student' | 'teacher' | 'staff';
        class_or_department: string;
        email: string;
        phone: string;
        registration_date: string;
        status: 'active' | 'inactive' | 'suspended';
        avatar: string | null;
        active_loans: number;
        total_borrowed: number;
        created_at: string;
      }>;
      transactions: Table<{
        id: string;
        transaction_id: string;
        member_id: string;
        member_name: string;
        member_number: string;
        borrowing_date: string;
        due_date: string;
        return_date: string | null;
        status: 'active' | 'returned' | 'overdue' | 'extended';
        extended_days: number | null;
        fine: number | null;
        created_at: string;
      }>;
      transaction_books: Table<{
        transaction_id: string;
        book_id: string;
        title: string;
        book_code: string;
        cover_image: string;
      }>;
      reservations: Table<{
        id: string;
        member_id: string;
        book_id: string;
        reservation_date: string;
        status: 'pending' | 'ready' | 'fulfilled' | 'cancelled';
        queue_position: number | null;
        created_at: string;
      }>;
      reviews: Table<{
        id: string;
        book_id: string;
        member_id: string;
        member_name: string;
        rating: number;
        comment: string;
        created_at: string;
      }>;
      wishlists: Table<{
        member_id: string;
        book_id: string;
        created_at: string;
      }>;
      notifications: Table<{
        id: string;
        user_id: string;
        type: 'due_date' | 'overdue' | 'reservation' | 'borrowing' | 'return' | 'announcement';
        title: string;
        message: string;
        link: string | null;
        reference_id: string | null;
        event_date: string | null;
        read_at: string | null;
        created_at: string;
      }>;
      fines: Table<{
        id: string;
        transaction_id: string;
        member_id: string;
        fine_amount: number;
        status: 'unpaid' | 'paid' | 'waived';
        issued_date: string;
        paid_date: string | null;
        updated_at: string;
      }>;
      procurements: Table<{
        id: string;
        book_id: string | null;
        stock_received: boolean;
        book_title: string;
        author: string;
        source: 'purchase' | 'donation' | 'exchange';
        quantity: number;
        acquisition_date: string;
        status: 'pending' | 'received' | 'processed';
        cost: number | null;
        created_by: string | null;
        created_at: string;
      }>;
      library_settings: Table<{
        singleton: boolean;
        library_name: string;
        library_address: string;
        library_phone: string;
        library_email: string;
        max_borrow_days: number;
        max_books_per_member: number;
        fine_per_day: number;
        max_fine: number;
        automatic_fines: boolean;
        allow_extensions: boolean;
        max_extensions: number;
        notification_preferences: Json;
        updated_at: string;
        updated_by: string | null;
      }>;
      reading_progress: Table<{
        user_id: string;
        book_id: string;
        current_page: number;
        updated_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      get_member_directory: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          full_name: string;
          member_number: string;
          category: 'student' | 'teacher' | 'staff';
          avatar: string | null;
        }[];
      };
      get_total_member_count: { Args: Record<PropertyKey, never>; Returns: number };
      update_my_profile_avatar: { Args: { p_avatar_path: string }; Returns: undefined };
      is_approved_user: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      has_staff_access: { Args: Record<PropertyKey, never>; Returns: boolean };
      owns_member: { Args: { p_member_id: string }; Returns: boolean };
      owns_transaction: { Args: { p_transaction_id: string }; Returns: boolean };
      create_borrowing: {
        Args: {
          p_member_id: string;
          p_book_ids: string[];
          p_borrowing_date: string;
          p_due_date: string;
        };
        Returns: string;
      };
      return_borrowing: {
        Args: { p_transaction_id: string; p_return_date: string; p_fine?: number | null };
        Returns: undefined;
      };
      create_reservation: { Args: { p_book_id: string }; Returns: string };
      cancel_reservation: { Args: { p_reservation_id: string }; Returns: undefined };
      set_reservation_status: {
        Args: { p_reservation_id: string; p_status: string };
        Returns: undefined;
      };
      extend_borrowing: { Args: { p_transaction_id: string }; Returns: string };
      refresh_my_due_notifications: { Args: Record<PropertyKey, never>; Returns: undefined };
      mark_my_notification_read: {
        Args: { p_notification_id: string };
        Returns: undefined;
      };
      mark_all_my_notifications_read: { Args: Record<PropertyKey, never>; Returns: undefined };
      save_my_reading_progress: {
        Args: { p_book_id: string; p_current_page: number };
        Returns: undefined;
      };
      update_my_profile: {
        Args: { p_full_name: string; p_phone: string; p_class_or_department: string };
        Returns: undefined;
      };
      update_member_details: {
        Args: {
          p_member_id: string;
          p_full_name: string;
          p_email: string;
          p_phone: string;
          p_class_or_department: string;
          p_category: 'student' | 'teacher' | 'staff';
          p_status: string;
        };
        Returns: undefined;
      };
      set_fine_status: {
        Args: { p_fine_id: string; p_status: string };
        Returns: undefined;
      };
      receive_procurement: {
        Args: { p_procurement_id: string; p_book_id?: string | null };
        Returns: string;
      };
    };
    Enums: {
      app_role: 'admin' | 'librarian' | 'student' | 'teacher' | 'staff';
      approval_status: 'pending' | 'approved' | 'rejected';
      member_category: 'student' | 'teacher' | 'staff';
    };
    CompositeTypes: Record<string, never>;
  };
}
