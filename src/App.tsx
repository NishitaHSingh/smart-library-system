/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Book,
  BookCopy,
  Borrowing,
  Fine,
  Profile,
  UserRole,
} from './types/database';
import { libraryRepository } from './lib/supabase';
import { ActiveTab, Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { BookCatalogue } from './components/BookCatalogue';
import { DigitalLibrary } from './components/DigitalLibrary';
import { LibrarianDesk } from './components/LibrarianDesk';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookCopies, setBookCopies] = useState<BookCopy[]>([]);
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // First page is Login / Sign Up if no user session is active
  const [currentUser, setCurrentUser] = useState<Profile | null>(() =>
    libraryRepository.getActiveUser()
  );
  const [activeRole, setActiveRole] = useState<UserRole>(
    () => libraryRepository.getActiveUser()?.role || 'STUDENT'
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('CATALOGUE');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  // Quick-launch state from Catalogue to Librarian Desk
  const [deskShortcut, setDeskShortcut] = useState<{
    accession: string;
    mode: 'ISSUE' | 'RETURN';
  }>({ accession: '', mode: 'ISSUE' });

  const loadSnapshot = useCallback(async () => {
    const snapshot = await libraryRepository.fetchLibrarySnapshot();
    setProfiles(snapshot.profiles);
    setBooks(snapshot.books);
    setBookCopies(snapshot.bookCopies);
    setBorrowings(snapshot.borrowings);
    setFines(snapshot.fines);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const handleRoleChange = (nextRole: UserRole) => {
    setActiveRole(nextRole);
    if (currentUser) {
      const updatedUser: Profile = { ...currentUser, role: nextRole };
      setCurrentUser(updatedUser);
      libraryRepository.setActiveUser(updatedUser);
    }
    if (nextRole === 'STUDENT' && activeTab === 'DESK') {
      setActiveTab('DASHBOARD');
    }
  };

  const handleAuthSuccess = async (profile: Profile) => {
    setCurrentUser(profile);
    setActiveRole(profile.role);
    setAuthModalOpen(false);
    await loadSnapshot();
  };

  const handleLogout = () => {
    libraryRepository.setActiveUser(null);
    setCurrentUser(null);
    setAuthModalOpen(false);
  };

  const handleOpenDeskWithAccession = (
    accessionNumber: string,
    action: 'ISSUE' | 'RETURN'
  ) => {
    setDeskShortcut({ accession: accessionNumber, mode: action });
    setActiveTab('DESK');
  };

  // Show the Sign Up / Login Page as the very first screen when not authenticated
  if (!currentUser) {
    return (
      <AuthModal
        fullPage
        initialRole={activeRole}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#0F172A] flex flex-col">
      {/* Top Navigation Bar */}
      <Header
        currentUser={currentUser}
        activeRole={activeRole}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRoleChange={handleRoleChange}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="space-y-4">
            <div className="h-28 rounded-2xl bg-[#F8FAFC] border border-[#E0F2FE] animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="h-64 rounded-2xl bg-[#F8FAFC] border border-[#E0F2FE] animate-pulse" />
              <div className="h-64 rounded-2xl bg-[#F8FAFC] border border-[#E0F2FE] animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'CATALOGUE' && (
              <BookCatalogue
                books={books}
                bookCopies={bookCopies}
                currentUser={currentUser}
                activeRole={activeRole}
                onDataRefresh={loadSnapshot}
                onOpenDeskWithAccession={handleOpenDeskWithAccession}
                onRequireAuth={() => setAuthModalOpen(true)}
              />
            )}

            {activeTab === 'DIGITAL_LIBRARY' && (
              <DigitalLibrary activeRole={activeRole} />
            )}

            {activeTab === 'DESK' && (
              <LibrarianDesk
                profiles={profiles}
                books={books}
                bookCopies={bookCopies}
                borrowings={borrowings}
                fines={fines}
                initialAccession={deskShortcut.accession}
                initialMode={deskShortcut.mode}
                onDataRefresh={loadSnapshot}
              />
            )}

            {activeTab === 'DASHBOARD' && (
              <Dashboard
                activeRole={activeRole}
                currentUser={currentUser}
                profiles={profiles}
                books={books}
                bookCopies={bookCopies}
                borrowings={borrowings}
                fines={fines}
                onDataRefresh={loadSnapshot}
                onNavigateToCatalogue={() => setActiveTab('CATALOGUE')}
              />
            )}
          </>
        )}
      </main>

      {/* Clean Institutional Footer */}
      <footer className="border-t border-sky-100 bg-[#F8FAFC] py-4 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            MIT College Smart Library System · Central Academic Resource Center
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('CATALOGUE')}
              className="hover:text-[#0284C7] transition-colors cursor-pointer"
            >
              Physical Catalogue
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setActiveTab('DIGITAL_LIBRARY')}
              className="hover:text-[#0284C7] transition-colors cursor-pointer"
            >
              Digital Library (NPTEL & PDFs)
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setActiveTab('DASHBOARD')}
              className="hover:text-[#0284C7] transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={handleLogout}
              className="hover:text-[#DC2626] transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </footer>

      {/* Switch Account Modal when already signed in */}
      <AuthModal
        isOpen={authModalOpen}
        initialRole={activeRole}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
