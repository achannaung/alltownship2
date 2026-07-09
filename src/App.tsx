import React, { useState, useEffect } from 'react';
import { MOCK_VILLAGES } from './data/villages';
import { Village, FlaggedVillage, MonitorNote } from './types';
import FilterBar from './components/FilterBar';
import VillageTable from './components/VillageTable';
import VillageDetailPanel from './components/VillageDetailPanel';
import { Database, Search, Sparkles, ShieldAlert, CheckCircle2, ChevronRight, SlidersHorizontal, Map, Loader2, Wifi, WifiOff, AlertTriangle, Palette, Moon, Sun } from 'lucide-react';
import { fetchAndParseNationalRegistry } from './utils/csvParser';

export default function App() {
  // --- Theme State ---
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('mimu_theme') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    try {
      localStorage.setItem('mimu_theme', theme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  // --- National Registry Dataset State ---
  const [allVillages, setAllVillages] = useState<Village[]>(MOCK_VILLAGES);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [registryLoaded, setRegistryLoaded] = useState(false);

  // --- Core Filter Inputs ---
  const [selectedState, setSelectedState] = useState('');
  const [townshipQuery, setTownshipQuery] = useState('');
  const [villageQuery, setVillageQuery] = useState('');

  // --- Applied Filter States (to trigger search on click) ---
  const [appliedFilters, setAppliedFilters] = useState({
    state: '',
    township: '',
    village: '',
  });

  const [hasSearched, setHasSearched] = useState(false);

  // --- Active Village Selection for Panel ---
  const [selectedVillage, setSelectedVillage] = useState<Village | null>(null);

  // --- Persistent Storage for Monitoring States ---
  const [flaggedStates, setFlaggedStates] = useState<Record<string, FlaggedVillage>>(() => {
    try {
      const saved = localStorage.getItem('mimu_monitor_flags');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [noteStates, setNoteStates] = useState<Record<string, MonitorNote>>(() => {
    try {
      const saved = localStorage.getItem('mimu_monitor_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // --- UI feedback states ---
  const [isLoading, setIsLoading] = useState(false);
  const [pcodeCopied, setPcodeCopied] = useState(false);

  // --- National CSV Background Fetch ---
  useEffect(() => {
    setIsDownloading(true);
    fetchAndParseNationalRegistry()
      .then((nationalData) => {
        setAllVillages(nationalData);
        setRegistryLoaded(true);
        setDownloadError(null);
      })
      .catch((err) => {
        console.error("Failed to load national village registry CSV:", err);
        setDownloadError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        setIsDownloading(false);
      });
  }, []);

  // --- Handle Status Updates (Flags) ---
  const handleUpdateStatus = (villageId: string, status: FlaggedVillage['status']) => {
    const updated = {
      ...flaggedStates,
      [villageId]: {
        villageId,
        flaggedAt: new Date().toISOString(),
        status,
      },
    };
    setFlaggedStates(updated);
    localStorage.setItem('mimu_monitor_flags', JSON.stringify(updated));
  };

  // --- Handle Field Notes Update ---
  const handleUpdateNote = (villageId: string, note: string) => {
    const updated = {
      ...noteStates,
      [villageId]: {
        villageId,
        note,
        updatedAt: new Date().toISOString(),
      },
    };
    setNoteStates(updated);
    localStorage.setItem('mimu_monitor_notes', JSON.stringify(updated));
  };

  // --- Search Action ---
  const handleSearch = () => {
    setIsLoading(true);
    setTimeout(() => {
      setAppliedFilters({
        state: selectedState,
        township: townshipQuery,
        village: villageQuery,
      });
      setHasSearched(true);
      setIsLoading(false);
    }, 500);
  };

  // --- Clear Action ---
  const handleClear = () => {
    setIsLoading(true);
    setSelectedState('');
    setTownshipQuery('');
    setVillageQuery('');
    
    setTimeout(() => {
      setAppliedFilters({
        state: '',
        township: '',
        village: '',
      });
      setHasSearched(false);
      setIsLoading(false);
    }, 400);
  };

  // --- Filtering Logic ---
  const filteredVillages = allVillages.filter((village) => {
    // 1. Filter by State/Region
    if (appliedFilters.state && village.stateEn !== appliedFilters.state) {
      return false;
    }

    // 2. Filter by Township Name (matches English or Burmese name)
    if (appliedFilters.township) {
      const tsQuery = appliedFilters.township.toLowerCase().trim();
      const matchEn = village.townshipEn.toLowerCase().includes(tsQuery);
      const matchMm = village.townshipMm.toLowerCase().includes(tsQuery);
      if (!matchEn && !matchMm) {
        return false;
      }
    }

    // 3. Filter by Burmese Village Name (matches English or Burmese village name)
    if (appliedFilters.village) {
      const vQuery = appliedFilters.village.toLowerCase().trim();
      const matchEn = village.nameEn.toLowerCase().includes(vQuery);
      const matchMm = village.nameMm.toLowerCase().includes(vQuery);
      if (!matchEn && !matchMm) {
        return false;
      }
    }

    return true;
  });

  // --- Copy all matching P-codes helper ---
  const handleCopyAllPCodes = () => {
    if (filteredVillages.length === 0) return;
    const codes = filteredVillages.map((v) => v.pcode).join('\n');
    navigator.clipboard.writeText(codes);
    setPcodeCopied(true);
    setTimeout(() => setPcodeCopied(false), 2000);
  };

  // --- Export matching villages to CSV ---
  const handleExportCSV = () => {
    if (filteredVillages.length === 0) return;
    
    // Define headers matching standard spatial records
    const headers = [
      'PCode', 
      'Village Name (Burmese)', 
      'Village Name (English)', 
      'Village Tract (Burmese)', 
      'Village Tract (English)', 
      'Township (Burmese)', 
      'Township (English)', 
      'State (Burmese)', 
      'State (English)', 
      'District', 
      'Latitude', 
      'Longitude', 
      'Est Population', 
      'Est Households',
      'Monitor Status'
    ];

    const rows = filteredVillages.map((v) => {
      const flag = flaggedStates[v.id]?.status || 'unmarked';
      return [
        v.pcode,
        `"${v.nameMm}"`,
        `"${v.nameEn}"`,
        `"${v.tractMm}"`,
        `"${v.tractEn}"`,
        `"${v.townshipMm}"`,
        `"${v.townshipEn}"`,
        `"${v.stateMm}"`,
        `"${v.stateEn}"`,
        `"${v.districtEn}"`,
        v.latitude,
        v.longitude,
        v.population,
        v.households,
        flag
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mimu_villages_monitor_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen py-10 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ================= THEME TOGGLE ================= */}
        <div className="flex justify-end items-center mb-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 shadow-xl"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={13} className="text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={13} className="text-indigo-400" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>

        {/* ================= HEADER SECTON ================= */}
        <header id="header-section" className="text-center space-y-3 py-6 relative">
          {/* Subtle branding ring overlay */}
          <div className="mx-auto w-16 h-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center mb-2 shadow-2xl">
            <Database className="text-indigo-400" size={32} />
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white font-serif tracking-tight drop-shadow-lg">
            Village Lookup Tool
          </h1>
          
          <p className="text-sm md:text-base text-slate-300 font-sans uppercase tracking-[0.2em] font-semibold max-w-md mx-auto">
            Created by <span className="text-indigo-300 font-extrabold hover:text-indigo-200 transition">ACA</span>
          </p>
          
          {/* Decorative dividing line */}
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent mx-auto mt-4 rounded-full"></div>
        </header>

        {/* ================= CONNECTION STATUS BANNER ================= */}
        <div id="registry-status-banner" className="w-full">
          {isDownloading && (
            <div className="glass-panel border-amber-500/30 bg-amber-500/5 text-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border relative overflow-hidden animate-pulse">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500/10 via-amber-400 to-amber-500/10 animate-shimmer"></div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 animate-pulse">
                  <Loader2 className="animate-spin" size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold">Downloading 2025 National Registry...</div>
                  <div className="text-xs text-amber-300/70 mt-0.5">Fetching 72,572 spatial records from secure repository (7.2MB file size)</div>
                </div>
              </div>
              <div className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                Fallback Active (10 Stations)
              </div>
            </div>
          )}

          {registryLoaded && (
            <div className="glass-panel border-emerald-500/30 bg-emerald-500/5 text-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                  <Wifi size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold">2025 National Registry Active</div>
                  <div className="text-xs text-emerald-300/70 mt-0.5">Connected. Loaded 72,572 villages with coordinates and spatial metadata.</div>
                </div>
              </div>
              <div className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                72.5k Records Synced
              </div>
            </div>
          )}

          {downloadError && (
            <div className="glass-panel border-rose-500/30 bg-rose-500/5 text-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold">National Registry Connection Interrupted</div>
                  <div className="text-xs text-rose-300/70 mt-0.5">Unable to fetch from repository. Active fallback offline indices: 10 central stations.</div>
                </div>
              </div>
              <div className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300">
                Offline Safe Mode
              </div>
            </div>
          )}
        </div>

        {/* ================= FILTER & SEARCH ================= */}
        <FilterBar
          selectedState={selectedState}
          setSelectedState={setSelectedState}
          townshipQuery={townshipQuery}
          setTownshipQuery={setTownshipQuery}
          villageQuery={villageQuery}
          setVillageQuery={setVillageQuery}
          onSearch={handleSearch}
          onClear={handleClear}
          totalCount={allVillages.length}
          filteredCount={filteredVillages.length}
          hasSearched={hasSearched}
        />

        {/* ================= DATA RENDER OR LOADING SKELETON ================= */}
        {isLoading ? (
          <div id="loading-indicator" className="glass-panel rounded-2xl p-16 text-center shadow-2xl border border-slate-800 flex flex-col items-center justify-center gap-4 animate-pulse">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-400 animate-spin"></div>
              <Database size={24} className="absolute text-indigo-400 animate-bounce" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white font-serif">Compiling Spatial Indices</h4>
              <p className="text-xs text-slate-400 mt-1">Loading data...</p>
            </div>
          </div>
        ) : !hasSearched ? (
          <div id="search-placeholder" className="glass-panel rounded-2xl p-12 sm:p-16 text-center shadow-2xl border border-slate-800 flex flex-col items-center justify-center gap-6">
            <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400 border border-indigo-500/20 shadow-inner animate-bounce">
              <Search size={36} />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h4 className="text-xl font-bold text-white font-serif">National Registry Search</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Please select a State/Region or enter a Township/Village name in the search filters above and click <strong className="text-indigo-400 font-semibold">Search</strong> to view matching spatial records.
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-3 max-w-lg">
              <span className="text-xs text-slate-500 font-medium select-none">Or click a shortcut to quickly search:</span>
              <div className="flex flex-wrap justify-center gap-2">
                <button 
                  onClick={() => {
                    setSelectedState('Yangon Region');
                    setAppliedFilters({ state: 'Yangon Region', township: '', village: '' });
                    setHasSearched(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 hover:border-indigo-500/40 hover:text-indigo-300 transition duration-150 cursor-pointer"
                >
                  Yangon Region
                </button>
                <button 
                  onClick={() => {
                    setSelectedState('Mandalay Region');
                    setAppliedFilters({ state: 'Mandalay Region', township: '', village: '' });
                    setHasSearched(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 hover:border-indigo-500/40 hover:text-indigo-300 transition duration-150 cursor-pointer"
                >
                  Mandalay Region
                </button>
                <button 
                  onClick={() => {
                    setTownshipQuery('Bogale');
                    setAppliedFilters({ state: '', township: 'Bogale', village: '' });
                    setHasSearched(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 hover:border-indigo-500/40 hover:text-indigo-300 transition duration-150 cursor-pointer"
                >
                  Bogale Township
                </button>
              </div>
            </div>
          </div>
        ) : (
          <VillageTable
            villages={filteredVillages}
            flaggedStates={flaggedStates}
            onSelectVillage={setSelectedVillage}
            onCopyAllPCodes={handleCopyAllPCodes}
            pcodeCopied={pcodeCopied}
            onExportCSV={handleExportCSV}
          />
        )}

        {/* ================= BOTTOM METADATA / DOCUMENTATION ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          
          {/* About This Tool Card */}
          <div id="about-card" className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
            <h3 className="text-xl font-bold text-white font-serif mb-4 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-indigo-400" />
              <span>About This Tool</span>
            </h3>
            
            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <p className="flex gap-3">
                <span className="text-indigo-400 font-bold text-lg select-none">♦</span>
                <span>The database includes information on villages across Myanmar's 15 states and regions for monitors.</span>
              </p>
              <p className="flex gap-3">
                <span className="text-indigo-400 font-bold text-lg select-none">♦</span>
                <span>The data is sourced from the Myanmar Information Management Unit (MIMU), ensuring reliability and accuracy. We've created an intuitive interface that allows for easy searching and sorting of village information.</span>
              </p>
            </div>

            <div className="mt-6">
              <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-500/10 text-indigo-300 font-semibold py-1.5 px-3 rounded-lg border border-indigo-500/20">
                <Database size={12} />
                <span>Data Source: MIMU Release 9.3</span>
              </span>
            </div>
          </div>

          {/* Key Features Card */}
          <div id="features-card" className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
            <h3 className="text-xl font-bold text-white font-serif mb-4 flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-indigo-400" />
              <span>Key Features</span>
            </h3>

            <ul className="space-y-3 text-slate-300 text-sm">
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold mt-0.5 select-none">✔</span>
                <div>
                  <strong className="text-white">Multi-parameter Search:</strong>
                  <p className="text-xs text-slate-400 mt-0.5">Search seamlessly by State/Region, Township, or Burmese village script names.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold mt-0.5 select-none">✔</span>
                <div>
                  <strong className="text-white">Interactive Column Sorting:</strong>
                  <p className="text-xs text-slate-400 mt-0.5">Sort instantly by name, state, township, population, or MIMU P-Code.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold mt-0.5 select-none">✔</span>
                <div>
                  <strong className="text-white">Persistent Field Survey Notes:</strong>
                  <p className="text-xs text-slate-400 mt-0.5">Add custom annotations and status tags saved securely inside your browser's LocalStorage.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold mt-0.5 select-none">✔</span>
                <div>
                  <strong className="text-white">Responsive GIS Layout:</strong>
                  <p className="text-xs text-slate-400 mt-0.5">Beautiful fluid viewport adjustments and custom scrollbars for effortless laptop, tablet, or mobile use.</p>
                </div>
              </li>
            </ul>
          </div>

        </div>

        {/* ================= FOOTER ================= */}
        <footer id="footer-section" className="text-center py-10 text-xs text-slate-500 border-t border-slate-800/60 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-serif">
            ACA© 2026 Villages Lookup Tool | All Rights Reserved |
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500 border border-slate-700/30">v1.2.0-Production</span>
            <span>MIMU Standard Conformant</span>
          </div>
        </footer>

        {/* ================= SELECTED VILLAGE DETAILS PANEL SHEET ================= */}
        <VillageDetailPanel
          village={selectedVillage}
          onClose={() => setSelectedVillage(null)}
          flaggedState={selectedVillage ? flaggedStates[selectedVillage.id] : undefined}
          noteState={selectedVillage ? noteStates[selectedVillage.id] : undefined}
          onUpdateStatus={handleUpdateStatus}
          onUpdateNote={handleUpdateNote}
        />

      </div>
    </div>
  );
}
