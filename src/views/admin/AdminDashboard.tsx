import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../../services/dbService';
import { supabase } from '../../lib/supabase';
import { Candidate, ClassItem, OsisDocument, OsisMeeting, OsisMember, OsisProgram, Settings, Student } from '../../types';
import { AdminMenuKey } from '../../components/AdminSidebar';

interface Props {
  settings: Settings;
  onNavigate: (menu: AdminMenuKey) => void;
  onOpenSupabaseGuide: () => void;
  supabaseStatus: { isConnected: boolean; tablesFound: boolean };
}

export const AdminDashboard: React.FC<Props> = ({
  settings,
  onNavigate,
  onOpenSupabaseGuide,
  supabaseStatus,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [members, setMembers] = useState<OsisMember[]>([]);
  const [programs, setPrograms] = useState<OsisProgram[]>([]);
  const [meetings, setMeetings] = useState<OsisMeeting[]>([]);
  const [documents, setDocuments] = useState<OsisDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    loadDashboardData();

    // Silent background updater
    const silentUpdate = async () => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      try {
        const [stList, cdList] = await Promise.all([
          dbService.getStudents(),
          dbService.getCandidates(),
        ]);
        setStudents(stList);
        setCandidates(cdList);
      } catch (e) {
        console.warn('Dashboard silent update error:', e);
      } finally {
        isRefreshingRef.current = false;
      }
    };

    // 1. Supabase Realtime Subscription
    let channel: any = null;
    if (supabase) {
      try {
        channel = supabase
          .channel(`dashboard_realtime_${Math.random().toString(36).substring(2, 7)}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'candidates' },
            () => {
              silentUpdate();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'students' },
            () => {
              silentUpdate();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase realtime init warning in dashboard:', err);
      }
    }

    // 2. Local vote events & cross-tab sync
    const handleVoteCast = () => {
      silentUpdate();
    };
    window.addEventListener('eosis_vote_cast', handleVoteCast);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'eosis_students' || e.key === 'eosis_candidates' || e.key === 'eosis_last_vote_timestamp') {
        silentUpdate();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('eosis_vote_cast', handleVoteCast);
      window.removeEventListener('storage', handleStorage);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [stList, clList, cdList, memList, progList, meetList, docList] = await Promise.all([
        dbService.getStudents(),
        dbService.getClasses(),
        dbService.getCandidates(),
        dbService.getOsisMembers(),
        dbService.getOsisPrograms(),
        dbService.getOsisMeetings(),
        dbService.getOsisDocuments(),
      ]);
      setStudents(stList);
      setClasses(clList);
      setCandidates(cdList);
      setMembers(memList);
      setPrograms(progList);
      setMeetings(meetList);
      setDocuments(docList);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = students.length;
  const votedCount = students.filter((s) => s.has_voted).length;
  const notVotedCount = totalStudents - votedCount;
  const participationRate = totalStudents > 0 ? ((votedCount / totalStudents) * 100).toFixed(1) : '0';
  const totalClasses = classes.length;
  const totalCandidates = candidates.length;
  const totalVotesRecorded = candidates.reduce((sum, c) => sum + (c.vote_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Notice */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold border border-white/20">
              <i className="bi bi-speedometer2 text-blue-300"></i>
              <span>Dashboard Pemilihan &amp; Manajemen OSIS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Selamat Datang di Beranda Administrator
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
              Pantau jalannya pemungutan suara secara real-time, pantau partisipasi siswa, dan kelola manajemen internal pengurus OSIS {settings.school_name || 'SMP Negeri 1 Dayun'}.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('perolehan')}
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <i className="bi bi-bar-chart-line-fill"></i>
              <span>Lihat Hasil Suara</span>
            </button>
            <button
              onClick={onOpenSupabaseGuide}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition flex items-center gap-2 cursor-pointer"
            >
              <i className="bi bi-database"></i>
              <span>Status Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* Supabase Notice Banner if tables not initialized */}
      {!supabaseStatus.tablesFound && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-start gap-3">
            <i className="bi bi-database-exclamation text-amber-600 text-2xl mt-0.5"></i>
            <div>
              <h4 className="font-bold text-xs sm:text-sm">Database Supabase Belum Menjalankan Skrip SQL</h4>
              <p className="text-xs text-amber-800">
                Aplikasi saat ini berjalan dengan penyimpanan lokal otomatis. Klik tombol di kanan untuk menyalin skrip SQL Supabase dan mengaktifkan database cloud!
              </p>
            </div>
          </div>
          <button
            onClick={onOpenSupabaseGuide}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shrink-0 transition"
          >
            Buka Setup SQL
          </button>
        </div>
      )}

      {/* 6 Core Statistics Cards requested by prompt */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Siswa */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Siswa (DPT)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <i className="bi bi-people-fill text-base"></i>
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {loading ? '...' : totalStudents}
          </div>
          <span className="text-[11px] text-slate-400 block">Pemilih terdaftar</span>
        </div>

        {/* Total Kelas */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Kelas</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <i className="bi bi-building text-base"></i>
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {loading ? '...' : totalClasses}
          </div>
          <span className="text-[11px] text-slate-400 block">Rombongan belajar</span>
        </div>

        {/* Total Calon Kandidat */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Calon Kandidat</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <i className="bi bi-person-badge-fill text-base"></i>
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {loading ? '...' : totalCandidates}
          </div>
          <span className="text-[11px] text-slate-400 block">Pasangan Calon (Paslon)</span>
        </div>

        {/* Sudah Memilih */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100 space-y-2 bg-gradient-to-b from-emerald-50/30 to-white">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-emerald-800">Sudah Memilih</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <i className="bi bi-check-circle-fill text-base"></i>
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {loading ? '...' : votedCount}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium block">Suara masuk tercatat</span>
        </div>

        {/* Belum Memilih */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-amber-100 space-y-2 bg-gradient-to-b from-amber-50/30 to-white">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-amber-800">Belum Memilih</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <i className="bi bi-hourglass-split text-base"></i>
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">
            {loading ? '...' : notVotedCount}
          </div>
          <span className="text-[11px] text-amber-600 font-medium block">Siswa belum memilih</span>
        </div>

        {/* Persentase Partisipasi */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-blue-200 space-y-2 bg-gradient-to-b from-blue-50/50 to-white">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-blue-900">Partisipasi</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <i className="bi bi-pie-chart-fill text-base"></i>
            </div>
          </div>
          <div className="text-2xl font-black text-blue-800">
            {loading ? '...' : `${participationRate}%`}
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, Number(participationRate)))}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Progress & Quick Breakdown */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Participation meter & quick status */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-xs border border-slate-200 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <i className="bi bi-graph-up text-blue-600"></i>
              <span>Status Partisipasi Pemilihan</span>
            </h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${settings.is_election_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {settings.is_election_active ? 'Pemilihan Dibuka' : 'Pemilihan Ditutup'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Progres Partisipasi ({votedCount} dari {totalStudents} Siswa)</span>
              <span className="text-blue-600">{participationRate}%</span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${totalStudents > 0 ? (votedCount / totalStudents) * 100 : 0}%` }}
                title={`Sudah Memilih: ${votedCount}`}
              ></div>
              <div
                className="bg-amber-400 h-full transition-all duration-500"
                style={{ width: `${totalStudents > 0 ? (notVotedCount / totalStudents) * 100 : 0}%` }}
                title={`Belum Memilih: ${notVotedCount}`}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                Sudah Memilih: {votedCount} siswa
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                Belum Memilih: {notVotedCount} siswa
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => onNavigate('kelas')}
              className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl text-left transition group"
            >
              <i className="bi bi-building text-blue-600 text-lg mb-1 block group-hover:scale-110 transition-transform"></i>
              <span className="font-bold text-slate-800 text-xs block">Kelola Kelas</span>
              <span className="text-[10px] text-slate-500">Atur rombel &amp; DPT</span>
            </button>

            <button
              onClick={() => onNavigate('siswa')}
              className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl text-left transition group"
            >
              <i className="bi bi-people text-indigo-600 text-lg mb-1 block group-hover:scale-110 transition-transform"></i>
              <span className="font-bold text-slate-800 text-xs block">Data Siswa</span>
              <span className="text-[10px] text-slate-500">Daftar NISN pemilih</span>
            </button>

            <button
              onClick={() => onNavigate('kandidat')}
              className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl text-left transition group"
            >
              <i className="bi bi-person-badge text-purple-600 text-lg mb-1 block group-hover:scale-110 transition-transform"></i>
              <span className="font-bold text-slate-800 text-xs block">Calon Kandidat</span>
              <span className="text-[10px] text-slate-500">Foto, visi &amp; misi</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Candidate Standings Preview */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-xs border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <i className="bi bi-trophy text-amber-500"></i>
                <span>Perolehan Sementara</span>
              </h3>
              <span className="text-xs text-slate-400">
                Total: <strong>{totalVotesRecorded} suara</strong>
              </span>
            </div>

            {candidates.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Belum ada kandidat terdaftar.</p>
            ) : (
              <div className="space-y-3">
                {candidates.map((c) => {
                  const pct = totalVotesRecorded > 0 ? ((c.vote_count / totalVotesRecorded) * 100).toFixed(1) : '0';
                  return (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                            {c.candidate_number}
                          </span>
                          <span className="font-bold text-slate-800 truncate max-w-[140px] sm:max-w-[180px]">
                            {c.chairman_name}
                          </span>
                        </div>
                        <span className="font-extrabold text-blue-700">
                          {c.vote_count} Suara ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('perolehan')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>Lihat Detail Rekapitulasi &amp; Grafik</span>
              <i className="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>

      {/* NEW SECTION: MODUL MANAJEMEN INTERNAL PENGURUS OSIS HIGHLIGHT */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-200 mb-1">
              <i className="bi bi-stars"></i>
              <span>Fitur Manajemen Internal Pengurus</span>
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">
              Pusat Manajemen &amp; Administrasi OSIS
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Akses cepat ke struktur hierarki organisasi, papan pelacak program kerja (Kanban), presensi kegiatan, dan arsip dokumen.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Struktur Organisasi */}
          <div
            onClick={() => onNavigate('struktur')}
            className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/60 to-white border border-blue-100 hover:border-blue-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg mb-2 shadow-xs group-hover:scale-110 transition-transform">
                <i className="bi bi-diagram-3-fill"></i>
              </div>
              <h4 className="font-extrabold text-xs text-slate-800">
                Struktur Organisasi
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Bagan visual hierarki pembina, pimpinan inti, BPH, dan sekbid.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-blue-700 pt-2 border-t border-slate-100">
              <span>{members.length} Pengurus</span>
              <i className="bi bi-arrow-right group-hover:translate-x-1 transition-transform"></i>
            </div>
          </div>

          {/* 2. Proja Tracker */}
          <div
            onClick={() => onNavigate('proja')}
            className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-white border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg mb-2 shadow-xs group-hover:scale-110 transition-transform">
                <i className="bi bi-kanban-fill"></i>
              </div>
              <h4 className="font-extrabold text-xs text-slate-800">
                Pelacak Proja (Kanban)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Papan status rencana, sedang berjalan, progres, dan penugasan PJ.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-indigo-700 pt-2 border-t border-slate-100">
              <span>{programs.length} Program Kerja</span>
              <i className="bi bi-arrow-right group-hover:translate-x-1 transition-transform"></i>
            </div>
          </div>

          {/* 3. Absensi Kegiatan */}
          <div
            onClick={() => onNavigate('absensi')}
            className="p-4 rounded-2xl bg-gradient-to-br from-teal-50/60 to-white border border-teal-100 hover:border-teal-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center text-lg mb-2 shadow-xs group-hover:scale-110 transition-transform">
                <i className="bi bi-calendar-check-fill"></i>
              </div>
              <h4 className="font-extrabold text-xs text-slate-800">
                Presensi Rapat &amp; Acara
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Pencatatan daftar hadir cepat 1-klik dan cetak format resmi presensi.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-teal-700 pt-2 border-t border-slate-100">
              <span>{meetings.length} Agenda Rapat</span>
              <i className="bi bi-arrow-right group-hover:translate-x-1 transition-transform"></i>
            </div>
          </div>

          {/* 4. E-Archive */}
          <div
            onClick={() => onNavigate('arsip')}
            className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/60 to-white border border-purple-100 hover:border-purple-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-lg mb-2 shadow-xs group-hover:scale-110 transition-transform">
                <i className="bi bi-folder-symlink-fill"></i>
              </div>
              <h4 className="font-extrabold text-xs text-slate-800">
                Pengarsipan (E-Archive)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Penyimpanan digital proposal, LPJ, surat keluar/masuk, dan notulensi.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-purple-700 pt-2 border-t border-slate-100">
              <span>{documents.length} Berkas Arsip</span>
              <i className="bi bi-arrow-right group-hover:translate-x-1 transition-transform"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
