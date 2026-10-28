export interface ClassItem {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface Student {
  id: string;
  nisn: string;
  name: string;
  birth_date: string; // YYYY-MM-DD
  gender?: 'L' | 'P' | string; // Jenis Kelamin: L (Laki-laki) / P (Perempuan)
  religion?: string; // Agama: Islam, Kristen Protestan, Katolik, Hindu, Buddha, Khonghucu
  address?: string; // Alamat tempat tinggal
  class_id?: string;
  class_name?: string;
  has_voted: boolean;
  voted_at?: string | null;
  created_at?: string;
}

export interface Candidate {
  id: string;
  candidate_number: number;
  chairman_name: string;
  vice_chairman_name: string;
  photo_url: string;
  vision: string;
  mission: string[];
  slogan: string;
  vote_count: number;
  created_at?: string;
}

export interface Settings {
  id?: number;
  school_name: string;
  school_logo: string;
  election_period: string;
  is_election_active: boolean;
  admin_username: string;
  admin_password_hash: string;
  updated_at?: string;
}

export type UserRole = 'guest' | 'student' | 'admin';

export interface StudentSession {
  role: 'student';
  student: Student;
}

export interface AdminSession {
  role: 'admin';
  username: string;
  isSuperAdmin?: boolean;
}

export type AuthSession = StudentSession | AdminSession | null;

// ==========================================
// SUPER ADMIN & AUDIT TYPES
// ==========================================

export interface BallotAuditRecord {
  id: string;
  student_id: string;
  nisn: string;
  student_name: string;
  class_name: string;
  candidate_id: string;
  candidate_number: number;
  candidate_names: string;
  voted_at: string;
}

export interface DptBallotAuditItem {
  student: Student;
  ballot?: BallotAuditRecord | null;
  candidate?: Candidate | null;
}

// ==========================================
// CHANGELOG & CREDITS
// ==========================================

export interface ChangelogItem {
  id: string;
  version: string;
  release_date: string;
  title: string;
  type: 'major' | 'feature' | 'improvement' | 'fix';
  summary: string;
  changes: string[];
  author?: string;
  created_at?: string;
}

export interface CreditsInfo {
  developer_name: string;
  lead_role: string;
  institution: string;
  supervisor: string;
  version_code: string;
  release_year: string;
  contact_email: string;
  tech_stack: string[];
  acknowledgments: string;
  special_notes: string;
  last_updated?: string;
}

// ==========================================
// MODUL INTERNAL PENGURUS OSIS
// ==========================================

export interface OsisMember {
  id: string;
  name: string;
  role: string; // Pembina, Ketua, Wakil Ketua, Sekretaris, Bendahara, Koordinator Sekbid, dll.
  sekbid?: string; // Sekbid 1 s/d 8 atau Inti
  level: number; // 1: Pembina, 2: Ketua, 3: Wakil, 4: Sekretaris/Bendahara, 5: Koordinator Sekbid, 6: Anggota Bidang
  class_name: string;
  phone: string;
  photo_url: string;
  period: string;
  is_active: boolean;
  created_at?: string;
}

export type ProgramStatus = 'rencana' | 'sedang_berjalan' | 'selesai';

export interface OsisProgram {
  id: string;
  title: string;
  sekbid: string;
  pj_id?: string;
  pj_name: string;
  status: ProgramStatus;
  progress: number; // 0 - 100
  start_date: string;
  end_date: string;
  budget: number;
  description: string;
  created_at?: string;
}

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpa';

export interface OsisMeeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  created_at?: string;
}

export interface OsisAttendance {
  id: string;
  meeting_id: string;
  member_id: string;
  member_name: string;
  member_role: string;
  status: AttendanceStatus;
  notes?: string;
  updated_at?: string;
}

export type DocumentCategory = 'proposal' | 'lpj' | 'surat' | 'notulensi' | 'dokumentasi';

export interface OsisDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  file_type: 'pdf' | 'docx' | 'xlsx' | 'link' | 'image';
  file_url: string;
  file_size?: string;
  uploaded_by: string;
  date: string;
  description?: string;
  created_at?: string;
}
