import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { OsisMember } from '../../types';

export const OsisMembersView: React.FC = () => {
  const [members, setMembers] = useState<OsisMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'chart' | 'grid' | 'table'>('chart');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSekbid, setFilterSekbid] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<OsisMember | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [sekbid, setSekbid] = useState('Inti');
  const [level, setLevel] = useState<number>(5);
  const [className, setClassName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deletingMember, setDeletingMember] = useState<OsisMember | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await dbService.getOsisMembers();
      setMembers(data);
    } catch (err) {
      console.error('Failed to load OSIS members', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingMember(null);
    setName('');
    setRole('Koordinator Sekbid');
    setSekbid('Sekbid 1');
    setLevel(5);
    setClassName('VIII A');
    setPhone('');
    setPhotoUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (m: OsisMember) => {
    setEditingMember(m);
    setName(m.name);
    setRole(m.role);
    setSekbid(m.sekbid || 'Inti');
    setLevel(m.level || 5);
    setClassName(m.class_name);
    setPhone(m.phone || '');
    setPhotoUrl(m.photo_url || '');
    setFormError(null);
    setIsModalOpen(true);
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
    if (!name.trim()) {
      setFormError('Nama lengkap anggota wajib diisi');
      return;
    }
    if (!role.trim()) {
      setFormError('Jabatan wajib diisi');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingMember) {
        await dbService.updateOsisMember(editingMember.id, {
          name: name.trim(),
          role: role.trim(),
          sekbid,
          level,
          class_name: className.trim(),
          phone: phone.trim(),
          photo_url: photoUrl.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        });
      } else {
        await dbService.createOsisMember({
          name: name.trim(),
          role: role.trim(),
          sekbid,
          level,
          class_name: className.trim(),
          phone: phone.trim(),
          photo_url: photoUrl.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          period: 'Masa Bakti 2026/2027',
          is_active: true,
        });
      }
      setIsModalOpen(false);
      await loadMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan anggota';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMember) return;
    try {
      await dbService.deleteOsisMember(deletingMember.id);
      setDeletingMember(null);
      await loadMembers();
    } catch (err) {
      console.error('Failed to delete member', err);
    }
  };

  // Grouping members by level for hierarchical visual chart
  const pembinaList = members.filter((m) => m.level === 1);
  const ketuaList = members.filter((m) => m.level === 2);
  const wakilList = members.filter((m) => m.level === 3);
  const bphList = members.filter((m) => m.level === 4);
  const sekbidList = members.filter((m) => m.level === 5);
  const anggotaList = members.filter((m) => m.level === 6);

  const filteredMembers = members.filter((m) => {
    if (filterSekbid !== 'all' && m.sekbid !== filterSekbid) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.class_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getRoleBadgeStyle = (levelNum: number) => {
    switch (levelNum) {
      case 1:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 2:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 3:
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 4:
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 5:
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 6:
        return 'bg-sky-100 text-sky-800 border-sky-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const renderMemberCard = (m: OsisMember, compact = false) => (
    <div
      key={m.id}
      className={`bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden ${
        compact ? 'w-56' : 'w-full'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-xs">
          <img
            src={m.photo_url}
            alt={m.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
            }}
          />
        </div>

        <div className="truncate flex-1">
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mb-1 truncate max-w-full ${getRoleBadgeStyle(
              m.level
            )}`}
          >
            {m.role}
          </span>
          <h4 className="font-extrabold text-xs text-slate-800 truncate" title={m.name}>
            {m.name}
          </h4>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-600">
              {m.class_name}
            </span>
            {m.sekbid && m.sekbid !== 'Inti' && (
              <span className="text-[10px] text-blue-600 font-semibold truncate">
                {m.sekbid}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        {m.phone ? (
          <a
            href={`https://wa.me/${m.phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200"
            title="Chat via WhatsApp"
          >
            <i className="bi bi-whatsapp"></i>
            <span>WhatsApp</span>
          </a>
        ) : (
          <span className="text-[10px] text-slate-400 italic">No WA -</span>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openEditModal(m)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Edit Pengurus"
          >
            <i className="bi bi-pencil-square"></i>
          </button>
          <button
            type="button"
            onClick={() => setDeletingMember(m)}
            className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Hapus Pengurus"
          >
            <i className="bi bi-trash3"></i>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <i className="bi bi-diagram-3-fill text-blue-600"></i>
            <span>Struktur Organisasi &amp; Anggota Pengurus OSIS</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Bagan kepengurusan visual hierarki, data pengurus harian (BPH), dan koordinator sekbid.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'chart' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="bi bi-diagram-2"></i>
              <span className="hidden sm:inline">Bagan Visual</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'grid' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="bi bi-grid-fill"></i>
              <span className="hidden sm:inline">Grid Kartu</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="bi bi-table"></i>
              <span className="hidden sm:inline">Tabel</span>
            </button>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <i className="bi bi-person-plus-fill"></i>
            <span>Tambah Pengurus</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR (for Grid and Table mode) */}
      {viewMode !== 'chart' && (
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 grid sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-7 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <i className="bi bi-search text-xs"></i>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pengurus, jabatan, atau kelas..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="sm:col-span-5">
            <select
              value={filterSekbid}
              onChange={(e) => setFilterSekbid(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="all">Semua Sekbid &amp; Divisi ({members.length})</option>
              <option value="Inti">Pengurus Inti &amp; Pembina</option>
              <option value="Sekbid 1">Sekbid 1 (Keagamaan)</option>
              <option value="Sekbid 2">Sekbid 2 (Kedisiplinan)</option>
              <option value="Sekbid 3">Sekbid 3 (Seni &amp; Olahraga)</option>
              <option value="Sekbid 4">Sekbid 4 (TIK &amp; Komunikasi)</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-500">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Memuat struktur kepengurusan OSIS...
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <i className="bi bi-diagram-3 text-4xl text-slate-300"></i>
          <h3 className="font-bold text-slate-700">Belum Ada Data Pengurus OSIS</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Mulai susun struktur organisasi OSIS dengan menambahkan pembina dan pengurus inti.
          </p>
          <button
            onClick={openAddModal}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            + Tambah Pengurus Pertama
          </button>
        </div>
      ) : viewMode === 'chart' ? (
        /* ======================================================== */
        /* BAGAN STRUKTUR ORGANISASI VISUAL ELEGAN */
        /* ======================================================== */
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-10 overflow-x-auto">
          {/* Level 1: Pembina */}
          <div className="text-center space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-extrabold text-[11px] border border-amber-200 uppercase tracking-wider">
              Level 1: Pembina OSIS &amp; Kesiswaan
            </span>
            <div className="flex justify-center gap-4 flex-wrap">
              {pembinaList.map((m) => renderMemberCard(m, true))}
            </div>
            {/* Visual connector line */}
            <div className="w-0.5 h-6 bg-slate-300 mx-auto"></div>
          </div>

          {/* Level 2 & 3: Ketua & Wakil Ketua */}
          <div className="text-center space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-800 font-extrabold text-[11px] border border-blue-200 uppercase tracking-wider">
              Level 2 &amp; 3: Pimpinan Umum OSIS
            </span>
            <div className="flex justify-center gap-6 flex-wrap">
              {ketuaList.map((m) => renderMemberCard(m, true))}
              {wakilList.map((m) => renderMemberCard(m, true))}
            </div>
            {/* Visual connector line */}
            <div className="w-0.5 h-6 bg-slate-300 mx-auto"></div>
          </div>

          {/* Level 4: BPH (Sekretaris & Bendahara) */}
          <div className="text-center space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-teal-50 text-teal-800 font-extrabold text-[11px] border border-teal-200 uppercase tracking-wider">
              Level 4: Badan Pengurus Harian (BPH)
            </span>
            <div className="flex justify-center gap-4 flex-wrap">
              {bphList.map((m) => renderMemberCard(m, true))}
            </div>
            {/* Visual connector line */}
            <div className="w-0.5 h-6 bg-slate-300 mx-auto"></div>
          </div>

          {/* Level 5: Sekbid 1 - 8 */}
          <div className="text-center space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-purple-50 text-purple-800 font-extrabold text-[11px] border border-purple-300 uppercase tracking-wider">
              Level 5: Koordinator Seksi Bidang (Sekbid)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
              {sekbidList.map((m) => renderMemberCard(m))}
            </div>
            {/* Visual connector line */}
            <div className="w-0.5 h-6 bg-slate-300 mx-auto"></div>
          </div>

          {/* Level 6: Anggota Bidang */}
          <div className="text-center space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-sky-50 text-sky-800 font-extrabold text-[11px] border border-sky-300 uppercase tracking-wider">
              Level 6: Anggota Bidang / Sub-Seksi
            </span>
            {anggotaList.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada anggota bidang terdaftar.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                {anggotaList.map((m) => renderMemberCard(m))}
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID KARTU */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMembers.map((m) => renderMemberCard(m))}
        </div>
      ) : (
        /* TABEL LENGKAP */
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Pengurus</th>
                  <th className="py-3 px-4">Jabatan</th>
                  <th className="py-3 px-4">Sekbid</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Kontak WhatsApp</th>
                  <th className="py-3 px-4 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={m.photo_url}
                          alt={m.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-extrabold text-slate-800 text-xs block">
                            {m.name}
                          </span>
                          <span className="text-[10px] text-slate-400">{m.period}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeStyle(
                          m.level
                        )}`}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {m.sekbid || '-'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {m.class_name}
                    </td>
                    <td className="py-3 px-4">
                      {m.phone ? (
                        <a
                          href={`https://wa.me/${m.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-bold"
                        >
                          <i className="bi bi-whatsapp"></i>
                          <span>{m.phone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(m)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <i className="bi bi-pencil-square"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingMember(m)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
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

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingMember ? 'Edit Data Pengurus OSIS' : 'Tambah Pengurus OSIS Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Muhammad Farhan Pratama"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jabatan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Contoh: Ketua Umum / Sekretaris"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Level Bagan Struktur
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value={1}>Level 1: Pembina OSIS</option>
                    <option value={2}>Level 2: Ketua Umum</option>
                    <option value={3}>Level 3: Wakil Ketua</option>
                    <option value={4}>Level 4: BPH (Sek/Ben)</option>
                    <option value={5}>Level 5: Koordinator Sekbid</option>
                    <option value={6}>Level 6: Anggota Bidang</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Divisi / Sekbid
                  </label>
                  <input
                    type="text"
                    value={sekbid}
                    onChange={(e) => setSekbid(e.target.value)}
                    placeholder="Contoh: Inti / Sekbid 1 / Sekbid 3"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kelas <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Contoh: VIII A / Dewan Guru"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nomor WhatsApp
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <i className="bi bi-whatsapp"></i>
                  </span>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Foto Profil (URL atau Upload)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://... atau upload file di samping"
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
                  {saving ? 'Menyimpan...' : 'Simpan Pengurus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl">
              <i className="bi bi-trash3-fill"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Hapus Data Pengurus?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Pengurus <strong>{deletingMember.name}</strong> ({deletingMember.role}) akan dihapus dari bagan organisasi.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
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
