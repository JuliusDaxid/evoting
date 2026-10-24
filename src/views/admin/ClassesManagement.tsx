import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { ClassItem, Student } from '../../types';

export const ClassesManagement: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [className, setClassName] = useState('');
  const [classDesc, setClassDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deletingClass, setDeletingClass] = useState<ClassItem | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [classList, studentList] = await Promise.all([
        dbService.getClasses(),
        dbService.getStudents(),
      ]);
      setClasses(classList);
      setStudents(studentList);
    } catch (err) {
      console.error('Failed to load classes', err);
    } finally {
      setLoading(false);
    }
  };

  const getStudentCount = (classId: string) => {
    return students.filter((s) => s.class_id === classId).length;
  };

  const openAddModal = () => {
    setEditingClass(null);
    setClassName('');
    setClassDesc('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ClassItem) => {
    setEditingClass(item);
    setClassName(item.name);
    setClassDesc(item.description || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      setFormError('Nama kelas wajib diisi (misal: VII A)');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingClass) {
        await dbService.updateClass(editingClass.id, className, classDesc);
      } else {
        await dbService.createClass(className, classDesc);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan kelas';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingClass) return;
    try {
      await dbService.deleteClass(deletingClass.id);
      setDeletingClass(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete class', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <i className="bi bi-building text-blue-600"></i>
            <span>Data Kelas / Rombongan Belajar</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data kelas untuk pengelompokan Daftar Pemilih Tetap (DPT) siswa SMP.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
        >
          <i className="bi bi-plus-lg"></i>
          <span>Tambah Kelas Baru</span>
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Memuat data kelas...
          </div>
        ) : classes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <i className="bi bi-building-slash text-4xl text-slate-300"></i>
            <p className="text-xs font-medium">Belum ada kelas terdaftar.</p>
            <button
              onClick={openAddModal}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Tambah Kelas Pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-14 text-center">No</th>
                  <th className="py-3 px-4">Nama Kelas</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4 text-center">Jumlah Siswa</th>
                  <th className="py-3 px-4 text-center w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((cls, idx) => {
                  const count = getStudentCount(cls.id);
                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-800 text-sm">
                          {cls.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {cls.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                          <i className="bi bi-person-fill text-[11px]"></i>
                          {count} Siswa
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(cls)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Kelas"
                          >
                            <i className="bi bi-pencil-square text-sm"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingClass(cls)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Kelas"
                          >
                            <i className="bi bi-trash3 text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingClass ? 'Edit Data Kelas' : 'Tambah Kelas Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Kelas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Contoh: VII A, VIII B, IX C"
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Keterangan (Opsional)
                </label>
                <textarea
                  value={classDesc}
                  onChange={(e) => setClassDesc(e.target.value)}
                  placeholder="Keterangan singkat, misal: Kelas 7 Unggulan"
                  rows={3}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl">
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Hapus Kelas {deletingClass.name}?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Data kelas akan dihapus. Siswa di kelas ini akan dialihkan ke status belum ditentukan.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingClass(null)}
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
