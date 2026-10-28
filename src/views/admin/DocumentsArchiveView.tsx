import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { DocumentCategory, OsisDocument } from '../../types';

export const DocumentsArchiveView: React.FC = () => {
  const [documents, setDocuments] = useState<OsisDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | DocumentCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<OsisDocument | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('proposal');
  const [fileType, setFileType] = useState<'pdf' | 'docx' | 'xlsx' | 'link' | 'image'>('pdf');
  const [fileUrl, setFileUrl] = useState('');
  const [fileSize, setFileSize] = useState('1.5 MB');
  const [uploadedBy, setUploadedBy] = useState('Sekretaris Umum');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<OsisDocument | null>(null);

  // Delete State
  const [deletingDoc, setDeletingDoc] = useState<OsisDocument | null>(null);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const data = await dbService.getOsisDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingDoc(null);
    setTitle('');
    setCategory('proposal');
    setFileType('pdf');
    setFileUrl('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
    setFileSize('1.8 MB');
    setUploadedBy('Sekretaris Umum');
    setDescription('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (doc: OsisDocument) => {
    setEditingDoc(doc);
    setTitle(doc.title);
    setCategory(doc.category);
    setFileType(doc.file_type);
    setFileUrl(doc.file_url);
    setFileSize(doc.file_size || '1.0 MB');
    setUploadedBy(doc.uploaded_by);
    setDescription(doc.description || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const [uploadingFile, setUploadingFile] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Hitung ukuran file dalam MB atau KB
    const sizeInMB = file.size > 1024 * 1024 
      ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      : Math.max(1, Math.round(file.size / 1024)) + ' KB';
    setFileSize(sizeInMB);

    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) setFileType('pdf');
    else if (name.endsWith('.doc') || name.endsWith('.docx')) setFileType('docx');
    else if (name.endsWith('.xls') || name.endsWith('.xlsx')) setFileType('xlsx');
    else if (name.match(/\.(png|jpe?g|webp|gif)$/)) setFileType('image');

    // Jika judul masih kosong, isi otomatis dari nama berkas
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    setUploadingFile(true);
    setFormError(null);
    try {
      const res = await dbService.uploadDocumentFile(file);
      if (res.success && res.publicUrl) {
        setFileUrl(res.publicUrl);
      } else {
        throw new Error(res.error || 'Gagal mengunggah berkas ke Cloud Storage');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah berkas ke Cloud Storage';
      setFormError(`Upload gagal: ${msg}`);
    } finally {
      setUploadingFile(false);
      // Reset input agar bisa re-upload file dengan nama yang sama jika diperlukan
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Judul dokumen wajib diisi');
      return;
    }
    if (!fileUrl.trim()) {
      setFormError('URL atau Berkas file wajib diisi');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      if (editingDoc) {
        await dbService.updateOsisDocument(editingDoc.id, {
          title: title.trim(),
          category,
          file_type: fileType,
          file_url: fileUrl.trim(),
          file_size: fileSize,
          uploaded_by: uploadedBy.trim(),
          description: description.trim(),
        });
      } else {
        await dbService.createOsisDocument({
          title: title.trim(),
          category,
          file_type: fileType,
          file_url: fileUrl.trim(),
          file_size: fileSize,
          uploaded_by: uploadedBy.trim(),
          date: today,
          description: description.trim(),
        });
      }
      setIsModalOpen(false);
      await loadDocs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan arsip';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDoc) return;
    try {
      await dbService.deleteOsisDocument(deletingDoc.id);
      setDeletingDoc(null);
      await loadDocs();
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <i className="bi bi-file-earmark-pdf-fill text-rose-600 text-3xl"></i>;
      case 'docx':
        return <i className="bi bi-file-earmark-word-fill text-blue-600 text-3xl"></i>;
      case 'xlsx':
        return <i className="bi bi-file-earmark-excel-fill text-emerald-600 text-3xl"></i>;
      case 'link':
        return <i className="bi bi-link-45deg text-purple-600 text-3xl"></i>;
      case 'image':
        return <i className="bi bi-file-earmark-image-fill text-amber-600 text-3xl"></i>;
      default:
        return <i className="bi bi-file-earmark-text-fill text-slate-600 text-3xl"></i>;
    }
  };

  const getCategoryBadge = (cat: DocumentCategory) => {
    switch (cat) {
      case 'proposal':
        return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">Proposal</span>;
      case 'lpj':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">LPJ</span>;
      case 'surat':
        return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200">Surat Menyurat</span>;
      case 'notulensi':
        return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">Notulensi</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">Dokumentasi</span>;
    }
  };

  const filteredDocs = documents.filter((d) => {
    if (activeCategory !== 'all' && d.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.uploaded_by.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <i className="bi bi-folder-symlink-fill text-blue-600"></i>
            <span>Pengarsipan Dokumen Digital (E-Archive)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pusat penyimpanan digital Proposal Kegiatan, Laporan Pertanggungjawaban (LPJ), Surat Masuk/Keluar, dan Notulensi Rapat.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
        >
          <i className="bi bi-cloud-arrow-up-fill"></i>
          <span>Upload / Simpan Dokumen</span>
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'Semua Berkas' },
              { id: 'proposal', label: 'Proposal' },
              { id: 'lpj', label: 'LPJ' },
              { id: 'surat', label: 'Surat Menyurat' },
              { id: 'notulensi', label: 'Notulensi' },
              { id: 'dokumentasi', label: 'Dokumentasi' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <i className="bi bi-search text-xs"></i>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari arsip dokumen..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Document Grid Cards */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-500">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Memuat berkas arsip...
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <i className="bi bi-folder2-open text-4xl text-slate-300"></i>
          <h3 className="font-bold text-slate-700">Belum Ada Dokumen Terarsip</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Arsipkan berkas proposal atau surat resmi OSIS agar rapi dan mudah diakses kembali kapan saja.
          </p>
          <button
            onClick={openAddModal}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            + Upload Dokumen Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 hover:shadow-md transition flex flex-col justify-between group space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-105 transition-transform">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div>{getCategoryBadge(doc.category)}</div>
                </div>

                <h4 className="font-extrabold text-xs text-slate-800 leading-snug line-clamp-2" title={doc.title}>
                  {doc.title}
                </h4>

                {doc.description && (
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {doc.description}
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{doc.date}</span>
                  <span className="font-mono">{doc.file_size || '1.0 MB'}</span>
                </div>

                <div className="flex items-center justify-between gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg transition flex items-center justify-center gap-1"
                  >
                    <i className="bi bi-eye"></i>
                    <span>Pratinjau</span>
                  </button>

                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={doc.title}
                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    title="Buka / Unduh Berkas"
                  >
                    <i className="bi bi-download"></i>
                  </a>

                  <button
                    type="button"
                    onClick={() => openEditModal(doc)}
                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    title="Edit Data Dokumen"
                  >
                    <i className="bi bi-pencil-square"></i>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingDoc(doc)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus Dokumen"
                  >
                    <i className="bi bi-trash3"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3 truncate">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg">
                  <i className="bi bi-file-earmark-text"></i>
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-sm truncate">{previewDoc.title}</h3>
                  <span className="text-[10px] text-slate-400">
                    Kategori: {previewDoc.category.toUpperCase()} • Diunggah oleh: {previewDoc.uploaded_by}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setPreviewDoc(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <i className="bi bi-x-lg text-base"></i>
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-blue-900">Tautan Akses Dokumen</h4>
                  <p className="text-[11px] text-blue-700 truncate max-w-md font-mono mt-0.5">
                    {previewDoc.file_url}
                  </p>
                </div>
                <a
                  href={previewDoc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0 flex items-center gap-1.5"
                >
                  <i className="bi bi-box-arrow-up-right"></i>
                  <span>Buka di Tab Baru</span>
                </a>
              </div>

              {previewDoc.description && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700">
                  <span className="font-bold block mb-1">Catatan Dokumen:</span>
                  <p>{previewDoc.description}</p>
                </div>
              )}

              {/* In-app frame preview if PDF/Image */}
              {previewDoc.file_type === 'pdf' || previewDoc.file_type === 'image' ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden h-96 bg-slate-100 flex items-center justify-center">
                  <iframe
                    src={previewDoc.file_url}
                    className="w-full h-full"
                    title={previewDoc.title}
                  />
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <i className="bi bi-file-earmark-arrow-down text-4xl text-blue-500"></i>
                  <p className="text-xs font-semibold">
                    Dokumen ini adalah berkas {previewDoc.file_type.toUpperCase()} / Tautan Eksternal.
                  </p>
                  <a
                    href={previewDoc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs font-bold text-blue-600 underline"
                  >
                    Klik di sini untuk mengunduh / membuka berkas
                  </a>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingDoc ? 'Edit Data Dokumen' : 'Upload / Simpan Arsip Dokumen'}
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
                  Nama / Judul Dokumen <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Proposal Peringatan Hari Pahlawan 2026"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori Dokumen
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="proposal">Proposal Kegiatan</option>
                    <option value="lpj">Laporan Pertanggungjawaban (LPJ)</option>
                    <option value="surat">Surat Menyurat</option>
                    <option value="notulensi">Notulensi Rapat</option>
                    <option value="dokumentasi">Dokumentasi &amp; Foto</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Format File
                  </label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="docx">Word (.docx)</option>
                    <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
                    <option value="link">Tautan Cloud (G-Drive / Docs)</option>
                    <option value="image">Gambar / Foto (.png, .jpg)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Berkas Dokumen (Cloud Storage)
                  </label>
                  <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-mono">
                    <i className="bi bi-cloud-arrow-up mr-1"></i>bucket: archives
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://... atau klik Pilih Berkas"
                    required
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-[11px]"
                  />
                  <label className={`px-3.5 py-2 ${uploadingFile ? 'bg-blue-100 text-blue-700 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'} rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition`}>
                    {uploadingFile ? (
                      <>
                        <i className="bi bi-arrow-repeat animate-spin"></i>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-upload"></i>
                        <span>Pilih Berkas</span>
                      </>
                    )}
                    <input
                      type="file"
                      disabled={uploadingFile}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  Berkas fisik (PDF, Word, Excel, Gambar) langsung disimpan di Supabase Cloud Storage. Tidak membebani memori lokal (bebas error kuota penuh).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pengunggah / PJ
                  </label>
                  <input
                    type="text"
                    value={uploadedBy}
                    onChange={(e) => setUploadedBy(e.target.value)}
                    placeholder="Contoh: Zahra Cantika (Sekretaris)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ukuran Berkas
                  </label>
                  <input
                    type="text"
                    value={fileSize}
                    onChange={(e) => setFileSize(e.target.value)}
                    placeholder="Contoh: 1.5 MB"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Keterangan Singkat
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ringkasan isi dokumen atau nomor surat..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Berkas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl">
              <i className="bi bi-trash3-fill"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Hapus Dokumen Arsip?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Dokumen <strong>{deletingDoc.title}</strong> akan dihapus permanen dari e-archive.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
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
