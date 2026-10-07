import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  BarChart3,
  PieChart as PieChartIcon,
  Heart,
  MapPin,
  Trash2,
  ArrowUpRight,
  Bell,
  Clock,
  IndianRupee,
  BookmarkCheck,
  CheckCheck,
  X,
  QrCode,
  Calendar,
  RefreshCw,
  Compass,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  ActivityMetricDay,
  Book,
  BookCopy,
  Borrowing,
  CategoryDistributionItem,
  Fine,
  LibraryNotification,
  NotificationCategory,
  Profile,
  UserRole,
  WishlistItem,
  MAX_LOAN_RENEWALS,
} from '../types/database';
import { calculateOverdueFine, libraryRepository } from '../lib/supabase';
import { QrCheckInScanner } from './QrCheckInScanner';
import { LibraryFloorMap } from './LibraryFloorMap';

interface DashboardProps {
  activeRole: UserRole;
  currentUser: Profile | null;
  profiles: Profile[];
  books: Book[];
  bookCopies: BookCopy[];
  borrowings: Borrowing[];
  fines: Fine[];
  onDataRefresh: () => Promise<void>;
  onNavigateToCatalogue?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  activeRole,
  currentUser,
  profiles,
  books,
  bookCopies,
  borrowings,
  fines,
  onDataRefresh,
  onNavigateToCatalogue,
}) => {
  const [payingFineId, setPayingFineId] = useState<string | null>(null);
  const [renewingLoanId, setRenewingLoanId] = useState<string | null>(null);
  const [renewalBanner, setRenewalBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [dashboardView, setDashboardView] = useState<
    | 'ANALYTICS'
    | 'STUDENT_LOANS'
    | 'WISHLIST'
    | 'NOTIFICATIONS'
    | 'QR_CHECKIN'
    | 'FLOOR_MAP'
  >(activeRole === 'STUDENT' ? 'STUDENT_LOANS' : 'ANALYTICS');

  const [highlightedMapCopyId, setHighlightedMapCopyId] = useState<string | null>(
    null
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    currentUser?.role === 'STUDENT' ? currentUser.id : ''
  );

  // Local Wishlist state synced with localStorage
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(() =>
    libraryRepository.getWishlist()
  );

  // Real-time Notifications State & Category Filter
  const [notifications, setNotifications] = useState<LibraryNotification[]>([]);
  const [notifFilter, setNotifFilter] = useState<NotificationCategory | 'ALL'>('ALL');

  const studentProfiles = useMemo(
    () => profiles.filter((p) => p.role === 'STUDENT'),
    [profiles]
  );

  const targetStudent = useMemo(
    () =>
      profiles.find((p) => p.id === selectedStudentId) ||
      currentUser ||
      studentProfiles[0] ||
      null,
    [profiles, selectedStudentId, currentUser, studentProfiles]
  );

  const activeAccountId = targetStudent?.id || currentUser?.id || '';

  const refreshLocalFeeds = useCallback(() => {
    setWishlistItems(libraryRepository.getWishlist());
    if (activeAccountId) {
      setNotifications(libraryRepository.getNotificationsForUser(activeAccountId));
    } else {
      setNotifications([]);
    }
  }, [activeAccountId]);

  // Sync view and student selector when role/user changes
  useEffect(() => {
    if (activeRole === 'STUDENT') {
      setDashboardView((prev) => (prev === 'ANALYTICS' ? 'STUDENT_LOANS' : prev));
      if (currentUser) setSelectedStudentId(currentUser.id);
    } else {
      setDashboardView((prev) =>
        prev === 'WISHLIST' ||
        prev === 'NOTIFICATIONS' ||
        prev === 'QR_CHECKIN' ||
        prev === 'FLOOR_MAP'
          ? prev
          : 'ANALYTICS'
      );
    }
  }, [activeRole, currentUser]);

  // Real-time listener for local & cross-tab storage updates
  useEffect(() => {
    refreshLocalFeeds();

    const handleDataUpdated = () => {
      refreshLocalFeeds();
    };

    window.addEventListener('mit-library-data-updated', handleDataUpdated);
    window.addEventListener('storage', handleDataUpdated);
    return () => {
      window.removeEventListener('mit-library-data-updated', handleDataUpdated);
      window.removeEventListener('storage', handleDataUpdated);
    };
  }, [refreshLocalFeeds, borrowings, fines, bookCopies]);

  // =========================================================================
  // MODULE C: STUDENT DASHBOARD DATA
  // =========================================================================
  const studentLoans = useMemo(() => {
    if (!targetStudent) return [];
    return borrowings
      .filter((b) => b.user_id === targetStudent.id && b.return_date === null)
      .map((loan) => {
        const copy = bookCopies.find((c) => c.id === loan.copy_id);
        const book = books.find((bk) => bk.id === copy?.book_id);
        const recordedFine = fines.find((f) => f.borrowing_id === loan.id);
        const liveOverdueAmount = calculateOverdueFine(
          loan.due_date,
          null,
          loan.fine_started,
          loan.fine_started_at
        );
        const effectiveFine = recordedFine
          ? Math.max(recordedFine.amount, liveOverdueAmount)
          : liveOverdueAmount;
        const isPaid = recordedFine ? recordedFine.is_paid : false;

        return {
          ...loan,
          copy,
          book,
          recordedFine,
          effectiveFine,
          isPaid,
        };
      });
  }, [borrowings, bookCopies, books, fines, targetStudent]);

  // Enriched Wishlist Books for the active student/user
  const userWishlistBooks = useMemo(() => {
    if (!activeAccountId) return [];
    return wishlistItems
      .filter((item) => item.user_id === activeAccountId)
      .map((item) => {
        const book = books.find((b) => b.id === item.book_id);
        const copies = bookCopies.filter((c) => c.book_id === item.book_id);
        const availableCount = copies.filter((c) => c.status === 'AVAILABLE').length;
        return {
          wishlistItem: item,
          book,
          copies,
          availableCount,
        };
      })
      .filter((entry) => Boolean(entry.book));
  }, [wishlistItems, activeAccountId, books, bookCopies]);

  // Enriched Date-Based Book Reservations for the active student
  const studentReservations = useMemo(() => {
    if (!activeAccountId) return [];
    return bookCopies
      .filter(
        (c) =>
          c.status === 'RESERVED' && c.reserved_by_user_id === activeAccountId
      )
      .map((copy) => {
        const book = books.find((b) => b.id === copy.book_id);
        return {
          copy,
          book,
        };
      });
  }, [bookCopies, books, activeAccountId]);

  const handleCancelReservation = async (copyId: string) => {
    if (!activeAccountId) return;
    await libraryRepository.cancelReservation(copyId, activeAccountId);
    await onDataRefresh();
    refreshLocalFeeds();
  };

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'ALL') return notifications;
    return notifications.filter((n) => n.category === notifFilter);
  }, [notifications, notifFilter]);

  const studentMetrics = useMemo(() => {
    const activeBorrowedCount = studentLoans.length;
    const now = new Date();
    const pendingDueSoonCount = studentLoans.filter((loan) => {
      const diffDays = Math.ceil(
        (new Date(loan.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays <= 7;
    }).length;

    const unpaidFinesTotal = studentLoans.reduce((sum, loan) => {
      if (!loan.isPaid && loan.effectiveFine > 0) {
        return sum + loan.effectiveFine;
      }
      return sum;
    }, 0);

    return {
      activeBorrowedCount,
      pendingDueSoonCount,
      unpaidFinesTotal,
    };
  }, [studentLoans]);

  const handleSettleFine = async (fineId?: string) => {
    if (!fineId) return;
    setPayingFineId(fineId);
    try {
      await libraryRepository.markFinePaid(fineId);
      await onDataRefresh();
      refreshLocalFeeds();
    } finally {
      setPayingFineId(null);
    }
  };

  const handleRequestRenewal = async (borrowingId: string) => {
    if (!activeAccountId) return;
    setRenewingLoanId(borrowingId);
    setRenewalBanner(null);
    try {
      await libraryRepository.requestLoanRenewal(borrowingId, activeAccountId);
      setRenewalBanner({
        type: 'success',
        text: 'Renewal request submitted to the Librarian Desk for approval (+7 days extension upon approval).',
      });
      await onDataRefresh();
      refreshLocalFeeds();
    } catch (err) {
      setRenewalBanner({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Unable to request loan renewal.',
      });
    } finally {
      setRenewingLoanId(null);
    }
  };

  const handleRemoveFromWishlist = (bookId: string) => {
    if (!activeAccountId) return;
    const updated = libraryRepository.removeWishlistItem(bookId, activeAccountId);
    setWishlistItems(updated);
  };

  const handleMarkNotificationRead = (id: string) => {
    libraryRepository.markNotificationRead(id);
    refreshLocalFeeds();
  };

  const handleMarkAllRead = () => {
    if (!activeAccountId) return;
    libraryRepository.markAllNotificationsRead(activeAccountId);
    refreshLocalFeeds();
  };

  const handleDismissNotification = (id: string) => {
    libraryRepository.dismissNotification(id);
    refreshLocalFeeds();
  };

  // =========================================================================
  // MODULE D: ADMIN & LIBRARIAN ANALYTICS DATA
  // =========================================================================
  const adminMetrics = useMemo(() => {
    const totalBookStock = bookCopies.length;
    const activeBorrowings = borrowings.filter((b) => b.return_date === null);
    const totalIssued = bookCopies.filter(
      (c) => c.status === 'ISSUED' || c.status === 'OVERDUE'
    ).length;
    const uniqueBorrowers = new Set(activeBorrowings.map((b) => b.user_id)).size;
    const totalOverdueCount = activeBorrowings.filter(
      (b) => calculateOverdueFine(b.due_date) > 0 || b.status === 'OVERDUE'
    ).length;

    return {
      totalBookStock,
      totalIssued,
      activeBorrowers: uniqueBorrowers,
      totalOverdueCount,
    };
  }, [bookCopies, borrowings]);

  const sevenDayActivityData: ActivityMetricDay[] = useMemo(() => {
    const days: ActivityMetricDay[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', {
        weekday: 'short',
      });

      const issuedOnDay = borrowings.filter((b) =>
        b.issue_date.startsWith(dateStr)
      ).length;
      const returnedOnDay = borrowings.filter(
        (b) => b.return_date && b.return_date.startsWith(dateStr)
      ).length;

      days.push({
        day: dayLabel,
        date: dateStr,
        issued: issuedOnDay,
        returned: returnedOnDay,
      });
    }
    return days;
  }, [borrowings]);

  const categoryDistributionData: CategoryDistributionItem[] = useMemo(() => {
    const map = new Map<
      string,
      { category: string; books: number; copies: number; issued: number }
    >();

    books.forEach((book) => {
      const shortCategory = book.category
        .replace('Computer Science & Engineering', 'CSE')
        .replace('Computer Science & Design', 'CS & Design')
        .replace('Artificial Intelligence & Data Science', 'AI & DS')
        .replace('Mechanical Engineering', 'Mechanical')
        .replace('Civil Engineering', 'Civil')
        .replace('Electrical & Electronics Engineering', 'Electrical')
        .replace('Basic Sciences & Humanities', 'Basic Sci');

      const copiesForBook = bookCopies.filter((c) => c.book_id === book.id);
      const issuedForBook = copiesForBook.filter(
        (c) => c.status === 'ISSUED' || c.status === 'OVERDUE'
      ).length;

      const existing = map.get(shortCategory) || {
        category: shortCategory,
        books: 0,
        copies: 0,
        issued: 0,
      };

      existing.books += 1;
      existing.copies += copiesForBook.length || book.total_copies;
      existing.issued += issuedForBook;
      map.set(shortCategory, existing);
    });

    return Array.from(map.values());
  }, [books, bookCopies]);

  const isStaff = activeRole === 'ADMIN' || activeRole === 'LIBRARIAN';

  return (
    <div className="space-y-6">
      {/* Top Bar with View Tabs (Including 'My Wishlist' & 'Notifications' Tabs) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#E0F2FE]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            {dashboardView === 'ANALYTICS'
              ? 'Library Analytics & Circulation Overview'
              : dashboardView === 'WISHLIST'
              ? `My Wishlist — ${targetStudent?.full_name || currentUser?.full_name || 'Student'}`
              : dashboardView === 'NOTIFICATIONS'
              ? `Real-Time Alerts — ${targetStudent?.full_name || currentUser?.full_name || 'Student'}`
              : dashboardView === 'QR_CHECKIN'
              ? `Entrance QR Check-In — ${targetStudent?.full_name || currentUser?.full_name || 'Student'}`
              : dashboardView === 'FLOOR_MAP'
              ? `Interactive Floor & Rack Map — ${targetStudent?.full_name || currentUser?.full_name || 'Student'}`
              : `Student Loans — ${targetStudent?.full_name || currentUser?.full_name || 'Student'}`}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {dashboardView === 'ANALYTICS'
              ? 'Real-time stock inventory, 7-day circulation cadence, and departmental distribution.'
              : `${targetStudent?.roll_no || currentUser?.roll_no || ''} · ${
                  targetStudent?.department || currentUser?.department || ''
                } · ${targetStudent?.email || currentUser?.email || ''}`}
          </p>
        </div>

        {/* Segmented Dashboard Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F8FAFC] rounded-xl border border-[#E0F2FE] self-start lg:self-auto">
          {isStaff && (
            <button
              type="button"
              onClick={() => setDashboardView('ANALYTICS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                dashboardView === 'ANALYTICS'
                  ? 'bg-[#0284C7] text-white'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              System Analytics
            </button>
          )}

          <button
            type="button"
            onClick={() => setDashboardView('STUDENT_LOANS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              dashboardView === 'STUDENT_LOANS'
                ? 'bg-[#0284C7] text-white'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            {isStaff ? 'Inspect Student Loans' : 'Active Loans'}
          </button>

          <button
            type="button"
            onClick={() => setDashboardView('FLOOR_MAP')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              dashboardView === 'FLOOR_MAP'
                ? 'bg-[#0284C7] text-white'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Interactive Floor Map</span>
            {studentReservations.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                  dashboardView === 'FLOOR_MAP'
                    ? 'bg-amber-300 text-slate-900'
                    : 'bg-amber-100 text-[#D97706]'
                }`}
              >
                {studentReservations.length} Pin
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDashboardView('WISHLIST')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              dashboardView === 'WISHLIST'
                ? 'bg-[#0284C7] text-white'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                dashboardView === 'WISHLIST' ? 'fill-white text-white' : 'text-[#0284C7]'
              }`}
            />
            <span>My Wishlist ({userWishlistBooks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardView('QR_CHECKIN')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              dashboardView === 'QR_CHECKIN'
                ? 'bg-[#0284C7] text-white'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Gate Check-In</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardView('NOTIFICATIONS')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              dashboardView === 'NOTIFICATIONS'
                ? 'bg-[#0284C7] text-white'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
            {unreadNotificationCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded text-[11px] font-mono font-bold tabular-nums ${
                  dashboardView === 'NOTIFICATIONS'
                    ? 'bg-white text-[#0284C7]'
                    : 'bg-[#0284C7] text-white'
                }`}
              >
                {unreadNotificationCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Real-Time Unread Alert Strip on Student Loans View */}
      {dashboardView === 'STUDENT_LOANS' && unreadNotificationCount > 0 && (
        <div className="p-4 rounded-xl bg-[#F0F9FF] border border-[#38BDF8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <Bell className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs">
              <span className="font-bold text-[#0F172A]">
                {unreadNotificationCount} Unread Library{' '}
                {unreadNotificationCount === 1 ? 'Notification' : 'Notifications'}:
              </span>{' '}
              <span className="text-slate-600">
                {notifications.find((n) => !n.is_read)?.title} —{' '}
                {notifications.find((n) => !n.is_read)?.message}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDashboardView('NOTIFICATIONS')}
            className="px-3 py-1.5 rounded-lg bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            View All Alerts
          </button>
        </div>
      )}

      {/* =====================================================================
          VIEW 1: ADMIN & LIBRARIAN ANALYTICS
      ===================================================================== */}
      {dashboardView === 'ANALYTICS' && isStaff && (
        <section className="space-y-6">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#F8FAFC] border border-[#E0F2FE] rounded-2xl p-5">
              <span className="text-xs font-medium text-slate-500">
                Total Book Stock
              </span>
              <p className="text-3xl font-bold font-mono text-[#0F172A] mt-2 tabular-nums">
                {adminMetrics.totalBookStock}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {books.length} academic titles
              </p>
            </div>

            <div className="bg-[#F0F9FF] border border-[#E0F2FE] rounded-2xl p-5">
              <span className="text-xs font-medium text-[#0284C7]">
                Total Issued
              </span>
              <p className="text-3xl font-bold font-mono text-[#0284C7] mt-2 tabular-nums">
                {adminMetrics.totalIssued}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Active circulation
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E0F2FE] rounded-2xl p-5">
              <span className="text-xs font-medium text-slate-500">
                Active Borrowers
              </span>
              <p className="text-3xl font-bold font-mono text-[#0F172A] mt-2 tabular-nums">
                {adminMetrics.activeBorrowers}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Verified @mit.asia members
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E0F2FE] rounded-2xl p-5">
              <span className="text-xs font-medium text-[#DC2626]">
                Total Overdue Count
              </span>
              <p className="text-3xl font-bold font-mono text-[#DC2626] mt-2 tabular-nums">
                {adminMetrics.totalOverdueCount}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ₹100/day fine policy
              </p>
            </div>
          </div>

          {/* 2 Recharts Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 7-Day Issue / Return Activity */}
            <div className="bg-white border border-[#E0F2FE] rounded-2xl p-6">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#0284C7]" />
                  7-Day Issue / Return Activity
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily checkout and return transactions
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sevenDayActivityData}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="mitIssuedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284C7" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.75} />
                      </linearGradient>
                      <linearGradient id="mitReturnedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#BAE6FD" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#475569', fontSize: 11 }}
                      axisLine={{ stroke: '#E0F2FE' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#475569', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E0F2FE',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: '#0F172A',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Bar
                      dataKey="issued"
                      name="Issued"
                      fill="url(#mitIssuedGrad)"
                      radius={[5, 5, 0, 0]}
                    />
                    <Bar
                      dataKey="returned"
                      name="Returned"
                      fill="url(#mitReturnedGrad)"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Books by Category Distribution */}
            <div className="bg-white border border-[#E0F2FE] rounded-2xl p-6">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-[#0284C7]" />
                  Books by Category Distribution
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Department stock vs. issued copies
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryDistributionData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="mitCatTotalGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0284C7" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.9} />
                      </linearGradient>
                      <linearGradient id="mitCatIssuedGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0F172A" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#0284C7" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: '#475569', fontSize: 11 }}
                      axisLine={{ stroke: '#E0F2FE' }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={85}
                      tick={{ fill: '#0F172A', fontSize: 11, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E0F2FE',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: '#0F172A',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Bar
                      dataKey="copies"
                      name="Total Copies"
                      fill="url(#mitCatTotalGrad)"
                      radius={[0, 5, 5, 0]}
                    />
                    <Bar
                      dataKey="issued"
                      name="Issued Copies"
                      fill="url(#mitCatIssuedGrad)"
                      radius={[0, 5, 5, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Embedded Interactive SVG Floor Map & Admin Floor Architecture Manager */}
          <LibraryFloorMap
            books={books}
            bookCopies={bookCopies}
            activeStudentId={activeAccountId}
            activeRole={activeRole}
            wishlistItems={wishlistItems}
            highlightedCopyId={highlightedMapCopyId}
            onClearHighlight={() => setHighlightedMapCopyId(null)}
            onDataRefresh={onDataRefresh}
          />
        </section>
      )}

      {/* =====================================================================
          VIEW 2: STUDENT LOANS DASHBOARD
      ===================================================================== */}
      {dashboardView === 'STUDENT_LOANS' && (
        <section className="space-y-6">
          {isStaff && studentProfiles.length > 0 && (
            <div className="flex items-center justify-end gap-2">
              <label className="text-xs font-semibold text-slate-600">
                Select Student Account:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#E0F2FE] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              >
                {studentProfiles.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.full_name} ({stu.roll_no})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3 Clean Student Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#F0F9FF] border border-[#E0F2FE] rounded-2xl p-5">
              <span className="text-xs font-medium text-[#0284C7]">
                Active Borrowed Books
              </span>
              <p className="text-3xl font-bold font-mono text-[#0F172A] mt-2 tabular-nums">
                {studentMetrics.activeBorrowedCount}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Currently checked out
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E0F2FE] rounded-2xl p-5">
              <span className="text-xs font-medium text-[#D97706]">
                Pending Due Dates
              </span>
              <p className="text-3xl font-bold font-mono text-[#0F172A] mt-2 tabular-nums">
                {studentMetrics.pendingDueSoonCount}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Due within 7 days
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E0F2FE] rounded-2xl p-5">
              <span className="text-xs font-medium text-[#DC2626]">
                Unpaid Fines
              </span>
              <p className="text-3xl font-bold font-mono text-[#DC2626] mt-2 tabular-nums">
                ₹{studentMetrics.unpaidFinesTotal}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ₹100/day past due
              </p>
            </div>
          </div>

          {/* Active Loans Table */}
          {renewalBanner && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
                renewalBanner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-[#059669]'
                  : 'bg-red-50 border-red-200 text-[#DC2626]'
              }`}
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span>{renewalBanner.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setRenewalBanner(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="bg-white border border-[#E0F2FE] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E0F2FE] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Active Loans & Renewal Requests
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Students may renew active loans up to {MAX_LOAN_RENEWALS} times (+7 days per renewal), subject to Librarian approval.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {studentLoans.length} {studentLoans.length === 1 ? 'Book' : 'Books'}
              </span>
            </div>

            {studentLoans.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle2 className="w-7 h-7 text-[#059669] mx-auto mb-2" />
                <p className="text-sm font-bold text-[#0F172A]">
                  No Active Borrowed Books
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  There are no active book loans or pending fines on this account.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E0F2FE] bg-[#F0F9FF]/50 text-[11px] font-semibold text-slate-600">
                      <th className="py-3 px-5">Book Title</th>
                      <th className="py-3 px-4">Accession Number</th>
                      <th className="py-3 px-4">Issue Date</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Renewals ({MAX_LOAN_RENEWALS} Max)</th>
                      <th className="py-3 px-4 text-right">Fine Status</th>
                      <th className="py-3 px-5 text-right">Loan Renewal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0F2FE] text-xs">
                    {studentLoans.map((loan) => {
                      const hasUnpaidFine = loan.effectiveFine > 0 && !loan.isPaid;
                      const renewalCount = loan.renewal_count ?? 0;
                      const renewalStatus = loan.renewal_status || 'NONE';
                      const maxReached = renewalCount >= MAX_LOAN_RENEWALS;
                      const isPendingApproval = renewalStatus === 'PENDING';
                      const canRenew = !hasUnpaidFine && !maxReached && !isPendingApproval;

                      return (
                        <tr
                          key={loan.id}
                          className="hover:bg-[#F8FAFC] transition-colors"
                        >
                          <td className="py-3.5 px-5">
                            <p className="font-semibold text-[#0F172A]">
                              {loan.book?.title || 'Academic Volume'}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {loan.copy?.floor} · {loan.copy?.rack} · {loan.copy?.shelf}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-[#0284C7] whitespace-nowrap">
                            {loan.copy?.accession_number}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                            {new Date(loan.issue_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 font-mono whitespace-nowrap tabular-nums">
                            <span
                              className={
                                hasUnpaidFine
                                  ? 'text-[#DC2626] font-semibold'
                                  : 'text-[#0F172A]'
                              }
                            >
                              {new Date(loan.due_date).toLocaleDateString('en-IN')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono font-semibold text-[#0F172A] tabular-nums">
                                {renewalCount} / {MAX_LOAN_RENEWALS} Used
                              </span>
                              {renewalStatus === 'PENDING' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#D97706]">
                                  <Clock className="w-3 h-3" />
                                  Pending Librarian Approval
                                </span>
                              )}
                              {renewalStatus === 'APPROVED' && (
                                <span className="text-[10px] font-semibold text-[#059669]">
                                  Last Renewal Approved (+7d)
                                </span>
                              )}
                              {renewalStatus === 'REJECTED' && (
                                <span className="text-[10px] font-semibold text-[#DC2626]">
                                  Last Request Declined
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {hasUnpaidFine ? (
                              <div className="inline-flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-md bg-red-50 border border-red-200 text-[#DC2626] font-mono font-semibold tabular-nums">
                                  OVERDUE · ₹{loan.effectiveFine}
                                </span>
                                {loan.recordedFine && (
                                  <button
                                    type="button"
                                    disabled={payingFineId === loan.recordedFine.id}
                                    onClick={() => handleSettleFine(loan.recordedFine?.id)}
                                    className="px-2.5 py-1 rounded-md bg-[#0284C7] hover:bg-sky-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                                  >
                                    {payingFineId === loan.recordedFine.id
                                      ? 'Paying...'
                                      : 'Pay Fine'}
                                  </button>
                                )}
                              </div>
                            ) : loan.effectiveFine > 0 && loan.isPaid ? (
                              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[#059669] font-mono font-semibold tabular-nums">
                                PAID (₹{loan.effectiveFine})
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[#059669] font-mono font-semibold">
                                NO FINE (₹0)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            {isPendingApproval ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[#D97706] text-xs font-semibold">
                                <Clock className="w-3.5 h-3.5" />
                                Awaiting Approval
                              </span>
                            ) : maxReached ? (
                              <span
                                title={`Maximum limit of ${MAX_LOAN_RENEWALS} renewals reached`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold cursor-not-allowed"
                              >
                                Max Renewals ({MAX_LOAN_RENEWALS}/{MAX_LOAN_RENEWALS})
                              </span>
                            ) : hasUnpaidFine ? (
                              <span
                                title="Settle overdue fine before requesting a renewal"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[#DC2626] text-xs font-semibold cursor-not-allowed"
                              >
                                Clear Fine to Renew
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={!canRenew || renewingLoanId === loan.id}
                                onClick={() => handleRequestRenewal(loan.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw
                                  className={`w-3.5 h-3.5 ${
                                    renewingLoanId === loan.id ? 'animate-spin' : ''
                                  }`}
                                />
                                {renewingLoanId === loan.id ? 'Requesting...' : 'Renew (+7 Days)'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Student Booked & Reserved Copies with Scheduled Dates */}
          <div className="bg-white border border-[#E0F2FE] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E0F2FE] bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0284C7]" />
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Booked & Reserved Copies (With Scheduled Date)
                </h2>
              </div>
              <span className="text-xs font-mono text-[#0284C7] font-semibold">
                {studentReservations.length}{' '}
                {studentReservations.length === 1 ? 'Reservation' : 'Reservations'}
              </span>
            </div>

            {studentReservations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-bold text-[#0F172A]">
                  No Scheduled Book Reservations
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Go to the Physical Catalogue and click "Book / Reserve Date" on any copy to book a pickup date.
                </p>
                {onNavigateToCatalogue && (
                  <button
                    type="button"
                    onClick={onNavigateToCatalogue}
                    className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Book & Reserve from Catalogue</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E0F2FE] bg-[#F0F9FF]/50 text-[11px] font-semibold text-slate-600">
                      <th className="py-3 px-5">Book Title & Stack Coordinates</th>
                      <th className="py-3 px-4">Accession No.</th>
                      <th className="py-3 px-4">Booked / Reserved For Date</th>
                      <th className="py-3 px-4">24-Hr Pickup Rule</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0F2FE] text-xs">
                    {studentReservations.map(({ copy, book }) => {
                      const expiryMs = copy.reservation_expires_at
                        ? new Date(copy.reservation_expires_at).getTime()
                        : Date.now() + 24 * 60 * 60 * 1000;
                      const hoursLeft = Math.max(
                        0,
                        Math.ceil((expiryMs - Date.now()) / (1000 * 60 * 60))
                      );
                      return (
                      <tr key={copy.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-5">
                          <p className="font-semibold text-[#0F172A]">
                            {book?.title || 'Library Volume'}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {copy.floor} · {copy.rack} · {copy.shelf}
                            {copy.reservation_notes ? ` — Note: ${copy.reservation_notes}` : ''}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#0284C7] whitespace-nowrap">
                          {copy.accession_number}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-[#D97706] font-mono font-semibold tabular-nums">
                            <Calendar className="w-3.5 h-3.5" />
                            {copy.reserved_for_date
                              ? new Date(copy.reserved_for_date).toLocaleDateString('en-IN', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Scheduled'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                          <span className="inline-flex items-center gap-1 text-[#D97706] font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            {hoursLeft}h left (Auto-cancels in 24h)
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setHighlightedMapCopyId(copy.id);
                                setDashboardView('FLOOR_MAP');
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F0F9FF] hover:bg-[#0284C7] text-[#0284C7] hover:text-white border border-[#E0F2FE] text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              Locate on Floor Map
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelReservation(copy.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-[#DC2626] text-[#DC2626] hover:text-white border border-red-200 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel Booking
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Embedded Interactive SVG Floor Map Widget in Student Dashboard */}
          <LibraryFloorMap
            books={books}
            bookCopies={bookCopies}
            activeStudentId={activeAccountId}
            activeRole={activeRole}
            wishlistItems={wishlistItems}
            highlightedCopyId={highlightedMapCopyId}
            onClearHighlight={() => setHighlightedMapCopyId(null)}
            onDataRefresh={onDataRefresh}
          />
        </section>
      )}

      {/* =====================================================================
          VIEW 3: MY WISHLIST TAB
      ===================================================================== */}
      {dashboardView === 'WISHLIST' && (
        <section className="space-y-5">
          <div className="bg-white border border-[#E0F2FE] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E0F2FE] bg-[#F8FAFC] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Saved Books to Borrow Later
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitor live shelf availability and physical stack locations for your saved titles.
                </p>
              </div>
              <span className="text-xs font-mono text-[#0284C7] font-semibold">
                {userWishlistBooks.length}{' '}
                {userWishlistBooks.length === 1 ? 'Saved Title' : 'Saved Titles'}
              </span>
            </div>

            {userWishlistBooks.length === 0 ? (
              <div className="p-12 text-center">
                <Heart className="w-8 h-8 text-[#0284C7] mx-auto mb-2.5 opacity-80" />
                <p className="text-sm font-bold text-[#0F172A]">
                  Your Wishlist is Empty
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Browse the Academic Catalogue and click "Save to Wishlist" on any book you plan to borrow later.
                </p>
                {onNavigateToCatalogue && (
                  <button
                    type="button"
                    onClick={onNavigateToCatalogue}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Browse Catalogue</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#E0F2FE]">
                {userWishlistBooks.map(({ wishlistItem, book, copies, availableCount }) => {
                  if (!book) return null;
                  const primaryCopy = copies[0];
                  const sampleAvailableCopy = copies.find(
                    (c) => c.status === 'AVAILABLE'
                  );

                  return (
                    <div
                      key={wishlistItem.id}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-[#0284C7]">
                            {book.category}
                          </span>
                          <span>·</span>
                          <span className="font-mono">ISBN: {book.isbn}</span>
                          <span>·</span>
                          <span>
                            Saved on{' '}
                            {new Date(wishlistItem.added_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-[#0F172A]">
                          {book.title}
                        </h3>
                        <p className="text-xs text-slate-600">{book.author}</p>

                        {primaryCopy && (
                          <div className="pt-1 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-600">
                            <span className="inline-flex items-center gap-1 text-[#0284C7] font-semibold">
                              <MapPin className="w-3.5 h-3.5" />
                              {primaryCopy.floor} · {primaryCopy.rack} · {primaryCopy.shelf}
                            </span>
                            {sampleAvailableCopy && (
                              <>
                                <span>·</span>
                                <span>
                                  Ready Accession:{' '}
                                  <strong className="text-[#0F172A]">
                                    {sampleAvailableCopy.accession_number}
                                  </strong>
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold border ${
                            availableCount > 0
                              ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                              : 'bg-amber-50 text-[#D97706] border-amber-200'
                          }`}
                        >
                          {availableCount > 0
                            ? `${availableCount} of ${copies.length} AVAILABLE`
                            : 'ALL COPIES ISSUED'}
                        </span>

                        {onNavigateToCatalogue && (
                          <button
                            type="button"
                            onClick={onNavigateToCatalogue}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F0F9FF] hover:bg-[#0284C7] text-[#0284C7] hover:text-white border border-[#E0F2FE] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <span>View in Catalogue</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveFromWishlist(book.id)}
                          aria-label={`Remove ${book.title} from wishlist`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E0F2FE] text-slate-500 hover:text-[#DC2626] hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* =====================================================================
          VIEW 4: REAL-TIME NOTIFICATIONS CENTER
      ===================================================================== */}
      {dashboardView === 'NOTIFICATIONS' && (
        <section className="space-y-5">
          {/* Filter & Action Header */}
          <div className="bg-[#F8FAFC] border border-[#E0F2FE] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'ALL', label: 'All Alerts' },
                  { id: 'DUE_DATE', label: 'Due Dates' },
                  { id: 'FINE_PAYMENT', label: 'Fine Payments' },
                  { id: 'RESERVATION', label: 'Reservations' },
                ] as { id: NotificationCategory | 'ALL'; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setNotifFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    notifFilter === tab.id
                      ? 'bg-[#0284C7] text-white'
                      : 'bg-white text-slate-600 border border-[#E0F2FE] hover:text-[#0F172A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {unreadNotificationCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F0F9FF] text-[#0284C7] border border-[#E0F2FE] text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>

          {/* Notifications Feed List */}
          <div className="bg-white border border-[#E0F2FE] rounded-2xl overflow-hidden">
            {filteredNotifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-8 h-8 text-[#0284C7] mx-auto mb-2.5 opacity-80" />
                <p className="text-sm font-bold text-[#0F172A]">
                  No Notifications Yet
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Real-time alerts for upcoming book due dates, ₹100/day fine payments, and book reservation status updates will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E0F2FE]">
                {filteredNotifications.map((item) => {
                  const Icon =
                    item.category === 'DUE_DATE'
                      ? Clock
                      : item.category === 'FINE_PAYMENT'
                      ? IndianRupee
                      : item.category === 'RESERVATION'
                      ? BookmarkCheck
                      : Bell;

                  const severityBadge =
                    item.severity === 'CRITICAL'
                      ? 'bg-red-50 text-[#DC2626] border-red-200'
                      : item.severity === 'WARNING'
                      ? 'bg-amber-50 text-[#D97706] border-amber-200'
                      : item.severity === 'SUCCESS'
                      ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                      : 'bg-[#F0F9FF] text-[#0284C7] border-[#E0F2FE]';

                  return (
                    <div
                      key={item.id}
                      className={`p-5 flex items-start justify-between gap-4 transition-colors ${
                        item.is_read ? 'bg-white' : 'bg-[#F0F9FF]/50'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${severityBadge}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-[#0F172A]">
                              {item.title}
                            </span>
                            {!item.is_read && (
                              <span className="px-2 py-0.5 rounded bg-[#0284C7] text-white text-[10px] font-mono font-bold">
                                NEW
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {item.message}
                          </p>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono pt-1">
                            <span>
                              {new Date(item.created_at).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span>·</span>
                            <span>{item.category.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!item.is_read && (
                          <button
                            type="button"
                            onClick={() => handleMarkNotificationRead(item.id)}
                            className="px-2.5 py-1 rounded-lg border border-[#E0F2FE] bg-white hover:bg-[#F8FAFC] text-[#0284C7] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDismissNotification(item.id)}
                          aria-label="Dismiss notification"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* =====================================================================
          VIEW 5: CAMERA-BASED QR CODE ENTRANCE CHECK-IN
      ===================================================================== */}
      {dashboardView === 'QR_CHECKIN' && (
        <QrCheckInScanner
          currentUser={currentUser}
          activeRole={activeRole}
          targetStudent={targetStudent}
        />
      )}

      {/* =====================================================================
          VIEW 6: INTERACTIVE SVG LIBRARY FLOOR & RACK LOCATOR MAP
      ===================================================================== */}
      {dashboardView === 'FLOOR_MAP' && (
        <LibraryFloorMap
          books={books}
          bookCopies={bookCopies}
          activeStudentId={activeAccountId}
          activeRole={activeRole}
          wishlistItems={wishlistItems}
          highlightedCopyId={highlightedMapCopyId}
          onClearHighlight={() => setHighlightedMapCopyId(null)}
          onDataRefresh={onDataRefresh}
        />
      )}
    </div>
  );
};
