import React from 'react';
import { AuthSession, Settings } from '../types';

interface Props {
  session: AuthSession;
  settings: Settings;
  onLogout: () => void;
  onOpenSupabaseGuide: () => void;
  supabaseStatus: { isConnected: boolean; tablesFound: boolean };
}

export const Navbar: React.FC<Props> = ({
  session,
  settings,
  onLogout,
  onOpenSupabaseGuide,
  supabaseStatus,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & School Identity */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-blue-50 border border-blue-200 flex items-center justify-center shadow-xs">
              {settings.school_logo ? (
                <img
                  src={settings.school_logo}
                  alt="Logo Sekolah"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=120&q=80';
                  }}
                />
              ) : (
                <i className="bi bi-mortarboard-fill text-blue-600 text-xl"></i>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-blue-900 tracking-tight text-lg">eOSIS</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                  {settings.election_period || 'Periode 2026/2027'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xs sm:max-w-md">
                {settings.school_name || 'SMP Negeri 1 Dayun'}
              </p>
            </div>
          </div>

          {/* Right Action Area */}
          <div className="flex items-center gap-3">
            {/* Supabase Status Pill */}
            <button
              onClick={onOpenSupabaseGuide}
              title="Klik untuk membuka panduan & skrip SQL Supabase"
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                supabaseStatus.tablesFound
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 animate-pulse'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${supabaseStatus.tablesFound ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              <span className="hidden md:inline">
                {supabaseStatus.tablesFound ? 'Supabase: Aktif' : 'Supabase: Perlu Migrasi SQL'}
              </span>
              <i className="bi bi-database text-xs"></i>
            </button>

            {session ? (
              <div className="flex items-center gap-2">
                {session.role === 'student' ? (
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {session.student.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Kelas {session.student.class_name || '-'} • NISN: {session.student.nisn}
                    </span>
                  </div>
                ) : (
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-bold text-indigo-700 leading-tight flex items-center gap-1 justify-end">
                      <i className="bi bi-shield-check"></i> Administrator
                    </span>
                    <span className="text-[11px] text-slate-500">
                      @{session.username}
                    </span>
                  </div>
                )}

                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition active:scale-95"
                >
                  <i className="bi bi-box-arrow-right"></i>
                  <span>Keluar</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
