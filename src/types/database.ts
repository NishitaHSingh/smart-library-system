export type UserRole = 'STUDENT' | 'LIBRARIAN' | 'ADMIN';

export type CopyStatus = 'AVAILABLE' | 'ISSUED' | 'RESERVED' | 'OVERDUE';

export type BorrowingStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE';

export type RenewalRequestStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export const MAX_LOAN_RENEWALS = 2;

export type MITDepartment =
  | 'Computer Science & Engineering'
  | 'Computer Science & Design'
  | 'Artificial Intelligence & Data Science'
  | 'Mechanical Engineering'
  | 'Civil Engineering'
  | 'Electrical & Electronics Engineering'
  | 'Basic Sciences & Humanities'
  | 'Library & Administration'
  | 'Other';

export const MIT_DEPARTMENTS: MITDepartment[] = [
  'Computer Science & Engineering',
  'Computer Science & Design',
  'Artificial Intelligence & Data Science',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical & Electronics Engineering',
  'Basic Sciences & Humanities',
  'Library & Administration',
  'Other',
];

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string;
  roll_no: string;
  department: MITDepartment | string;
  created_at?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  total_copies: number;
  available_copies: number;
  published_year?: number;
  publisher?: string;
  copies?: BookCopy[];
}

export interface BookCopy {
  id: string;
  book_id: string;
  accession_number: string;
  floor: string;
  rack: string;
  shelf: string;
  status: CopyStatus;
  reserved_by_user_id?: string | null;
  reserved_by_name?: string | null;
  reserved_by_roll_no?: string | null;
  reserved_at?: string | null;
  reserved_for_date?: string | null;
  reservation_expires_at?: string | null;
  reservation_notes?: string | null;
  book?: Book;
}

export interface Borrowing {
  id: string;
  copy_id: string;
  user_id: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: BorrowingStatus;
  fine_started?: boolean;
  fine_started_at?: string | null;
  renewal_count?: number;
  renewal_status?: RenewalRequestStatus;
  renewal_requested_at?: string | null;
  copy?: BookCopy;
  book?: Book;
  profile?: Profile;
  fine?: Fine | null;
}

export interface Fine {
  id: string;
  borrowing_id: string;
  user_id: string;
  amount: number;
  is_paid: boolean;
  calculated_at?: string;
  paid_at?: string | null;
}

export interface ReservationRecord {
  id: string;
  copy_id: string;
  book_id: string;
  user_id: string;
  reserved_at: string;
  pickup_deadline: string;
  notes?: string;
  status: 'ACTIVE' | 'FULFILLED' | 'CANCELLED';
}

export interface ActivityMetricDay {
  day: string;
  date: string;
  issued: number;
  returned: number;
}

export interface CategoryDistributionItem {
  category: string;
  books: number;
  copies: number;
  issued: number;
}

export type DigitalResourceType =
  | 'NPTEL_VIDEO'
  | 'RESEARCH_PAPER'
  | 'JOURNAL_ARTICLE'
  | 'BOOK_PDF';

export interface DigitalResource {
  id: string;
  title: string;
  author_or_source: string;
  type: DigitalResourceType;
  department: MITDepartment | string;
  url: string;
  description: string;
  published_year: number;
}

export interface BookReview {
  id: string;
  book_id: string;
  user_id: string;
  user_name: string;
  roll_no: string;
  department: string;
  rating: number; // 1 to 5
  comment: string;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  book_id: string;
  user_id: string;
  added_at: string;
}

export type NotificationCategory =
  | 'DUE_DATE'
  | 'FINE_PAYMENT'
  | 'RESERVATION'
  | 'CIRCULATION';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export interface LibraryNotification {
  id: string;
  user_id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  reference_id?: string;
}

export interface LibraryEntryLog {
  id: string;
  user_id: string;
  user_name: string;
  roll_no: string;
  department: string;
  gate_code: string;
  gate_location: string;
  entry_timestamp: string;
  exit_timestamp?: string | null;
  status: 'CHECKED_IN' | 'CHECKED_OUT';
}

export interface FloorLayoutConfig {
  id: string;
  floor_name: string;
  wing_subtitle: string;
  aisle_label: string;
  gate_label: string;
  desk_label: string;
  study_zone_label: string;
  columns_per_row: 3 | 4;
  racks: string[];
}






