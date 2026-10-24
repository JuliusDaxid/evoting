import React, { useState } from 'react';
import { dbService } from '../../services/dbService';
import { Settings } from '../../types';

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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Logo Sekolah (URL atau Upload File)
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                  {schoolLogo ? (
                    <img src={schoolLogo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <i className="bi bi-image text-slate-400 text-2xl"></i>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={schoolLogo}
                      onChange={(e) => setSchoolLogo(e.target.value)}
                      placeholder="https://... URL gambar logo sekolah"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />
                    <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer text-xs font-bold flex items-center gap-1.5">
                      <i className="bi bi-upload"></i>
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
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

      {/* TAB 3: SUPABASE & DATABASE STATUS */}
      {activeTab === 'supabase' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <i className="bi bi-database-fill-check text-blue-600"></i>
                <span>Status &amp; Konfigurasi Supabase</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Penyimpanan cloud, Row Level Security (RLS), dan RPC Atomic Transaction
              </p>
            </div>

            <button
              type="button"
              onClick={onRefreshSupabaseStatus}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              <i className="bi bi-arrow-repeat"></i>
              <span>Cek Koneksi Ulang</span>
            </button>
          </div>

          {/* Connection Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Project Endpoint:</span>
              <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                uyyagxxaamnschocajpe.supabase.co
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Status Tabel &amp; Schema Cache:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  supabaseStatus.tablesFound
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}
              >
                <i className={`bi ${supabaseStatus.tablesFound ? 'bi-check2-circle' : 'bi-exclamation-circle'}`}></i>
                {supabaseStatus.tablesFound ? 'Tabel Ditemukan & Siap Digunakan' : 'Tabel Belum Dibuat di Supabase'}
              </span>
            </div>

            <p className="text-xs text-slate-600 pt-1">
              {supabaseStatus.message}
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onOpenSupabaseGuide}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <i className="bi bi-file-earmark-code"></i>
              <span>Buka Skrip SQL &amp; Panduan Migrasi</span>
            </button>
          </div>

          {/* Security Architecture Summary */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-slate-800 block flex items-center gap-1.5">
              <i className="bi bi-shield-lock text-emerald-600"></i>
              <span>Mekanisme Keamanan Satu Siswa = Satu Suara</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li>
                <strong>Supabase RPC <code className="font-mono bg-slate-200 px-1 rounded">cast_vote()</code>:</strong> Memverifikasi NISN dan Tanggal Lahir langsung di level database PostgreSQL dengan baris terkunci (<code className="font-mono">FOR UPDATE</code>), mencegah refresh, double tab, atau manipulasi browser.
              </li>
              <li>
                <strong>Asas Rahasia (LUBER):</strong> Suara kandidat diincrement secara anonim; kolom <code className="font-mono">students</code> hanya mencatat <code className="font-mono">has_voted = true</code> dan waktu, tanpa mengaitkan pilihan pasangan calon dengan identitas siswa.
              </li>
              <li>
                <strong>Row Level Security (RLS):</strong> Mencegah akses data ilegal dan manipulasi DPT siswa.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
