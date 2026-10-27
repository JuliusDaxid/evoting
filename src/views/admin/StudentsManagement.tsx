import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { dbService } from '../../services/dbService';
import { ClassItem, Student } from '../../types';

export const StudentsManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [voteFilter, setVoteFilter] = useState<'all' | 'voted' | 'not_voted'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'L' | 'P'>('all');

  // Pagination states (Presets: 15, 30, 50, or custom input)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(15);
  const [customRowsInput, setCustomRowsInput] = useState<string>('15');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  // Toast notification for instant optimistic updates
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual CRUD Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [nisn, setNisn] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [classId, setClassId] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [religion, setReligion] = useState('Islam');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Excel Import states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewRows, setImportPreviewRows] = useState<Array<{
    nisn: string;
    name: string;
    birth_date: string;
    class_name: string;
    gender: 'L' | 'P';
    religion: string;
    address: string;
  }>>([]);
  const [totalRowsInFile, setTotalRowsInFile] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{
    successCount: number;
    skippedCount: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Delete modal
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentList, classList] = await Promise.all([
        dbService.getStudents(),
        dbService.getClasses(),
      ]);
      setStudents(studentList);
      setClasses(classList);
    } catch (err) {
      console.error('Failed to load students data', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setNisn('');
    setName('');
    setBirthDate('2011-01-01');
    setClassId(classes[0]?.id || '');
    setGender('L');
    setReligion('Islam');
    setAddress('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Student) => {
    setEditingStudent(s);
    setNisn(s.nisn);
    setName(s.name);
    setBirthDate(s.birth_date);
    setClassId(s.class_id || '');
    setGender(s.gender === 'P' ? 'P' : 'L');
    setReligion(s.religion || 'Islam');
    setAddress(s.address || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reset page when filter or rowsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClassId, searchQuery, voteFilter, genderFilter, rowsPerPage]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisn.trim()) {
      setFormError('NISN wajib diisi');
      return;
    }
    if (!name.trim()) {
      setFormError('Nama siswa wajib diisi');
      return;
    }
    if (!birthDate) {
      setFormError('Tanggal lahir wajib diisi');
      return;
    }

    setSaving(true);
    setFormError(null);

    const targetClassName = classes.find((c) => c.id === classId)?.name || (!classId ? 'Belum Ditentukan' : '');

    try {
      if (editingStudent) {
        // --- OPTIMISTIC UPDATE: Instant local state update without delay/refresh ---
        const studentId = editingStudent.id;
        const updatedStudent: Student = {
          ...editingStudent,
          nisn: nisn.trim(),
          name: name.trim(),
          birth_date: birthDate,
          class_id: classId || undefined,
          class_name: targetClassName || editingStudent.class_name || 'Belum Ditentukan',
          gender,
          religion,
          address: address.trim(),
        };

        const backupList = [...students];

        // 1. Instantly update local state
        setStudents((prev) =>
          prev.map((s) => (s.id === studentId ? updatedStudent : s))
        );

        // 2. Instantly close modal & show feedback toast
        setIsModalOpen(false);
        setSaving(false);
        showToast(`Data siswa "${updatedStudent.name}" berhasil diperbarui secara instan!`);

        // 3. Asynchronously persist to database in background
        dbService
          .updateStudent(studentId, {
            nisn: updatedStudent.nisn,
            name: updatedStudent.name,
            birth_date: updatedStudent.birth_date,
            class_id: updatedStudent.class_id,
            gender: updatedStudent.gender,
            religion: updatedStudent.religion,
            address: updatedStudent.address,
          })
          .catch((err) => {
            console.error('Background student update failed', err);
            // Rollback on failure
            setStudents(backupList);
            showToast(`Gagal memperbarui ke server: ${err instanceof Error ? err.message : 'Kesalahan'}`);
          });

        return;
      } else {
        // Create new student
        const created = await dbService.createStudent({
          nisn: nisn.trim(),
          name: name.trim(),
          birth_date: birthDate,
          class_id: classId || undefined,
          gender,
          religion,
          address: address.trim(),
        });

        // Instant prepend to local state
        setStudents((prev) => [created, ...prev]);
        setIsModalOpen(false);
        setSaving(false);
        showToast(`Siswa baru "${created.name}" berhasil ditambahkan!`);
        return;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan siswa';
      setFormError(msg);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;
    try {
      await dbService.deleteStudent(deletingStudent.id);
      setDeletingStudent(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete student', err);
    }
  };

  const handleResetVote = async (student: Student) => {
    if (confirm(`Reset status hak suara untuk siswa ${student.name}? Siswa akan dapat memilih kembali.`)) {
      await dbService.resetStudentVote(student.id);
      await loadData();
    }
  };

  const handleAddSampleBatch = async () => {
    const randomClass = classes[Math.floor(Math.random() * classes.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const demoBatch = [
      {
        nisn: `008123${randomNum}`,
        name: `Siswa Baru ${randomNum}`,
        birth_date: '2011-06-15',
        class_id: randomClass?.id,
        gender: 'L' as const,
        religion: 'Islam',
        address: 'Jl. Pemuda No. 12',
      },
      {
        nisn: `008124${randomNum}`,
        name: `Santika Putri ${randomNum}`,
        birth_date: '2011-09-20',
        class_id: randomClass?.id,
        gender: 'P' as const,
        religion: 'Islam',
        address: 'Jl. Melati RT 02/03',
      },
    ];
    for (const item of demoBatch) {
      try {
        await dbService.createStudent(item);
      } catch (e) {
        console.warn(e);
      }
    }
    await loadData();
  };

  // Helper untuk parsing serial date Excel atau string tanggal
  const parseExcelDate = (raw: any): string => {
    if (!raw) return '2011-01-01';
    if (typeof raw === 'number') {
      const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    const str = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const parts = str.split(/[/-]/);
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return str;
  };

  // Unduh Template Excel Contoh
  const handleDownloadTemplate = () => {
    const headers = [
      ['NISN', 'Nama Lengkap', 'Tanggal Lahir (YYYY-MM-DD)', 'Jenis Kelamin (L/P)', 'Agama', 'Alamat']
    ];

    const sampleRows = [
      ['0081234501', 'Ahmad Fauzi Pratama', '2011-05-14', 'L', 'Islam', 'Jl. Melati No. 12, Dayun'],
      ['0081234502', 'Siti Nurhaliza', '2011-08-22', 'P', 'Islam', 'Jl. Mawar No. 05, Dayun'],
      ['0081234503', 'Daniel Mananta', '2011-03-10', 'L', 'Kristen Protestan', 'Perum Dayun Indah Blok B2'],
      ['0081234504', 'Ni Luh Putu Ayu', '2011-11-19', 'P', 'Hindu', 'Jl. Cendrawasih No. 08'],
      ['0081234505', 'Maria Angelina', '2011-12-05', 'P', 'Katolik', 'Jl. Gajah Mada RT 03/01'],
      ['0081234506', 'Rian Hidayat', '2011-04-18', 'L', 'Islam', 'Jl. Sudirman No. 44'],
      ['0081234507', 'Kevin Tanujaya', '2010-09-12', 'L', 'Buddha', 'Jl. Flamboyan No. 15'],
      ['0081234508', 'Lestari Handayani', '2010-07-28', 'P', 'Islam', 'Desa Dayun RT 01/RW 02'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...sampleRows]);

    // Set Column Widths
    worksheet['!cols'] = [
      { wch: 15 }, // NISN
      { wch: 25 }, // Nama
      { wch: 25 }, // Tanggal Lahir
      { wch: 20 }, // Jenis Kelamin
      { wch: 18 }, // Agama
      { wch: 35 }, // Alamat
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DPT_Siswa');
    XLSX.writeFile(workbook, 'Template_DPT_Siswa_eOSIS.xlsx');
  };

  // Handle Seleksi File Excel / CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportFeedback(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
        setTotalRowsInFile(rawRows.length);

        // Normalize columns (Catatan: data kelas dari Excel sengaja tidak diambil dan status diset 'Belum Ditentukan')
        const parsedRows = rawRows.map((row) => {
          const keys = Object.keys(row);
          const findVal = (matchKeywords: string[]) => {
            const key = keys.find((k) =>
              matchKeywords.some((kw) => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(kw.replace(/[^a-z0-9]/g, '')))
            );
            return key ? row[key] : '';
          };

          const rawNisn = String(findVal(['nisn', 'nomorinduk', 'id']) || '').trim();
          const rawName = String(findVal(['nama', 'name', 'namasiswa', 'namalengkap']) || '').trim();
          const rawBirth = parseExcelDate(findVal(['tanggallahir', 'tgllahir', 'birthdate', 'tgl', 'lahir']));
          const rawGender = String(findVal(['jeniskelamin', 'gender', 'jk', 'lp']) || '').trim().toUpperCase();
          const rawReligion = String(findVal(['agama', 'religion']) || 'Islam').trim();
          const rawAddress = String(findVal(['alamat', 'address', 'domisili', 'tempattinggal']) || '').trim();

          const genderVal: 'L' | 'P' = rawGender.startsWith('P') || rawGender.startsWith('W') ? 'P' : 'L';

          return {
            nisn: rawNisn,
            name: rawName,
            birth_date: rawBirth || '2011-01-01',
            class_name: 'Belum Ditentukan',
            gender: genderVal,
            religion: rawReligion || 'Islam',
            address: rawAddress,
          };
        });

        setImportPreviewRows(parsedRows);
      } catch (err) {
        console.error('Error parsing excel file', err);
        alert('Gagal membaca file Excel/CSV. Pastikan file dalam format yang benar.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Eksekusi Bulk Import
  const handleProcessImport = async () => {
    if (importPreviewRows.length === 0) return;
    setImporting(true);
    setImportFeedback(null);

    try {
      const result = await dbService.bulkImportStudents(importPreviewRows);
      setImportFeedback(result);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses import data.';
      setImportFeedback({
        successCount: 0,
        skippedCount: importPreviewRows.length,
        errors: [msg],
      });
    } finally {
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportPreviewRows([]);
    setImportFeedback(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const unassignedCount = students.filter((s) => !s.class_id || s.class_name === 'Belum Ditentukan').length;

  // Filter students
  const filteredStudents = students.filter((s) => {
    if (selectedClassId === 'unassigned') {
      if (s.class_id && s.class_name !== 'Belum Ditentukan') return false;
    } else if (selectedClassId && s.class_id !== selectedClassId) {
      return false;
    }
    if (voteFilter === 'voted' && !s.has_voted) return false;
    if (voteFilter === 'not_voted' && s.has_voted) return false;
    if (genderFilter !== 'all' && s.gender !== genderFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.religion && s.religion.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const votedTotal = students.filter((s) => s.has_voted).length;
  const notVotedTotal = students.length - votedTotal;

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / rowsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredStudents.length);
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Custom rows per page submit handler
  const handleApplyCustomRows = () => {
    const num = parseInt(customRowsInput, 10);
    if (!isNaN(num) && num > 0) {
      setRowsPerPage(num);
      setCurrentPage(1);
    } else {
      setCustomRowsInput(String(rowsPerPage));
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification for Instant Optimistic Updates */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-fade-in">
          <i className="bi bi-check-circle-fill text-emerald-400 text-base"></i>
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <i className="bi bi-people-fill text-blue-600"></i>
            <span>Data Siswa / Daftar Pemilih Tetap (DPT)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data pemilih, jenis kelamin, agama, alamat, verifikasi NISN, dan status hak suara siswa secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Unduh Template Excel */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            title="Download Template Excel (.xlsx) dengan kolom lengkap"
          >
            <i className="bi bi-download text-slate-600"></i>
            <span>Unduh Template</span>
          </button>

          {/* Tombol Import Excel */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            title="Import data siswa massal dari file Excel atau CSV"
          >
            <i className="bi bi-file-earmark-excel-fill"></i>
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={handleAddSampleBatch}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            title="Tambah 2 contoh siswa otomatis"
          >
            <i className="bi bi-person-plus"></i>
            <span className="hidden sm:inline">+ Demo Siswa</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[11px] text-slate-500 font-semibold block">Total Siswa Terdaftar</span>
          <span className="text-xl font-black text-slate-800">{students.length}</span>
        </div>
        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 text-center">
          <span className="text-[11px] text-emerald-800 font-semibold block">Sudah Memilih</span>
          <span className="text-xl font-black text-emerald-700">{votedTotal}</span>
        </div>
        <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 text-center">
          <span className="text-[11px] text-amber-800 font-semibold block">Belum Memilih</span>
          <span className="text-xl font-black text-amber-700">{notVotedTotal}</span>
        </div>
        <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 text-center">
          <span className="text-[11px] text-blue-800 font-semibold block">Komposisi Gender</span>
          <span className="text-xs font-bold text-blue-800">
            L: {students.filter(s => s.gender === 'L').length} | P: {students.filter(s => s.gender === 'P').length}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 grid sm:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="sm:col-span-4 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <i className="bi bi-search text-xs"></i>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, NISN, agama, atau alamat..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Filter Kelas */}
        <div className="sm:col-span-3">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          >
            <option value="">Semua Kelas ({students.length})</option>
            <option value="unassigned">Belum Ditentukan ({unassignedCount})</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Gender */}
        <div className="sm:col-span-2">
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as any)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          >
            <option value="all">Semua Gender</option>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </select>
        </div>

        {/* Filter Status Memilih */}
        <div className="sm:col-span-3">
          <select
            value={voteFilter}
            onChange={(e) => setVoteFilter(e.target.value as any)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          >
            <option value="all">Semua Status Suara</option>
            <option value="not_voted">Belum Memilih</option>
            <option value="voted">Sudah Memilih</option>
          </select>
        </div>
      </div>

      {/* Table Data Siswa */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Memuat data siswa...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <i className="bi bi-person-x text-4xl text-slate-300"></i>
            <p className="text-xs font-medium">Tidak ada data siswa yang cocok dengan filter atau pencarian.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3 w-28">NISN</th>
                  <th className="py-3 px-3">Nama Lengkap &amp; Profil</th>
                  <th className="py-3 px-3 text-center w-14">L/P</th>
                  <th className="py-3 px-3 w-24">Agama</th>
                  <th className="py-3 px-3 w-28">Tgl Lahir</th>
                  <th className="py-3 px-3 w-20">Kelas</th>
                  <th className="py-3 px-3">Alamat</th>
                  <th className="py-3 px-3 text-center w-28">Status Suara</th>
                  <th className="py-3 px-3 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 text-center font-bold text-slate-400">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">
                      {s.nisn}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{s.name}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {s.gender === 'P' ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-bold text-[10px] border border-pink-200" title="Perempuan">
                          P
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200" title="Laki-laki">
                          L
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
                        {s.religion || 'Islam'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {s.birth_date}
                    </td>
                    <td className="py-3 px-3">
                      {!s.class_id || s.class_name === 'Belum Ditentukan' || s.class_name === '-' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[10px] border border-amber-200 whitespace-nowrap">
                          <i className="bi bi-clock-history text-amber-500"></i> Belum Ditentukan
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200 whitespace-nowrap">
                          {s.class_name}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={s.address || '-'}>
                      {s.address ? (
                        <span className="truncate block">{s.address}</span>
                      ) : (
                        <span className="text-slate-300 italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {s.has_voted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 whitespace-nowrap">
                          <i className="bi bi-check-circle-fill"></i> Sudah Memilih
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200 whitespace-nowrap">
                          <i className="bi bi-hourglass-split"></i> Belum Memilih
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {s.has_voted && (
                          <button
                            type="button"
                            onClick={() => handleResetVote(s)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="Reset Hak Suara (Izinkan memilih kembali)"
                          >
                            <i className="bi bi-arrow-counterclockwise text-sm"></i>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Edit Siswa"
                        >
                          <i className="bi bi-pencil-square text-sm"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingStudent(s)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus Siswa"
                        >
                          <i className="bi bi-trash3 text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* INTERACTIVE PAGINATION BAR */}
          <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Left: Rows Per Page Selector & Custom Input */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <i className="bi bi-list-ol text-slate-400"></i>
                <span>Baris per halaman:</span>
              </span>

              {/* Presets */}
              {[15, 30, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setRowsPerPage(preset);
                    setShowCustomInput(false);
                    setCustomRowsInput(String(preset));
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    rowsPerPage === preset && !showCustomInput
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {preset}
                </button>
              ))}

              {/* Tombol Opsi Kustom */}
              <button
                type="button"
                onClick={() => setShowCustomInput(!showCustomInput)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  showCustomInput || ![15, 30, 50].includes(rowsPerPage)
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Kustom {![15, 30, 50].includes(rowsPerPage) ? `(${rowsPerPage})` : ''}
              </button>

              {/* Input Bebas Jumlah Baris */}
              {showCustomInput && (
                <div className="inline-flex items-center gap-1.5 ml-1 animate-fade-in">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={customRowsInput}
                    onChange={(e) => setCustomRowsInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyCustomRows();
                    }}
                    placeholder="Baris..."
                    className="w-16 px-2 py-1 text-xs text-center font-bold bg-white border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomRows}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition cursor-pointer"
                  >
                    Terapkan
                  </button>
                </div>
              )}
            </div>

            {/* Center: Info Status Baris */}
            <div className="text-xs text-slate-500 text-center">
              Menampilkan <span className="font-extrabold text-slate-800">{filteredStudents.length === 0 ? 0 : startIndex + 1}</span> -{' '}
              <span className="font-extrabold text-slate-800">{endIndex}</span> dari{' '}
              <span className="font-extrabold text-slate-800">{filteredStudents.length}</span> siswa{' '}
              <span className="text-slate-400 font-mono">(Halaman {safeCurrentPage} dari {totalPages})</span>
            </div>

            {/* Right: Page Navigation Buttons */}
            <div className="flex items-center gap-1">
              {/* Tombol Pertama (<<) */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage <= 1}
                className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-bold"
                title="Halaman Pertama"
              >
                <i className="bi bi-chevron-double-left"></i>
              </button>

              {/* Tombol Sebelumnya (<) */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-bold"
                title="Halaman Sebelumnya"
              >
                <i className="bi bi-chevron-left"></i>
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>

              {/* Page Number Chips */}
              <div className="flex items-center gap-1 mx-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    return Math.abs(p - safeCurrentPage) <= 1;
                  })
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === 'number') {
                      const prevPage = arr[idx - 1] as number;
                      if (p - prevPage > 1) {
                        acc.push('...');
                      }
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) => {
                    if (item === '...') {
                      return (
                        <span key={`dots-${idx}`} className="px-1 text-slate-400 font-bold text-xs">
                          ...
                        </span>
                      );
                    }
                    const pageNum = item as number;
                    const isActive = pageNum === safeCurrentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
              </div>

              {/* Tombol Selanjutnya (>) */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-bold"
                title="Halaman Berikutnya"
              >
                <span className="hidden sm:inline">Berikutnya</span>
                <i className="bi bi-chevron-right"></i>
              </button>

              {/* Tombol Terakhir (>>) */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage >= totalPages}
                className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-bold"
                title="Halaman Terakhir"
              >
                <i className="bi bi-chevron-double-right"></i>
              </button>
            </div>
          </div>
        </>
      )}
      </div>

      {/* MODAL IMPORT EXCEL (SheetJS) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <i className="bi bi-file-earmark-excel-fill text-lg"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Import Data Siswa dari Excel / CSV</h3>
                  <p className="text-[11px] text-slate-500">Mendukung format .xlsx, .xls, dan .csv secara otomatis</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Petunjuk & Unduh Template */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-blue-900 flex items-center gap-1.5">
                    <i className="bi bi-file-earmark-spreadsheet text-blue-600"></i>
                    <span>Petunjuk Format Import Excel:</span>
                  </p>
                  <p className="text-blue-700 text-[11px] mt-0.5">
                    Kolom yang dibaca: <strong>NISN</strong>, <strong>Nama Lengkap</strong>, <strong>Tanggal Lahir</strong> (YYYY-MM-DD), <strong>Jenis Kelamin</strong> (L/P), <strong>Agama</strong>, dan <strong>Alamat</strong>.
                  </p>
                  <p className="text-amber-800 text-[11px] mt-1 font-semibold flex items-center gap-1">
                    <i className="bi bi-info-circle-fill text-amber-600"></i>
                    <span>Sesuai ketentuan, data kelas tidak diambil dari Excel dan otomatis berstatus <strong>Belum Ditentukan</strong>. Kelas dapat ditentukan kemudian.</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[11px] shrink-0 transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <i className="bi bi-download"></i> Unduh Format Template
                </button>
              </div>

              {/* Area Upload File */}
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center transition bg-slate-50/50">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="excel-file-input"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="excel-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl shadow-xs">
                    <i className="bi bi-cloud-arrow-up-fill"></i>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 text-xs hover:text-emerald-700">
                      Klik di sini untuk memilih file Excel / CSV
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">.xlsx, .xls, .csv (Maksimal 10 MB)</p>
                  </div>
                  {importFile && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-300">
                      <i className="bi bi-check2"></i> File Terpilih: {importFile.name}
                    </div>
                  )}
                </label>
              </div>

              {/* Hasil Feedback jika sudah diimport */}
              {importFeedback && (
                <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                  importFeedback.successCount > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <i className={`bi ${importFeedback.successCount > 0 ? 'bi-check-circle-fill text-emerald-600' : 'bi-exclamation-triangle-fill text-rose-600'}`}></i>
                    <span>Hasil Import: {importFeedback.successCount} Siswa Berhasil Masuk</span>
                  </div>
                  <p className="text-[11px]">
                    Jumlah data dilewati / duplikat: <strong>{importFeedback.skippedCount}</strong> baris. Seluruh data baru berstatus <em>Belum Ditentukan</em>.
                  </p>
                  {importFeedback.errors.length > 0 && (
                    <div className="mt-2 text-[11px] max-h-24 overflow-y-auto bg-white/70 p-2 rounded-xl border border-rose-200 text-rose-700 space-y-1">
                      {importFeedback.errors.map((err, i) => (
                        <div key={i}>• {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview Tabel Hasil Pembacaan SheetJS */}
              {importPreviewRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Preview Data ({importPreviewRows.length} baris terdeteksi):
                    </span>
                    <span className="text-[11px] text-slate-500">Menampilkan 5 baris pertama</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">NISN</th>
                          <th className="py-2 px-3">Nama Siswa</th>
                          <th className="py-2 px-3">L/P</th>
                          <th className="py-2 px-3">Agama</th>
                          <th className="py-2 px-3">Status Kelas</th>
                          <th className="py-2 px-3">Tgl Lahir</th>
                          <th className="py-2 px-3">Alamat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreviewRows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-slate-700">{row.nisn}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{row.name}</td>
                            <td className="py-2 px-3 text-center font-bold text-blue-700">{row.gender}</td>
                            <td className="py-2 px-3 text-slate-600">{row.religion}</td>
                            <td className="py-2 px-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[10px] border border-amber-200 whitespace-nowrap">
                                <i className="bi bi-clock-history text-amber-500"></i> Belum Ditentukan
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-500">{row.birth_date}</td>
                            <td className="py-2 px-3 text-slate-500 max-w-xs truncate">{row.address || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeImportModal}
                disabled={importing}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleProcessImport}
                disabled={importing || importPreviewRows.length === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {importing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-cloud-arrow-up-fill"></i>
                    <span>Proses Import ({importPreviewRows.length} Siswa)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    NISN (10 Digit) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    placeholder="Contoh: 0081234501"
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tanggal Lahir <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Lengkap Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Muhammad Farhan Pratama"
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Jenis Kelamin */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jenis Kelamin <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('L')}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        gender === 'L'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <i className="bi bi-gender-male"></i>
                      <span>Laki-laki</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('P')}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        gender === 'P'
                          ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <i className="bi bi-gender-female"></i>
                      <span>Perempuan</span>
                    </button>
                  </div>
                </div>

                {/* Agama */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Agama <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={religion}
                    onChange={(e) => setReligion(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen Protestan">Kristen Protestan</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kelas / Rombel
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                >
                  <option value="">-- Belum Ditentukan --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Alamat Lengkap Siswa
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Contoh: Jl. Diponegoro RT 02/03 Desa Dayun"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl">
              <i className="bi bi-trash3-fill"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Hapus Data Siswa?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Siswa <strong>{deletingStudent.name}</strong> (NISN: {deletingStudent.nisn}) akan dihapus dari DPT.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
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
