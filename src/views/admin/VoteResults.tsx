import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dbService } from '../../services/dbService';
import { Candidate, Settings, Student } from '../../types';

interface Props {
  settings: Settings;
}

export const VoteResults: React.FC<Props> = ({ settings }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'donut'>('bar');
  const [downloadSuccessToast, setDownloadSuccessToast] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cList, sList] = await Promise.all([
        dbService.getCandidates(),
        dbService.getStudents(),
      ]);
      setCandidates(cList);
      setStudents(sList);
    } catch (err) {
      console.error('Failed to load vote results', err);
    } finally {
      setLoading(false);
    }
  };

  const totalDPT = students.length;
  const votedStudents = students.filter((s) => s.has_voted).length;
  const notVotedStudents = totalDPT - votedStudents;
  const totalVotesCounted = candidates.reduce((sum, c) => sum + (c.vote_count || 0), 0);
  const participationRate = totalDPT > 0 ? ((votedStudents / totalDPT) * 100).toFixed(1) : '0';

  // Sort candidates by highest vote
  const sortedCandidates = [...candidates].sort((a, b) => b.vote_count - a.vote_count);
  const leadingCandidate = sortedCandidates.length > 0 && totalVotesCounted > 0 ? sortedCandidates[0] : null;

  // Generate and Download Official PDF
  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const schoolName = settings.school_name || 'SMP NEGERI 1 DAYUN';
      const period = settings.election_period || 'Masa Bakti 2026/2027';
      const today = new Date();
      const indonesianDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const indonesianMonths = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const dateFormatted = `${indonesianDays[today.getDay()]}, ${today.getDate()} ${indonesianMonths[today.getMonth()]} ${today.getFullYear()}`;

      // --- KOP SURAT RESMI ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(schoolName.toUpperCase(), 105, 18, { align: 'center' });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('PANITIA PEMILIHAN KETUA & WAKIL KETUA OSIS', 105, 24, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(`Sistem eOSIS Terpadu - ${period}`, 105, 29, { align: 'center' });

      // Garis ganda Kop Surat
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.8);
      doc.line(15, 33, 195, 33);
      doc.setLineWidth(0.3);
      doc.line(15, 34.5, 195, 34.5);

      // --- JUDUL BERITA ACARA ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('BERITA ACARA REKAPITULASI HASIL PENGHITUNGAN SUARA', 105, 43, { align: 'center' });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Nomor Dokumen: BA/eOSIS/${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/01`, 105, 48, { align: 'center' });

      // --- PARAGRAF PEMBUKA ---
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const introText = `Pada hari ini, ${dateFormatted}, telah diselenggarakan Pleno Rekapitulasi Akhir Penghitungan Suara Pemilihan Ketua dan Wakil Ketua Organisasi Siswa Intra Sekolah (OSIS) ${schoolName} untuk ${period}. Pemilihan dilaksanakan secara langsung, umum, bebas, rahasia, jujur, dan adil melalui sistem eOSIS.`;
      const splitIntro = doc.splitTextToSize(introText, 180);
      doc.text(splitIntro, 15, 56);

      // --- RINGKASAN DATA PEMILIHAN (TABEL RINGKASAN) ---
      let startY = 70;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('I. DATA REKAPITULASI PARTISIPASI PEMILIH (DPT)', 15, startY);

      autoTable(doc, {
        startY: startY + 2,
        theme: 'grid',
        head: [['Keterangan Rekapitulasi', 'Jumlah', 'Satuan / Persentase']],
        body: [
          ['Total Daftar Pemilih Tetap (DPT) Terdaftar', `${totalDPT}`, 'Siswa Berhak Memilih'],
          ['Total Pemilih yang Menggunakan Hak Suara', `${votedStudents}`, `Partisipasi: ${participationRate}%`],
          ['Total Pemilih yang Belum / Tidak Memilih (Golput)', `${notVotedStudents}`, `Sisa: ${(100 - parseFloat(participationRate)).toFixed(1)}%`],
          ['Total Suara Sah Masuk ke Sistem', `${totalVotesCounted}`, '100% Suara Sah'],
        ],
        headStyles: {
          fillColor: [30, 64, 175], // blue-800
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'left',
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 2.5,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 95 },
          1: { cellWidth: 35, fontStyle: 'bold', halign: 'center' },
          2: { cellWidth: 50, halign: 'left' },
        },
        margin: { left: 15, right: 15 },
      });

      // --- TABEL HASIL PEROLEHAN SUARA KANDIDAT ---
      const finalY1 = (doc as any).lastAutoTable.finalY + 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('II. PEROLEHAN SUARA MASING-MASING PASANGAN CALON', 15, finalY1);

      const tableData = sortedCandidates.map((c) => {
        const pct = totalVotesCounted > 0 ? ((c.vote_count / totalVotesCounted) * 100).toFixed(1) : '0';
        const isWinner = c.id === leadingCandidate?.id && totalVotesCounted > 0;
        return [
          `No. ${c.candidate_number}`,
          `Ketua: ${c.chairman_name}\nWakil: ${c.vice_chairman_name}`,
          c.slogan ? `"${c.slogan}"` : '-',
          `${c.vote_count} Suara`,
          `${pct}%`,
          isWinner ? 'TERPILIH / TERTINGGI' : 'Calon Terdaftar',
        ];
      });

      autoTable(doc, {
        startY: finalY1 + 3,
        theme: 'striped',
        head: [['No. Urut', 'Pasangan Calon', 'Slogan / Motto', 'Perolehan', 'Persentase', 'Keterangan']],
        body: tableData,
        headStyles: {
          fillColor: [15, 23, 42], // slate-900
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3,
          valign: 'middle',
          textColor: [15, 23, 42],
        },
        columnStyles: {
          0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 55 },
          2: { cellWidth: 42, fontStyle: 'italic', textColor: [71, 85, 105] },
          3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        },
        margin: { left: 15, right: 15 },
      });

      // --- KEPUTUSAN PENETAPAN ---
      const finalY2 = (doc as any).lastAutoTable.finalY + 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('III. KEPUTUSAN PENETAPAN', 15, finalY2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);

      let keputusanText = '';
      if (leadingCandidate && totalVotesCounted > 0) {
        keputusanText = `Berdasarkan hasil penghitungan suara di atas, Panitia Pemilihan menetapkan Pasangan Calon Nomor Urut ${leadingCandidate.candidate_number} atas nama ${leadingCandidate.chairman_name} (Calon Ketua) dan ${leadingCandidate.vice_chairman_name} (Calon Wakil Ketua) dengan perolehan ${leadingCandidate.vote_count} suara (${((leadingCandidate.vote_count / totalVotesCounted) * 100).toFixed(1)}%) secara sah DITETAPKAN SEBAGAI KETUA & WAKIL KETUA OSIS TERPILIH ${period}.`;
      } else {
        keputusanText = `Demikian berita acara rekapitulasi penghitungan suara ini dibuat berdasarkan data aktual pada sistem eOSIS. Belum ada penetapan calon terpilih dikarenakan belum ada suara yang masuk.`;
      }

      const splitKeputusan = doc.splitTextToSize(keputusanText, 180);
      doc.text(splitKeputusan, 15, finalY2 + 5);

      // --- BLOK TANDA TANGAN RESMI ---
      const signY = finalY2 + 22;
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);

      // Kolom Kiri: Kepala Sekolah
      doc.text('Mengetahui / Mengesahkan,', 25, signY);
      doc.setFont('helvetica', 'bold');
      doc.text('Kepala Sekolah', 25, signY + 4);
      doc.setDrawColor(148, 163, 184);
      doc.line(25, signY + 23, 75, signY + 23);
      doc.setFont('helvetica', 'normal');
      doc.text('( Kepala Sekolah / Penanggung Jawab )', 25, signY + 27);
      doc.text('NIP. .................................................', 25, signY + 31);

      // Kolom Tengah: Pembina OSIS
      doc.text('Diperiksa Oleh,', 90, signY);
      doc.setFont('helvetica', 'bold');
      doc.text('Pembina OSIS', 90, signY + 4);
      doc.line(90, signY + 23, 135, signY + 23);
      doc.setFont('helvetica', 'normal');
      doc.text('( Pembina Kesiswaan & OSIS )', 90, signY + 27);
      doc.text('NIP. .....................................', 90, signY + 31);

      // Kolom Kanan: Ketua Panitia
      doc.text(`${schoolName.includes('Dayun') ? 'Dayun' : 'Tempat'}, ${today.getDate()} ${indonesianMonths[today.getMonth()]} ${today.getFullYear()}`, 145, signY);
      doc.setFont('helvetica', 'bold');
      doc.text('Ketua Panitia Pemilihan OSIS', 145, signY + 4);
      doc.line(145, signY + 23, 192, signY + 23);
      doc.setFont('helvetica', 'normal');
      doc.text('( Ketua Panitia Pemilihan )', 145, signY + 27);
      doc.text('NISN. .....................................', 145, signY + 31);

      // Simpan File PDF
      const sanitizedFilename = `Berita_Acara_Pemilihan_OSIS_${period.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(sanitizedFilename);

      setDownloadSuccessToast(true);
      setTimeout(() => setDownloadSuccessToast(false), 4000);
    } catch (e) {
      console.error('Failed to generate PDF', e);
      alert('Terjadi kesalahan saat membuat file PDF Berita Acara.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetAllVotes = async () => {
    setResetting(true);
    try {
      await dbService.resetAllVotes();
      setIsResetModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to reset votes', err);
    } finally {
      setResetting(false);
    }
  };

  // Modern pleasant color palette for candidate charts
  const colors = [
    { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', hex: '#2563eb' },
    { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600', hex: '#059669' },
    { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500', hex: '#d97706' },
    { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600', hex: '#9333ea' },
    { bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-600', hex: '#e11d48' },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi Berhasil Download PDF */}
      {downloadSuccessToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <i className="bi bi-file-earmark-pdf-fill text-lg"></i>
          </div>
          <div>
            <p className="text-xs font-bold">Berita Acara Berhasil Diunduh!</p>
            <p className="text-[11px] text-slate-300">File PDF resmi telah tersimpan di perangkat Anda.</p>
          </div>
        </div>
      )}

      {/* Action Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <i className="bi bi-bar-chart-fill text-blue-600"></i>
            <span>Rekapitulasi &amp; Perolehan Suara</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hasil perhitungan suara pemilihan ketua dan wakil ketua OSIS {settings.election_period || 'Periode 2026/2027'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            title="Muat ulang perolehan suara terbaru"
          >
            <i className="bi bi-arrow-clockwise text-sm"></i>
          </button>

          {/* Tombol Utama: Download PDF Berita Acara */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            title="Download Berita Acara Resmi dalam format PDF"
          >
            <i className="bi bi-file-earmark-pdf-fill text-sm"></i>
            <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Cetak Berita Acara (PDF)'}</span>
          </button>

          {/* Opsi Cetak Printer Langsung */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            title="Cetak langsung menggunakan printer web"
          >
            <i className="bi bi-printer"></i>
            <span className="hidden sm:inline">Print Web</span>
          </button>

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition cursor-pointer"
          >
            <i className="bi bi-arrow-counterclockwise"></i>
            <span className="hidden sm:inline">Reset Suara</span>
          </button>
        </div>
      </div>

      {/* PRINT-ONLY OFFICIAL HEADER */}
      <div className="hidden print-only mb-8 text-center border-b-2 border-slate-900 pb-4">
        <h1 className="text-xl font-black uppercase tracking-wider">{settings.school_name || 'SMP NEGERI 1 DAYUN'}</h1>
        <h2 className="text-base font-bold uppercase mt-1">PANITIA PEMILIHAN KETUA &amp; WAKIL KETUA OSIS</h2>
        <p className="text-xs text-slate-600 mt-0.5">{settings.election_period || 'Masa Bakti 2026/2027'}</p>
        <div className="text-xs font-bold mt-2 uppercase underline">
          BERITA ACARA REKAPITULASI HASIL PEMILIHAN SUARA
        </div>
      </div>

      {/* Statistics Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 block">Total DPT Siswa</span>
          <span className="text-2xl font-black text-slate-800">{totalDPT}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Pemilih berhak</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-xs border border-emerald-200 bg-emerald-50/20">
          <span className="text-xs font-bold text-emerald-800 block">Total Suara Masuk</span>
          <span className="text-2xl font-black text-emerald-700">{totalVotesCounted}</span>
          <span className="text-[11px] text-emerald-600 block mt-0.5">{votedStudents} siswa hadir</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-xs border border-amber-200 bg-amber-50/20">
          <span className="text-xs font-bold text-amber-800 block">Belum Memberikan Suara</span>
          <span className="text-2xl font-black text-amber-700">{notVotedStudents}</span>
          <span className="text-[11px] text-amber-600 block mt-0.5">Siswa belum memilih</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-xs border border-blue-200 bg-blue-50/30">
          <span className="text-xs font-bold text-blue-900 block">Tingkat Partisipasi</span>
          <span className="text-2xl font-black text-blue-800">{participationRate}%</span>
          <span className="text-[11px] text-blue-600 block mt-0.5">Persentase kehadiran</span>
        </div>
      </div>

      {/* Leading Paslon Banner if votes > 0 */}
      {leadingCandidate && totalVotesCounted > 0 && (
        <div className="no-print bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center font-black text-2xl shrink-0">
              {leadingCandidate.candidate_number}
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                <i className="bi bi-trophy-fill text-amber-300"></i> Perolehan Suara Tertinggi Sementara
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold leading-tight">
                {leadingCandidate.chairman_name} &amp; {leadingCandidate.vice_chairman_name}
              </h3>
              <p className="text-xs text-emerald-100 italic mt-0.5">
                &ldquo;{leadingCandidate.slogan || 'Maju Bersama OSIS'}&rdquo;
              </p>
            </div>
          </div>
          <div className="sm:text-right shrink-0">
            <span className="text-3xl font-black">{leadingCandidate.vote_count}</span>
            <span className="text-xs text-emerald-200 block">
              Suara ({((leadingCandidate.vote_count / totalVotesCounted) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="no-print bg-white rounded-3xl p-6 shadow-xs border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <i className="bi bi-graph-up-arrow text-blue-600"></i>
              <span>Grafik Visual Perolehan Suara</span>
            </h3>
            <p className="text-xs text-slate-500">Visualisasi distribusi suara masing-masing pasangan calon</p>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                chartType === 'bar' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <i className="bi bi-bar-chart"></i>
              <span>Grafik Batang</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('donut')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                chartType === 'donut' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <i className="bi bi-pie-chart"></i>
              <span>Diagram Proporsi</span>
            </button>
          </div>
        </div>

        {/* Visual Chart Rendering */}
        {totalVotesCounted === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <i className="bi bi-inbox text-3xl block mb-2 text-slate-300"></i>
            Belum ada suara yang masuk. Grafik akan tampil otomatis begitu pemilih memberikan suara.
          </div>
        ) : chartType === 'bar' ? (
          /* Interactive Vertical Bar Chart */
          <div className="pt-4 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {candidates.map((cand, idx) => {
                const color = colors[idx % colors.length];
                const pct = totalVotesCounted > 0 ? (cand.vote_count / totalVotesCounted) * 100 : 0;
                const isWinner = leadingCandidate?.id === cand.id;

                return (
                  <div
                    key={cand.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isWinner ? 'border-blue-400 bg-blue-50/30 shadow-xs' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center">
                        {cand.candidate_number}
                      </span>
                      <span className="font-extrabold text-lg text-slate-800">
                        {pct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="h-32 flex items-end justify-center bg-slate-50 rounded-xl p-2 mb-3">
                      <div
                        className={`w-16 rounded-t-xl transition-all duration-700 ${color.bg}`}
                        style={{ height: `${Math.max(12, pct)}%` }}
                      ></div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-xs truncate">
                        {cand.chairman_name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        &amp; {cand.vice_chairman_name}
                      </p>
                      <div className="pt-2 border-t border-slate-100 flex justify-between text-xs font-bold text-slate-700">
                        <span>Total Suara:</span>
                        <span className="text-blue-700 font-extrabold">{cand.vote_count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Multi-color Proportional Distribution Bar */
          <div className="space-y-6 py-4">
            <div className="w-full h-8 rounded-2xl overflow-hidden flex shadow-inner border border-slate-200">
              {candidates.map((cand, idx) => {
                const color = colors[idx % colors.length];
                const pct = totalVotesCounted > 0 ? (cand.vote_count / totalVotesCounted) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={cand.id}
                    className={`${color.bg} transition-all duration-700 flex items-center justify-center text-white text-[10px] font-bold`}
                    style={{ width: `${pct}%` }}
                    title={`Paslon ${cand.candidate_number}: ${cand.vote_count} suara (${pct.toFixed(1)}%)`}
                  >
                    {pct > 8 ? `${pct.toFixed(0)}%` : ''}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="grid sm:grid-cols-3 gap-3">
              {candidates.map((cand, idx) => {
                const color = colors[idx % colors.length];
                const pct = totalVotesCounted > 0 ? ((cand.vote_count / totalVotesCounted) * 100).toFixed(1) : '0';
                return (
                  <div key={cand.id} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className={`w-3.5 h-3.5 rounded-full ${color.bg} shrink-0`}></span>
                    <div className="truncate text-xs">
                      <span className="font-bold text-slate-800 block truncate">
                        No. {cand.candidate_number} - {cand.chairman_name}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {cand.vote_count} Suara ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Table Rekapitulasi Suara (Included in print as official result) */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">
              Tabel Rekapitulasi Perolehan Suara
            </h3>
            <p className="text-xs text-slate-500">
              Rincian hasil penghitungan suara per pasangan calon
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition cursor-pointer"
            >
              <i className="bi bi-file-earmark-pdf"></i>
              <span>Download PDF</span>
            </button>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Total Masuk: {totalVotesCounted} Suara
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-16 text-center">No Urut</th>
                <th className="py-3.5 px-4">Pasangan Calon (Ketua &amp; Wakil)</th>
                <th className="py-3.5 px-4">Slogan</th>
                <th className="py-3.5 px-4 text-center">Jumlah Perolehan Suara</th>
                <th className="py-3.5 px-4 text-center">Persentase (%)</th>
                <th className="py-3.5 px-4 text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidates.map((cand) => {
                const pct = totalVotesCounted > 0 ? ((cand.vote_count / totalVotesCounted) * 100).toFixed(1) : '0';
                const isLeading = leadingCandidate?.id === cand.id && totalVotesCounted > 0;

                return (
                  <tr key={cand.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-4 text-center">
                      <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-extrabold text-sm inline-flex items-center justify-center">
                        {cand.candidate_number}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-extrabold text-slate-800 text-sm block">
                        {cand.chairman_name}
                      </span>
                      <span className="text-slate-500 text-xs">
                        Wakil: {cand.vice_chairman_name}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 italic">
                      {cand.slogan || '-'}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-black text-slate-900 text-base">
                        {cand.vote_count}
                      </span>
                      <span className="text-[11px] text-slate-400 block">suara sah</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-extrabold text-blue-700 text-sm">
                          {pct}%
                        </span>
                        <div className="w-16 bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {isLeading ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
                          Tertinggi
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-slate-400 text-[11px]">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Signatures for Printed Berita Acara */}
      <div className="hidden print-only mt-12 pt-8 grid grid-cols-2 text-center text-xs">
        <div>
          <p className="mb-16">Mengetahui,<br /><strong>Kepala Sekolah</strong></p>
          <p className="font-bold underline">(........................................................)</p>
          <p>NIP. ....................................................</p>
        </div>
        <div>
          <p className="mb-16">Dayun, .................................... 2026<br /><strong>Ketua Panitia Pemilihan OSIS</strong></p>
          <p className="font-bold underline">(........................................................)</p>
          <p>NISN. ..................................................</p>
        </div>
      </div>

      {/* RESET ALL VOTES MODAL */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 border border-slate-200 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-3xl">
              <i className="bi bi-shield-exclamation"></i>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-800">
                Reset Seluruh Perolehan Suara?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tindakan ini akan mengosongkan kembali seluruh suara kandidat menjadi <strong>0</strong> dan mereset status memilih seluruh siswa menjadi <strong>Belum Memilih</strong>.
              </p>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-xs text-rose-800">
              <i className="bi bi-exclamation-triangle-fill me-1"></i>
              Gunakan fungsi ini jika Anda ingin memulai simulasi baru atau saat hari pemilihan resmi dimulai.
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={resetting}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleResetAllVotes}
                disabled={resetting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {resetting ? 'Mereset...' : 'Ya, Reset Seluruh Suara'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
