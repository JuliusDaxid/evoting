import { supabase } from '../lib/supabase';
import {
  Candidate,
  ClassItem,
  OsisAttendance,
  OsisDocument,
  OsisMeeting,
  OsisMember,
  OsisProgram,
  Settings,
  Student,
} from '../types';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const INITIAL_CLASSES: ClassItem[] = [
  { id: '11111111-1111-1111-1111-111111111101', name: 'VII A', description: 'Kelas 7 Unggulan A' },
  { id: '11111111-1111-1111-1111-111111111102', name: 'VII B', description: 'Kelas 7 Reguler B' },
  { id: '11111111-1111-1111-1111-111111111103', name: 'VIII A', description: 'Kelas 8 Unggulan A' },
  { id: '11111111-1111-1111-1111-111111111104', name: 'VIII B', description: 'Kelas 8 Reguler B' },
  { id: '11111111-1111-1111-1111-111111111105', name: 'IX A', description: 'Kelas 9 Unggulan A' },
  { id: '11111111-1111-1111-1111-111111111106', name: 'IX B', description: 'Kelas 9 Reguler B' },
];

const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 'c1111111-1111-1111-1111-111111111101',
    candidate_number: 1,
    chairman_name: 'Muhammad Farhan Pratama',
    vice_chairman_name: 'Alya Siti Nurhaliza',
    photo_url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80',
    slogan: 'Bersama Mewujudkan Siswa Berprestasi, Berakhlak, dan Berbudaya Lingkungan',
    vision: 'Menjadikan OSIS sebagai wadah aspirasi siswa yang inklusif, kreatif, dan berlandaskan iman serta kemajuan ilmu pengetahuan.',
    mission: [
      'Meningkatkan keimanan dan ketakwaan melalui kegiatan keagamaan rutin.',
      'Mengembangkan potensi bakat dan minat siswa di bidang akademik maupun seni budaya.',
      'Mewujudkan sekolah ramah anak dan bebas perundungan (anti-bullying).',
      'Mengadakan festival kreativitas siswa dan digitalisasi mading sekolah.',
    ],
    vote_count: 18,
  },
  {
    id: 'c1111111-1111-1111-1111-111111111102',
    candidate_number: 2,
    chairman_name: 'Bagas Aditya Wardana',
    vice_chairman_name: 'Zahra Cantika Putri',
    photo_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
    slogan: 'Aksi Nyata, Kolaborasi Menginspirasi, SMP Unggul Berdaya Saing',
    vision: 'Terwujudnya generasi siswa yang berkarakter mandiri, peduli sesama, dan berjiwa kepemimpinan tinggi.',
    mission: [
      'Mengaktifkan kembali ekstrakurikuler kepemimpinan dan public speaking.',
      'Membangun komunikasi harmonis antara siswa, guru, dan pengurus OSIS.',
      'Program Go-Green dan pemilahan sampah organik serta anorganik di lingkungan sekolah.',
      'Penyelenggaraan Class Meeting yang sportif, inovatif, dan edukatif.',
    ],
    vote_count: 24,
  },
  {
    id: 'c1111111-1111-1111-1111-111111111103',
    candidate_number: 3,
    chairman_name: 'Rifky Dwi Hermansyah',
    vice_chairman_name: 'Nabila Aurelia Maharani',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    slogan: 'Santun dalam Bersikap, Cerdas dalam Bertindak, Gemilang dalam Prestasi',
    vision: 'Membangun lingkungan sekolah yang harmonis, disiplin, berprestasi tinggi, serta melek literasi digital.',
    mission: [
      'Menyelenggarakan pekan literasi dan kompetisi sains/olahraga internal.',
      'Membuka kotak saran dan formulir online aspirasi siswa secara transparan.',
      'Mengoptimalkan media sosial OSIS untuk edukasi dan publikasi prestasi sekolah.',
      'Program tutor sebaya untuk membantu siswa yang kesulitan belajar.',
    ],
    vote_count: 14,
  },
];

const INITIAL_STUDENTS: Student[] = [
  { id: 's01', nisn: '0081234501', name: 'Ahmad Rizky Fauzi', birth_date: '2011-05-14', gender: 'L', religion: 'Islam', address: 'Jl. Pemuda No. 12, Dayun', class_id: '11111111-1111-1111-1111-111111111101', class_name: 'VII A', has_voted: true, voted_at: '2026-10-23T08:30:00.000Z' },
  { id: 's02', nisn: '0081234502', name: 'Annisa Putri Ramadhani', birth_date: '2011-08-22', gender: 'P', religion: 'Islam', address: 'Jl. Melati RT 02/01, Dayun', class_id: '11111111-1111-1111-1111-111111111101', class_name: 'VII A', has_voted: false, voted_at: null },
  { id: 's03', nisn: '0081234503', name: 'Bima Sakti Nugraha', birth_date: '2011-01-10', gender: 'L', religion: 'Kristen Protestan', address: 'Komplek Sawit Lestari Blok C', class_id: '11111111-1111-1111-1111-111111111102', class_name: 'VII B', has_voted: true, voted_at: '2026-10-23T08:45:00.000Z' },
  { id: 's04', nisn: '0081234504', name: 'Citra Lestari', birth_date: '2011-11-03', gender: 'P', religion: 'Islam', address: 'Jl. Merdeka No. 45, Dayun', class_id: '11111111-1111-1111-1111-111111111102', class_name: 'VII B', has_voted: false, voted_at: null },
  { id: 's05', nisn: '0081234505', name: 'Dimas Pratama', birth_date: '2010-04-18', gender: 'L', religion: 'Katolik', address: 'Jl. Flamboyan Blok B No. 04', class_id: '11111111-1111-1111-1111-111111111103', class_name: 'VIII A', has_voted: true, voted_at: '2026-10-23T09:10:00.000Z' },
  { id: 's06', nisn: '0081234506', name: 'Dinda Ayu Maharani', birth_date: '2010-07-29', gender: 'P', religion: 'Islam', address: 'Jl. Kenanga No. 08, Dayun', class_id: '11111111-1111-1111-1111-111111111103', class_name: 'VIII A', has_voted: false, voted_at: null },
  { id: 's07', nisn: '0081234507', name: 'Fajar Ramadhan', birth_date: '2010-09-12', gender: 'L', religion: 'Islam', address: 'Dusun Suka Maju RT 03', class_id: '11111111-1111-1111-1111-111111111104', class_name: 'VIII B', has_voted: true, voted_at: '2026-10-23T09:20:00.000Z' },
  { id: 's08', nisn: '0081234508', name: 'Gita Kirana', birth_date: '2010-12-05', gender: 'P', religion: 'Hindu', address: 'Jl. Cempaka No. 17', class_id: '11111111-1111-1111-1111-111111111104', class_name: 'VIII B', has_voted: false, voted_at: null },
  { id: 's09', nisn: '0081234509', name: 'Hendra Setiawan', birth_date: '2009-03-25', gender: 'L', religion: 'Buddha', address: 'Jl. Mawar Indah No. 22', class_id: '11111111-1111-1111-1111-111111111105', class_name: 'IX A', has_voted: true, voted_at: '2026-10-23T09:40:00.000Z' },
  { id: 's10', nisn: '0081234510', name: 'Intan Permatasari', birth_date: '2009-06-30', gender: 'P', religion: 'Islam', address: 'Jl. Garuda No. 05', class_id: '11111111-1111-1111-1111-111111111105', class_name: 'IX A', has_voted: false, voted_at: null },
  { id: 's11', nisn: '0081234511', name: 'Kevin Julius', birth_date: '2009-10-15', gender: 'L', religion: 'Kristen Protestan', address: 'Jl. Ahmad Yani No. 90', class_id: '11111111-1111-1111-1111-111111111106', class_name: 'IX B', has_voted: true, voted_at: '2026-10-23T10:00:00.000Z' },
  { id: 's12', nisn: '0081234512', name: 'Larasati Dewi', birth_date: '2009-02-19', gender: 'P', religion: 'Islam', address: 'Jl. Sudirman RT 01/02', class_id: '11111111-1111-1111-1111-111111111106', class_name: 'IX B', has_voted: false, voted_at: null },
];

