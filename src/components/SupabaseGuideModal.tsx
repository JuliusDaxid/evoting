import React, { useState } from 'react';
import { dbService } from '../services/dbService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const SupabaseGuideModal: React.FC<Props> = ({ isOpen, onClose, onSyncComplete }) => {
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const sqlScript = `-- ==============================================================================
-- eOSIS - SKRIP DATABASE SUPABASE RESMI & LENGKAP (VERSI TERBARU & IDEMPOTEN)
-- Jalankan skrip ini di SQL Editor dashboard Supabase Anda:
-- URL: https://supabase.com/dashboard/project/uyyagxxaamnschocajpe/sql
-- ==============================================================================
-- Pembaruan Khusus:
-- 1. Mendukung penuh Import Excel DPT Siswa Massal (NISN, Nama, Tanggal Lahir,
--    Jenis Kelamin, Agama, Alamat, dan class_id NULL/Belum Ditentukan).
-- 2. Memperbaiki constraint class_id (DROP NOT NULL) agar siswa yang baru
--    di-import dari Excel tanpa kelas dapat tersimpan dengan lancar.
-- 3. Memastikan semua policy RLS bebas konflik ("policy already exists").
-- 4. Memberikan GRANT akses penuh untuk role anon, authenticated, & service_role.
-- 5. Memuat ulang schema cache PostgREST (NOTIFY pgrst) agar kolom baru langsung aktif.
-- ==============================================================================

-- 0. AKTIFKAN EXTENSION UUID & KRIPTOGRAFI
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABEL KELAS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. TABEL SISWA (DPT / PEMILIH)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nisn VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL DEFAULT '2011-01-01',
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    gender VARCHAR(20) DEFAULT 'L',
    religion VARCHAR(50) DEFAULT 'Islam',
    address TEXT DEFAULT '',
    has_voted BOOLEAN DEFAULT FALSE NOT NULL,
    voted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan indeks unik NISN ada untuk mencegah duplikasi & mendukung UPSERT cepat
CREATE UNIQUE INDEX IF NOT EXISTS students_nisn_unique_idx ON public.students (nisn);
CREATE INDEX IF NOT EXISTS students_class_id_idx ON public.students (class_id);
CREATE INDEX IF NOT EXISTS students_has_voted_idx ON public.students (has_voted);

-- ==============================================================================
-- MIGRASI OTOMATIS JIKA TABEL STUDENTS SUDAH DIBUAT SEBELUMNYA
-- ==============================================================================
-- A. Tambahkan kolom baru jika belum ada
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'L';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS religion VARCHAR(50) DEFAULT 'Islam';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS has_voted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS voted_at TIMESTAMPTZ;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- B. SANGAT PENTING UNTUK IMPORT EXCEL:
-- Izinkan class_id bernilai NULL agar siswa impor tanpa kelas tidak gagal foreign key/not-null constraint!
ALTER TABLE public.students ALTER COLUMN class_id DROP NOT NULL;

-- C. Perluas kapasitas panjang karakter dan set default yang aman
ALTER TABLE public.students ALTER COLUMN nisn TYPE VARCHAR(50);
ALTER TABLE public.students ALTER COLUMN name TYPE VARCHAR(255);
ALTER TABLE public.students ALTER COLUMN gender TYPE VARCHAR(20);
ALTER TABLE public.students ALTER COLUMN religion TYPE VARCHAR(50);
ALTER TABLE public.students ALTER COLUMN birth_date SET DEFAULT '2011-01-01';
ALTER TABLE public.students ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ------------------------------------------------------------------------------
-- 3. TABEL KANDIDAT (PASLON KETUA & WAKIL KETUA OSIS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_number INT NOT NULL UNIQUE,
    chairman_name VARCHAR(150) NOT NULL,
    vice_chairman_name VARCHAR(150) NOT NULL,
    photo_url TEXT,
    vision TEXT NOT NULL,
    mission JSONB NOT NULL DEFAULT '[]'::jsonb,
    slogan VARCHAR(255),
    vote_count INT DEFAULT 0 NOT NULL CHECK (vote_count >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. TABEL PENGATURAN APLIKASI
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
    id INT PRIMARY KEY DEFAULT 1,
    school_name VARCHAR(200) NOT NULL DEFAULT 'SMP Negeri 1 Dayun',
    school_logo TEXT DEFAULT 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=300&q=80',
    election_period VARCHAR(100) NOT NULL DEFAULT 'Masa Bakti 2026/2027',
    is_election_active BOOLEAN NOT NULL DEFAULT TRUE,
    admin_username VARCHAR(100) NOT NULL DEFAULT 'admin',
    admin_password_hash VARCHAR(255) NOT NULL DEFAULT 'admin123',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.settings (id, school_name, school_logo, election_period, is_election_active, admin_username, admin_password_hash)
VALUES (1, 'SMP Negeri 1 Dayun', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=300&q=80', 'Masa Bakti 2026/2027', TRUE, 'admin', 'admin123')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. FUNCTION / RPC VOTING AMAN (Satu Siswa = Satu Suara, Bebas Manipulasi)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cast_vote(
    p_nisn VARCHAR(50),
    p_birth_date DATE,
    p_candidate_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student public.students%ROWTYPE;
    v_candidate public.candidates%ROWTYPE;
    v_settings public.settings%ROWTYPE;
BEGIN
    SELECT * INTO v_settings FROM public.settings WHERE id = 1;
    IF v_settings.is_election_active IS FALSE THEN
        RAISE EXCEPTION 'Pemilihan OSIS sedang ditutup atau belum dibuka oleh panitia.';
    END IF;

    SELECT * INTO v_student 
    FROM public.students 
    WHERE TRIM(nisn) = TRIM(p_nisn) AND birth_date = p_birth_date
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Data siswa tidak ditemukan. Periksa kembali NISN dan Tanggal Lahir Anda.';
    END IF;

    IF v_student.has_voted = TRUE THEN
        RAISE EXCEPTION 'Anda sudah menggunakan hak suara Anda sebelumnya. Setiap siswa hanya dapat memilih 1 kali!';
    END IF;

    SELECT * INTO v_candidate
    FROM public.candidates
    WHERE id = p_candidate_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Kandidat yang dipilih tidak valid.';
    END IF;

    UPDATE public.students
    SET has_voted = TRUE,
        voted_at = NOW()
    WHERE id = v_student.id;

    UPDATE public.candidates
    SET vote_count = vote_count + 1
    WHERE id = p_candidate_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Suara Anda berhasil dicatat, terima kasih telah berpartisipasi!',
        'voted_at', NOW()
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. TABEL ANGGOTA & PENGURUS OSIS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.osis_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    role VARCHAR(100) NOT NULL,
    sekbid VARCHAR(100) DEFAULT 'Inti',
    level INT NOT NULL DEFAULT 5,
    class_name VARCHAR(50) NOT NULL,
    phone VARCHAR(30),
    photo_url TEXT,
    period VARCHAR(100) NOT NULL DEFAULT 'Masa Bakti 2026/2027',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. TABEL PROGRAM KERJA (PROJA TRACKER)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.osis_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    sekbid VARCHAR(100) NOT NULL,
    pj_id UUID REFERENCES public.osis_members(id) ON DELETE SET NULL,
    pj_name VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'rencana',
    progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget BIGINT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. TABEL RAPAT & KEGIATAN (ABSENSI)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.osis_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    date DATE NOT NULL,
    time VARCHAR(50) NOT NULL,
    location VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. TABEL DETAIL KEHADIRAN (ABSENSI ANGGOTA)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.osis_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.osis_meetings(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.osis_members(id) ON DELETE CASCADE,
    member_name VARCHAR(150) NOT NULL,
    member_role VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'hadir',
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(meeting_id, member_id)
);

-- ------------------------------------------------------------------------------
-- 10. TABEL E-ARCHIVE / ARSIP DOKUMEN KEGIATAN
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.osis_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    file_type VARCHAR(20) NOT NULL DEFAULT 'pdf',
    file_url TEXT NOT NULL,
    file_size VARCHAR(50) DEFAULT '1.2 MB',
    uploaded_by VARCHAR(150) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- KEBIJAKAN ROW LEVEL SECURITY (RLS) - BEBAS ERROR & IDEMPOTEN
-- Menghapus policy lama terlebih dahulu agar tidak memicu error "already exists"
-- ==============================================================================
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osis_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osis_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osis_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osis_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osis_documents ENABLE ROW LEVEL SECURITY;

-- Drop policies classes
DROP POLICY IF EXISTS "Allow public select classes" ON public.classes;
DROP POLICY IF EXISTS "Enable all ops classes" ON public.classes;
DROP POLICY IF EXISTS "Enable all access for classes" ON public.classes;
CREATE POLICY "Enable all access for classes" ON public.classes FOR ALL TO public USING (true) WITH CHECK (true);

-- Drop policies students (KUNCI AGAR IMPORT EXCEL & CRUD SISWA BERHASIL TANPA BLOKIR)
DROP POLICY IF EXISTS "Allow public select students" ON public.students;
DROP POLICY IF EXISTS "Enable all ops students" ON public.students;
DROP POLICY IF EXISTS "Enable all access for students" ON public.students;
CREATE POLICY "Enable all access for students" ON public.students FOR ALL TO public USING (true) WITH CHECK (true);

-- Drop policies candidates
DROP POLICY IF EXISTS "Allow public select candidates" ON public.candidates;
DROP POLICY IF EXISTS "Enable all ops candidates" ON public.candidates;
DROP POLICY IF EXISTS "Enable all access for candidates" ON public.candidates;
CREATE POLICY "Enable all access for candidates" ON public.candidates FOR ALL TO public USING (true) WITH CHECK (true);

-- Drop policies settings
DROP POLICY IF EXISTS "Allow public select settings" ON public.settings;
DROP POLICY IF EXISTS "Enable all ops settings" ON public.settings;
DROP POLICY IF EXISTS "Enable all access for settings" ON public.settings;
CREATE POLICY "Enable all access for settings" ON public.settings FOR ALL TO public USING (true) WITH CHECK (true);

-- Drop policies OSIS modules
DROP POLICY IF EXISTS "Allow public select osis_members" ON public.osis_members;
DROP POLICY IF EXISTS "Enable all ops osis_members" ON public.osis_members;
DROP POLICY IF EXISTS "Enable all access for osis_members" ON public.osis_members;
CREATE POLICY "Enable all access for osis_members" ON public.osis_members FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select osis_programs" ON public.osis_programs;
DROP POLICY IF EXISTS "Enable all ops osis_programs" ON public.osis_programs;
DROP POLICY IF EXISTS "Enable all access for osis_programs" ON public.osis_programs;
CREATE POLICY "Enable all access for osis_programs" ON public.osis_programs FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select osis_meetings" ON public.osis_meetings;
DROP POLICY IF EXISTS "Enable all ops osis_meetings" ON public.osis_meetings;
DROP POLICY IF EXISTS "Enable all access for osis_meetings" ON public.osis_meetings;
CREATE POLICY "Enable all access for osis_meetings" ON public.osis_meetings FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select osis_attendance" ON public.osis_attendance;
DROP POLICY IF EXISTS "Enable all ops osis_attendance" ON public.osis_attendance;
DROP POLICY IF EXISTS "Enable all access for osis_attendance" ON public.osis_attendance;
CREATE POLICY "Enable all access for osis_attendance" ON public.osis_attendance FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select osis_documents" ON public.osis_documents;
DROP POLICY IF EXISTS "Enable all ops osis_documents" ON public.osis_documents;
DROP POLICY IF EXISTS "Enable all access for osis_documents" ON public.osis_documents;
CREATE POLICY "Enable all access for osis_documents" ON public.osis_documents FOR ALL TO public USING (true) WITH CHECK (true);

-- ==============================================================================
-- HAK AKSES PERIZINAN (GRANT PERMISSIONS) UNTUK SUPABASE POSTGREST
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cast_vote(VARCHAR, DATE, UUID) TO anon, authenticated, service_role;

-- ==============================================================================
-- REFRESH SCHEMA CACHE POSTGREST (SANGAT PENTING!)
-- Memaksa Supabase mendeteksi kolom gender, religion, address, dll secara instan
-- ==============================================================================
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- SEED DATA AWAL CONTOH (Hanya disisipkan jika belum ada data)
-- ==============================================================================
INSERT INTO public.classes (name, description) VALUES
('VII A', 'Kelas 7 Unggulan Akademik'),
('VII B', 'Kelas 7 Reguler'),
('VIII A', 'Kelas 8 Unggulan'),
('VIII B', 'Kelas 8 Reguler'),
('IX A', 'Kelas 9 Persiapan Ujian'),
('IX B', 'Kelas 9 Reguler')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.osis_members (id, name, role, sekbid, level, class_name, phone, photo_url, period) VALUES
('a1111111-1111-1111-1111-111111111101', 'Drs. Hendro Wibowo, M.Pd.', 'Pembina OSIS', 'Kesiswaan', 1, 'Dewan Guru', '081234567890', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80', 'Masa Bakti 2026/2027'),
('a1111111-1111-1111-1111-111111111102', 'Muhammad Farhan Pratama', 'Ketua Umum OSIS', 'Inti', 2, 'VIII A', '081398765432', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80', 'Masa Bakti 2026/2027'),
('a1111111-1111-1111-1111-111111111103', 'Alya Siti Nurhaliza', 'Wakil Ketua OSIS', 'Inti', 3, 'VIII B', '081287654321', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', 'Masa Bakti 2026/2027'),
('a1111111-1111-1111-1111-111111111104', 'Zahra Cantika Putri', 'Sekretaris Umum', 'Inti', 4, 'VIII A', '081578901234', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80', 'Masa Bakti 2026/2027'),
('a1111111-1111-1111-1111-111111111105', 'Bima Sakti Nugraha', 'Bendahara Umum', 'Inti', 4, 'VIII B', '081890123456', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', 'Masa Bakti 2026/2027')
ON CONFLICT (id) DO NOTHING;
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await dbService.syncInitialDataToSupabase();
      setSyncStatus(res.message);
      if (res.success && onSyncComplete) {
        onSyncComplete();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal sinkronisasi';
      setSyncStatus('Error: ' + msg);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
              <i className="bi bi-database-check"></i>
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Integrasi Database Supabase eOSIS</h3>
              <p className="text-blue-100 text-xs">Pemilihan Suara &amp; Modul Manajemen Internal OSIS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition"
          >
            <i className="bi bi-x-lg text-lg"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Info Banner */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 flex items-start gap-3">
            <i className="bi bi-info-circle-fill text-blue-600 text-xl mt-0.5"></i>
            <div>
              <h4 className="font-semibold text-sm mb-1">Informasi Setup Supabase</h4>
              <p className="text-xs text-blue-800 leading-relaxed">
                Skrip ini mencakup tabel pemilihan OSIS (kelas, siswa, kandidat, settings) dan modul internal pengurus OSIS (struktur organisasi, proja tracker, presensi kegiatan, dan e-archive dokumen).
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="font-semibold text-slate-800 block text-xs">Skrip SQL Lengkap &amp; Function RPC</span>
              <span className="text-xs text-slate-500">Siap dieksekusi di Supabase Dashboard &gt; SQL Editor</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-xs rounded-xl transition shadow-xs cursor-pointer"
              >
                <i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'}`}></i>
                {copied ? 'Tersalin ke Clipboard!' : 'Salin Seluruh SQL'}
              </button>
              <button
                onClick={handleSyncToSupabase}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-medium text-xs rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <i className={`bi ${isSyncing ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-upload'}`}></i>
                {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Data Awal'}
              </button>
            </div>
          </div>

          {syncStatus && (
            <div className={`p-3 rounded-xl text-xs font-medium ${syncStatus.includes('Berhasil') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
              <i className="bi bi-bell-fill me-1"></i> {syncStatus}
            </div>
          )}

          {/* Code Viewer */}
          <div className="relative">
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-xs font-mono max-h-72 overflow-y-auto leading-relaxed border border-slate-800 shadow-inner">
              {sqlScript}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
