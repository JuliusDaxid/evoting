import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { AttendanceStatus, OsisAttendance, OsisMeeting, OsisMember } from '../../types';

export const AttendanceView: React.FC = () => {
  const [meetings, setMeetings] = useState<OsisMeeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [attendance, setAttendance] = useState<OsisAttendance[]>([]);
  const [members, setMembers] = useState<OsisMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Rapat Baru
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingDesc, setMeetingDesc] = useState('');
  const [savingMeeting, setSavingMeeting] = useState(false);

  // Search & Filter
  const [searchMember, setSearchMember] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [mList, memList] = await Promise.all([
        dbService.getOsisMeetings(),
        dbService.getOsisMembers(),
      ]);
      setMeetings(mList);
      setMembers(memList);

      if (mList.length > 0) {
        const initialMeetingId = mList[0].id;
        setSelectedMeetingId(initialMeetingId);
        const attList = await dbService.getAttendanceByMeeting(initialMeetingId);
        setAttendance(attList);
      }
    } catch (err) {
      console.error('Failed to load meetings data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMeeting = async (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setLoading(true);
    try {
      const attList = await dbService.getAttendanceByMeeting(meetingId);
      setAttendance(attList);
    } catch (err) {
      console.error('Failed to load attendance for meeting', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (memberId: string, newStatus: AttendanceStatus) => {
    if (!selectedMeetingId) return;

    // Optimistic UI update
    setAttendance((prev) =>
      prev.map((a) => (a.member_id === memberId ? { ...a, status: newStatus } : a))
    );

    await dbService.updateAttendanceStatus(selectedMeetingId, memberId, newStatus);
  };

  const handleMarkAllPresent = async () => {
    if (!selectedMeetingId) return;

    setAttendance((prev) => prev.map((a) => ({ ...a, status: 'hadir' })));
    for (const item of attendance) {
      await dbService.updateAttendanceStatus(selectedMeetingId, item.member_id, 'hadir');
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !meetingDate) return;

    setSavingMeeting(true);
    try {
      const newMeet = await dbService.createOsisMeeting({
        title: meetingTitle.trim(),
        date: meetingDate,
        time: meetingTime.trim() || '14:00 - 16:00 WIB',
        location: meetingLocation.trim() || 'Ruang OSIS',
        description: meetingDesc.trim(),
      });

      setMeetings([newMeet, ...meetings]);
      setSelectedMeetingId(newMeet.id);
      const att = await dbService.getAttendanceByMeeting(newMeet.id);
      setAttendance(att);
      setIsMeetingModalOpen(false);
      setMeetingTitle('');
      setMeetingDesc('');
    } catch (err) {
      console.error('Failed to create meeting', err);
    } finally {
      setSavingMeeting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const currentMeeting = meetings.find((m) => m.id === selectedMeetingId);

  // Statistics calculation
  const total = attendance.length;
  const countHadir = attendance.filter((a) => a.status === 'hadir').length;
  const countIzin = attendance.filter((a) => a.status === 'izin').length;
  const countSakit = attendance.filter((a) => a.status === 'sakit').length;
  const countAlpa = attendance.filter((a) => a.status === 'alpa').length;
  const percentageHadir = total > 0 ? ((countHadir / total) * 100).toFixed(1) : '0';

  const filteredAttendance = attendance.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchMember.trim()) {
      const q = searchMember.toLowerCase();
      return (
        a.member_name.toLowerCase().includes(q) ||
        a.member_role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <i className="bi bi-calendar-check-fill text-blue-600"></i>
            <span>Presensi &amp; Absensi Kegiatan OSIS</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan daftar hadir rapat rutin, briefing kepanitiaan, dan rekapitulasi persentase kehadiran pengurus.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <i className="bi bi-printer"></i>
            <span>Cetak Presensi</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setMeetingDate(today);
              setMeetingTime('14:00 - 16:00 WIB');
              setMeetingLocation('Ruang OSIS');
              setIsMeetingModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Buat Agenda Rapat Baru</span>
          </button>
        </div>
      </div>

      {/* PRINT-ONLY OFFICIAL DOCUMENT HEADER */}
      <div className="hidden print-only mb-6 text-center border-b-2 border-slate-900 pb-3">
        <h1 className="text-lg font-black uppercase">DAFTAR HADIR RAPAT PENGURUS OSIS</h1>
        <h2 className="text-sm font-bold uppercase">{currentMeeting?.title || 'Kegiatan Rapat'}</h2>
        <p className="text-xs text-slate-600">
          Hari/Tanggal: {currentMeeting?.date} • Waktu: {currentMeeting?.time} • Tempat: {currentMeeting?.location}
        </p>
      </div>

      {/* Meeting Selector Bar */}
      <div className="no-print bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
            Pilih Rapat / Kegiatan:
          </span>
          <select
            value={selectedMeetingId}
            onChange={(e) => handleSelectMeeting(e.target.value)}
            className="w-full sm:max-w-md px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-semibold"
          >
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.date} - {m.title}
              </option>
            ))}
          </select>
        </div>

        {currentMeeting && (
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <i className="bi bi-geo-alt text-rose-500"></i>
              {currentMeeting.location}
            </span>
            <span className="flex items-center gap-1">
              <i className="bi bi-clock text-blue-500"></i>
              {currentMeeting.time}
            </span>
          </div>
        )}
      </div>

      {/* Attendance Stats Cards Requested by Prompt */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 block">Total Pengurus</span>
          <span className="text-xl font-black text-slate-800">{total}</span>
          <span className="text-[10px] text-slate-400 block">Anggota terdaftar</span>
        </div>

        <div className="bg-emerald-50/50 p-3.5 rounded-2xl shadow-xs border border-emerald-200">
          <span className="text-[11px] font-bold text-emerald-800 block">Hadir</span>
          <span className="text-xl font-black text-emerald-700">{countHadir}</span>
          <span className="text-[10px] text-emerald-600 block">Presensi sah</span>
        </div>

        <div className="bg-blue-50/50 p-3.5 rounded-2xl shadow-xs border border-blue-200">
          <span className="text-[11px] font-bold text-blue-800 block">Izin</span>
          <span className="text-xl font-black text-blue-700">{countIzin}</span>
          <span className="text-[10px] text-blue-600 block">Surat / keterangan</span>
        </div>

        <div className="bg-amber-50/50 p-3.5 rounded-2xl shadow-xs border border-amber-200">
          <span className="text-[11px] font-bold text-amber-800 block">Sakit</span>
          <span className="text-xl font-black text-amber-700">{countSakit}</span>
          <span className="text-[10px] text-amber-600 block">Kondisi kesehatan</span>
        </div>

        <div className="bg-rose-50/50 p-3.5 rounded-2xl shadow-xs border border-rose-200">
          <span className="text-[11px] font-bold text-rose-800 block">Alpa / Tanpa Ket.</span>
          <span className="text-xl font-black text-rose-700">{countAlpa}</span>
          <span className="text-[10px] text-rose-600 block">Tidak hadir</span>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-3.5 rounded-2xl shadow-xs border border-blue-200">
          <span className="text-[11px] font-bold text-indigo-900 block">% Kehadiran</span>
          <span className="text-xl font-black text-indigo-700">{percentageHadir}%</span>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{ width: `${percentageHadir}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filter and Quick Action Row */}
      <div className="no-print bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <i className="bi bi-search text-xs"></i>
            </span>
            <input
              type="text"
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              placeholder="Cari pengurus..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          >
            <option value="all">Semua Presensi</option>
            <option value="hadir">Hadir</option>
            <option value="izin">Izin</option>
            <option value="sakit">Sakit</option>
            <option value="alpa">Alpa</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleMarkAllPresent}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition"
        >
          <i className="bi bi-check2-all"></i>
          <span>Tandai Semua Hadir</span>
        </button>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Memuat daftar presensi...
          </div>
        ) : filteredAttendance.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Tidak ada data presensi yang sesuai.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Pengurus</th>
                  <th className="py-3 px-4">Jabatan</th>
                  <th className="py-3 px-4 text-center">Status Kehadiran</th>
                  <th className="py-3 px-4 no-print text-center w-60">Ubah Status Cepat</th>
                  <th className="hidden print-only py-3 px-4 text-center w-28">Tanda Tangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-slate-800 text-xs block">
                        {item.member_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {item.member_role}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                          item.status === 'hadir'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : item.status === 'izin'
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : item.status === 'sakit'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-rose-50 text-rose-700 border-rose-300'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center no-print">
                      {/* 1-Click Fast Action Buttons requested by prompt */}
                      <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.member_id, 'hadir')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                            item.status === 'hadir'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-emerald-700'
                          }`}
                        >
                          Hadir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.member_id, 'izin')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                            item.status === 'izin'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-blue-700'
                          }`}
                        >
                          Izin
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.member_id, 'sakit')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                            item.status === 'sakit'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-amber-700'
                          }`}
                        >
                          Sakit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.member_id, 'alpa')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                            item.status === 'alpa'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-rose-700'
                          }`}
                        >
                          Alpa
                        </button>
                      </div>
                    </td>
                    <td className="hidden print-only py-4 px-4 text-center text-slate-300">
                      .......................
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRINT-ONLY SIGNATURE SECTION */}
      <div className="hidden print-only mt-10 pt-6 grid grid-cols-2 text-center text-xs">
        <div>
          <p className="mb-14">Mengetahui,<br /><strong>Pembina OSIS</strong></p>
          <p className="font-bold underline">( Drs. Hendro Wibowo, M.Pd. )</p>
          <p>NIP. 19780512 200501 1 004</p>
        </div>
        <div>
          <p className="mb-14">Dayun, {currentMeeting?.date}<br /><strong>Sekretaris Umum OSIS</strong></p>
          <p className="font-bold underline">( Zahra Cantika Putri )</p>
          <p>NISN. 0081234504</p>
        </div>
      </div>

      {/* CREATE MEETING MODAL */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Buat Agenda Rapat / Kegiatan Baru</h3>
              <button
                onClick={() => setIsMeetingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Agenda Rapat <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Contoh: Rapat Pleno Evaluasi Class Meeting"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Kegiatan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Waktu / Jam
                  </label>
                  <input
                    type="text"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    placeholder="Contoh: 14:00 - 16:30 WIB"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tempat / Ruangan
                </label>
                <input
                  type="text"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  placeholder="Contoh: Ruang OSIS / Laboratorium Komputer"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Agenda Pembahasan
                </label>
                <textarea
                  value={meetingDesc}
                  onChange={(e) => setMeetingDesc(e.target.value)}
                  placeholder="Catatan topik yang akan dibahas..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  disabled={savingMeeting}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingMeeting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {savingMeeting ? 'Menyimpan...' : 'Buat Agenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
