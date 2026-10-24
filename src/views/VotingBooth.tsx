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

      // Trigger Confetti!
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
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 text-center space-y-6 animate-fade-in relative overflow-hidden">
          {/* Decorative celebration background glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl"></div>

          <div className="relative">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner animate-bounce">
              <i className="bi bi-check-lg"></i>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-800">
              Pilihan Berhasil Disimpan!
            </h2>
            <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 py-2.5 px-4 rounded-xl border border-emerald-200 leading-relaxed">
              &ldquo;Suara Anda berhasil dicatat, terima kasih telah berpartisipasi&rdquo;
            </p>
          </div>

          <p className="text-xs text-slate-500">
            Hak suara Anda telah digunakan secara sah. Anda akan otomatis dialihkan kembali ke halaman utama login dalam:
          </p>

          {/* Countdown Ring */}
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg border-4 border-emerald-400">
              {countdown}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onVoteCompletedAndLoggedOut}
              className="text-xs text-slate-400 hover:text-slate-600 underline font-medium"
            >
              Klik di sini jika tidak otomatis beralih
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Top Bar Navigation & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Kembali ke Dashboard Siswa"
          >
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 flex items-center gap-2">
              <i className="bi bi-box2-heart-fill text-blue-600"></i>
              <span>Bilik Suara Pemilihan OSIS</span>
            </h1>
            <p className="text-xs text-slate-500">
              Pilih salah satu Pasangan Calon Ketua &amp; Wakil Ketua OSIS {settings.election_period || 'Periode 2026/2027'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200">
            Pemilih: {student.name} ({student.class_name || 'Siswa'})
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Memuat data kandidat...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4">
          <i className="bi bi-people text-4xl text-slate-400"></i>
          <h3 className="font-bold text-slate-700 text-lg">Belum Ada Calon Kandidat Terdaftar</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Panitia pemilihan belum menambahkan pasangan calon kandidat. Silakan hubungi panitia OSIS.
          </p>
        </div>
      ) : (
        /* Candidates Grid */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {candidates.map((cand) => (
            <div
              key={cand.id}
              className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden flex flex-col justify-between group"
            >
              {/* Card Header & Candidate Number Badge */}
              <div className="relative">
                {/* Photo */}
                <div className="w-full h-64 sm:h-72 overflow-hidden bg-slate-100 relative">
                  <img
                    src={cand.photo_url || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80'}
                    alt={`Paslon ${cand.candidate_number}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
                </div>

                {/* Number Badge */}
                <div className="absolute top-4 left-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/90 backdrop-blur-md text-white border-2 border-white/80 shadow-lg flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 leading-none">NO</span>
                    <span className="text-2xl font-black leading-none">{cand.candidate_number}</span>
                  </div>
                </div>

                {/* Candidate Name Overlay */}
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider block mb-0.5">
                    Calon Ketua &amp; Wakil Ketua
                  </span>
                  <h3 className="font-extrabold text-base sm:text-lg leading-tight drop-shadow-sm">
                    {cand.chairman_name}
                  </h3>
                  <p className="text-xs font-medium text-slate-200 drop-shadow-xs">
                    &amp; {cand.vice_chairman_name}
                  </p>
                </div>
              </div>

              {/* Card Body: Slogan, Vision, Mission */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Slogan */}
                  {cand.slogan && (
                    <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider block mb-1">
                        Slogan / Tagline
                      </span>
                      <p className="text-xs italic font-medium text-slate-700">
                        &ldquo;{cand.slogan}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Vision */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                      <i className="bi bi-compass text-blue-600"></i>
                      <span>Visi</span>
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {cand.vision}
                    </p>
                  </div>

                  {/* Mission */}
                  {cand.mission && cand.mission.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                        <i className="bi bi-list-check text-blue-600"></i>
                        <span>Misi Utama</span>
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        {cand.mission.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-tight">{item}</span>
                          </li>
                        ))}
                        {cand.mission.length > 3 && (
                          <li className="text-[11px] text-blue-600 font-medium pl-6">
                            +{cand.mission.length - 3} misi lainnya
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Choose Button */}
                <div className="pt-4 mt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSelectCandidate(cand)}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="bi bi-check-circle-fill"></i>
                    <span>Pilih Paslon No. {cand.candidate_number}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {isConfirmModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-scale-up">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-3xl">
                <i className="bi bi-question-circle-fill"></i>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-800">
                  Konfirmasi Pilihan Suara
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Harap pastikan pilihan Anda dengan teliti sebelum mengirim.
                </p>
              </div>

              {/* Selected Candidate Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shrink-0">
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
                <p>
                  <strong>Penting:</strong> Setelah Anda menekan tombol konfirmasi, suara Anda akan dicatat secara permanen di database dan tidak dapat diubah kembali.
                </p>
              </div>

              {voteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 text-left">
                  <i className="bi bi-x-circle-fill me-1"></i> {voteError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={submittingVote}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition"
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