const INITIAL_SETTINGS: Settings = {
  id: 1,
  school_name: 'SMP Negeri 1 Dayun',
  school_logo: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=300&q=80',
  election_period: 'Masa Bakti 2026/2027',
  is_election_active: true,
  admin_username: 'admin',
  admin_password_hash: 'admin123',
};

// INITIAL SEED FOR OSIS INTERNAL MANAGEMENT
const INITIAL_OSIS_MEMBERS: OsisMember[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111101',
    name: 'Drs. Hendro Wibowo, M.Pd.',
    role: 'Pembina OSIS',
    sekbid: 'Kesiswaan',
    level: 1,
    class_name: 'Dewan Guru',
    phone: '081234567890',
    photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
    period: 'Masa Bakti 2026/2027',
    is_active: true,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111102',
    name: 'Muhammad Farhan Pratama',
    role: 'Ketua Umum OSIS',
    sekbid: 'Inti',
    level: 2,
    class_name: 'VIII A',
    phone: '081398765432',
    photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
    period: 'Masa Bakti 2026/2027',
    is_active: true,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111103',
    name: 'Alya Siti Nurhaliza',
    role: 'Wakil Ketua OSIS',
    sekbid: 'Inti',
    level: 3,
    class_name: 'VIII B',
    phone: '081287654321',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    period: 'Masa Bakti 2026/2027',
    is_active: true,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111104',
    name: 'Zahra Cantika Putri',
    role: 'Sekretaris Umum',
    sekbid: 'Inti',
    level: 4,
    class_name: 'VIII A',
    phone: '081578901234',
    photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    period: 'Masa Bakti 2026/2027',
    is_active: true,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111105',
    name: 'Bima Sakti Nugraha',
    role: 'Bendahara Umum',
    sekbid: 'Inti',
    level: 4,
    class_name: 'VIII B',
    phone: '081890123456',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    period: 'Masa Bakti 2026/2027',
    is_active: true,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111106',
    name: 'Fajar Ramadhan',
    role: 'Koord. Sekbid Keagamaan',
    sekbid: 'Sekbid 1',
    level: 5,
    class_name: 'VII A',
    phone: '081322334455',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    period: 'Masa Bakti 2026/2027',
    is_active: true,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111107',
    name: 'Citra Lestari',
    role: 'Koord. Sekbid Kedisiplinan & Budi Pekerti',
    sekbid: 'Sekbid 2',
    level: 5,
    class_name: 'VII B',
    phone: '081233445566',
    photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    period: 'Masa Bakti 2026/2027',
    is_active: true,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111108',
    name: 'Rifky Dwi Hermansyah',
    role: 'Koord. Sekbid Olahraga & Seni',
    sekbid: 'Sekbid 3',
    level: 5,
    class_name: 'VIII A',
    phone: '081944556677',
    photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    period: 'Masa Bakti 2026/2027',
    is_active: true,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111109',
    name: 'Nabila Aurelia Maharani',
    role: 'Koord. Sekbid TIK & Komunikasi',
    sekbid: 'Sekbid 4',
    level: 5,
    class_name: 'VII A',
    phone: '081255667788',
    photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
    period: 'Masa Bakti 2026/2027',
    is_active: true,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111110',
    name: 'Dimas Pratama',
    role: 'Anggota Sekbid Seni & Olahraga',
    sekbid: 'Sekbid 3',
    level: 6,
    class_name: 'VII A',
    phone: '081266778899',
    photo_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    period: 'Masa Bakti 2026/2027',
    is_active: true,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    name: 'Gita Kirana',
    role: 'Anggota Sekbid Keagamaan',
    sekbid: 'Sekbid 1',
    level: 6,
    class_name: 'VII B',
    phone: '081377889900',
    photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    period: 'Masa Bakti 2026/2027',
    is_active: true,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111112',
    name: 'Hendra Setiawan',
    role: 'Anggota Sekbid TIK & Komunikasi',
    sekbid: 'Sekbid 4',
    level: 6,
    class_name: 'VIII B',
    phone: '081588990011',
    photo_url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=300&q=80',
    period: 'Masa Bakti 2026/2027',
    is_active: true,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111113',
    name: 'Larasati Dewi',
    role: 'Anggota Sekbid Kedisiplinan',
    sekbid: 'Sekbid 2',
    level: 6,
    class_name: 'VII A',
    phone: '081999001122',
    photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    period: 'Masa Bakti 2026/2027',
    is_active: true,
  },
];

const INITIAL_OSIS_PROGRAMS: OsisProgram[] = [
  {
    id: 'prog-001',
    title: 'Peringatan Hari Guru Nasional & Pentas Seni Siswa',
    sekbid: 'Sekbid 3 (Seni & Olahraga)',
    pj_name: 'Rifky Dwi Hermansyah',
    status: 'sedang_berjalan',
    progress: 65,
    start_date: '2026-11-10',
    end_date: '2026-11-25',
    budget: 2500000,
    description: 'Pemberian cinderamata apresiasi kepada seluruh guru dan pementasan teater mini siswa SMP.',
  },
  {
    id: 'prog-002',
    title: 'Class Meeting Semester Ganjil 2026',
    sekbid: 'Sekbid 3 (Seni & Olahraga)',
    pj_name: 'Rifky Dwi Hermansyah',
    status: 'rencana',
    progress: 20,
    start_date: '2026-12-14',
    end_date: '2026-12-18',
    budget: 3500000,
    description: 'Turnamen futsal antar kelas, basket 3x3, e-sport edukatif, dan lomba kebersihan kelas.',
  },
  {
    id: 'prog-003',
    title: 'Latihan Dasar Kepemimpinan Siswa (LDKS)',
    sekbid: 'Pengurus Inti',
    pj_name: 'Muhammad Farhan Pratama',
    status: 'rencana',
    progress: 15,
    start_date: '2027-01-15',
    end_date: '2027-01-17',
    budget: 5000000,
    description: 'Pembekalan karakter kepemimpinan untuk seluruh pengurus OSIS dan ketua kelas di alam terbuka.',
  },
  {
    id: 'prog-004',
    title: 'Bakti Sosial Ramadhan & Santunan Dhuafa',
    sekbid: 'Sekbid 1 (Keagamaan)',
    pj_name: 'Fajar Ramadhan',
    status: 'rencana',
    progress: 0,
    start_date: '2027-03-20',
    end_date: '2027-03-26',
    budget: 4000000,
    description: 'Pengumpulan sembako dari warga sekolah dan penyaluran ke masyarakat kurang mampu.',
  },
  {
    id: 'prog-005',
    title: 'Digitalisasi Mading Sekolah & Media Sosial eOSIS',
    sekbid: 'Sekbid 4 (TIK & Komunikasi)',
    pj_name: 'Nabila Aurelia Maharani',
    status: 'selesai',
    progress: 100,
    start_date: '2026-09-01',
    end_date: '2026-09-30',
    budget: 800000,
    description: 'Peluncuran mading digital berbasis web dan optimalisasi akun Instagram/TikTok informasi OSIS.',
  },
];

