import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { ChangelogItem, CreditsInfo, Settings } from '../../types';
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
  isSuperAdmin?: boolean;
  currentAdminUsername?: string;
}

export const SettingsView: React.FC<Props> = ({
  settings,
  onUpdateSettings,
  onOpenSupabaseGuide,
  supabaseStatus,
  onRefreshSupabaseStatus,
  isSuperAdmin = false,
  currentAdminUsername = 'admin',
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'account' | 'supabase' | 'changelog' | 'credits'>('general');

  // Can this user edit changelog and credits? Exclusive for username Albi2012 or isSuperAdmin
  const canEditChangelogAndCredits = isSuperAdmin || currentAdminUsername === 'Albi2012';

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

  // Changelog & Credits state
  const [changelogs, setChangelogs] = useState<ChangelogItem[]>([]);
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Changelog modal & action states
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [editingChangelog, setEditingChangelog] = useState<ChangelogItem | null>(null);
  const [changelogToDelete, setChangelogToDelete] = useState<ChangelogItem | null>(null);

  const [clVersion, setClVersion] = useState('');
  const [clDate, setClDate] = useState(new Date().toISOString().split('T')[0]);
  const [clTitle, setClTitle] = useState('');
  const [clType, setClType] = useState<'major' | 'feature' | 'improvement' | 'fix'>('feature');
  const [clSummary, setClSummary] = useState('');
  const [clChangesText, setClChangesText] = useState('');

  // Credits edit state
  const [isEditingCredits, setIsEditingCredits] = useState(false);
  const [creditDevName, setCreditDevName] = useState('');
  const [creditLeadRole, setCreditLeadRole] = useState('');
  const [creditInstitution, setCreditInstitution] = useState('');
  const [creditSupervisor, setCreditSupervisor] = useState('');
  const [creditContact, setCreditContact] = useState('');
  const [creditNotes, setCreditNotes] = useState('');
  const [creditAck, setCreditAck] = useState('');

  useEffect(() => {
    loadChangelogAndCredits();
  }, []);

  const loadChangelogAndCredits = async () => {
    setLoadingMeta(true);
    try {
      const [cls, crd] = await Promise.all([
        dbService.getChangelog(),
        dbService.getCredits(),
      ]);
      setChangelogs(cls);
      setCredits(crd);
      if (crd) {
        setCreditDevName(crd.developer_name);
        setCreditLeadRole(crd.lead_role);
        setCreditInstitution(crd.institution);
        setCreditSupervisor(crd.supervisor);
        setCreditContact(crd.contact_email);
        setCreditNotes(crd.special_notes);
        setCreditAck(crd.acknowledgments);
      }
    } catch (e) {
      console.warn('Failed to load changelog and credits', e);
    } finally {
      setLoadingMeta(false);
    }
  };

  const openAddChangelogModal = () => {
    setEditingChangelog(null);
    setClVersion('');
    setClDate(new Date().toISOString().split('T')[0]);
    setClTitle('');
    setClType('feature');
    setClSummary('');
    setClChangesText('');
    setIsChangelogModalOpen(true);
  };

  const openEditChangelogModal = (item: ChangelogItem) => {
    setEditingChangelog(item);
    setClVersion(item.version);
    setClDate(item.release_date);
    setClTitle(item.title);
    setClType(item.type);
    setClSummary(item.summary);
    setClChangesText(item.changes ? item.changes.join('\n') : '');
    setIsChangelogModalOpen(true);
  };

  const handleSaveChangelog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditChangelogAndCredits) return;
    try {
      const changesArr = clChangesText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (editingChangelog) {
        // Mode Edit Changelog yang sudah ada
        const updated = await dbService.updateChangelogItem(editingChangelog.id, {
          version: clVersion.trim(),
          release_date: clDate,
          title: clTitle.trim(),
          type: clType,
          summary: clSummary.trim(),
          changes: changesArr,
        });

        setChangelogs(changelogs.map(c => (c.id === editingChangelog.id ? updated : c)));
        setIsChangelogModalOpen(false);
        setEditingChangelog(null);
        setStatusMessage({ text: `Riwayat versi ${updated.version} berhasil diperbarui!`, isError: false });
      } else {
        // Mode Tambah Changelog Baru
        const newItem = await dbService.addChangelogItem({
          version: clVersion.trim(),
          release_date: clDate,
          title: clTitle.trim(),
          type: clType,
          summary: clSummary.trim(),
          changes: changesArr,
          author: currentAdminUsername || 'Albi2012',
        });

        setChangelogs([newItem, ...changelogs]);
        setIsChangelogModalOpen(false);
        setStatusMessage({ text: `Riwayat versi ${newItem.version} berhasil ditambahkan!`, isError: false });
      }

      setClVersion('');
      setClTitle('');
      setClSummary('');
      setClChangesText('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan catatan changelog';
      setStatusMessage({ text: msg, isError: true });
    }
  };

  const handleConfirmDeleteChangelog = async () => {
    if (!changelogToDelete || !canEditChangelogAndCredits) return;
    try {
      await dbService.deleteChangelogItem(changelogToDelete.id);
      setChangelogs(changelogs.filter(c => c.id !== changelogToDelete.id));
      const deletedVer = changelogToDelete.version;
      setChangelogToDelete(null);
      setStatusMessage({ text: `Riwayat versi ${deletedVer} berhasil dihapus.`, isError: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal menghapus changelog';
      setStatusMessage({ text: msg, isError: true });
    }
  };

  const handleSaveCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditChangelogAndCredits) return;
    try {
      const updated = await dbService.updateCredits({
        developer_name: creditDevName.trim(),
        lead_role: creditLeadRole.trim(),
        institution: creditInstitution.trim(),
        supervisor: creditSupervisor.trim(),
        contact_email: creditContact.trim(),
        special_notes: creditNotes.trim(),
        acknowledgments: creditAck.trim(),
      });
      setCredits(updated);
      setIsEditingCredits(false);
      setStatusMessage({ text: 'Informasi pengembang & credits berhasil diperbarui!', isError: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui credits';
      setStatusMessage({ text: msg, isError: true });
    }
  };

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUploadSuccess, setLogoUploadSuccess] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setStatusMessage({ text: 'Ukuran berkas logo maksimal 10 MB.', isError: true });
      return;
    }

    setUploadingLogo(true);
    setLogoUploadSuccess(null);
    setStatusMessage(null);

    try {
      const res = await dbService.uploadSchoolLogo(file);
      if (res.success && res.publicUrl) {
        setSchoolLogo(res.publicUrl);
        setLogoUploadSuccess('Logo berhasil diunggah langsung ke Supabase Storage (bucket: assets)!');
        setStatusMessage({ text: 'Logo sekolah berhasil diunggah ke Supabase Storage (bucket: assets)!', isError: false });
      } else {
        throw new Error(res.error || 'Gagal mengunggah logo ke Supabase Storage');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah logo ke cloud storage';
      setStatusMessage({ text: msg, isError: true });
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
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
      <div className="flex flex-wrap p-1.5 bg-slate-200/70 rounded-2xl gap-1 max-w-4xl">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'general' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <i className="bi bi-sliders"></i>
          <span>Identitas &amp; Periode</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'account' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <i className="bi bi-person-lock"></i>
          <span>Akun Admin</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('supabase')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'supabase' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <i className="bi bi-database-check"></i>
          <span>Database Supabase</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('changelog')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'changelog' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <i className="bi bi-clock-history"></i>
          <span>Riwayat Versi (Changelog)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('credits')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'credits' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <i className="bi bi-code-slash"></i>
          <span>Credits Pengembang</span>
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
                <span>Logo Sekolah / eOSIS</span>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
                  <i className="bi bi-cloud-arrow-up-fill me-1"></i>
                  Supabase Storage: bucket <code>assets</code>
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
                      placeholder="https://... URL logo (atau unggah berkas ke cloud)"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />
                    <label className={`px-3.5 py-2 ${uploadingLogo ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'} border border-blue-200 rounded-xl cursor-pointer text-xs font-bold flex items-center gap-1.5 transition shrink-0`}>
                      {uploadingLogo ? (
                        <>
                          <i className="bi bi-arrow-repeat animate-spin text-blue-600"></i>
                          <span>Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-cloud-upload"></i>
                          <span>Upload File</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingLogo}
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {logoUploadSuccess && (
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <i className="bi bi-check-circle-fill"></i>
                      <span>{logoUploadSuccess}</span>
                    </p>
                  )}

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

      {/* TAB 4: RIWAYAT VERSI (CHANGELOG) */}
      {activeTab === 'changelog' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <i className="bi bi-clock-history text-blue-600"></i>
                <span>Riwayat Pembaruan Sistem (Changelog)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Catatan komprehensif riwayat versi, penambahan fitur, dan peningkatan performa sistem eOSIS.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canEditChangelogAndCredits ? (
                <button
                  type="button"
                  onClick={openAddChangelogModal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="bi bi-plus-circle"></i>
                  <span>Tambah Catatan Versi</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[11px] font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5">
                  <i className="bi bi-lock-fill text-slate-400"></i>
                  <span>Read-Only • Khusus Albi2012</span>
                </div>
              )}
            </div>
          </div>

          {canEditChangelogAndCredits && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2 text-xs text-purple-900">
              <i className="bi bi-shield-check text-purple-600 shrink-0 text-base"></i>
              <span>
                <strong>Akses Editor Aktif:</strong> Anda login sebagai akun <strong>{currentAdminUsername}</strong> dan memiliki wewenang untuk menambah serta mengelola riwayat versi.
              </span>
            </div>
          )}

          {/* Changelog Timeline */}
          {loadingMeta ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Memuat riwayat versi...
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
              {changelogs.map((item) => {
                const badgeColor =
                  item.type === 'major'
                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                    : item.type === 'feature'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : item.type === 'improvement'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200';

                return (
                  <div key={item.id} className="relative pl-8 space-y-2 group">
                    {/* Timeline bullet */}
                    <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-white border-4 border-blue-600 shadow-xs"></div>

                    <div className="p-5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200 transition space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-extrabold text-sm text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                            {item.version}
                          </span>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColor}`}>
                            {item.type}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {item.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{item.release_date}</span>
                          {item.author && (
                            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                              by {item.author}
                            </span>
                          )}
                          {canEditChangelogAndCredits && (
                            <div className="flex items-center gap-1.5 ml-2">
                              <button
                                type="button"
                                onClick={() => openEditChangelogModal(item)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Edit catatan versi ini"
                              >
                                <i className="bi bi-pencil-square"></i>
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setChangelogToDelete(item)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Hapus catatan versi ini"
                              >
                                <i className="bi bi-trash-fill"></i>
                                <span>Hapus</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {item.summary}
                      </p>

                      {item.changes && item.changes.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <ul className="space-y-1.5 text-xs text-slate-600">
                            {item.changes.map((change, cIdx) => (
                              <li key={cIdx} className="flex items-start gap-2">
                                <i className="bi bi-check-circle-fill text-blue-600 text-[11px] shrink-0 mt-0.5"></i>
                                <span className="leading-snug">{change}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ADD / EDIT CHANGELOG MODAL */}
          {isChangelogModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-scale-up">
                <form onSubmit={handleSaveChangelog}>
                  <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
                    <h4 className="font-extrabold text-sm flex items-center gap-2">
                      <i className={`bi ${editingChangelog ? 'bi-pencil-square' : 'bi-plus-circle'}`}></i>
                      <span>{editingChangelog ? `Edit Catatan Versi (${editingChangelog.version})` : 'Tambah Catatan Versi Baru'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangelogModalOpen(false);
                        setEditingChangelog(null);
                      }}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                    >
                      <i className="bi bi-x-lg text-xs"></i>
                    </button>
                  </div>

                  <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Nomor Versi *</label>
                        <input
                          type="text"
                          required
                          value={clVersion}
                          onChange={(e) => setClVersion(e.target.value)}
                          placeholder="Contoh: v3.0"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Tanggal Rilis *</label>
                        <input
                          type="date"
                          required
                          value={clDate}
                          onChange={(e) => setClDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Tipe Pembaruan</label>
                        <select
                          value={clType}
                          onChange={(e) => setClType(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                        >
                          <option value="major">Major (Pembaruan Besar)</option>
                          <option value="feature">Feature (Fitur Baru)</option>
                          <option value="improvement">Improvement (Peningkatan)</option>
                          <option value="fix">Fix (Perbaikan Bug)</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Judul Rilis *</label>
                        <input
                          type="text"
                          required
                          value={clTitle}
                          onChange={(e) => setClTitle(e.target.value)}
                          placeholder="Contoh: Bilik Suara Presisi & Changelog"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Ringkasan Pembaruan *</label>
                      <textarea
                        required
                        rows={2}
                        value={clSummary}
                        onChange={(e) => setClSummary(e.target.value)}
                        placeholder="Deskripsi singkat mengenai versi ini..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Daftar Perubahan (Satu baris per poin) *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={clChangesText}
                        onChange={(e) => setClChangesText(e.target.value)}
                        placeholder="Bilik suara paslon ditampilkan 1 baris penuh&#10;Audit coblosan siswa untuk super admin&#10;Optimasi responsivitas mobile"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangelogModalOpen(false);
                        setEditingChangelog(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md cursor-pointer"
                    >
                      {editingChangelog ? 'Simpan Perubahan Versi' : 'Simpan Catatan Versi'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* DELETE CHANGELOG CONFIRMATION MODAL (Non-blocking Dialog) */}
          {changelogToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-scale-up">
                <div className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-3xl shadow-inner">
                    <i className="bi bi-trash3-fill"></i>
                  </div>

                  <div>
                    <h4 className="text-lg font-extrabold text-slate-800">
                      Hapus Catatan Versi?
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Apakah Anda yakin ingin menghapus catatan rilis{' '}
                      <strong className="text-slate-800 font-bold">{changelogToDelete.version} - {changelogToDelete.title}</strong>?
                    </p>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-xs text-rose-800 flex items-start gap-2">
                    <i className="bi bi-exclamation-triangle-fill text-rose-600 shrink-0 mt-0.5"></i>
                    <p className="text-[11px] leading-relaxed">
                      Data riwayat pembaruan ini akan dihapus secara permanen dari sistem eOSIS.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setChangelogToDelete(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteChangelog}
                    className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="bi bi-trash-fill"></i>
                    <span>Ya, Hapus Versi</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CREDITS PENGEMBANG */}
      {activeTab === 'credits' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <i className="bi bi-code-slash text-blue-600"></i>
                <span>Credits &amp; Informasi Pengembang</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Informasi resmi perancang, pengembang sistem, dan pembina eOSIS SMP Negeri 1 Dayun.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canEditChangelogAndCredits ? (
                <button
                  type="button"
                  onClick={() => setIsEditingCredits(!isEditingCredits)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                    isEditingCredits
                      ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                  }`}
                >
                  <i className={`bi ${isEditingCredits ? 'bi-x-lg' : 'bi-pencil-square'}`}></i>
                  <span>{isEditingCredits ? 'Batal Edit' : 'Edit Informasi Credits'}</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[11px] font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5">
                  <i className="bi bi-lock-fill text-slate-400"></i>
                  <span>Read-Only • Khusus Albi2012</span>
                </div>
              )}
            </div>
          </div>

          {canEditChangelogAndCredits && !isEditingCredits && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2 text-xs text-purple-900">
              <i className="bi bi-shield-check text-purple-600 shrink-0 text-base"></i>
              <span>
                <strong>Super Admin Hak Penuh:</strong> Anda dapat mengedit profil pengembang, peran, dan catatan khusus sistem ini kapan saja.
              </span>
            </div>
          )}

          {isEditingCredits ? (
            /* EDIT FORM */
            <form onSubmit={handleSaveCredits} className="space-y-4 max-w-2xl text-xs">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Pengembang *</label>
                  <input
                    type="text"
                    required
                    value={creditDevName}
                    onChange={(e) => setCreditDevName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Peran Utama *</label>
                  <input
                    type="text"
                    required
                    value={creditLeadRole}
                    onChange={(e) => setCreditLeadRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Asal Sekolah / Lembaga *</label>
                  <input
                    type="text"
                    required
                    value={creditInstitution}
                    onChange={(e) => setCreditInstitution(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Guru Pembina / Pembimbing *</label>
                  <input
                    type="text"
                    required
                    value={creditSupervisor}
                    onChange={(e) => setCreditSupervisor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kontak Email Pengembang</label>
                <input
                  type="email"
                  value={creditContact}
                  onChange={(e) => setCreditContact(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ucapan Terima Kasih (Acknowledgments)</label>
                <textarea
                  rows={3}
                  value={creditAck}
                  onChange={(e) => setCreditAck(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Khusus Sistem</label>
                <textarea
                  rows={3}
                  value={creditNotes}
                  onChange={(e) => setCreditNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingCredits(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition shadow-md cursor-pointer"
                >
                  Simpan Perubahan Credits
                </button>
              </div>
            </form>
          ) : credits ? (
            /* VIEW CREDITS CARD */
            <div className="space-y-6">
              <div className="grid md:grid-cols-12 gap-6 items-stretch">
                {/* Developer Profile Card */}
                <div className="md:col-span-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white p-6 sm:p-7 rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-lg">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="relative z-10 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-[10px] font-bold text-amber-300">
                      <i className="bi bi-star-fill text-amber-400"></i>
                      <span>Creator &amp; Lead Architect</span>
                    </div>

                    <div>
                      <h4 className="text-2xl font-black tracking-tight text-white">
                        {credits.developer_name}
                      </h4>
                      <p className="text-xs text-blue-200 font-semibold mt-0.5">
                        {credits.lead_role}
                      </p>
                      <p className="text-xs text-slate-300 mt-1">
                        {credits.institution}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/15 space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-200">
                        <i className="bi bi-person-badge text-blue-300"></i>
                        <span>Pembimbing: {credits.supervisor}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-200">
                        <i className="bi bi-envelope text-blue-300"></i>
                        <span className="font-mono text-[11px]">{credits.contact_email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 pt-6 mt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-slate-300">
                    <span className="font-mono">{credits.version_code}</span>
                    <span>Tahun {credits.release_year}</span>
                  </div>
                </div>

                {/* System & Architecture Stack */}
                <div className="md:col-span-7 space-y-4 flex flex-col justify-between">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <h5 className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                      <i className="bi bi-cpu-fill text-blue-600"></i>
                      <span>Teknologi &amp; Framework Pendukung</span>
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {credits.tech_stack.map((tech, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2.5 py-1 bg-white text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 shadow-2xs"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-2 text-xs">
                    <span className="font-extrabold text-blue-900 block flex items-center gap-1.5">
                      <i className="bi bi-chat-quote-fill text-blue-600"></i>
                      <span>Ucapan Terima Kasih:</span>
                    </span>
                    <p className="text-slate-700 leading-relaxed italic">
                      &ldquo;{credits.acknowledgments}&rdquo;
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <span className="font-extrabold text-slate-800 block flex items-center gap-1.5">
                      <i className="bi bi-info-circle-fill text-indigo-600"></i>
                      <span>Catatan Khusus Sistem:</span>
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      {credits.special_notes}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-slate-400">
              Data credits belum tersedia.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
