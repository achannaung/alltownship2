import React from 'react';
import { Search, X, SlidersHorizontal, Database } from 'lucide-react';
import { MYANMAR_STATES_REGIONS } from '../data/villages';

interface FilterBarProps {
  selectedState: string;
  setSelectedState: (state: string) => void;
  townshipQuery: string;
  setTownshipQuery: (q: string) => void;
  villageQuery: string;
  setVillageQuery: (q: string) => void;
  onSearch: () => void;
  onClear: () => void;
  totalCount: number;
  filteredCount: number;
  hasSearched: boolean;
}

export default function FilterBar({
  selectedState,
  setSelectedState,
  townshipQuery,
  setTownshipQuery,
  villageQuery,
  setVillageQuery,
  onSearch,
  onClear,
  totalCount,
  filteredCount,
  hasSearched,
}: FilterBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div id="filter-card" className="glass-panel rounded-2xl p-6 shadow-2xl mb-8 relative overflow-hidden">
      {/* Absolute accent element */}
      <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300">
          <SlidersHorizontal size={20} id="filter-icon" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white font-serif">Search & Filter</h2>
          <p className="text-xs text-slate-400">Refine the database by state, township, or Burmese name</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* State/Region filter */}
        <div className="flex flex-col gap-2">
          <label htmlFor="state-select" className="text-sm font-medium text-slate-300 flex items-center justify-between">
            <span>Filter by State/Region:</span>
            {selectedState && (
              <button 
                onClick={() => setSelectedState('')} 
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
              >
                Clear
              </button>
            )}
          </label>
          <select
            id="state-select"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 text-white cursor-pointer"
          >
            <option value="">All States/Regions</option>
            {MYANMAR_STATES_REGIONS.map((state) => (
              <option key={state.en} value={state.en}>
                {state.en} ({state.mm})
              </option>
            ))}
          </select>
        </div>

        {/* Township filter */}
        <div className="flex flex-col gap-2">
          <label htmlFor="township-input" className="text-sm font-medium text-slate-300">
            Township Name (English):
          </label>
          <div className="relative">
            <input
              id="township-input"
              type="text"
              value={townshipQuery}
              onChange={(e) => setTownshipQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Taikkyi, Kalaw"
              className="w-full glass-input rounded-xl pl-4 pr-10 py-3 text-white placeholder-slate-500"
            />
            {townshipQuery && (
              <button
                type="button"
                onClick={() => setTownshipQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Burmese name filter */}
        <div className="flex flex-col gap-2">
          <label htmlFor="village-input" className="text-sm font-medium text-slate-300">
            Burmese Village Name (MM):
          </label>
          <div className="relative">
            <input
              id="village-input"
              type="text"
              value={villageQuery}
              onChange={(e) => setVillageQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. ရွာမ, ကုန်းကြီး"
              className="w-full glass-input rounded-xl pl-4 pr-10 py-3 text-white placeholder-slate-500"
            />
            {villageQuery && (
              <button
                type="button"
                onClick={() => setVillageQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-slate-400 flex items-center gap-2">
          <Database size={16} className="text-indigo-400" />
          <span>
            {hasSearched ? (
              <>
                Showing <strong className="text-indigo-300 text-base">{filteredCount}</strong> of{' '}
                <strong className="text-slate-200">{totalCount}</strong> villages in active index
              </>
            ) : (
              <>
                Ready to search. Total records available: <strong className="text-slate-200">{totalCount.toLocaleString()}</strong>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            id="clear-btn"
            type="button"
            onClick={onClear}
            className="flex-1 sm:flex-none border border-slate-700 hover:border-slate-500 hover:bg-white/5 active:bg-white/10 active:scale-95 hover:scale-[1.02] text-slate-300 font-medium py-3 px-6 rounded-xl transition duration-150 ease-out flex items-center justify-center gap-2 cursor-pointer"
          >
            <X size={18} />
            <span>Clear</span>
          </button>
          
          <button
            id="search-btn"
            type="button"
            onClick={onSearch}
            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 active:scale-95 hover:scale-[1.02] text-white font-medium py-3 px-8 rounded-xl transition duration-150 ease-out shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search size={18} />
            <span>Search</span>
          </button>
        </div>
      </div>
    </div>
  );
}
