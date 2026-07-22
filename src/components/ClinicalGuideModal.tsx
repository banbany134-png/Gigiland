import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, AlertCircle, Sparkles, Check, HelpCircle, ShieldAlert, Award } from 'lucide-react';

interface ClinicalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ClinicalGuideModal({ isOpen, onClose }: ClinicalGuideModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="clinical-guide-modal-wrapper">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 dark:bg-black/60 backdrop-blur-xs"
            id="clinical-guide-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-3xl bg-white/95 dark:bg-slate-900/95 border border-white/50 dark:border-slate-800/80 rounded-3xl shadow-2xl p-6 md:p-8 z-10 max-h-[90vh] overflow-y-auto scrollbar-thin flex flex-col gap-6"
            id="clinical-guide-modal-content"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-700 dark:text-indigo-400">
                    <BookOpen className="w-5 h-5" />
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                    Panduan Kode Pemeriksaan DMF-T / def-t
                  </h3>
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Standar Diagnostik Klinis Epidemiologi Gigi & Mulut (ICD-10 / WHO)
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                id="clinical-guide-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Warning / Notice */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/55 dark:border-amber-900/30 p-3.5 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400 block">Informasi Penting TGM</span>
                <p className="text-xs font-semibold text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                  Gunakan visualisasi dan kriteria diagnostik berikut sebagai acuan cepat di lapangan. Kode huruf kapital <span className="font-bold font-mono text-indigo-900 dark:text-indigo-400">(D, M, F)</span> merujuk pada gigi permanen, sedangkan huruf kecil <span className="font-bold font-mono text-indigo-900 dark:text-indigo-400">(d, e, f)</span> merujuk pada gigi sulung (deciduous).
                </p>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="clinical-guide-cards-grid">
              
              {/* Card D/d */}
              <div className="bg-rose-50/45 dark:bg-rose-950/10 border border-rose-200/50 dark:border-rose-900/30 p-4.5 rounded-2.5xl space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">Decayed (Lubang)</span>
                    <span className="bg-rose-100 dark:bg-rose-950/50 border border-rose-200/40 dark:border-rose-800/50 text-rose-800 dark:text-rose-300 text-xs font-black font-mono px-2 py-0.5 rounded-lg shadow-3xs">
                      D / d
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">Gigi Berlubang (Karies Aktif)</h4>
                  
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                    Ditetapkan apabila terdapat tanda-tanda kerusakan struktur jaringan keras gigi yang disebabkan oleh proses karies aktif.
                  </p>

                  <div className="space-y-1.5 pt-1 border-t border-rose-200/20">
                    <span className="text-[9px] font-bold uppercase text-rose-800 dark:text-rose-400 tracking-wider">Kriteria Pencatatan:</span>
                    <ul className="space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      <li className="flex items-start gap-1.5">
                        <span className="text-rose-600 dark:text-rose-400 mt-0.5">•</span>
                        <span>Ada kavitas/lubang gigi yang jelas terdeteksi secara visual atau menggunakan sonde pemeriksaan.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-rose-600 dark:text-rose-400 mt-0.5">•</span>
                        <span>Terdapat bayangan gelap (shadow) di bawah email yang menandakan karies dentin dalam.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-rose-600 dark:text-rose-400 mt-0.5">•</span>
                        <span>Gigi dengan tumpatan sementara (zinc oxide eugenol, sementasi sementara, dsb).</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-rose-100/40 dark:bg-rose-950/30 p-2 rounded-xl text-center border border-rose-200/30">
                  <span className="text-[9px] font-black text-rose-800 dark:text-rose-300">CATAT SEBAGAI KARIES</span>
                </div>
              </div>

              {/* Card M/e */}
              <div className="bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-800 p-4.5 rounded-2.5xl space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Missing (Hilang)</span>
                    <span className="bg-slate-200 dark:bg-slate-800 border border-slate-300/40 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black font-mono px-2 py-0.5 rounded-lg shadow-3xs">
                      M / e
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">Gigi Hilang / Indikasi Dicabut</h4>
                  
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                    Ditetapkan untuk gigi tetap yang telah hilang akibat karies, atau gigi sulung yang hilang sebelum waktu tanggal fisiologisnya.
                  </p>

                  <div className="space-y-1.5 pt-1 border-t border-slate-200/20">
                    <span className="text-[9px] font-bold uppercase text-slate-800 dark:text-slate-400 tracking-wider">Kriteria Pencatatan:</span>
                    <ul className="space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      <li className="flex items-start gap-1.5">
                        <span className="text-slate-500 dark:text-slate-400 mt-0.5">•</span>
                        <span>Gigi yang dicabut atau hilang dikonfirmasi akibat komplikasi penyakit karies (bukan karena estetika/ortodonti).</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-slate-500 dark:text-slate-400 mt-0.5">•</span>
                        <span>Sisa akar gigi (radiks) yang sudah non-vital dan menjadi indikasi kuat untuk dilakukan ekstraksi mutlak.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-200/40 dark:bg-slate-800/50 p-2 rounded-xl text-center border border-slate-300/20 dark:border-slate-700">
                  <span className="text-[9px] font-black text-slate-800 dark:text-slate-300">CATAT SEBAGAI HILANG</span>
                </div>
              </div>

              {/* Card F/f */}
              <div className="bg-emerald-50/45 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 p-4.5 rounded-2.5xl space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Filled (Tumpatan)</span>
                    <span className="bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200/40 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs font-black font-mono px-2 py-0.5 rounded-lg shadow-3xs">
                      F / f
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">Gigi Ditumpat (Sempurna)</h4>
                  
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                    Ditetapkan apabila gigi telah direstorasi secara permanen dengan bahan tumpatan resmi medis dan dalam kondisi stabil.
                  </p>

                  <div className="space-y-1.5 pt-1 border-t border-emerald-200/20">
                    <span className="text-[9px] font-bold uppercase text-emerald-800 dark:text-emerald-400 tracking-wider">Kriteria Pencatatan:</span>
                    <ul className="space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                        <span>Ada tumpatan permanen yang utuh (seperti komposit resin, glass ionomer cement/GIC, atau amalgam).</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                        <span>Tumpatan fungsional dengan baik dan sama sekali tidak ditemukan karies sekunder di tepi tumpatan.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-emerald-100/40 dark:bg-emerald-950/30 p-2 rounded-xl text-center border border-emerald-200/30">
                  <span className="text-[9px] font-black text-emerald-800 dark:text-emerald-300">CATAT SEBAGAI RESTORASI</span>
                </div>
              </div>

            </div>

            {/* Footer / Summary Info */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 font-bold">
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Butuh bantuan lebih lanjut? Konsultasikan standar WHO ICD-10.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-indigo-700 shadow-xs cursor-pointer"
              >
                Paham & Tutup
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