const INITIAL_OSIS_MEETINGS: OsisMeeting[] = [
  {
    id: 'b1111111-1111-1111-1111-111111110001',
    title: 'Rapat Pleno Koordinasi Persiapan Hari Guru',
    date: '2026-10-20',
    time: '14:00 - 16:30 WIB',
    location: 'Ruang Multimedia SMP',
    description: 'Pembahasan susunan panitia, rundown acara, dan pengajuan anggaran ke kepala sekolah.',
  },
  {
    id: 'b1111111-1111-1111-1111-111111110002',
    title: 'Evaluasi Bulanan Pengurus OSIS Oktober 2026',
    date: '2026-10-10',
    time: '13:30 - 15:30 WIB',
    location: 'Ruang OSIS',
    description: 'Laporan progres program kerja seluruh Sekbid dan evaluasi kedisiplinan anggota.',
  },
  {
    id: 'b1111111-1111-1111-1111-111111110003',
    title: 'Rapat Koordinasi Panitia Class Meeting',
    date: '2026-10-25',
    time: '14:00 - 16:00 WIB',
    location: 'Ruang Rapat Guru',
    description: 'Penyusunan jadwal pertandingan, koordinasi wasit, dan inventarisasi peralatan olahraga.',
  },
];

const INITIAL_OSIS_ATTENDANCE: OsisAttendance[] = [
  { id: 'c1111111-1111-1111-1111-111111110001', meeting_id: 'b1111111-1111-1111-1111-111111110001', member_id: 'a1111111-1111-1111-1111-111111111101', member_name: 'Drs. Hendro Wibowo, M.Pd.', member_role: 'Pembina OSIS', status: 'hadir', notes: 'Membuka rapat' },
  { id: 'c1111111-1111-1111-1111-111111110002', meeting_id: 'b1111111-1111-1111-1111-111111110001', member_id: 'a1111111-1111-1111-1111-111111111102', member_name: 'Muhammad Farhan Pratama', member_role: 'Ketua Umum OSIS', status: 'hadir', notes: 'Memimpin rapat' },
  { id: 'c1111111-1111-1111-1111-111111110003', meeting_id: 'b1111111-1111-1111-1111-111111110001', member_id: 'a1111111-1111-1111-1111-111111111103', member_name: 'Alya Siti Nurhaliza', member_role: 'Wakil Ketua OSIS', status: 'hadir' },
  { id: 'c1111111-1111-1111-1111-111111110004', meeting_id: 'b1111111-1111-1111-1111-111111110001', member_id: 'a1111111-1111-1111-1111-111111111104', member_name: 'Zahra Cantika Putri', member_role: 'Sekretaris Umum', status: 'hadir', notes: 'Notulis' },
  { id: 'c1111111-1111-1111-1111-111111110005', meeting_id: 'b1111111-1111-1111-1111-111111110001', member_id: 'a1111111-1111-1111-1111-111111111105', member_name: 'Bima Sakti Nugraha', member_role: 'Bendahara Umum', status: 'hadir' },
  { id: 'c1111111-1111-1111-1111-111111110006', meeting_id: 'b1111111-1111-1111-1111-111111110001', member_id: 'a1111111-1111-1111-1111-111111111106', member_name: 'Fajar Ramadhan', member_role: 'Koord. Sekbid Keagamaan', status: 'izin', notes: 'Ada les bimbel' },
  { id: 'c1111111-1111-1111-1111-111111110007', meeting_id: 'b1111111-1111-1111-1111-111111110001', member_id: 'a1111111-1111-1111-1111-111111111107', member_name: 'Citra Lestari', member_role: 'Koord. Sekbid Kedisiplinan', status: 'hadir' },
  { id: 'c1111111-1111-1111-1111-111111110008', meeting_id: 'b1111111-1111-1111-1111-111111110001', member_id: 'a1111111-1111-1111-1111-111111111108', member_name: 'Rifky Dwi Hermansyah', member_role: 'Koord. Sekbid Olahraga & Seni', status: 'hadir' },
  { id: 'c1111111-1111-1111-1111-111111110009', meeting_id: 'b1111111-1111-1111-1111-111111110001', member_id: 'a1111111-1111-1111-1111-111111111109', member_name: 'Nabila Aurelia Maharani', member_role: 'Koord. Sekbid TIK', status: 'sakit', notes: 'Demam flu' },
];

const INITIAL_OSIS_DOCUMENTS: OsisDocument[] = [
  {
    id: 'd1111111-1111-1111-1111-111111110001',
    title: 'Proposal Peringatan Hari Guru Nasional & Pentas Seni 2026',
    category: 'proposal',
    file_type: 'pdf',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '2.4 MB',
    uploaded_by: 'Zahra Cantika Putri',
    date: '2026-10-18',
    description: 'Proposal lengkap pengajuan dana kegiatan dan susunan kepanitiaan acara Hari Guru.',
  },
  {
    id: 'd1111111-1111-1111-1111-111111110002',
    title: 'Laporan Pertanggungjawaban (LPJ) Digitalisasi Mading & Sosmed',
    category: 'lpj',
    file_type: 'pdf',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '1.8 MB',
    uploaded_by: 'Nabila Aurelia Maharani',
    date: '2026-10-05',
    description: 'Laporan realisasi anggaran dan hasil peluncuran platform mading digital OSIS.',
  },
  {
    id: 'd1111111-1111-1111-1111-111111110003',
    title: 'Surat Permohonan Izin Peminjaman Ruang Serbaguna & Sound',
    category: 'surat',
    file_type: 'docx',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '450 KB',
    uploaded_by: 'Zahra Cantika Putri',
    date: '2026-10-21',
    description: 'Surat izin pemakaian ruangan sarana prasarana sekolah untuk gladi bersih.',
  },
  {
    id: 'd1111111-1111-1111-1111-111111110004',
    title: 'Notulensi Rapat Pleno Koordinasi Panitia Hari Guru',
    category: 'notulensi',
    file_type: 'pdf',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '820 KB',
    uploaded_by: 'Zahra Cantika Putri',
    date: '2026-10-20',
    description: 'Dokumen hasil rangkuman rapat keputusan pleno pembagian PJ seksi acara.',
  },
];

class DatabaseService {
  private isSupabaseReady: boolean = false;
  private hasCheckedSupabase: boolean = false;

  constructor() {
    this.initLocalStore();
  }

