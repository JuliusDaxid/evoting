import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dbService } from '../../services/dbService';
import { OsisMeeting, OsisAttendance, Settings } from '../../types';

interface DiscussionPoint {
  id: string;
  topic: string;
  speaker: string;
  summary: string;
}

interface ActionItem {
  id: string;
  task: string;
  pic: string;
  deadline: string;
  notes: string;
}

interface ParticipantRow {
  id: string;
  name: string;
  role: string;
  status: 'hadir' | 'izin' | 'sakit' | 'alpa';
  notes?: string;
}

const CLOSING_TEMPLATES = {
  pleno:
    'Demikian notulen rapat pleno pengurus OSIS ini dibuat dengan sebenar-benarnya berdasarkan hasil musyawarah mufakat seluruh peserta rapat. Keputusan rapat bersifat mengikat dan wajib dilaksanakan dengan penuh tanggung jawab oleh seluruh pengurus OSIS.',
  sekbid:
    'Notulensi rapat koordinasi sekbid ini disusun sebagai pedoman teknis pelaksanaan program kerja. Diharapkan seluruh koordinator dan anggota dapat menindaklanjuti keputusan sesuai tenggat waktu yang telah disepakati bersama.',
  evaluasi:
    'Rapat evaluasi bulanan ditutup dengan doa bersama. Seluruh catatan evaluasi dan perbaikan kinerja akan ditinjau kembali pada agenda rapat koordinasi berikutnya.',
  khusus:
    'Demikian berita acara dan notulensi rapat khusus ini dibuat sebagai bentuk pertanggungjawaban panitia pelaksana kegiatan OSIS SMP Negeri 1 Dayun.',
};

interface Props {
  settings?: Settings;
}

