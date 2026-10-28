import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { dbService } from '../services/dbService';
import { Candidate, Settings, Student } from '../types';

interface Props {
  student: Student;
  settings: Settings;
  onBackToDashboard: () => void;
  onVoteCompletedAndLoggedOut: () => void;
}

export const VotingBooth: React.FC<Props> = ({
  student,
  settings,
  onBackToDashboard,
  onVoteCompletedAndLoggedOut,
}) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  // Success screen state
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const data = await dbService.getCandidates();
      setCandidates(data);
    } catch (err) {
      console.error('Failed to load candidates', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (cand: Candidate) => {
    setSelectedCandidate(cand);
    setIsConfirmModalOpen(true);
    setVoteError(null);
  };

  const handleConfirmVote = async () => {
    if (!selectedCandidate) return;

    setSubmittingVote(true);
    setVoteError(null);

    try {
      await dbService.castVote(
        student.id,
        selectedCandidate.id,
        student.nisn,
        student.birth_date
      );

      // Trigger Confetti celebration
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
        });
      } catch (e) {
        console.warn('Confetti error', e);
      }

      setIsConfirmModalOpen(false);
      setVoteSuccess(true);
      setCountdown(4);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mencatat suara. Silakan coba kembali.';
      setVoteError(msg);
      setSubmittingVote(false);
    }
  };

  // 4-second countdown effect on successful vote
  useEffect(() => {
    if (!voteSuccess) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onVoteCompletedAndLoggedOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [voteSuccess, onVoteCompletedAndLoggedOut]);

  // If vote completed, render the 4-second countdown view
  if (voteSuccess) {
    return (
      <div className="h-[calc(100dvh-4.25rem)] max-h-[calc(100dvh-4.25rem)] flex items-center justify-center p-4 overflow-hidden">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center space-y-5 animate-fade-in relative overflow-hidden">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl"></div>

          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl sm:text-4xl shadow-inner animate-bounce">
              <i className="bi bi-check-lg"></i>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800">
              Pilihan Berhasil Disimpan!
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200 leading-relaxed">
              &ldquo;Suara Anda berhasil dicatat, terima kasih telah berpartisipasi&rdquo;
            </p>
          </div>

          <p className="text-xs text-slate-500">
            Hak suara Anda telah digunakan secara sah. Anda akan otomatis dialihkan kembali ke halaman utama login dalam:
          </p>

          <div className="flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg border-4 border-emerald-400">
              {countdown}
            </div>
          </div>

          <div>
            <button
              onClick={onVoteCompletedAndLoggedOut}
              className="text-xs text-slate-400 hover:text-slate-600 underline font-medium cursor-pointer"
            >
              Klik di sini jika tidak otomatis beralih
            </button>
          </div>
        </div>
      </div>
    );
  }

  const columnCount = candidates.length || 3;

  return (
    <div className="h-[calc(100dvh-4.25rem)] max-h-[calc(100dvh-4.25rem)] flex flex-col justify-between overflow-hidden bg-slate-100/70 p-2 sm:p-3 select-none">
      {/* 1. COMPACT TOP HEADER BAR */}
      <header className="shrink-0 bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg sm:rounded-xl transition shrink-0 cursor-pointer"
            title="Kembali ke Dashboard Siswa"
          >
            <i className="bi bi-arrow-left text-base sm:text-lg"></i>
          </button>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-800 flex items-center gap-1.5 truncate">
              <i className="bi bi-box2-heart-fill text-blue-600 shrink-0"></i>
              <span className="truncate">Bilik Suara Pemilihan OSIS</span>
              <span className="hidden sm:inline-block text-[11px] font-normal text-slate-500">
                • {settings.election_period || 'Masa Bakti 2026/2027'}
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate hidden xs:block">
              Silakan periksa dan pilih satu pasangan calon di bawah ini.
            </p>
          </div>
        </div>

        {/* Voter Identity & Asas Badge */}
        <div className="flex items-center gap-2 shrink-0 text-right">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-[11px] rounded-lg border border-emerald-200">
            <i className="bi bi-shield-check text-xs"></i>
            <span>Asas LUBER Rahasia</span>
          </div>
          <div className="px-2.5 py-1 bg-blue-50 text-blue-800 font-extrabold text-[11px] sm:text-xs rounded-lg border border-blue-200 max-w-[160px] sm:max-w-[240px] truncate">
            <span className="text-blue-500 font-normal mr-1 hidden sm:inline">Pemilih:</span>
            {student.name} ({student.class_name || 'Siswa'})
          </div>
        </div>
      </header>

      {/* 2. CANDIDATES ROW (1 BARIS PENUH BERDAMPINGAN TANPA SCROLL) */}
      <main className="flex-1 min-h-0 py-2 sm:py-3 w-full flex flex-col justify-center">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500">Memuat data kandidat bilik suara...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="h-full bg-white rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-slate-200 space-y-2">
            <i className="bi bi-people text-3xl text-slate-400"></i>
            <h3 className="font-bold text-slate-700 text-sm">Belum Ada Calon Kandidat Terdaftar</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Panitia pemilihan belum menambahkan pasangan calon kandidat.
            </p>
          </div>
        ) : (
          <div
            className="grid gap-2 sm:gap-3 md:gap-4 h-full w-full items-stretch"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            }}
          >
            {candidates.map((cand) => (
              <div
                key={cand.id}
                className="bg-white rounded-xl sm:rounded-2xl md:rounded-3xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all duration-200 flex flex-col h-full min-h-0 overflow-hidden justify-between group relative"
              >
                {/* TOP CANDIDATE NUMBER HEADER */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-2 py-1 sm:py-1.5 flex items-center justify-between shrink-0 border-b border-slate-800">
                  <span className="text-[9px] sm:text-[11px] font-bold tracking-wider text-blue-300 uppercase">
                    PASANGAN CALON
                  </span>
                  <div className="flex items-center gap-1 bg-blue-600 px-2 py-0.5 rounded-full font-black text-xs sm:text-sm text-white shadow-xs">
                    <span>NO.</span>
                    <span className="text-amber-300 font-extrabold">{cand.candidate_number}</span>
                  </div>
                </div>

                {/* PHOTO SECTION WITH OVERLAY */}
                <div className="relative flex-1 min-h-[90px] sm:min-h-[140px] md:min-h-[180px] max-h-[38vh] w-full overflow-hidden bg-slate-950 group">
                  <img
                    src={cand.photo_url || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80'}
                    alt={`Paslon ${cand.candidate_number}`}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  {/* Subtle vignette gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent pointer-events-none"></div>

                  {/* Watermark Number Badge */}
                  <div className="absolute top-2 left-2 pointer-events-none">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl bg-white/95 text-blue-700 font-black text-sm sm:text-lg md:text-xl shadow-lg border border-white flex flex-col items-center justify-center leading-none">
                      <span className="text-[7px] sm:text-[9px] uppercase font-bold text-slate-500 leading-none">NO</span>
                      <span>{cand.candidate_number}</span>
                    </div>
                  </div>

                  {/* Candidate Quick Names on Photo */}
                  <div className="absolute bottom-1.5 left-2 right-2 text-white pointer-events-none">
                    <span className="text-[8px] sm:text-[10px] text-emerald-300 font-bold uppercase tracking-wider block leading-none mb-0.5">
                      Ketua &amp; Wakil
                    </span>
                    <h3 className="font-black text-[11px] sm:text-sm md:text-base leading-tight drop-shadow-sm truncate">
                      {cand.chairman_name}
                    </h3>
                    <p className="text-[9px] sm:text-xs text-slate-200 drop-shadow-xs truncate font-medium">
                      &amp; {cand.vice_chairman_name}
                    </p>
                  </div>
                </div>

                {/* MIDDLE INFO SECTION (Slogan & Details Trigger) */}
                <div className="p-1.5 sm:p-2.5 shrink-0 flex flex-col justify-between gap-1 text-center bg-slate-50/70 border-t border-slate-100">
                  {cand.slogan ? (
                    <p className="text-[9px] sm:text-[11px] italic text-slate-700 line-clamp-1 leading-snug px-1" title={cand.slogan}>
                      &ldquo;{cand.slogan}&rdquo;
                    </p>
                  ) : (
                    <p className="text-[9px] sm:text-[11px] text-slate-500 truncate">
                      Visi &amp; Misi Pasangan Calon {cand.candidate_number}
                    </p>
                  )}

                  {/* Button to view full vision-mission modal */}
                  <button
                    type="button"
                    onClick={() => setDetailCandidate(cand)}
                    className="inline-flex items-center justify-center gap-1 text-[9px] sm:text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline py-0.5 cursor-pointer"
                  >
                    <i className="bi bi-info-circle-fill text-[10px] sm:text-xs"></i>
                    <span>Lihat Visi &amp; Misi</span>
                  </button>
                </div>

                {/* BOTTOM PRIMARY ACTION: COBLOS PASLON INI */}
                <div className="p-1.5 sm:p-2.5 shrink-0 bg-white border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => handleSelectCandidate(cand)}
                    className="w-full py-2 sm:py-3 px-1.5 sm:px-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white font-extrabold text-[11px] sm:text-xs md:text-sm rounded-xl sm:rounded-2xl shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer"
                  >
                    <i className="bi bi-check2-circle text-xs sm:text-base font-bold"></i>
                    <span className="truncate">Coblos Paslon {cand.candidate_number}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 3. COMPACT FOOTER STATUS BAR */}
      <footer className="shrink-0 bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-xs border border-slate-200 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium truncate">
            {settings.school_name || 'SMP Negeri 1 Dayun'} • Bilik Suara Aktif
          </span>
        </div>
        <div className="hidden xs:flex items-center gap-3 font-semibold text-slate-600">
          <span>Langsung • Umum • Bebas • Rahasia • Jujur • Adil</span>
        </div>
      </footer>

      {/* DETAIL VISI & MISI MODAL (Agar kartu tetap ringkas dan pas 1 layar) */}
      {detailCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-scale-up max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-blue-700 font-black text-lg flex items-center justify-center shadow-md">
                  {detailCandidate.candidate_number}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-200 tracking-wider block">
                    Visi &amp; Misi Lengkap Paslon {detailCandidate.candidate_number}
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold truncate">
                    {detailCandidate.chairman_name} &amp; {detailCandidate.vice_chairman_name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailCandidate(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <i className="bi bi-x-lg text-sm"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {detailCandidate.slogan && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-blue-700 tracking-wider block mb-0.5">
                    Slogan / Motto
                  </span>
                  <p className="italic text-slate-800 font-medium leading-relaxed">
                    &ldquo;{detailCandidate.slogan}&rdquo;
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 mb-1 text-xs">
                  <i className="bi bi-compass text-blue-600"></i>
                  <span>Visi Calon</span>
                </h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed font-normal">
                  {detailCandidate.vision}
                </p>
              </div>

              {detailCandidate.mission && detailCandidate.mission.length > 0 && (
                <div>
                  <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 mb-1.5 text-xs">
                    <i className="bi bi-list-check text-blue-600"></i>
                    <span>Misi Calon</span>
                  </h4>
                  <ul className="space-y-2">
                    {detailCandidate.mission.map((m, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-slate-700 leading-tight">{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setDetailCandidate(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-200/80 rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = detailCandidate;
                  setDetailCandidate(null);
                  handleSelectCandidate(target);
                }}
                className="px-5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <i className="bi bi-check-circle-fill"></i>
                <span>Pilih Paslon Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONFIRMATION MODAL */}
      {isConfirmModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-scale-up">
            <div className="p-5 sm:p-6 text-center space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-2xl sm:text-3xl shadow-inner">
                <i className="bi bi-question-circle-fill"></i>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-800">
                  Konfirmasi Pilihan Suara
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Harap pastikan pilihan Anda dengan teliti sebelum mengirim.
                </p>
              </div>

              {/* Selected Candidate Summary Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                  {selectedCandidate.candidate_number}
                </div>
                <div className="truncate">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                    Paslon No. {selectedCandidate.candidate_number}
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-800 truncate">
                    {selectedCandidate.chairman_name}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">
                    &amp; {selectedCandidate.vice_chairman_name}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 flex items-start gap-2">
                <i className="bi bi-exclamation-triangle-fill text-amber-600 shrink-0 mt-0.5"></i>
                <p className="text-[11px] leading-relaxed">
                  <strong>Penting:</strong> Setelah Anda menekan tombol konfirmasi, suara Anda akan dicatat secara permanen di database dan tidak dapat diubah kembali.
                </p>
              </div>

              {voteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 text-left">
                  <i className="bi bi-x-circle-fill me-1"></i> {voteError}
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={submittingVote}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmVote}
                disabled={submittingVote}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submittingVote ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin"></i>
                    <span>Menyimpan Suara...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle text-base"></i>
                    <span>Ya, Simpan Suara Saya</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
