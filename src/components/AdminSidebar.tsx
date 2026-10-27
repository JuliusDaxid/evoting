import React from 'react';

export type AdminMenuKey =
  | 'beranda'
  | 'kelas'
  | 'siswa'
  | 'kandidat'
  | 'perolehan'
  | 'struktur'
  | 'proja'
  | 'absensi'
  | 'notulen'
  | 'arsip'
  | 'pengaturan';

interface Props {
  activeMenu: AdminMenuKey;
  onSelectMenu: (menu: AdminMenuKey) => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  electionPeriod: string;
}

export const AdminSidebar: React.FC<Props> = ({
  activeMenu,
  onSelectMenu,
  onLogout,
  isMobileOpen,
  onCloseMobile,
  electionPeriod,
}) => {
  const electionItems: { key: AdminMenuKey; label: string; icon: string; badge?: string }[] = [
    { key: 'beranda', label: 'Beranda', icon: 'bi-grid-1x2-fill' },
    { key: 'kelas', label: 'Kelas', icon: 'bi-building' },
    { key: 'siswa', label: 'Siswa / DPT', icon: 'bi-people-fill' },
    { key: 'kandidat', label: 'Calon Kandidat', icon: 'bi-person-badge' },
    { key: 'perolehan', label: 'Perolehan Suara', icon: 'bi-bar-chart-fill' },
  ];

  const internalItems: { key: AdminMenuKey; label: string; icon: string; badge?: string }[] = [
    { key: 'struktur', label: 'Struktur Organisasi', icon: 'bi-diagram-3-fill' },
    { key: 'proja', label: 'Program Kerja (Proja)', icon: 'bi-calendar-event-fill', badge: 'Kalender' },
    { key: 'absensi', label: 'Absensi Kegiatan', icon: 'bi-calendar-check-fill' },
    { key: 'notulen', label: 'Notulen Generator', icon: 'bi-journal-text', badge: 'Baru' },
    { key: 'arsip', label: 'E-Archive Dokumen', icon: 'bi-folder-symlink-fill' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-slate-800 overflow-y-auto lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Section */}
        <div className="p-4 space-y-5">
          <div className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-900/60 to-indigo-900/40 border border-blue-500/30">
            <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider block">
              Panel Administrator OSIS
            </span>
            <span className="text-xs font-extrabold text-white block truncate">
              {electionPeriod || 'Masa Bakti 2026/2027'}
            </span>
          </div>

          {/* Group 1: Pemilihan OSIS */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-3 block mb-1">
              Pemilihan Umum OSIS
            </span>
            <nav className="space-y-1">
              {electionItems.map((item) => {
                const isActive = activeMenu === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onSelectMenu(item.key);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <i className={`bi ${item.icon} text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}></i>
                      <span className="truncate">{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Group 2: Manajemen Internal OSIS */}
          <div className="space-y-1 pt-2 border-t border-slate-800">
            <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider px-3 block mb-1 flex items-center justify-between">
              <span>Internal Pengurus</span>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">eOSIS Plus</span>
            </span>
            <nav className="space-y-1">
              {internalItems.map((item) => {
                const isActive = activeMenu === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onSelectMenu(item.key);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <i className={`bi ${item.icon} text-sm ${isActive ? 'text-white' : 'text-blue-400'}`}></i>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-blue-900/50 text-blue-300 border border-blue-700/50'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Group 3: Sistem */}
          <div className="space-y-1 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                onSelectMenu('pengaturan');
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeMenu === 'pengaturan'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className={`bi bi-gear-fill text-sm ${activeMenu === 'pengaturan' ? 'text-white' : 'text-slate-400'}`}></i>
                <span>Pengaturan Sistem</span>
              </div>
            </button>
          </div>
        </div>

        {/* Bottom Section: Logout */}
        <div className="p-4 border-t border-slate-800 space-y-2 shrink-0">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-600/20 border border-rose-500/20 transition cursor-pointer"
          >
            <i className="bi bi-box-arrow-right text-base text-rose-400"></i>
            <span>Keluar (Logout)</span>
          </button>
          <div className="text-[10px] text-slate-500 text-center font-mono">
            eOSIS v2.8 • Manajemen &amp; Pemilihan
          </div>
        </div>
      </aside>
    </>
  );
};
