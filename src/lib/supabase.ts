import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Profile,
  Book,
  BookCopy,
  Borrowing,
  Fine,
  UserRole,
  MITDepartment,
  BookReview,
  WishlistItem,
  LibraryNotification,
  LibraryEntryLog,
  FloorLayoutConfig,
  MAX_LOAN_RENEWALS,
} from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-id') &&
    supabaseAnonKey !== 'your-supabase-anon-key'
);

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured && supabaseUrl ? supabaseUrl : 'https://mit-smart-library.supabase.co',
  isSupabaseConfigured && supabaseAnonKey ? supabaseAnonKey : 'public-anon-key-placeholder'
);

const STORAGE_KEYS = {
  PROFILES: 'mit_lib_profiles_clean_v1',
  BOOKS: 'mit_lib_books_clean_v1',
  BOOK_COPIES: 'mit_lib_book_copies_clean_v1',
  BORROWINGS: 'mit_lib_borrowings_clean_v1',
  FINES: 'mit_lib_fines_clean_v1',
  REVIEWS: 'mit_lib_reviews_clean_v1',
  WISHLIST: 'mit_lib_wishlist_clean_v1',
  NOTIFICATIONS: 'mit_lib_notifications_clean_v1',
  ENTRY_LOGS: 'mit_lib_entry_logs_clean_v1',
  FLOOR_LAYOUTS: 'mit_lib_floor_layouts_clean_v1',
  ACTIVE_USER: 'mit_lib_active_user_clean_v1',
};

export const INITIAL_FLOOR_LAYOUTS: FloorLayoutConfig[] = [
  {
    id: 'fl-1',
    floor_name: 'Floor 1',
    wing_subtitle: 'Computer Science, CS & Design, and Basic Sciences Wing',
    aisle_label: 'Main Ground Stack Corridor — Floor 1',
    gate_label: 'QR ENTRANCE GATE (FLOOR 1)',
    desk_label: 'LIBRARIAN CIRCULATION DESK',
    study_zone_label: 'STUDENT SILENT READING ZONE',
    columns_per_row: 4,
    racks: ['Rack 1', 'Rack 2', 'Rack 3', 'Rack 6'],
  },
  {
    id: 'fl-2',
    floor_name: 'Floor 2',
    wing_subtitle: 'Artificial Intelligence, Data Science & Digital Lab Wing',
    aisle_label: 'Central Digital & AI Stack Aisle — Floor 2',
    gate_label: 'NORTH STAIR / ELEVATOR ENTRY',
    desk_label: 'DIGITAL REFERENCE HELP DESK',
    study_zone_label: 'COLLABORATIVE AI STUDY PODS',
    columns_per_row: 4,
    racks: ['Rack 1', 'Rack 2', 'Rack 3', 'Rack 4'],
  },
  {
    id: 'fl-3',
    floor_name: 'Floor 3',
    wing_subtitle: 'Mechanical, Civil & Electrical Engineering Core Stacks',
    aisle_label: 'Core Engineering Archive Aisle — Floor 3',
    gate_label: 'RESEARCH WING ACCESS GATE',
    desk_label: 'ARCHIVE & THESIS COUNTER',
    study_zone_label: 'POSTGRADUATE RESEARCH BAY',
    columns_per_row: 4,
    racks: ['Rack 1', 'Rack 4', 'Rack 5', 'Rack 6'],
  },
];

// No pre-filled fake user profiles, borrowings, fines, or reviews
export const INITIAL_PROFILES: Profile[] = [];
export const INITIAL_BORROWINGS: Borrowing[] = [];
export const INITIAL_FINES: Fine[] = [];
export const INITIAL_REVIEWS: BookReview[] = [];
export const INITIAL_WISHLIST: WishlistItem[] = [];
export const INITIAL_NOTIFICATIONS: LibraryNotification[] = [];
export const INITIAL_ENTRY_LOGS: LibraryEntryLog[] = [];

// Authentic MIT Central Library Academic Reference Catalogue
export const INITIAL_BOOKS: Book[] = [
  {
    id: 'bk-cs-01',
    title: 'Introduction to Algorithms (CLRS, 4th Edition)',
    author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
    isbn: '978-0262046305',
    category: 'Computer Science & Engineering',
    total_copies: 3,
    available_copies: 3,
    published_year: 2022,
    publisher: 'MIT Press',
  },
  {
    id: 'bk-csd-01',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    isbn: '978-1449373320',
    category: 'Computer Science & Design',
    total_copies: 2,
    available_copies: 2,
    published_year: 2021,
    publisher: "O'Reilly Media",
  },
  {
    id: 'bk-csd-02',
    title: 'The Design of Everyday Things',
    author: 'Don Norman',
    isbn: '978-0465050659',
    category: 'Computer Science & Design',
    total_copies: 2,
    available_copies: 2,
    published_year: 2013,
    publisher: 'Basic Books',
  },
  {
    id: 'bk-ai-01',
    title: 'Deep Learning: Foundations and Concepts',
    author: 'Christopher M. Bishop, Hugh Bishop',
    isbn: '978-3031454677',
    category: 'Artificial Intelligence & Data Science',
    total_copies: 2,
    available_copies: 2,
    published_year: 2024,
    publisher: 'Springer Nature',
  },
  {
    id: 'bk-ai-02',
    title: 'Artificial Intelligence: A Modern Approach (4th Edition)',
    author: 'Stuart Russell, Peter Norvig',
    isbn: '978-0134610993',
    category: 'Artificial Intelligence & Data Science',
    total_copies: 2,
    available_copies: 2,
    published_year: 2021,
    publisher: 'Pearson Academic',
  },
  {
    id: 'bk-cs-02',
    title: 'Operating System Concepts (10th Edition)',
    author: 'Abraham Silberschatz, Peter B. Galvin, Greg Gagne',
    isbn: '978-1119800361',
    category: 'Computer Science & Engineering',
    total_copies: 2,
    available_copies: 2,
    published_year: 2021,
    publisher: 'Wiley India',
  },
  {
    id: 'bk-me-01',
    title: 'Shigley’s Mechanical Engineering Design (11th Edition)',
    author: 'Richard G. Budynas, J. Keith Nisbett',
    isbn: '978-0073398211',
    category: 'Mechanical Engineering',
    total_copies: 2,
    available_copies: 2,
    published_year: 2020,
    publisher: 'McGraw-Hill Education',
  },
  {
    id: 'bk-ee-01',
    title: 'Modern Control Engineering (5th Edition)',
    author: 'Katsuhiko Ogata',
    isbn: '978-0136156734',
    category: 'Electrical & Electronics Engineering',
    total_copies: 2,
    available_copies: 2,
    published_year: 2019,
    publisher: 'Prentice Hall',
  },
  {
    id: 'bk-ce-01',
    title: 'Limit State Design of Reinforced Concrete',
    author: 'P.C. Varghese',
    isbn: '978-8120320390',
    category: 'Civil Engineering',
    total_copies: 2,
    available_copies: 2,
    published_year: 2020,
    publisher: 'PHI Learning',
  },
  {
    id: 'bk-bs-01',
    title: 'Advanced Engineering Mathematics (10th Edition)',
    author: 'Erwin Kreyszig',
    isbn: '978-0470458365',
    category: 'Basic Sciences & Humanities',
    total_copies: 2,
    available_copies: 2,
    published_year: 2021,
    publisher: 'Wiley',
  },
];