  private initLocalStore() {
    if (!localStorage.getItem('eosis_classes')) {
      localStorage.setItem('eosis_classes', JSON.stringify(INITIAL_CLASSES));
    }
    if (!localStorage.getItem('eosis_candidates')) {
      localStorage.setItem('eosis_candidates', JSON.stringify(INITIAL_CANDIDATES));
    }
    if (!localStorage.getItem('eosis_students')) {
      localStorage.setItem('eosis_students', JSON.stringify(INITIAL_STUDENTS));
    }
    if (!localStorage.getItem('eosis_settings')) {
      localStorage.setItem('eosis_settings', JSON.stringify(INITIAL_SETTINGS));
    }
    if (!localStorage.getItem('eosis_members')) {
      localStorage.setItem('eosis_members', JSON.stringify(INITIAL_OSIS_MEMBERS));
    }
    if (!localStorage.getItem('eosis_programs')) {
      localStorage.setItem('eosis_programs', JSON.stringify(INITIAL_OSIS_PROGRAMS));
    }
    if (!localStorage.getItem('eosis_meetings')) {
      localStorage.setItem('eosis_meetings', JSON.stringify(INITIAL_OSIS_MEETINGS));
    }
    if (!localStorage.getItem('eosis_attendance')) {
      localStorage.setItem('eosis_attendance', JSON.stringify(INITIAL_OSIS_ATTENDANCE));
    }
    if (!localStorage.getItem('eosis_documents')) {
      localStorage.setItem('eosis_documents', JSON.stringify(INITIAL_OSIS_DOCUMENTS));
    }
  }

