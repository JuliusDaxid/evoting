import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { Candidate } from '../../types';

export const CandidatesManagement: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  const [candidateNumber, setCandidateNumber] = useState<number>(1);
  const [chairmanName, setChairmanName] = useState('');
  const [viceChairmanName, setViceChairmanName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [slogan, setSlogan] = useState('');
  const [vision, setVision] = useState('');
  const [missionItems, setMissionItems] = useState<string[]>(['']);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deletingCandidate, setDeletingCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

  const openAddModal = () => {
    setEditingCandidate(null);
    const nextNumber = candidates.length > 0 ? Math.max(...candidates.map((c) => c.candidate_number)) + 1 : 1;
    setCandidateNumber(nextNumber);
    setChairmanName('');
    setViceChairmanName('');
    setPhotoUrl('https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80');
    setSlogan('');
    setVision('');
    setMissionItems(['Meningkatkan kedisiplinan dan rasa kepedulian siswa.', 'Mendukung program literasi dan pengembangan minat bakat.']);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cand: Candidate) => {
    setEditingCandidate(cand);
    setCandidateNumber(cand.candidate_number);
    setChairmanName(cand.chairman_name);
    setViceChairmanName(cand.vice_chairman_name);
    setPhotoUrl(cand.photo_url || '');
    setSlogan(cand.slogan || '');
    setVision(cand.vision || '');
    setMissionItems(cand.mission && cand.mission.length > 0 ? cand.mission : ['']);
    setFormError(null);
    setIsModalOpen(true);
  };

  const addMissionRow = () => {
    setMissionItems([...missionItems, '']);
  };

  const removeMissionRow = (index: number) => {
    setMissionItems(missionItems.filter((_, i) => i !== index));
  };

  const updateMissionRow = (index: number, val: string) => {
    const updated = [...missionItems];
    updated[index] = val;
    setMissionItems(updated);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chairmanName.trim() || !viceChairmanName.trim()) {
      setFormError('Nama calon ketua dan wakil ketua wajib diisi.');
      return;
    }
    if (!vision.trim()) {
      setFormError('Visi kandidat wajib diisi.');
      return;
    }

    const filteredMissions = missionItems.map((m) => m.trim()).filter(Boolean);
    if (filteredMissions.length === 0) {
      setFormError('Minimal harus ada 1 poin misi kandidat.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingCandidate) {
        await dbService.updateCandidate(editingCandidate.id, {
          candidate_number: candidateNumber,
          chairman_name: chairmanName.trim(),
          vice_chairman_name: viceChairmanName.trim(),
          photo_url: photoUrl.trim() || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80',
          slogan: slogan.trim(),
          vision: vision.trim(),
          mission: filteredMissions,
        });
      } else {
        await dbService.createCandidate({
          candidate_number: candidateNumber,
          chairman_name: chairmanName.trim(),
          vice_chairman_name: viceChairmanName.trim(),
          photo_url: photoUrl.trim() || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80',
          slogan: slogan.trim(),
          vision: vision.trim(),
          mission: filteredMissions,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan calon kandidat.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCandidate) return;
    try {
      await dbService.deleteCandidate(deletingCandidate.id);
      setDeletingCandidate(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete candidate', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <i className="bi bi-person-badge text-blue-600"></i>
            <span>Calon Kandidat Ketua &amp; Wakil Ketua OSIS</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola profil pasangan calon, nomor urut, foto, visi, misi, dan slogan kampanye.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
        >
          <i className="bi bi-plus-lg"></i>
          <span>Tambah Pasangan Calon</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Memuat data kandidat...
        </div>
      ) : candidates.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <i className="bi bi-people text-4xl text-slate-300"></i>
          <p className="text-xs font-semibold text-slate-600">Belum ada pasangan calon yang terdaftar.</p>
          <button
            onClick={openAddModal}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Tambah Paslon Pertama Sekarang
          </button>
        </div>
      ) : (
        /* Candidates Grid */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((cand) => (
            <div
              key={cand.id}
              className="bg-white rounded-3xl shadow-xs hover:shadow-lg transition border border-slate-200 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Photo & Number Header */}
                <div className="relative h-56 bg-slate-100 overflow-hidden">
                  <img
                    src={cand.photo_url}
                    alt={`Paslon ${cand.candidate_number}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>

                  {/* Number Badge */}
                  <div className="absolute top-3 left-3 w-12 h-12 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center font-black shadow-md border-2 border-white">
                    <span className="text-[9px] uppercase tracking-wider text-blue-200">NO</span>
                    <span className="text-xl leading-none">{cand.candidate_number}</span>
                  </div>

                  {/* Action Buttons Top Right */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => openEditModal(cand)}
                      className="p-1.5 text-white/90 hover:text-white hover:bg-white/20 rounded-lg transition"
                      title="Edit Paslon"
                    >
                      <i className="bi bi-pencil-square text-sm"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingCandidate(cand)}
                      className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-600 rounded-lg transition"
                      title="Hapus Paslon"
                    >
                      <i className="bi bi-trash3 text-sm"></i>
                    </button>
                  </div>

                  {/* Names */}
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h3 className="font-extrabold text-base leading-tight">
                      {cand.chairman_name}
                    </h3>
                    <p className="text-xs text-blue-200 font-medium">
                      &amp; {cand.vice_chairman_name}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3 text-xs">
                  {cand.slogan && (
                    <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-blue-900 italic font-medium">
                      &ldquo;{cand.slogan}&rdquo;
                    </div>
                  )}

                  <div>
                    <span className="font-bold text-slate-800 block mb-1 flex items-center gap-1.5">
                      <i className="bi bi-compass text-blue-600"></i> Visi:
                    </span>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {cand.vision}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 block mb-1 flex items-center gap-1.5">
                      <i className="bi bi-list-check text-blue-600"></i> Misi:
                    </span>
                    <ul className="space-y-1 text-slate-600">
                      {cand.mission?.map((m, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-blue-600 font-bold">•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Bottom votes info */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Perolehan Suara Saat Ini:</span>
                <span className="px-3 py-1 bg-blue-600 text-white font-extrabold rounded-lg">
                  {cand.vote_count || 0} Suara
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Candidate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingCandidate ? `Edit Paslon No. ${candidateNumber}` : 'Tambah Pasangan Calon Baru'}
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

              <div className="grid sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nomor Urut <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={candidateNumber}
                    onChange={(e) => setCandidateNumber(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                  />
                </div>

                <div className="sm:col-span-8">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Slogan / Tagline Singkat
                  </label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder="Contoh: Bergerak Nyata, SMP Berprestasi"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Calon Ketua OSIS <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={chairmanName}
                    onChange={(e) => setChairmanName(e.target.value)}
                    placeholder="Contoh: Muhammad Farhan"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Calon Wakil Ketua OSIS <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={viceChairmanName}
                    onChange={(e) => setViceChairmanName(e.target.value)}
                    placeholder="Contoh: Alya Siti Nurhaliza"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Photo Input (URL or File) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Foto Pasangan Calon (URL atau Upload)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://... atau pilih upload file di kanan"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-[11px]"
                  />
                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer font-bold flex items-center gap-1">
                    <i className="bi bi-upload"></i>
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Vision */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Visi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  placeholder="Rumusan visi pasangan calon..."
                  rows={2}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Mission Items */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700">
                    Poin-Poin Misi <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addMissionRow}
                    className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <i className="bi bi-plus-circle"></i>
                    <span>Tambah Misi</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {missionItems.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-center font-bold text-slate-400">{idx + 1}.</span>
                      <input
                        type="text"
                        value={m}
                        onChange={(e) => updateMissionRow(idx, e.target.value)}
                        placeholder={`Misi ${idx + 1}`}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      {missionItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMissionRow(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
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
                  {saving ? 'Menyimpan...' : 'Simpan Kandidat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl">
              <i className="bi bi-trash3-fill"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Hapus Paslon No. {deletingCandidate.candidate_number}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Kandidat <strong>{deletingCandidate.chairman_name}</strong> &amp; <strong>{deletingCandidate.vice_chairman_name}</strong> akan dihapus permanen.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCandidate(null)}
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
