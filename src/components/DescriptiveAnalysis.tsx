import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  FileSpreadsheet, 
  FileDown,
  Copy, 
  Check, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Award, 
  Sparkles, 
  AlertTriangle, 
  Heart, 
  Activity, 
  FileText,
  Table as TableIcon,
  Search,
  Filter,
  Crown,
  X,
  Eye,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  UserCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { RespondentData } from '../types';
import { exportToPdf, exportToExcel } from '../lib/surveyEngine';
import BivariateAnalysis from './BivariateAnalysis';

interface DescriptiveAnalysisProps {
  respondents: RespondentData[];
  allRespondentsCount?: number;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function DescriptiveAnalysis({ respondents, allRespondentsCount }: DescriptiveAnalysisProps) {
  const [copiedNarrative, setCopiedNarrative] = useState(false);
  const [activeTabSection, setActiveTabSection] = useState<'all' | 'graphs' | 'tendency' | 'frequency' | 'crosstab' | 'bivariate'>('all');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>('all');
  const [referralFilter, setReferralFilter] = useState<string>('all');
  const [ohisFilter, setOhisFilter] = useState<string>('all');

  // Filtered respondents
  const filteredRespondents = useMemo(() => {
    return respondents.filter(r => {
      if (!r) return false;
      // Search
      const matchesSearch = searchQuery === '' || 
        (r.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.nomorResponden && r.nomorResponden.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.pekerjaan && r.pekerjaan.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Gender
      const matchesGender = genderFilter === 'all' || r.jenisKelamin === genderFilter;
      
      // Age
      const matchesAge = ageGroupFilter === 'all' || r.kelompokUmur === ageGroupFilter;
      
      // Referral
      const matchesReferral = referralFilter === 'all' || 
        (referralFilter === 'dirujuk' && r.tindakLanjut?.perluDirujuk) ||
        (referralFilter === 'tidak_dirujuk' && !r.tindakLanjut?.perluDirujuk);

      // OHIS
      const matchesOhis = ohisFilter === 'all' || r.ohisCategory === ohisFilter;

      return matchesSearch && matchesGender && matchesAge && matchesReferral && matchesOhis;
    });
  }, [respondents, searchQuery, genderFilter, ageGroupFilter, referralFilter, ohisFilter]);

  // Find Pablo Gavi special respondent
  const pabloGavi = useMemo(() => {
    return respondents.find(r => 
      r.isPriorityPatient || 
      r.nama.toLowerCase().includes('pablo gavi') || 
      r.nama.toLowerCase().includes('gavi')
    );
  }, [respondents]);

  const N = filteredRespondents.length;

  if (respondents.length === 0) {
    return (
      <div className="p-8 text-center bg-white/50 backdrop-blur-md rounded-3xl border border-slate-200/60 my-6">
        <Activity className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-bounce" />
        <h3 className="text-lg font-black text-slate-800">Tidak Ada Data Responden Untuk Analisis Deskriptif</h3>
        <p className="text-xs text-slate-500 mt-1">Silakan sesuaikan filter data Anda atau tambahkan data responden terlebih dahulu.</p>
      </div>
    );
  }

  // --- STATISTICAL HELPER FUNCTIONS ---
  const calcMean = (arr: number[]) => (arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length);
  
  const calcSD = (arr: number[]) => {
    if (arr.length <= 1) return 0;
    const mean = calcMean(arr);
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
  };

  const calcMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const calcMin = (arr: number[]) => (arr.length === 0 ? 0 : Math.min(...arr));
  const calcMax = (arr: number[]) => (arr.length === 0 ? 0 : Math.max(...arr));

  // --- DATA ARRAYS ---
  const dmftArr = filteredRespondents.map(r => r.dmft || 0);
  const DArr = filteredRespondents.map(r => r.gigiTetap?.karies || 0);
  const MArr = filteredRespondents.map(r => r.gigiTetap?.dicabutKaries || 0);
  const FArr = filteredRespondents.map(r => r.gigiTetap?.tumpatanTanpaKaries || 0);

  const deftArr = filteredRespondents.map(r => r.deft || 0);
  const dArr = filteredRespondents.map(r => r.gigiSulung?.karies || 0);
  const eArr = filteredRespondents.map(r => r.gigiSulung?.dicabutKaries || 0);
  const fArr = filteredRespondents.map(r => r.gigiSulung?.tumpatanTanpaKaries || 0);

  const ohisArr = filteredRespondents.map(r => r.ohisScore ?? 0.8);
  const ageArr = filteredRespondents.map(r => r.umur || 0);

  // --- CALCULATED METRICS ---
  const statsSummary = [
    { name: 'Indeks DMF-T (Gigi Tetap Total)', mean: calcMean(dmftArr), median: calcMedian(dmftArr), sd: calcSD(dmftArr), min: calcMin(dmftArr), max: calcMax(dmftArr) },
    { name: '   • D (Decay / Karies Aktif)', mean: calcMean(DArr), median: calcMedian(DArr), sd: calcSD(DArr), min: calcMin(DArr), max: calcMax(DArr) },
    { name: '   • M (Missing / Dicabut Karies)', mean: calcMean(MArr), median: calcMedian(MArr), sd: calcSD(MArr), min: calcMin(MArr), max: calcMax(MArr) },
    { name: '   • F (Filling / Tumpatan Sehat)', mean: calcMean(FArr), median: calcMedian(FArr), sd: calcSD(FArr), min: calcMin(FArr), max: calcMax(FArr) },
    { name: 'Indeks OHI-S (Oral Hygiene Index Simplified)', mean: calcMean(ohisArr), median: calcMedian(ohisArr), sd: calcSD(ohisArr), min: calcMin(ohisArr), max: calcMax(ohisArr) },
    { name: 'Indeks def-t (Gigi Sulung Total)', mean: calcMean(deftArr), median: calcMedian(deftArr), sd: calcSD(deftArr), min: calcMin(deftArr), max: calcMax(deftArr) },
    { name: '   • d (decay sulung)', mean: calcMean(dArr), median: calcMedian(dArr), sd: calcSD(dArr), min: calcMin(dArr), max: calcMax(dArr) },
    { name: '   • e (extracted sulung)', mean: calcMean(eArr), median: calcMedian(eArr), sd: calcSD(eArr), min: calcMin(eArr), max: calcMax(eArr) },
    { name: '   • f (filled sulung)', mean: calcMean(fArr), median: calcMedian(fArr), sd: calcSD(fArr), min: calcMin(fArr), max: calcMax(fArr) },
    { name: 'Umur Responden (Tahun)', mean: calcMean(ageArr), median: calcMedian(ageArr), sd: calcSD(ageArr), min: calcMin(ageArr), max: calcMax(ageArr) }
  ];

  // --- DEMOGRAPHICS & FREQUENCIES ---
  const countByKey = <T extends string>(fn: (r: RespondentData) => T) => {
    const map: Record<string, number> = {};
    filteredRespondents.forEach(r => {
      const key = fn(r) || 'Lainnya';
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  };

  const genderFreq = countByKey(r => r.jenisKelamin);
  const ageGroupFreq = countByKey(r => r.kelompokUmur);
  const educationFreq = countByKey(r => r.pendidikan);
  const ohisCatFreq = countByKey(r => r.ohisCategory || 'Baik');

  // RECHARTS DATA PREPARATION
  const dmftComponentChartData = [
    { name: 'D (Decay)', val: Number(calcMean(DArr).toFixed(2)), fill: '#ef4444' },
    { name: 'M (Missing)', val: Number(calcMean(MArr).toFixed(2)), fill: '#f59e0b' },
    { name: 'F (Filling)', val: Number(calcMean(FArr).toFixed(2)), fill: '#10b981' },
  ];

  const genderPieChartData = Object.entries(genderFreq).map(([key, val]) => ({
    name: key,
    value: val
  }));

  const ageGroupChartData = Object.entries(ageGroupFreq).map(([key, val]) => ({
    name: key === '5-10' ? '5-10th' : key === '10-18' ? '10-18th' : key === '18-60' ? '18-60th' : '60+th',
    jumlah: val
  }));

  const ohisPieChartData = Object.entries(ohisCatFreq).map(([key, val]) => ({
    name: `OHI-S ${key}`,
    value: val
  }));

  // WHO Severity Category Classification for DMF-T Mean
  const meanDMFT = calcMean(dmftArr);
  const getWHOCategory = (val: number) => {
    if (val < 1.2) return { label: 'Sangat Rendah (Very Low)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (val <= 2.6) return { label: 'Rendah (Low)', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (val <= 4.4) return { label: 'Sedang (Moderate)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (val <= 6.5) return { label: 'Tinggi (High)', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    return { label: 'Sangat Tinggi (Very High)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const whoOverallCategory = getWHOCategory(meanDMFT);

  // Mucosa & Treatment Needs
  const gusiBerdarahCount = filteredRespondents.filter(r => r.mukosa?.gusiBerdarah).length;
  const lesiMukosaCount = filteredRespondents.filter(r => r.mukosa?.lesiMukosaOral).length;
  const perluSegeraCount = filteredRespondents.filter(r => r.tindakLanjut?.perluPerawatanSegera).length;
  const perluRujukCount = filteredRespondents.filter(r => r.tindakLanjut?.perluDirujuk).length;

  // --- CROSS TABULATION HELPER ---
  const getCrosstab = (groupFn: (r: RespondentData) => string) => {
    const groups: Record<string, RespondentData[]> = {};
    filteredRespondents.forEach(r => {
      const g = groupFn(r) || 'Lainnya';
      if (!groups[g]) groups[g] = [];
      groups[g].push(r);
    });

    return Object.entries(groups).map(([groupName, list]) => {
      const listDMFT = list.map(r => r.dmft || 0);
      const kariesCount = list.filter(r => (r.gigiTetap?.karies || 0) > 0 || (r.gigiSulung?.karies || 0) > 0).length;
      return {
        groupName,
        n: list.length,
        pct: (list.length / N) * 100,
        meanDMFT: calcMean(listDMFT),
        sdDMFT: calcSD(listDMFT),
        prevalensiKariesPct: (kariesCount / list.length) * 100
      };
    });
  };

  const crosstabGender = getCrosstab(r => r.jenisKelamin);
  const crosstabAgeGroup = getCrosstab(r => r.kelompokUmur);

  // --- AUTO NARRATIVE SUMMARY GENERATOR ---
  const narrativeText = `Berdasarkan hasil survei kesehatan gigi dan mulut DentaSync Pro terhadap N = ${N} responden (Laki-laki: ${genderFreq['Laki-laki'] || 0} orang [${(((genderFreq['Laki-laki'] || 0) / N) * 100).toFixed(1)}%], Perempuan: ${genderFreq['Perempuan'] || 0} orang [${(((genderFreq['Perempuan'] || 0) / N) * 100).toFixed(1)}%], rerata usia ${calcMean(ageArr).toFixed(1)} ± ${calcSD(ageArr).toFixed(1)} tahun), didapatkan hasil analisis deskriptif sebagai berikut:

1. Indeks DMF-T (Gigi Tetap): Rerata DMF-T populasi adalah ${calcMean(dmftArr).toFixed(2)} ± ${calcSD(dmftArr).toFixed(2)} gigi/orang (Median: ${calcMedian(dmftArr)}, Min: ${calcMin(dmftArr)}, Max: ${calcMax(dmftArr)}). Berdasarkan kriteria epidemiologi WHO, tingkat keparahan karies berada dalam kategori "${whoOverallCategory.label}". Rincian komponen: Decay (D) = ${calcMean(DArr).toFixed(2)}, Missing (M) = ${calcMean(MArr).toFixed(2)}, Filling (F) = ${calcMean(FArr).toFixed(2)}.

2. Indeks Kebersihan Mulut (OHI-S): Rerata skor OHI-S populasi tercatat ${calcMean(ohisArr).toFixed(2)} ± ${calcSD(ohisArr).toFixed(2)} (Kategori Baik). Khusus responden prioritas utama Pablo Gavi (Nomor Responden DSP-2026-001) mencatatkan OHI-S = 0.00 (Sangat Baik / Bebas Kalkulus & Plak) dan DMF-T = 0 (Gigi Sehat Sempurna).

3. Status Kesehatan Mukosa & Rujukan: Sebanyak ${gusiBerdarahCount} responden (${((gusiBerdarahCount / N) * 100).toFixed(1)}%) terdeteksi mengalami gusi berdarah, dan ${perluRujukCount} responden (${((perluRujukCount / N) * 100).toFixed(1)}%) direkomendasikan rujukan ke fasilitas kesehatan lanjutan.`;

  const copyNarrativeToClipboard = () => {
    navigator.clipboard.writeText(narrativeText);
    setCopiedNarrative(true);
    setTimeout(() => setCopiedNarrative(false), 2500);
  };

  const handlePdfExportCall = () => {
    exportToPdf(filteredRespondents, 'DentaSync Pro Clinical Session');
  };

  const handleExcelExportCall = () => {
    exportToExcel(filteredRespondents, 'DentaSync Pro Clinical Session');
  };

  return (
    <div className="space-y-6 my-2 font-sans">
      
      {/* SCREEN ACTION HEADER BAR */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/20">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 font-display tracking-tight">Statistik & Analisis Deskriptif</h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Laporan Tendensi Sentral, OHI-S, Keparahan WHO, Visual Grafik & Rujukan (N = {N} Responden)
              </p>
            </div>
          </div>
        </div>

        {/* Export & Preview Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer hover:scale-105"
            id="btn-preview-report"
            title="Buka Pratinjau Laporan Resmi Kemenkes / Klinik"
          >
            <Eye className="w-4 h-4" />
            <span>Pratinjau Laporan</span>
          </button>

          <button
            onClick={handlePdfExportCall}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer hover:scale-105"
            id="btn-export-pdf-descriptive"
            title="Download Laporan PDF Resmi dengan Tanda Tangan drg. Banny"
          >
            <FileDown className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleExcelExportCall}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer hover:scale-105"
            id="btn-export-excel-descriptive"
            title="Download Seluruh Dataset 30 Responden dalam Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={copyNarrativeToClipboard}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
            title="Salin Teks Ringkasan Naratif ke Clipboard"
          >
            {copiedNarrative ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedNarrative ? 'Tersalin!' : 'Salin Narasi'}</span>
          </button>
        </div>
      </div>

      {/* INTERACTIVE FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Filter & Pencarian Data Responden</span>
          </div>
          {(searchQuery || genderFilter !== 'all' || ageGroupFilter !== 'all' || referralFilter !== 'all' || ohisFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setGenderFilter('all');
                setAgeGroupFilter('all');
                setReferralFilter('all');
                setOhisFilter('all');
              }}
              className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" /> Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari nama / nomor / skuad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Jenis Kelamin</option>
            <option value="Laki-laki">Laki-laki</option>
            <option value="Perempuan">Perempuan</option>
          </select>

          {/* Age Group Filter */}
          <select
            value={ageGroupFilter}
            onChange={(e) => setAgeGroupFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Kelompok Umur</option>
            <option value="5-10">5 - 10 Tahun (Anak)</option>
            <option value="10-18">10 - 18 Tahun (Remaja)</option>
            <option value="18-60">18 - 60 Tahun (Produktif)</option>
            <option value="60+">60+ Tahun (Lansia)</option>
          </select>

          {/* Referral Filter */}
          <select
            value={referralFilter}
            onChange={(e) => setReferralFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Status Rujukan</option>
            <option value="dirujuk">Perlu Dirujuk</option>
            <option value="tidak_dirujuk">Tidak Perlu Dirujuk</option>
          </select>

          {/* OHI-S Category Filter */}
          <select
            value={ohisFilter}
            onChange={(e) => setOhisFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Kebersihan (OHI-S)</option>
            <option value="Baik">Kategori Baik (0.0 - 1.2)</option>
            <option value="Sedang">Kategori Sedang (1.3 - 3.0)</option>
            <option value="Buruk">Kategori Buruk (&gt; 3.0)</option>
          </select>
        </div>
      </div>

      {/* PABLO GAVI SPECIAL PRIORITY HIGHLIGHT BANNER */}
      {pabloGavi && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-5 rounded-3xl shadow-xl border border-amber-300/40 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                <Crown className="w-7 h-7 text-amber-200 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-amber-900/60 text-amber-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-300/30">
                    Pasien Prioritas Utama #1
                  </span>
                  <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
                    Gigi & Periodontal 100% Sempurna
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-1 tracking-tight">
                  {pabloGavi.nama} <span className="text-amber-200 font-normal text-sm">({pabloGavi.nomorResponden || 'DSP-2026-001'})</span>
                </h3>
                <p className="text-xs text-amber-100/90 font-medium mt-0.5">
                  Gelandang FC Barcelona | Usia: {pabloGavi.umur} Thn | OHI-S: <strong className="text-white font-mono">{pabloGavi.ohisScore ?? 0.0} (Baik Sempurna)</strong> | Indeks DMF-T: <strong className="text-white font-mono">0.0 (Bebas Karies)</strong>
                </p>
                <p className="text-[11px] text-amber-200/90 italic mt-1 font-semibold">
                  "{pabloGavi.catatanKhusus || 'Pasien prioritas khusus skuad FC Barcelona dengan kondisi kebersihan mulut sangat terjaga dan struktur email bebas plak.'}"
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
              <span className="text-[10px] font-bold text-amber-100 uppercase tracking-wider">Tindakan Klinis:</span>
              <span className="text-xs font-black text-white mt-0.5">{pabloGavi.tindakan || 'Profilaksis Pencegahan Rutin'}</span>
              <span className="text-[10px] font-extrabold text-emerald-200 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Kontrol Periodik 6 Bulan
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION SELECTOR TABS */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/60 dark:bg-slate-800/40 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-700/50">
        <button
          onClick={() => setActiveTabSection('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTabSection === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
        >
          Semua Modul
        </button>
        <button
          onClick={() => setActiveTabSection('graphs')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTabSection === 'graphs' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
        >
          Visual Grafis (Charts)
        </button>
        <button
          onClick={() => setActiveTabSection('tendency')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTabSection === 'tendency' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
        >
          Tendensi Sentral & Dispersi
        </button>
        <button
          onClick={() => setActiveTabSection('frequency')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTabSection === 'frequency' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
        >
          Frekuensi & WHO
        </button>
        <button
          onClick={() => setActiveTabSection('crosstab')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTabSection === 'crosstab' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
        >
          Tabulasi Silang
        </button>
        <button
          onClick={() => setActiveTabSection('bivariate')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTabSection === 'bivariate' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-indigo-600 dark:text-indigo-400 font-extrabold hover:text-indigo-700'}`}
        >
          Uji Bivariat & Kuantitatif
        </button>
      </div>

      {/* BIVARIATE STATISTICAL ANALYSIS MODULE */}
      {(activeTabSection === 'all' || activeTabSection === 'bivariate') && (
        <div className="pt-2">
          <BivariateAnalysis respondents={filteredRespondents} />
        </div>
      )}

      {/* RECHARTS VISUALIZATION GRAPHS MODULE */}
      {(activeTabSection === 'all' || activeTabSection === 'graphs') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Chart 1: Komponen DMF-T */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider font-display">
              1. Rerata Komponen DMF-T (D, M, F)
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dmftComponentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: any) => [`${value} gigi`, 'Rerata']} />
                  <Bar dataKey="val" radius={[8, 8, 0, 0]}>
                    {dmftComponentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Kebersihan Mulut OHI-S */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider font-display">
              2. Kategori Kebersihan OHI-S
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ohisPieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {ohisPieChartData.map((entry, index) => (
                      <Cell key={`cell-ohis-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Distribusi Umur */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider font-display">
              3. Distribusi Kelompok Umur
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageGroupChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="jumlah" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* AUTO NARRATIVE RESEARCH REPORT CALLOUT */}
      {(activeTabSection === 'all' || activeTabSection === 'tendency') && (
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-indigo-700/40 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-indigo-200">
                Ringkasan Naratif Laporan Hasil Penelitian / Survei
              </h3>
            </div>
            <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${whoOverallCategory.color}`}>
              Tingkat Karies WHO: {whoOverallCategory.label}
            </span>
          </div>

          <div className="bg-white/10 dark:bg-slate-950/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-xs text-indigo-100/90 leading-relaxed font-sans whitespace-pre-line">
            {narrativeText}
          </div>

          <div className="mt-3 flex justify-between items-center text-[10px] text-indigo-300/70">
            <span>Dihasilkan secara otomatis oleh Engine Analisis Epidemiologi DentaSync</span>
            <span className="font-mono">Metode Sampling: Skuad FC Barcelona & Legenda (N = {N})</span>
          </div>
        </div>
      )}

      {/* TABEL 1: TENDENSI SENTRAL & DISPERSI */}
      {(activeTabSection === 'all' || activeTabSection === 'tendency') && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider font-display">
                Tabel 1: Ukuran Tendensi Sentral & Dispersi Indeks Kesehatan Gigi
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-bold">Mean, Median, Deviasi Standar (SD), Min, Max, Range</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs font-sans min-w-[720px]">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">Variabel / Indeks</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Rerata (Mean)</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Median</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Deviasi Standar (SD)</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Nilai Min</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Nilai Max</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Rentang (Range)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-semibold text-slate-700 dark:text-slate-300">
                {statsSummary.map((s, idx) => {
                  const isMainHeader = !s.name.startsWith('   •');
                  return (
                    <tr 
                      key={idx} 
                      className={isMainHeader ? 'bg-indigo-50/40 dark:bg-indigo-950/20 font-extrabold text-slate-900 dark:text-slate-100' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}
                    >
                      <td className={`p-3.5 whitespace-nowrap ${isMainHeader ? 'font-black text-indigo-950 dark:text-indigo-200' : 'text-slate-600 dark:text-slate-400 pl-6'}`}>
                        {s.name}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {s.mean.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-center font-mono whitespace-nowrap">{s.median.toFixed(2)}</td>
                      <td className="p-3.5 text-center font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        ± {s.sd.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-center font-mono whitespace-nowrap">{s.min}</td>
                      <td className="p-3.5 text-center font-mono whitespace-nowrap">{s.max}</td>
                      <td className="p-3.5 text-center font-mono text-slate-500 whitespace-nowrap">{s.max - s.min}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABEL 2: DISTRIBUSI FREKUENSI & PROPORSI */}
      {(activeTabSection === 'all' || activeTabSection === 'frequency') && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider font-display">
                Tabel 2: Distribusi Frekuensi Demografi & Kategori Kebersihan Mulut (OHI-S)
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-bold">Total Sampel N = {N} Responden</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sub-tabel Jenis Kelamin */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>A. Distribusi Jenis Kelamin</span>
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Kategori</th>
                      <th className="p-3 text-center">Frekuensi (N)</th>
                      <th className="p-3 text-center">Persentase (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-semibold text-slate-700 dark:text-slate-300">
                    {Object.entries(genderFreq).map(([k, v]) => (
                      <tr key={k} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-bold">{k}</td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-600">{v}</td>
                        <td className="p-3 text-center font-mono text-emerald-600">{((v / N) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100/50 dark:bg-slate-800/50 font-extrabold text-slate-900 dark:text-slate-100">
                      <td className="p-3">Total</td>
                      <td className="p-3 text-center font-mono">{N}</td>
                      <td className="p-3 text-center font-mono">100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sub-tabel Kelompok Umur */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>B. Distribusi Kelompok Umur</span>
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Kelompok Umur</th>
                      <th className="p-3 text-center">Frekuensi (N)</th>
                      <th className="p-3 text-center">Persentase (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-semibold text-slate-700 dark:text-slate-300">
                    {[
                      { key: '5-10', label: '5 - 10 Tahun (Anak-anak)' },
                      { key: '10-18', label: '10 - 18 Tahun (Remaja)' },
                      { key: '18-60', label: '18 - 60 Tahun (Produktif)' },
                      { key: '60+', label: '60+ Tahun (Lansia)' }
                    ].map(({ key, label }) => {
                      const count = ageGroupFreq[key] || 0;
                      return (
                        <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-bold">{label}</td>
                          <td className="p-3 text-center font-mono font-bold text-indigo-600">{count}</td>
                          <td className="p-3 text-center font-mono text-emerald-600">{((count / N) * 100).toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-100/50 dark:bg-slate-800/50 font-extrabold text-slate-900 dark:text-slate-100">
                      <td className="p-3">Total</td>
                      <td className="p-3 text-center font-mono">{N}</td>
                      <td className="p-3 text-center font-mono">100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sub-tabel Kebersihan OHI-S */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>C. Kategori Kebersihan Mulut (OHI-S)</span>
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Kategori OHI-S</th>
                      <th className="p-3 text-center">Frekuensi (N)</th>
                      <th className="p-3 text-center">Persentase (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-semibold text-slate-700 dark:text-slate-300">
                    {['Baik', 'Sedang', 'Buruk'].map(cat => {
                      const count = ohisCatFreq[cat] || 0;
                      return (
                        <tr key={cat} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-bold">Kebersihan {cat}</td>
                          <td className="p-3 text-center font-mono font-bold text-indigo-600">{count}</td>
                          <td className="p-3 text-center font-mono text-emerald-600">{((count / N) * 100).toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-100/50 dark:bg-slate-800/50 font-extrabold text-slate-900 dark:text-slate-100">
                      <td className="p-3">Total</td>
                      <td className="p-3 text-center font-mono">{N}</td>
                      <td className="p-3 text-center font-mono">100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sub-tabel Status Mukosa & Rujukan */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>D. Status Mukosa & Kebutuhan Rujukan</span>
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Kondisi / Indikator</th>
                      <th className="p-3 text-center">Jumlah Pasien</th>
                      <th className="p-3 text-center">Proporsi (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-semibold text-slate-700 dark:text-slate-300">
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-rose-700 dark:text-rose-400">Gusi Berdarah (Gingivitis)</td>
                      <td className="p-3 text-center font-mono font-bold">{gusiBerdarahCount}</td>
                      <td className="p-3 text-center font-mono text-rose-600 font-bold">{((gusiBerdarahCount / N) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-amber-700 dark:text-amber-400">Lesi Mukosa Oral</td>
                      <td className="p-3 text-center font-mono font-bold">{lesiMukosaCount}</td>
                      <td className="p-3 text-center font-mono text-amber-600 font-bold">{((lesiMukosaCount / N) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-orange-700 dark:text-orange-400">Perlu Perawatan Segera</td>
                      <td className="p-3 text-center font-mono font-bold">{perluSegeraCount}</td>
                      <td className="p-3 text-center font-mono text-orange-600 font-bold">{((perluSegeraCount / N) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-indigo-700 dark:text-indigo-400">Direkomendasikan Rujukan RSU/Klinik</td>
                      <td className="p-3 text-center font-mono font-bold">{perluRujukCount}</td>
                      <td className="p-3 text-center font-mono text-indigo-600 font-bold">{((perluRujukCount / N) * 100).toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TABEL 3: TABULASI SILANG (CROSSTABULATION) */}
      {(activeTabSection === 'all' || activeTabSection === 'crosstab') && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider font-display">
                Tabel 3: Tabulasi Silang Demografi vs Indeks Karies DMF-T & Prevalensi
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-bold">Analisis Bivariat Lintas Sub-Kelompok</span>
          </div>

          <div className="space-y-6">
            
            {/* Crosstab Jenis Kelamin */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                A. Tabulasi Silang Jenis Kelamin vs Karies & DMF-T
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs font-sans min-w-[650px]">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5 whitespace-nowrap">Jenis Kelamin</th>
                      <th className="p-3.5 text-center whitespace-nowrap">Responden (N)</th>
                      <th className="p-3.5 text-center whitespace-nowrap">Proporsi (%)</th>
                      <th className="p-3.5 text-center whitespace-nowrap">Rerata DMF-T (Mean ± SD)</th>
                      <th className="p-3.5 text-center whitespace-nowrap">Prevalensi Karies (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-semibold text-slate-700 dark:text-slate-300">
                    {crosstabGender.map((item) => (
                      <tr key={item.groupName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3.5 font-bold text-indigo-950 dark:text-indigo-200 whitespace-nowrap">{item.groupName}</td>
                        <td className="p-3.5 text-center font-mono font-bold whitespace-nowrap">{item.n}</td>
                        <td className="p-3.5 text-center font-mono whitespace-nowrap">{item.pct.toFixed(1)}%</td>
                        <td className="p-3.5 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {item.meanDMFT.toFixed(2)} ± {item.sdDMFT.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {item.prevalensiKariesPct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Crosstab Kelompok Umur */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                B. Tabulasi Silang Kelompok Umur vs Karies & DMF-T
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs font-sans min-w-[650px]">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5 whitespace-nowrap">Kelompok Umur</th>
                      <th className="p-3.5 text-center whitespace-nowrap">Responden (N)</th>
                      <th className="p-3.5 text-center whitespace-nowrap">Proporsi (%)</th>
                      <th className="p-3.5 text-center whitespace-nowrap">Rerata DMF-T (Mean ± SD)</th>
                      <th className="p-3.5 text-center whitespace-nowrap">Prevalensi Karies (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-semibold text-slate-700 dark:text-slate-300">
                    {crosstabAgeGroup.map((item) => (
                      <tr key={item.groupName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3.5 font-bold text-indigo-950 dark:text-indigo-200 whitespace-nowrap">
                          Kelompok {item.groupName} Tahun
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold whitespace-nowrap">{item.n}</td>
                        <td className="p-3.5 text-center font-mono whitespace-nowrap">{item.pct.toFixed(1)}%</td>
                        <td className="p-3.5 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {item.meanDMFT.toFixed(2)} ± {item.sdDMFT.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {item.prevalensiKariesPct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 relative border border-slate-200 font-sans">
            
            {/* Modal Control Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 sticky top-0 bg-white z-10 pt-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="text-base font-black uppercase text-indigo-950 tracking-tight">Pratinjau Laporan Resmi Klinis</h3>
                  <p className="text-[10px] text-slate-500 font-bold">DentaSync Pro - Standar Hasil Pemeriksaan Kesehatan Gigi</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Cetak Laporan (Print)
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* FORMAL DOCUMENT CONTENT (Styled like official report) */}
            <div className="space-y-6 p-4 border border-slate-300 rounded-2xl bg-white shadow-inner">
              
              {/* Official Header Kop */}
              <div className="flex justify-between items-center border-b-2 border-indigo-950 pb-4">
                <div>
                  <h1 className="text-xl font-black text-indigo-950 tracking-tight">DENTASYNC PRO CLINICAL SYSTEM</h1>
                  <p className="text-xs font-bold text-slate-700">Klinik Utama DentaSync Pro - Camp Nou Dental Center</p>
                  <p className="text-[10px] text-slate-500">Jl. Gran Via de les Corts Catalanes No. 1899, Barcelona</p>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-600 space-y-0.5">
                  <p className="font-bold text-slate-900">NO. LAPORAN: LAP-DSP/2026/07/001</p>
                  <p>Tanggal: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p>Penanggung Jawab: drg. Banny</p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-1">
                <h2 className="text-sm font-black uppercase text-slate-900 tracking-wider">
                  LAPORAN REKAPITULASI PEMERIKSAAN KESEHATAN GIGI & MULUT
                </h2>
                <p className="text-xs font-semibold text-slate-600">
                  Sampel Skuad Utama FC Barcelona & Legenda Sepak Bola (Total: {N} Responden)
                </p>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-semibold">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase">Total Responden</span>
                  <strong className="text-base text-indigo-900 font-mono font-black">{N} Orang</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase">Rerata DMF-T</span>
                  <strong className="text-base text-indigo-900 font-mono font-black">{calcMean(dmftArr).toFixed(2)}</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase">Rerata OHI-S</span>
                  <strong className="text-base text-emerald-800 font-mono font-black">{calcMean(ohisArr).toFixed(2)}</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase">Pasien Prioritas</span>
                  <strong className="text-base text-amber-600 font-mono font-black">Pablo Gavi (OHI-S 0.0)</strong>
                </div>
              </div>

              {/* Respondent Full Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-300 pb-1">
                  I. Tabel Rincian Data Pasien & Diagnosis Klinis
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-300">
                  <table className="w-full text-left text-[11px] font-sans min-w-[720px]">
                    <thead className="bg-slate-100 text-slate-900 font-bold uppercase text-[9px]">
                      <tr>
                        <th className="p-2 border-b whitespace-nowrap">No</th>
                        <th className="p-2 border-b whitespace-nowrap">No. Responden</th>
                        <th className="p-2 border-b whitespace-nowrap">Nama Responden</th>
                        <th className="p-2 border-b text-center whitespace-nowrap">Umur</th>
                        <th className="p-2 border-b text-center whitespace-nowrap">JK</th>
                        <th className="p-2 border-b text-center whitespace-nowrap">OHI-S</th>
                        <th className="p-2 border-b text-center whitespace-nowrap">DMF-T</th>
                        <th className="p-2 border-b whitespace-nowrap">Diagnosis Klinis</th>
                        <th className="p-2 border-b whitespace-nowrap">Tindakan / Rencana</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                      {filteredRespondents.map((r, idx) => (
                        <tr key={r.id || idx} className={r.isPriorityPatient ? 'bg-amber-50 font-bold text-amber-950' : 'hover:bg-slate-50'}>
                          <td className="p-2 font-mono text-center whitespace-nowrap">{idx + 1}</td>
                          <td className="p-2 font-mono text-[10px] whitespace-nowrap">{r.nomorResponden || `DSP-2026-${String(idx+1).padStart(3, '0')}`}</td>
                          <td className="p-2 font-bold whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {r.isPriorityPatient && <Crown className="w-3 h-3 text-amber-600 shrink-0" />}
                              <span>{r.nama}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center font-mono whitespace-nowrap">{r.umur}th</td>
                          <td className="p-2 text-center whitespace-nowrap">{r.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                          <td className="p-2 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">{r.ohisScore ?? 0.8}</td>
                          <td className="p-2 text-center font-mono font-bold text-indigo-700 whitespace-nowrap">{r.dmft || 0}</td>
                          <td className="p-2 text-[10px] whitespace-nowrap">{r.diagnosis || 'Gigi Sehat & Periodontal Normal'}</td>
                          <td className="p-2 text-[10px] whitespace-nowrap">{r.tindakan || 'Edukasi Sikat Gigi Periodik'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Narrative Summary Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h3 className="text-xs font-black uppercase text-indigo-950 tracking-wider">
                  II. Kesimpulan & Rekomendasi Dokter Gigi
                </h3>
                <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-line font-sans">
                  {narrativeText}
                </p>
              </div>

              {/* Signatures */}
              <div className="pt-8 flex justify-between items-start text-xs font-sans text-slate-800">
                <div className="text-center space-y-12">
                  <p className="font-bold">Dokter Gigi Pemeriksa (Dentist in Charge)</p>
                  <div>
                    <p className="font-black underline text-slate-900">drg. Banny</p>
                    <p className="text-[10px] text-slate-500 font-mono">SIP/STR: 33.01.100.2.2026</p>
                  </div>
                </div>

                <div className="text-center space-y-12">
                  <p className="font-bold">Kepala Klinik Utama DentaSync Pro</p>
                  <div>
                    <p className="font-black underline text-slate-900">Klinik Utama DentaSync Pro</p>
                    <p className="text-[10px] text-slate-500 font-mono">Camp Nou Dental Center</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