  async checkSupabaseConnection(): Promise<{ isConnected: boolean; tablesFound: boolean; message: string }> {
    try {
      const { data, error } = await supabase.from('candidates').select('id').limit(1);
      if (error) {
        if (error.message.includes('Could not find the table') || error.code === '42P01') {
          this.isSupabaseReady = false;
          this.hasCheckedSupabase = true;
          return {
            isConnected: true,
            tablesFound: false,
            message: 'Terkoneksi ke Supabase, namun tabel belum dibuat. Silakan jalankan skrip SQL di Supabase SQL Editor.',
          };
        }
        return {
          isConnected: false,
          tablesFound: false,
          message: error.message,
        };
      }
      this.isSupabaseReady = true;
      this.hasCheckedSupabase = true;
      return {
        isConnected: true,
        tablesFound: true,
        message: 'Koneksi ke Supabase berhasil! Seluruh tabel aktif dan siap digunakan.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Koneksi gagal';
      return {
        isConnected: false,
        tablesFound: false,
        message: msg,
      };
    }
  }

  // --- SETTINGS ---
  async getSettings(): Promise<Settings> {
    if (this.isSupabaseReady) {
      try {
        const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
        if (!error && data) {
          localStorage.setItem('eosis_settings', JSON.stringify(data));
          return data as Settings;
        }
      } catch (e) {
        console.warn('Falling back to local settings', e);
      }
    }
    const stored = localStorage.getItem('eosis_settings');
    return stored ? JSON.parse(stored) : INITIAL_SETTINGS;
  }

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings, updated_at: new Date().toISOString() };
    localStorage.setItem('eosis_settings', JSON.stringify(updated));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('settings').upsert({ id: 1, ...updated });
      } catch (e) {
        console.warn('Failed to sync settings to Supabase', e);
      }
    }
    return updated;
  }

  // --- CLASSES ---
  async getClasses(): Promise<ClassItem[]> {
    if (this.isSupabaseReady) {
      try {
        const { data, error } = await supabase.from('classes').select('*').order('name', { ascending: true });
        if (!error && data && data.length > 0) {
          localStorage.setItem('eosis_classes', JSON.stringify(data));
          return data as ClassItem[];
        }
      } catch (e) {
        console.warn('Falling back to local classes', e);
      }
    }
    const stored = localStorage.getItem('eosis_classes');
    return stored ? JSON.parse(stored) : INITIAL_CLASSES;
  }

  async createClass(name: string, description?: string): Promise<ClassItem> {
    const newClass: ClassItem = {
      id: generateUUID(),
      name: name.trim(),
      description: description?.trim() || '',
      created_at: new Date().toISOString(),
    };

    const list = await this.getClasses();
    list.push(newClass);
    localStorage.setItem('eosis_classes', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('classes').insert(newClass);
      } catch (e) {
        console.warn('Failed to insert class to Supabase', e);
      }
    }
    return newClass;
  }

  async updateClass(id: string, name: string, description?: string): Promise<ClassItem> {
    const list = await this.getClasses();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Kelas tidak ditemukan');

    list[index].name = name.trim();
    list[index].description = description?.trim() || '';
    localStorage.setItem('eosis_classes', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('classes').update({ name: name.trim(), description: description?.trim() }).eq('id', id);
      } catch (e) {
        console.warn('Failed to update class to Supabase', e);
      }
    }
    return list[index];
  }

  async deleteClass(id: string): Promise<void> {
    let list = await this.getClasses();
    list = list.filter(c => c.id !== id);
    localStorage.setItem('eosis_classes', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('classes').delete().eq('id', id);
      } catch (e) {
        console.warn('Failed to delete class from Supabase', e);
      }
    }
  }

  // --- CANDIDATES ---
  async getCandidates(): Promise<Candidate[]> {
    if (this.isSupabaseReady) {
      try {
        const { data, error } = await supabase.from('candidates').select('*').order('candidate_number', { ascending: true });
        if (!error && data && data.length > 0) {
          const parsed = data.map(item => ({
            ...item,
            mission: Array.isArray(item.mission) ? item.mission : typeof item.mission === 'string' ? JSON.parse(item.mission) : [],
          }));
          localStorage.setItem('eosis_candidates', JSON.stringify(parsed));
          return parsed as Candidate[];
        }
      } catch (e) {
        console.warn('Falling back to local candidates', e);
      }
    }
    const stored = localStorage.getItem('eosis_candidates');
    return stored ? JSON.parse(stored) : INITIAL_CANDIDATES;
  }

  async createCandidate(candidate: Omit<Candidate, 'id' | 'vote_count' | 'created_at'>): Promise<Candidate> {
    const newCand: Candidate = {
      ...candidate,
      id: generateUUID(),
      vote_count: 0,
      created_at: new Date().toISOString(),
    };

    const list = await this.getCandidates();
    list.push(newCand);
    list.sort((a, b) => a.candidate_number - b.candidate_number);
    localStorage.setItem('eosis_candidates', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('candidates').insert({
          ...newCand,
          mission: newCand.mission,
        });
      } catch (e) {
        console.warn('Failed to insert candidate to Supabase', e);
      }
    }
    return newCand;
  }

  async updateCandidate(id: string, candidate: Partial<Candidate>): Promise<Candidate> {
    const list = await this.getCandidates();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Kandidat tidak ditemukan');

    list[index] = { ...list[index], ...candidate };
    list.sort((a, b) => a.candidate_number - b.candidate_number);
    localStorage.setItem('eosis_candidates', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('candidates').update({
          ...candidate,
          mission: candidate.mission ? candidate.mission : undefined,
        }).eq('id', id);
      } catch (e) {
        console.warn('Failed to update candidate on Supabase', e);
      }
    }
    return list[index];
  }

  async deleteCandidate(id: string): Promise<void> {
    let list = await this.getCandidates();
    list = list.filter(c => c.id !== id);
    localStorage.setItem('eosis_candidates', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('candidates').delete().eq('id', id);
      } catch (e) {
        console.warn('Failed to delete candidate on Supabase', e);
      }
    }
  }

  async resetAllVotes(): Promise<void> {
    const candList = await this.getCandidates();
    const resetCands = candList.map(c => ({ ...c, vote_count: 0 }));
    localStorage.setItem('eosis_candidates', JSON.stringify(resetCands));

    const studentList = await this.getStudents();
    const resetStudents = studentList.map(s => ({ ...s, has_voted: false, voted_at: null }));
    localStorage.setItem('eosis_students', JSON.stringify(resetStudents));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('candidates').update({ vote_count: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('students').update({ has_voted: false, voted_at: null }).neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        console.warn('Failed to reset votes on Supabase', e);
      }
    }
  }

  // --- STUDENTS ---
  async getStudents(classId?: string, search?: string): Promise<Student[]> {
    let students: Student[] = [];
    const storedMeta = typeof window !== 'undefined' ? localStorage.getItem('eosis_students_metadata') : null;
    const metaMap: Record<string, { gender?: 'L' | 'P'; religion?: string; address?: string }> = storedMeta ? JSON.parse(storedMeta) : {};

    if (this.isSupabaseReady) {
      try {
        let query = supabase.from('students').select('*, classes(name)').order('name', { ascending: true });
        if (classId) {
          query = query.eq('class_id', classId);
        }
        const { data, error } = await query;
        if (!error && data) {
          students = data.map((item: any) => {
            const meta = metaMap[item.nisn] || metaMap[item.id] || {};
            return {
              id: item.id,
              nisn: item.nisn,
              name: item.name,
              birth_date: item.birth_date,
              gender: item.gender || meta.gender || 'L',
              religion: item.religion || meta.religion || 'Islam',
              address: item.address || meta.address || '',
              class_id: item.class_id,
              class_name: item.classes?.name || 'Belum Ditentukan',
              has_voted: item.has_voted,
              voted_at: item.voted_at,
              created_at: item.created_at,
            };
          });
          localStorage.setItem('eosis_students', JSON.stringify(students));
        }
      } catch (e) {
        console.warn('Falling back to local students', e);
      }
    }

    if (students.length === 0) {
      const stored = localStorage.getItem('eosis_students');
      students = stored ? JSON.parse(stored) : INITIAL_STUDENTS;
    }

    const classes = await this.getClasses();
    const classMap = new Map(classes.map(c => [c.id, c.name]));
    students = students.map(s => {
      const meta = metaMap[s.nisn] || metaMap[s.id] || {};
      return {
        ...s,
        gender: s.gender || meta.gender || 'L',
        religion: s.religion || meta.religion || 'Islam',
        address: s.address || meta.address || '',
        class_name: s.class_name || (s.class_id ? classMap.get(s.class_id) : 'Belum Ditentukan') || 'Belum Ditentukan',
      };
    });

    if (classId) {
      students = students.filter(s => s.class_id === classId);
    }
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      students = students.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.nisn.toLowerCase().includes(q) ||
          (s.address && s.address.toLowerCase().includes(q)) ||
          (s.religion && s.religion.toLowerCase().includes(q))
      );
    }

    return students;
  }

  async createStudent(student: Omit<Student, 'id' | 'has_voted' | 'voted_at' | 'created_at'>): Promise<Student> {
    const list = await this.getStudents();
    if (list.some(s => s.nisn === student.nisn.trim())) {
      throw new Error(`Siswa dengan NISN ${student.nisn} sudah terdaftar!`);
    }

    const classes = await this.getClasses();
    const foundClass = classes.find(c => c.id === student.class_id);

    const newStudent: Student = {
      ...student,
      id: generateUUID(),
      nisn: student.nisn.trim(),
      name: student.name.trim(),
      birth_date: student.birth_date,
      gender: student.gender || 'L',
      religion: student.religion || 'Islam',
      address: student.address?.trim() || '',
      class_id: student.class_id || undefined,
      class_name: foundClass?.name || 'Belum Ditentukan',
      has_voted: false,
      voted_at: null,
      created_at: new Date().toISOString(),
    };

    // Cache metadata
    const storedMeta = localStorage.getItem('eosis_students_metadata');
    const metaMap = storedMeta ? JSON.parse(storedMeta) : {};
    metaMap[newStudent.nisn] = { gender: newStudent.gender, religion: newStudent.religion, address: newStudent.address };
    metaMap[newStudent.id] = metaMap[newStudent.nisn];
    localStorage.setItem('eosis_students_metadata', JSON.stringify(metaMap));

    list.push(newStudent);
    list.sort((a, b) => a.name.localeCompare(b.name));
    localStorage.setItem('eosis_students', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        const fullPayload = {
          id: newStudent.id,
          nisn: newStudent.nisn,
          name: newStudent.name,
          birth_date: newStudent.birth_date,
          gender: newStudent.gender,
          religion: newStudent.religion,
          address: newStudent.address,
          class_id: newStudent.class_id || null,
          has_voted: false,
        };
        const resFull = await supabase.from('students').insert(fullPayload);
        if (resFull.error) {
          // Retry with guaranteed base columns
          await supabase.from('students').insert({
            id: newStudent.id,
            nisn: newStudent.nisn,
            name: newStudent.name,
            birth_date: newStudent.birth_date,
            class_id: newStudent.class_id || null,
            has_voted: false,
          });
        }
      } catch (e) {
        console.warn('Failed to insert student to Supabase', e);
      }
    }
    return newStudent;
  }

  async updateStudent(id: string, student: Partial<Student>): Promise<Student> {
    const list = await this.getStudents();
    const index = list.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Data siswa tidak ditemukan');

    const classes = await this.getClasses();
    const classId = student.class_id !== undefined ? student.class_id : list[index].class_id;
    const foundClass = classes.find(c => c.id === classId);

    list[index] = {
      ...list[index],
      ...student,
      class_id: classId || undefined,
      class_name: foundClass?.name || (!classId ? 'Belum Ditentukan' : list[index].class_name),
    };

    // Cache metadata
    const storedMeta = localStorage.getItem('eosis_students_metadata');
    const metaMap = storedMeta ? JSON.parse(storedMeta) : {};
    metaMap[list[index].nisn] = {
      gender: list[index].gender || 'L',
      religion: list[index].religion || 'Islam',
      address: list[index].address || '',
    };
    metaMap[list[index].id] = metaMap[list[index].nisn];
    localStorage.setItem('eosis_students_metadata', JSON.stringify(metaMap));

    localStorage.setItem('eosis_students', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        const fullPayload: Record<string, any> = {
          nisn: student.nisn !== undefined ? student.nisn : list[index].nisn,
          name: student.name !== undefined ? student.name : list[index].name,
          birth_date: student.birth_date !== undefined ? student.birth_date : list[index].birth_date,
          gender: student.gender !== undefined ? student.gender : list[index].gender,
          religion: student.religion !== undefined ? student.religion : list[index].religion,
          address: student.address !== undefined ? student.address : list[index].address,
          class_id: classId || null,
          has_voted: student.has_voted !== undefined ? student.has_voted : list[index].has_voted,
          voted_at: student.voted_at !== undefined ? student.voted_at : list[index].voted_at,
        };
        const resFull = await supabase.from('students').update(fullPayload).eq('id', id);
        if (resFull.error) {
          // Retry with base columns
          await supabase.from('students').update({
            nisn: fullPayload.nisn,
            name: fullPayload.name,
            birth_date: fullPayload.birth_date,
            class_id: fullPayload.class_id,
            has_voted: fullPayload.has_voted,
            voted_at: fullPayload.voted_at,
          }).eq('id', id);
        }
      } catch (e) {
        console.warn('Failed to update student in Supabase', e);
      }
    }
    return list[index];
  }

  async bulkImportStudents(
    importList: Array<{
      nisn: string;
      name: string;
      birth_date: string;
      class_name?: string;
      gender?: string;
      religion?: string;
      address?: string;
    }>
  ): Promise<{ successCount: number; skippedCount: number; errors: string[] }> {
    const currentStudents = await this.getStudents();
    const existingNisns = new Set(currentStudents.map(s => s.nisn.trim()));

    let successCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const newStudentsToInsert: Student[] = [];

    const storedMeta = typeof window !== 'undefined' ? localStorage.getItem('eosis_students_metadata') : null;
    const metaMap: Record<string, { gender: 'L' | 'P'; religion: string; address: string }> = storedMeta ? JSON.parse(storedMeta) : {};

    for (const item of importList) {
      const cleanNisn = String(item.nisn || '').trim();
      const cleanName = String(item.name || '').trim();
      const cleanBirth = String(item.birth_date || '').trim();
      const rawGender = String(item.gender || 'L').trim().toUpperCase();
      const gender: 'L' | 'P' = rawGender.startsWith('P') ? 'P' : 'L';
      const religion = String(item.religion || 'Islam').trim();
      const address = String(item.address || '').trim();

      if (!cleanNisn || !cleanName) {
        skippedCount++;
        errors.push(`Baris diabaikan: NISN atau Nama kosong (${cleanName || cleanNisn})`);
        continue;
      }

      if (existingNisns.has(cleanNisn)) {
        skippedCount++;
        errors.push(`NISN ${cleanNisn} (${cleanName}) sudah terdaftar di sistem.`);
        continue;
      }

      const generatedId = generateUUID();

      // Sesuai permintaan user: JANGAN ambil data kelas dari excel, dan biarkan dalam status 'Belum Ditentukan'
      const newStudent: Student = {
        id: generatedId,
        nisn: cleanNisn,
        name: cleanName,
        birth_date: cleanBirth || '2011-01-01',
        gender,
        religion: religion || 'Islam',
        address,
        class_id: undefined,
        class_name: 'Belum Ditentukan',
        has_voted: false,
        voted_at: null,
        created_at: new Date().toISOString(),
      };

      existingNisns.add(cleanNisn);
      newStudentsToInsert.push(newStudent);
      metaMap[cleanNisn] = { gender, religion, address };
      metaMap[generatedId] = { gender, religion, address };
      successCount++;
    }

    if (newStudentsToInsert.length > 0) {
      // 1. Simpan cache metadata profil
      localStorage.setItem('eosis_students_metadata', JSON.stringify(metaMap));

      // 2. Simpan langsung ke local storage agar data selalu ada
      currentStudents.push(...newStudentsToInsert);
      currentStudents.sort((a, b) => a.name.localeCompare(b.name));
      localStorage.setItem('eosis_students', JSON.stringify(currentStudents));

      // 3. Simpan ke Supabase jika aktif
      if (!this.hasCheckedSupabase) {
        await this.checkSupabaseConnection();
      }

      if (this.isSupabaseReady) {
        try {
          const fullPayload = newStudentsToInsert.map(s => ({
            id: s.id,
            nisn: s.nisn,
            name: s.name,
            birth_date: s.birth_date,
            gender: s.gender,
            religion: s.religion,
            address: s.address,
            class_id: null,
            has_voted: false,
          }));

          const chunkSize = 50;
          for (let i = 0; i < fullPayload.length; i += chunkSize) {
            const chunk = fullPayload.slice(i, i + chunkSize);
            const { error: insertErr } = await supabase.from('students').insert(chunk);
            if (insertErr) {
              console.warn('Batch insert fullPayload gagal, mencoba per-baris fallback:', insertErr.message);
              for (const row of chunk) {
                const { error: rowErr } = await supabase.from('students').upsert(row, { onConflict: 'nisn' });
                if (rowErr) {
                  const baseRow = {
                    id: row.id,
                    nisn: row.nisn,
                    name: row.name,
                    birth_date: row.birth_date,
                    class_id: null,
                    has_voted: false,
                  };
                  const { error: baseRowErr } = await supabase.from('students').upsert(baseRow, { onConflict: 'nisn' });
                  if (baseRowErr) {
                    console.error('Gagal simpan baris ke Supabase:', row.nisn, baseRowErr.message);
                    errors.push(`NISN ${row.nisn}: ${baseRowErr.message}`);
                  }
                }
              }
            }
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Gagal terhubung ke database';
          console.warn('Failed to bulk insert to Supabase', e);
          errors.push(`Supabase: ${msg}`);
        }
      }
    }

    return { successCount, skippedCount, errors };
  }

  async deleteStudent(id: string): Promise<void> {
    let list = await this.getStudents();
    list = list.filter(s => s.id !== id);
    localStorage.setItem('eosis_students', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('students').delete().eq('id', id);
      } catch (e) {
        console.warn('Failed to delete student from Supabase', e);
      }
    }
  }

  async resetStudentVote(id: string): Promise<void> {
    await this.updateStudent(id, { has_voted: false, voted_at: null });
  }

  // --- STUDENT AUTH & VOTING ---
  async loginStudent(nisn: string, birthDate: string): Promise<Student> {
    const cleanNisn = nisn.trim();
    const cleanDate = birthDate.trim();

    if (this.isSupabaseReady) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*, classes(name)')
          .eq('nisn', cleanNisn)
          .eq('birth_date', cleanDate)
          .single();

        if (!error && data) {
          const student: Student = {
            id: data.id,
            nisn: data.nisn,
            name: data.name,
            birth_date: data.birth_date,
            class_id: data.class_id,
            class_name: (data.classes as any)?.name || 'Belum Ditentukan',
            has_voted: data.has_voted,
            voted_at: data.voted_at,
            created_at: data.created_at,
          };
          return student;
        }
      } catch (e) {
        console.warn('Supabase student login fallback to local', e);
      }
    }

    const students = await this.getStudents();
    const found = students.find(s => s.nisn === cleanNisn && s.birth_date === cleanDate);
    if (!found) {
      throw new Error('NISN atau Tanggal Lahir tidak cocok dengan data siswa terdaftar.');
    }
    return found;
  }

  async castVote(studentId: string, candidateId: string, nisn: string, birthDate: string): Promise<{ success: boolean; message: string }> {
    const settings = await this.getSettings();
    if (!settings.is_election_active) {
      throw new Error('Pemilihan sedang ditutup oleh Panitia OSIS.');
    }

    if (this.isSupabaseReady) {
      try {
        const { data, error } = await supabase.rpc('cast_vote', {
          p_nisn: nisn,
          p_birth_date: birthDate,
          p_candidate_id: candidateId,
        });

        if (error) {
          throw new Error(error.message || 'Gagal menyimpan suara ke database');
        }

        this.updateLocalVoteState(studentId, candidateId);
        return {
          success: true,
          message: data?.message || 'Suara Anda berhasil dicatat, terima kasih telah berpartisipasi!',
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat voting';
        throw new Error(errMsg);
      }
    }

    const students = await this.getStudents();
    const currentStudent = students.find(s => s.id === studentId || s.nisn === nisn);
    if (!currentStudent) {
      throw new Error('Data siswa tidak ditemukan.');
    }
    if (currentStudent.has_voted) {
      throw new Error('Anda sudah menggunakan hak suara Anda sebelumnya. Setiap siswa hanya dapat memilih 1 kali!');
    }

    const candidates = await this.getCandidates();
    const targetCandidate = candidates.find(c => c.id === candidateId);
    if (!targetCandidate) {
      throw new Error('Kandidat yang dipilih tidak valid.');
    }

    currentStudent.has_voted = true;
    currentStudent.voted_at = new Date().toISOString();
    localStorage.setItem('eosis_students', JSON.stringify(students));

    targetCandidate.vote_count = (targetCandidate.vote_count || 0) + 1;
    localStorage.setItem('eosis_candidates', JSON.stringify(candidates));

    return {
      success: true,
      message: 'Suara Anda berhasil dicatat, terima kasih telah berpartisipasi',
    };
  }

  private updateLocalVoteState(studentId: string, candidateId: string) {
    const students = JSON.parse(localStorage.getItem('eosis_students') || '[]') as Student[];
    const s = students.find(item => item.id === studentId);
    if (s) {
      s.has_voted = true;
      s.voted_at = new Date().toISOString();
      localStorage.setItem('eosis_students', JSON.stringify(students));
    }

    const cands = JSON.parse(localStorage.getItem('eosis_candidates') || '[]') as Candidate[];
    const c = cands.find(item => item.id === candidateId);
    if (c) {
      c.vote_count = (c.vote_count || 0) + 1;
      localStorage.setItem('eosis_candidates', JSON.stringify(cands));
    }
  }

  // ==========================================
  // MODUL 1: STRUKTUR & ANGGOTA OSIS
  // ==========================================
  async getOsisMembers(): Promise<OsisMember[]> {
    if (this.isSupabaseReady) {
      try {
        const { data, error } = await supabase.from('osis_members').select('*').order('level', { ascending: true });
        if (!error && data && data.length > 0) {
          localStorage.setItem('eosis_members', JSON.stringify(data));
          return data as OsisMember[];
        }
      } catch (e) {
        console.warn('Falling back to local osis_members', e);
      }
    }
    const stored = localStorage.getItem('eosis_members');
    return stored ? JSON.parse(stored) : INITIAL_OSIS_MEMBERS;
  }

  async createOsisMember(member: Omit<OsisMember, 'id' | 'created_at'>): Promise<OsisMember> {
    const newMember: OsisMember = {
      ...member,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    const list = await this.getOsisMembers();
    list.push(newMember);
    list.sort((a, b) => a.level - b.level);
    localStorage.setItem('eosis_members', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('osis_members').insert(newMember);
      } catch (e) {
        console.warn('Failed to insert osis_member to Supabase', e);
      }
    }
    return newMember;
  }

  async updateOsisMember(id: string, member: Partial<OsisMember>): Promise<OsisMember> {
    const list = await this.getOsisMembers();
    const idx = list.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Pengurus OSIS tidak ditemukan');

    list[idx] = { ...list[idx], ...member };
    list.sort((a, b) => a.level - b.level);
    localStorage.setItem('eosis_members', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('osis_members').update(member).eq('id', id);
      } catch (e) {
        console.warn('Failed to update osis_member in Supabase', e);
      }
    }
    return list[idx];
  }

  async deleteOsisMember(id: string): Promise<void> {
    let list = await this.getOsisMembers();
    list = list.filter(m => m.id !== id);
    localStorage.setItem('eosis_members', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('osis_members').delete().eq('id', id);
      } catch (e) {
        console.warn('Failed to delete osis_member from Supabase', e);
      }
    }
  }

  // ==========================================
  // MODUL 2: PROGRAM KERJA (PROJA TRACKER)
  // ==========================================
  async getOsisPrograms(): Promise<OsisProgram[]> {
    if (this.isSupabaseReady) {
      try {
        const { data, error } = await supabase.from('osis_programs').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          localStorage.setItem('eosis_programs', JSON.stringify(data));
          return data as OsisProgram[];
        }
      } catch (e) {
        console.warn('Falling back to local osis_programs', e);
      }
    }
    const stored = localStorage.getItem('eosis_programs');
    return stored ? JSON.parse(stored) : INITIAL_OSIS_PROGRAMS;
  }

  async createOsisProgram(program: Omit<OsisProgram, 'id' | 'created_at'>): Promise<OsisProgram> {
    const newProg: OsisProgram = {
      ...program,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    const list = await this.getOsisPrograms();
    list.unshift(newProg);
    localStorage.setItem('eosis_programs', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('osis_programs').insert(newProg);
      } catch (e) {
        console.warn('Failed to insert osis_program to Supabase', e);
      }
    }
    return newProg;
  }

  async updateOsisProgram(id: string, program: Partial<OsisProgram>): Promise<OsisProgram> {
    const list = await this.getOsisPrograms();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Program kerja tidak ditemukan');

    list[idx] = { ...list[idx], ...program };
    localStorage.setItem('eosis_programs', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('osis_programs').update(program).eq('id', id);
      } catch (e) {
        console.warn('Failed to update osis_program in Supabase', e);
      }
    }
    return list[idx];
  }

  async deleteOsisProgram(id: string): Promise<void> {
    let list = await this.getOsisPrograms();
    list = list.filter(p => p.id !== id);
    localStorage.setItem('eosis_programs', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('osis_programs').delete().eq('id', id);
      } catch (e) {
        console.warn('Failed to delete osis_program from Supabase', e);
      }
    }
  }

  // ==========================================
  // MODUL 3: ABSENSI RAPAT & KEGIATAN
  // ==========================================
  async getOsisMeetings(): Promise<OsisMeeting[]> {
    if (this.isSupabaseReady) {
      try {
        const { data, error } = await supabase.from('osis_meetings').select('*').order('date', { ascending: false });
        if (!error && data && data.length > 0) {
          localStorage.setItem('eosis_meetings', JSON.stringify(data));
          return data as OsisMeeting[];
        }
      } catch (e) {
        console.warn('Falling back to local osis_meetings', e);
      }
    }
    const stored = localStorage.getItem('eosis_meetings');
    return stored ? JSON.parse(stored) : INITIAL_OSIS_MEETINGS;
  }

  async createOsisMeeting(meeting: Omit<OsisMeeting, 'id' | 'created_at'>): Promise<OsisMeeting> {
    const newMeet: OsisMeeting = {
      ...meeting,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    const list = await this.getOsisMeetings();
    list.unshift(newMeet);
    localStorage.setItem('eosis_meetings', JSON.stringify(list));

    // Automatically initialize attendance rows for all active members
    const members = await this.getOsisMembers();
    const attendanceList = await this.getAllAttendance();
    const newRows: OsisAttendance[] = members.map(m => ({
      id: generateUUID(),
      meeting_id: newMeet.id,
      member_id: m.id,
      member_name: m.name,
      member_role: m.role,
      status: 'hadir',
    }));
    attendanceList.push(...newRows);
    localStorage.setItem('eosis_attendance', JSON.stringify(attendanceList));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('osis_meetings').insert(newMeet);
        await supabase.from('osis_attendance').insert(newRows);
      } catch (e) {
        console.warn('Failed to insert meeting & attendance to Supabase', e);
      }
    }
    return newMeet;
  }

  async deleteOsisMeeting(id: string): Promise<void> {
    let meetings = await this.getOsisMeetings();
    meetings = meetings.filter(m => m.id !== id);
    localStorage.setItem('eosis_meetings', JSON.stringify(meetings));

    let attendance = await this.getAllAttendance();
    attendance = attendance.filter(a => a.meeting_id !== id);
    localStorage.setItem('eosis_attendance', JSON.stringify(attendance));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('osis_meetings').delete().eq('id', id);
        await supabase.from('osis_attendance').delete().eq('meeting_id', id);
      } catch (e) {
        console.warn('Failed to delete meeting in Supabase', e);
      }
    }
  }

  async getAllAttendance(): Promise<OsisAttendance[]> {
    if (this.isSupabaseReady) {
      try {
        const { data, error } = await supabase.from('osis_attendance').select('*');
        if (!error && data && data.length > 0) {
          localStorage.setItem('eosis_attendance', JSON.stringify(data));
          return data as OsisAttendance[];
        }
      } catch (e) {
        console.warn('Falling back to local attendance', e);
      }
    }
    const stored = localStorage.getItem('eosis_attendance');
    return stored ? JSON.parse(stored) : INITIAL_OSIS_ATTENDANCE;
  }

  async getAttendanceByMeeting(meetingId: string): Promise<OsisAttendance[]> {
    const all = await this.getAllAttendance();
    let records = all.filter(a => a.meeting_id === meetingId);

    // If no records yet for this meeting, populate from members automatically
    if (records.length === 0) {
      const members = await this.getOsisMembers();
      records = members.map(m => ({
        id: generateUUID(),
        meeting_id: meetingId,
        member_id: m.id,
        member_name: m.name,
        member_role: m.role,
        status: 'hadir',
      }));
      all.push(...records);
      localStorage.setItem('eosis_attendance', JSON.stringify(all));
    }
    return records;
  }

  async updateAttendanceStatus(
    meetingId: string,
    memberId: string,
    status: 'hadir' | 'izin' | 'sakit' | 'alpa',
    notes?: string
  ): Promise<void> {
    const all = await this.getAllAttendance();
    const idx = all.findIndex(a => a.meeting_id === meetingId && a.member_id === memberId);
    if (idx !== -1) {
      all[idx].status = status;
      if (notes !== undefined) all[idx].notes = notes;
      all[idx].updated_at = new Date().toISOString();
      localStorage.setItem('eosis_attendance', JSON.stringify(all));

      if (this.isSupabaseReady) {
        try {
          await supabase.from('osis_attendance').update({ status, notes }).eq('id', all[idx].id);
        } catch (e) {
          console.warn('Failed to update attendance on Supabase', e);
        }
      }
    }
  }

  // ==========================================
  // MODUL 4: PENGARSIPAN DOKUMEN (E-ARCHIVE)
  // ==========================================
  async getOsisDocuments(): Promise<OsisDocument[]> {
    if (this.isSupabaseReady) {
      try {
        const { data, error } = await supabase.from('osis_documents').select('*').order('date', { ascending: false });
        if (!error && data && data.length > 0) {
          localStorage.setItem('eosis_documents', JSON.stringify(data));
          return data as OsisDocument[];
        }
      } catch (e) {
        console.warn('Falling back to local osis_documents', e);
      }
    }
    const stored = localStorage.getItem('eosis_documents');
    return stored ? JSON.parse(stored) : INITIAL_OSIS_DOCUMENTS;
  }

  async createOsisDocument(doc: Omit<OsisDocument, 'id' | 'created_at'>): Promise<OsisDocument> {
    const newDoc: OsisDocument = {
      ...doc,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    const list = await this.getOsisDocuments();
    list.unshift(newDoc);
    localStorage.setItem('eosis_documents', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('osis_documents').insert(newDoc);
      } catch (e) {
        console.warn('Failed to insert osis_document to Supabase', e);
      }
    }
    return newDoc;
  }

  async updateOsisDocument(id: string, doc: Partial<OsisDocument>): Promise<OsisDocument> {
    const list = await this.getOsisDocuments();
    const idx = list.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Dokumen tidak ditemukan');

    list[idx] = { ...list[idx], ...doc };
    localStorage.setItem('eosis_documents', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('osis_documents').update(doc).eq('id', id);
      } catch (e) {
        console.warn('Failed to update osis_document on Supabase', e);
      }
    }
    return list[idx];
  }

  async deleteOsisDocument(id: string): Promise<void> {
    let list = await this.getOsisDocuments();
    list = list.filter(d => d.id !== id);
    localStorage.setItem('eosis_documents', JSON.stringify(list));

    if (this.isSupabaseReady) {
      try {
        await supabase.from('osis_documents').delete().eq('id', id);
      } catch (e) {
        console.warn('Failed to delete osis_document from Supabase', e);
      }
    }
  }

  // --- SYNC ALL TO SUPABASE ---
  async syncInitialDataToSupabase(): Promise<{ success: boolean; message: string }> {
    try {
      const classes = await this.getClasses();
      const candidates = await this.getCandidates();
      const students = await this.getStudents();
      const settings = await this.getSettings();
      const members = await this.getOsisMembers();
      const programs = await this.getOsisPrograms();
      const meetings = await this.getOsisMeetings();
      const docs = await this.getOsisDocuments();

      for (const cls of classes) {
        await supabase.from('classes').upsert({ id: cls.id, name: cls.name, description: cls.description });
      }

      for (const cand of candidates) {
        await supabase.from('candidates').upsert({
          id: cand.id,
          candidate_number: cand.candidate_number,
          chairman_name: cand.chairman_name,
          vice_chairman_name: cand.vice_chairman_name,
          photo_url: cand.photo_url,
          slogan: cand.slogan,
          vision: cand.vision,
          mission: cand.mission,
          vote_count: cand.vote_count,
        });
      }

      for (const s of students) {
        await supabase.from('students').upsert({
          id: s.id,
          nisn: s.nisn,
          name: s.name,
          birth_date: s.birth_date,
          class_id: s.class_id || null,
          gender: s.gender || 'L',
          religion: s.religion || 'Islam',
          address: s.address || '',
          has_voted: s.has_voted,
          voted_at: s.voted_at,
        });
      }

      await supabase.from('settings').upsert({
        id: 1,
        school_name: settings.school_name,
        school_logo: settings.school_logo,
        election_period: settings.election_period,
        is_election_active: settings.is_election_active,
        admin_username: settings.admin_username,
        admin_password_hash: settings.admin_password_hash,
      });

      for (const m of members) {
        await supabase.from('osis_members').upsert(m);
      }

      for (const p of programs) {
        await supabase.from('osis_programs').upsert(p);
      }

      for (const meet of meetings) {
        await supabase.from('osis_meetings').upsert(meet);
      }

      for (const d of docs) {
        await supabase.from('osis_documents').upsert(d);
      }

      return {
        success: true,
        message: 'Berhasil menyinkronkan seluruh data pemilihan dan modul internal OSIS ke Supabase!',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sinkronisasi gagal';
      return { success: false, message: msg };
    }
  }
}

export const dbService = new DatabaseService();
