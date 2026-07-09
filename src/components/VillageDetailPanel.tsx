import React, { useState, useEffect } from 'react';
import { Village, FlaggedVillage, MonitorNote } from '../types';
import LocationMap from './LocationMap';
import { 
  X, 
  MapPin, 
  Users, 
  Home, 
  Bookmark, 
  FileText, 
  Calendar, 
  Compass, 
  Activity,
  CheckCircle,
  ExternalLink,
  Clipboard,
  Check,
  AlertTriangle
} from 'lucide-react';

interface VillageDetailPanelProps {
  village: Village | null;
  onClose: () => void;
  flaggedState: FlaggedVillage | undefined;
  noteState: MonitorNote | undefined;
  onUpdateStatus: (villageId: string, status: FlaggedVillage['status']) => void;
  onUpdateNote: (villageId: string, note: string) => void;
}

export default function VillageDetailPanel({
  village,
  onClose,
  flaggedState,
  noteState,
  onUpdateStatus,
  onUpdateNote,
}: VillageDetailPanelProps) {
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [pcodeCopied, setPcodeCopied] = useState(false);

  // Update text box if selected village changes
  useEffect(() => {
    if (village) {
      setNoteText(noteState?.note || '');
      setNoteSaved(false);
    }
  }, [village, noteState]);

  if (!village) return null;

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateNote(village.id, noteText);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  const copyPCode = () => {
    navigator.clipboard.writeText(village.pcode);
    setPcodeCopied(true);
    setTimeout(() => setPcodeCopied(false), 2000);
  };

  // Compute family size estimation
  const estFamilySize = village.population && village.households 
    ? (village.population / village.households).toFixed(1)
    : "N/A";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      {/* Backdrop overlay closer */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Slide-over panel */}
      <div className="relative w-full max-w-lg h-full glass-panel border-l border-slate-800 shadow-2xl flex flex-col z-10 animate-slide-in">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-serif">Monitor Panel</h3>
              <p className="text-xs text-slate-400">Village ID: {village.id}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-600 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Main Titles */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold text-white font-serif tracking-tight">{village.nameMm}</h1>
              <span className="text-lg font-medium text-slate-400 font-sans">/ {village.nameEn}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400 font-sans">
              <span>{village.stateEn}</span>
              <span>•</span>
              <span>{village.districtEn} District</span>
              <span>•</span>
              <span>{village.townshipEn} Township</span>
            </div>
          </div>

          {/* Place Codes & Hierarchy */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl p-3.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Village P-Code</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-indigo-300 font-bold">{village.pcode}</span>
                <button 
                  onClick={copyPCode}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Copy P-Code"
                >
                  {pcodeCopied ? <Check size={12} className="text-emerald-400" /> : <Clipboard size={12} />}
                </button>
              </div>
            </div>

            <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl p-3.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Village Tract P-Code</span>
              <span className="font-mono text-sm text-slate-300 block font-bold">{village.pcode.replace(/(\d{3})$/, "000")}</span>
            </div>
          </div>

          {/* Geographic Metadata & Location Map Component */}
          <LocationMap
            latitude={village.latitude}
            longitude={village.longitude}
            villageName={village.nameEn}
            townshipEn={village.townshipEn}
            stateEn={village.stateEn}
          />

          {/* Demographics & Stats */}
          <div className="bg-slate-900/20 border border-slate-800 rounded-xl p-4 space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Estimated Demographics</span>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="mx-auto w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-1.5">
                  <Users size={16} />
                </div>
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Population</span>
                <span className="text-base font-bold text-white font-mono">{(village.population || 0).toLocaleString()}</span>
              </div>

              <div className="text-center">
                <div className="mx-auto w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-1.5">
                  <Home size={16} />
                </div>
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Households</span>
                <span className="text-base font-bold text-white font-mono">{(village.households || 0).toLocaleString()}</span>
              </div>

              <div className="text-center">
                <div className="mx-auto w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-1.5">
                  <Compass size={16} />
                </div>
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Avg Family</span>
                <span className="text-base font-bold text-white font-mono">{estFamilySize}</span>
              </div>
            </div>
          </div>

          {/* Infrastructure facilities */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Identified Infrastructure</span>
            <div className="flex flex-wrap gap-1.5">
              {village.facilities && village.facilities.map((fac, idx) => (
                <span 
                  key={idx} 
                  className="text-xs bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded-lg border border-indigo-500/20 flex items-center gap-1"
                >
                  <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                  {fac}
                </span>
              ))}
            </div>
          </div>

          {/* Monitoring Field Notes Form */}
          <form onSubmit={handleSaveNote} className="space-y-3">
            <label htmlFor="observations-note" className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <FileText size={12} className="text-indigo-400" />
              <span>Field Observation Notes</span>
            </label>
            <textarea
              id="observations-note"
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Record infrastructure statuses, humanitarian updates, or field monitor comments here..."
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none"
            />
            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition duration-150 flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                {noteSaved ? (
                  <>
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span>Observation Saved!</span>
                  </>
                ) : (
                  <>
                    <FileText size={14} />
                    <span>Save Observation Note</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
