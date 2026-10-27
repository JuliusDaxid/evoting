import React, { useState, useEffect } from 'react';
import { dbService } from './services/dbService';
import { AuthSession, Settings } from './types';
import { Navbar } from './components/Navbar';
import { AdminMenuKey, AdminSidebar } from './components/AdminSidebar';
import { SupabaseGuideModal } from './components/SupabaseGuideModal';
import { LoginView } from './views/LoginView';
import { StudentDashboard } from './views/StudentDashboard';
import { VotingBooth } from './views/VotingBooth';
import { AdminDashboard } from './views/admin/AdminDashboard';
import { ClassesManagement } from './views/admin/ClassesManagement';
import { StudentsManagement } from './views/admin/StudentsManagement';
import { CandidatesManagement } from './views/admin/CandidatesManagement';
import { VoteResults } from './views/admin/VoteResults';
import { SettingsView } from './views/admin/SettingsView';
import { OsisMembersView } from './views/admin/OsisMembersView';
import { ProgramsTrackerView } from './views/admin/ProgramsTrackerView';
import { AttendanceView } from './views/admin/AttendanceView';
import { DocumentsArchiveView } from './views/admin/DocumentsArchiveView';

import { OFFICIAL_EOSIS_LOGO_SVG } from './components/EosisLogo';

export default function App() {
  const [session, setSession] = useState<AuthSession>(null);
  const [settings, setSettings] = useState<Settings>({
    school_name: 'SMP Negeri 1 Dayun',
    school_logo: OFFICIAL_EOSIS_LOGO_SVG,
    election_period: 'Masa Bakti 2026/2027',
    is_election_active: true,
    admin_username: 'admin',
    admin_password_hash: 'admin123',
  });

  // Navigation states
  const [studentView, setStudentView] = useState<'dashboard' | 'booth'>('dashboard');
  const [adminMenu, setAdminMenu] = useState<AdminMenuKey>('beranda');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Supabase status & modal
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    isConnected: boolean;
    tablesFound: boolean;
    message: string;
  }>({
    isConnected: true,
    tablesFound: false,
    message: 'Memeriksa status koneksi Supabase...',
  });

  useEffect(() => {
    initApp();

    const handleReconnected = () => {
      checkSupabase();
    };
    window.addEventListener('eosis_supabase_reconnected', handleReconnected);
    return () => {
      window.removeEventListener('eosis_supabase_reconnected', handleReconnected);
    };
  }, []);

  const initApp = async () => {
    try {
      const s = await dbService.getSettings();
      setSettings(s);
    } catch (e) {
      console.warn('Error fetching settings', e);
    }
    checkSupabase();
  };

  const checkSupabase = async () => {
    const status = await dbService.checkSupabaseConnection();
    setSupabaseStatus(status);
  };

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    if (newSession?.role === 'student') {
      setStudentView('dashboard');
    } else if (newSession?.role === 'admin') {
      setAdminMenu('beranda');
    }
  };

  const handleLogout = () => {
    setSession(null);
    setStudentView('dashboard');
    setIsMobileSidebarOpen(false);
  };

  const handleVoteCompletedAndLoggedOut = () => {
    setSession(null);
    setStudentView('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Navbar Header */}
      <Navbar
        session={session}
        settings={settings}
        onLogout={handleLogout}
        onOpenSupabaseGuide={() => setIsSupabaseModalOpen(true)}
        supabaseStatus={supabaseStatus}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {!session ? (
          /* GUEST / LOGIN VIEW */
          <main className="flex-1">
            <LoginView
              settings={settings}
              onLoginSuccess={handleLoginSuccess}
              onOpenSupabaseGuide={() => setIsSupabaseModalOpen(true)}
            />
          </main>
        ) : session.role === 'student' ? (
          /* STUDENT VIEWS */
          <main className="flex-1">
            {studentView === 'dashboard' ? (
              <StudentDashboard
                student={session.student}
                settings={settings}
                onGoToVoting={() => setStudentView('booth')}
                onLogout={handleLogout}
              />
            ) : (
              <VotingBooth
                student={session.student}
                settings={settings}
                onBackToDashboard={() => setStudentView('dashboard')}
                onVoteCompletedAndLoggedOut={handleVoteCompletedAndLoggedOut}
              />
            )}
          </main>
        ) : (
          /* ADMIN VIEWS */
          <div className="flex-1 flex flex-col lg:flex-row">
            {/* Mobile Admin Bar Toggle */}
            <div className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="flex items-center gap-2 text-xs font-bold bg-slate-800 px-3 py-1.5 rounded-lg text-blue-400"
              >
                <i className="bi bi-list text-base"></i>
                <span>Menu Navigasi Admin</span>
              </button>
              <span className="text-xs font-semibold text-slate-300 capitalize">
                Menu: {adminMenu}
              </span>
            </div>

            {/* Sidebar */}
            <AdminSidebar
              activeMenu={adminMenu}
              onSelectMenu={setAdminMenu}
              onLogout={handleLogout}
              isMobileOpen={isMobileSidebarOpen}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
              electionPeriod={settings.election_period}
            />

            {/* Admin Content Area (offset by sidebar on desktop) */}
            <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8">
              <div className="max-w-6xl mx-auto">
                {/* PEMILIHAN OSIS */}
                {adminMenu === 'beranda' && (
                  <AdminDashboard
                    settings={settings}
                    onNavigate={(menu) => setAdminMenu(menu)}
                    onOpenSupabaseGuide={() => setIsSupabaseModalOpen(true)}
                    supabaseStatus={supabaseStatus}
                  />
                )}

                {adminMenu === 'kelas' && <ClassesManagement />}

                {adminMenu === 'siswa' && <StudentsManagement />}

                {adminMenu === 'kandidat' && <CandidatesManagement />}

                {adminMenu === 'perolehan' && <VoteResults settings={settings} />}

                {/* MODUL BARU: MANAJEMEN INTERNAL OSIS */}
                {adminMenu === 'struktur' && <OsisMembersView />}

                {adminMenu === 'proja' && <ProgramsTrackerView />}

                {adminMenu === 'absensi' && <AttendanceView />}

                {adminMenu === 'arsip' && <DocumentsArchiveView />}

                {/* PENGATURAN */}
                {adminMenu === 'pengaturan' && (
                  <SettingsView
                    settings={settings}
                    onUpdateSettings={setSettings}
                    onOpenSupabaseGuide={() => setIsSupabaseModalOpen(true)}
                    supabaseStatus={supabaseStatus}
                    onRefreshSupabaseStatus={checkSupabase}
                  />
                )}
              </div>
            </main>
          </div>
        )}
      </div>

      {/* Supabase Guide & SQL Script Modal */}
      <SupabaseGuideModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSyncComplete={checkSupabase}
      />
    </div>
  );
}
