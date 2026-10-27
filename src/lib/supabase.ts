import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default configuration for eOSIS Supabase Database
export const DEFAULT_SUPABASE_URL = 'https://uyyagxxaamnschocajpe.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5eWFneHhhYW1uc2Nob2NhanBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MTI3MDIsImV4cCI6MjEwODM4ODcwMn0.Sk8TvehBFqyzNATi6oB70vwM0IxfiPUo7VeFJUcLpUo';

export const STORAGE_CUSTOM_URL_KEY = 'eosis_custom_supabase_url';
export const STORAGE_CUSTOM_ANON_KEY = 'eosis_custom_supabase_anon_key';

/**
 * Pembersih URL Supabase secara aman:
 * - Memotong spasi di awal/akhir
 * - Menghilangkan akhiran /rest/v1/ atau /rest/v1
 * - Menghilangkan garis miring ganda/akhir (trailing slashes)
 * - Memastikan protokol https://
 */
export function cleanSupabaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';

  // Hapus trailing slashes terlebih dahulu
  url = url.replace(/\/+$/, '');

  // Potong /rest/v1 atau /rest/v1/ secara case-insensitive
  url = url.replace(/\/rest\/v1\/?$/i, '');

  // Hapus lagi jika ada trailing slash tersisa setelah pemotongan
  url = url.replace(/\/+$/, '');

  // Pastikan memiliki skema protokol https:// atau http://
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  return url;
}

/**
 * Mengambil konfigurasi Supabase aktif (kustom dari localStorage jika ada, atau default).
 */
export function getActiveSupabaseConfig(): {
  url: string;
  anonKey: string;
  isCustom: boolean;
} {
  if (typeof window !== 'undefined') {
    try {
      const customUrl = localStorage.getItem(STORAGE_CUSTOM_URL_KEY);
      const customKey = localStorage.getItem(STORAGE_CUSTOM_ANON_KEY);
      if (customUrl && customKey && customUrl.trim() && customKey.trim()) {
        return {
          url: cleanSupabaseUrl(customUrl),
          anonKey: customKey.trim(),
          isCustom: true,
        };
      }
    } catch (e) {
      console.warn('Gagal membaca custom Supabase config dari localStorage:', e);
    }
  }

  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
    isCustom: false,
  };
}

// Inisialisasi client aktif pertama kali
const initialConfig = getActiveSupabaseConfig();
let activeClient: SupabaseClient = createClient(initialConfig.url, initialConfig.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Proxy object `supabase` agar seluruh import lama (`import { supabase } from '...'`)
 * secara instan dan reaktif mengarah ke client baru saat konfigurasi diubah di antarmuka web.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const val = (activeClient as any)[prop];
    if (typeof val === 'function') {
      return val.bind(activeClient);
    }
    return val;
  },
});

// Backward-compatible exported properties
export const SUPABASE_URL = initialConfig.url;
export const SUPABASE_ANON_KEY = initialConfig.anonKey;

/**
 * Menyimpan konfigurasi baru Supabase langsung dari UI admin:
 * - Membersihkan URL dari /rest/v1/
 * - Menyimpan ke localStorage
 * - Me-refresh activeClient secara runtime
 * - Memicu event sinkronisasi 'eosis_supabase_reconnected'
 */
export function saveSupabaseConfig(rawUrl: string, rawKey: string): {
  success: boolean;
  cleanedUrl: string;
  error?: string;
} {
  try {
    const cleanedUrl = cleanSupabaseUrl(rawUrl);
    const cleanedKey = (rawKey || '').trim();

    if (!cleanedUrl) {
      return { success: false, cleanedUrl: '', error: 'API URL Supabase tidak boleh kosong.' };
    }
    if (!cleanedKey) {
      return { success: false, cleanedUrl, error: 'Anon Public Key Supabase tidak boleh kosong.' };
    }

    // Simpan ke localStorage
    localStorage.setItem(STORAGE_CUSTOM_URL_KEY, cleanedUrl);
    localStorage.setItem(STORAGE_CUSTOM_ANON_KEY, cleanedKey);

    // Refresh client runtime
    activeClient = createClient(cleanedUrl, cleanedKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('eosis_supabase_reconnected', {
          detail: { url: cleanedUrl, isCustom: true },
        })
      );
    }

    return { success: true, cleanedUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi Supabase';
    return { success: false, cleanedUrl: '', error: msg };
  }
}

/**
 * Mereset konfigurasi Supabase kembali ke default bawaan aplikasi.
 */
export function resetSupabaseConfigToDefault(): { url: string; anonKey: string } {
  try {
    localStorage.removeItem(STORAGE_CUSTOM_URL_KEY);
    localStorage.removeItem(STORAGE_CUSTOM_ANON_KEY);

    activeClient = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('eosis_supabase_reconnected', {
          detail: { url: DEFAULT_SUPABASE_URL, isCustom: false },
        })
      );
    }
  } catch (e) {
    console.warn('Gagal mereset config Supabase:', e);
  }

  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
  };
}

/**
 * Menguji kredensial Supabase (URL dan Anon Key) secara langsung tanpa harus menyimpan terlebih dahulu.
 */
export async function testSupabaseConnection(
  rawUrl: string,
  rawKey: string
): Promise<{
  success: boolean;
  message: string;
  cleanedUrl: string;
  tablesFound: boolean;
  details?: string;
}> {
  const cleanedUrl = cleanSupabaseUrl(rawUrl);
  const cleanedKey = (rawKey || '').trim();

  if (!cleanedUrl) {
    return {
      success: false,
      message: 'API URL Supabase wajib diisi.',
      cleanedUrl: '',
      tablesFound: false,
    };
  }
  if (!cleanedKey) {
    return {
      success: false,
      message: 'Anon Public Key Supabase wajib diisi.',
      cleanedUrl,
      tablesFound: false,
    };
  }

  try {
    const testClient = createClient(cleanedUrl, cleanedKey);
    const { data, error } = await testClient.from('candidates').select('id').limit(1);

    if (error) {
      if (
        error.message.includes('Could not find the table') ||
        error.code === '42P01' ||
        error.code === 'PGRST204' ||
        error.code === 'PGRST200'
      ) {
        return {
          success: true,
          cleanedUrl,
          tablesFound: false,
          message:
            'Koneksi ke Supabase berhasil terhubung, namun tabel eOSIS belum dibuat. Silakan jalankan Skrip SQL di SQL Editor Supabase Anda.',
          details: error.message,
        };
      }
      return {
        success: false,
        cleanedUrl,
        tablesFound: false,
        message: `Koneksi ditolak oleh Supabase: ${error.message}`,
        details: error.details || error.hint || error.code,
      };
    }

    return {
      success: true,
      cleanedUrl,
      tablesFound: true,
      message: 'Koneksi ke database Supabase BERHASIL! Tabel eOSIS terdeteksi dan aktif.',
      details: data ? `Terdeteksi response query dari tabel candidates.` : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal menghubungi endpoint Supabase';
    return {
      success: false,
      cleanedUrl,
      tablesFound: false,
      message: `Gagal terhubung: ${msg}. Pastikan URL dan Anon Key valid serta perangkat terhubung ke internet.`,
    };
  }
}
