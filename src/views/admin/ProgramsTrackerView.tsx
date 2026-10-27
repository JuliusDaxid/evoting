import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { OsisMember, OsisProgram, ProgramStatus } from '../../types';

export const ProgramsTrackerView: React.FC = () => {
  const [programs, setPrograms] = useState<OsisProgram[]>([]);
  const [members, setMembers] = useState<OsisMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'calendar' | 'list'>('calendar');
  const [calendarDate, setCalendarDate] = useState<Date>(() => {
    // Default to current date or November 2026 if initial programs are in 2026
    const now = new Date();
    return now.getFullYear() >= 2026 ? now : new Date(2026, 10, 1);
  });
  const [filterSekbid, setFilterSekbid] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<OsisProgram | null>(null);
  const [title, setTitle] = useState('');
  const [sekbid, setSekbid] = useState('Sekbid 1 (Keagamaan)');
  const [pjId, setPjId] = useState('');
  const [pjName, setPjName] = useState('');
  const [status, setStatus] = useState<ProgramStatus>('rencana');
  const [progress, setProgress] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deletingProgram, setDeletingProgram] = useState<OsisProgram | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [progList, memberList] = await Promise.all([
        dbService.getOsisPrograms(),
        dbService.getOsisMembers(),
      ]);
      setPrograms(progList);
      setMembers(memberList);
    } catch (err) {
      console.error('Failed to load programs', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingProgram(null);
    setTitle('');
    setSekbid('Sekbid 3 (Seni & Olahraga)');
    const defaultMember = members[1] || members[0];
    setPjId(defaultMember?.id || '');
    setPjName(defaultMember?.name || 'Pengurus OSIS');
    setStatus('rencana');
    setProgress(10);
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setBudget(1500000);
    setDescription('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: OsisProgram) => {
    setEditingProgram(p);
    setTitle(p.title);
    setSekbid(p.sekbid);
    setPjId(p.pj_id || '');
    setPjName(p.pj_name);
    setStatus(p.status);
    setProgress(p.progress);
    setStartDate(p.start_date);
    setEndDate(p.end_date);
    setBudget(p.budget || 0);
    setDescription(p.description || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handlePjChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setPjId(selectedId);
    const found = members.find((m) => m.id === selectedId);
    if (found) {
      setPjName(found.name);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Nama program kerja wajib diisi');
      return;
    }
    if (!pjName.trim()) {
      setFormError('Penanggung Jawab (PJ) wajib dipilih');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingProgram) {
        await dbService.updateOsisProgram(editingProgram.id, {
          title: title.trim(),
          sekbid,
          pj_id: pjId || undefined,
          pj_name: pjName.trim(),
          status,
          progress: Number(progress),
          start_date: startDate,
          end_date: endDate,
          budget: Number(budget),
          description: description.trim(),
        });
      } else {
        await dbService.createOsisProgram({
          title: title.trim(),
          sekbid,
          pj_id: pjId || undefined,
          pj_name: pjName.trim(),
          status,
          progress: Number(progress),
          start_date: startDate,
          end_date: endDate,
          budget: Number(budget),
          description: description.trim(),
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan program kerja';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusChange = async (program: OsisProgram, newStatus: ProgramStatus) => {
    let newProgress = program.progress;
    if (newStatus === 'selesai') newProgress = 100;
    else if (newStatus === 'rencana' && newProgress === 100) newProgress = 25;

    await dbService.updateOsisProgram(program.id, { status: newStatus, progress: newProgress });
    await loadData();
  };

  const handleDelete = async () => {
    if (!deletingProgram) return;
    try {
      await dbService.deleteOsisProgram(deletingProgram.id);
      setDeletingProgram(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete program', err);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const filteredPrograms = programs.filter((p) => {
    if (filterSekbid !== 'all' && !p.sekbid.includes(filterSekbid)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.pj_name.toLowerCase().includes(q) ||
        p.sekbid.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const planned = filteredPrograms.filter((p) => p.status === 'rencana');
  const inProgress = filteredPrograms.filter((p) => p.status === 'sedang_berjalan');
  const completed = filteredPrograms.filter((p) => p.status === 'selesai');
  const totalBudget = filteredPrograms.reduce((sum, p) => sum + (p.budget || 0), 0);

  // Month names in Indonesian
  const MONTH_NAMES_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();

  const handlePrevMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  // Generate calendar days for monthly grid
  const getDaysForMonth = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = lastDay.getDate();

    // Monday as first day (Mon=0, ..., Sun=6)
    const startDayIndex = (firstDay.getDay() + 6) % 7;

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dObj = new Date(currentYear, currentMonth - 1, d);
      const yearStr = dObj.getFullYear();
      const monthStr = String(dObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const yearStr = currentYear;
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding to fill weeks (up to multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const dObj = new Date(currentYear, currentMonth + 1, d);
      const yearStr = dObj.getFullYear();
      const monthStr = String(dObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  };

  const renderKanbanCard = (p: OsisProgram) => (
    <div
      key={p.id}
      className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 hover:shadow-md transition space-y-3 group"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200 truncate max-w-[170px]">
          {p.sekbid}
        </span>
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
          <button
            onClick={() => openEditModal(p)}
            className="p-1 text-slate-400 hover:text-blue-600 rounded"
            title="Edit Proja"
          >
            <i className="bi bi-pencil-square text-xs"></i>
          </button>
          <button
            onClick={() => setDeletingProgram(p)}
            className="p-1 text-slate-400 hover:text-rose-600 rounded"
            title="Hapus Proja"
          >
            <i className="bi bi-trash3 text-xs"></i>
          </button>
        </div>
      </div>

      <div>
        <h4 className="font-extrabold text-xs text-slate-800 leading-snug">
          {p.title}
        </h4>
        {p.description && (
          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
            {p.description}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold">
          <span className="text-slate-500">Progres Capaian</span>
          <span className="text-blue-700">{p.progress}%</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              p.progress === 100 ? 'bg-emerald-500' : p.progress > 40 ? 'bg-blue-600' : 'bg-amber-500'
            }`}
            style={{ width: `${p.progress}%` }}
          ></div>
        </div>
      </div>

      {/* Footer Info: PJ & Budget */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 truncate max-w-[150px]" title={`PJ: ${p.pj_name}`}>
          <div className="w-5 h-5 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
            {p.pj_name.charAt(0)}
          </div>
          <span className="font-semibold text-slate-700 truncate">{p.pj_name}</span>
        </div>

        <span className="font-bold text-slate-800 text-[10px] bg-slate-100 px-2 py-0.5 rounded">
          {formatRupiah(p.budget)}
        </span>
      </div>

      {/* Quick Move Status Buttons */}
      <div className="pt-1 flex items-center justify-between gap-1 text-[10px]">
        {p.status !== 'rencana' && (
          <button
            onClick={() => handleQuickStatusChange(p, 'rencana')}
            className="text-slate-500 hover:text-amber-600 font-semibold flex items-center gap-1"
          >
            <i className="bi bi-arrow-left"></i> Rencana
          </button>
        )}
        {p.status !== 'sedang_berjalan' && (
          <button
            onClick={() => handleQuickStatusChange(p, 'sedang_berjalan')}
            className="text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 mx-auto"
          >
            <i className="bi bi-play-circle"></i> Berjalan
          </button>
        )}
        {p.status !== 'selesai' && (
          <button
            onClick={() => handleQuickStatusChange(p, 'selesai')}
            className="text-slate-500 hover:text-emerald-600 font-semibold flex items-center gap-1 ml-auto"
          >
            Selesai <i className="bi bi-arrow-right"></i>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <i className="bi bi-kanban-fill text-blue-600"></i>
            <span>Pelacak Program Kerja OSIS (Proja Tracker)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen agenda kegiatan, pembagian penanggung jawab (PJ), alokasi anggaran, dan pemantauan progres.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'kanban' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="bi bi-kanban"></i>
              <span className="hidden sm:inline">Papan Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'calendar' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="bi bi-calendar3"></i>
              <span>Kalender Proja</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="bi bi-list-task"></i>
              <span className="hidden sm:inline">Daftar List</span>
            </button>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Tambah Program Kerja</span>
          </button>
        </div>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 block">Total Proja Terdaftar</span>
          <span className="text-2xl font-black text-slate-800">{filteredPrograms.length}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Seluruh Sekbid OSIS</span>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-2xl shadow-xs border border-amber-200">
          <span className="text-[11px] font-bold text-amber-800 block">Rencana</span>
          <span className="text-2xl font-black text-amber-700">{planned.length}</span>
          <span className="text-[10px] text-amber-600 block mt-0.5">Belum dilaksanakan</span>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-2xl shadow-xs border border-blue-200">
          <span className="text-[11px] font-bold text-blue-800 block">Sedang Berjalan</span>
          <span className="text-2xl font-black text-blue-700">{inProgress.length}</span>
          <span className="text-[10px] text-blue-600 block mt-0.5">Dalam tahap eksekusi</span>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-2xl shadow-xs border border-emerald-200">
          <span className="text-[11px] font-bold text-emerald-800 block">Selesai (100%)</span>
          <span className="text-2xl font-black text-emerald-700">{completed.length}</span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">Total: {formatRupiah(totalBudget)}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 grid sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-8 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <i className="bi bi-search text-xs"></i>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari program kerja, penanggung jawab (PJ), atau sekbid..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={filterSekbid}
            onChange={(e) => setFilterSekbid(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          >
            <option value="all">Semua Sekbid</option>
            <option value="Inti">Pengurus Inti</option>
            <option value="Sekbid 1">Sekbid 1 (Keagamaan)</option>
            <option value="Sekbid 2">Sekbid 2 (Kedisiplinan)</option>
            <option value="Sekbid 3">Sekbid 3 (Seni &amp; Olahraga)</option>
            <option value="Sekbid 4">Sekbid 4 (TIK &amp; Komunikasi)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-500">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Memuat data program kerja...
        </div>
      ) : (
        <>
          {/* 1. KANBAN BOARD 3 COLUMNS */}
          {viewMode === 'kanban' && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Column 1: Rencana */}
              <div className="bg-slate-100/70 rounded-3xl p-4 border border-slate-200 flex flex-col space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-extrabold text-xs text-amber-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    Rencana ({planned.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Belum Dimulai</span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {planned.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      Tidak ada program kerja dalam rencana.
                    </div>
                  ) : (
                    planned.map((p) => renderKanbanCard(p))
                  )}
                </div>
              </div>

              {/* Column 2: Sedang Berjalan */}
              <div className="bg-slate-100/70 rounded-3xl p-4 border border-slate-200 flex flex-col space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-extrabold text-xs text-blue-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    Sedang Berjalan ({inProgress.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Tahap Eksekusi</span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {inProgress.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      Tidak ada program yang sedang berjalan.
                    </div>
                  ) : (
                    inProgress.map((p) => renderKanbanCard(p))
                  )}
                </div>
              </div>

              {/* Column 3: Selesai */}
              <div className="bg-slate-100/70 rounded-3xl p-4 border border-slate-200 flex flex-col space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-extrabold text-xs text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Selesai ({completed.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Tuntas (100%)</span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {completed.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      Belum ada program yang selesai.
                    </div>
                  ) : (
                    completed.map((p) => renderKanbanCard(p))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. INTERACTIVE CALENDAR VIEW */}
          {viewMode === 'calendar' && (
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden space-y-0">
              {/* Calendar Toolbar */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-2 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                      title="Bulan Sebelumnya"
                    >
                      <i className="bi bi-chevron-left text-xs"></i>
                    </button>
                    <button
                      type="button"
                      onClick={handleToday}
                      className="px-3 py-1.5 text-xs font-bold hover:bg-slate-100 text-slate-700 border-x border-slate-200 transition cursor-pointer"
                    >
                      Bulan Ini
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-2 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                      title="Bulan Berikutnya"
                    >
                      <i className="bi bi-chevron-right text-xs"></i>
                    </button>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-800">
                    {MONTH_NAMES_ID[currentMonth]} {currentYear}
                  </h3>
                </div>

                {/* Legend indicator */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Rencana
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-200 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    Sedang Berjalan
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Selesai
                  </span>
                </div>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/90 text-center text-xs font-bold text-slate-600">
                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((d, i) => (
                  <div key={d} className={`py-2.5 px-1 ${i >= 5 ? 'text-rose-600' : ''}`}>
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{d.slice(0, 3)}</span>
                  </div>
                ))}
              </div>

              {/* Monthly Grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 bg-slate-200">
                {getDaysForMonth().map((cell, idx) => {
                  const dayPrograms = filteredPrograms.filter(
                    (p) => p.start_date <= cell.dateStr && p.end_date >= cell.dateStr
                  );

                  return (
                    <div
                      key={`day-${cell.dateStr}-${idx}`}
                      className={`min-h-[110px] sm:min-h-[125px] p-1.5 sm:p-2 bg-white flex flex-col justify-between transition hover:bg-slate-50/80 ${
                        !cell.isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : ''
                      }`}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                            cell.isToday
                              ? 'bg-blue-600 text-white font-extrabold shadow-xs'
                              : cell.isCurrentMonth
                              ? 'text-slate-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {cell.isCurrentMonth && (
                          <button
                            type="button"
                            onClick={() => {
                              openAddModal();
                              setStartDate(cell.dateStr);
                              setEndDate(cell.dateStr);
                            }}
                            className="p-0.5 text-slate-400 hover:text-blue-600 transition rounded cursor-pointer"
                            title={`Tambah Proja di tanggal ${cell.dateStr}`}
                          >
                            <i className="bi bi-plus text-xs"></i>
                          </button>
                        )}
                      </div>

                      {/* Day Programs Pill */}
                      <div className="space-y-1 overflow-y-auto max-h-[85px] pr-0.5">
                        {dayPrograms.map((p) => {
                          const isStart = p.start_date === cell.dateStr;
                          const isEnd = p.end_date === cell.dateStr;

                          let bgClass = 'bg-amber-100 text-amber-900 border-amber-300';
                          if (p.status === 'sedang_berjalan') {
                            bgClass = 'bg-blue-100 text-blue-900 border-blue-300';
                          } else if (p.status === 'selesai') {
                            bgClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                          }

                          return (
                            <button
                              key={`pill-${p.id}-${cell.dateStr}`}
                              type="button"
                              onClick={() => openEditModal(p)}
                              className={`w-full text-left p-1 rounded-md text-[10px] font-bold border transition truncate block hover:shadow-xs cursor-pointer ${bgClass}`}
                              title={`${p.title} (${p.sekbid}) - ${
                                p.status === 'selesai'
                                  ? 'Selesai'
                                  : p.status === 'sedang_berjalan'
                                  ? 'Sedang Berjalan'
                                  : 'Rencana'
                              } - PJ: ${p.pj_name} (${p.start_date} s/d ${p.end_date})`}
                            >
                              <div className="flex items-center gap-1 truncate">
                                {isStart && <span className="text-[9px]">▶</span>}
                                <span className="truncate">{p.title}</span>
                                {isEnd && <span className="text-[9px]">🏁</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Monthly Overview Agenda List underneath the grid */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <i className="bi bi-calendar-check text-blue-600"></i>
                  <span>Program Kerja Aktif di Bulan {MONTH_NAMES_ID[currentMonth]} {currentYear}</span>
                </h4>

                {filteredPrograms.filter((p) => {
                  return (
                    p.start_date <= `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-31` &&
                    p.end_date >= `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
                  );
                }).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Tidak ada agenda program kerja yang dijadwalkan pada bulan ini.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredPrograms
                      .filter((p) => {
                        return (
                          p.start_date <= `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-31` &&
                          p.end_date >= `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
                        );
                      })
                      .map((p) => (
                        <div
                          key={`agenda-${p.id}`}
                          onClick={() => openEditModal(p)}
                          className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-400 shadow-2xs hover:shadow-xs transition cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 truncate">
                              {p.sekbid}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                p.status === 'selesai'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.status === 'sedang_berjalan'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {p.status === 'selesai'
                                ? 'Selesai'
                                : p.status === 'sedang_berjalan'
                                ? 'Sedang Berjalan'
                                : 'Rencana'}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-800 truncate">{p.title}</h5>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>PJ: {p.pj_name}</span>
                            <span className="font-mono text-[10px]">{p.start_date} s/d {p.end_date}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. LIST / TABLE VIEW */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Program Kerja</th>
                      <th className="py-3 px-4">Sekbid</th>
                      <th className="py-3 px-4">Penanggung Jawab (PJ)</th>
                      <th className="py-3 px-4">Jadwal</th>
                      <th className="py-3 px-4">Anggaran</th>
                      <th className="py-3 px-4 text-center">Status &amp; Progres</th>
                      <th className="py-3 px-4 text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPrograms.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-slate-800 text-xs block">
                            {p.title}
                          </span>
                          {p.description && (
                            <span className="text-[11px] text-slate-500 line-clamp-1">
                              {p.description}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                            {p.sekbid}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {p.pj_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {p.start_date} s/d {p.end_date}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {formatRupiah(p.budget)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                                p.status === 'selesai'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : p.status === 'sedang_berjalan'
                                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                                  : 'bg-amber-50 text-amber-700 border-amber-300'
                              }`}
                            >
                              {p.status === 'selesai'
                                ? 'Selesai'
                                : p.status === 'sedang_berjalan'
                                ? 'Sedang Berjalan'
                                : 'Rencana'}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5 font-bold">
                              {p.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Edit"
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingProgram(p)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Hapus"
                            >
                              <i className="bi bi-trash3"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ADD / EDIT PROJA MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingProgram ? 'Edit Program Kerja OSIS' : 'Tambah Program Kerja Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Kegiatan / Program Kerja <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Peringatan Hari Pahlawan & Lomba Puisi"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sekbid Penyelenggara
                  </label>
                  <select
                    value={sekbid}
                    onChange={(e) => setSekbid(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="Pengurus Inti">Pengurus Inti</option>
                    <option value="Sekbid 1 (Keagamaan)">Sekbid 1 (Keagamaan)</option>
                    <option value="Sekbid 2 (Kedisiplinan)">Sekbid 2 (Kedisiplinan)</option>
                    <option value="Sekbid 3 (Seni & Olahraga)">Sekbid 3 (Seni &amp; Olahraga)</option>
                    <option value="Sekbid 4 (TIK & Komunikasi)">Sekbid 4 (TIK &amp; Komunikasi)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Penanggung Jawab (PJ) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={pjId}
                    onChange={handlePjChange}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status Program
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProgramStatus)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="rencana">Rencana</option>
                    <option value="sedang_berjalan">Sedang Berjalan</option>
                    <option value="selesai">Selesai</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Progres Capaian: {progress}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full mt-2 accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Estimasi Anggaran (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deskripsi / Rincian Kegiatan
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Penjelasan sasaran kegiatan, target peserta, dan perlengkapan..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl">
              <i className="bi bi-trash3-fill"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Hapus Program Kerja?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Program kerja <strong>{deletingProgram.title}</strong> akan dihapus permanen dari pelacak proja.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProgram(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
