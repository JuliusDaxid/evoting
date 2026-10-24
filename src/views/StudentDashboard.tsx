import React from 'react';
import { Settings, Student } from '../types';

interface Props {
  student: Student;
  settings: Settings;
  onGoToVoting: () => void;
  onLogout: () => void;
}

export const StudentDashboard: React.FC<Props> = ({
  student,
  settings,
  onGoToVoting,
  onLogout,
}) => {
  // Format birth date to friendly Indonesian format
  const formatBirthDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatVoteTime = (isoStr?: string | null) => {
    if (!isoStr) return null;
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB';
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold border border-white/20">
              <i className="bi bi-person-check-fill text-emerald-300"></i>
              <span>Verifikasi Pemilih Sah Terkonfirmasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Halo, {student.name}!
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
              Selamat datang di portal eOSIS {settings.school_name || 'SMP Negeri 1 Dayun'}. Suara Anda menentukan kepemimpinan OSIS untuk {settings.election_period || 'Periode 2026/2027'}.
            </p>
          </div>

          <div className="shrink-0">
            {student.has_voted ? (
              <div className="px-5 py-3 rounded-2xl bg-slate-900/40 border border-white/20 backdrop-blur text-center">
                <span className="block text-xs uppercase tracking-wider text-blue-200 font-bold mb-1">
                  Status Hak Suara
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700">
                  <i className="bi bi-check2-circle text-emerald-400"></i> Sudah Memilih
                </span>
              </div>
            ) : (
              <div className="px-5 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 backdrop-blur text-center">
                <span className="block text-xs uppercase tracking-wider text-emerald-200 font-bold mb-1">
                  Status Hak Suara
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400 text-slate-900 text-xs font-extrabold shadow-sm animate-bounce">
                  <i className="bi bi-exclamation-circle-fill"></i> Belum Memilih
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Biodata & Voting Status Card */}
      <div className="grid md:grid-cols-12 gap-6">
        {/* Left: Biodata Card */}
        <div className="md:col-span-5 bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <i className="bi bi-person-lines-fill text-blue-600"></i>
              <span>Biodata Pemilih</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              DPT Siswa
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Nomor Induk Siswa Nasional (NISN)</span>
              <span className="font-bold text-slate-800 text-sm tracking-wider font-mono">{student.nisn}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Nama Lengkap</span>
              <span className="font-semibold text-slate-800 text-sm">{student.name}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Kelas / Rombel</span>
              <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 text-xs mt-0.5">
                {student.class_name || 'Belum Ditentukan'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Tanggal Lahir</span>
              <span className="font-semibold text-slate-700">{formatBirthDate(student.birth_date)}</span>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 block font-medium mb-1">Status Partisipasi</span>
              {student.has_voted ? (
                <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700 font-medium text-xs flex items-center gap-2">
                  <i className="bi bi-check-circle-fill text-emerald-600 text-base"></i>
                  <span>Telah memberikan suara pada pemilihan ini.</span>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-800 font-medium text-xs flex items-center gap-2 border border-emerald-200">
                  <i className="bi bi-clock-history text-emerald-600 text-base"></i>
                  <span>Hak suara aktif dan siap digunakan.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Action or Status Area */}
        <div className="md:col-span-7 flex flex-col">
          {student.has_voted ? (
            /* IF STUDENT ALREADY VOTED: Explicitly show information and DO NOT show voting button */
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 flex-1 flex flex-col justify-between space-y-6">
              <div className="text-center space-y-3 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-inner">
                  <i className="bi bi-patch-check-fill"></i>
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  Anda Sudah Menggunakan Hak Suara
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Terima kasih atas partisipasi aktif Anda dalam menyukseskan Pemilihan Ketua &amp; Wakil Ketua OSIS {settings.school_name || 'SMP Negeri 1 Dayun'}.
                </p>

                {student.voted_at && (
                  <div className="inline-block p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                    <i className="bi bi-calendar2-check text-emerald-600 me-1.5"></i>
                    Waktu Memilih: <strong>{formatVoteTime(student.voted_at)}</strong>
                  </div>
                )}
              </div>

              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <i className="bi bi-info-circle-fill text-blue-600"></i>
                  <span>Prinsip Rahasia &amp; Integritas Suara:</span>
                </div>
                <p className="leading-relaxed text-blue-800">
                  Setiap siswa hanya memiliki 1 kali kesempatan memilih. Pilihan kandidat Anda dirahasiakan dan tidak dapat diakses oleh siapapun, termasuk guru maupun panitia.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-2"
                >
                  <i className="bi bi-box-arrow-right"></i>
                  <span>Keluar dari Sesi Siswa</span>
                </button>
              </div>
            </div>
          ) : (
            /* IF STUDENT HAS NOT VOTED: Show the prominent "Berikan Suara" button */
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <i className="bi bi-bell-fill animate-pulse"></i>
                  <span>Bilik Suara Siap Digunakan</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 leading-snug">
                  Gunakan Hak Suara Anda Sekarang
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Pilihlah pasangan calon ketua dan wakil ketua OSIS yang memiliki visi, misi, serta program kerja terbaik untuk memajukan sekolah kita tercinta.
                </p>

                {/* Important notices */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1.5">
                  <span className="font-bold block flex items-center gap-1.5 text-amber-800">
                    <i className="bi bi-exclamation-diamond-fill"></i> Ketentuan Pemberian Suara:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-amber-800/90 pl-1">
                    <li>Hanya dapat memilih 1 (satu) pasangan calon.</li>
                    <li>Setelah konfirmasi disimpan, pilihan bersifat final dan tidak dapat diubah.</li>
                    <li>Setelah memilih, sistem otomatis mengakhiri sesi pemilih Anda.</li>
                  </ul>
                </div>
              </div>

              <div className="pt-4">
                {!settings.is_election_active ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium text-center">
                    <i className="bi bi-door-closed-fill text-lg block mb-1"></i>
                    Pemilihan saat ini sedang ditutup sementara oleh panitia OSIS.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onGoToVoting}
                    className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-500/25 transition cursor-pointer flex items-center justify-center gap-3 animate-pulse-glow"
                  >
                    <i className="bi bi-check2-square text-xl"></i>
                    <span>Berikan Suara (Bilik Suara)</span>
                    <i className="bi bi-arrow-right text-lg"></i>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
