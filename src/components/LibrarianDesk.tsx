import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BookUp,
  BookDown,
  Calendar,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  User,
  Hash,
  X,
  Search,
  Plus,
  Trash2,
  Pencil,
  MapPin,
  Layers,
  BookPlus,
  Clock,
  BookmarkCheck,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
  FileText,
  Printer,
  Download,
  RefreshCw,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  Book,
  BookCopy,
  Borrowing,
  Fine,
  MAX_LOAN_RENEWALS,
  MIT_DEPARTMENTS,
  Profile,
} from '../types/database';
import { calculateOverdueFine, libraryRepository } from '../lib/supabase';

interface LibrarianDeskProps {
  profiles: Profile[];
  books: Book[];
  bookCopies: BookCopy[];
  borrowings: Borrowing[];
  fines?: Fine[];
  initialAccession?: string;
  initialMode?: 'ISSUE' | 'RETURN';
  onDataRefresh: () => Promise<void>;
}

export const LibrarianDesk: React.FC<LibrarianDeskProps> = ({
  profiles,
  books,
  bookCopies,
  borrowings,
  fines = [],
  initialAccession = '',
  initialMode = 'ISSUE',
  onDataRefresh,
}) => {
  // Modal states
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [addBookModalOpen, setAddBookModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [editingCopy, setEditingCopy] = useState<{
    copy: BookCopy;
    book?: Book;
  } | null>(null);

  // Issue Form State
  const [studentRollInput, setStudentRollInput] = useState('');
  const [issueAccessionInput, setIssueAccessionInput] = useState(
    initialMode === 'ISSUE' && initialAccession ? initialAccession : 'ACC-CS-001'
  );
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Return Form State
  const [returnAccessionInput, setReturnAccessionInput] = useState(
    initialMode === 'RETURN' && initialAccession ? initialAccession : ''
  );
  const [collectFineImmediately, setCollectFineImmediately] = useState(true);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Add Book & Physical Stack Location Form State
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newIsbn, setNewIsbn] = useState('');
  const [newCategory, setNewCategory] = useState<string>('Computer Science & Engineering');
  const [newPublisher, setNewPublisher] = useState('');
  const [newPublishedYear, setNewPublishedYear] = useState<string>(
    String(new Date().getFullYear())
  );
  const [newAccession, setNewAccession] = useState('');
  const [newFloor, setNewFloor] = useState('Floor 1');
  const [newRack, setNewRack] = useState('Rack 1');
  const [newShelf, setNewShelf] = useState('Shelf A');
  const [addBookLoading, setAddBookLoading] = useState(false);
  const [addBookError, setAddBookError] = useState<string | null>(null);

  // Edit Physical Copy Stack Location Form State
  const [editAccession, setEditAccession] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editRack, setEditRack] = useState('');
  const [editShelf, setEditShelf] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Transaction Receipt Notification
  const [receiptBanner, setReceiptBanner] = useState<{
    type: 'ISSUE' | 'RETURN' | 'INVENTORY';
    title: string;
    details: string;
  } | null>(null);

  // Filter for active desk circulation table
  const [deskFilter, setDeskFilter] = useState('');

  // Filter for Physical Inventory & Shelf / Rack Manager
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFloorFilter, setInventoryFloorFilter] = useState('ALL');
  const [inventoryDepartmentFilter, setInventoryDepartmentFilter] = useState('ALL');
  const [inventoryViewMode, setInventoryViewMode] = useState<'COLLECTION_CARDS' | 'COPIES_TABLE'>('COLLECTION_CARDS');

  // Synchronize when parent passes a shortcut accession
  React.useEffect(() => {
    if (initialAccession) {
      if (initialMode === 'ISSUE') {
        setIssueAccessionInput(initialAccession);
        setIssueModalOpen(true);
      } else {
        setReturnAccessionInput(initialAccession);
        setReturnModalOpen(true);
      }
    }
  }, [initialAccession, initialMode]);

  // 14-day auto due date preview
  const dueDatePreview = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const availableCopiesList = useMemo(
    () => bookCopies.filter((c) => c.status === 'AVAILABLE' || c.status === 'RESERVED'),
    [bookCopies]
  );

  const activeLoansEnriched = useMemo(() => {
    return borrowings
      .filter((b) => b.return_date === null)
      .map((loan) => {
        const copy = bookCopies.find((c) => c.id === loan.copy_id);
        const book = books.find((bk) => bk.id === copy?.book_id);
        const student = profiles.find((p) => p.id === loan.user_id);
        const liveFine = calculateOverdueFine(
          loan.due_date,
          null,
          loan.fine_started,
          loan.fine_started_at
        );
        return {
          ...loan,
          copy,
          book,
          student,
          liveFine,
        };
      });
  }, [borrowings, bookCopies, books, profiles]);

  // Reserved copies queue for Librarian verification (Did student take the book within 24 hrs?)
  const reservedCopiesQueue = useMemo(() => {
    const nowMs = Date.now();
    return bookCopies
      .filter((c) => c.status === 'RESERVED')
      .map((copy) => {
        const book = books.find((b) => b.id === copy.book_id);
        const student = profiles.find((p) => p.id === copy.reserved_by_user_id);
        const expiryIso = copy.reservation_expires_at;
        const expiryMs = expiryIso ? new Date(expiryIso).getTime() : nowMs + 24 * 60 * 60 * 1000;
        const hoursRemaining = Math.max(0, Math.ceil((expiryMs - nowMs) / (1000 * 60 * 60)));
        return {
          copy,
          book,
          student,
          hoursRemaining,
        };
      });
  }, [bookCopies, books, profiles]);

  const handleLibrarianMarkStudentTookBook = async (copy: BookCopy) => {
    setReceiptBanner(null);
    try {
      const result = await libraryRepository.librarianConfirmReservationPickup(copy.id);
      await onDataRefresh();
      setReceiptBanner({
        type: 'ISSUE',
        title: `Marked Taken by Student — Issued ${result.copy.accession_number}`,
        details: `Student ${result.student.full_name} (${result.student.roll_no}) collected "${result.book?.title || 'Volume'}". 14-day loan started.`,
      });
    } catch (err) {
      setReceiptBanner({
        type: 'INVENTORY',
        title: 'Could Not Mark Reservation Taken',
        details: err instanceof Error ? err.message : 'Unable to issue reserved copy.',
      });
    }
  };

  const handleLibrarianMarkStudentDidNotTake = async (copy: BookCopy, bookTitle?: string) => {
    setReceiptBanner(null);
    try {
      await libraryRepository.cancelReservation(
        copy.id,
        copy.reserved_by_user_id || '',
        'NOT_TAKEN_24H'
      );
      await onDataRefresh();
      setReceiptBanner({
        type: 'INVENTORY',
        title: `Marked Not Taken — Reservation Cancelled for ${copy.accession_number}`,
        details: `"${bookTitle || 'Reserved Book'}" was not collected within 24 hours. Reservation cancelled and copy restored to AVAILABLE.`,
      });
    } catch (err) {
      setReceiptBanner({
        type: 'INVENTORY',
        title: 'Could Not Cancel Reservation',
        details: err instanceof Error ? err.message : 'Unable to cancel reservation.',
      });
    }
  };

  const handleLibrarianMarkNotReturnedAndStartFine = async (borrowingId: string) => {
    setReceiptBanner(null);
    try {
      const result = await libraryRepository.librarianMarkNotReturnedAndStartFine(borrowingId);
      await onDataRefresh();
      setReceiptBanner({
        type: 'RETURN',
        title: `Marked NOT RETURNED & Started ₹100/Day Fine — ${result.copy?.accession_number || ''}`,
        details: `Borrower: ${result.student?.full_name || 'Student'} (${result.student?.roll_no || ''}) · Active Fine Assessed: ₹${result.fineRecord.amount} (₹100/day fining system active).`,
      });
    } catch (err) {
      setReceiptBanner({
        type: 'RETURN',
        title: 'Could Not Start Fine System',
        details: err instanceof Error ? err.message : 'Unable to start fine for this loan.',
      });
    }
  };

  // Pending Student Loan Renewal Requests Queue
  const pendingRenewalLoans = useMemo(
    () => activeLoansEnriched.filter((l) => l.renewal_status === 'PENDING'),
    [activeLoansEnriched]
  );

  const handleLibrarianRenewalDecision = async (
    borrowingId: string,
    decision: 'APPROVED' | 'REJECTED'
  ) => {
    setReceiptBanner(null);
    try {
      const result = await libraryRepository.librarianHandleLoanRenewal(
        borrowingId,
        decision
      );
      await onDataRefresh();
      setReceiptBanner({
        type: 'ISSUE',
        title:
          decision === 'APPROVED'
            ? `Renewal Approved (+7 Days) — ${result.copy?.accession_number || ''}`
            : `Renewal Request Declined — ${result.copy?.accession_number || ''}`,
        details:
          decision === 'APPROVED'
            ? `Extended "${result.book?.title || 'Book'}" for ${result.student?.full_name || 'Student'} (${result.student?.roll_no || ''}). New Due Date: ${new Date(
                result.borrowing.due_date
              ).toLocaleDateString('en-IN')} (${result.borrowing.renewal_count}/${MAX_LOAN_RENEWALS} renewals used).`
            : `Declined renewal request for "${result.book?.title || 'Book'}". Current due date remains ${new Date(
                result.borrowing.due_date
              ).toLocaleDateString('en-IN')}.`,
      });
    } catch (err) {
      setReceiptBanner({
        type: 'INVENTORY',
        title: 'Could Not Process Loan Renewal',
        details: err instanceof Error ? err.message : 'Unable to process renewal decision.',
      });
    }
  };

  // Live Return Preview based on typed Accession Number
  const selectedReturnLoan = useMemo(() => {
    const q = returnAccessionInput.trim().toUpperCase();
    if (!q) return null;
    return activeLoansEnriched.find(
      (item) =>
        item.copy?.accession_number.toUpperCase() === q ||
        item.id.toUpperCase() === q
    );
  }, [activeLoansEnriched, returnAccessionInput]);

  const filteredActiveLoans = useMemo(() => {
    const q = deskFilter.trim().toLowerCase();
    if (!q) return activeLoansEnriched;
    return activeLoansEnriched.filter(
      (item) =>
        item.copy?.accession_number.toLowerCase().includes(q) ||
        item.book?.title.toLowerCase().includes(q) ||
        item.student?.full_name.toLowerCase().includes(q) ||
        item.student?.roll_no.toLowerCase().includes(q)
    );
  }, [activeLoansEnriched, deskFilter]);

  const enrichedInventoryCopies = useMemo(() => {
    return bookCopies.map((copy) => {
      const book = books.find((b) => b.id === copy.book_id);
      return {
        ...copy,
        book,
      };
    });
  }, [bookCopies, books]);

  const uniqueFloors = useMemo(() => {
    const set = new Set<string>();
    bookCopies.forEach((c) => set.add(c.floor));
    return Array.from(set).sort();
  }, [bookCopies]);

  const filteredInventoryCopies = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();
    return enrichedInventoryCopies.filter((item) => {
      if (inventoryFloorFilter !== 'ALL' && item.floor !== inventoryFloorFilter) {
        return false;
      }
      if (
        inventoryDepartmentFilter !== 'ALL' &&
        item.book?.category !== inventoryDepartmentFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.accession_number.toLowerCase().includes(q) ||
        item.floor.toLowerCase().includes(q) ||
        item.rack.toLowerCase().includes(q) ||
        item.shelf.toLowerCase().includes(q) ||
        (item.book?.title || '').toLowerCase().includes(q) ||
        (item.book?.author || '').toLowerCase().includes(q) ||
        (item.book?.isbn || '').toLowerCase().includes(q) ||
        (item.book?.category || '').toLowerCase().includes(q)
      );
    });
  }, [enrichedInventoryCopies, inventorySearch, inventoryFloorFilter, inventoryDepartmentFilter]);

  // Collection Inventory Summary Cards (Per-Book aggregation of Total Copies, Issued Copies, and Shelf Locations)
  const collectionInventoryBooks = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();

    return books
      .map((book) => {
        const copies = bookCopies.filter((c) => c.book_id === book.id);
        const totalPhysicalCopies = copies.length || book.total_copies;
        const issuedCopiesCount = copies.filter(
          (c) => c.status === 'ISSUED' || c.status === 'OVERDUE'
        ).length;
        const reservedCopiesCount = copies.filter((c) => c.status === 'RESERVED').length;
        const availableCopiesCount = copies.filter((c) => c.status === 'AVAILABLE').length;

        // Deduplicated list of unique physical shelf locations + per-copy breakdown
        const uniqueLocations = Array.from(
          new Set(copies.map((c) => `${c.floor} · ${c.rack} · ${c.shelf}`))
        );

        return {
          book,
          copies,
          totalPhysicalCopies,
          issuedCopiesCount,
          reservedCopiesCount,
          availableCopiesCount,
          uniqueLocations,
        };
      })
      .filter((entry) => {
        if (
          inventoryDepartmentFilter !== 'ALL' &&
          entry.book.category !== inventoryDepartmentFilter
        ) {
          return false;
        }
        if (inventoryFloorFilter !== 'ALL') {
          const hasFloor = entry.copies.some((c) => c.floor === inventoryFloorFilter);
          if (!hasFloor) return false;
        }
        if (!q) return true;

        const matchesBook =
          entry.book.title.toLowerCase().includes(q) ||
          entry.book.author.toLowerCase().includes(q) ||
          entry.book.isbn.toLowerCase().includes(q) ||
          entry.book.category.toLowerCase().includes(q);

        const matchesCopy = entry.copies.some(
          (c) =>
            c.accession_number.toLowerCase().includes(q) ||
            c.floor.toLowerCase().includes(q) ||
            c.rack.toLowerCase().includes(q) ||
            c.shelf.toLowerCase().includes(q) ||
            `${c.floor} ${c.rack} ${c.shelf}`.toLowerCase().includes(q)
        );

        return matchesBook || matchesCopy;
      });
  }, [books, bookCopies, inventorySearch, inventoryFloorFilter, inventoryDepartmentFilter]);

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueError(null);
    setIssueLoading(true);

    try {
      const result = await libraryRepository.issueBookCopy({
        rollNoOrStudentId: studentRollInput,
        accessionNumber: issueAccessionInput,
      });
      await onDataRefresh();
      setReceiptBanner({
        type: 'ISSUE',
        title: `Issued ${result.copy.accession_number} — "${result.book?.title || 'Library Volume'}"`,
        details: `Borrower: ${result.student.full_name} (${result.student.roll_no}) · Due Date (14 Days): ${new Date(
          result.borrowing.due_date
        ).toLocaleDateString('en-IN')}`,
      });
      setIssueModalOpen(false);
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : 'Could not issue book copy.');
    } finally {
      setIssueLoading(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReturnError(null);
    setReturnLoading(true);

    try {
      const result = await libraryRepository.returnBookCopy({
        accessionNumberOrBorrowingId: returnAccessionInput,
        collectFineNow: collectFineImmediately,
      });
      await onDataRefresh();
      setReceiptBanner({
        type: 'RETURN',
        title: `Returned ${result.copy.accession_number} — Status Restored to AVAILABLE`,
        details:
          result.fineAmount > 0
            ? `Overdue Fine Calculated (₹100/day): ₹${result.fineAmount} (${
                collectFineImmediately ? 'Marked PAID' : 'Added to Student Unpaid Fines'
              })`
            : 'Returned on time (₹0 overdue fine). Copy is back on shelf.',
      });
      setReturnModalOpen(false);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : 'Could not process book return.');
    } finally {
      setReturnLoading(false);
    }
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
      setReceiptBanner({
        type: 'INVENTORY',
        title: `Added Book Copy ${newAccession.trim().toUpperCase()} — "${newTitle.trim()}"`,
        details: `Assigned Physical Coordinates: ${newFloor.trim()} · ${newRack.trim()} · ${newShelf.trim()} | Category: ${newCategory}`,
      });
      setNewTitle('');
      setNewAuthor('');
      setNewIsbn('');
      setNewPublisher('');
      setNewAccession('');
      setAddBookModalOpen(false);
    } catch (err) {
      setAddBookError(err instanceof Error ? err.message : 'Failed to add book and physical copy.');
    } finally {
      setAddBookLoading(false);
    }
  };

  const handleOpenEditCopyModal = (copy: BookCopy, book?: Book) => {
    setEditError(null);
    setEditAccession(copy.accession_number);
    setEditFloor(copy.floor);
    setEditRack(copy.rack);
    setEditShelf(copy.shelf);
    setEditingCopy({ copy, book });
  };

  const handleUpdateCopyLocationSubmit = async (e: React.FormEvent) => {
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
      setReceiptBanner({
        type: 'INVENTORY',
        title: `Updated Stack Coordinates for ${updated.accession_number}`,
        details: `${editingCopy.book?.title || 'Book Copy'} relocated to ${updated.floor} · ${updated.rack} · ${updated.shelf}`,
      });
      setEditingCopy(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Unable to update shelf/rack location.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveCopy = async (copy: BookCopy, bookTitle?: string) => {
    setReceiptBanner(null);
    try {
      await libraryRepository.removeBookCopy(copy.id);
      await onDataRefresh();
      setReceiptBanner({
        type: 'INVENTORY',
        title: `Removed Copy ${copy.accession_number} from Library Inventory`,
        details: `Deleted "${bookTitle || 'Volume'}" copy from ${copy.floor} · ${copy.rack} · ${copy.shelf}.`,
      });
    } catch (err) {
      setReceiptBanner({
        type: 'INVENTORY',
        title: 'Cannot Remove Copy',
        details: err instanceof Error ? err.message : 'Unable to remove this copy.',
      });
    }
  };

  const handleRemoveEntireBook = async (book: Book) => {
    setReceiptBanner(null);
    try {
      await libraryRepository.removeEntireBook(book.id);
      await onDataRefresh();
      setReceiptBanner({
        type: 'INVENTORY',
        title: `Removed Book Title "${book.title}" & All Copies`,
        details: `ISBN ${book.isbn} and all associated shelf copies were removed from the catalogue.`,
      });
    } catch (err) {
      setReceiptBanner({
        type: 'INVENTORY',
        title: 'Cannot Delete Book Title',
        details: err instanceof Error ? err.message : 'Unable to delete book title.',
      });
    }
  };

  const handlePrefillAddCopyForExistingBook = (book: Book) => {
    setAddBookError(null);
    setNewTitle(book.title);
    setNewAuthor(book.author);
    setNewIsbn(book.isbn);
    setNewCategory(book.category);
    setNewPublisher(book.publisher || 'MIT Academic Press');
    const existingCopies = bookCopies.filter((c) => c.book_id === book.id);
    const firstCopy = existingCopies[0];
    if (firstCopy) {
      setNewFloor(firstCopy.floor);
      setNewRack(firstCopy.rack);
      setNewShelf(firstCopy.shelf);
    }
    setNewAccession(`ACC-${Math.floor(100 + Math.random() * 900)}`);
    setAddBookModalOpen(true);
  };

  // =========================================================================
  // OVERDUE BOOKS & FINES COLLECTED SUMMARY REPORT DATA + PDF GENERATOR
  // =========================================================================
  const overdueLoansReportList = useMemo(() => {
    return activeLoansEnriched.filter(
      (loan) => loan.liveFine > 0 || loan.fine_started || loan.status === 'OVERDUE'
    );
  }, [activeLoansEnriched]);

  const paidFinesLedger = useMemo(() => {
    return fines
      .filter((f) => f.is_paid)
      .map((fine) => {
        const borrowing = borrowings.find((b) => b.id === fine.borrowing_id);
        const copy = bookCopies.find((c) => c.id === borrowing?.copy_id);
        const book = books.find((bk) => bk.id === copy?.book_id);
        const student = profiles.find((p) => p.id === fine.user_id);
        return {
          fine,
          borrowing,
          copy,
          book,
          student,
        };
      });
  }, [fines, borrowings, bookCopies, books, profiles]);

  const reportSummaryTotals = useMemo(() => {
    const totalFinesCollected = paidFinesLedger.reduce(
      (sum, entry) => sum + entry.fine.amount,
      0
    );
    const totalPendingOverdueFines = overdueLoansReportList.reduce(
      (sum, loan) => sum + loan.liveFine,
      0
    );
    return {
      overdueCount: overdueLoansReportList.length,
      paidTransactionsCount: paidFinesLedger.length,
      totalFinesCollected,
      totalPendingOverdueFines,
    };
  }, [overdueLoansReportList, paidFinesLedger]);

  const handleDownloadPdfSummaryReport = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const generatedAt = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // Header Banner
    doc.setFillColor(2, 132, 199); // #0284C7
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('MIT COLLEGE SMART LIBRARY SYSTEM', 14, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Official Librarian Summary Report: Current Overdue Books & Total Fines Collected', 14, 19);
    doc.setFontSize(8);
    doc.text(`Generated: ${generatedAt} | Fine Policy: INR 100 / Day`, 14, 24.5);

    // Summary Metrics Box
    let y = 36;
    doc.setFillColor(240, 249, 255); // #F0F9FF
    doc.setDrawColor(224, 242, 254);
    doc.roundedRect(14, y, 182, 22, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Current Overdue Books: ${reportSummaryTotals.overdueCount}`, 20, y + 8);
    doc.text(
      `Total Fines Collected (Paid): INR ${reportSummaryTotals.totalFinesCollected}`,
      110,
      y + 8
    );
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Pending Unpaid Overdue Fines: INR ${reportSummaryTotals.totalPendingOverdueFines}`,
      20,
      y + 16
    );
    doc.text(
      `Settled Fine Receipts: ${reportSummaryTotals.paidTransactionsCount}`,
      110,
      y + 16
    );

    // Section 1: Current Overdue Books
    y += 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(2, 132, 199);
    doc.text(
      `1. Current Overdue & Unreturned Books (${overdueLoansReportList.length})`,
      14,
      y
    );

    y += 5;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 182, 7, 'F');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Accession', 16, y + 5);
    doc.text('Book Title', 42, y + 5);
    doc.text('Student (Roll No)', 106, y + 5);
    doc.text('Due Date', 152, y + 5);
    doc.text('Accrued Fine', 175, y + 5);

    y += 11;
    doc.setFont('helvetica', 'normal');

    if (overdueLoansReportList.length === 0) {
      doc.setTextColor(100, 116, 139);
      doc.text('No overdue books currently in circulation.', 16, y);
      y += 8;
    } else {
      overdueLoansReportList.forEach((item) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const acc = item.copy?.accession_number || 'N/A';
        const title = (item.book?.title || 'Volume').slice(0, 32);
        const studentLabel = `${(item.student?.full_name || 'Student').slice(0, 15)} (${
          item.student?.roll_no || ''
        })`.slice(0, 24);
        const dueStr = new Date(item.due_date).toLocaleDateString('en-IN');
        const fineStr = `INR ${item.liveFine}`;

        doc.setTextColor(15, 23, 42);
        doc.text(acc, 16, y);
        doc.text(title, 42, y);
        doc.text(studentLabel, 106, y);
        doc.text(dueStr, 152, y);
        doc.setTextColor(220, 38, 38);
        doc.text(fineStr, 175, y);
        y += 6.5;
      });
    }

    // Section 2: Total Fines Collected Ledger
    y += 8;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(2, 132, 199);
    doc.text(
      `2. Total Fines Collected Ledger (${paidFinesLedger.length} Settled Receipts — INR ${reportSummaryTotals.totalFinesCollected})`,
      14,
      y
    );

    y += 5;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 182, 7, 'F');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Receipt ID', 16, y + 5);
    doc.text('Accession & Book', 44, y + 5);
    doc.text('Student (Roll No)', 110, y + 5);
    doc.text('Paid Date', 154, y + 5);
    doc.text('Amount Paid', 176, y + 5);

    y += 11;
    doc.setFont('helvetica', 'normal');

    if (paidFinesLedger.length === 0) {
      doc.setTextColor(100, 116, 139);
      doc.text('No paid fine transactions recorded yet.', 16, y);
      y += 8;
    } else {
      paidFinesLedger.forEach(({ fine, copy, book, student }) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const receiptId = fine.id.slice(0, 12);
        const bookLabel = `${copy?.accession_number || ''} ${(book?.title || '').slice(
          0,
          22
        )}`.trim();
        const stuLabel = `${(student?.full_name || 'Student').slice(0, 14)} (${
          student?.roll_no || ''
        })`.slice(0, 23);
        const paidDate = fine.paid_at
          ? new Date(fine.paid_at).toLocaleDateString('en-IN')
          : new Date(fine.calculated_at || Date.now()).toLocaleDateString('en-IN');

        doc.setTextColor(15, 23, 42);
        doc.text(receiptId, 16, y);
        doc.text(bookLabel, 44, y);
        doc.text(stuLabel, 110, y);
        doc.text(paidDate, 154, y);
        doc.setTextColor(5, 150, 105);
        doc.text(`INR ${fine.amount}`, 176, y);
        y += 6.5;
      });
    }

    // Footer Signature Line
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Authorized by MIT Central Library Circulation Desk · Official System Generated Report',
      14,
      287
    );

    const dateStamp = new Date().toISOString().split('T')[0];
    doc.save(`MIT_Library_Overdue_And_Fines_Report_${dateStamp}.pdf`);
  };

  return (
    <section className="space-y-6">
      {/* Desk Header & Primary Action Triggers */}
      <div className="bg-[#F8FAFC] border border-[#E0F2FE] rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#0284C7]">
            Circulation & Stack Inventory Control Center
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight mt-0.5">
            Librarian Issue, Return & Shelf Manager Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Issue & return books (₹100/day fine), add new books or copies, remove books, and assign exact Floor, Rack No., and Shelf No. coordinates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F0F9FF] text-[#0F172A] border border-[#38BDF8] text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#0284C7]" />
            Overdue & Fines PDF Report
          </button>

          <button
            type="button"
            onClick={() => {
              setAddBookError(null);
              setAddBookModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <BookPlus className="w-4 h-4 text-[#38BDF8]" />
            + Add Book / Shelf & Rack
          </button>

          <button
            type="button"
            onClick={() => {
              setIssueError(null);
              setIssueModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <BookUp className="w-4 h-4" />
            Issue Book
          </button>

          <button
            type="button"
            onClick={() => {
              setReturnError(null);
              setReturnModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F0F9FF] text-[#0284C7] border border-[#0284C7] text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <BookDown className="w-4 h-4" />
            Return & Fine
          </button>
        </div>
      </div>

      {/* Transaction Receipt Banner */}
      {receiptBanner && (
        <div className="p-4 rounded-xl bg-[#F0F9FF] border border-[#38BDF8] flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#0284C7] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-[#0F172A]">
                {receiptBanner.title}
              </p>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                {receiptBanner.details}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReceiptBanner(null)}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Triple Quick-Action Desk Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Quick Issue Desk Summary */}
        <div className="bg-white border border-[#E0F2FE] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0284C7]">
                Standard 14-Day Loan Window
              </span>
              <span className="text-xs font-mono text-[#059669] font-semibold">
                {availableCopiesList.length} Copies Ready
              </span>
            </div>
            <h2 className="text-base font-bold text-[#0F172A] mt-1">
              Issue Physical Copy to Student
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Verify student Roll No / PRN and assign a physical copy accession barcode. Automatically sets copy status to <span className="font-mono font-semibold text-[#0284C7]">ISSUED</span>.
            </p>

            <div className="mt-4 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E0F2FE] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Issue Date:</span>
                <span className="font-mono font-semibold text-[#0F172A]">
                  Today ({new Date().toLocaleDateString('en-IN')})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Auto Due Date (+14 Days):</span>
                <span className="font-mono font-semibold text-[#0284C7]">
                  {dueDatePreview}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-sky-50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Next Ready: <code className="text-[#0284C7] font-semibold">{availableCopiesList[0]?.accession_number || 'N/A'}</code>
            </span>
            <button
              type="button"
              onClick={() => {
                setIssueError(null);
                setIssueModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Launch Issue Modal
            </button>
          </div>
        </div>

        {/* Card 2: Quick Return & Overdue Fine Calculator Summary */}
        <div className="bg-white border border-[#E0F2FE] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#D97706]">
                Automated Fine Assessment (₹100 / Day)
              </span>
              <span className="text-xs font-mono text-[#0284C7] font-semibold">
                {activeLoansEnriched.length} Active Loans
              </span>
            </div>
            <h2 className="text-base font-bold text-[#0F172A] mt-1">
              Process Book Return & Overdue Fine
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Scan or select an issued Accession Number to inspect overdue days, calculate fines at ₹100/day past due, and restore copy status to <span className="font-mono font-semibold text-[#059669]">AVAILABLE</span>.
            </p>

            <div className="mt-4 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E0F2FE] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Currently Overdue Loans:</span>
                <span className="font-mono font-semibold text-[#DC2626]">
                  {activeLoansEnriched.filter((l) => l.liveFine > 0).length} Volumes
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Fine Rate Policy:</span>
                <span className="font-mono font-semibold text-[#0F172A]">
                  ₹100 INR per day past due
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-sky-50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Restore shelf availability
            </span>
            <button
              type="button"
              onClick={() => {
                setReturnError(null);
                setReturnModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Launch Return Modal
            </button>
          </div>
        </div>

        {/* Card 3: Add / Remove Books & Shelf / Rack Coordinates */}
        <div className="bg-white border border-[#E0F2FE] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0284C7]">
                Stack & Catalogue Administration
              </span>
              <span className="text-xs font-mono text-[#0F172A] font-semibold">
                {books.length} Titles · {bookCopies.length} Copies
              </span>
            </div>
            <h2 className="text-base font-bold text-[#0F172A] mt-1">
              Add / Remove Books, Racks & Shelves
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Register new textbooks or additional copies with Accession No., Floor, Rack No., and Shelf No., or remove outdated volumes and edit shelf locations.
            </p>

            <div className="mt-4 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E0F2FE] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Active Floors Mapped:</span>
                <span className="font-mono font-semibold text-[#0284C7]">
                  {uniqueFloors.join(', ') || 'Floor 1'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Location Precision:</span>
                <span className="font-mono font-semibold text-[#0F172A]">
                  Floor · Rack No · Shelf No
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-sky-50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Full stack & copy control
            </span>
            <button
              type="button"
              onClick={() => {
                setAddBookError(null);
                setAddBookModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              + Add New Book / Copy
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          LIBRARIAN COLLECTION INVENTORY & SHELF / RACK MANAGER
      ===================================================================== */}
      <div className="bg-white border border-[#E0F2FE] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[#E0F2FE] flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-[#F8FAFC]">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0284C7]" />
              <h2 className="text-base font-bold text-[#0F172A]">
                Collection Inventory & Shelf Location Manager ({collectionInventoryBooks.length} Titles · {filteredInventoryCopies.length} Copies)
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Inspect per-book summary cards with total physical copies, currently issued copies, and all shelf locations, or switch to the individual copy table.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Segmented Toggle: Collection Inventory Summary Cards vs Individual Copies Table */}
            <div className="inline-flex items-center p-1 bg-white border border-[#E0F2FE] rounded-xl">
              <button
                type="button"
                onClick={() => setInventoryViewMode('COLLECTION_CARDS')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  inventoryViewMode === 'COLLECTION_CARDS'
                    ? 'bg-[#0284C7] text-white'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Collection Inventory Cards
              </button>
              <button
                type="button"
                onClick={() => setInventoryViewMode('COPIES_TABLE')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  inventoryViewMode === 'COPIES_TABLE'
                    ? 'bg-[#0284C7] text-white'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                All Copies Table
              </button>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search Title, ISBN, Rack, Shelf..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E0F2FE] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              />
            </div>

            <select
              value={inventoryDepartmentFilter}
              onChange={(e) => setInventoryDepartmentFilter(e.target.value)}
              aria-label="Filter collection by department"
              className="px-3 py-1.5 bg-white border border-[#E0F2FE] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
            >
              <option value="ALL">All Departments</option>
              {MIT_DEPARTMENTS.filter(
                (d) => d !== 'Library & Administration' && d !== 'Other'
              ).map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <select
              value={inventoryFloorFilter}
              onChange={(e) => setInventoryFloorFilter(e.target.value)}
              aria-label="Filter inventory by floor"
              className="px-3 py-1.5 bg-white border border-[#E0F2FE] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
            >
              <option value="ALL">All Floors</option>
              {uniqueFloors.map((fl) => (
                <option key={fl} value={fl}>
                  {fl}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setAddBookError(null);
                setAddBookModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Book / Copy
            </button>
          </div>
        </div>

        {/* MODE A: COLLECTION INVENTORY SUMMARY CARDS (Per Book) */}
        {inventoryViewMode === 'COLLECTION_CARDS' ? (
          collectionInventoryBooks.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-bold text-[#0F172A]">
                No Matching Books in Collection Inventory
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try clearing your filters or click "+ Add Book / Copy" to add a new volume to the collection.
              </p>
            </div>
          ) : (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 bg-[#F8FAFC]/50">
              {collectionInventoryBooks.map(
                ({
                  book,
                  copies,
                  totalPhysicalCopies,
                  issuedCopiesCount,
                  reservedCopiesCount,
                  availableCopiesCount,
                  uniqueLocations,
                }) => {
                  const hasActiveLoans = issuedCopiesCount > 0;
                  return (
                    <article
                      key={book.id}
                      className="bg-white border border-[#E0F2FE] rounded-2xl p-5 flex flex-col justify-between hover:border-sky-300 transition-colors"
                    >
                      <div>
                        {/* Header: Category, ISBN & Quick Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                          <span className="font-semibold text-[#0284C7]">
                            {book.category}
                          </span>
                          <span className="font-mono text-slate-500">
                            ISBN: {book.isbn}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-[#0F172A] leading-snug">
                          {book.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {book.author} ·{' '}
                          <span className="text-slate-500">
                            {book.publisher || 'MIT Academic Press'}
                          </span>
                        </p>

                        {/* 3 Key Collection Metrics: Total Physical Copies, Currently Issued Copies, Available on Shelf */}
                        <div className="mt-4 grid grid-cols-3 gap-2.5">
                          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E0F2FE]">
                            <span className="block text-[11px] font-medium text-slate-500">
                              Total Physical Copies
                            </span>
                            <span className="text-lg font-bold font-mono text-[#0F172A] tabular-nums">
                              {totalPhysicalCopies}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-[#F0F9FF] border border-[#E0F2FE]">
                            <span className="block text-[11px] font-medium text-[#0284C7]">
                              Currently Issued
                            </span>
                            <span className="text-lg font-bold font-mono text-[#0284C7] tabular-nums">
                              {issuedCopiesCount}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                            <span className="block text-[11px] font-medium text-[#059669]">
                              Available on Shelf
                            </span>
                            <span className="text-lg font-bold font-mono text-[#059669] tabular-nums">
                              {availableCopiesCount}
                              {reservedCopiesCount > 0 && (
                                <span className="text-[11px] text-[#D97706] ml-1">
                                  ({reservedCopiesCount} Hold)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* List of Shelf Locations for this Book */}
                        <div className="mt-4 pt-3.5 border-t border-sky-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#0284C7]" />
                              Shelf Locations ({uniqueLocations.length}{' '}
                              {uniqueLocations.length === 1 ? 'Stack' : 'Stacks'})
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handlePrefillAddCopyForExistingBook(book)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0F9FF] hover:bg-sky-100 text-[#0284C7] border border-[#E0F2FE] text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                + Add Copy
                              </button>
                              <button
                                type="button"
                                disabled={hasActiveLoans}
                                onClick={() => handleRemoveEntireBook(book)}
                                title={
                                  hasActiveLoans
                                    ? 'Cannot delete book while copies are issued'
                                    : 'Delete entire book title'
                                }
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                                  hasActiveLoans
                                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                    : 'bg-red-50 hover:bg-[#DC2626] text-[#DC2626] hover:text-white border-red-200 cursor-pointer'
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete Title
                              </button>
                            </div>
                          </div>

                          {/* Distinct Stack Coordinate Pills */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                            {uniqueLocations.map((loc) => (
                              <span
                                key={loc}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0F9FF] border border-[#E0F2FE] text-xs font-mono font-semibold text-[#0284C7]"
                              >
                                <MapPin className="w-3 h-3" />
                                {loc}
                              </span>
                            ))}
                          </div>

                          {/* Detailed Copy-by-Copy Shelf Location & Status List */}
                          <div className="divide-y divide-[#E0F2FE] border border-[#E0F2FE] rounded-xl overflow-hidden bg-[#F8FAFC]">
                            {copies.map((copy) => {
                              const copyIssued =
                                copy.status === 'ISSUED' || copy.status === 'OVERDUE';
                              return (
                                <div
                                  key={copy.id}
                                  className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs bg-white hover:bg-[#F8FAFC]"
                                >
                                  <div className="flex items-center gap-2 font-mono">
                                    <span className="font-semibold text-[#0F172A]">
                                      {copy.accession_number}
                                    </span>
                                    <span className="text-slate-300">→</span>
                                    <span className="text-slate-600">
                                      {copy.floor} · {copy.rack} · {copy.shelf}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold border ${
                                        copy.status === 'AVAILABLE'
                                          ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                                          : copy.status === 'ISSUED'
                                          ? 'bg-[#F0F9FF] text-[#0284C7] border-[#E0F2FE]'
                                          : copy.status === 'RESERVED'
                                          ? 'bg-amber-50 text-[#D97706] border-amber-200'
                                          : 'bg-red-50 text-[#DC2626] border-red-200'
                                      }`}
                                    >
                                      {copy.status}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditCopyModal(copy, book)}
                                      title="Edit Floor, Rack No, or Shelf No"
                                      className="p-1 rounded border border-[#E0F2FE] text-slate-600 hover:text-[#0284C7] hover:bg-[#F0F9FF] cursor-pointer"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>

                                    <button
                                      type="button"
                                      disabled={copyIssued}
                                      onClick={() => handleRemoveCopy(copy, book.title)}
                                      title={
                                        copyIssued
                                          ? 'Cannot remove copy while issued'
                                          : 'Remove this copy'
                                      }
                                      className={`p-1 rounded border ${
                                        copyIssued
                                          ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                                          : 'border-red-200 text-[#DC2626] hover:bg-[#DC2626] hover:text-white cursor-pointer'
                                      }`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )
        ) : filteredInventoryCopies.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-[#0F172A]">
              No Matching Physical Copies in Inventory
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Click "+ Add Book / Copy" to register a new textbook with its Accession Number, Floor, Rack No., and Shelf No.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E0F2FE] bg-[#F0F9FF]/60 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Accession No.</th>
                  <th className="py-3 px-4">Book Title, Author & ISBN</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Floor · Rack No. · Shelf No.</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Librarian Stack Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0F2FE] text-xs">
                {filteredInventoryCopies.map((item) => {
                  const isIssued = item.status === 'ISSUED' || item.status === 'OVERDUE';
                  return (
                    <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-[#0284C7] whitespace-nowrap">
                        {item.accession_number}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#0F172A] line-clamp-1">
                          {item.book?.title || 'Unlinked Book'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.book?.author} · <span className="font-mono">ISBN: {item.book?.isbn}</span>
                        </p>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {item.book?.category || 'General'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#0F172A] bg-[#F0F9FF] border border-[#E0F2FE] px-2.5 py-1 rounded-lg">
                          <MapPin className="w-3.5 h-3.5 text-[#0284C7]" />
                          <span>{item.floor}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-[#0284C7]">{item.rack}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-[#059669]">{item.shelf}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                            item.status === 'AVAILABLE'
                              ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                              : item.status === 'ISSUED'
                              ? 'bg-[#F0F9FF] text-[#0284C7] border-[#E0F2FE]'
                              : item.status === 'RESERVED'
                              ? 'bg-amber-50 text-[#D97706] border-amber-200'
                              : 'bg-red-50 text-[#DC2626] border-red-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {item.book && (
                            <button
                              type="button"
                              onClick={() => handlePrefillAddCopyForExistingBook(item.book!)}
                              title="Add another copy of this book"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0F9FF] hover:bg-sky-100 text-[#0284C7] border border-[#E0F2FE] text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              + Copy
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEditCopyModal(item, item.book)}
                            title="Edit Accession, Floor, Rack No, or Shelf No"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#F8FAFC] text-slate-700 border border-[#E0F2FE] text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3 h-3 text-[#0284C7]" />
                            Edit Rack/Shelf
                          </button>

                          <button
                            type="button"
                            disabled={isIssued}
                            onClick={() => handleRemoveCopy(item, item.book?.title)}
                            title={
                              isIssued
                                ? 'Cannot remove copy while issued to a student'
                                : 'Remove this physical copy'
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                              isIssued
                                ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                : 'bg-red-50 hover:bg-[#DC2626] text-[#DC2626] hover:text-white border-red-200 cursor-pointer'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove Copy
                          </button>

                          {item.book && (
                            <button
                              type="button"
                              disabled={isIssued}
                              onClick={() => handleRemoveEntireBook(item.book!)}
                              title="Delete entire book title and all its copies"
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                                isIssued
                                  ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                  : 'bg-white hover:bg-red-600 text-red-600 hover:text-white border-red-200 cursor-pointer'
                              }`}
                            >
                              Delete Book
                            </button>
                          )}
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

      {/* =====================================================================
          STUDENT RESERVATIONS & 24-HOUR PICKUP VERIFICATION QUEUE
      ===================================================================== */}
      <div className="bg-white border border-[#E0F2FE] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[#E0F2FE] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#F8FAFC]">
          <div>
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-[#0284C7]" />
              <h2 className="text-base font-bold text-[#0F172A]">
                Student Book Reservations & 24-Hour Pickup Verification ({reservedCopiesQueue.length})
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Librarian can mark if the student took the reserved book (issues copy) or did not take it. Any reservation not taken within 24 hours is automatically cancelled.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[#D97706] text-xs font-mono font-semibold self-start sm:self-auto">
            <Clock className="w-3.5 h-3.5" />
            Auto-Cancels After 24 Hours
          </span>
        </div>

        {reservedCopiesQueue.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-[#0F172A]">
              No Pending Student Reservations in Pickup Queue
            </p>
            <p className="text-xs text-slate-500 mt-1">
              When a student books/reserves a copy with a date in the Catalogue, it appears here for the Librarian to mark whether the student took the book or not within 24 hours.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E0F2FE] bg-[#F0F9FF]/60 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Accession & Stack</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Reserved By Student</th>
                  <th className="py-3 px-4">Reserved Date</th>
                  <th className="py-3 px-4">24-Hr Pickup Window</th>
                  <th className="py-3 px-4 text-right">Librarian Pickup Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0F2FE] text-xs">
                {reservedCopiesQueue.map(({ copy, book, student, hoursRemaining }) => (
                  <tr key={copy.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-semibold text-[#0284C7]">
                        {copy.accession_number}
                      </span>
                      <p className="text-[11px] font-mono text-slate-500">
                        {copy.floor} · {copy.rack} · {copy.shelf}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#0F172A] line-clamp-1">
                        {book?.title || 'Library Volume'}
                      </p>
                      {copy.reservation_notes && (
                        <p className="text-[11px] text-slate-500">
                          Note: {copy.reservation_notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#0F172A]">
                        {student?.full_name || copy.reserved_by_name || 'MIT Student'}
                      </p>
                      <p className="text-[11px] font-mono text-[#0284C7]">
                        {student?.roll_no || copy.reserved_by_roll_no || 'N/A'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap tabular-nums">
                      {copy.reserved_for_date
                        ? new Date(copy.reserved_for_date).toLocaleDateString('en-IN')
                        : 'Today'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[#D97706] font-mono font-semibold tabular-nums">
                        <Clock className="w-3 h-3" />
                        {hoursRemaining}h left (24h limit)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleLibrarianMarkStudentTookBook(copy)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Student Took Book (Issue)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLibrarianMarkStudentDidNotTake(copy, book?.title)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-[#DC2626] text-[#DC2626] hover:text-white border border-red-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Not Taken (Cancel)
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================================================
          STUDENT LOAN RENEWAL APPROVAL QUEUE (Max 2 Renewals · +7 Days)
      ===================================================================== */}
      <div className="bg-white border border-[#E0F2FE] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[#E0F2FE] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#F8FAFC]">
          <div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#0284C7]" />
              <h2 className="text-base font-bold text-[#0F172A]">
                Student Loan Renewal Requests ({pendingRenewalLoans.length})
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Approve or decline student renewal requests (+7 days extension per approval, maximum {MAX_LOAN_RENEWALS} renewals per loan).
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F0F9FF] border border-[#E0F2FE] text-[#0284C7] text-xs font-mono font-semibold self-start sm:self-auto">
            Max Limit: {MAX_LOAN_RENEWALS} Renewals / Loan
          </span>
        </div>

        {pendingRenewalLoans.length === 0 ? (
          <div className="p-7 text-center">
            <p className="text-sm font-bold text-[#0F172A]">
              No Pending Student Renewal Requests
            </p>
            <p className="text-xs text-slate-500 mt-1">
              When a student clicks "Renew (+7 Days)" on an active loan in their Dashboard, it appears here for Librarian approval.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E0F2FE] bg-[#F0F9FF]/60 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Accession No.</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Student (Roll No / PRN)</th>
                  <th className="py-3 px-4">Current Due Date</th>
                  <th className="py-3 px-4">Renewals Used</th>
                  <th className="py-3 px-4 text-right">Librarian Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0F2FE] text-xs">
                {pendingRenewalLoans.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#0284C7] whitespace-nowrap">
                      {item.copy?.accession_number || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#0F172A] line-clamp-1">
                        {item.book?.title || 'Library Volume'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">
                        {item.copy?.floor} · {item.copy?.rack} · {item.copy?.shelf}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#0F172A]">
                        {item.student?.full_name || 'MIT Student'}
                      </p>
                      <p className="text-[11px] font-mono text-[#0284C7]">
                        {item.student?.roll_no}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap tabular-nums">
                      {new Date(item.due_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap tabular-nums">
                      <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-[#D97706] font-semibold">
                        {item.renewal_count ?? 0} / {MAX_LOAN_RENEWALS} Used
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleLibrarianRenewalDecision(item.id, 'APPROVED')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve (+7 Days)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLibrarianRenewalDecision(item.id, 'REJECTED')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-[#DC2626] text-[#DC2626] hover:text-white border border-red-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Decline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Circulation Register Table */}
      <div className="bg-white border border-[#E0F2FE] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[#E0F2FE] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#F8FAFC]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Active Circulation Register ({filteredActiveLoans.length})
            </h2>
            <p className="text-xs text-slate-600">
              Real-time log of books issued to registered @mit.asia students.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={deskFilter}
              onChange={(e) => setDeskFilter(e.target.value)}
              placeholder="Filter by Roll No, Student, or ACC-..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E0F2FE] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
            />
          </div>
        </div>

        {filteredActiveLoans.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-[#0F172A]">
              No Active Book Loans in Circulation
            </p>
            <p className="text-xs text-slate-500 mt-1">
              All physical copies are currently available on the library shelves. Click "Issue Book" above to issue a book to a registered student.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E0F2FE] bg-[#F0F9FF]/60 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Accession No.</th>
                  <th className="py-3 px-4">Book Title & Stack</th>
                  <th className="py-3 px-4">Borrower (Roll No / PRN)</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date & Renewals</th>
                  <th className="py-3 px-4 text-right">Accrued Fine</th>
                  <th className="py-3 px-4 text-right">Desk Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0F2FE] text-xs">
                {filteredActiveLoans.map((item) => {
                  const isOverdue = item.liveFine > 0;
                  const renewalCount = item.renewal_count ?? 0;
                  const canDirectRenew =
                    renewalCount < MAX_LOAN_RENEWALS && !isOverdue && !item.fine_started;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-[#0284C7] whitespace-nowrap">
                        {item.copy?.accession_number || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#0F172A] line-clamp-1">
                          {item.book?.title || 'Unknown Title'}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {item.copy?.floor} · {item.copy?.rack} · {item.copy?.shelf}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#0F172A]">
                          {item.student?.full_name || 'MIT Student'}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500">
                          {item.student?.roll_no}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                        {new Date(item.issue_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono whitespace-nowrap tabular-nums">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={
                              isOverdue
                                ? 'text-[#DC2626] font-semibold'
                                : 'text-[#0F172A]'
                            }
                          >
                            {new Date(item.due_date).toLocaleDateString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Renewals: {renewalCount}/{MAX_LOAN_RENEWALS}
                            {item.renewal_status === 'PENDING' ? ' · PENDING APPROVAL' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-right whitespace-nowrap tabular-nums">
                        {isOverdue || item.fine_started ? (
                          <span className="px-2 py-0.5 rounded bg-red-50 border border-red-200 text-[#DC2626] font-semibold">
                            ₹{item.liveFine} {item.fine_started ? 'FINE ACTIVE' : 'OVERDUE'}
                          </span>
                        ) : (
                          <span className="text-[#059669] font-medium">₹0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {item.renewal_status === 'PENDING' ? (
                            <button
                              type="button"
                              onClick={() => handleLibrarianRenewalDecision(item.id, 'APPROVED')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Approve Renewal (+7d)
                            </button>
                          ) : canDirectRenew ? (
                            <button
                              type="button"
                              onClick={() => handleLibrarianRenewalDecision(item.id, 'APPROVED')}
                              title="Librarian direct +7 days renewal"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F0F9FF] hover:bg-sky-100 text-[#0284C7] border border-[#E0F2FE] text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              +7d Renew
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => {
                              if (item.copy?.accession_number) {
                                setReturnAccessionInput(item.copy.accession_number);
                              }
                              setReturnError(null);
                              setReturnModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-[#059669] text-[#059669] hover:text-white border border-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Mark Returned
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLibrarianMarkNotReturnedAndStartFine(item.id)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                              item.fine_started
                                ? 'bg-[#DC2626] text-white border-[#DC2626]'
                                : 'bg-red-50 hover:bg-[#DC2626] text-[#DC2626] hover:text-white border-red-200'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {item.fine_started
                              ? `Fining Active (₹${item.liveFine})`
                              : 'Not Returned · Start ₹100 Fine'}
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

      {/* =====================================================================
          ADD NEW BOOK OR COPY WITH FLOOR, RACK NO. & SHELF NO. MODAL
      ===================================================================== */}
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
                    Register a new title or add a physical copy to an existing ISBN
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
                    placeholder="e.g., Computer Networks (6th Edition)"
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
                    placeholder="e.g., Andrew S. Tanenbaum"
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
                    placeholder="e.g., 978-0132126953"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Academic Department Category *
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
                    Publisher & Year
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newPublisher}
                      onChange={(e) => setNewPublisher(e.target.value)}
                      placeholder="Pearson / MIT Press"
                      className="col-span-2 px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                    />
                    <input
                      type="number"
                      value={newPublishedYear}
                      onChange={(e) => setNewPublishedYear(e.target.value)}
                      placeholder="2024"
                      className="px-2.5 py-2 text-xs font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Stack Coordinates Section */}
              <div className="p-4 rounded-xl bg-[#F0F9FF] border border-[#E0F2FE] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
                  <MapPin className="w-4 h-4 text-[#0284C7]" />
                  <span>Physical Copy Barcode & Stack Location (Floor · Rack No. · Shelf No.)</span>
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
                      placeholder="ACC-CS-010"
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
                      placeholder="Rack 4"
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
                      placeholder="Shelf B"
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
                  {addBookLoading ? 'Saving to Catalogue...' : 'Save Book & Stack Coordinates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          EDIT FLOOR / RACK NO. / SHELF NO. MODAL
      ===================================================================== */}
      {editingCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E0F2FE] shadow-xl overflow-hidden">
            <div className="bg-[#F0F9FF] border-b border-[#E0F2FE] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Pencil className="w-4 h-4 text-[#0284C7]" />
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Edit Rack No., Shelf No. & Accession
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-1">
                    {editingCopy.book?.title || editingCopy.copy.accession_number}
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

            <form onSubmit={handleUpdateCopyLocationSubmit} className="p-6 space-y-4">
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
                    placeholder="Floor 1"
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
                    placeholder="Rack 2"
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
                    placeholder="Shelf C"
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
                  {editLoading ? 'Updating...' : 'Update Stack Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          ISSUE BOOK MODAL
      ===================================================================== */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E0F2FE] shadow-xl overflow-hidden">
            <div className="bg-[#F0F9FF] border-b border-[#E0F2FE] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookUp className="w-5 h-5 text-[#0284C7]" />
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Issue Physical Book Copy
                  </h3>
                  <p className="text-xs text-slate-600">
                    Link Student Roll No / PRN with Physical Accession Number
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIssueModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="p-6 space-y-4">
              {issueError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-[#DC2626]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{issueError}</span>
                </div>
              )}

              {/* Student Roll No / PRN Selector & Input */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Student Roll No / PRN or Member ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={studentRollInput}
                    onChange={(e) => setStudentRollInput(e.target.value.toUpperCase())}
                    placeholder="e.g., MIT-CSE-2024-042"
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Quick Select Student:</span>
                  {profiles
                    .filter((p) => p.role === 'STUDENT')
                    .map((stu) => (
                      <button
                        key={stu.id}
                        type="button"
                        onClick={() => setStudentRollInput(stu.roll_no)}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          studentRollInput === stu.roll_no
                            ? 'bg-[#0284C7] text-white border-[#0284C7]'
                            : 'bg-[#F0F9FF] text-[#0284C7] border-[#E0F2FE] hover:bg-sky-100'
                        }`}
                      >
                        {stu.roll_no} ({stu.full_name.split(' ')[0]})
                      </button>
                    ))}
                </div>
              </div>

              {/* Physical Book Accession Number Input */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Physical Book Accession Number
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={issueAccessionInput}
                    onChange={(e) => setIssueAccessionInput(e.target.value.toUpperCase())}
                    placeholder="e.g., ACC-CS-002"
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>
                <div className="mt-1.5">
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Or pick from available shelf copies:
                  </label>
                  <select
                    value={issueAccessionInput}
                    onChange={(e) => setIssueAccessionInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-lg text-[#0F172A]"
                  >
                    {availableCopiesList.map((copy) => {
                      const bk = books.find((b) => b.id === copy.book_id);
                      return (
                        <option key={copy.id} value={copy.accession_number}>
                          {copy.accession_number} — {bk?.title} ({copy.floor}, {copy.rack})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Auto-Calculated 14-Day Loan Schedule */}
              <div className="p-3.5 rounded-xl bg-[#F0F9FF] border border-[#E0F2FE] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#0284C7]" />
                  <div>
                    <p className="text-xs font-semibold text-[#0F172A]">
                      Automatic 14-Day Loan Period
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Overdue fine of ₹100/day applies after due date
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#0284C7]">
                  Due: {dueDatePreview}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E0F2FE] text-xs font-semibold text-slate-600 hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issueLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {issueLoading ? 'Issuing Copy...' : 'Confirm & Issue Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          RETURN BOOK & AUTO-FINE MODAL
      ===================================================================== */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E0F2FE] shadow-xl overflow-hidden">
            <div className="bg-[#F0F9FF] border-b border-[#E0F2FE] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ArrowLeftRight className="w-5 h-5 text-[#0284C7]" />
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Process Book Return & Overdue Fine
                  </h3>
                  <p className="text-xs text-slate-600">
                    Calculates ₹100/day past due and sets copy status back to AVAILABLE
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="p-6 space-y-4">
              {returnError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-[#DC2626]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{returnError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Issued Book Accession Number
                </label>
                <input
                  type="text"
                  required
                  value={returnAccessionInput}
                  onChange={(e) => setReturnAccessionInput(e.target.value.toUpperCase())}
                  placeholder="e.g., ACC-IT-001"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                />

                <div className="mt-2">
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Or select from active borrowed copies:
                  </label>
                  <select
                    value={returnAccessionInput}
                    onChange={(e) => setReturnAccessionInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-lg text-[#0F172A]"
                  >
                    {activeLoansEnriched.map((loan) => (
                      <option
                        key={loan.id}
                        value={loan.copy?.accession_number || loan.id}
                      >
                        {loan.copy?.accession_number} — {loan.book?.title} ({loan.student?.roll_no})
                        {loan.liveFine > 0 ? ` [OVERDUE: ₹${loan.liveFine}]` : ' [ON TIME]'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Loan & Overdue Fine Inspection Box */}
              {selectedReturnLoan ? (
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E0F2FE] space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-sky-100 pb-2">
                    <span className="font-bold text-[#0F172A]">
                      {selectedReturnLoan.book?.title}
                    </span>
                    <span className="font-mono text-[#0284C7] font-semibold">
                      {selectedReturnLoan.copy?.accession_number}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      Borrower:{' '}
                      <strong className="text-[#0F172A]">
                        {selectedReturnLoan.student?.full_name}
                      </strong>
                    </div>
                    <div className="font-mono text-right">
                      {selectedReturnLoan.student?.roll_no}
                    </div>
                    <div>
                      Issued:{' '}
                      <span className="font-mono">
                        {new Date(selectedReturnLoan.issue_date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="text-right">
                      Due Date:{' '}
                      <span className="font-mono font-semibold">
                        {new Date(selectedReturnLoan.due_date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      selectedReturnLoan.liveFine > 0
                        ? 'bg-red-50 border-red-200 text-[#DC2626]'
                        : 'bg-emerald-50 border-emerald-200 text-[#059669]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      <IndianRupee className="w-4 h-4 shrink-0" />
                      <span>
                        {selectedReturnLoan.liveFine > 0
                          ? `Overdue Fine (${selectedReturnLoan.liveFine / 100} days × ₹100/day)`
                          : 'No Overdue Fine — Returned Within Due Date'}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-bold tabular-nums">
                      ₹{selectedReturnLoan.liveFine}
                    </span>
                  </div>

                  {selectedReturnLoan.liveFine > 0 && (
                    <label className="flex items-center gap-2 pt-1 cursor-pointer text-xs text-[#0F172A] font-medium">
                      <input
                        type="checkbox"
                        checked={collectFineImmediately}
                        onChange={(e) => setCollectFineImmediately(e.target.checked)}
                        className="rounded border-sky-300 text-[#0284C7] focus:ring-[#0284C7]"
                      />
                      <span>Mark fine as collected/paid at desk upon return</span>
                    </label>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-[#D97706]">
                  Enter a valid currently issued Accession Number to preview borrower details and fine calculation.
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E0F2FE] text-xs font-semibold text-slate-600 hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returnLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {returnLoading
                    ? 'Processing Return...'
                    : 'Complete Return & Set AVAILABLE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          PRINTABLE & DOWNLOADABLE PDF SUMMARY REPORT MODAL (OVERDUE & FINES)
      ===================================================================== */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl border border-[#E0F2FE] shadow-xl overflow-hidden my-8">
            {/* Modal Top Action Bar */}
            <div className="bg-[#F0F9FF] border-b border-[#E0F2FE] px-6 py-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#0284C7]" />
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    MIT Library — Overdue Books & Total Fines Collected Report
                  </h3>
                  <p className="text-xs text-slate-600">
                    Official printable & downloadable PDF audit summary (₹100/day fine policy)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E0F2FE] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#0284C7]" />
                  Print Report
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdfSummaryReport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF Report
                </button>

                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Report Body */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible">
              {/* Institutional Report Header */}
              <div className="border-b border-[#E0F2FE] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-mono font-semibold text-[#0284C7] uppercase">
                    MIT College Smart Library System · Central Circulation Desk
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] mt-0.5">
                    Summary Report: Current Overdue Books & Total Fines Collected
                  </h2>
                </div>
                <div className="text-xs font-mono text-slate-500 sm:text-right">
                  <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                  <p>Fine Rate: ₹100 / Day</p>
                </div>
              </div>

              {/* 4 Summary Metric Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E0F2FE]">
                  <span className="text-[11px] font-medium text-slate-500">
                    Current Overdue Books
                  </span>
                  <p className="text-2xl font-bold font-mono text-[#DC2626] mt-1 tabular-nums">
                    {reportSummaryTotals.overdueCount}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[11px] font-medium text-[#059669]">
                    Total Fines Collected
                  </span>
                  <p className="text-2xl font-bold font-mono text-[#059669] mt-1 tabular-nums">
                    ₹{reportSummaryTotals.totalFinesCollected}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-red-50/60 border border-red-200">
                  <span className="text-[11px] font-medium text-[#DC2626]">
                    Pending Unpaid Fines
                  </span>
                  <p className="text-2xl font-bold font-mono text-[#DC2626] mt-1 tabular-nums">
                    ₹{reportSummaryTotals.totalPendingOverdueFines}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F0F9FF] border border-[#E0F2FE]">
                  <span className="text-[11px] font-medium text-[#0284C7]">
                    Paid Fine Receipts
                  </span>
                  <p className="text-2xl font-bold font-mono text-[#0284C7] mt-1 tabular-nums">
                    {reportSummaryTotals.paidTransactionsCount}
                  </p>
                </div>
              </div>

              {/* Section 1: Current Overdue Books Table */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  1. Current Overdue & Unreturned Books ({overdueLoansReportList.length})
                </h4>

                {overdueLoansReportList.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#F8FAFC] border border-[#E0F2FE] text-center text-xs text-slate-500">
                    No overdue or unreturned books currently in circulation.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[#E0F2FE] rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F0F9FF] border-b border-[#E0F2FE] text-[11px] font-semibold text-slate-600">
                          <th className="py-2.5 px-3.5">Accession No.</th>
                          <th className="py-2.5 px-3.5">Book Title & Stack</th>
                          <th className="py-2.5 px-3.5">Borrower (Roll No / PRN)</th>
                          <th className="py-2.5 px-3.5">Due Date</th>
                          <th className="py-2.5 px-3.5 text-right">Accrued Fine</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E0F2FE]">
                        {overdueLoansReportList.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2.5 px-3.5 font-mono font-semibold text-[#0284C7]">
                              {item.copy?.accession_number || 'N/A'}
                            </td>
                            <td className="py-2.5 px-3.5">
                              <p className="font-semibold text-[#0F172A]">
                                {item.book?.title || 'Library Volume'}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500">
                                {item.copy?.floor} · {item.copy?.rack} · {item.copy?.shelf}
                              </p>
                            </td>
                            <td className="py-2.5 px-3.5">
                              <p className="font-semibold text-[#0F172A]">
                                {item.student?.full_name || 'MIT Student'}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500">
                                {item.student?.roll_no}
                              </p>
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-[#DC2626] font-semibold tabular-nums">
                              {new Date(item.due_date).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono font-bold text-right text-[#DC2626] tabular-nums">
                              ₹{item.liveFine}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section 2: Total Fines Collected Ledger */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  2. Total Fines Collected Ledger ({paidFinesLedger.length} Receipts · ₹{reportSummaryTotals.totalFinesCollected})
                </h4>

                {paidFinesLedger.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#F8FAFC] border border-[#E0F2FE] text-center text-xs text-slate-500">
                    No fine payments have been collected yet. When a student pays an overdue fine or a fine is collected at the return desk, it is logged here.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[#E0F2FE] rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F0F9FF] border-b border-[#E0F2FE] text-[11px] font-semibold text-slate-600">
                          <th className="py-2.5 px-3.5">Fine Receipt ID</th>
                          <th className="py-2.5 px-3.5">Book & Accession</th>
                          <th className="py-2.5 px-3.5">Student (Roll No / PRN)</th>
                          <th className="py-2.5 px-3.5">Collected Date</th>
                          <th className="py-2.5 px-3.5 text-right">Amount Collected</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E0F2FE]">
                        {paidFinesLedger.map(({ fine, copy, book, student }) => (
                          <tr key={fine.id}>
                            <td className="py-2.5 px-3.5 font-mono text-slate-600">
                              {fine.id}
                            </td>
                            <td className="py-2.5 px-3.5">
                              <p className="font-semibold text-[#0F172A]">
                                {book?.title || 'Library Volume'}
                              </p>
                              <p className="text-[11px] font-mono text-[#0284C7]">
                                {copy?.accession_number}
                              </p>
                            </td>
                            <td className="py-2.5 px-3.5">
                              <p className="font-semibold text-[#0F172A]">
                                {student?.full_name || 'MIT Student'}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500">
                                {student?.roll_no}
                              </p>
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-slate-600 tabular-nums">
                              {fine.paid_at
                                ? new Date(fine.paid_at).toLocaleDateString('en-IN')
                                : new Date(fine.calculated_at || Date.now()).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono font-bold text-right text-[#059669] tabular-nums">
                              ₹{fine.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
