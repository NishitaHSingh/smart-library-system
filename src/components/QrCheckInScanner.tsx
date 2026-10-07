import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Upload,
  LogOut,
  Clock,
  MapPin,
} from 'lucide-react';
import { LibraryEntryLog, Profile, UserRole } from '../types/database';
import { libraryRepository } from '../lib/supabase';

interface QrCheckInScannerProps {
  currentUser: Profile | null;
  activeRole: UserRole;
  targetStudent: Profile | null;
}

const ENTRANCE_GATES = [
  {
    code: 'MIT-LIB-GATE-MAIN',
    label: 'Central Library — Main Entrance Gate (Floor 1)',
  },
  {
    code: 'MIT-LIB-GATE-READING',
    label: '24×7 Reading Hall — North Wing Entrance (Floor 1)',
  },
  {
    code: 'MIT-LIB-GATE-DIGITAL',
    label: 'Digital & E-Resource Lab Entrance (Floor 2)',
  },
  {
    code: 'MIT-LIB-GATE-RESEARCH',
    label: 'Postgraduate & Research Stack Gate (Floor 3)',
  },
];

export const QrCheckInScanner: React.FC<QrCheckInScannerProps> = ({
  currentUser,
  activeRole,
  targetStudent,
}) => {
  const activePatron = targetStudent || currentUser;
  const isStaff = activeRole === 'ADMIN' || activeRole === 'LIBRARIAN';

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedGateCode, setSelectedGateCode] = useState<string>('MIT-LIB-GATE-MAIN');
  const [lastCheckIn, setLastCheckIn] = useState<LibraryEntryLog | null>(null);
  const [entryLogs, setEntryLogs] = useState<LibraryEntryLog[]>([]);
  const [processing, setProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const loadEntryLogs = useCallback(() => {
    if (isStaff && !targetStudent) {
      setEntryLogs(libraryRepository.getLibraryEntryLogs());
    } else if (activePatron) {
      setEntryLogs(libraryRepository.getLibraryEntryLogs(activePatron.id));
    } else {
      setEntryLogs([]);
    }
  }, [activePatron, isStaff, targetStudent]);

  useEffect(() => {
    loadEntryLogs();
    const handleSync = () => loadEntryLogs();
    window.addEventListener('mit-library-data-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('mit-library-data-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadEntryLogs]);

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
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleDetectedQrPayload = useCallback(
    async (payload: string) => {
      if (!activePatron || processing) return;
      setProcessing(true);
      setCameraError(null);
      try {
        const record = await libraryRepository.recordLibraryCheckIn({
          user: activePatron,
          qrPayload: payload,
        });
        setLastCheckIn(record);
        loadEntryLogs();
        stopCamera();
      } catch (err) {
        setCameraError(
          err instanceof Error
            ? err.message
            : 'Unable to record library check-in.'
        );
      } finally {
        setProcessing(false);
      }
    },
    [activePatron, processing, loadEntryLogs, stopCamera]
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
          handleDetectedQrPayload(code.data.trim());
          return;
        }
      }
    }

    rafRef.current = requestAnimationFrame(scanVideoFrame);
  }, [handleDetectedQrPayload]);

  const startCamera = async () => {
    setCameraError(null);
    setLastCheckIn(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Camera API is not supported in this browser environment. You can upload a QR image or use the entrance gate check-in below.'
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
        'Camera permission was denied or no camera device was found. You can upload a QR code image or select an entrance gate below.'
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
          handleDetectedQrPayload(code.data);
        } else {
          setCameraError(
            'No valid QR code could be detected in the uploaded image. Please try a clearer QR image or use the entrance gate selector.'
          );
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCheckOut = async (entryId: string, userId: string) => {
    await libraryRepository.recordLibraryCheckOut(entryId, userId);
    loadEntryLogs();
  };

  return (
    <div className="space-y-6">
      {/* Scanner + Gate Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera QR Scanner Viewport */}
        <div className="lg:col-span-7 bg-white border border-[#E0F2FE] rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-semibold text-[#0284C7]">
                  Optical Entrance Check-In
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
                  Camera QR Code Scanner
                </h2>
              </div>

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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Start Camera Scanner
                </button>
              )}
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Point your device camera at the QR standee placed at the MIT Library entrance gate to automatically log your entry timestamp.
            </p>

            {cameraError && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-[#D97706]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Video / Viewfinder Frame */}
            <div className="relative w-full h-64 sm:h-72 rounded-2xl bg-[#0F172A] border border-[#E0F2FE] overflow-hidden flex items-center justify-center">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  {/* Scanning Target Reticle Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 rounded-2xl border-2 border-[#38BDF8] shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] relative">
                      <div className="absolute inset-x-2 top-1/2 h-0.5 bg-[#38BDF8] animate-pulse" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-slate-900/80 text-white text-[11px] font-mono">
                    Scanning for MIT Entrance QR Code...
                  </div>
                </>
              ) : (
                <div className="text-center px-6 py-8 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-[#38BDF8] flex items-center justify-center mx-auto">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Camera Viewfinder Standby
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Click "Start Camera Scanner" to activate your webcam or mobile camera, or upload a QR image below.
                    </p>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>

          {/* Secondary Action: Upload QR Image File */}
          <div className="mt-4 pt-3.5 border-t border-sky-50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">
              Checking in as:{' '}
              <strong className="text-[#0F172A]">
                {activePatron?.full_name}
              </strong>{' '}
              (<span className="font-mono text-[#0284C7]">{activePatron?.roll_no}</span>)
            </span>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0F9FF] hover:bg-sky-100 text-[#0284C7] border border-[#E0F2FE] font-semibold cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Scan from QR Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Right Column: Official MIT Entrance Gate Pass & Instant Check-In */}
        <div className="lg:col-span-5 bg-[#F8FAFC] border border-[#E0F2FE] rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-semibold text-[#0284C7]">
              Entrance Gate Terminal
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] mt-0.5">
              Select MIT Library Gate Code
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Choose the physical library entrance gate below to verify or record an instant digital gate check-in.
            </p>

            <div className="mt-4 space-y-2">
              {ENTRANCE_GATES.map((gate) => {
                const isSelected = selectedGateCode === gate.code;
                return (
                  <button
                    key={gate.code}
                    type="button"
                    onClick={() => setSelectedGateCode(gate.code)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-white border-[#0284C7] ring-1 ring-[#0284C7]'
                        : 'bg-white/70 border-[#E0F2FE] hover:bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0F172A] truncate">
                        {gate.label}
                      </p>
                      <p className="text-[11px] font-mono text-[#0284C7] mt-0.5">
                        QR Payload: {gate.code}
                      </p>
                    </div>
                    <QrCode
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-[#0284C7]' : 'text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E0F2FE] space-y-3">
            <button
              type="button"
              disabled={processing || !activePatron}
              onClick={() => handleDetectedQrPayload(selectedGateCode)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0284C7] hover:bg-sky-700 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              {processing
                ? 'Recording Entry Timestamp...'
                : `Check In at ${selectedGateCode}`}
            </button>

            {lastCheckIn && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-[#059669]">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    Entry Timestamp Recorded Successfully
                  </p>
                  <p className="mt-0.5 font-mono text-[11px]">
                    {lastCheckIn.gate_location} ·{' '}
                    {new Date(lastCheckIn.entry_timestamp).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Physical Library Attendance & Entry Timestamp Log Table */}
      <div className="bg-white border border-[#E0F2FE] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E0F2FE] bg-[#F8FAFC] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">
              Physical Library Entry & Attendance Log
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified entrance QR check-in timestamps recorded in the database
            </p>
          </div>
          <span className="text-xs font-mono text-[#0284C7] font-semibold">
            {entryLogs.length} {entryLogs.length === 1 ? 'Entry' : 'Entries'}
          </span>
        </div>

        {entryLogs.length === 0 ? (
          <div className="p-10 text-center">
            <Clock className="w-7 h-7 text-[#0284C7] mx-auto mb-2 opacity-80" />
            <p className="text-sm font-bold text-[#0F172A]">
              No Physical Library Check-Ins Recorded Yet
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Scan the entrance QR code using your camera or select an entrance gate above to record your first library visit timestamp.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E0F2FE] bg-[#F0F9FF]/50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-5">Student / Patron</th>
                  <th className="py-3 px-4">Entrance Gate</th>
                  <th className="py-3 px-4">Entry Timestamp</th>
                  <th className="py-3 px-4">Exit Timestamp</th>
                  <th className="py-3 px-5 text-right">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0F2FE] text-xs">
                {entryLogs.map((log) => {
                  const isCheckedIn = log.status === 'CHECKED_IN';
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-[#0F172A]">
                          {log.user_name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500">
                          {log.roll_no} · {log.department}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-[#0F172A]">
                          <MapPin className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                          <span>{log.gate_location}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          Code: {log.gate_code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#0F172A] whitespace-nowrap tabular-nums">
                        {new Date(log.entry_timestamp).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'medium',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap tabular-nums">
                        {log.exit_timestamp
                          ? new Date(log.exit_timestamp).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'medium',
                            })
                          : 'Currently Inside'}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {isCheckedIn ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[#059669] font-mono font-semibold">
                              CHECKED IN
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCheckOut(log.id, log.user_id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E0F2FE] bg-[#F0F9FF] hover:bg-[#0284C7] text-[#0284C7] hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              <LogOut className="w-3 h-3" />
                              Check Out
                            </button>
                          </div>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-mono font-semibold">
                            CHECKED OUT
                          </span>
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
    </div>
  );
};
