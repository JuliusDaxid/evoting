import React, { useState } from 'react';
import { dbService } from '../services/dbService';
import { AuthSession, Settings, Student } from '../types';
import { EosisLogo } from '../components/EosisLogo';

interface Props {
  settings: Settings;
  onLoginSuccess: (session: AuthSession) => void;
  onOpenSupabaseGuide: () => void;
}

export const LoginView: React.FC<Props> = ({ settings, onLoginSuccess, onOpenSupabaseGuide }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');

  // Student form state (NISN Only)
  const [nisn, setNisn] = useState('');
  const [studentError, setStudentError] = useState<string | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  // Admin form state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);

    const cleanNisn = nisn.trim();
    if (!cleanNisn) {
      setStudentError('Harap masukkan nomor NISN Anda.');
      return;
    }

    setStudentLoading(true);
    try {
      const student = await dbService.loginStudent(cleanNisn);
      onLoginSuccess({
        role: 'student',
        student,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login gagal. Periksa nomor NISN Anda.';
      setStudentError(msg);
    } finally {
      setStudentLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    if (!adminUsername.trim() || !adminPassword.trim()) {
      setAdminError('Username dan password admin wajib diisi.');
      return;
    }

    setAdminLoading(true);
    try {
      const trimmedUser = adminUsername.trim();
      const trimmedPass = adminPassword.trim();

      // Rahasia Super Admin: Albi2012 / 201211
      if (trimmedUser === 'Albi2012' && trimmedPass === '201211') {
        onLoginSuccess({
          role: 'admin',
          username: 'Albi2012',
          isSuperAdmin: true,
        });
        return;
      }

      const currentSettings = await dbService.getSettings();
      // Validate regular admin credentials
      if (
        trimmedUser === currentSettings.admin_username &&
        trimmedPass === currentSettings.admin_password_hash
      ) {
        onLoginSuccess({
          role: 'admin',
          username: trimmedUser,
          isSuperAdmin: false,
        });
      } else {
        setAdminError('Username atau password administrator salah.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memverifikasi akun admin';
      setAdminError(msg);
    } finally {
      setAdminLoading(false);
    }
  };

  const fillDemoStudent = (demoNisn: string) => {
    setNisn(demoNisn);
    setStudentError(null);
  };

  const fillDemoAdmin = () => {
    setAdminUsername('admin');
    setAdminPassword('admin123');
    setAdminError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl grid md:grid-cols-12 bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200/90">
        {/* Left Column: Visual School Identity */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -right-12 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold mb-6">
              <i className="bi bi-shield-check text-emerald-400"></i>
              <span>Sistem Pemilihan Resmi OSIS</span>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-white p-2 shadow-lg mb-5 overflow-hidden flex items-center justify-center shrink-0">
              <EosisLogo logoUrl={settings.school_logo} size="xl" alt="Logo eOSIS" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              {settings.school_name || 'SMP Negeri 1 Dayun'}
            </h1>
            <p className="text-blue-100 text-sm mt-2 font-medium">
              Aplikasi Pemilihan Ketua dan Wakil Ketua OSIS
            </p>
            <div className="mt-4 inline-block px-3 py-1 bg-blue-600/60 rounded-lg text-xs font-semibold border border-blue-400/30">
              <i className="bi bi-calendar3 me-1.5"></i>
              {settings.election_period || 'Periode 2026/2027'}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/15 relative z-10 space-y-3">
            <div className="flex items-center gap-3 text-xs text-blue-100">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <i className="bi bi-person-check text-blue-300"></i>
              </div>
              <span>Asas LUBER: Langsung, Umum, Bebas, Rahasia</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-blue-100">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <i className="bi bi-lock-fill text-emerald-300"></i>
              </div>
              <span>Satu Siswa = Satu Suara (Tervalidasi Database)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Login Forms */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
          {/* Role Switcher Tabs */}
          <div className="flex p-1.5 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('student');
                setStudentError(null);
              }}
              className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${
                activeTab === 'student'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="bi bi-person-badge-fill text-base"></i>
              <span>Login Siswa / Pemilih</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setAdminError(null);
              }}
              className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${
                activeTab === 'admin'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="bi bi-shield-lock-fill text-base"></i>
              <span>Login Admin / Panitia</span>
            </button>
          </div>

          {/* STUDENT LOGIN FORM (NISN ONLY) */}
          {activeTab === 'student' && (
            <div>
              <div className="mb-5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold mb-2">
                  <i className="bi bi-shield-check"></i>
                  <span>Login Cepat Pemilih OSIS</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800">Masuk sebagai Siswa (Pemilih)</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Masukkan nomor NISN Anda untuk memverifikasi hak suara secara langsung dan aman.
                </p>
              </div>

              {studentError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2.5 animate-shake">
                  <i className="bi bi-exclamation-triangle-fill text-rose-500 text-lg shrink-0 mt-0.5"></i>
                  <div>
                    <span className="font-bold block text-rose-800">Pemberitahuan Hak Suara:</span>
                    <span className="leading-relaxed">{studentError}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>NISN (Nomor Induk Siswa Nasional) <span className="text-rose-500">*</span></span>
                    <span className="text-[11px] font-normal text-slate-400">10 Digit Angka</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <i className="bi bi-person-vcard text-lg"></i>
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value.replace(/\D/g, ''))}
                      placeholder="Masukkan 10 digit NISN Anda..."
                      required
                      autoFocus
                      className="w-full pl-11 pr-4 py-3 text-sm font-semibold tracking-wide rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-inner placeholder:font-normal placeholder:tracking-normal"
                    />
                  </div>
                  <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
                    <i className="bi bi-info-circle text-blue-600 shrink-0"></i>
                    <span>Cukup masukkan NISN. Sistem akan otomatis memverifikasi nama, kelas, dan hak suara Anda di database.</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={studentLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {studentLoading ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin text-base"></i>
                      <span>Memverifikasi Hak Suara di Database...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Bilik Suara</span>
                      <i className="bi bi-arrow-right"></i>
                    </>
                  )}
                </button>
              </form>

              {/* Demo quick fill buttons for test */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <i className="bi bi-magic text-blue-500"></i> Akun Siswa Demo untuk Pengujian:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemoStudent('0081234502')}
                    className="p-2 text-left bg-slate-50 hover:bg-blue-50/70 border border-slate-200 rounded-lg text-xs transition group cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800 group-hover:text-blue-700 block truncate">
                      Annisa Putri R. (NISN: 0081234502)
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold block flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Belum Memilih
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoStudent('0081234501')}
                    className="p-2 text-left bg-slate-50 hover:bg-rose-50/70 border border-slate-200 rounded-lg text-xs transition group cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800 group-hover:text-rose-700 block truncate">
                      Ahmad Rizky (NISN: 0081234501)
                    </span>
                    <span className="text-[10px] text-rose-600 font-bold block flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Sudah Memilih (Uji Blokir)
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ADMIN LOGIN FORM */}
          {activeTab === 'admin' && (
            <div>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-800">Masuk sebagai Administrator</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Panel pengelolaan pemilihan OSIS, rekap suara, DPT siswa, dan data kandidat.
                </p>
              </div>

              {adminError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
                  <i className="bi bi-exclamation-octagon-fill text-rose-500 text-base shrink-0 mt-0.5"></i>
                  <div>
                    <span className="font-semibold block">Gagal Masuk:</span>
                    <span>{adminError}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Username Admin
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <i className="bi bi-person-fill"></i>
                    </span>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="Username (default: admin)"
                      required
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password Admin
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <i className="bi bi-key-fill"></i>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Password (default: admin123)"
                      required
                      className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {adminLoading ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin"></i>
                      <span>Masuk ke Dashboard...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Panel Admin</span>
                      <i className="bi bi-arrow-right"></i>
                    </>
                  )}
                </button>
              </form>

              {/* Demo Admin Helper */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Kredensial Default: admin / admin123</span>
                <button
                  type="button"
                  onClick={fillDemoAdmin}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 transition"
                >
                  Isi Otomatis
                </button>
              </div>
            </div>
          )}

          {/* Database Setup Button at bottom */}
          <div className="mt-6 text-center">
            <button
              onClick={onOpenSupabaseGuide}
              className="text-[11px] text-slate-500 hover:text-blue-600 underline font-medium inline-flex items-center gap-1"
            >
              <i className="bi bi-database"></i>
              <span>Lihat Panduan &amp; Skrip SQL Supabase</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
