import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  MapPin,
  BookmarkPlus,
  CheckCircle2,
  X,
  SlidersHorizontal,
  ArrowUpRight,
  Layers,
  AlertCircle,
  History,
  Trash2,
  Star,
  MessageSquarePlus,
  Heart,
  Plus,
  Pencil,
  BookPlus,
  Calendar,
} from 'lucide-react';
import {
  Book,
  BookCopy,
  BookReview,
  CopyStatus,
  MIT_DEPARTMENTS,
  Profile,
  UserRole,
  WishlistItem,
} from '../types/database';
import { libraryRepository } from '../lib/supabase';

interface BookCatalogueProps {
  books: Book[];
  bookCopies: BookCopy[];
  currentUser: Profile | null;
  activeRole: UserRole;
  onDataRefresh: () => Promise<void>;
  onOpenDeskWithAccession?: (accessionNumber: string, action: 'ISSUE' | 'RETURN') => void;
  onRequireAuth: () => void;
}

const RECENT_SEARCHES_KEY = 'mit_lib_recent_catalogue_searches_v1';
const MAX_RECENT_SEARCHES = 8;

const STATUS_BADGE_STYLES: Record<
  CopyStatus,
  { label: string; bgClass: string; textClass: string; borderClass: string }
> = {
  AVAILABLE: {
    label: 'AVAILABLE',
    bgClass: 'bg-emerald-50',
    textClass: 'text-[#059669]',
    borderClass: 'border-emerald-200',
  },
  ISSUED: {
    label: 'ISSUED',
    bgClass: 'bg-[#F0F9FF]',
    textClass: 'text-[#0284C7]',
    borderClass: 'border-[#E0F2FE]',
  },
  RESERVED: {
    label: 'RESERVED',
    bgClass: 'bg-amber-50',
    textClass: 'text-[#D97706]',
    borderClass: 'border-amber-200',
  },
  OVERDUE: {
    label: 'OVERDUE',
    bgClass: 'bg-red-50',
    textClass: 'text-[#DC2626]',
    borderClass: 'border-red-200',
  },
};