export const INITIAL_BOOK_COPIES: BookCopy[] = [
  // bk-cs-01
  { id: 'cp-001', book_id: 'bk-cs-01', accession_number: 'ACC-CS-001', floor: 'Floor 1', rack: 'Rack 1', shelf: 'Shelf A', status: 'AVAILABLE' },
  { id: 'cp-002', book_id: 'bk-cs-01', accession_number: 'ACC-CS-002', floor: 'Floor 1', rack: 'Rack 1', shelf: 'Shelf A', status: 'AVAILABLE' },
  { id: 'cp-003', book_id: 'bk-cs-01', accession_number: 'ACC-CS-003', floor: 'Floor 1', rack: 'Rack 1', shelf: 'Shelf B', status: 'AVAILABLE' },

  // bk-csd-01
  { id: 'cp-004', book_id: 'bk-csd-01', accession_number: 'ACC-CSD-001', floor: 'Floor 1', rack: 'Rack 3', shelf: 'Shelf A', status: 'AVAILABLE' },
  { id: 'cp-005', book_id: 'bk-csd-01', accession_number: 'ACC-CSD-002', floor: 'Floor 1', rack: 'Rack 3', shelf: 'Shelf B', status: 'AVAILABLE' },

  // bk-csd-02
  { id: 'cp-006', book_id: 'bk-csd-02', accession_number: 'ACC-CSD-003', floor: 'Floor 1', rack: 'Rack 3', shelf: 'Shelf C', status: 'AVAILABLE' },
  { id: 'cp-007', book_id: 'bk-csd-02', accession_number: 'ACC-CSD-004', floor: 'Floor 1', rack: 'Rack 3', shelf: 'Shelf C', status: 'AVAILABLE' },

  // bk-ai-01
  { id: 'cp-008', book_id: 'bk-ai-01', accession_number: 'ACC-AI-001', floor: 'Floor 2', rack: 'Rack 2', shelf: 'Shelf A', status: 'AVAILABLE' },
  { id: 'cp-009', book_id: 'bk-ai-01', accession_number: 'ACC-AI-002', floor: 'Floor 2', rack: 'Rack 2', shelf: 'Shelf A', status: 'AVAILABLE' },

  // bk-ai-02
  { id: 'cp-010', book_id: 'bk-ai-02', accession_number: 'ACC-AI-003', floor: 'Floor 2', rack: 'Rack 2', shelf: 'Shelf B', status: 'AVAILABLE' },
  { id: 'cp-011', book_id: 'bk-ai-02', accession_number: 'ACC-AI-004', floor: 'Floor 2', rack: 'Rack 2', shelf: 'Shelf B', status: 'AVAILABLE' },

  // bk-cs-02
  { id: 'cp-012', book_id: 'bk-cs-02', accession_number: 'ACC-CS-004', floor: 'Floor 1', rack: 'Rack 2', shelf: 'Shelf A', status: 'AVAILABLE' },
  { id: 'cp-013', book_id: 'bk-cs-02', accession_number: 'ACC-CS-005', floor: 'Floor 1', rack: 'Rack 2', shelf: 'Shelf A', status: 'AVAILABLE' },

  // bk-me-01
  { id: 'cp-014', book_id: 'bk-me-01', accession_number: 'ACC-ME-001', floor: 'Floor 3', rack: 'Rack 4', shelf: 'Shelf A', status: 'AVAILABLE' },
  { id: 'cp-015', book_id: 'bk-me-01', accession_number: 'ACC-ME-002', floor: 'Floor 3', rack: 'Rack 4', shelf: 'Shelf B', status: 'AVAILABLE' },

  // bk-ee-01
  { id: 'cp-016', book_id: 'bk-ee-01', accession_number: 'ACC-EE-001', floor: 'Floor 3', rack: 'Rack 1', shelf: 'Shelf C', status: 'AVAILABLE' },
  { id: 'cp-017', book_id: 'bk-ee-01', accession_number: 'ACC-EE-002', floor: 'Floor 3', rack: 'Rack 1', shelf: 'Shelf C', status: 'AVAILABLE' },

  // bk-ce-01
  { id: 'cp-018', book_id: 'bk-ce-01', accession_number: 'ACC-CE-001', floor: 'Floor 3', rack: 'Rack 5', shelf: 'Shelf A', status: 'AVAILABLE' },
  { id: 'cp-019', book_id: 'bk-ce-01', accession_number: 'ACC-CE-002', floor: 'Floor 3', rack: 'Rack 5', shelf: 'Shelf A', status: 'AVAILABLE' },

  // bk-bs-01
  { id: 'cp-020', book_id: 'bk-bs-01', accession_number: 'ACC-BS-001', floor: 'Floor 1', rack: 'Rack 6', shelf: 'Shelf D', status: 'AVAILABLE' },
  { id: 'cp-021', book_id: 'bk-bs-01', accession_number: 'ACC-BS-002', floor: 'Floor 1', rack: 'Rack 6', shelf: 'Shelf D', status: 'AVAILABLE' },
];

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mit-library-data-updated', { detail: { key } }));
    }
  } catch {
    // Ignore storage quota errors
  }
}

