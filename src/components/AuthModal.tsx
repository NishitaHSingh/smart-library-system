import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Hash,
  Building2,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  UserCheck,
  ShieldCheck,
  PenLine,
  LogIn,
  UserPlus,
  ArrowLeft,
} from 'lucide-react';
import {
  MIT_DEPARTMENTS,
  MITDepartment,
  Profile,
  UserRole,
} from '../types/database';
import { libraryRepository } from '../lib/supabase';
import { MitCsnLogo } from './MitCsnLogo';

interface AuthModalProps {
  isOpen?: boolean;
  fullPage?: boolean;
  initialRole?: UserRole;
  onClose?: () => void;
  onSuccess: (profile: Profile) => void;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@mit\.asia$/i;

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen = true,
  fullPage = false,
  initialRole = 'STUDENT',
  onClose,
  onSuccess,
}) => {
  // First step asks the user whether they want to Login or Sign Up
  const [step, setStep] = useState<'CHOOSE_ACTION' | 'FORM'>('CHOOSE_ACTION');
  const [mode, setMode] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_UP');
  const [role, setRole] = useState<UserRole>(initialRole);
  const [fullName, setFullName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [department, setDepartment] = useState<MITDepartment>('Computer Science & Engineering');
  const [customDepartment, setCustomDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!fullPage && !isOpen) return null;

  const isStudent = role === 'STUDENT';
  const idFieldLabel = isStudent ? 'Roll No / PRN' : 'Employee ID';
  const idFieldPlaceholder = isStudent ? 'Enter Roll No / PRN' : 'Enter Employee ID';

  const validateEmailDomain = (value: string): boolean => {
    return EMAIL_REGEX.test(value.trim());
  };

  const handleRolePresetFill = (targetRole: UserRole) => {
    setRole(targetRole);
    setError(null);
    if (targetRole === 'STUDENT') {
      setDepartment('Computer Science & Engineering');
    } else {
      setDepartment('Library & Administration');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmailDomain(trimmedEmail)) {
      setError('Invalid email domain. Only official @mit.asia institutional emails are permitted (e.g., student@mit.asia).');
      return;
    }

    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    const finalDepartment =
      department === 'Other' ? customDepartment.trim() : department;

    if (mode === 'SIGN_UP') {
      if (!fullName.trim()) {
        setError('Please enter your Full Name.');
        return;
      }
      if (!rollNo.trim()) {
        setError(`Please enter your ${idFieldLabel}.`);
        return;
      }
      if (phone.trim().length < 10) {
        setError('Please enter a valid 10-digit phone number (with +91 country code).');
        return;
      }
      if (department === 'Other' && !finalDepartment) {
        setError('Please enter your custom department name.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'SIGN_IN') {
        const profile = await libraryRepository.signInAccount(trimmedEmail, password, role);
        onSuccess(profile);
        if (onClose) onClose();
      } else {
        const profile = await libraryRepository.signUpAccount({
          full_name: fullName,
          email: trimmedEmail,
          role,
          phone,
          roll_no: rollNo,
          department: finalDepartment,
          password,
        });
        onSuccess(profile);
        if (onClose) onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const emailEntered = email.trim().length > 0;
  const emailValid = validateEmailDomain(email);

  const authCardContent = (
    <div className="relative w-full max-w-lg bg-white rounded-2xl border border-[#E0F2FE] shadow-xl overflow-hidden">
      {/* Top Banner with MIT CSN Logo */}
      <div className="bg-[#F0F9FF] border-b border-[#E0F2FE] px-6 py-5 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center bg-white border border-[#E0F2FE] rounded-lg px-3 py-1.5 mb-2.5">
            <MitCsnLogo className="h-6 w-auto" />
          </div>
          <h1 className="text-xl font-bold text-[#0F172A]">
            {step === 'CHOOSE_ACTION'
              ? 'Welcome to MIT Smart Library'
              : mode === 'SIGN_IN'
              ? 'Login to Your MIT Account'
              : 'Sign Up for MIT Library Access'}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Official library management portal for{' '}
            <span className="font-mono font-semibold text-[#0284C7]">@mit.asia</span>{' '}
            students, librarians, and administrators.
          </p>
        </div>

        {!fullPage && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F172A] hover:bg-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* STEP 1: Ask First to Sign Up or Login (No Demo Buttons) */}
      {step === 'CHOOSE_ACTION' ? (
        <div className="p-6 space-y-4">
          <p className="text-xs font-semibold text-slate-500">
            Please choose an option to access the MIT Smart Library System:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option 1: Sign Up */}
            <button
              type="button"
              onClick={() => {
                setMode('SIGN_UP');
                setError(null);
                setStep('FORM');
              }}
              className="group text-left p-5 rounded-2xl border-2 border-[#E0F2FE] hover:border-[#0284C7] bg-[#F8FAFC] hover:bg-[#F0F9FF] transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0284C7] text-white flex items-center justify-center mb-3">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0F172A] group-hover:text-[#0284C7] transition-colors">
                  Sign Up
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Create a new MIT account with your Roll No / PRN, department, and @mit.asia email.
                </p>
              </div>
            </button>

            {/* Option 2: Login */}
            <button
              type="button"
              onClick={() => {
                setMode('SIGN_IN');
                setError(null);
                setStep('FORM');
              }}
              className="group text-left p-5 rounded-2xl border-2 border-[#E0F2FE] hover:border-[#0284C7] bg-[#F8FAFC] hover:bg-[#F0F9FF] transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E0F2FE] text-[#0284C7] flex items-center justify-center mb-3 group-hover:bg-[#0284C7] group-hover:text-white transition-colors">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0F172A] group-hover:text-[#0284C7] transition-colors">
                  Login
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Already registered? Sign in with your verified @mit.asia email and password.
                </p>
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* STEP 2: Login / Sign Up Form */
        <>
          <div className="px-6 pt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setStep('CHOOSE_ACTION');
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0284C7] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="inline-flex p-1 bg-[#F8FAFC] rounded-xl border border-[#E0F2FE]">
              <button
                type="button"
                onClick={() => {
                  setMode('SIGN_UP');
                  setError(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'SIGN_UP'
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('SIGN_IN');
                  setError(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'SIGN_IN'
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                Login
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Account Role Selection: STUDENT | LIBRARIAN | ADMIN toggle */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Account Role Selection
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'STUDENT', label: 'STUDENT', icon: GraduationCap },
                    { id: 'LIBRARIAN', label: 'LIBRARIAN', icon: UserCheck },
                    { id: 'ADMIN', label: 'ADMIN', icon: ShieldCheck },
                  ] as {
                    id: UserRole;
                    label: string;
                    icon: React.ComponentType<{ className?: string }>;
                  }[]
                ).map((item) => {
                  const Icon = item.icon;
                  const active = role === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleRolePresetFill(item.id)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-[#F0F9FF] border-[#0284C7] text-[#0284C7] ring-1 ring-[#0284C7]'
                          : 'bg-white border-[#E0F2FE] text-slate-600 hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-[#DC2626]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'SIGN_UP' && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0284C7]"
                    />
                  </div>
                </div>

                {/* Dynamic Roll No / PRN or Employee ID + Phone Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      {idFieldLabel}
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={rollNo}
                        onChange={(e) => setRollNo(e.target.value.toUpperCase())}
                        placeholder={idFieldPlaceholder}
                        className="w-full pl-10 pr-3 py-2.5 text-sm font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0284C7]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98XXXXXXXX"
                        className="w-full pl-10 pr-3 py-2.5 text-sm font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0284C7]"
                      />
                    </div>
                  </div>
                </div>

                {/* Department Select */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    MIT Academic Department
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value as MITDepartment)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#0284C7]"
                    >
                      {MIT_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Custom Department Input when 'Other' is selected */}
                {department === 'Other' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#0284C7] mb-1">
                      Specify Your Department Name
                    </label>
                    <div className="relative">
                      <PenLine className="w-4 h-4 text-[#0284C7] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={customDepartment}
                        onChange={(e) => setCustomDepartment(e.target.value)}
                        placeholder="Enter your department or branch name..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F0F9FF] border border-[#38BDF8] rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0284C7]"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* MIT Email ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#0F172A]">
                  MIT Email ID
                </label>
                <span className="text-[11px] font-mono text-[#0284C7]">
                  Required: @mit.asia
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@mit.asia"
                  className={`w-full pl-10 pr-9 py-2.5 text-sm font-mono bg-[#F8FAFC] border rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:bg-white ${
                    emailEntered
                      ? emailValid
                        ? 'border-[#059669] focus:border-[#059669]'
                        : 'border-[#DC2626] focus:border-[#DC2626]'
                      : 'border-[#E0F2FE] focus:border-[#0284C7]'
                  }`}
                />
                {emailEntered && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailValid ? (
                      <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0284C7]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0284C7] hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors shadow-xs cursor-pointer"
            >
              {loading
                ? 'Verifying Institutional Credentials...'
                : mode === 'SIGN_IN'
                ? `Login as ${role}`
                : `Complete ${role} Sign Up`}
            </button>
          </form>
        </>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
        {/* Minimal Institutional Top Bar on Login Screen */}
        <header className="bg-white border-b border-sky-100 px-6 py-4">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MitCsnLogo className="h-8 w-auto" />
              <span className="h-5 w-px bg-[#E0F2FE]" />
              <span className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight">
                MIT College Smart Library System
              </span>
            </div>
            <span className="text-xs font-mono text-[#0284C7] hidden sm:inline">
              Chhatrapati Sambhajinagar Campus Portal
            </span>
          </div>
        </header>

        {/* Centered Login / Sign Up Choice Card */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          {authCardContent}
        </main>

        {/* Quiet Footer */}
        <footer className="bg-white border-t border-sky-100 py-3.5 px-6 text-center text-xs text-slate-500">
          MIT College Smart Library Management System · Official @mit.asia Portal
        </footer>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-lg">{authCardContent}</div>
    </div>
  );
};