export const BookCatalogue: React.FC<BookCatalogueProps> = ({
  books,
  bookCopies,
  currentUser,
  activeRole,
  onDataRefresh,
  onOpenDeskWithAccession,
  onRequireAuth,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Persisted Recent Searches State
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage read errors
    }
    return [];
  });

  // Persisted Book Reviews & Ratings State
  const [reviews, setReviews] = useState<BookReview[]>(() =>
    libraryRepository.getBookReviews()
  );
  const [reviewModalBook, setReviewModalBook] = useState<Book | null>(null);
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);

  // Persisted Student Wishlist State
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(() =>
    libraryRepository.getWishlist()
  );

  // Reserve Modal State (with Date Picker & Notes)
  const [reservingCopy, setReservingCopy] = useState<{
    copy: BookCopy;
    book: Book;
  } | null>(null);
  const [reserveDateInput, setReserveDateInput] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [reserveNotesInput, setReserveNotesInput] = useState<string>('');
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Librarian / Admin Add Book & Edit Shelf/Rack State
  const [addBookModalOpen, setAddBookModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newIsbn, setNewIsbn] = useState('');
  const [newCategory, setNewCategory] = useState<string>('Computer Science & Engineering');
  const [newPublisher, setNewPublisher] = useState('');
  const [newAccession, setNewAccession] = useState('');
  const [newFloor, setNewFloor] = useState('Floor 1');
  const [newRack, setNewRack] = useState('Rack 1');
  const [newShelf, setNewShelf] = useState('Shelf A');
  const [addBookLoading, setAddBookLoading] = useState(false);
  const [addBookError, setAddBookError] = useState<string | null>(null);

  const [editingCopy, setEditingCopy] = useState<{
    copy: BookCopy;
    book: Book;
  } | null>(null);
  const [editAccession, setEditAccession] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editRack, setEditRack] = useState('');
  const [editShelf, setEditShelf] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const isStaff = activeRole === 'LIBRARIAN' || activeRole === 'ADMIN';

  const handleOpenAddCopyForBook = (book: Book) => {
    setAddBookError(null);
    setNewTitle(book.title);
    setNewAuthor(book.author);
    setNewIsbn(book.isbn);
    setNewCategory(book.category);
    setNewPublisher(book.publisher || 'MIT Academic Press');
    const firstCopy = bookCopies.find((c) => c.book_id === book.id);
    if (firstCopy) {
      setNewFloor(firstCopy.floor);
      setNewRack(firstCopy.rack);
      setNewShelf(firstCopy.shelf);
    }
    setNewAccession(`ACC-${Math.floor(100 + Math.random() * 900)}`);
    setAddBookModalOpen(true);
  };

  const handleAddBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBookError(null);
    setAddBookLoading(true);
    try {
      await libraryRepository.addBookWithCopy({
        title: newTitle,
        author: newAuthor,
        isbn: newIsbn,
        category: newCategory,
        publisher: newPublisher || 'MIT Academic Press',
        accession_number: newAccession,
        floor: newFloor,
        rack: newRack,
        shelf: newShelf,
      });
      await onDataRefresh();
      setBannerMessage(
        `Added "${newTitle.trim()}" (${newAccession.trim().toUpperCase()}) at ${newFloor.trim()} · ${newRack.trim()} · ${newShelf.trim()}.`
      );
      setNewTitle('');
      setNewAuthor('');
      setNewIsbn('');
      setNewPublisher('');
      setNewAccession('');
      setAddBookModalOpen(false);
    } catch (err) {
      setAddBookError(err instanceof Error ? err.message : 'Unable to add book copy.');
    } finally {
      setAddBookLoading(false);
    }
  };

  const handleOpenEditCopy = (copy: BookCopy, book: Book) => {
    setEditError(null);
    setEditAccession(copy.accession_number);
    setEditFloor(copy.floor);
    setEditRack(copy.rack);
    setEditShelf(copy.shelf);
    setEditingCopy({ copy, book });
  };

  const handleEditCopySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCopy) return;
    setEditError(null);
    setEditLoading(true);
    try {
      const updated = await libraryRepository.updateBookCopyLocation({
        copyId: editingCopy.copy.id,
        accession_number: editAccession,
        floor: editFloor,
        rack: editRack,
        shelf: editShelf,
      });
      await onDataRefresh();
      setBannerMessage(
        `Updated ${updated.accession_number} stack location to ${updated.floor} · ${updated.rack} · ${updated.shelf}.`
      );
      setEditingCopy(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Unable to update stack location.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteCopy = async (copy: BookCopy, bookTitle: string) => {
    try {
      await libraryRepository.removeBookCopy(copy.id);
      await onDataRefresh();
      setBannerMessage(
        `Removed copy ${copy.accession_number} of "${bookTitle}" from ${copy.floor} · ${copy.rack} · ${copy.shelf}.`
      );
    } catch (err) {
      setBannerMessage(err instanceof Error ? err.message : 'Unable to remove copy.');
    }
  };

  const handleDeleteEntireBook = async (book: Book) => {
    try {
      await libraryRepository.removeEntireBook(book.id);
      await onDataRefresh();
      setBannerMessage(`Removed "${book.title}" and all its copies from the library catalogue.`);
    } catch (err) {
      setBannerMessage(err instanceof Error ? err.message : 'Unable to delete book.');
    }
  };

  const persistRecentSearches = (nextList: string[]) => {
    setRecentSearches(nextList);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextList));
    } catch {
      // Ignore storage quota errors
    }
  };

  const saveTermToRecent = (rawTerm: string) => {
    const clean = rawTerm.trim();
    if (clean.length < 2) return;

    setRecentSearches((prev) => {
      const deduplicated = prev.filter(
        (item) => item.toLowerCase() !== clean.toLowerCase()
      );
      const updated = [clean, ...deduplicated].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage quota errors
      }
      return updated;
    });
  };

  // Auto-save search query after user pauses typing for 850ms
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) return;

    const timer = window.setTimeout(() => {
      saveTermToRecent(trimmed);
    }, 850);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const handleRemoveRecentSearch = (termToRemove: string) => {
    const updated = recentSearches.filter((t) => t !== termToRemove);
    persistRecentSearches(updated);
  };

  const handleClearAllRecentSearches = () => {
    persistRecentSearches([]);
  };

  const handleOpenReviewModal = (book: Book) => {
    setReviewError(null);
    const existingUserReview = currentUser
      ? reviews.find((r) => r.book_id === book.id && r.user_id === currentUser.id)
      : undefined;

    if (existingUserReview) {
      setRatingInput(existingUserReview.rating);
      setCommentInput(existingUserReview.comment);
    } else {
      setRatingInput(5);
      setCommentInput('');
    }
    setReviewModalBook(book);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalBook) return;
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await libraryRepository.submitBookReview({
        bookId: reviewModalBook.id,
        user: currentUser,
        rating: ratingInput,
        comment: commentInput,
      });
      setReviews(libraryRepository.getBookReviews());
      setBannerMessage(
        `Your ${ratingInput}-star review for "${reviewModalBook.title}" has been saved.`
      );
      setCommentInput('');
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : 'Unable to save book review.'
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteOwnReview = async (reviewId: string) => {
    if (!currentUser) return;
    await libraryRepository.deleteBookReview(reviewId, currentUser.id);
    setReviews(libraryRepository.getBookReviews());
    setCommentInput('');
    setRatingInput(5);
  };

  const handleToggleWishlist = (book: Book) => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    const result = libraryRepository.toggleWishlistBook(book.id, currentUser.id);
    setWishlistItems(result.items);
    setBannerMessage(
      result.added
        ? `Added "${book.title}" to your Wishlist.`
        : `Removed "${book.title}" from your Wishlist.`
    );
  };

  const floors = useMemo(() => {
    const set = new Set<string>();
    bookCopies.forEach((c) => set.add(c.floor));
    return Array.from(set).sort();
  }, [bookCopies]);

  const enrichedBooks = useMemo(() => {
    return books.map((book) => {
      const copies = bookCopies.filter((c) => c.book_id === book.id);
      const availableCount = copies.filter((c) => c.status === 'AVAILABLE').length;
      const bookReviews = reviews.filter((r) => r.book_id === book.id);
      const reviewCount = bookReviews.length;
      const averageRating =
        reviewCount > 0
          ? bookReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : 0;

      return {
        ...book,
        copies,
        available_copies: availableCount,
        total_copies: copies.length || book.total_copies,
        reviews: bookReviews,
        reviewCount,
        averageRating,
      };
    });
  }, [books, bookCopies, reviews]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return enrichedBooks.filter((book) => {
      if (selectedCategory !== 'ALL' && book.category !== selectedCategory) {
        return false;
      }

      if (selectedFloor !== 'ALL') {
        const hasFloor = book.copies.some((c) => c.floor === selectedFloor);
        if (!hasFloor) return false;
      }

      if (selectedStatus !== 'ALL') {
        const hasStatus = book.copies.some((c) => c.status === selectedStatus);
        if (!hasStatus) return false;
      }

      if (!q) return true;

      const matchesBookMeta =
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.category.toLowerCase().includes(q) ||
        book.isbn.toLowerCase().includes(q);

      const matchesCopyLocationOrAcc = book.copies.some(
        (copy) =>
          copy.accession_number.toLowerCase().includes(q) ||
          copy.floor.toLowerCase().includes(q) ||
          copy.rack.toLowerCase().includes(q) ||
          copy.shelf.toLowerCase().includes(q) ||
          `${copy.floor} ${copy.rack} ${copy.shelf}`.toLowerCase().includes(q)
      );

      return matchesBookMeta || matchesCopyLocationOrAcc;
    });
  }, [enrichedBooks, searchQuery, selectedCategory, selectedFloor, selectedStatus]);

  const handleConfirmReserve = async () => {
    if (!reservingCopy) return;
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    if (!reserveDateInput) {
      setReserveError('Please select a reservation / pickup date.');
      return;
    }

    setReserveLoading(true);
    setReserveError(null);
    try {
      await libraryRepository.reserveBookCopy({
        copyId: reservingCopy.copy.id,
        userId: currentUser.id,
        reservedForDate: reserveDateInput,
        notes: reserveNotesInput,
      });
      await onDataRefresh();
      const formattedDate = new Date(reserveDateInput).toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      setBannerMessage(
        `Booked & Reserved copy ${reservingCopy.copy.accession_number} of "${reservingCopy.book.title}" for ${formattedDate} under ${currentUser.full_name} (${currentUser.roll_no}).`
      );
      setReservingCopy(null);
      setReserveNotesInput('');
    } catch (err) {
      setReserveError(err instanceof Error ? err.message : 'Unable to reserve this copy.');
    } finally {
      setReserveLoading(false);
    }
  };

  const handleCancelOwnReservation = async (copy: BookCopy, bookTitle: string) => {
    if (!currentUser) return;
    try {
      await libraryRepository.cancelReservation(copy.id, currentUser.id);
      await onDataRefresh();
      setBannerMessage(
        `Cancelled reservation on ${copy.accession_number} ("${bookTitle}").`
      );
    } catch (err) {
      setBannerMessage(
        err instanceof Error ? err.message : 'Unable to cancel reservation.'
      );
    }
  };

  const activeModalBookReviews = useMemo(() => {
    if (!reviewModalBook) return [];
    return reviews.filter((r) => r.book_id === reviewModalBook.id);
  }, [reviews, reviewModalBook]);

  const activeModalAvgRating = useMemo(() => {
    if (activeModalBookReviews.length === 0) return 0;
    return (
      activeModalBookReviews.reduce((sum, r) => sum + r.rating, 0) /
      activeModalBookReviews.length
    );
  }, [activeModalBookReviews]);

  return (
    <section className="space-y-6">
      {/* Header & Real-Time Search Bar */}
      <div className="bg-[#F8FAFC] border border-[#E0F2FE] rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
              Academic Catalogue & Physical Location Tracker
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Search by title, author, ISBN, accession number, or physical stack coordinates (Floor · Rack · Shelf).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-mono">
            <span>Total Titles: {enrichedBooks.length}</span>
            <span>·</span>
            <span>Physical Volumes: {bookCopies.length}</span>
            <span>·</span>
            <span className="text-[#059669] font-semibold">
              Available Now: {bookCopies.filter((c) => c.status === 'AVAILABLE').length}
            </span>
            {isStaff && (
              <button
                type="button"
                onClick={() => {
                  setAddBookError(null);
                  setNewTitle('');
                  setNewAuthor('');
                  setNewIsbn('');
                  setNewPublisher('');
                  setNewAccession('');
                  setAddBookModalOpen(true);
                }}
                className="ml-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white font-sans text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <BookPlus className="w-3.5 h-3.5" />
                + Add Book / Shelf & Rack
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-[#0284C7] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveTermToRecent(searchQuery);
                }
              }}
              onBlur={() => saveTermToRecent(searchQuery)}
              placeholder="Search Title, Author, ISBN, Accession (ACC-CS-001), or Floor 1 Rack 3..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#E0F2FE] rounded-xl text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by Department Category"
              className="w-full px-3.5 py-2.5 bg-white border border-[#E0F2FE] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
            >
              <option value="ALL">All MIT Departments</option>
              {MIT_DEPARTMENTS.filter(
                (d) => d !== 'Library & Administration' && d !== 'Other'
              ).map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 grid grid-cols-2 gap-2">
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              aria-label="Filter by Floor"
              className="w-full px-3 py-2.5 bg-white border border-[#E0F2FE] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
            >
              <option value="ALL">All Floors</option>
              {floors.map((floor) => (
                <option key={floor} value={floor}>
                  {floor}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter by Copy Status"
              className="w-full px-3 py-2.5 bg-white border border-[#E0F2FE] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="ISSUED">ISSUED</option>
              <option value="RESERVED">RESERVED</option>
              <option value="OVERDUE">OVERDUE</option>
            </select>
          </div>
        </div>

        {/* Persisted Recent Searches Section */}
        {recentSearches.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-[#E0F2FE] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
                <History className="w-3.5 h-3.5 text-[#0284C7]" />
                Recent Searches:
              </span>

              {recentSearches.map((term) => {
                const isActive =
                  searchQuery.trim().toLowerCase() === term.toLowerCase();
                return (
                  <div
                    key={term}
                    className={`inline-flex items-center rounded-lg border text-xs transition-colors ${
                      isActive
                        ? 'bg-[#0284C7] text-white border-[#0284C7]'
                        : 'bg-white text-[#0F172A] border-[#E0F2FE] hover:bg-[#F0F9FF] hover:border-sky-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery(term);
                        saveTermToRecent(term);
                      }}
                      className="px-2.5 py-1 font-medium cursor-pointer whitespace-nowrap"
                    >
                      {term}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecentSearch(term)}
                      aria-label={`Remove ${term} from recent searches`}
                      className={`pr-2 pl-0.5 py-1 transition-colors cursor-pointer ${
                        isActive
                          ? 'text-sky-100 hover:text-white'
                          : 'text-slate-400 hover:text-[#DC2626]'
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleClearAllRecentSearches}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#DC2626] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3 h-3" />
              Clear History
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Banner */}
      {bannerMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs text-[#059669] font-medium">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Results Grid */}
      {filteredBooks.length === 0 ? (
        <div className="bg-[#F8FAFC] border border-[#E0F2FE] rounded-2xl p-12 text-center">
          <SlidersHorizontal className="w-8 h-8 text-[#0284C7] mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-bold text-[#0F172A]">
            No Matching Library Volumes Found
          </h3>
          <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
            No books or physical shelf locations matched your filter criteria. Try clearing your search query or switching department filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedFloor('ALL');
              setSelectedStatus('ALL');
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-[#0284C7] text-white text-xs font-semibold hover:bg-sky-700 transition-colors cursor-pointer"
          >
            Reset Catalogue Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredBooks.map((book) => {
            const primaryCopy = book.copies[0];
            const allIssuedOrOverdue = book.available_copies === 0;

            return (
              <article
                key={book.id}
                className="bg-white border border-[#E0F2FE] rounded-2xl p-5 flex flex-col justify-between transition-colors hover:border-sky-300"
              >
                <div>
                  {/* Top Meta Line */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                    <span className="font-medium text-[#0284C7] truncate">
                      {book.category}
                    </span>
                    <span className="font-mono shrink-0">ISBN: {book.isbn}</span>
                  </div>

                  {/* Book Title & Author */}
                  <h2 className="text-base sm:text-lg font-bold text-[#0F172A] leading-snug">
                    {book.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    {book.author}
                  </p>

                  {/* Average Rating Summary & Review Trigger Row */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-sky-50">
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((starVal) => {
                          const filled = starVal <= Math.round(book.averageRating);
                          return (
                            <Star
                              key={starVal}
                              className={`w-3.5 h-3.5 ${
                                filled
                                  ? 'text-amber-500 fill-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          );
                        })}
                      </div>
                      {book.reviewCount > 0 ? (
                        <span className="font-mono font-semibold text-[#0F172A] tabular-nums">
                          {book.averageRating.toFixed(1)} / 5.0
                        </span>
                      ) : (
                        <span className="text-slate-400">No ratings yet</span>
                      )}
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">
                        {book.reviewCount}{' '}
                        {book.reviewCount === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Wishlist Toggle Button */}
                      {(() => {
                        const isWishlisted = Boolean(
                          currentUser &&
                            wishlistItems.some(
                              (w) =>
                                w.book_id === book.id &&
                                w.user_id === currentUser.id
                            )
                        );
                        return (
                          <button
                            type="button"
                            onClick={() => handleToggleWishlist(book)}
                            aria-label={
                              isWishlisted
                                ? 'Remove from Wishlist'
                                : 'Save to Wishlist'
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              isWishlisted
                                ? 'bg-[#0284C7] text-white border-[#0284C7]'
                                : 'bg-white hover:bg-[#F0F9FF] text-slate-700 hover:text-[#0284C7] border-[#E0F2FE]'
                            }`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                isWishlisted ? 'fill-white text-white' : 'text-[#0284C7]'
                              }`}
                            />
                            {isWishlisted ? 'Wishlisted' : 'Save to Wishlist'}
                          </button>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={() => handleOpenReviewModal(book)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F0F9FF] hover:bg-[#0284C7] text-[#0284C7] hover:text-white border border-[#E0F2FE] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        {book.reviewCount > 0 ? 'Reviews & Rate' : 'Rate & Review'}
                      </button>
                    </div>
                  </div>

                  {/* Primary Physical Stack Locator Strip */}
                  {primaryCopy && (
                    <div className="mt-3.5 p-3 rounded-xl bg-[#F0F9FF] border border-[#E0F2FE] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                        <MapPin className="w-4 h-4 text-[#0284C7] shrink-0" />
                        <span>Physical Stack Location:</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#0284C7]">
                        <span className="px-2 py-0.5 rounded bg-white border border-[#E0F2FE]">
                          {primaryCopy.floor}
                        </span>
                        <span>·</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-[#E0F2FE]">
                          {primaryCopy.rack}
                        </span>
                        <span>·</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-[#E0F2FE]">
                          {primaryCopy.shelf}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Individual Physical Copies Table */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#0284C7]" />
                        Physical Accession Copies ({book.available_copies} of {book.total_copies} Available)
                      </span>

                      {isStaff && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAddCopyForBook(book)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F0F9FF] hover:bg-sky-100 text-[#0284C7] border border-[#E0F2FE] text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            Add Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntireBook(book)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 hover:bg-[#DC2626] text-[#DC2626] hover:text-white border border-red-200 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove Book
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="divide-y divide-[#E0F2FE] border border-[#E0F2FE] rounded-xl overflow-hidden bg-[#F8FAFC]">
                      {book.copies.map((copy) => {
                        const statusStyle = STATUS_BADGE_STYLES[copy.status];
                        const isIssued = copy.status === 'ISSUED' || copy.status === 'OVERDUE';

                        return (
                          <div
                            key={copy.id}
                            className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs bg-white hover:bg-[#F8FAFC] transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0">
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono font-semibold text-[#0F172A]">
                                  {copy.accession_number}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="text-slate-600 font-mono">
                                  {copy.floor} · {copy.rack} · {copy.shelf}
                                </span>
                              </div>

                              {copy.status === 'RESERVED' && copy.reserved_for_date && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#D97706] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                  <Calendar className="w-3 h-3" />
                                  Reserved for {new Date(copy.reserved_for_date).toLocaleDateString('en-IN')}
                                  {copy.reserved_by_roll_no ? ` (${copy.reserved_by_roll_no})` : ''}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Semantic Status Badge */}
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold border ${statusStyle.bgClass} ${statusStyle.textClass} ${statusStyle.borderClass}`}
                              >
                                {statusStyle.label}
                              </span>

                              {/* Action button for Students to Book / Reserve with Date (for AVAILABLE or ISSUED copies) */}
                              {(copy.status === 'AVAILABLE' || copy.status === 'ISSUED') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReserveError(null);
                                    const defaultDate = new Date();
                                    if (copy.status === 'ISSUED') {
                                      defaultDate.setDate(defaultDate.getDate() + 3);
                                    } else {
                                      defaultDate.setDate(defaultDate.getDate() + 1);
                                    }
                                    setReserveDateInput(defaultDate.toISOString().split('T')[0]);
                                    setReserveNotesInput('');
                                    setReservingCopy({ copy, book });
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0284C7] hover:bg-sky-700 text-white text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  <Calendar className="w-3 h-3" />
                                  {copy.status === 'AVAILABLE'
                                    ? 'Book / Reserve Date'
                                    : 'Reserve with Date'}
                                </button>
                              )}

                              {/* Allow student (or staff) to cancel an active reservation */}
                              {copy.status === 'RESERVED' &&
                                currentUser &&
                                (copy.reserved_by_user_id === currentUser.id || isStaff) && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelOwnReservation(copy, book.title)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 hover:bg-[#DC2626] text-[#DC2626] hover:text-white border border-red-200 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                    Cancel Booking
                                  </button>
                                )}

                              {/* Quick Librarian Desk Shortcut & Shelf/Copy Controls if role is LIBRARIAN or ADMIN */}
                              {isStaff && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditCopy(copy, book)}
                                    title="Edit Accession, Floor, Rack No., or Shelf No."
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E0F2FE] bg-white hover:bg-[#F8FAFC] text-slate-700 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer"
                                  >
                                    <Pencil className="w-3 h-3 text-[#0284C7]" />
                                    Edit Shelf/Rack
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isIssued}
                                    onClick={() => handleDeleteCopy(copy, book.title)}
                                    title={
                                      isIssued
                                        ? 'Return copy before removing'
                                        : 'Remove this physical copy'
                                    }
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-semibold transition-colors whitespace-nowrap ${
                                      isIssued
                                        ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                        : 'bg-red-50 hover:bg-[#DC2626] text-[#DC2626] hover:text-white border-red-200 cursor-pointer'
                                    }`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>

                                  {onOpenDeskWithAccession && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onOpenDeskWithAccession(
                                          copy.accession_number,
                                          isIssued ? 'RETURN' : 'ISSUE'
                                        )
                                      }
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E0F2FE] bg-[#F0F9FF] hover:bg-sky-100 text-[#0284C7] text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer"
                                    >
                                      {isIssued ? 'Return Copy' : 'Issue Copy'}
                                      <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Footer Summary */}
                <div className="mt-4 pt-3 border-t border-sky-50 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Publisher: <strong className="font-medium text-slate-700">{book.publisher || 'MIT Academic Press'}</strong>
                  </span>
                  {allIssuedOrOverdue ? (
                    <span className="text-[#D97706] font-semibold">
                      All copies currently in circulation — Reservation enabled
                    </span>
                  ) : (
                    <span className="text-[#059669] font-semibold">
                      Ready for immediate checkout
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          BOOK REVIEWS & RATING MODAL
      ===================================================================== */}
      {reviewModalBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-[#E0F2FE] shadow-xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-[#F0F9FF] border-b border-[#E0F2FE] px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold text-[#0284C7]">
                  MIT Student Feedback & Ratings
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#0F172A] leading-snug mt-0.5">
                  {reviewModalBook.title}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {reviewModalBook.author}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalBook(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
                aria-label="Close reviews modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Aggregate Rating Summary Bar */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E0F2FE] flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Average Student Rating
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold font-mono text-[#0F172A] tabular-nums">
                      {activeModalBookReviews.length > 0
                        ? activeModalAvgRating.toFixed(1)
                        : '—'}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <Star
                          key={starVal}
                          className={`w-4 h-4 ${
                            starVal <= Math.round(activeModalAvgRating)
                              ? 'text-amber-500 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono text-xs text-slate-600">
                  <span className="font-bold text-[#0284C7] tabular-nums">
                    {activeModalBookReviews.length}
                  </span>{' '}
                  {activeModalBookReviews.length === 1
                    ? 'Verified Review'
                    : 'Verified Reviews'}
                </div>
              </div>

              {/* Submit / Update Rating Form */}
              {currentUser ? (
                <form
                  onSubmit={handleSubmitReview}
                  className="p-4 rounded-xl bg-white border border-[#E0F2FE] space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A]">
                      Leave Your Rating & Academic Review
                    </span>
                    <span className="text-[11px] font-mono text-[#0284C7]">
                      Posting as {currentUser.full_name} ({currentUser.roll_no})
                    </span>
                  </div>

                  {reviewError && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-[#DC2626]">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{reviewError}</span>
                    </div>
                  )}

                  {/* Interactive 1-5 Star Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Select Star Rating:
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const active =
                          starVal <= (hoverRating !== null ? hoverRating : ratingInput);
                        return (
                          <button
                            key={starVal}
                            type="button"
                            onMouseEnter={() => setHoverRating(starVal)}
                            onMouseLeave={() => setHoverRating(null)}
                            onClick={() => setRatingInput(starVal)}
                            aria-label={`Rate ${starVal} out of 5 stars`}
                            className="p-1 rounded-md hover:bg-[#F0F9FF] transition-colors cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 transition-transform ${
                                active
                                  ? 'text-amber-500 fill-amber-400 scale-105'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                      <span className="ml-2 text-xs font-mono font-semibold text-[#0F172A]">
                        {ratingInput} / 5 Stars
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Your Feedback for Fellow MIT Students:
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Share how helpful this textbook was for your syllabus, exam preparation, or project research..."
                      className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0284C7]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs text-[#D97706]">
                  <span>
                    Please sign in with your @mit.asia account to rate and review this book.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewModalBook(null);
                      onRequireAuth();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#0284C7] text-white font-semibold whitespace-nowrap cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              )}

              {/* Student Reviews List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0F172A]">
                  Student Reviews ({activeModalBookReviews.length})
                </h4>

                {activeModalBookReviews.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#F8FAFC] border border-[#E0F2FE] text-center text-xs text-slate-500">
                    No student reviews have been posted for this volume yet. Be the first to rate and share feedback above!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeModalBookReviews.map((rev) => {
                      const isOwn = currentUser?.id === rev.user_id;
                      return (
                        <div
                          key={rev.id}
                          className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E0F2FE] space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold text-[#0F172A]">
                                {rev.user_name}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                <span className="font-mono text-[#0284C7]">
                                  {rev.roll_no}
                                </span>
                                <span>·</span>
                                <span>{rev.department}</span>
                                <span>·</span>
                                <span className="font-mono">
                                  {new Date(rev.created_at).toLocaleDateString('en-IN')}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3.5 h-3.5 ${
                                      s <= rev.rating
                                        ? 'text-amber-500 fill-amber-400'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              {isOwn && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOwnReview(rev.id)}
                                  title="Delete your review"
                                  className="text-slate-400 hover:text-[#DC2626] p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed">
                            {rev.comment}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book & Reserve Copy with Date Confirmation Modal */}
      {reservingCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E0F2FE] shadow-xl overflow-hidden">
            <div className="bg-[#F0F9FF] border-b border-[#E0F2FE] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookmarkPlus className="w-5 h-5 text-[#0284C7]" />
                <div>
                  <span className="text-[11px] font-semibold text-[#0284C7]">
                    Student Book & Date Reservation
                  </span>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Book & Reserve Copy with Date
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReservingCopy(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {reserveError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-[#DC2626]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{reserveError}</span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E0F2FE] space-y-1.5">
                <p className="text-sm font-bold text-[#0F172A]">
                  {reservingCopy.book.title}
                </p>
                <p className="text-xs text-slate-600">
                  {reservingCopy.book.author}
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-mono text-[#0284C7]">
                  <span>Accession: {reservingCopy.copy.accession_number}</span>
                  <span>·</span>
                  <span>
                    {reservingCopy.copy.floor} · {reservingCopy.copy.rack} · {reservingCopy.copy.shelf}
                  </span>
                </div>
              </div>

              {/* Date Picker Input for Student Booking / Reservation */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Select Booking / Reservation Date *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#0284C7] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={reserveDateInput}
                      onChange={(e) => setReserveDateInput(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Choose the date you want to pick up or reserve this book copy from the library desk.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Purpose / Pickup Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={reserveNotesInput}
                    onChange={(e) => setReserveNotesInput(e.target.value)}
                    placeholder="e.g., Mid-semester exam preparation / Morning pickup"
                    className="w-full px-3.5 py-2 text-xs bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>
              </div>

              {currentUser ? (
                <div className="p-3 rounded-xl bg-[#F0F9FF] border border-[#E0F2FE] text-xs text-slate-600 space-y-1">
                  <p>
                    Booking for Student:{' '}
                    <strong className="text-[#0F172A]">{currentUser.full_name}</strong> (
                    <span className="font-mono text-[#0284C7]">{currentUser.roll_no}</span>)
                  </p>
                  <p>
                    Scheduled Date:{' '}
                    <strong className="font-mono text-[#0284C7]">
                      {reserveDateInput
                        ? new Date(reserveDateInput).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Select a date'}
                    </strong>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#D97706]">
                  Please sign in with your @mit.asia account to book & reserve this copy.
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setReservingCopy(null)}
                  className="px-4 py-2 rounded-xl border border-[#E0F2FE] text-xs font-semibold text-slate-600 hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reserveLoading}
                  onClick={handleConfirmReserve}
                  className="px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {reserveLoading ? 'Confirming Booking...' : 'Confirm Date Reservation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Librarian / Admin Add Book & Physical Stack Modal */}
      {addBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-[#E0F2FE] shadow-xl overflow-hidden my-8">
            <div className="bg-[#F0F9FF] border-b border-[#E0F2FE] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookPlus className="w-5 h-5 text-[#0284C7]" />
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Add Book & Assign Floor, Rack No., and Shelf No.
                  </h3>
                  <p className="text-xs text-slate-600">
                    Add a new textbook or additional physical copy to the MIT Catalogue
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddBookModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBookSubmit} className="p-6 space-y-4">
              {addBookError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-[#DC2626]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addBookError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Book Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Compiler Design: Principles, Techniques & Tools"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Author(s) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="e.g., Alfred V. Aho, Monica S. Lam"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    ISBN-13 *
                  </label>
                  <input
                    type="text"
                    required
                    value={newIsbn}
                    onChange={(e) => setNewIsbn(e.target.value)}
                    placeholder="e.g., 978-0321486813"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Department Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                  >
                    {MIT_DEPARTMENTS.filter(
                      (d) => d !== 'Library & Administration' && d !== 'Other'
                    ).map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Publisher
                  </label>
                  <input
                    type="text"
                    value={newPublisher}
                    onChange={(e) => setNewPublisher(e.target.value)}
                    placeholder="e.g., Pearson Education"
                    className="w-full px-3.5 py-2 text-xs bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F0F9FF] border border-[#E0F2FE] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
                  <MapPin className="w-4 h-4 text-[#0284C7]" />
                  <span>Physical Location Coordinates (Accession · Floor · Rack No. · Shelf No.)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Accession No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={newAccession}
                      onChange={(e) => setNewAccession(e.target.value.toUpperCase())}
                      placeholder="ACC-CS-012"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E0F2FE] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Floor No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={newFloor}
                      onChange={(e) => setNewFloor(e.target.value)}
                      placeholder="Floor 1"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E0F2FE] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Rack No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={newRack}
                      onChange={(e) => setNewRack(e.target.value)}
                      placeholder="Rack 3"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E0F2FE] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Shelf No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={newShelf}
                      onChange={(e) => setNewShelf(e.target.value)}
                      placeholder="Shelf A"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E0F2FE] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAddBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E0F2FE] text-xs font-semibold text-slate-600 hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addBookLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {addBookLoading ? 'Saving...' : 'Save Book & Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Librarian / Admin Edit Shelf & Rack Location Modal */}
      {editingCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E0F2FE] shadow-xl overflow-hidden">
            <div className="bg-[#F0F9FF] border-b border-[#E0F2FE] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Pencil className="w-4 h-4 text-[#0284C7]" />
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Edit Floor, Rack No. & Shelf No.
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-1">
                    {editingCopy.book.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCopy(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditCopySubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-[#DC2626]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Accession Number
                </label>
                <input
                  type="text"
                  required
                  value={editAccession}
                  onChange={(e) => setEditAccession(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Floor No.
                  </label>
                  <input
                    type="text"
                    required
                    value={editFloor}
                    onChange={(e) => setEditFloor(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Rack No.
                  </label>
                  <input
                    type="text"
                    required
                    value={editRack}
                    onChange={(e) => setEditRack(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Shelf No.
                  </label>
                  <input
                    type="text"
                    required
                    value={editShelf}
                    onChange={(e) => setEditShelf(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCopy(null)}
                  className="px-4 py-2 rounded-xl border border-[#E0F2FE] text-xs font-semibold text-slate-600 hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {editLoading ? 'Saving...' : 'Update Stack Coordinates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
