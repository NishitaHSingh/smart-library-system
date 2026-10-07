import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  QrCode,
  Upload,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ArrowLeftRight,
  BookUp,
  BookDown,
  MapPin,
  X,
} from 'lucide-react';
import { Book, BookCopy, Borrowing, Profile } from '../types/database';
import { calculateOverdueFine } from '../lib/supabase';

interface BookBarcodeScannerModalProps {
  isOpen: boolean;
  initialMode?: 'AUTO' | 'ISSUE' | 'RETURN';
  books: Book[];
  bookCopies: BookCopy[];
  borrowings: Borrowing[];
  profiles: Profile[];
  onClose: () => void;
  onSelectForIssue: (accessionNumber: string) => void;
  onSelectForReturn: (accessionNumber: string) => void;
}

export const BookBarcodeScannerModal: React.FC<BookBarcodeScannerModalProps> = ({
  isOpen,
  initialMode = 'AUTO',
  books,
  bookCopies,
  borrowings,
  profiles,
  onClose,
  onSelectForIssue,
  onSelectForReturn,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedCopy, setScannedCopy] = useState<BookCopy | null>(null);
  const [rawScanText, setRawScanText] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScannedCopy(null);
      setCameraError(null);
      setRawScanText('');
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, stopCamera]);

  const matchScannedPayload = useCallback(
    (payload: string) => {
      const cleaned = payload.trim().toUpperCase();
      setRawScanText(cleaned);
      setCameraError(null);

      // Match by exact Accession Number, substring Accession Number, Copy ID, or Book ISBN
      const directCopy =
        bookCopies.find((c) => c.accession_number.toUpperCase() === cleaned) ||
        bookCopies.find((c) => cleaned.includes(c.accession_number.toUpperCase())) ||
        bookCopies.find((c) => c.id.toUpperCase() === cleaned);

      if (directCopy) {
        setScannedCopy(directCopy);
        stopCamera();
        if (initialMode === 'ISSUE') {
          onSelectForIssue(directCopy.accession_number);
          return;
        }
        if (initialMode === 'RETURN') {
          onSelectForReturn(directCopy.accession_number);
          return;
        }
        return;
      }

      // Check if payload matches a Book ISBN
      const matchedBook = books.find(
        (b) =>
          b.isbn.replace(/[^0-9X]/gi, '') === cleaned.replace(/[^0-9X]/gi, '') ||
          b.isbn.toUpperCase() === cleaned
      );

      if (matchedBook) {
        const copiesOfBook = bookCopies.filter((c) => c.book_id === matchedBook.id);
        const preferredCopy =
          initialMode === 'RETURN'
            ? copiesOfBook.find(
                (c) => c.status === 'ISSUED' || c.status === 'OVERDUE'
              ) || copiesOfBook[0]
            : copiesOfBook.find(
                (c) => c.status === 'AVAILABLE' || c.status === 'RESERVED'
              ) || copiesOfBook[0];

        if (preferredCopy) {
          setScannedCopy(preferredCopy);
          stopCamera();
          if (initialMode === 'ISSUE') {
            onSelectForIssue(preferredCopy.accession_number);
            return;
          }
          if (initialMode === 'RETURN') {
            onSelectForReturn(preferredCopy.accession_number);
            return;
          }
          return;
        }
      }

      setCameraError(
        `Scanned code "${cleaned}" did not match any registered Accession Number (e.g., ACC-CS-001) or ISBN in the catalogue.`
      );
    },
    [bookCopies, books, initialMode, onSelectForIssue, onSelectForReturn, stopCamera]
  );

  const scanVideoFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data && code.data.trim()) {
          matchScannedPayload(code.data.trim());
          return;
        }
      }
    }

    rafRef.current = requestAnimationFrame(scanVideoFrame);
  }, [matchScannedPayload]);

  const startCamera = async () => {
    setCameraError(null);
    setScannedCopy(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Camera API is not available in this browser environment. You can upload a barcode/QR image or click any physical copy tag on the right to simulate an instant optical scan.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(() => {
            // Ignore autoplay interruption
          });
          rafRef.current = requestAnimationFrame(scanVideoFrame);
        }
      });
    } catch {
      setCameraError(
        'Camera permission was denied or no camera device was found. You can upload a QR/barcode image or click any physical book barcode tag on the right.'
      );
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          matchScannedPayload(code.data);
        } else {
          setCameraError(
            'No valid QR / book barcode detected in the uploaded image. Try another image or click a physical copy barcode on the right.'
          );
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  const scannedBook = scannedCopy
    ? books.find((b) => b.id === scannedCopy.book_id)
    : undefined;
  const activeLoanForScannedCopy = scannedCopy
    ? borrowings.find(
        (b) => b.copy_id === scannedCopy.id && b.return_date === null
      )
    : undefined;
  const borrowerForScannedCopy = activeLoanForScannedCopy
    ? profiles.find((p) => p.id === activeLoanForScannedCopy.user_id)
    : undefined;
  const liveFineForScannedCopy = activeLoanForScannedCopy
    ? calculateOverdueFine(
        activeLoanForScannedCopy.due_date,
        null,
        activeLoanForScannedCopy.fine_started,
        activeLoanForScannedCopy.fine_started_at
      )
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-[#E0F2FE] shadow-xl overflow-hidden my-8">
        {/* Top Header */}
        <div className="bg-[#0F172A] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0284C7] flex items-center justify-center text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                Librarian Desk — Camera QR & Book Barcode Scanner
              </h3>
              <p className="text-xs text-slate-300">
                Scan any physical book QR / Accession barcode for instant identification during Issue & Return operations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 7 COLS: Live Camera Viewfinder + Instant Identification Card */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold text-[#0F172A]">
                  1. Optical Camera Viewfinder
                </span>

                <div className="flex items-center gap-2">
                  {cameraActive ? (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#DC2626] border border-red-200 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <CameraOff className="w-3.5 h-3.5" />
                      Stop Camera
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Start Camera Scanner
                    </button>
                  )}

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0F9FF] hover:bg-sky-100 text-[#0284C7] border border-[#E0F2FE] text-xs font-semibold cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload QR Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {cameraError && (
                <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-[#D97706]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Camera Viewport */}
              <div className="relative w-full h-56 sm:h-64 rounded-2xl bg-[#0F172A] border border-[#E0F2FE] overflow-hidden flex items-center justify-center">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-52 h-36 rounded-2xl border-2 border-[#38BDF8] shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] relative">
                        <div className="absolute inset-x-2 top-1/2 h-0.5 bg-[#38BDF8] animate-pulse" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-slate-900/80 text-white text-[11px] font-mono">
                      Align Book QR / Accession Barcode (`ACC-...`) in frame
                    </div>
                  </>
                ) : (
                  <div className="text-center px-6 py-6 space-y-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 text-[#38BDF8] flex items-center justify-center mx-auto">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-white">
                      Book Barcode / QR Camera Ready
                    </p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Click "Start Camera Scanner" to scan a physical book label with your device camera, or click a book barcode tag on the right.
                    </p>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>

            {/* Instant Scanned Book Identification Result Card */}
            {scannedCopy ? (
              <div className="p-4 rounded-2xl bg-[#F0F9FF] border-2 border-[#0284C7] space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-[#0284C7] text-white font-mono text-xs font-bold">
                        {scannedCopy.accession_number}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${
                          scannedCopy.status === 'AVAILABLE'
                            ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                            : scannedCopy.status === 'RESERVED'
                            ? 'bg-amber-50 text-[#D97706] border-amber-200'
                            : 'bg-white text-[#0284C7] border-[#E0F2FE]'
                        }`}
                      >
                        {scannedCopy.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#0F172A] mt-1.5">
                      {scannedBook?.title || 'Identified Academic Volume'}
                    </h4>
                    <p className="text-xs text-slate-600">
                      {scannedBook?.author} ·{' '}
                      <span className="font-mono">ISBN: {scannedBook?.isbn}</span>
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-600 pt-2 border-t border-sky-200/70">
                  <span className="inline-flex items-center gap-1 font-semibold text-[#0F172A]">
                    <MapPin className="w-3.5 h-3.5 text-[#0284C7]" />
                    {scannedCopy.floor} · {scannedCopy.rack} · {scannedCopy.shelf}
                  </span>

                  {activeLoanForScannedCopy && (
                    <span className="text-[#DC2626] font-semibold">
                      Borrower: {borrowerForScannedCopy?.full_name || 'Student'} (
                      {borrowerForScannedCopy?.roll_no}) · Fine: ₹{liveFineForScannedCopy}
                    </span>
                  )}
                </div>

                {/* Instant One-Click Issue or Return Routing */}
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  {scannedCopy.status === 'AVAILABLE' ||
                  scannedCopy.status === 'RESERVED' ? (
                    <button
                      type="button"
                      onClick={() => onSelectForIssue(scannedCopy.accession_number)}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <BookUp className="w-4 h-4" />
                      Proceed to Issue {scannedCopy.accession_number}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectForReturn(scannedCopy.accession_number)}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <BookDown className="w-4 h-4" />
                      Proceed to Return {scannedCopy.accession_number}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E0F2FE] flex items-center justify-between text-xs text-slate-600">
                <span>
                  {rawScanText
                    ? `Last Scanned Payload: ${rawScanText}`
                    : 'Scan any book QR / barcode to automatically identify its status and route to Issue or Return.'}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT 5 COLS: Quick Physical Barcode Simulator / Instant Copy Selector */}
          <div className="lg:col-span-5 bg-[#F8FAFC] border border-[#E0F2FE] rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#0F172A]">
                  2. Physical Book Barcode Tags
                </span>
                <span className="text-[11px] font-mono text-[#0284C7]">
                  {bookCopies.length} Copies
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Click any physical book barcode label below to test instant optical identification for Issue or Return:
              </p>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {bookCopies.map((copy) => {
                  const bk = books.find((b) => b.id === copy.book_id);
                  const isSelected = scannedCopy?.id === copy.id;
                  const isIssued =
                    copy.status === 'ISSUED' || copy.status === 'OVERDUE';

                  return (
                    <button
                      key={copy.id}
                      type="button"
                      onClick={() => matchScannedPayload(copy.accession_number)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-white border-[#0284C7] ring-1 ring-[#0284C7]'
                          : 'bg-white border-[#E0F2FE] hover:border-sky-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#0284C7]">
                            {copy.accession_number}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-semibold border ${
                              copy.status === 'AVAILABLE'
                                ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                                : copy.status === 'RESERVED'
                                ? 'bg-amber-50 text-[#D97706] border-amber-200'
                                : 'bg-[#F0F9FF] text-[#0284C7] border-[#E0F2FE]'
                            }`}
                          >
                            {copy.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#0F172A] truncate mt-0.5">
                          {bk?.title || 'Academic Volume'}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500">
                          {copy.floor} · {copy.rack} · {copy.shelf}
                        </p>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 ${
                          isIssued
                            ? 'bg-emerald-50 text-[#059669]'
                            : 'bg-[#F0F9FF] text-[#0284C7]'
                        }`}
                      >
                        {isIssued ? 'Scan Return' : 'Scan Issue'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#E0F2FE] flex items-center justify-between text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-[#0284C7]" />
                Supports QR & Accession Codes
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[#0F172A]">
                <ArrowLeftRight className="w-3 h-3 text-[#0284C7]" />
                Auto Issue/Return
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
