import React, { useState } from 'react';
import { Users, Plus, Key, Copy, Check, Info, Database, Trash2, Wifi } from 'lucide-react';
import { RespondentData } from '../types';
import { generateMockRespondents } from '../lib/surveyEngine';
import ConfirmModal from './ConfirmModal';

interface SessionManagerProps {
  currentSessionId: string;
  currentSessionName: string;
  sessionPasscode: string;
  onJoinSession: (id: string, name: string, passcode: string) => void;
  onLoadMockData: (mockData: RespondentData[]) => void;
  onClearSessionData: () => void;
  respondentsCount: number;
}

export default function SessionManager({
  currentSessionId,
  currentSessionName,
  sessionPasscode,
  onJoinSession,
  onLoadMockData,
  onClearSessionData,
  respondentsCount
}: SessionManagerProps) {
  const [newSessionName, setNewSessionName] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  
  const [joinId, setJoinId] = useState('');
  const [joinPasscode, setJoinPasscode] = useState('');
  
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showMockConfirm, setShowMockConfirm] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    
    // Generate clean ID from name + random suffix
    const cleanId = newSessionName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
    const passcode = newPasscode.trim() || '123456';
    
    onJoinSession(cleanId, newSessionName.trim(), passcode);
    setSuccessMsg(`Sesi "${newSessionName}" berhasil dibuat!`);
    setNewSessionName('');
    setNewPasscode('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    
    // Look up or just join direct
    const passcode = joinPasscode.trim() || '123456';
    // Split to extract readable name
    const parts = joinId.trim().split('-');
    const name = parts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || 'Sesi Kustom';
    
    onJoinSession(joinId.trim(), name, passcode);
    setSuccessMsg(`Berhasil bergabung dengan Sesi: ${joinId}`);
    setJoinId('');
    setJoinPasscode('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const copySessionInfo = () => {
    const text = `Sesi Survey: ${currentSessionName}\nID Sesi: ${currentSessionId}\nPasscode: ${sessionPasscode}\nBuka aplikasi ini dan gabung dengan kode di atas untuk sinkronisasi real-time!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmLoadMock = () => {
    const mock = generateMockRespondents();
    onLoadMockData(mock);
    setShowMockConfirm(false);
    setSuccessMsg('30 Data responden FC Barcelona & Legenda (Pablo Gavi priority) berhasil diunggah ke Cloud!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleConfirmClearSession = () => {
    onClearSessionData();
    setShowClearConfirm(false);
    setSuccessMsg('Seluruh data responden dalam sesi ini telah dihapus dari cloud.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2" id="session-manager-root">
      {/* Active Session Card */}
      <div className="glass-panel bg-white dark:bg-slate-900 text-indigo-950 dark:text-slate-100 rounded-3xl shadow-xl p-6 border border-slate-200 dark:border-slate-800" id="active-session-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600 dark:bg-emerald-400"></span>
              </span>
              <span className="text-xs font-mono text-emerald-700 dark:text-emerald-300 font-extrabold uppercase tracking-widest flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5" /> Terhubung ke Cloud Firestore (Real-Time)
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-indigo-950 dark:text-white font-display">{currentSessionName}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-xs font-mono font-bold">ID Sesi: {currentSessionId}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={copySessionInfo}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-indigo-950 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-200 text-xs font-extrabold py-2.5 px-4 rounded-xl transition-all border border-slate-300 dark:border-white/10 shadow-xs cursor-pointer"
              title="Salin Info Sesi"
              id="btn-copy-session"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />}
              {copied ? 'Tersalin!' : 'Bagikan Info Sesi'}
            </button>

            <button
              onClick={() => setShowMockConfirm(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/20 hover:scale-[1.02] cursor-pointer"
              id="btn-load-mock"
            >
              <Database className="w-4 h-4 text-indigo-100" />
              Muat 30 Responden FC Barca
            </button>

            {respondentsCount > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-500/20 dark:hover:bg-rose-600 dark:text-rose-200 text-xs font-black py-2.5 px-3.5 rounded-xl transition-all border border-rose-300 dark:border-rose-500/30 cursor-pointer"
                id="btn-clear-session"
              >
                <Trash2 className="w-4 h-4 text-rose-700 dark:text-rose-300" />
                Hapus Semua Data
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-indigo-900/80 dark:text-slate-400 block mb-1 uppercase tracking-widest font-black">Total Responden Sesi Ini</span>
            <span className="text-3xl font-black text-indigo-950 dark:text-white font-mono">{respondentsCount}</span>
            <span className="text-[10px] text-slate-600 dark:text-slate-400 block mt-1 font-bold">Orang terdata di cloud</span>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-indigo-900/80 dark:text-slate-400 block mb-1 uppercase tracking-widest font-black">Passcode Sinkronisasi</span>
            <span className="text-2xl font-black text-indigo-900 dark:text-indigo-300 font-mono flex items-center gap-2">
              <Key className="w-4.5 h-4.5 text-indigo-700 dark:text-indigo-400" /> {sessionPasscode}
            </span>
            <span className="text-[10px] text-slate-600 dark:text-slate-400 block mt-1 font-bold">Digunakan untuk verifikasi</span>
          </div>

          <div className="bg-indigo-50/80 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-indigo-200 dark:border-slate-800 flex items-start gap-2.5">
            <Info className="w-4.5 h-4.5 text-indigo-700 dark:text-indigo-300 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950 dark:text-slate-300 leading-relaxed font-medium">
              <strong className="text-indigo-950 dark:text-white font-extrabold">Akses Kolaboratif:</strong> Berikan <strong className="text-indigo-800 dark:text-indigo-200">ID Sesi</strong> dan <strong className="text-indigo-800 dark:text-indigo-200">Passcode</strong> kepada rekan sejawat Anda. Mereka dapat mengisi data di ponsel/tablet masing-masing secara bersamaan!
            </div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/25 text-emerald-200 rounded-xl text-xs font-bold shadow-xs animate-fadeIn" id="session-success-alert">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/25 text-rose-200 rounded-xl text-xs font-bold shadow-xs animate-fadeIn" id="session-error-alert">
          {errorMsg}
        </div>
      )}

      {/* Forms to Join / Create */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Session Card */}
        <div className="glass-panel p-6 rounded-3xl shadow-md border border-white/40" id="create-session-form-container">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-white/50 text-indigo-600 rounded-2xl border border-white/60 shadow-xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-indigo-950 tracking-tight">Buat Sesi Survey Baru</h3>
              <p className="text-xs text-slate-500 font-medium">Mulai survey kesehatan baru di cloud</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Nama Sesi Survey</label>
              <input
                type="text"
                placeholder="Contoh: Survey Gigi Puskesmas Depok"
                value={newSessionName}
                onChange={e => setNewSessionName(e.target.value)}
                className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-800 text-sm focus:outline-none transition-all placeholder-slate-400 font-medium"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Passcode Pengaman (Opsional)</label>
              <input
                type="text"
                placeholder="Contoh: 123456"
                value={newPasscode}
                onChange={e => setNewPasscode(e.target.value)}
                className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-800 text-sm focus:outline-none transition-all placeholder-slate-400 font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-1.5 block font-semibold leading-relaxed">Rekan Anda perlu memasukkan passcode ini untuk bergabung. Default: 123456</span>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-950 hover:bg-indigo-900 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-950/10 flex items-center justify-center gap-2 mt-4 cursor-pointer uppercase tracking-widest"
              id="btn-submit-create-session"
            >
              <Plus className="w-4 h-4" /> Buat Sesi Baru
            </button>
          </form>
        </div>

        {/* Join Session Card */}
        <div className="glass-panel p-6 rounded-3xl shadow-md border border-white/40" id="join-session-form-container">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-white/50 text-slate-600 rounded-2xl border border-white/60 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-indigo-950 tracking-tight">Gabung Sesi Survey Cloud</h3>
              <p className="text-xs text-slate-500 font-medium">Hubungkan perangkat ini ke sesi rekan Anda</p>
            </div>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">ID Sesi Survey</label>
              <input
                type="text"
                placeholder="Contoh: stan-pemeriksaan-gigi-30-oktober-2025-1234"
                value={joinId}
                onChange={e => setJoinId(e.target.value)}
                className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-800 text-sm focus:outline-none transition-all placeholder-slate-400 font-medium"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Passcode Sesi</label>
              <input
                type="password"
                placeholder="Masukkan passcode"
                value={joinPasscode}
                onChange={e => setJoinPasscode(e.target.value)}
                className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-800 text-sm focus:outline-none transition-all placeholder-slate-400 font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 mt-4 cursor-pointer uppercase tracking-widest"
              id="btn-submit-join-session"
            >
              <Users className="w-4 h-4" /> Gabung Sesi
            </button>
          </form>
        </div>
      </div>

      {/* Clear Session Data Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleConfirmClearSession}
        title="Konfirmasi Hapus Seluruh Data Sesi"
        message="Apakah Anda yakin ingin menghapus SELURUH data responden dalam sesi ini dari Cloud Firestore? Tindakan ini akan mengosongkan seluruh data pada sesi ini dan tidak dapat dibatalkan."
        confirmText="Iya, Hapus Semua"
        cancelText="Tidak, Batal"
        variant="danger"
      />

      {/* Load Mock Data Confirmation Modal */}
      <ConfirmModal
        isOpen={showMockConfirm}
        onClose={() => setShowMockConfirm(false)}
        onConfirm={handleConfirmLoadMock}
        title="Konfirmasi Muat Data Responden FC Barcelona"
        message="Apakah Anda ingin memuat 30 data responden sampel FC Barcelona (Pablo Gavi, Pedri, Lamine Yamal, dll) ke dalam sesi ini? Data akan langsung tersinkronisasi di Cloud Firestore."
        confirmText="Iya, Muat Data"
        cancelText="Tidak, Batal"
        variant="info"
      />
    </div>
  );
}
