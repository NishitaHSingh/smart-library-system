import React, { useState } from 'react';
import {
  ChevronDown,
  LogOut,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  LayoutDashboard,
  Library,
  ArrowLeftRight,
  LogIn,
  Globe,
} from 'lucide-react';
import { Profile, UserRole } from '../types/database';
import { MitCsnLogo } from './MitCsnLogo';

export type ActiveTab = 'CATALOGUE' | 'DIGITAL_LIBRARY' | 'DESK' | 'DASHBOARD';

interface HeaderProps {
  currentUser: Profile | null;
  activeRole: UserRole;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onRoleChange: (role: UserRole) => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

const ROLE_META: Record<
  UserRole,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  STUDENT: {
    label: 'STUDENT',
    badgeClass: 'bg-[#F0F9FF] text-[#0284C7] border-[#E0F2FE]',
    icon: GraduationCap,
  },
  LIBRARIAN: {
    label: 'LIBRARIAN',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: UserCheck,
  },
  ADMIN: {
    label: 'ADMIN',
    badgeClass: 'bg-slate-900 text-white border-slate-900',
    icon: ShieldCheck,
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeRole,
  activeTab,
  onTabChange,
  onRoleChange,
  onOpenAuthModal,
  onLogout,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const RoleIcon = ROLE_META[activeRole].icon;

  const initials = currentUser?.full_name
    ? currentUser.full_name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
    : 'MIT';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-sky-100">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Top-Left MIT CSN Branding (Never truncated or hidden by nav tabs) */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#catalogue"
            onClick={(e) => {
              e.preventDefault();
              onTabChange('CATALOGUE');
            }}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="h-10 px-2.5 flex items-center justify-center rounded-lg bg-white border border-[#E0F2FE] shrink-0">
              <MitCsnLogo className="h-7 w-auto" />
            </div>
            <span className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-[#0F172A] whitespace-nowrap">
              MIT College Smart Library System
            </span>
          </a>
        </div>

        {/* Zone 2: Primary Navigation Links (Compact single-word/two-word labels with generous breathing room) */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-lg border border-[#E0F2FE] shrink-0">
          <button
            type="button"
            onClick={() => onTabChange('CATALOGUE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'CATALOGUE'
                ? 'bg-[#0284C7] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0F172A] hover:bg-white'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            Catalogue
          </button>

          <button
            type="button"
            onClick={() => onTabChange('DIGITAL_LIBRARY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'DIGITAL_LIBRARY'
                ? 'bg-[#0284C7] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0F172A] hover:bg-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Digital Library
          </button>

          {(activeRole === 'LIBRARIAN' || activeRole === 'ADMIN') && (
            <button
              type="button"
              onClick={() => onTabChange('DESK')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'DESK'
                  ? 'bg-[#0284C7] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0F172A] hover:bg-white'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Issue & Return
            </button>
          )}

          <button
            type="button"
            onClick={() => onTabChange('DASHBOARD')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'DASHBOARD'
                ? 'bg-[#0284C7] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0F172A] hover:bg-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            {activeRole === 'STUDENT' ? 'My Loans' : 'Analytics'}
          </button>
        </nav>

        {/* Zone 3: Top-Right Role Switcher & Profile Avatar / Logout */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Role Switcher Badge / Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setRoleDropdownOpen((prev) => !prev);
                setProfileMenuOpen(false);
              }}
              aria-label="Switch active role"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${ROLE_META[activeRole].badgeClass}`}
            >
              <RoleIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{ROLE_META[activeRole].label}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-75" />
            </button>

            {roleDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setRoleDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-[#E0F2FE] shadow-lg py-1.5 z-20">
                  <div className="px-3 py-1.5 border-b border-sky-50">
                    <p className="text-[11px] font-semibold text-slate-400">
                      Switch Role View
                    </p>
                  </div>
                  {(['STUDENT', 'LIBRARIAN', 'ADMIN'] as UserRole[]).map((role) => {
                    const ItemIcon = ROLE_META[role].icon;
                    const isSelected = activeRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          onRoleChange(role);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#F0F9FF] text-[#0284C7] font-semibold'
                            : 'text-[#0F172A] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <ItemIcon className="w-3.5 h-3.5 text-[#0284C7]" />
                          {role}
                        </span>
                        {isSelected && (
                          <span className="text-[11px] font-mono text-[#0284C7]">Active</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Profile Avatar & Logout Option */}
          {currentUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setRoleDropdownOpen(false);
                }}
                className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg border border-[#E0F2FE] bg-[#F8FAFC] hover:bg-[#F0F9FF] transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-md bg-[#0284C7] text-white flex items-center justify-center text-xs font-bold tracking-tight shrink-0">
                  {initials}
                </div>
                <div className="hidden xl:flex flex-col items-start text-left">
                  <span className="text-xs font-semibold text-[#0F172A] leading-tight max-w-[115px] truncate">
                    {currentUser.full_name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 leading-tight">
                    {currentUser.roll_no}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-[#E0F2FE] shadow-lg py-2 z-20">
                    <div className="px-4 py-2.5 border-b border-sky-100">
                      <p className="text-xs font-bold text-[#0F172A] truncate">
                        {currentUser.full_name}
                      </p>
                      <p className="text-xs text-[#0284C7] font-mono truncate mt-0.5">
                        {currentUser.email}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-mono">{currentUser.roll_no}</span>
                        <span>·</span>
                        <span className="truncate">{currentUser.department}</span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onOpenAuthModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-[#F0F9FF] hover:text-[#0284C7] transition-colors cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        Switch MIT Account
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              MIT Sign In
            </button>
          )}
        </div>
      </div>

      {/* Tablet / Mobile Navigation Bar (< 1024px) so branding never collides with navigation */}
      <div className="flex lg:hidden items-center justify-start gap-1.5 overflow-x-auto border-t border-sky-100 bg-[#F8FAFC] px-4 py-2">
        <button
          type="button"
          onClick={() => onTabChange('CATALOGUE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
            activeTab === 'CATALOGUE'
              ? 'bg-[#0284C7] text-white'
              : 'text-slate-600 hover:bg-white'
          }`}
        >
          <Library className="w-3.5 h-3.5" />
          Catalogue
        </button>

        <button
          type="button"
          onClick={() => onTabChange('DIGITAL_LIBRARY')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
            activeTab === 'DIGITAL_LIBRARY'
              ? 'bg-[#0284C7] text-white'
              : 'text-slate-600 hover:bg-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Digital Library
        </button>

        {(activeRole === 'LIBRARIAN' || activeRole === 'ADMIN') && (
          <button
            type="button"
            onClick={() => onTabChange('DESK')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'DESK'
                ? 'bg-[#0284C7] text-white'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Issue & Return
          </button>
        )}

        <button
          type="button"
          onClick={() => onTabChange('DASHBOARD')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
            activeTab === 'DASHBOARD'
              ? 'bg-[#0284C7] text-white'
              : 'text-slate-600 hover:bg-white'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          {activeRole === 'STUDENT' ? 'My Loans' : 'Analytics'}
        </button>
      </div>
    </header>
  );
};
