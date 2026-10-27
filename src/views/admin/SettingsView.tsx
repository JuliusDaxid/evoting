import React, { useState } from 'react';
import { dbService } from '../../services/dbService';
import { Settings } from '../../types';
import {
  getActiveSupabaseConfig,
  saveSupabaseConfig,
  resetSupabaseConfigToDefault,
  testSupabaseConnection,
  cleanSupabaseUrl,
  DEFAULT_SUPABASE_URL,
} from '../../lib/supabase';
import { EosisLogo, OFFICIAL_EOSIS_LOGO_SVG } from '../../components/EosisLogo';

interface Props {
  settings: Settings;
  onUpdateSettings: (newSettings: Settings) => void;
  onOpenSupabaseGuide: () => void;
  supabaseStatus: { isConnected: boolean; tablesFound: boolean; message: string };
  onRefreshSupabaseStatus: () => void;
}

export const SettingsView: React.FC<Props> = ({
  settings,
  onUpdateSettings,
  onOpenSupabaseGuide,
  supabaseStatus,
  onRefreshSupabaseStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'account' | 'supabase'>('general');

  // General settings state
  const [schoolName, setSchoolName] = useState(settings.school_name || 'SMP Negeri 1 Dayun');
  const [schoolLogo, setSchoolLogo] = useState(settings.school_logo || '');
  const [electionPeriod, setElectionPeriod] = useState(settings.election_period || 'Masa Bakti 2026/2027');
  const [isElectionActive, setIsElectionActive] = useState(settings.is_election_active !== false);

  // Admin account state
  const [adminUsername, setAdminUsername] = useState(settings.admin_username || 'admin');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Database Configuration State (Direct UI management)
  const initialDbConfig = getActiveSupabaseConfig();
  const [dbUrl, setDbUrl] = useState(initialDbConfig.url);
  const [dbAnonKey, setDbAnonKey] = useState(initialDbConfig.anonKey);
  const [isCustomDb, setIsCustomDb] = useState(initialDbConfig.isCustom);
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    cleanedUrl: string;
    tablesFound: boolean;
    details?: string;
  } | null>(null);
  const [savingDb, setSavingDb] = useState(false);
  const [dbToast, setDbToast] = useState<{ text: string; isError: boolean } | null>(null);

  // Status indicators
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSchoolLogo(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const updated = await dbService.updateSettings({
        school_name: schoolName.trim(),
        school_logo: schoolLogo.trim(),
        election_period: electionPeriod.trim(),
        is_election_active: isElectionActive,
      });
      onUpdateSettings(updated);
      setStatusMessage({ text: 'Pengaturan sekolah dan periode berhasil disimpan!', isError: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan pengaturan';
      setStatusMessage({ text: msg, isError: true });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    if (oldPassword !== settings.admin_password_hash) {
      setStatusMessage({ text: 'Password lama Anda tidak cocok.', isError: true });
      setSaving(false);
      return;
    }

    if (!newPassword.trim()) {
      setStatusMessage({ text: 'Password baru tidak boleh kosong.', isError: true });
      setSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMessage({ text: 'Konfirmasi password baru tidak cocok.', isError: true });
      setSaving(false);
      return;
    }

    try {
      const updated = await dbService.updateSettings({
        admin_username: adminUsername.trim(),
        admin_password_hash: newPassword.trim(),
      });
      onUpdateSettings(updated);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatusMessage({ text: 'Kredensial login administrator berhasil diperbarui!', isError: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui akun';
      setStatusMessage({ text: msg, isError: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
          <i className="bi bi-gear-fill text-blue-600"></i>
          <span>Pengaturan Aplikasi eOSIS</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Atur identitas sekolah, logo, masa bakti periode pemilihan, akun keamanan, dan konfigurasi database Supabase.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            statusMessage.isError
              ? 'bg-rose-50 border border-rose-200 text-rose-700'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          <i className={`bi ${statusMessage.isError ? 'bi-x-circle-fill text-rose-600' : 'bi-check-circle-fill text-emerald-600'} text-base`}></i>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex p-1.5 bg-slate-200/60 rounded-2xl max-w-xl">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'general' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <i className="bi bi-sliders"></i>
          <span>Identitas &amp; Periode</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'account' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <i className="bi bi-person-lock"></i>
          <span>Akun Admin</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('supabase')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'supabase' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <i className="bi bi-database-check"></i>
          <span>Database Supabase</span>
        </button>
      </div>

      {/* TAB 1: IDENTITAS SEKOLAH & PERIODE */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <i className="bi bi-mortarboard-fill text-blue-600"></i>
              <span>Profil Sekolah &amp; Status Pemilihan</span>
            </h3>

            {/* School Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Sekolah <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Contoh: SMP Negeri 1 Dayun"
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Nama sekolah akan otomatis tampil di navbar, halaman login siswa, dan Berita Acara.
              </span>
            </div>

            {/* Election Period */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Periode Pemilihan OSIS <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={electionPeriod}
                onChange={(e) => setElectionPeriod(e.target.value)}
                placeholder="Contoh: Masa Bakti 2026/2027"
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Logo Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Logo Sekolah / eOSIS (Upload File atau URL)</span>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <i className="bi bi-shield-check"></i> Selalu Tampil (Auto Fallback)
                </span>
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 p-1.5 shadow-xs">
                  <EosisLogo logoUrl={schoolLogo} size="xl" alt="Preview Logo" />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={schoolLogo}
                      onChange={(e) => setSchoolLogo(e.target.value)}
                      placeholder="https://... URL logo (atau klik upload)"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />
                    <label className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl cursor-pointer text-xs font-bold flex items-center gap-1.5 transition">
                      <i className="bi bi-upload"></i>
                      <span>Upload File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSchoolLogo(OFFICIAL_EOSIS_LOGO_SVG)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      <i className="bi bi-patch-check-fill text-blue-600"></i>
                      <span>Gunakan Logo Resmi eOSIS</span>
                    </button>
                    <span className="text-[11px] text-slate-400">
                      Format didukung: PNG, JPG, SVG, WebP, atau Base64.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Pemilihan Switch */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 text-xs block">
                  Status Buka / Tutup Pemilihan
                </span>
                <span className="text-[11px] text-slate-500">
                  Jika ditutup, siswa tidak dapat menekan tombol Berikan Suara di Bilik Suara.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isElectionActive}
                  onChange={(e) => setIsElectionActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: AKUN ADMIN */}
      {activeTab === 'account' && (
        <form onSubmit={handleSaveAccount} className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-5 max-w-xl">
          <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
            <i className="bi bi-shield-lock-fill text-indigo-600"></i>
            <span>Ganti Kredensial Administrator</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Username Admin
            </label>
            <input
              type="text"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password Lama
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Masukkan password saat ini"
              required
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password Baru
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Ulangi Password Baru
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Konfirmasi password baru"
              required
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50"
            >
              {saving ? 'Memperbarui...' : 'Perbarui Kredensial'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: KONFIGURASI DATABASE SUPABASE */}
      {activeTab === 'supabase' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold mb-1.5">
                <i className="bi bi-hdd-network"></i>
                <span>Pengaturan Cloud Database</span>
              </div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <i className="bi bi-database-gear text-blue-600"></i>
                <span>Konfigurasi Database Supabase</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola API URL dan Anon Key Supabase secara langsung tanpa mengubah kode sumber.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onRefreshSupabaseStatus}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <i className="bi bi-arrow-repeat"></i>
                <span>Cek Status</span>
              </button>
              <button
                type="button"
                onClick={onOpenSupabaseGuide}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <i className="bi bi-file-earmark-code"></i>
                <span>Skrip SQL</span>
              </button>
            </div>
          </div>

          {/* Database Toast Alert */}
          {dbToast && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-2.5 animate-fadeIn ${
                dbToast.isError
                  ? 'bg-rose-50 border border-rose-200 text-rose-700'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              <i
                className={`bi ${
                  dbToast.isError ? 'bi-exclamation-triangle-fill text-rose-600' : 'bi-check-circle-fill text-emerald-600'
                } text-lg shrink-0 mt-0.5`}
              ></i>
              <div className="flex-1">
                <span className="font-bold block">{dbToast.isError ? 'Terjadi Kesalahan:' : 'Berhasil:'}</span>
                <span className="leading-relaxed">{dbToast.text}</span>
              </div>
            </div>
          )}

          {/* Active Connection Status Overview */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Status Database:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    supabaseStatus.tablesFound
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : supabaseStatus.isConnected
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      supabaseStatus.tablesFound
                        ? 'bg-emerald-500 animate-pulse'
                        : supabaseStatus.isConnected
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  ></span>
                  <span>
                    {supabaseStatus.tablesFound
                      ? 'Aktif & Tabel Lengkap'
                      : supabaseStatus.isConnected
                      ? 'Terkoneksi (Perlu Migrasi SQL)'
                      : 'Koneksi Terputus / Offline'}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Sumber Kredensial:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                    isCustomDb
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  {isCustomDb ? 'Kustom (Admin)' : 'Default Bawaan'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-xs">
              <span className="text-slate-500">Endpoint Aktif:</span>
              <code className="font-mono text-xs text-blue-700 bg-white px-2.5 py-1 rounded border border-slate-200 truncate max-w-full">
                {cleanSupabaseUrl(dbUrl) || DEFAULT_SUPABASE_URL}
              </code>
            </div>

            <p className="text-xs text-slate-600 pt-1 leading-relaxed">
              {supabaseStatus.message}
            </p>
          </div>

          {/* Configuration Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSavingDb(true);
              setDbToast(null);
              setTestResult(null);

              const res = saveSupabaseConfig(dbUrl, dbAnonKey);
              if (!res.success) {
                setDbToast({ text: res.error || 'Gagal menyimpan konfigurasi.', isError: true });
                setSavingDb(false);
                return;
              }

              setDbUrl(res.cleanedUrl);
              setIsCustomDb(true);
              setDbToast({
                text: `Konfigurasi Supabase berhasil disimpan! Endpoint dibersihkan menjadi ${res.cleanedUrl} dan koneksi langsung aktif.`,
                isError: false,
              });
              setSavingDb(false);
              onRefreshSupabaseStatus();
            }}
            className="space-y-5"
          >
            {/* Input API URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>
                  Supabase API URL (Project URL) <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">Contoh: https://xyz.supabase.co</span>
              </label>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <i className="bi bi-link-45deg text-lg"></i>
                </span>
                <input
                  type="text"
                  value={dbUrl}
                  onChange={(e) => {
                    setDbUrl(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="https://your-project-id.supabase.co"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Automatic URL Cleaning Notice */}
              {dbUrl.toLowerCase().includes('/rest/v1') && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                  <i className="bi bi-scissors text-amber-600 text-base shrink-0"></i>
                  <div>
                    <span className="font-bold">Pembersihan Otomatis:</span> Terdeteksi akhiran <code>/rest/v1/</code>. Saat disimpan, sistem akan otomatis membersihkannya menjadi: <strong>{cleanSupabaseUrl(dbUrl)}</strong>
                  </div>
                </div>
              )}

              <span className="text-[11px] text-slate-400 mt-1 block">
                Anda dapat menyalin URL langsung dari Project Settings &gt; API di Supabase. Sistem secara otomatis memotong akhiran <code>/rest/v1/</code> jika ada.
              </span>
            </div>

            {/* Input Anon Key */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Supabase Anon (Public) Key <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAnonKey(!showAnonKey)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <i className={`bi ${showAnonKey ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  <span>{showAnonKey ? 'Sembunyikan Kunci' : 'Tampilkan Kunci'}</span>
                </button>
              </div>

              <div className="relative">
                {showAnonKey ? (
                  <textarea
                    rows={3}
                    value={dbAnonKey}
                    onChange={(e) => {
                      setDbAnonKey(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    required
                    className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                ) : (
                  <input
                    type="password"
                    value={dbAnonKey}
                    onChange={(e) => {
                      setDbAnonKey(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    required
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                )}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Anon key aman untuk sisi klien dan digunakan untuk mengamankan data pemilih melalui Row Level Security (RLS).
              </span>
            </div>

            {/* Live Test Connection Result Box */}
            {testResult && (
              <div
                className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 animate-fadeIn ${
                  testResult.success
                    ? testResult.tablesFound
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                      : 'bg-amber-50 border border-amber-300 text-amber-800'
                    : 'bg-rose-50 border border-rose-300 text-rose-800'
                }`}
              >
                <i
                  className={`bi ${
                    testResult.success
                      ? testResult.tablesFound
                        ? 'bi-check-circle-fill text-emerald-600'
                        : 'bi-exclamation-triangle-fill text-amber-600'
                      : 'bi-x-circle-fill text-rose-600'
                  } text-xl shrink-0 mt-0.5`}
                ></i>
                <div className="space-y-1">
                  <span className="font-extrabold text-sm block">
                    {testResult.success
                      ? testResult.tablesFound
                        ? 'Koneksi Berhasil & Database Siap!'
                        : 'Koneksi Berhasil, Perlu Setup Tabel'
                      : 'Koneksi Gagal / Kredensial Salah'}
                  </span>
                  <p className="leading-relaxed">{testResult.message}</p>
                  {testResult.cleanedUrl && (
                    <p className="text-[11px] opacity-90">
                      Endpoint yang diuji: <code className="font-mono bg-white/60 px-1 py-0.5 rounded">{testResult.cleanedUrl}</code>
                    </p>
                  )}
                  {testResult.success && !testResult.tablesFound && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={onOpenSupabaseGuide}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5"
                      >
                        <i className="bi bi-terminal"></i>
                        <span>Buka &amp; Jalankan Skrip SQL</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Uji Koneksi */}
                <button
                  type="button"
                  disabled={testingConnection || savingDb}
                  onClick={async () => {
                    setTestingConnection(true);
                    setTestResult(null);
                    setDbToast(null);

                    try {
                      const res = await testSupabaseConnection(dbUrl, dbAnonKey);
                      setTestResult(res);
                    } catch (e: unknown) {
                      const msg = e instanceof Error ? e.message : 'Uji koneksi gagal';
                      setTestResult({
                        success: false,
                        cleanedUrl: cleanSupabaseUrl(dbUrl),
                        tablesFound: false,
                        message: msg,
                      });
                    } finally {
                      setTestingConnection(false);
                    }
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {testingConnection ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin text-blue-600"></i>
                      <span>Menguji Endpoint...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-broadcast"></i>
                      <span>Uji Koneksi</span>
                    </>
                  )}
                </button>

                {/* Reset ke Default */}
                {isCustomDb && (
                  <button
                    type="button"
                    disabled={savingDb}
                    onClick={() => {
                      if (window.confirm('Apakah Anda yakin ingin mengembalikan konfigurasi Supabase ke default bawaan sistem?')) {
                        const def = resetSupabaseConfigToDefault();
                        setDbUrl(def.url);
                        setDbAnonKey(def.anonKey);
                        setIsCustomDb(false);
                        setTestResult(null);
                        setDbToast({
                          text: 'Konfigurasi database telah dikembalikan ke pengaturan default bawaan.',
                          isError: false,
                        });
                        onRefreshSupabaseStatus();
                      }
                    }}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="bi bi-arrow-counterclockwise"></i>
                    <span>Reset ke Default</span>
                  </button>
                )}
              </div>

              {/* Simpan & Terapkan */}
              <button
                type="submit"
                disabled={savingDb || testingConnection}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {savingDb ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin"></i>
                    <span>Menyimpan &amp; Memperbarui...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle text-sm"></i>
                    <span>Simpan &amp; Terapkan Konfigurasi</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Architecture Summary */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-slate-800 block flex items-center gap-1.5">
              <i className="bi bi-shield-lock-fill text-emerald-600"></i>
              <span>Keamanan Hak Suara &amp; Validasi Database:</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li>
                <strong>Verifikasi NISN Mandiri:</strong> Siswa hanya perlu memasukkan nomor NISN. Sistem memvalidasi apakah siswa terdaftar di DPT dan memeriksa kolom <code className="font-mono bg-slate-200 px-1 rounded">has_voted</code> secara ketat sebelum mengizinkan voting.
              </li>
              <li>
                <strong>Supabase RPC <code className="font-mono bg-slate-200 px-1 rounded">cast_vote(p_nisn, p_candidate_id)</code>:</strong> Menjamin satu siswa hanya dapat memberikan satu suara dengan penguncian baris tingkat database (<code className="font-mono">FOR UPDATE</code>), mencegah double vote dan manipulasi refresh.
              </li>
              <li>
                <strong>Pembersihan URL Otomatis:</strong> Anda tidak perlu khawatir salah menyalin URL REST. Format URL dibersihkan dari <code>/rest/v1/</code> secara otomatis sehingga client Supabase selalu terhubung secara optimal.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