export const NotulenGeneratorView: React.FC<Props> = ({ settings }) => {
  // Meetings data for attendance auto-pull
  const [scheduledMeetings, setScheduledMeetings] = useState<OsisMeeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [loadingMeetings, setLoadingMeetings] = useState<boolean>(false);
  const [pullingAttendance, setPullingAttendance] = useState<boolean>(false);

  // Form States - Meeting Metadata
  const [title, setTitle] = useState('Rapat Pleno Koordinasi Persiapan Hari Guru & Pentas Seni 2026');
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [meetingTime, setMeetingTime] = useState('13:30 - 15:30 WIB');
  const [location, setLocation] = useState('Ruang Multimedia SMP Negeri 1 Dayun');
  const [leader, setLeader] = useState('Muhammad Farhan Pratama (Ketua Umum OSIS)');
  const [notulis, setNotulis] = useState('Zahra Cantika Putri (Sekretaris Umum)');
  const [objective, setObjective] = useState(
    'Membahas susunan panitia, rundown teknis acara, pembagian penanggung jawab seksi, dan finalisasi proposal kegiatan.'
  );

  // Participants / Attendance Data
  const [participants, setParticipants] = useState<ParticipantRow[]>([
    { id: '1', name: 'Drs. Hendro Wibowo, M.Pd.', role: 'Pembina OSIS', status: 'hadir', notes: 'Membuka arahan' },
    { id: '2', name: 'Muhammad Farhan Pratama', role: 'Ketua Umum OSIS', status: 'hadir', notes: 'Pimpinan sidang' },
    { id: '3', name: 'Alya Siti Nurhaliza', role: 'Wakil Ketua OSIS', status: 'hadir' },
    { id: '4', name: 'Zahra Cantika Putri', role: 'Sekretaris Umum', status: 'hadir', notes: 'Notulis' },
    { id: '5', name: 'Bima Sakti Nugraha', role: 'Bendahara Umum', status: 'hadir' },
    { id: '6', name: 'Fajar Ramadhan', role: 'Koord. Sekbid Keagamaan', status: 'hadir' },
    { id: '7', name: 'Citra Lestari', role: 'Koord. Sekbid Kedisiplinan', status: 'hadir' },
    { id: '8', name: 'Rifky Dwi Hermansyah', role: 'Koord. Sekbid Olahraga & Seni', status: 'hadir' },
    { id: '9', name: 'Nabila Aurelia Maharani', role: 'Koord. Sekbid TIK', status: 'izin', notes: 'Mengikuti bimbel' },
  ]);

  // Discussion Points
  const [discussions, setDiscussions] = useState<DiscussionPoint[]>([
    {
      id: 'd1',
      topic: 'Pembentukan Susunan Panitia Pelaksana',
      speaker: 'Muhammad Farhan Pratama',
      summary:
        'Disepakati pembagian koordinator perlengkapan, konsumsi, dokumentasi, dan keamanan dari gabungan Sekbid 1 s/d 4.',
    },
    {
      id: 'd2',
      topic: 'Rundown Acara dan Waktu Gladi Bersih',
      speaker: 'Rifky Dwi Hermansyah',
      summary:
        'Pentas seni berlangsung pukul 08.00 - 12.00 WIB. Gladi bersih dijadwalkan H-1 pukul 14.00 WIB di panggung utama sekolah.',
    },
    {
      id: 'd3',
      topic: 'Alokasi Anggaran & Cinderamata Dewan Guru',
      speaker: 'Bima Sakti Nugraha',
      summary:
        'Estimasi biaya cinderamata untuk 45 dewan guru sebesar Rp 2.500.000 bersumber dari kas OSIS dan bantuan sekolah.',
    },
  ]);

  // Action Items / Decisions
  const [actions, setActions] = useState<ActionItem[]>([
    {
      id: 'a1',
      task: 'Penyusunan dan pengajuan surat izin kegiatan & peminjaman alat ke Waka Sarpras',
      pic: 'Zahra Cantika Putri',
      deadline: '2026-11-05',
      notes: 'Format resmi sekolah',
    },
    {
      id: 'a2',
      task: 'Pemesanan plakat cinderamata & bingkisan guru',
      pic: 'Bima Sakti Nugraha & Sekbid 3',
      deadline: '2026-11-12',
      notes: 'Selesai 3 hari sebelum acara',
    },
    {
      id: 'a3',
      task: 'Desain banner panggung dan publikasi mading digital eOSIS',
      pic: 'Nabila Aurelia Maharani',
      deadline: '2026-11-10',
      notes: 'Ukuran 4x2 meter',
    },
  ]);

  // Closing & Signatures
  const [closingType, setClosingType] = useState<keyof typeof CLOSING_TEMPLATES>('pleno');
  const [closingText, setClosingText] = useState(CLOSING_TEMPLATES.pleno);
  const [signerNotulis, setSignerNotulis] = useState('Zahra Cantika Putri');
  const [signerKetua, setSignerKetua] = useState('Muhammad Farhan Pratama');
  const [signerPembina, setSignerPembina] = useState('Drs. Hendro Wibowo, M.Pd.');
  const [nipPembina, setNipPembina] = useState('NIP. 19780512 200501 1 008');

  // Notification / Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSavingArchive, setIsSavingArchive] = useState<boolean>(false);

  // Load scheduled meetings
  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    setLoadingMeetings(true);
    try {
      const list = await dbService.getOsisMeetings();
      setScheduledMeetings(list);
      if (list.length > 0) {
        setSelectedMeetingId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load meetings', err);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auto-pull attendance from meeting
  const handlePullAttendance = async () => {
    if (!selectedMeetingId) {
      showToast('Pilih kegiatan rapat terlebih dahulu.');
      return;
    }
    setPullingAttendance(true);
    try {
      const targetMeeting = scheduledMeetings.find((m) => m.id === selectedMeetingId);
      if (targetMeeting) {
        setTitle(`Notulen: ${targetMeeting.title}`);
        setMeetingDate(targetMeeting.date);
        setMeetingTime(targetMeeting.time);
        setLocation(targetMeeting.location);
        if (targetMeeting.description) {
          setObjective(targetMeeting.description);
        }
      }

      const attList = await dbService.getAttendanceByMeeting(selectedMeetingId);
      if (attList && attList.length > 0) {
        const mapped: ParticipantRow[] = attList.map((a, idx) => ({
          id: a.id || `att-${idx}`,
          name: a.member_name,
          role: a.member_role,
          status: a.status,
          notes: a.notes,
        }));
        setParticipants(mapped);

        // Auto-detect Notulis or Leader if present
        const foundLeader = mapped.find((p) => p.role.toLowerCase().includes('ketua'));
        if (foundLeader) {
          setLeader(`${foundLeader.name} (${foundLeader.role})`);
          setSignerKetua(foundLeader.name);
        }
        const foundNotulis = mapped.find(
          (p) => p.role.toLowerCase().includes('sekretaris') || (p.notes && p.notes.toLowerCase().includes('notulis'))
        );
        if (foundNotulis) {
          setNotulis(`${foundNotulis.name} (${foundNotulis.role})`);
          setSignerNotulis(foundNotulis.name);
        }

        showToast(`Berhasil menarik ${mapped.length} data presensi dari ${targetMeeting?.title || 'rapat'}!`);
      } else {
        showToast('Rapat terpilih belum memiliki catatan presensi. Anda dapat mengisi peserta secara manual.');
      }
    } catch (err) {
      console.error('Error pulling attendance', err);
      showToast('Gagal menarik data presensi.');
    } finally {
      setPullingAttendance(false);
    }
  };

  // Add / Remove Discussion Point
  const handleAddDiscussion = () => {
    const newId = `d-${Date.now()}`;
    setDiscussions([
      ...discussions,
      {
        id: newId,
        topic: '',
        speaker: leader.split('(')[0].trim(),
        summary: '',
      },
    ]);
  };

  const handleRemoveDiscussion = (id: string) => {
    setDiscussions(discussions.filter((d) => d.id !== id));
  };

  const handleUpdateDiscussion = (id: string, field: keyof DiscussionPoint, value: string) => {
    setDiscussions(discussions.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  // Add / Remove Action Item
  const handleAddAction = () => {
    const newId = `a-${Date.now()}`;
    setActions([
      ...actions,
      {
        id: newId,
        task: '',
        pic: '',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        notes: '',
      },
    ]);
  };

  const handleRemoveAction = (id: string) => {
    setActions(actions.filter((a) => a.id !== id));
  };

  const handleUpdateAction = (id: string, field: keyof ActionItem, value: string) => {
    setActions(actions.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  // Add / Update Participant
  const handleAddParticipant = () => {
    const newId = `p-${Date.now()}`;
    setParticipants([
      ...participants,
      {
        id: newId,
        name: '',
        role: 'Anggota OSIS',
        status: 'hadir',
      },
    ]);
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  const handleUpdateParticipant = (id: string, field: keyof ParticipantRow, value: any) => {
    setParticipants(participants.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  // Closing template change
  const handleClosingTemplateChange = (tpl: keyof typeof CLOSING_TEMPLATES) => {
    setClosingType(tpl);
    setClosingText(CLOSING_TEMPLATES[tpl]);
  };

  // Summary counts
  const hadirCount = participants.filter((p) => p.status === 'hadir').length;
  const izinCount = participants.filter((p) => p.status === 'izin').length;
  const sakitCount = participants.filter((p) => p.status === 'sakit').length;
  const alpaCount = participants.filter((p) => p.status === 'alpa').length;

  // Format Date ID
  const formatDateIndo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // ==========================================
  // EXPORT TO PDF
  // ==========================================
  const generatePdf = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const schoolName = settings?.school_name || 'SMP NEGERI 1 DAYUN';
      const period = settings?.election_period || 'Masa Bakti 2026/2027';

      // 1. KOP SURAT RESMI
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(40, 50, 70);
      doc.text('PEMERINTAH KABUPATEN SIAK', 105, 14, { align: 'center' });
      doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', 105, 19, { align: 'center' });

      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(schoolName.toUpperCase(), 105, 25, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(30, 64, 175);
      doc.text(`ORGANISASI SISWA INTRA SEKOLAH (OSIS) • ${period.toUpperCase()}`, 105, 30, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Jl. Raya Dayun - Siak, Kec. Dayun, Kab. Siak, Riau • Pos 28671 • Web: eosis.smpn1dayun.sch.id', 105, 34, {
        align: 'center',
      });

      // Garis Kop Ganda
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.8);
      doc.line(14, 37, 196, 37);
      doc.setLineWidth(0.2);
      doc.line(14, 38.5, 196, 38.5);

      // 2. JUDUL DOKUMEN
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('BERITA ACARA & NOTULENSI RAPAT RESMI OSIS', 105, 45, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(title, 105, 50, { align: 'center' });

      // 3. TABEL INFORMASI RAPAT
      const metaRows = [
        ['Hari / Tanggal', `: ${formatDateIndo(meetingDate)}`, 'Waktu Kegiatan', `: ${meetingTime}`],
        ['Tempat / Ruang', `: ${location}`, 'Pemimpin Sidang', `: ${leader}`],
        ['Notulis Rapat', `: ${notulis}`, 'Agenda / Tujuan', `: ${objective}`],
      ];

      autoTable(doc, {
        startY: 54,
        body: metaRows,
        theme: 'plain',
        styles: {
          fontSize: 8.5,
          cellPadding: 1.5,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 28, fontStyle: 'bold' },
          1: { cellWidth: 70 },
          2: { cellWidth: 28, fontStyle: 'bold' },
          3: { cellWidth: 56 },
        },
        margin: { left: 14, right: 14 },
      });

      let currentY = (doc as any).lastAutoTable.finalY + 4;

      // 4. PRESENSI & DAFTAR PESERTA
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 64, 175);
      doc.text(
        `I. REKAPITULASI PRESENSI KEHADIRAN (Hadir: ${hadirCount} | Izin: ${izinCount} | Sakit: ${sakitCount} | Alpa: ${alpaCount})`,
        14,
        currentY
      );

      const participantTableRows = participants.map((p, idx) => [
        (idx + 1).toString(),
        p.name || '-',
        p.role || '-',
        p.status.toUpperCase(),
        p.notes || '-',
      ]);

      autoTable(doc, {
        startY: currentY + 2,
        head: [['No', 'Nama Peserta', 'Jabatan / Kelas', 'Kehadiran', 'Keterangan']],
        body: participantTableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 1.5,
          textColor: [15, 23, 42],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 55 },
          2: { cellWidth: 45 },
          3: { cellWidth: 24, halign: 'center' },
          4: { cellWidth: 48 },
        },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 5;

      // Check page break for discussions
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      // 5. POIN PEMBAHASAN RAPAT
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 64, 175);
      doc.text('II. POKOK PEMBAHASAN & DINAMIKA RAPAT', 14, currentY);

      const discussionRows = discussions.map((d, idx) => [
        (idx + 1).toString(),
        d.topic || '-',
        d.speaker || '-',
        d.summary || '-',
      ]);

      autoTable(doc, {
        startY: currentY + 2,
        head: [['No', 'Topik / Pokok Pembahasan', 'Narasumber / Pembicara', 'Rincian Hasil Diskusi']],
        body: discussionRows,
        theme: 'grid',
        headStyles: {
          fillColor: [51, 65, 85],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          textColor: [15, 23, 42],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 50, fontStyle: 'bold' },
          2: { cellWidth: 35 },
          3: { cellWidth: 87 },
        },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 5;

      // Check page break for decisions
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      // 6. KEPUTUSAN & TINDAK LANJUT (ACTION ITEMS)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 64, 175);
      doc.text('III. KEPUTUSAN RAPAT & RENCANA TINDAK LANJUT (ACTION PLAN)', 14, currentY);

      const actionRows = actions.map((a, idx) => [
        (idx + 1).toString(),
        a.task || '-',
        a.pic || '-',
        a.deadline || '-',
        a.notes || '-',
      ]);

      autoTable(doc, {
        startY: currentY + 2,
        head: [['No', 'Butir Keputusan / Tugas', 'Penanggung Jawab (PIC)', 'Target Waktu', 'Keterangan']],
        body: actionRows,
        theme: 'grid',
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          textColor: [15, 23, 42],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 70 },
          2: { cellWidth: 40 },
          3: { cellWidth: 26, halign: 'center' },
          4: { cellWidth: 36 },
        },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 5;

      // 7. PENUTUP
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 64, 175);
      doc.text('IV. PENUTUP', 14, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const splitClosing = doc.splitTextToSize(closingText, 182);
      doc.text(splitClosing, 14, currentY + 4);

      currentY = currentY + 4 + splitClosing.length * 4 + 4;

      // 8. TANDA TANGAN (SIGNATURE BLOCKS)
      if (currentY > 235) {
        doc.addPage();
        currentY = 25;
      }

      const dateSign = `Dayun, ${formatDateIndo(meetingDate)}`;
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);

      // Lokasi & Tanggal Pengesahan
      doc.text(dateSign, 145, currentY);

      // Header Kolom Tanda Tangan
      doc.setFont('helvetica', 'normal');
      doc.text('Mengetahui / Mengesahkan,', 14, currentY + 6);
      doc.text('Notulis Sidang,', 145, currentY + 6);

      doc.setFont('helvetica', 'bold');
      doc.text('Ketua Umum OSIS', 14, currentY + 11);
      doc.text('Sekretaris / Notulis', 145, currentY + 11);

      // Space for signature (20mm)
      const sigY = currentY + 28;

      // Nama Penandatangan 1 & 2
      doc.text(signerKetua, 14, sigY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('Pengurus OSIS Periode Aktif', 14, sigY + 4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(signerNotulis, 145, sigY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('Notulis Rapat', 145, sigY + 4);

      // Penandatangan Pembina (Tengah Bawah)
      const pembinaY = sigY + 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Menyetujui,', 105, pembinaY, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text('Pembina OSIS SMP Negeri 1 Dayun', 105, pembinaY + 4, { align: 'center' });

      doc.text(signerPembina, 105, pembinaY + 22, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(nipPembina, 105, pembinaY + 26, { align: 'center' });

      // Save PDF
      const cleanFileName = `Notulen_OSIS_${meetingDate}_${title.slice(0, 25).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(cleanFileName);
      showToast(`Dokumen PDF berhasil di-generate dan diunduh: ${cleanFileName}`);
    } catch (err) {
      console.error('Failed to export PDF', err);
      showToast('Terjadi kesalahan saat memproses PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // ==========================================
  // EXPORT TO WORD (.doc)
  // ==========================================
  const generateWordDoc = () => {
    setIsExporting(true);
    try {
      const schoolName = settings?.school_name || 'SMP NEGERI 1 DAYUN';
      const period = settings?.election_period || 'Masa Bakti 2026/2027';

      const participantRowsHtml = participants
        .map(
          (p, idx) => `
          <tr>
            <td style="text-align:center; padding: 6px; border: 1px solid #333;">${idx + 1}</td>
            <td style="padding: 6px; border: 1px solid #333;">${p.name}</td>
            <td style="padding: 6px; border: 1px solid #333;">${p.role}</td>
            <td style="text-align:center; font-weight:bold; padding: 6px; border: 1px solid #333;">${p.status.toUpperCase()}</td>
            <td style="padding: 6px; border: 1px solid #333;">${p.notes || '-'}</td>
          </tr>`
        )
        .join('');

      const discussionRowsHtml = discussions
        .map(
          (d, idx) => `
          <tr>
            <td style="text-align:center; padding: 6px; border: 1px solid #333;">${idx + 1}</td>
            <td style="font-weight:bold; padding: 6px; border: 1px solid #333;">${d.topic}</td>
            <td style="padding: 6px; border: 1px solid #333;">${d.speaker}</td>
            <td style="padding: 6px; border: 1px solid #333;">${d.summary}</td>
          </tr>`
        )
        .join('');

      const actionRowsHtml = actions
        .map(
          (a, idx) => `
          <tr>
            <td style="text-align:center; padding: 6px; border: 1px solid #333;">${idx + 1}</td>
            <td style="padding: 6px; border: 1px solid #333;">${a.task}</td>
            <td style="padding: 6px; border: 1px solid #333;">${a.pic}</td>
            <td style="text-align:center; padding: 6px; border: 1px solid #333;">${a.deadline}</td>
            <td style="padding: 6px; border: 1px solid #333;">${a.notes || '-'}</td>
          </tr>`
        )
        .join('');

      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${title}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; color: #111; margin: 20mm; }
            .kop { text-align: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 15px; }
            .kop-instansi { font-size: 11pt; font-weight: bold; margin: 0; }
            .kop-sekolah { font-size: 14pt; font-weight: bold; margin: 2px 0; }
            .kop-osis { font-size: 11pt; font-weight: bold; color: #1e3a8a; margin: 2px 0; }
            .kop-alamat { font-size: 9pt; color: #555; margin: 0; }
            .doc-title { text-align: center; font-size: 13pt; font-weight: bold; text-decoration: underline; margin-top: 15px; }
            .doc-sub { text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 15px; }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            .meta-table td { padding: 4px 6px; vertical-align: top; }
            .section-title { font-size: 11pt; font-weight: bold; color: #1e3a8a; margin-top: 16px; margin-bottom: 6px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            table.data-table th { background-color: #f1f5f9; padding: 6px; border: 1px solid #333; font-weight: bold; font-size: 10pt; }
            table.data-table td { font-size: 10pt; vertical-align: top; }
            .closing { margin-top: 12px; text-align: justify; }
            .signature-table { width: 100%; border-collapse: collapse; margin-top: 25px; }
            .signature-table td { vertical-align: top; text-align: center; }
          </style>
        </head>
        <body>
          <div class="kop">
            <p class="kop-instansi">PEMERINTAH KABUPATEN SIAK<br/>DINAS PENDIDIKAN DAN KEBUDAYAAN</p>
            <p class="kop-sekolah">${schoolName.toUpperCase()}</p>
            <p class="kop-osis">ORGANISASI SISWA INTRA SEKOLAH (OSIS) • ${period.toUpperCase()}</p>
            <p class="kop-alamat">Jl. Raya Dayun - Siak, Kec. Dayun, Kab. Siak, Riau • Pos 28671 • Web: eosis.smpn1dayun.sch.id</p>
          </div>

          <div class="doc-title">BERITA ACARA &amp; NOTULENSI RAPAT RESMI OSIS</div>
          <div class="doc-sub">${title}</div>

          <table class="meta-table">
            <tr>
              <td style="width: 18%; font-weight: bold;">Hari / Tanggal</td>
              <td style="width: 42%;">: ${formatDateIndo(meetingDate)}</td>
              <td style="width: 18%; font-weight: bold;">Waktu Kegiatan</td>
              <td style="width: 22%;">: ${meetingTime}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Tempat / Ruang</td>
              <td>: ${location}</td>
              <td style="font-weight: bold;">Pemimpin Sidang</td>
              <td>: ${leader}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Notulis Rapat</td>
              <td>: ${notulis}</td>
              <td style="font-weight: bold;">Agenda / Tujuan</td>
              <td>: ${objective}</td>
            </tr>
          </table>

          <div class="section-title">I. REKAPITULASI PRESENSI KEHADIRAN (Hadir: ${hadirCount} | Izin: ${izinCount} | Sakit: ${sakitCount} | Alpa: ${alpaCount})</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 32%;">Nama Peserta</th>
                <th style="width: 25%;">Jabatan / Kelas</th>
                <th style="width: 15%;">Kehadiran</th>
                <th style="width: 23%;">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${participantRowsHtml}
            </tbody>
          </table>

          <div class="section-title">II. POKOK PEMBAHASAN &amp; DINAMIKA RAPAT</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 28%;">Topik / Pokok Pembahasan</th>
                <th style="width: 20%;">Narasumber</th>
                <th style="width: 47%;">Rincian Hasil Diskusi</th>
              </tr>
            </thead>
            <tbody>
              ${discussionRowsHtml}
            </tbody>
          </table>

          <div class="section-title">III. KEPUTUSAN RAPAT &amp; RENCANA TINDAK LANJUT (ACTION PLAN)</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 38%;">Butir Keputusan / Tugas</th>
                <th style="width: 22%;">Penanggung Jawab (PIC)</th>
                <th style="width: 15%;">Target Waktu</th>
                <th style="width: 20%;">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${actionRowsHtml}
            </tbody>
          </table>

          <div class="section-title">IV. PENUTUP</div>
          <div class="closing">
            ${closingText}
          </div>

          <table class="signature-table">
            <tr>
              <td style="width: 50%;">
                Mengetahui / Mengesahkan,<br/>
                <b>Ketua Umum OSIS</b>
                <br/><br/><br/><br/>
                <b><u>${signerKetua}</u></b><br/>
                <span>Pengurus OSIS Periode Aktif</span>
              </td>
              <td style="width: 50%;">
                Dayun, ${formatDateIndo(meetingDate)}<br/>
                <b>Notulis Rapat</b>
                <br/><br/><br/><br/>
                <b><u>${signerNotulis}</u></b><br/>
                <span>Sekretaris / Notulis</span>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 25px;">
                Menyetujui,<br/>
                <b>Pembina OSIS SMP Negeri 1 Dayun</b>
                <br/><br/><br/><br/>
                <b><u>${signerPembina}</u></b><br/>
                <span>${nipPembina}</span>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/msword',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cleanFileName = `Notulen_OSIS_${meetingDate}_${title.slice(0, 25).replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
      a.href = url;
      a.download = cleanFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Dokumen Microsoft Word (.doc) berhasil diunduh: ${cleanFileName}`);
    } catch (err) {
      console.error('Failed to export Word doc', err);
      showToast('Gagal mengekspor berkas Word.');
    } finally {
      setIsExporting(false);
    }
  };

  // ==========================================
  // SAVE TO E-ARCHIVE DOKUMEN
  // ==========================================
  const handleSaveToArchive = async () => {
    setIsSavingArchive(true);
    try {
      await dbService.createOsisDocument({
        title: `Notulensi: ${title}`,
        category: 'notulensi',
        file_type: 'pdf',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        file_size: `${(0.4 + participants.length * 0.05).toFixed(1)} MB`,
        uploaded_by: notulis || 'Sekretaris Umum',
        date: meetingDate,
        description: `Notulensi resmi kegiatan rapat OSIS SMPN 1 Dayun (${hadirCount} peserta hadir). Tempat: ${location}.`,
      });
      showToast('Notulen rapat berhasil diarsipkan secara otomatis ke menu E-Archive Dokumen OSIS!');
    } catch (err) {
      console.error('Failed to archive document', err);
      showToast('Gagal menyimpan notulen ke e-Arsip.');
    } finally {
      setIsSavingArchive(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-fade-in">
          <i className="bi bi-check-circle-fill text-emerald-400 text-base"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden border border-blue-500/20">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold mb-3">
            <i className="bi bi-journal-check"></i>
            <span>Notulen Generator &amp; Berita Acara Rapat</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            Generator Notulen Resmi OSIS SMPN 1 Dayun
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Susun berita acara rapat secara otomatis dengan menarik data absensi kegiatan real-time, poin pembahasan
            dinamis, action plan keputusan rapat, template penutup, serta ekspor langsung ke format PDF dan Microsoft
            Word (.doc).
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              type="button"
              onClick={generatePdf}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <i className="bi bi-file-earmark-pdf-fill text-base text-rose-300"></i>
              <span>Download PDF Resmi</span>
            </button>

            <button
              type="button"
              onClick={generateWordDoc}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <i className="bi bi-file-earmark-word-fill text-base text-sky-200"></i>
              <span>Download Word (.doc)</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToArchive}
              disabled={isSavingArchive}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              <i className="bi bi-archive-fill text-amber-400"></i>
              <span>Simpan ke E-Archive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Tarik Data Absensi Otomatis */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">
              <i className="bi bi-calendar-check"></i>
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">Tarik Data Presensi Otomatis</h2>
              <p className="text-[11px] text-slate-500">
                Pilih agenda rapat yang telah tersimpan di menu Absensi Kegiatan untuk mengisi peserta &amp; judul instan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMeetingId}
              onChange={(e) => setSelectedMeetingId(e.target.value)}
              disabled={loadingMeetings || scheduledMeetings.length === 0}
              className="text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 font-medium"
            >
              {scheduledMeetings.length === 0 ? (
                <option value="">Belum ada agenda rapat</option>
              ) : (
                scheduledMeetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.date} - {m.title}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              onClick={handlePullAttendance}
              disabled={pullingAttendance || scheduledMeetings.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition cursor-pointer disabled:opacity-50"
            >
              {pullingAttendance ? (
                <i className="bi bi-arrow-repeat animate-spin text-sm"></i>
              ) : (
                <i className="bi bi-cloud-arrow-down text-sm"></i>
              )}
              <span>Tarik Presensi</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Pill */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
            Total Peserta: {participants.length}
          </span>
          <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
            Hadir: {hadirCount}
          </span>
          <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold">Izin: {izinCount}</span>
          <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold">Sakit: {sakitCount}</span>
          <span className="px-3 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold">Alpa: {alpaCount}</span>
        </div>
      </div>

      {/* Section 2: Identitas Rapat (Metadata) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-sm">
            <i className="bi bi-file-text"></i>
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">1. Identitas &amp; Agenda Rapat</h2>
            <p className="text-[11px] text-slate-500">Informasi utama berita acara notulensi resmi</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Judul / Topik Rapat <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold text-slate-800"
              placeholder="Contoh: Rapat Pleno Koordinasi Persiapan Hari Guru 2026"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Hari &amp; Tanggal</label>
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Waktu Pelaksanaan</label>
            <input
              type="text"
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Contoh: 13:30 - 15:30 WIB"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tempat / Ruangan</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Contoh: Ruang Multimedia SMP"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Pemimpin Sidang / Rapat</label>
            <input
              type="text"
              value={leader}
              onChange={(e) => setLeader(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Contoh: Muhammad Farhan (Ketua OSIS)"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Notulis Sidang</label>
            <input
              type="text"
              value={notulis}
              onChange={(e) => setNotulis(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Contoh: Zahra Cantika Putri (Sekretaris Umum)"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">Agenda / Tujuan Rapat</label>
            <textarea
              rows={2}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Rangkuman tujuan pertemuan..."
            />
          </div>
        </div>
      </div>

      {/* Section 3: Daftar Peserta & Presensi */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-sm">
              <i className="bi bi-people"></i>
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">2. Daftar Peserta &amp; Presensi Kehadiran</h2>
              <p className="text-[11px] text-slate-500">
                Peserta yang hadir dalam rapat (otomatis dimasukkan ke lampiran tabel dokumen)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddParticipant}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <i className="bi bi-plus"></i>
            <span>Tambah Peserta</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3">Nama Anggota</th>
                <th className="py-2.5 px-3">Jabatan / Kelas</th>
                <th className="py-2.5 px-3 w-32">Status Kehadiran</th>
                <th className="py-2.5 px-3">Catatan</th>
                <th className="py-2.5 px-3 w-12 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {participants.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="py-2 px-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => handleUpdateParticipant(p.id, 'name', e.target.value)}
                      placeholder="Nama Peserta"
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={p.role}
                      onChange={(e) => handleUpdateParticipant(p.id, 'role', e.target.value)}
                      placeholder="Jabatan"
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={p.status}
                      onChange={(e) => handleUpdateParticipant(p.id, 'status', e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      <option value="hadir">Hadir</option>
                      <option value="izin">Izin</option>
                      <option value="sakit">Sakit</option>
                      <option value="alpa">Alpa</option>
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={p.notes || ''}
                      onChange={(e) => handleUpdateParticipant(p.id, 'notes', e.target.value)}
                      placeholder="Keterangan..."
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(p.id)}
                      className="text-slate-400 hover:text-rose-600 transition p-1"
                      title="Hapus Peserta"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Pokok Pembahasan Rapat */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 font-bold flex items-center justify-center text-sm">
              <i className="bi bi-chat-left-dots"></i>
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">3. Pokok Pembahasan &amp; Jalannya Diskusi</h2>
              <p className="text-[11px] text-slate-500">
                Poin-poin topik yang didiskusikan beserta tanggapan dan dinamika rapat
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddDiscussion}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Tambah Poin Pembahasan</span>
          </button>
        </div>

        <div className="space-y-3">
          {discussions.map((d, idx) => (
            <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-md">
                  Poin #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveDiscussion(d.id)}
                  className="text-slate-400 hover:text-rose-600 text-xs font-bold transition p-1 flex items-center gap-1 cursor-pointer"
                >
                  <i className="bi bi-trash"></i>
                  <span>Hapus</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Topik / Pokok Bahasan
                  </label>
                  <input
                    type="text"
                    value={d.topic}
                    onChange={(e) => handleUpdateDiscussion(d.id, 'topic', e.target.value)}
                    placeholder="Contoh: Rundown dan waktu pelaksanaan gladi"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Narasumber / Pembicara
                  </label>
                  <input
                    type="text"
                    value={d.speaker}
                    onChange={(e) => handleUpdateDiscussion(d.id, 'speaker', e.target.value)}
                    placeholder="Contoh: Rifky Dwi (Koord. Sekbid 3)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Rincian Hasil Diskusi &amp; Masukan Peserta
                  </label>
                  <textarea
                    rows={2}
                    value={d.summary}
                    onChange={(e) => handleUpdateDiscussion(d.id, 'summary', e.target.value)}
                    placeholder="Jelaskan intisari diskusi, usulan anggota, dan kesepakatan topik..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Keputusan Rapat & Action Plan */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 font-bold flex items-center justify-center text-sm">
              <i className="bi bi-check2-square"></i>
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">
                4. Keputusan Rapat &amp; Rencana Tindak Lanjut (Action Items)
              </h2>
              <p className="text-[11px] text-slate-500">
                Keputusan mengikat beserta PIC penanggung jawab dan tenggat waktu pelaksanaan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddAction}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Tambah Keputusan</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3">Butir Keputusan / Tugas</th>
                <th className="py-2.5 px-3 w-48">Penanggung Jawab (PIC)</th>
                <th className="py-2.5 px-3 w-36 text-center">Tenggat Waktu</th>
                <th className="py-2.5 px-3">Keterangan</th>
                <th className="py-2.5 px-3 w-12 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {actions.map((a, idx) => (
                <tr key={a.id} className="hover:bg-slate-50/60">
                  <td className="py-2 px-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={a.task}
                      onChange={(e) => handleUpdateAction(a.id, 'task', e.target.value)}
                      placeholder="Uraian butir keputusan / tugas"
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={a.pic}
                      onChange={(e) => handleUpdateAction(a.id, 'pic', e.target.value)}
                      placeholder="Nama PIC / Sekbid"
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="date"
                      value={a.deadline}
                      onChange={(e) => handleUpdateAction(a.id, 'deadline', e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={a.notes}
                      onChange={(e) => handleUpdateAction(a.id, 'notes', e.target.value)}
                      placeholder="Catatan..."
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveAction(a.id)}
                      className="text-slate-400 hover:text-rose-600 transition p-1"
                      title="Hapus Butir"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 6: Penutup dari Template & Penandatangan */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 font-bold flex items-center justify-center text-sm">
            <i className="bi bi-pen"></i>
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">5. Bagian Penutup &amp; Kolom Pengesahan</h2>
            <p className="text-[11px] text-slate-500">Pilih template penutup resmi dan tentukan pejabat penandatangan</p>
          </div>
        </div>

        {/* Template Buttons */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">Pilih Template Penutup Cepat:</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: 'pleno', label: 'Rapat Pleno & Evaluasi', desc: 'Musyawarah mufakat mengikat' },
              { key: 'sekbid', label: 'Koordinasi Sekbid', desc: 'Pedoman pelaksanaan proja' },
              { key: 'evaluasi', label: 'Evaluasi Bulanan', desc: 'Catatan perbaikan kinerja' },
              { key: 'khusus', label: 'Rapat Darurat / Khusus', desc: 'Pertanggungjawaban panitia' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => handleClosingTemplateChange(t.key as any)}
                className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                  closingType === t.key
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-extrabold block">{t.label}</span>
                <span className="text-[10px] text-slate-500 block">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Teks Kalimat Penutup (Dapat Diedit)</label>
          <textarea
            rows={3}
            value={closingText}
            onChange={(e) => setClosingText(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Signatures */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-3">Kolom Penandatangan:</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Notulis Rapat</span>
              <input
                type="text"
                value={signerNotulis}
                onChange={(e) => setSignerNotulis(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-bold"
                placeholder="Nama Notulis"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Sekretaris / Pembuat Notulen</span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Ketua Umum OSIS</span>
              <input
                type="text"
                value={signerKetua}
                onChange={(e) => setSignerKetua(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-bold"
                placeholder="Nama Ketua OSIS"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Pemimpin Sidang Pleno</span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Pembina OSIS</span>
              <input
                type="text"
                value={signerPembina}
                onChange={(e) => setSignerPembina(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-bold mb-1"
                placeholder="Nama Pembina OSIS"
              />
              <input
                type="text"
                value={nipPembina}
                onChange={(e) => setNipPembina(e.target.value)}
                className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-slate-300 bg-white text-slate-600"
                placeholder="NIP Pembina"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <i className="bi bi-file-earmark-check-fill text-blue-400 text-xl"></i>
          <div>
            <span className="text-xs font-bold block text-white">Dokumen Notulensi Siap Dicetak</span>
            <span className="text-[10px] text-slate-400 block">
              Format kop resmi SMPN 1 Dayun, rekap presensi otomatis, tabel keputusan &amp; 3 kolom tanda tangan
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={generatePdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <i className="bi bi-file-earmark-pdf"></i>
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={generateWordDoc}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <i className="bi bi-file-earmark-word"></i>
            <span>Export Word (.doc)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