function pushNotification(params: {
  user_id: string;
  category: LibraryNotification['category'];
  severity: LibraryNotification['severity'];
  title: string;
  message: string;
  reference_id?: string;
}): void {
  const existing = readLocal<LibraryNotification[]>(
    STORAGE_KEYS.NOTIFICATIONS,
    INITIAL_NOTIFICATIONS
  );

  // Prevent duplicate identical reference notifications
  if (
    params.reference_id &&
    existing.some(
      (n) => n.user_id === params.user_id && n.reference_id === params.reference_id
    )
  ) {
    return;
  }

  const created: LibraryNotification = {
    id: `ntf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    user_id: params.user_id,
    category: params.category,
    severity: params.severity,
    title: params.title,
    message: params.message,
    created_at: new Date().toISOString(),
    is_read: false,
    reference_id: params.reference_id,
  };

  writeLocal(STORAGE_KEYS.NOTIFICATIONS, [created, ...existing]);
}

export function calculateOverdueFine(
  dueDateIso: string,
  returnDateIso?: string | null,
  fineStarted?: boolean,
  fineStartedAt?: string | null
): number {
  const reference = returnDateIso ? new Date(returnDateIso) : new Date();
  const due = new Date(dueDateIso);
  const diffMs = reference.getTime() - due.getTime();

  let overdueDays = 0;
  if (diffMs > 0) {
    overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  if (fineStarted) {
    // When Librarian explicitly starts the fining system for a book not returned:
    // Calculate days since fineStartedAt (minimum 1 day = ₹100) or overdueDays, whichever is higher
    const startRef = fineStartedAt ? new Date(fineStartedAt) : reference;
    const startedDiffMs = reference.getTime() - startRef.getTime();
    const startedDays = Math.max(1, Math.ceil(startedDiffMs / (1000 * 60 * 60 * 24)));
    overdueDays = Math.max(overdueDays, startedDays);
  }

  if (overdueDays <= 0) return 0;
  return Math.max(0, overdueDays * 100); // ₹100 per day
}

function computeReservationExpiryIso(reservedForDate?: string | null, reservedAtIso?: string | null): string {
  const now = new Date();
  const baseBookedAt = reservedAtIso ? new Date(reservedAtIso) : now;
  // 24 hours from booking time
  const plus24hFromBooking = new Date(baseBookedAt.getTime() + 24 * 60 * 60 * 1000);

  if (reservedForDate) {
    // Also allow 24 hours from the start of the scheduled pickup date if scheduled in the future
    const scheduledStart = new Date(`${reservedForDate}T00:00:00`);
    if (!Number.isNaN(scheduledStart.getTime())) {
      const plus24hFromScheduled = new Date(scheduledStart.getTime() + 24 * 60 * 60 * 1000);
      return plus24hFromScheduled.getTime() > plus24hFromBooking.getTime()
        ? plus24hFromScheduled.toISOString()
        : plus24hFromBooking.toISOString();
    }
  }
  return plus24hFromBooking.toISOString();
}

export const libraryRepository = {
  async fetchLibrarySnapshot(): Promise<{
    profiles: Profile[];
    books: Book[];
    bookCopies: BookCopy[];
    borrowings: Borrowing[];
    fines: Fine[];
  }> {
    if (isSupabaseConfigured) {
      try {
        const [profilesRes, booksRes, copiesRes, borrowingsRes, finesRes] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('books').select('*'),
          supabase.from('book_copies').select('*'),
          supabase.from('borrowings').select('*').order('issue_date', { ascending: false }),
          supabase.from('fines').select('*'),
        ]);

        if (
          !profilesRes.error &&
          !booksRes.error &&
          !copiesRes.error &&
          !borrowingsRes.error &&
          !finesRes.error &&
          booksRes.data &&
          booksRes.data.length > 0
        ) {
          return {
            profiles: profilesRes.data as Profile[],
            books: booksRes.data as Book[],
            bookCopies: copiesRes.data as BookCopy[],
            borrowings: borrowingsRes.data as Borrowing[],
            fines: finesRes.data as Fine[],
          };
        }
      } catch {
        // Fallback to local state when Supabase tables are not yet migrated
      }
    }

    const profiles = readLocal<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const books = readLocal<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    let bookCopies = readLocal<BookCopy[]>(STORAGE_KEYS.BOOK_COPIES, INITIAL_BOOK_COPIES);
    const borrowings = readLocal<Borrowing[]>(STORAGE_KEYS.BORROWINGS, INITIAL_BORROWINGS);
    const fines = readLocal<Fine[]>(STORAGE_KEYS.FINES, INITIAL_FINES);

    // Automatically cancel any RESERVED copy where the student did not take the book within 24 hours
    const nowMs = Date.now();
    let expiredAnyReservation = false;

    bookCopies = bookCopies.map((copy) => {
      if (copy.status !== 'RESERVED') return copy;

      const expiryIso =
        copy.reservation_expires_at ||
        computeReservationExpiryIso(copy.reserved_for_date, copy.reserved_at);
      const expiryMs = new Date(expiryIso).getTime();

      if (!Number.isNaN(expiryMs) && nowMs >= expiryMs) {
        expiredAnyReservation = true;
        const activeLoan = borrowings.find(
          (b) => b.copy_id === copy.id && b.return_date === null
        );
        const restoredStatus = activeLoan ? 'ISSUED' : 'AVAILABLE';
        const book = books.find((b) => b.id === copy.book_id);

        if (copy.reserved_by_user_id) {
          pushNotification({
            user_id: copy.reserved_by_user_id,
            category: 'RESERVATION',
            severity: 'WARNING',
            title: `Reservation Auto-Cancelled (24-Hr Window Expired): ${copy.accession_number}`,
            message: `Your reservation for "${book?.title || 'Library Volume'}" (${copy.accession_number}) was automatically cancelled because the book was not collected within 24 hours.`,
            reference_id: `res-expired-24h-${copy.id}-${copy.reserved_at || ''}`,
          });
        }

        return {
          ...copy,
          status: restoredStatus,
          reserved_by_user_id: null,
          reserved_by_name: null,
          reserved_by_roll_no: null,
          reserved_at: null,
          reserved_for_date: null,
          reservation_expires_at: null,
          reservation_notes: null,
        };
      }

      if (!copy.reservation_expires_at) {
        return {
          ...copy,
          reservation_expires_at: expiryIso,
        };
      }
      return copy;
    });

    if (expiredAnyReservation) {
      writeLocal(STORAGE_KEYS.BOOK_COPIES, bookCopies);
    }

    const syncedBooks = books.map((book) => {
      const copiesForBook = bookCopies.filter((c) => c.book_id === book.id);
      const availCount = copiesForBook.filter((c) => c.status === 'AVAILABLE').length;
      return {
        ...book,
        total_copies: copiesForBook.length || book.total_copies,
        available_copies: availCount,
        copies: copiesForBook,
      };
    });

    return {
      profiles,
      books: syncedBooks,
      bookCopies,
      borrowings,
      fines,
    };
  },

  getActiveUser(): Profile | null {
    const profiles = readLocal<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const saved = readLocal<Profile | null>(STORAGE_KEYS.ACTIVE_USER, null);
    if (saved) {
      const match = profiles.find((p) => p.id === saved.id);
      if (match) return match;
    }
    return null;
  },

  setActiveUser(profile: Profile | null): void {
    writeLocal(STORAGE_KEYS.ACTIVE_USER, profile);
  },

  async signInAccount(email: string, _password: string, preferredRole?: UserRole): Promise<Profile> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@mit.asia')) {
      throw new Error('Authentication requires an official @mit.asia institutional email address.');
    }

    if (isSupabaseConfigured) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: _password,
        });
        if (!authError && authData.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();
          if (profileData) {
            this.setActiveUser(profileData as Profile);
            return profileData as Profile;
          }
        }
      } catch {
        // Continue to local repository lookup
      }
    }

    const profiles = readLocal<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const existing = profiles.find((p) => p.email.toLowerCase() === cleanEmail);

    if (!existing) {
      throw new Error('Account not found for this @mit.asia email. Please Sign Up first to register your Roll No / PRN and department.');
    }

    const updatedProfile: Profile = preferredRole
      ? { ...existing, role: preferredRole }
      : existing;

    const updatedList = profiles.map((p) =>
      p.id === updatedProfile.id ? updatedProfile : p
    );
    writeLocal(STORAGE_KEYS.PROFILES, updatedList);
    this.setActiveUser(updatedProfile);
    return updatedProfile;
  },

  async signUpAccount(payload: {
    full_name: string;
    email: string;
    role: UserRole;
    phone: string;
    roll_no: string;
    department: MITDepartment | string;
    password: string;
  }): Promise<Profile> {
    const cleanEmail = payload.email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@mit.asia')) {
      throw new Error('Registration strictly requires an @mit.asia domain email.');
    }

    const newProfile: Profile = {
      id: `usr-${Date.now()}`,
      full_name: payload.full_name.trim(),
      email: cleanEmail,
      role: payload.role,
      phone: payload.phone.trim(),
      roll_no: payload.roll_no.trim().toUpperCase(),
      department: payload.department,
    };

    if (isSupabaseConfigured) {
      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: payload.password,
        });
        if (!signUpError && signUpData.user) {
          newProfile.id = signUpData.user.id;
          await supabase.from('profiles').upsert([newProfile]);
        }
      } catch {
        // Fallback to local storage persistence
      }
    }

    const profiles = readLocal<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const filtered = profiles.filter((p) => p.email.toLowerCase() !== cleanEmail);
    const updated = [newProfile, ...filtered];
    writeLocal(STORAGE_KEYS.PROFILES, updated);
    this.setActiveUser(newProfile);
    return newProfile;
  },

  async addBookWithCopy(params: {
    title: string;
    author: string;
    isbn: string;
    category: string;
    accession_number: string;
    floor: string;
    rack: string;
    shelf: string;
    publisher?: string;
  }): Promise<void> {
    const books = readLocal<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const copies = readLocal<BookCopy[]>(STORAGE_KEYS.BOOK_COPIES, INITIAL_BOOK_COPIES);

    const cleanAcc = params.accession_number.trim().toUpperCase();
    if (copies.some((c) => c.accession_number.toUpperCase() === cleanAcc)) {
      throw new Error(`Accession Number "${cleanAcc}" already exists.`);
    }

    let book = books.find(
      (b) =>
        b.isbn.trim().toLowerCase() === params.isbn.trim().toLowerCase() ||
        b.title.trim().toLowerCase() === params.title.trim().toLowerCase()
    );

    if (!book) {
      book = {
        id: `bk-${Date.now()}`,
        title: params.title.trim(),
        author: params.author.trim(),
        isbn: params.isbn.trim(),
        category: params.category,
        total_copies: 1,
        available_copies: 1,
        publisher: params.publisher?.trim() || 'Academic Press',
      };
      books.unshift(book);
    }

    const newCopy: BookCopy = {
      id: `cp-${Date.now()}`,
      book_id: book.id,
      accession_number: cleanAcc,
      floor: params.floor.trim() || 'Floor 1',
      rack: params.rack.trim() || 'Rack 1',
      shelf: params.shelf.trim() || 'Shelf A',
      status: 'AVAILABLE',
    };

    const nextCopies = [newCopy, ...copies];
    const bookIdx = books.findIndex((b) => b.id === book!.id);
    if (bookIdx !== -1) {
      const copiesForBook = nextCopies.filter((c) => c.book_id === book!.id);
      const avail = copiesForBook.filter((c) => c.status === 'AVAILABLE').length;
      books[bookIdx] = {
        ...books[bookIdx],
        total_copies: copiesForBook.length,
        available_copies: avail,
      };
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('books').upsert([books[bookIdx !== -1 ? bookIdx : 0]]);
        await supabase.from('book_copies').insert([newCopy]);
      } catch {
        // Local storage fallback
      }
    }

    writeLocal(STORAGE_KEYS.BOOKS, books);
    writeLocal(STORAGE_KEYS.BOOK_COPIES, nextCopies);
  },

  async updateBookCopyLocation(params: {
    copyId: string;
    accession_number: string;
    floor: string;
    rack: string;
    shelf: string;
  }): Promise<BookCopy> {
    const copies = readLocal<BookCopy[]>(STORAGE_KEYS.BOOK_COPIES, INITIAL_BOOK_COPIES);
    const idx = copies.findIndex((c) => c.id === params.copyId);
    if (idx === -1) {
      throw new Error('Physical book copy not found.');
    }

    const cleanAcc = params.accession_number.trim().toUpperCase();
    const duplicateAcc = copies.some(
      (c, i) => i !== idx && c.accession_number.toUpperCase() === cleanAcc
    );
    if (duplicateAcc) {
      throw new Error(`Accession Number "${cleanAcc}" is already assigned to another copy.`);
    }

    const updatedCopy: BookCopy = {
      ...copies[idx],
      accession_number: cleanAcc,
      floor: params.floor.trim() || 'Floor 1',
      rack: params.rack.trim() || 'Rack 1',
      shelf: params.shelf.trim() || 'Shelf A',
    };

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('book_copies')
          .update({
            accession_number: updatedCopy.accession_number,
            floor: updatedCopy.floor,
            rack: updatedCopy.rack,
            shelf: updatedCopy.shelf,
          })
          .eq('id', updatedCopy.id);
      } catch {
        // Local storage fallback
      }
    }

    const nextCopies = [...copies];
    nextCopies[idx] = updatedCopy;
    writeLocal(STORAGE_KEYS.BOOK_COPIES, nextCopies);
    return updatedCopy;
  },

  async removeBookCopy(copyId: string): Promise<void> {
    const books = readLocal<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const copies = readLocal<BookCopy[]>(STORAGE_KEYS.BOOK_COPIES, INITIAL_BOOK_COPIES);

    const targetCopy = copies.find((c) => c.id === copyId);
    if (!targetCopy) {
      throw new Error('Book copy not found.');
    }

    if (targetCopy.status === 'ISSUED' || targetCopy.status === 'OVERDUE') {
      throw new Error(
        `Cannot remove Accession "${targetCopy.accession_number}" while it is currently ISSUED to a student. Process its return first.`
      );
    }

    const nextCopies = copies.filter((c) => c.id !== copyId);
    const remainingForBook = nextCopies.filter((c) => c.book_id === targetCopy.book_id);

    let nextBooks: Book[];
    if (remainingForBook.length === 0) {
      // If that was the last physical copy, remove the book record too
      nextBooks = books.filter((b) => b.id !== targetCopy.book_id);
    } else {
      nextBooks = books.map((b) => {
        if (b.id !== targetCopy.book_id) return b;
        const avail = remainingForBook.filter((c) => c.status === 'AVAILABLE').length;
        return {
          ...b,
          total_copies: remainingForBook.length,
          available_copies: avail,
        };
      });
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('book_copies').delete().eq('id', copyId);
      } catch {
        // Local storage fallback
      }
    }

    writeLocal(STORAGE_KEYS.BOOK_COPIES, nextCopies);
    writeLocal(STORAGE_KEYS.BOOKS, nextBooks);
  },

  async removeEntireBook(bookId: string): Promise<void> {
    const books = readLocal<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const copies = readLocal<BookCopy[]>(STORAGE_KEYS.BOOK_COPIES, INITIAL_BOOK_COPIES);

    const copiesForBook = copies.filter((c) => c.book_id === bookId);
    const hasActiveLoan = copiesForBook.some(
      (c) => c.status === 'ISSUED' || c.status === 'OVERDUE'
    );
    if (hasActiveLoan) {
      throw new Error(
        'Cannot delete this book title because one or more physical copies are currently ISSUED to students.'
      );
    }

    const nextCopies = copies.filter((c) => c.book_id !== bookId);
    const nextBooks = books.filter((b) => b.id !== bookId);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('book_copies').delete().eq('book_id', bookId);
        await supabase.from('books').delete().eq('id', bookId);
      } catch {
        // Local storage fallback
      }
    }

    writeLocal(STORAGE_KEYS.BOOK_COPIES, nextCopies);
    writeLocal(STORAGE_KEYS.BOOKS, nextBooks);
  },

  async issueBookCopy(params: {
    rollNoOrStudentId: string;
    accessionNumber: string;
  }): Promise<{ borrowing: Borrowing; copy: BookCopy; student: Profile; book: Book }> {
    const cleanRoll = params.rollNoOrStudentId.trim().toUpperCase();
    const cleanAcc = params.accessionNumber.trim().toUpperCase();

    const profiles = readLocal<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const books = readLocal<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const copies = readLocal<BookCopy[]>(STORAGE_KEYS.BOOK_COPIES, INITIAL_BOOK_COPIES);
    const borrowings = readLocal<Borrowing[]>(STORAGE_KEYS.BORROWINGS, INITIAL_BORROWINGS);

    const student = profiles.find(
      (p) =>
        p.roll_no.toUpperCase() === cleanRoll ||
        p.id.toUpperCase() === cleanRoll ||
        p.email.toUpperCase() === cleanRoll
    );

    if (!student) {
      throw new Error(
        `No registered member found matching Roll No / ID "${params.rollNoOrStudentId}". Please ensure the student has signed up.`
      );
    }

    const copyIndex = copies.findIndex((c) => c.accession_number.toUpperCase() === cleanAcc);
    if (copyIndex === -1) {
      throw new Error(`Physical copy with Accession Number "${cleanAcc}" was not found in the catalogue.`);
    }

    const targetCopy = copies[copyIndex];
    if (targetCopy.status === 'ISSUED' || targetCopy.status === 'OVERDUE') {
      throw new Error(`Accession "${cleanAcc}" is currently ${targetCopy.status} and cannot be issued until returned.`);
    }

    if (
      targetCopy.status === 'RESERVED' &&
      targetCopy.reserved_by_user_id &&
      targetCopy.reserved_by_user_id !== student.id
    ) {
      throw new Error(`Accession "${cleanAcc}" is reserved for another patron.`);
    }

    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 14);

    const newBorrowing: Borrowing = {
      id: `brw-${Date.now()}`,
      copy_id: targetCopy.id,
      user_id: student.id,
      issue_date: issueDate.toISOString(),
      due_date: dueDate.toISOString(),
      return_date: null,
      status: 'ACTIVE',
      renewal_count: 0,
      renewal_status: 'NONE',
      renewal_requested_at: null,
    };

    const updatedCopy: BookCopy = {
      ...targetCopy,
      status: 'ISSUED',
      reserved_by_user_id: null,
      reserved_by_name: null,
      reserved_by_roll_no: null,
      reserved_at: null,
      reserved_for_date: null,
      reservation_expires_at: null,
      reservation_notes: null,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('borrowings').insert([newBorrowing]);
        await supabase
          .from('book_copies')
          .update({ status: 'ISSUED' })
          .eq('id', targetCopy.id);
      } catch {
        // Handled locally below
      }
    }

    const nextCopies = [...copies];
    nextCopies[copyIndex] = updatedCopy;
    const nextBorrowings = [newBorrowing, ...borrowings];

    const bookIndex = books.findIndex((b) => b.id === targetCopy.book_id);
    const targetBook = books[bookIndex];
    if (bookIndex !== -1) {
      const avail = nextCopies.filter((c) => c.book_id === targetBook.id && c.status === 'AVAILABLE').length;
      books[bookIndex] = { ...targetBook, available_copies: avail };
    }

    writeLocal(STORAGE_KEYS.BOOK_COPIES, nextCopies);
    writeLocal(STORAGE_KEYS.BORROWINGS, nextBorrowings);
    writeLocal(STORAGE_KEYS.BOOKS, books);

    pushNotification({
      user_id: student.id,
      category: 'DUE_DATE',
      severity: 'INFO',
      title: `Book Issued: ${targetBook?.title || updatedCopy.accession_number}`,
      message: `Accession ${updatedCopy.accession_number} has been issued to your account. Due date is ${dueDate.toLocaleDateString('en-IN')} (14-day loan period). Overdue fine is ₹100/day.`,
      reference_id: `issue-${newBorrowing.id}`,
    });

    return {
      borrowing: newBorrowing,
      copy: updatedCopy,
      student,
      book: targetBook,
    };
  },

  async returnBookCopy(params: {
    accessionNumberOrBorrowingId: string;
    collectFineNow?: boolean;
  }): Promise<{
    borrowing: Borrowing;
    copy: BookCopy;
    fineAmount: number;
    fineRecord: Fine | null;
    student: Profile | undefined;
    book: Book | undefined;
  }> {
    const query = params.accessionNumberOrBorrowingId.trim().toUpperCase();
    const profiles = readLocal<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const books = readLocal<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const copies = readLocal<BookCopy[]>(STORAGE_KEYS.BOOK_COPIES, INITIAL_BOOK_COPIES);
    const borrowings = readLocal<Borrowing[]>(STORAGE_KEYS.BORROWINGS, INITIAL_BORROWINGS);
    const fines = readLocal<Fine[]>(STORAGE_KEYS.FINES, INITIAL_FINES);

    const matchedCopy = copies.find((c) => c.accession_number.toUpperCase() === query);
    const borrowingIndex = borrowings.findIndex(
      (b) =>
        b.return_date === null &&
        (b.id.toUpperCase() === query || (matchedCopy && b.copy_id === matchedCopy.id))
    );

    if (borrowingIndex === -1) {
      throw new Error(`No active loan found for Accession Number or Loan ID "${params.accessionNumberOrBorrowingId}".`);
    }

    const activeBorrowing = borrowings[borrowingIndex];
    const copyIndex = copies.findIndex((c) => c.id === activeBorrowing.copy_id);
    if (copyIndex === -1) {
      throw new Error('Associated physical book copy could not be located.');
    }

    const returnIso = new Date().toISOString();
    const fineAmount = calculateOverdueFine(
      activeBorrowing.due_date,
      returnIso,
      activeBorrowing.fine_started,
      activeBorrowing.fine_started_at
    );

    const updatedBorrowing: Borrowing = {
      ...activeBorrowing,
      return_date: returnIso,
      status: 'RETURNED',
    };

    const updatedCopy: BookCopy = {
      ...copies[copyIndex],
      status: 'AVAILABLE',
      reserved_by_user_id: null,
      reserved_by_name: null,
      reserved_by_roll_no: null,
      reserved_at: null,
      reserved_for_date: null,
      reservation_expires_at: null,
      reservation_notes: null,
    };

    let fineRecord: Fine | null = null;
    let nextFines = [...fines];

    if (fineAmount > 0) {
      const existingFineIdx = nextFines.findIndex((f) => f.borrowing_id === activeBorrowing.id);
      fineRecord = {
        id: existingFineIdx !== -1 ? nextFines[existingFineIdx].id : `fn-${Date.now()}`,
        borrowing_id: activeBorrowing.id,
        user_id: activeBorrowing.user_id,
        amount: fineAmount,
        is_paid: Boolean(params.collectFineNow),
        calculated_at: returnIso,
        paid_at: params.collectFineNow ? returnIso : null,
      };
      if (existingFineIdx !== -1) {
        nextFines[existingFineIdx] = fineRecord;
      } else {
        nextFines = [fineRecord, ...nextFines];
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('borrowings')
          .update({ return_date: returnIso, status: 'RETURNED' })
          .eq('id', activeBorrowing.id);
        await supabase
          .from('book_copies')
          .update({ status: 'AVAILABLE' })
          .eq('id', updatedCopy.id);
        if (fineRecord) {
          await supabase.from('fines').upsert([fineRecord]);
        }
      } catch {
        // Handled locally below
      }
    }

    const nextCopies = [...copies];
    nextCopies[copyIndex] = updatedCopy;

    const nextBorrowings = [...borrowings];
    nextBorrowings[borrowingIndex] = updatedBorrowing;

    const bookIndex = books.findIndex((b) => b.id === updatedCopy.book_id);
    const targetBook = books[bookIndex];
    if (bookIndex !== -1) {
      const avail = nextCopies.filter((c) => c.book_id === targetBook.id && c.status === 'AVAILABLE').length;
      books[bookIndex] = { ...targetBook, available_copies: avail };
    }

    const previousReservedUserId = copies[copyIndex].reserved_by_user_id;

    writeLocal(STORAGE_KEYS.BOOK_COPIES, nextCopies);
    writeLocal(STORAGE_KEYS.BORROWINGS, nextBorrowings);
    writeLocal(STORAGE_KEYS.FINES, nextFines);
    writeLocal(STORAGE_KEYS.BOOKS, books);

    const student = profiles.find((p) => p.id === activeBorrowing.user_id);

    // Notify borrower about return & fine payment/assessment
    if (fineAmount > 0) {
      pushNotification({
        user_id: activeBorrowing.user_id,
        category: 'FINE_PAYMENT',
        severity: params.collectFineNow ? 'SUCCESS' : 'WARNING',
        title: params.collectFineNow
          ? `Overdue Fine Paid (₹${fineAmount})`
          : `Overdue Fine Assessed (₹${fineAmount})`,
        message: params.collectFineNow
          ? `Your returned copy ${updatedCopy.accession_number} (${targetBook?.title || 'Volume'}) had an overdue fine of ₹${fineAmount}, which has been marked PAID at the Librarian Desk.`
          : `Copy ${updatedCopy.accession_number} (${targetBook?.title || 'Volume'}) was returned past due. An unpaid fine of ₹${fineAmount} (₹100/day) has been posted to your account.`,
        reference_id: `return-fine-${activeBorrowing.id}`,
      });
    } else {
      pushNotification({
        user_id: activeBorrowing.user_id,
        category: 'CIRCULATION',
        severity: 'SUCCESS',
        title: `Book Returned On Time: ${updatedCopy.accession_number}`,
        message: `"${targetBook?.title || 'Library Volume'}" (${updatedCopy.accession_number}) was returned within the due date with ₹0 fine.`,
        reference_id: `return-ok-${activeBorrowing.id}`,
      });
    }

    // If another patron had reserved this copy, notify them that it is now available
    if (previousReservedUserId) {
      pushNotification({
        user_id: previousReservedUserId,
        category: 'RESERVATION',
        severity: 'SUCCESS',
        title: `Reserved Book Ready for Pickup: ${updatedCopy.accession_number}`,
        message: `"${targetBook?.title || 'Library Volume'}" (${updatedCopy.accession_number}) at ${updatedCopy.floor} · ${updatedCopy.rack} · ${updatedCopy.shelf} has been returned and is now AVAILABLE for you.`,
        reference_id: `res-ready-${activeBorrowing.id}-${previousReservedUserId}`,
      });
    }

    return {
      borrowing: updatedBorrowing,
      copy: updatedCopy,
      fineAmount,
      fineRecord,
      student,
      book: targetBook,
    };
  },

  async reserveBookCopy(params: {
    copyId: string;
    userId: string;
    reservedForDate?: string;
    notes?: string;
  }): Promise<BookCopy> {
    const copies = readLocal<BookCopy[]>(STORAGE_KEYS.BOOK_COPIES, INITIAL_BOOK_COPIES);
    const books = readLocal<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const profiles = readLocal<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);

    const idx = copies.findIndex((c) => c.id === params.copyId);
    if (idx === -1) {
      throw new Error('Selected book copy could not be found.');
    }

    const target = copies[idx];
    if (target.status === 'RESERVED') {
      throw new Error(`Copy ${target.accession_number} is already reserved.`);
    }

    const patron = profiles.find((p) => p.id === params.userId);
    const nowIso = new Date().toISOString();
    const scheduledDateStr =
      params.reservedForDate || nowIso.split('T')[0];
    const expiresAtIso = computeReservationExpiryIso(scheduledDateStr, nowIso);

    const updatedCopy: BookCopy = {
      ...target,
      status: 'RESERVED',
      reserved_by_user_id: params.userId,
      reserved_by_name: patron?.full_name || 'MIT Student',
      reserved_by_roll_no: patron?.roll_no || '',
      reserved_at: nowIso,
      reserved_for_date: scheduledDateStr,
      reservation_expires_at: expiresAtIso,
      reservation_notes: params.notes?.trim() || null,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('book_copies')
          .update({ status: 'RESERVED' })
          .eq('id', target.id);
      } catch {
        // Fallback to local state
      }
    }

    const nextCopies = [...copies];
    nextCopies[idx] = updatedCopy;

    const bookIdx = books.findIndex((b) => b.id === target.book_id);
    if (bookIdx !== -1) {
      const avail = nextCopies.filter((c) => c.book_id === books[bookIdx].id && c.status === 'AVAILABLE').length;
      books[bookIdx] = { ...books[bookIdx], available_copies: avail };
    }

    writeLocal(STORAGE_KEYS.BOOK_COPIES, nextCopies);
    writeLocal(STORAGE_KEYS.BOOKS, books);

    const reservedBook = books.find((b) => b.id === target.book_id);
    const formattedBookingDate = new Date(scheduledDateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    pushNotification({
      user_id: params.userId,
      category: 'RESERVATION',
      severity: 'INFO',
      title: `Book Reserved for ${formattedBookingDate}: ${target.accession_number}`,
      message: `Your booking/reservation on "${reservedBook?.title || 'Library Volume'}" (${target.accession_number}, ${target.floor} · ${target.rack} · ${target.shelf}) is confirmed for ${formattedBookingDate}. Note: If not collected within 24 hours, the reservation is automatically cancelled.`,
      reference_id: `res-placed-${target.id}-${Date.now()}`,
    });

    return updatedCopy;
  },

  async cancelReservation(
    copyId: string,
    userId: string,
    reason?: 'STUDENT_CANCELLED' | 'NOT_TAKEN_24H' | 'LIBRARIAN_CANCELLED'
  ): Promise<void> {
    const copies = readLocal<BookCopy[]>(STORAGE_KEYS.BOOK_COPIES, INITIAL_BOOK_COPIES);
    const books = readLocal<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const borrowings = readLocal<Borrowing[]>(STORAGE_KEYS.BORROWINGS, INITIAL_BORROWINGS);

    const idx = copies.findIndex((c) => c.id === copyId);
    if (idx === -1) {
      throw new Error('Reserved copy not found.');
    }

    const target = copies[idx];
    if (
      !reason &&
      target.reserved_by_user_id &&
      target.reserved_by_user_id !== userId
    ) {
      throw new Error('You can only cancel reservations placed under your own account.');
    }

    const previousUserId = target.reserved_by_user_id;
    const book = books.find((b) => b.id === target.book_id);

    // Check if the copy has an active loan (meaning it was reserved while issued)
    const activeLoan = borrowings.find(
      (b) => b.copy_id === target.id && b.return_date === null
    );

    const restoredStatus = activeLoan ? 'ISSUED' : 'AVAILABLE';

    const updatedCopy: BookCopy = {
      ...target,
      status: restoredStatus,
      reserved_by_user_id: null,
      reserved_by_name: null,
      reserved_by_roll_no: null,
      reserved_at: null,
      reserved_for_date: null,
      reservation_expires_at: null,
      reservation_notes: null,
    };

    const nextCopies = [...copies];
    nextCopies[idx] = updatedCopy;

    const bookIdx = books.findIndex((b) => b.id === target.book_id);
    if (bookIdx !== -1) {
      const avail = nextCopies.filter(
        (c) => c.book_id === books[bookIdx].id && c.status === 'AVAILABLE'
      ).length;
      books[bookIdx] = { ...books[bookIdx], available_copies: avail };
    }

    writeLocal(STORAGE_KEYS.BOOK_COPIES, nextCopies);
    writeLocal(STORAGE_KEYS.BOOKS, books);

    if (previousUserId && (reason === 'NOT_TAKEN_24H' || reason === 'LIBRARIAN_CANCELLED')) {
      pushNotification({
        user_id: previousUserId,
        category: 'RESERVATION',
        severity: 'WARNING',
        title: `Reservation Cancelled (Book Not Taken in 24 Hrs): ${target.accession_number}`,
        message: `Your reservation on "${book?.title || 'Library Volume'}" (${target.accession_number}) has been cancelled by the Librarian because the book was not collected within the 24-hour pickup window.`,
        reference_id: `res-cancelled-lib-${target.id}-${Date.now()}`,
      });
    }
  },

  async librarianConfirmReservationPickup(copyId: string): Promise<{
    borrowing: Borrowing;
    copy: BookCopy;
    student: Profile;
    book: Book | undefined;
  }> {
    const copies = readLocal<BookCopy[]>(STORAGE_KEYS.BOOK_COPIES, INITIAL_BOOK_COPIES);
    const profiles = readLocal<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);

    const targetCopy = copies.find((c) => c.id === copyId);
    if (!targetCopy) {
      throw new Error('Reserved copy not found.');
    }
    if (targetCopy.status !== 'RESERVED' || !targetCopy.reserved_by_user_id) {
      throw new Error('This copy does not have an active student reservation.');
    }

    const student = profiles.find((p) => p.id === targetCopy.reserved_by_user_id);
    const rollOrId =
      student?.roll_no || targetCopy.reserved_by_roll_no || targetCopy.reserved_by_user_id;

    return this.issueBookCopy({
      rollNoOrStudentId: rollOrId,
      accessionNumber: targetCopy.accession_number,
    });
  },

  async librarianMarkNotReturnedAndStartFine(borrowingId: string): Promise<{
    borrowing: Borrowing;
    copy: BookCopy | undefined;
    fineRecord: Fine;
    student: Profile | undefined;
    book: Book | undefined;
  }> {
    const profiles = readLocal<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const books = readLocal<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const copies = readLocal<BookCopy[]>(STORAGE_KEYS.BOOK_COPIES, INITIAL_BOOK_COPIES);
    const borrowings = readLocal<Borrowing[]>(STORAGE_KEYS.BORROWINGS, INITIAL_BORROWINGS);
    const fines = readLocal<Fine[]>(STORAGE_KEYS.FINES, INITIAL_FINES);

    const bIdx = borrowings.findIndex((b) => b.id === borrowingId && b.return_date === null);
    if (bIdx === -1) {
      throw new Error('Active loan record not found.');
    }

    const activeLoan = borrowings[bIdx];
    const nowIso = new Date().toISOString();
    const fineStartedAt = activeLoan.fine_started_at || nowIso;

    // Calculate overdue fine (at least ₹100/day once Librarian starts the fining system)
    const fineAmount = calculateOverdueFine(
      activeLoan.due_date,
      null,
      true,
      fineStartedAt
    );

    const updatedLoan: Borrowing = {
      ...activeLoan,
      status: 'OVERDUE',
      fine_started: true,
      fine_started_at: fineStartedAt,
    };

    const nextBorrowings = [...borrowings];
    nextBorrowings[bIdx] = updatedLoan;

    const copyIdx = copies.findIndex((c) => c.id === activeLoan.copy_id);
    let updatedCopy: BookCopy | undefined;
    const nextCopies = [...copies];
    if (copyIdx !== -1) {
      updatedCopy = {
        ...copies[copyIdx],
        status: 'OVERDUE',
      };
      nextCopies[copyIdx] = updatedCopy;
    }

    const existingFineIdx = fines.findIndex((f) => f.borrowing_id === activeLoan.id);
    const fineRecord: Fine = {
      id: existingFineIdx !== -1 ? fines[existingFineIdx].id : `fn-${Date.now()}`,
      borrowing_id: activeLoan.id,
      user_id: activeLoan.user_id,
      amount: fineAmount,
      is_paid: false,
      calculated_at: nowIso,
      paid_at: null,
    };

    let nextFines = [...fines];
    if (existingFineIdx !== -1) {
      nextFines[existingFineIdx] = fineRecord;
    } else {
      nextFines = [fineRecord, ...nextFines];
    }

    writeLocal(STORAGE_KEYS.BORROWINGS, nextBorrowings);
    writeLocal(STORAGE_KEYS.BOOK_COPIES, nextCopies);
    writeLocal(STORAGE_KEYS.FINES, nextFines);

    const student = profiles.find((p) => p.id === activeLoan.user_id);
    const book = books.find((b) => b.id === updatedCopy?.book_id);

    pushNotification({
      user_id: activeLoan.user_id,
      category: 'FINE_PAYMENT',
      severity: 'CRITICAL',
      title: `Book Marked Not Returned — ₹100/Day Fine Started: ${updatedCopy?.accession_number || ''}`,
      message: `The Librarian has marked "${book?.title || 'Borrowed Book'}" (${updatedCopy?.accession_number || ''}) as NOT RETURNED and activated the ₹100/day fining system. Current fine: ₹${fineAmount}. Please return the book immediately.`,
      reference_id: `fine-started-${activeLoan.id}-${Date.now()}`,
    });

    return {
      borrowing: updatedLoan,
      copy: updatedCopy,
      fineRecord,
      student,
      book,
    };
  },

  async requestLoanRenewal(borrowingId: string, userId: string): Promise<Borrowing> {
    const borrowings = readLocal<Borrowing[]>(STORAGE_KEYS.BORROWINGS, INITIAL_BORROWINGS);
    const copies = readLocal<BookCopy[]>(STORAGE_KEYS.BOOK_COPIES, INITIAL_BOOK_COPIES);
    const books = readLocal<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);

    const bIdx = borrowings.findIndex(
      (b) => b.id === borrowingId && b.return_date === null
    );
    if (bIdx === -1) {
      throw new Error('Active loan not found.');
    }

    const loan = borrowings[bIdx];
    if (loan.user_id !== userId) {
      throw new Error('You can only request renewal for your own active loans.');
    }

    const currentRenewals = loan.renewal_count || 0;
    if (currentRenewals >= MAX_LOAN_RENEWALS) {
      throw new Error(
        `Maximum renewal limit reached (${MAX_LOAN_RENEWALS}/${MAX_LOAN_RENEWALS} renewals used). Please return the book at the Librarian Desk.`
      );
    }

    if (loan.renewal_status === 'PENDING') {
      throw new Error('A renewal request for this loan is already pending Librarian approval.');
    }

    const liveFine = calculateOverdueFine(
      loan.due_date,
      null,
      loan.fine_started,
      loan.fine_started_at
    );
    if (liveFine > 0 || loan.fine_started) {
      throw new Error(
        'Overdue books with active fines cannot be renewed until the ₹100/day fine is settled.'
      );
    }

    const copy = copies.find((c) => c.id === loan.copy_id);
    if (
      copy?.status === 'RESERVED' &&
      copy.reserved_by_user_id &&
      copy.reserved_by_user_id !== userId
    ) {
      throw new Error(
        'This copy has been reserved by another student and cannot be renewed.'
      );
    }

    const book = books.find((b) => b.id === copy?.book_id);
    const nowIso = new Date().toISOString();

    const updatedLoan: Borrowing = {
      ...loan,
      renewal_status: 'PENDING',
      renewal_requested_at: nowIso,
    };

    const nextBorrowings = [...borrowings];
    nextBorrowings[bIdx] = updatedLoan;
    writeLocal(STORAGE_KEYS.BORROWINGS, nextBorrowings);

    pushNotification({
      user_id: userId,
      category: 'DUE_DATE',
      severity: 'INFO',
      title: `Renewal Request Submitted: ${copy?.accession_number || ''}`,
      message: `Your request to renew "${book?.title || 'Borrowed Book'}" (${copy?.accession_number || ''}) for +7 days is pending Librarian approval (${currentRenewals}/${MAX_LOAN_RENEWALS} renewals used).`,
      reference_id: `renew-req-${loan.id}-${Date.now()}`,
    });

    return updatedLoan;
  },

  async librarianHandleLoanRenewal(params: {
    borrowingId: string;
    decision: 'APPROVE' | 'REJECT';
  }): Promise<{
    borrowing: Borrowing;
    copy: BookCopy | undefined;
    student: Profile | undefined;
    book: Book | undefined;
  }> {
    const profiles = readLocal<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const books = readLocal<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const copies = readLocal<BookCopy[]>(STORAGE_KEYS.BOOK_COPIES, INITIAL_BOOK_COPIES);
    const borrowings = readLocal<Borrowing[]>(STORAGE_KEYS.BORROWINGS, INITIAL_BORROWINGS);

    const bIdx = borrowings.findIndex(
      (b) => b.id === params.borrowingId && b.return_date === null
    );
    if (bIdx === -1) {
      throw new Error('Active loan record not found.');
    }

    const loan = borrowings[bIdx];
    const currentRenewals = loan.renewal_count || 0;
    const copy = copies.find((c) => c.id === loan.copy_id);
    const book = books.find((b) => b.id === copy?.book_id);
    const student = profiles.find((p) => p.id === loan.user_id);

    if (params.decision === 'APPROVE') {
      if (currentRenewals >= MAX_LOAN_RENEWALS) {
        throw new Error(
          `Cannot approve: Student has already reached the maximum limit of ${MAX_LOAN_RENEWALS} renewals.`
        );
      }

      const currentDue = new Date(loan.due_date);
      const baseDate = currentDue.getTime() > Date.now() ? currentDue : new Date();
      const extendedDue = new Date(baseDate);
      extendedDue.setDate(extendedDue.getDate() + 7);

      const updatedLoan: Borrowing = {
        ...loan,
        due_date: extendedDue.toISOString(),
        renewal_count: currentRenewals + 1,
        renewal_status: 'APPROVED',
        renewal_requested_at: null,
      };

      const nextBorrowings = [...borrowings];
      nextBorrowings[bIdx] = updatedLoan;
      writeLocal(STORAGE_KEYS.BORROWINGS, nextBorrowings);

      pushNotification({
        user_id: loan.user_id,
        category: 'DUE_DATE',
        severity: 'SUCCESS',
        title: `Loan Renewal Approved (+7 Days): ${copy?.accession_number || ''}`,
        message: `The Librarian approved your renewal for "${book?.title || 'Borrowed Book'}" (${copy?.accession_number || ''}). New Due Date: ${extendedDue.toLocaleDateString('en-IN')} (Renewal ${updatedLoan.renewal_count}/${MAX_LOAN_RENEWALS}).`,
        reference_id: `renew-approved-${loan.id}-${Date.now()}`,
      });

      return { borrowing: updatedLoan, copy, student, book };
    } else {
      const updatedLoan: Borrowing = {
        ...loan,
        renewal_status: 'REJECTED',
        renewal_requested_at: null,
      };

      const nextBorrowings = [...borrowings];
      nextBorrowings[bIdx] = updatedLoan;
      writeLocal(STORAGE_KEYS.BORROWINGS, nextBorrowings);

      pushNotification({
        user_id: loan.user_id,
        category: 'DUE_DATE',
        severity: 'WARNING',
        title: `Loan Renewal Declined: ${copy?.accession_number || ''}`,
        message: `Your renewal request for "${book?.title || 'Borrowed Book'}" (${copy?.accession_number || ''}) was declined by the Librarian. Please return the volume by ${new Date(loan.due_date).toLocaleDateString('en-IN')}.`,
        reference_id: `renew-rejected-${loan.id}-${Date.now()}`,
      });

      return { borrowing: updatedLoan, copy, student, book };
    }
  },

  async markFinePaid(fineId: string): Promise<Fine> {
    const fines = readLocal<Fine[]>(STORAGE_KEYS.FINES, INITIAL_FINES);
    const idx = fines.findIndex((f) => f.id === fineId);
    if (idx === -1) {
      throw new Error('Fine record not found.');
    }

    const updated: Fine = {
      ...fines[idx],
      is_paid: true,
      paid_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('fines').update({ is_paid: true }).eq('id', fineId);
      } catch {
        // Local persistence fallback
      }
    }

    const next = [...fines];
    next[idx] = updated;
    writeLocal(STORAGE_KEYS.FINES, next);

    pushNotification({
      user_id: updated.user_id,
      category: 'FINE_PAYMENT',
      severity: 'SUCCESS',
      title: `Fine Payment Confirmed: ₹${updated.amount}`,
      message: `Your overdue fine payment of ₹${updated.amount} has been processed and cleared from your student ledger.`,
      reference_id: `fine-paid-${updated.id}`,
    });

    return updated;
  },

  getBookReviews(): BookReview[] {
    return readLocal<BookReview[]>(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
  },

  async submitBookReview(params: {
    bookId: string;
    user: Profile;
    rating: number;
    comment: string;
  }): Promise<BookReview> {
    if (params.rating < 1 || params.rating > 5) {
      throw new Error('Rating must be between 1 and 5 stars.');
    }

    const cleanComment = params.comment.trim();
    if (!cleanComment) {
      throw new Error('Please write a brief review or feedback comment.');
    }

    const reviews = readLocal<BookReview[]>(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
    const existingIdx = reviews.findIndex(
      (r) => r.book_id === params.bookId && r.user_id === params.user.id
    );

    const newReview: BookReview = {
      id: existingIdx !== -1 ? reviews[existingIdx].id : `rev-${Date.now()}`,
      book_id: params.bookId,
      user_id: params.user.id,
      user_name: params.user.full_name,
      roll_no: params.user.roll_no,
      department: params.user.department,
      rating: params.rating,
      comment: cleanComment,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('book_reviews').upsert([newReview]);
      } catch {
        // Local storage persistence fallback
      }
    }

    let nextReviews: BookReview[];
    if (existingIdx !== -1) {
      nextReviews = [...reviews];
      nextReviews[existingIdx] = newReview;
    } else {
      nextReviews = [newReview, ...reviews];
    }

    writeLocal(STORAGE_KEYS.REVIEWS, nextReviews);
    return newReview;
  },

  async deleteBookReview(reviewId: string, userId: string): Promise<void> {
    const reviews = readLocal<BookReview[]>(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
    const next = reviews.filter((r) => !(r.id === reviewId && r.user_id === userId));
    writeLocal(STORAGE_KEYS.REVIEWS, next);
  },

  getWishlist(): WishlistItem[] {
    return readLocal<WishlistItem[]>(STORAGE_KEYS.WISHLIST, INITIAL_WISHLIST);
  },

  toggleWishlistBook(bookId: string, userId: string): { added: boolean; items: WishlistItem[] } {
    const current = readLocal<WishlistItem[]>(STORAGE_KEYS.WISHLIST, INITIAL_WISHLIST);
    const existingIndex = current.findIndex(
      (item) => item.book_id === bookId && item.user_id === userId
    );

    let next: WishlistItem[];
    let added: boolean;

    if (existingIndex !== -1) {
      next = current.filter((_, i) => i !== existingIndex);
      added = false;
    } else {
      const newItem: WishlistItem = {
        id: `wsh-${Date.now()}`,
        book_id: bookId,
        user_id: userId,
        added_at: new Date().toISOString(),
      };
      next = [newItem, ...current];
      added = true;
    }

    writeLocal(STORAGE_KEYS.WISHLIST, next);
    return { added, items: next };
  },

  removeWishlistItem(bookId: string, userId: string): WishlistItem[] {
    const current = readLocal<WishlistItem[]>(STORAGE_KEYS.WISHLIST, INITIAL_WISHLIST);
    const next = current.filter(
      (item) => !(item.book_id === bookId && item.user_id === userId)
    );
    writeLocal(STORAGE_KEYS.WISHLIST, next);
    return next;
  },

  getNotificationsForUser(userId: string): LibraryNotification[] {
    const stored = readLocal<LibraryNotification[]>(
      STORAGE_KEYS.NOTIFICATIONS,
      INITIAL_NOTIFICATIONS
    );
    const borrowings = readLocal<Borrowing[]>(
      STORAGE_KEYS.BORROWINGS,
      INITIAL_BORROWINGS
    );
    const copies = readLocal<BookCopy[]>(
      STORAGE_KEYS.BOOK_COPIES,
      INITIAL_BOOK_COPIES
    );
    const books = readLocal<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);

    // Dynamically evaluate active loans for upcoming due dates or overdue status
    const now = new Date();
    const userActiveLoans = borrowings.filter(
      (b) => b.user_id === userId && b.return_date === null
    );

    userActiveLoans.forEach((loan) => {
      const copy = copies.find((c) => c.id === loan.copy_id);
      const book = books.find((bk) => bk.id === copy?.book_id);
      const due = new Date(loan.due_date);
      const diffDays = Math.ceil(
        (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays < 0 || loan.fine_started) {
        const overdueFine = calculateOverdueFine(
          loan.due_date,
          null,
          loan.fine_started,
          loan.fine_started_at
        );
        pushNotification({
          user_id: userId,
          category: 'DUE_DATE',
          severity: 'CRITICAL',
          title: `Overdue / Not Returned Alert: ${book?.title || copy?.accession_number}`,
          message: `Copy ${copy?.accession_number} is marked overdue / not returned. Active fine is ₹${overdueFine} (₹100/day). Please return it at the Librarian Desk.`,
          reference_id: `due-overdue-${loan.id}`,
        });
      } else if (diffDays <= 14) {
        pushNotification({
          user_id: userId,
          category: 'DUE_DATE',
          severity: diffDays <= 3 ? 'WARNING' : 'INFO',
          title: `Upcoming Due Date (${diffDays} ${diffDays === 1 ? 'Day' : 'Days'} Left)`,
          message: `"${book?.title || 'Borrowed Volume'}" (${copy?.accession_number}) is due on ${due.toLocaleDateString('en-IN')}. Return on time to avoid the ₹100/day late fee.`,
          reference_id: `due-upcoming-${loan.id}`,
        });
      }
    });

    // Also check active reservations held by this user
    const userReservations = copies.filter(
      (c) => c.reserved_by_user_id === userId && c.status === 'RESERVED'
    );
    userReservations.forEach((resCopy) => {
      const book = books.find((bk) => bk.id === resCopy.book_id);
      const dateDisplay = resCopy.reserved_for_date
        ? new Date(resCopy.reserved_for_date).toLocaleDateString('en-IN')
        : 'Upcoming Pickup';
      pushNotification({
        user_id: userId,
        category: 'RESERVATION',
        severity: 'INFO',
        title: `Active Reservation (${dateDisplay}): ${resCopy.accession_number}`,
        message: `"${book?.title || 'Reserved Book'}" (${resCopy.accession_number}) at ${resCopy.floor} · ${resCopy.rack} · ${resCopy.shelf} is reserved under your Roll No / PRN for ${dateDisplay}.`,
        reference_id: `res-status-${resCopy.id}-${userId}`,
      });
    });

    const refreshed = readLocal<LibraryNotification[]>(
      STORAGE_KEYS.NOTIFICATIONS,
      INITIAL_NOTIFICATIONS
    );

    return refreshed
      .filter((n) => n.user_id === userId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  },

  markNotificationRead(notificationId: string): void {
    const stored = readLocal<LibraryNotification[]>(
      STORAGE_KEYS.NOTIFICATIONS,
      INITIAL_NOTIFICATIONS
    );
    const updated = stored.map((n) =>
      n.id === notificationId ? { ...n, is_read: true } : n
    );
    writeLocal(STORAGE_KEYS.NOTIFICATIONS, updated);
  },

  markAllNotificationsRead(userId: string): void {
    const stored = readLocal<LibraryNotification[]>(
      STORAGE_KEYS.NOTIFICATIONS,
      INITIAL_NOTIFICATIONS
    );
    const updated = stored.map((n) =>
      n.user_id === userId ? { ...n, is_read: true } : n
    );
    writeLocal(STORAGE_KEYS.NOTIFICATIONS, updated);
  },

  dismissNotification(notificationId: string): void {
    const stored = readLocal<LibraryNotification[]>(
      STORAGE_KEYS.NOTIFICATIONS,
      INITIAL_NOTIFICATIONS
    );
    const updated = stored.filter((n) => n.id !== notificationId);
    writeLocal(STORAGE_KEYS.NOTIFICATIONS, updated);
  },

  getLibraryEntryLogs(userId?: string): LibraryEntryLog[] {
    const allLogs = readLocal<LibraryEntryLog[]>(
      STORAGE_KEYS.ENTRY_LOGS,
      INITIAL_ENTRY_LOGS
    );
    const filtered = userId
      ? allLogs.filter((log) => log.user_id === userId)
      : allLogs;
    return filtered.sort(
      (a, b) =>
        new Date(b.entry_timestamp).getTime() -
        new Date(a.entry_timestamp).getTime()
    );
  },

  async recordLibraryCheckIn(params: {
    user: Profile;
    qrPayload: string;
  }): Promise<LibraryEntryLog> {
    const rawCode = params.qrPayload.trim();
    if (!rawCode) {
      throw new Error('Invalid or empty QR code payload.');
    }

    const GATE_DIRECTORY: Record<string, string> = {
      'MIT-LIB-GATE-MAIN': 'Central Library — Main Entrance Gate (Floor 1)',
      'MIT-LIB-GATE-READING': '24×7 Reading Hall — North Wing Entrance (Floor 1)',
      'MIT-LIB-GATE-DIGITAL': 'Digital & E-Resource Lab Entrance (Floor 2)',
      'MIT-LIB-GATE-RESEARCH': 'Postgraduate & Research Stack Gate (Floor 3)',
    };

    const normalizedCode = rawCode.toUpperCase();
    const gateLocation =
      GATE_DIRECTORY[normalizedCode] ||
      (normalizedCode.startsWith('MIT')
        ? `MIT Library Entrance (${normalizedCode})`
        : `MIT Library Entrance · Scanned Code: ${rawCode.slice(0, 42)}`);

    const entryTimestamp = new Date().toISOString();
    const newEntry: LibraryEntryLog = {
      id: `ent-${Date.now()}`,
      user_id: params.user.id,
      user_name: params.user.full_name,
      roll_no: params.user.roll_no,
      department: params.user.department,
      gate_code: normalizedCode.slice(0, 48),
      gate_location: gateLocation,
      entry_timestamp: entryTimestamp,
      exit_timestamp: null,
      status: 'CHECKED_IN',
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('library_entry_logs').insert([newEntry]);
      } catch {
        // Fallback to local storage
      }
    }

    const existing = readLocal<LibraryEntryLog[]>(
      STORAGE_KEYS.ENTRY_LOGS,
      INITIAL_ENTRY_LOGS
    );

    // Automatically close any prior open session for this student when checking in again
    const updatedExisting = existing.map((log) =>
      log.user_id === params.user.id && log.status === 'CHECKED_IN'
        ? { ...log, status: 'CHECKED_OUT' as const, exit_timestamp: entryTimestamp }
        : log
    );

    const nextLogs = [newEntry, ...updatedExisting];
    writeLocal(STORAGE_KEYS.ENTRY_LOGS, nextLogs);

    pushNotification({
      user_id: params.user.id,
      category: 'CIRCULATION',
      severity: 'SUCCESS',
      title: `Physical Library Check-In Recorded`,
      message: `Checked in at ${gateLocation} on ${new Date(
        entryTimestamp
      ).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })}.`,
    });

    return newEntry;
  },

  async recordLibraryCheckOut(entryId: string, userId: string): Promise<void> {
    const exitTimestamp = new Date().toISOString();
    const existing = readLocal<LibraryEntryLog[]>(
      STORAGE_KEYS.ENTRY_LOGS,
      INITIAL_ENTRY_LOGS
    );

    const updated = existing.map((log) =>
      log.id === entryId && log.user_id === userId
        ? { ...log, status: 'CHECKED_OUT' as const, exit_timestamp: exitTimestamp }
        : log
    );

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('library_entry_logs')
          .update({ status: 'CHECKED_OUT', exit_timestamp: exitTimestamp })
          .eq('id', entryId);
      } catch {
        // Fallback to local storage
      }
    }

    writeLocal(STORAGE_KEYS.ENTRY_LOGS, updated);
  },

  // =========================================================================
  // ADMIN INTERACTIVE FLOOR MAP & ARCHITECTURAL LAYOUT AUTHORITY
  // =========================================================================
  getFloorLayouts(): FloorLayoutConfig[] {
    return readLocal<FloorLayoutConfig[]>(
      STORAGE_KEYS.FLOOR_LAYOUTS,
      INITIAL_FLOOR_LAYOUTS
    );
  },

  saveFloorLayout(config: FloorLayoutConfig): FloorLayoutConfig[] {
    const existing = this.getFloorLayouts();
    const cleanedRacks = Array.from(
      new Set(
        config.racks
          .map((r) => r.trim())
          .filter(Boolean)
      )
    );
    const normalized: FloorLayoutConfig = {
      ...config,
      floor_name: config.floor_name.trim(),
      wing_subtitle: config.wing_subtitle.trim() || 'MIT Academic Stack Wing',
      aisle_label:
        config.aisle_label.trim() || `Main Stack Aisle — ${config.floor_name.trim()}`,
      gate_label: config.gate_label.trim() || 'QR ENTRANCE GATE',
      desk_label: config.desk_label.trim() || 'LIBRARIAN CIRCULATION DESK',
      study_zone_label:
        config.study_zone_label.trim() || 'STUDENT SILENT READING ZONE',
      columns_per_row: config.columns_per_row === 3 ? 3 : 4,
      racks: cleanedRacks.length > 0 ? cleanedRacks : ['Rack 1', 'Rack 2'],
    };

    const idx = existing.findIndex(
      (f) =>
        f.id === normalized.id ||
        f.floor_name.toLowerCase() === normalized.floor_name.toLowerCase()
    );

    let updated: FloorLayoutConfig[];
    if (idx >= 0) {
      updated = existing.map((item, i) => (i === idx ? normalized : item));
    } else {
      updated = [...existing, normalized];
    }

    writeLocal(STORAGE_KEYS.FLOOR_LAYOUTS, updated);
    return updated;
  },

  async renameFloorAcrossLibrary(params: {
    floorId: string;
    oldFloorName: string;
    updatedConfig: FloorLayoutConfig;
  }): Promise<FloorLayoutConfig[]> {
    const newName = params.updatedConfig.floor_name.trim();
    if (!newName) {
      throw new Error('Floor name / number cannot be empty.');
    }

    const layouts = this.getFloorLayouts();
    const updatedLayouts = layouts.map((fl) =>
      fl.id === params.floorId ? { ...params.updatedConfig, floor_name: newName } : fl
    );
    writeLocal(STORAGE_KEYS.FLOOR_LAYOUTS, updatedLayouts);

    // If floor name changed, automatically migrate all physical book copies on that floor
    if (params.oldFloorName.trim() !== newName) {
      const copies = readLocal<BookCopy[]>(
        STORAGE_KEYS.BOOK_COPIES,
        INITIAL_BOOK_COPIES
      );
      const migratedCopies = copies.map((c) =>
        c.floor === params.oldFloorName ? { ...c, floor: newName } : c
      );
      writeLocal(STORAGE_KEYS.BOOK_COPIES, migratedCopies);
    }

    return updatedLayouts;
  },

  async deleteFloorLayout(params: {
    floorId: string;
    reassignCopiesToFloor?: string;
  }): Promise<FloorLayoutConfig[]> {
    const layouts = this.getFloorLayouts();
    const target = layouts.find((f) => f.id === params.floorId);
    if (!target) return layouts;
    if (layouts.length <= 1) {
      throw new Error('The library must maintain at least one active floor on the map.');
    }

    const remaining = layouts.filter((f) => f.id !== params.floorId);
    const fallbackFloor =
      params.reassignCopiesToFloor || remaining[0].floor_name;

    // Reassign any book copies on the removed floor to the fallback floor so no inventory is lost
    const copies = readLocal<BookCopy[]>(
      STORAGE_KEYS.BOOK_COPIES,
      INITIAL_BOOK_COPIES
    );
    const updatedCopies = copies.map((c) =>
      c.floor === target.floor_name ? { ...c, floor: fallbackFloor } : c
    );
    writeLocal(STORAGE_KEYS.BOOK_COPIES, updatedCopies);
    writeLocal(STORAGE_KEYS.FLOOR_LAYOUTS, remaining);

    return remaining;
  },
};
