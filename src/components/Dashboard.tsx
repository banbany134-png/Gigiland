import React, { useState, useMemo } from 'react';
import { 
  Award, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  BookOpen, 
  Briefcase, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  LayoutDashboard,
  Search, 
  RefreshCw, 
  Eye, 
  Sparkles, 
  Filter, 
  Calendar, 
  Heart, 
  ShieldAlert, 
  FileText,
  TrendingUp,
  Activity,
  BarChart3,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RespondentData } from '../types';
import { calculateSurveyStats } from '../lib/surveyEngine';
import { PERMANENT_CODES, DECIDUOUS_CODES } from './Odontogram';
import GeographicHeatmap from './GeographicHeatmap';
import DynamicGreeting from './DynamicGreeting';
import DescriptiveAnalysis from './DescriptiveAnalysis';

interface DashboardProps {
  respondents: RespondentData[];
}

export default function Dashboard({ respondents }: DashboardProps) {
  // --- STATE FOR FILTERS ---
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>('all');
  const [educationFilter, setEducationFilter] = useState<string>('all');
  const [occupationFilter, setOccupationFilter] = useState<string>('all');
  const [referralFilter, setReferralFilter] = useState<string>('all'); // 'all', 'rujuk', 'tidak_rujuk'
  const [severityFilter, setSeverityFilter] = useState<string>('all'); // 'all', 'karies_aktif', 'sehat'

  // --- STATE FOR ACTIVE VIEW ---
  const [activeSubTab, setActiveSubTab] = useState<'charts' | 'heatmap' | 'correlation' | 'descriptive'>('charts');

  // --- STATE FOR INTERACTIVE CHARTS ---
  const [hoveredBar, setHoveredBar] = useState<{ group: string; type: string; value: number; x: number; y: number } | null>(null);
  const [hoveredLinePoint, setHoveredLinePoint] = useState<{ xVal: string; count: number; dmft: number; deft: number; x: number; y: number } | null>(null);
  const [lineChartMode, setLineChartMode] = useState<'age' | 'timeline'>('age');
  const [heatmapTargetMetric, setHeatmapTargetMetric] = useState<'decayed' | 'missing' | 'filled'>('decayed');
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [heatmapViewMode, setHeatmapViewMode] = useState<'odontogram' | 'geografis'>('geografis');

  // --- FILTERED DATA LOGIC ---
  const filteredRespondents = useMemo(() => {
    return respondents.filter(r => {
      if (!r) return false;
      // 1. Text Search by Name
      if (searchQuery && !(r.nama || '').toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // 2. Gender Filter
      if (genderFilter !== 'all' && r.jenisKelamin !== genderFilter) {
        return false;
      }
      // 3. Age Group Filter
      if (ageGroupFilter !== 'all' && r.kelompokUmur !== ageGroupFilter) {
        return false;
      }
      // 4. Education Filter
      if (educationFilter !== 'all' && r.pendidikan !== educationFilter) {
        return false;
      }
      // 5. Occupation Filter
      if (occupationFilter !== 'all' && r.pekerjaan !== occupationFilter) {
        return false;
      }
      // 6. Referral Filter
      if (referralFilter === 'rujuk' && !r.tindakLanjut?.perluDirujuk) {
        return false;
      }
      if (referralFilter === 'tidak_rujuk' && r.tindakLanjut?.perluDirujuk) {
        return false;
      }
      // 7. Severity Filter (Active Caries check)
      if (severityFilter === 'karies_aktif') {
        const hasKaries = ((r.gigiSulung?.karies || 0) > 0) || ((r.gigiTetap?.karies || 0) > 0);
        if (!hasKaries) return false;
      }
      if (severityFilter === 'sehat') {
        const isPerfectlySehat = ((r.gigiSulung?.karies || 0) === 0) && ((r.gigiTetap?.karies || 0) === 0) && ((r.gigiSulung?.dicabutKaries || 0) === 0) && ((r.gigiTetap?.dicabutKaries || 0) === 0);
        if (!isPerfectlySehat) return false;
      }

      return true;
    });
  }, [respondents, searchQuery, genderFilter, ageGroupFilter, educationFilter, occupationFilter, referralFilter, severityFilter]);

  // --- STATS COMPUTATION FOR FILTERED SET ---
  const stats = useMemo(() => {
    return calculateSurveyStats(filteredRespondents);
  }, [filteredRespondents]);

  const rawStats = useMemo(() => {
    return calculateSurveyStats(respondents);
  }, [respondents]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setGenderFilter('all');
    setAgeGroupFilter('all');
    setEducationFilter('all');
    setOccupationFilter('all');
    setReferralFilter('all');
    setSeverityFilter('all');
  };

  if (respondents.length === 0) {
    return (
      <div className="text-center py-16 glass-panel rounded-3xl max-w-3xl mx-auto p-8 animate-fadeIn" id="dashboard-empty-state">
        <div className="w-16 h-16 bg-white/50 backdrop-blur-md text-indigo-600 border border-white/50 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
          <Activity className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 font-display">Belum Ada Data Terkumpul</h3>
        <p className="text-slate-600 text-sm mt-2 max-w-md mx-auto leading-relaxed">
          Sesi ini masih kosong. Silakan masuk ke tab <strong>"Input Pemeriksaan"</strong> untuk merekam data responden pertama Anda, atau buka tab <strong>"Koneksi Cloud"</strong> untuk memuat data simulasi 30 Oktober 2025.
        </p>
      </div>
    );
  }

  // --- AGE GROUP AGGREGATIONS FOR COLUMN CHART ---
  const ageGroupChartData = useMemo(() => {
    const categories = ['5-10', '10-18', '18-60', '60+'];
    return categories.map(cat => {
      const subset = filteredRespondents.filter(r => r.kelompokUmur === cat);
      if (subset.length === 0) {
        return { group: cat, label: cat === '5-10' ? '5-10 th' : cat === '10-18' ? '10-18 th' : cat === '18-60' ? '18-60 th' : '60+ th', deft: 0, dmft: 0, count: 0 };
      }
      const subsetStats = calculateSurveyStats(subset);
      return {
        group: cat,
        label: cat === '5-10' ? '5-10 th' : cat === '10-18' ? '10-18 th' : cat === '18-60' ? '18-60 th' : '60+ th',
        deft: subsetStats.indexAvg.deft,
        dmft: subsetStats.indexAvg.dmft,
        count: subset.length
      };
    });
  }, [filteredRespondents]);

  // --- TIME-SERIES AND BIOLOGICAL-TREND LINE CHART DATA ---
  const lineChartData = useMemo(() => {
    if (lineChartMode === 'timeline') {
      // Group by Input Date
      const dateMap: Record<string, RespondentData[]> = {};
      filteredRespondents.forEach(r => {
        const d = r.tanggalInput || 'Tanpa Tanggal';
        if (!dateMap[d]) dateMap[d] = [];
        dateMap[d].push(r);
      });

      return Object.entries(dateMap)
        .map(([dateStr, list]) => {
          const subsetStats = calculateSurveyStats(list);
          return {
            xVal: dateStr,
            count: list.length,
            dmft: subsetStats.indexAvg.dmft,
            deft: subsetStats.indexAvg.deft,
          };
        })
        .sort((a, b) => a.xVal.localeCompare(b.xVal));
    } else {
      // Group by Age (Biological trend)
      const ageMap: Record<number, RespondentData[]> = {};
      filteredRespondents.forEach(r => {
        const age = r.umur || 0;
        if (!ageMap[age]) ageMap[age] = [];
        ageMap[age].push(r);
      });

      return Object.entries(ageMap)
        .map(([ageStr, list]) => {
          const subsetStats = calculateSurveyStats(list);
          return {
            xVal: `${ageStr} th`,
            ageNum: parseInt(ageStr),
            count: list.length,
            dmft: subsetStats.indexAvg.dmft,
            deft: subsetStats.indexAvg.deft,
          };
        })
        .sort((a, b) => a.ageNum - b.ageNum);
    }
  }, [filteredRespondents, lineChartMode]);

  // --- ODONTOGRAM HEATMAP FREQUENCY DATA ---
  const odontogramHeatData = useMemo(() => {
    // FDI tooth definitions
    const allTeeth = [
      // Upper Right / Left Permanent
      '18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28',
      // Upper Right / Left Deciduous
      '55', '54', '53', '52', '51', '61', '62', '63', '64', '65',
      // Lower Right / Left Deciduous
      '85', '84', '83', '82', '81', '71', '72', '73', '74', '75',
      // Lower Right / Left Permanent
      '48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'
    ];

    const result: Record<string, {
      code: string;
      total: number;
      decayed: number;
      missing: number;
      filled: number;
      decayedPct: number;
      missingPct: number;
      filledPct: number;
      healthyPct: number;
    }> = {};

    const totalCount = filteredRespondents.length;

    allTeeth.forEach(tooth => {
      let decayed = 0;
      let missing = 0;
      let filled = 0;

      filteredRespondents.forEach(r => {
        const status = r.teethStatus?.[tooth];
        if (status) {
          if (status === '1' || status === 'B' || status === '2' || status === 'C') {
            decayed++;
          } else if (status === '4' || status === 'E') {
            missing++;
          } else if (status === '3' || status === 'D') {
            filled++;
          }
        }
      });

      result[tooth] = {
        code: tooth,
        total: totalCount,
        decayed,
        missing,
        filled,
        decayedPct: totalCount > 0 ? (decayed / totalCount) * 100 : 0,
        missingPct: totalCount > 0 ? (missing / totalCount) * 100 : 0,
        filledPct: totalCount > 0 ? (filled / totalCount) * 100 : 0,
        healthyPct: totalCount > 0 ? ((totalCount - (decayed + missing + filled)) / totalCount) * 100 : 100
      };
    });

    return result;
  }, [filteredRespondents]);

  // --- SOCIAL CORRELATION MATRIX ---
  // Calculates average indices grouped by social attributes (Education vs Age Group)
  const correlationMatrix = useMemo(() => {
    const ageCategories = ['5-10', '10-18', '18-60', '60+'];
    const eduCategories: Array<'SD' | 'SMP' | 'SMA' | 'Diploma' | 'S1/D4' | 'S2' | 'S3' | 'Tidak Sekolah'> = [
      'Tidak Sekolah', 'SD', 'SMP', 'SMA', 'Diploma', 'S1/D4', 'S2', 'S3'
    ];

    const grid = eduCategories.map(edu => {
      const rowData = ageCategories.map(age => {
        const subset = filteredRespondents.filter(r => r.pendidikan === edu && r.kelompokUmur === age);
        if (subset.length === 0) {
          return { count: 0, dmft: 0, deft: 0, referralRate: 0 };
        }
        const subsetStats = calculateSurveyStats(subset);
        return {
          count: subset.length,
          dmft: subsetStats.indexAvg.dmft,
          deft: subsetStats.indexAvg.deft,
          referralRate: subsetStats.tindakLanjutPct.perluDirujuk * 100
        };
      });
      return {
        education: edu,
        data: rowData
      };
    });

    return {
      columns: ageCategories,
      rows: grid
    };
  }, [filteredRespondents]);

  // WHO Severity class finder for DMF-T
  const getSeverity = (index: number) => {
    if (index === 0) return { label: 'Bebas Karies', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', desc: 'Sangat baik, tidak ada pengalaman karies.' };
    if (index < 1.2) return { label: 'Sangat Rendah', color: 'bg-green-50 text-green-700 border-green-200', desc: 'Tingkat karies sangat rendah menurut standar WHO.' };
    if (index < 2.7) return { label: 'Rendah', color: 'bg-amber-50 text-amber-700 border-amber-200', desc: 'Tingkat karies terkendali, pertahankan kebersihan mulut.' };
    if (index < 4.5) return { label: 'Sedang', color: 'bg-orange-50 text-orange-700 border-orange-200', desc: 'Karies sedang, perlu tindakan restoratif/segel.' };
    return { label: 'Tinggi / Sangat Tinggi', color: 'bg-rose-50 text-rose-700 border-rose-200', desc: 'Indeks tinggi, memerlukan tindakan preventif dan kuratif masif.' };
  };

  const dmftSeverity = getSeverity(stats.indexAvg.dmft);
  const deftSeverity = getSeverity(stats.indexAvg.deft);

  // Helper for progress bar
  const ProgressBar = ({ label, count, pct, colorClass = 'bg-indigo-600' }: { label: string, count: number, pct: number, colorClass?: string, key?: any }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] font-bold">
        <span className="text-slate-700 truncate max-w-[170px] font-medium">{label}</span>
        <span className="text-slate-900 font-bold font-mono">{count} <span className="text-[9px] font-normal text-slate-500">org</span> ({pct.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-white/40">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`${colorClass} h-full rounded-full`} 
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-1 animate-fadeIn" id="dashboard-root">
      
      {/* Dynamic Time-based Greeting */}
      <DynamicGreeting />

      {/* --- TOP SUB-TAB NAVIGATION & FILTER BAR --- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Sub-Tab Module Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <button
              onClick={() => setActiveSubTab('charts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'charts'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Epidemiologi & Tren</span>
            </button>

            <button
              onClick={() => setActiveSubTab('heatmap')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'heatmap'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Peta Panas Karies</span>
            </button>

            <button
              onClick={() => setActiveSubTab('correlation')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'correlation'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Korelasi Demografis</span>
            </button>

            <button
              onClick={() => setActiveSubTab('descriptive')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'descriptive'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              id="subtab-descriptive"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Deskriptif & Cetak</span>
            </button>
          </div>

          {/* Filter Toggle & Reset Buttons */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            {(searchQuery || genderFilter !== 'all' || ageGroupFilter !== 'all' || educationFilter !== 'all' || occupationFilter !== 'all' || referralFilter !== 'all' || severityFilter !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-extrabold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 cursor-pointer bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                showFilters
                  ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
              title={showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter Data'}
            >
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Filter Data</span>
            </button>
          </div>

        </div>

        {/* Collapsible Filter Bar Grid */}
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-3.5 border-t border-slate-200/80 dark:border-slate-800 overflow-hidden"
            >
              {/* Filter Grid - Clean 2-Row Responsive Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                
                {/* Search Input - Spans 2 columns on larger screens for better UX */}
                <div className="space-y-1 sm:col-span-2 lg:col-span-1 xl:col-span-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Cari Nama Responden</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Ketik nama responden..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs font-semibold pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Jenis Kelamin</label>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="all">Semua Jenis Kelamin</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                {/* Age Group */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Kelompok Umur</label>
                  <select
                    value={ageGroupFilter}
                    onChange={(e) => setAgeGroupFilter(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="all">Semua Kelompok Umur</option>
                    <option value="5-10">5 - 10 Th (Anak-anak)</option>
                    <option value="10-18">10 - 18 Th (Remaja)</option>
                    <option value="18-60">18 - 60 Th (Produktif)</option>
                    <option value="60+">60+ Th (Lansia)</option>
                  </select>
                </div>

                {/* Status Rujukan */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Status Rujukan</label>
                  <select
                    value={referralFilter}
                    onChange={(e) => setReferralFilter(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="all">Semua Status Rujukan</option>
                    <option value="rujuk">Memerlukan Rujukan</option>
                    <option value="tidak_rujuk">Tidak Memerlukan</option>
                  </select>
                </div>

                {/* Pendidikan */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Tingkat Pendidikan</label>
                  <select
                    value={educationFilter}
                    onChange={(e) => setEducationFilter(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="all">Semua Pendidikan</option>
                    <option value="Tidak Sekolah">Tidak Sekolah</option>
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA">SMA</option>
                    <option value="Diploma">Diploma</option>
                    <option value="S1/D4">S1 / D4</option>
                    <option value="S2">S2</option>
                    <option value="S3">S3</option>
                  </select>
                </div>

                {/* Pekerjaan */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Kategori Pekerjaan</label>
                  <select
                    value={occupationFilter}
                    onChange={(e) => setOccupationFilter(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="all">Semua Pekerjaan</option>
                    <option value="ASN/PNS/PPPK">ASN / PNS / PPPK</option>
                    <option value="TNI/POLRI">TNI / POLRI</option>
                    <option value="PEGAWAI BUMN">Pegawai BUMN</option>
                    <option value="PEGAWAI SWASTA">Pegawai Swasta</option>
                    <option value="WIRASWASTA/WIRAUSAHA">Wiraswasta / Usaha</option>
                    <option value="PELAJAR/MAHASISWA">Pelajar / Mahasiswa</option>
                    <option value="PENGURUS/IBU RUMAH TANGGA">Ibu Rumah Tangga</option>
                    <option value="ASISTEN RUMAH TANGGA">Asisten Rumah Tangga</option>
                    <option value="TIDAK BEKERJA">Tidak Bekerja</option>
                  </select>
                </div>

                {/* Keparahan Gigi */}
                <div className="space-y-1 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Kondisi Keparahan Gigi</label>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="all">Semua Kondisi Keparahan</option>
                    <option value="karies_aktif">Karies Aktif (d &gt; 0 atau D &gt; 0)</option>
                    <option value="sehat">Gigi Sempurna Sehat (DMF-T &amp; def-t = 0)</option>
                  </select>
                </div>

              </div>

              {/* Status Bar Indicator */}
              <div className="flex items-center justify-between bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                  <span className="font-bold">
                    {filteredRespondents.length === respondents.length 
                      ? `Menampilkan seluruh ${filteredRespondents.length} data responden` 
                      : `Tersaring ${filteredRespondents.length} dari ${respondents.length} total responden`}
                  </span>
                </div>
                {(searchQuery || genderFilter !== 'all' || ageGroupFilter !== 'all' || educationFilter !== 'all' || occupationFilter !== 'all' || referralFilter !== 'all' || severityFilter !== 'all') && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                    Filter Aktif
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- MAIN WORKSPACE CONTENT --- */}
      <div className="space-y-6 w-full">

          {/* KPI STATS METRIC GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-5" id="filtered-kpi-grid">
        
        {/* KPI 1: Active Respondents */}
        <motion.div 
          whileHover={{ translateY: -3 }}
          className="glass-panel p-5 rounded-3xl shadow-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Responden Tersaring</span>
            <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-sky-400 rounded-xl"><Users className="w-4 h-4" /></span>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-sky-400 font-mono tracking-tight">{filteredRespondents.length}</span>
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 font-mono">/ {respondents.length}</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold">
              {((filteredRespondents.length / respondents.length) * 100).toFixed(0)}% dari seluruh data sesi
            </p>
          </div>
        </motion.div>

        {/* KPI 2: def-t Average */}
        <motion.div 
          whileHover={{ translateY: -3 }}
          className="glass-panel p-5 rounded-3xl shadow-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rata-Rata def-t (Sulung)</span>
            <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl"><CheckCircle className="w-4 h-4" /></span>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {stats.indexAvg.deft.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2 text-[10px] text-emerald-700/85 dark:text-emerald-300 font-mono font-bold mt-1.5 bg-emerald-500/5 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/10 dark:border-emerald-500/20 w-fit">
              <span>d: {stats.indexAvg.d.toFixed(1)}</span>
              <span>e: {stats.indexAvg.e.toFixed(1)}</span>
              <span>f: {stats.indexAvg.f.toFixed(1)}</span>
            </div>
          </div>
        </motion.div>

        {/* KPI 3: DMF-T Average */}
        <motion.div 
          whileHover={{ translateY: -3 }}
          className="glass-panel p-5 rounded-3xl shadow-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rata-Rata DMF-T (Tetap)</span>
            <span className="p-1.5 bg-indigo-50 dark:bg-pink-950/60 text-indigo-600 dark:text-pink-400 rounded-xl"><Award className="w-4 h-4" /></span>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-indigo-600 dark:text-pink-400 font-mono tracking-tight">
                {stats.indexAvg.dmft.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2 text-[10px] text-indigo-700/85 dark:text-pink-300 font-mono font-bold mt-1.5 bg-indigo-500/5 dark:bg-pink-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/10 dark:border-pink-500/20 w-fit">
              <span>D: {stats.indexAvg.D.toFixed(1)}</span>
              <span>M: {stats.indexAvg.M.toFixed(1)}</span>
              <span>F: {stats.indexAvg.F.toFixed(1)}</span>
            </div>
          </div>
        </motion.div>

        {/* KPI 4: Referral Rate */}
        <motion.div 
          whileHover={{ translateY: -3 }}
          className="glass-panel p-5 rounded-3xl shadow-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tingkat Rujukan</span>
            <span className="p-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 rounded-xl"><AlertTriangle className="w-4 h-4" /></span>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                {((stats.tindakLanjutPct.perluDirujuk || 0) * 100).toFixed(1)}%
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Butuh rujukan faskes</p>
            </div>
            
            {/* Minimalist circular graph */}
            <div className="relative w-12 h-12">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeDasharray={`${(stats.tindakLanjutPct.perluDirujuk || 0) * 100} ${100 - ((stats.tindakLanjutPct.perluDirujuk || 0) * 100)}`}
                />
              </svg>
            </div>
          </div>
        </motion.div>

      </div>

        {/* Workspace Views */}
        <AnimatePresence mode="wait">
          
          {/* VIEW 1: DUAL EPIDEMIOLOGY AND TREND CHARTS */}
          {activeSubTab === 'charts' && (
            <motion.div
              key="charts-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Chart A: Grouped Bar Chart */}
              <div className="glass-panel bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4 relative">
                <div className="flex flex-wrap sm:flex-nowrap justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                      <span className="truncate">Bagan 1: Indeks Karies Berdasarkan Kelompok Umur</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold truncate">Komparasi nilai rata-rata def-t dan DMF-T.</p>
                  </div>
                </div>

                {/* SVG Grouped Column Chart */}
                <div className="relative h-64 w-full flex items-end">
                  {filteredRespondents.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400">Tidak ada data untuk grafik</div>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-between">
                      {/* Grid background lines */}
                      <div className="flex-1 w-full flex flex-col justify-between border-b border-slate-200 relative pt-4">
                        {[4, 3, 2, 1, 0].map(level => (
                          <div key={level} className="w-full border-t border-slate-100 flex items-center relative" style={{ height: '20%' }}>
                            <span className="absolute -left-6 text-[9px] font-bold text-slate-400 font-mono">{level}</span>
                          </div>
                        ))}
                        
                        {/* Clustered Columns */}
                        <div className="absolute inset-x-4 bottom-0 top-4 flex justify-around items-end">
                          {ageGroupChartData.map((d, idx) => {
                            const maxVal = 4.5; // Max scale for percentage height
                            const deftHeightPct = Math.min(100, (d.deft / maxVal) * 100);
                            const dmftHeightPct = Math.min(100, (d.dmft / maxVal) * 100);

                            return (
                              <div key={idx} className="flex flex-col items-center w-24">
                                <div className="flex gap-2 items-end justify-center h-44 w-full">
                                  {/* def-t Bar */}
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${deftHeightPct}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.1 }}
                                    className="w-4 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md cursor-pointer hover:shadow-lg hover:brightness-105 transition-all relative group"
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setHoveredBar({
                                        group: d.group,
                                        type: 'def-t (Gigi Sulung)',
                                        value: d.deft,
                                        x: rect.left - 100,
                                        y: rect.top - 80
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredBar(null)}
                                  />

                                  {/* DMF-T Bar */}
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${dmftHeightPct}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut', delay: (idx * 0.1) + 0.05 }}
                                    className="w-4 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-md cursor-pointer hover:shadow-lg hover:brightness-105 transition-all relative group"
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setHoveredBar({
                                        group: d.group,
                                        type: 'DMF-T (Gigi Tetap)',
                                        value: d.dmft,
                                        x: rect.left - 100,
                                        y: rect.top - 80
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredBar(null)}
                                  />
                                </div>
                                <span className="text-[10px] font-black text-slate-700 mt-2 block font-sans tracking-wide">
                                  {d.label}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 font-mono leading-none mt-0.5">
                                  ({d.count} org)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* HTML Bar Tooltip */}
                  {hoveredBar && (
                    <div 
                      className="fixed bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 p-2.5 rounded-xl shadow-xl z-50 text-xs flex flex-col gap-1 w-44 pointer-events-none"
                      style={{ 
                        left: Math.min(hoveredBar.x + 100, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 190), 
                        top: Math.max(20, hoveredBar.y - 70) 
                      }}
                    >
                      <span className="font-extrabold text-indigo-400 tracking-wide uppercase text-[9px]">Kelompok {hoveredBar.group} tahun</span>
                      <strong className="font-bold border-b border-slate-700 pb-1">{hoveredBar.type}</strong>
                      <span className="font-mono text-base font-black text-white">{hoveredBar.value.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Legends */}
                <div className="flex justify-center gap-6 text-[10px] font-bold pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-xs shadow-md shadow-emerald-600/10" />
                    <span className="text-slate-600 dark:text-slate-300">Rata-rata def-t (Gigi Sulung)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-xs shadow-md shadow-indigo-600/10" />
                    <span className="text-slate-600 dark:text-slate-300">Rata-rata DMF-T (Gigi Tetap)</span>
                  </div>
                </div>
              </div>

              {/* Chart B: Line Trend Chart */}
              <div className="glass-panel bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4 relative">
                <div className="flex flex-wrap sm:flex-nowrap justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                      <span className="truncate">Bagan 2: Analisis Tren Multi-Metrik</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold truncate">Tinjau distribusi karies secara biologis atau kronologis.</p>
                  </div>
                  
                  {/* Mode switcher button */}
                  <div className="flex gap-1 bg-white/70 dark:bg-slate-800/70 p-1 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black shrink-0 shadow-2xs">
                    <button
                      onClick={() => setLineChartMode('age')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer uppercase ${lineChartMode === 'age' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Biol. Umur
                    </button>
                    <button
                      onClick={() => setLineChartMode('timeline')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer uppercase ${lineChartMode === 'timeline' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Kronol. Tanggal
                    </button>
                  </div>
                </div>

                {/* SVG Line Chart */}
                <div className="relative h-64 w-full flex items-end">
                  {lineChartData.length < 2 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400 text-center px-4 leading-relaxed">
                      {lineChartMode === 'timeline' 
                        ? 'Membutuhkan minimal 2 tanggal pemeriksaan yang berbeda untuk melihat garis tren kronologis. Silakan muat data simulasi atau ganti ke "Biol. Umur".'
                        : 'Membutuhkan minimal 2 umur responden berbeda untuk memetakan kurva perkembangan.'}
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-between">
                      {/* Grid lines */}
                      <div className="flex-1 w-full flex flex-col justify-between border-b border-slate-200 relative pt-4">
                        {[4, 3, 2, 1, 0].map(level => (
                          <div key={level} className="w-full border-t border-slate-100 flex items-center relative" style={{ height: '20%' }}>
                            <span className="absolute -left-6 text-[9px] font-bold text-slate-400 font-mono">{level}</span>
                          </div>
                        ))}

                        {/* Interactive Sparkline Paths */}
                        <svg className="absolute inset-x-8 bottom-0 top-4 w-[calc(100%-64px)] h-[calc(100%-16px)] overflow-visible">
                          {(() => {
                            const paddingX = 20;
                            const pointsCount = lineChartData.length;
                            const chartWidth = 400; // arbitrary, responsive logic handled by svg ratio
                            const chartHeight = 150;
                            const maxVal = 5;

                            const getCoords = (val: number, idx: number) => {
                              const denom = Math.max(1, pointsCount - 1);
                              const x = idx * (100 / denom);
                              const y = 100 - (val / maxVal) * 100;
                              return { x: `${x}%`, y: `${y}%` };
                            };

                            // Generate path string
                            let dmftPath = '';
                            let deftPath = '';
                            const denom = Math.max(1, pointsCount - 1);
                            lineChartData.forEach((d, idx) => {
                              const coordsDmft = getCoords(d.dmft, idx);
                              const coordsDeft = getCoords(d.deft, idx);
                              if (idx === 0) {
                                dmftPath = `M 0,${coordsDmft.y}`;
                                deftPath = `M 0,${coordsDeft.y}`;
                              } else {
                                const currentX = (idx / denom) * 100;
                                dmftPath += ` L ${currentX}%,${coordsDmft.y}`;
                                deftPath += ` L ${currentX}%,${coordsDeft.y}`;
                              }
                            });

                            return (
                              <>
                                {/* def-t Path (Gigi Sulung) */}
                                <motion.path
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 1, ease: 'easeInOut' }}
                                  d={deftPath}
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />

                                {/* DMF-T Path (Gigi Tetap) */}
                                <motion.path
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 1, ease: 'easeInOut' }}
                                  d={dmftPath}
                                  fill="none"
                                  stroke="#4f46e5"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />

                                {/* Dots */}
                                {lineChartData.map((d, idx) => {
                                  const dmftPos = getCoords(d.dmft, idx);
                                  const deftPos = getCoords(d.deft, idx);
                                  
                                  return (
                                    <g key={idx} className="cursor-pointer">
                                      {/* DMF-T node */}
                                      <motion.circle
                                        cx={`${(idx / (pointsCount - 1)) * 100}%`}
                                        cy={dmftPos.y}
                                        r="4"
                                        fill="#4f46e5"
                                        stroke="#ffffff"
                                        strokeWidth="1.5"
                                        whileHover={{ r: 6 }}
                                        onMouseEnter={(e) => {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setHoveredLinePoint({
                                            xVal: d.xVal,
                                            count: d.count,
                                            dmft: d.dmft,
                                            deft: d.deft,
                                            x: rect.left - 100,
                                            y: rect.top - 80
                                          });
                                        }}
                                        onMouseLeave={() => setHoveredLinePoint(null)}
                                      />
                                      
                                      {/* def-t node */}
                                      <motion.circle
                                        cx={`${(idx / (pointsCount - 1)) * 100}%`}
                                        cy={deftPos.y}
                                        r="4"
                                        fill="#10b981"
                                        stroke="#ffffff"
                                        strokeWidth="1.5"
                                        whileHover={{ r: 6 }}
                                        onMouseEnter={(e) => {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setHoveredLinePoint({
                                            xVal: d.xVal,
                                            count: d.count,
                                            dmft: d.dmft,
                                            deft: d.deft,
                                            x: rect.left - 100,
                                            y: rect.top - 80
                                          });
                                        }}
                                        onMouseLeave={() => setHoveredLinePoint(null)}
                                      />
                                    </g>
                                  );
                                })}
                              </>
                            );
                          })()}
                        </svg>

                        {/* X Axis labels */}
                        <div className="absolute inset-x-8 -bottom-5 flex justify-between">
                          {lineChartData.map((d, idx) => {
                            // Only show subset of labels to prevent crowding
                            const showLabel = lineChartData.length < 8 || idx === 0 || idx === lineChartData.length - 1 || idx === Math.floor(lineChartData.length / 2);
                            return (
                              <div key={idx} className="flex flex-col items-center" style={{ width: '10px' }}>
                                {showLabel && (
                                  <span className="text-[9px] font-black text-slate-500 whitespace-nowrap">
                                    {d.xVal}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    </div>
                  )}

                  {/* HTML Line Tooltip */}
                  {hoveredLinePoint && (
                    <div 
                      className="fixed bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 p-2.5 rounded-xl shadow-xl z-50 text-xs flex flex-col gap-1 w-44 pointer-events-none"
                      style={{ 
                        left: Math.min(hoveredLinePoint.x + 100, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 190), 
                        top: Math.max(20, hoveredLinePoint.y - 70) 
                      }}
                    >
                      <span className="font-extrabold text-indigo-400 tracking-wide uppercase text-[9px]">{hoveredLinePoint.xVal}</span>
                      <span className="text-slate-400 leading-none">Pemeriksaan: <strong className="text-white">{hoveredLinePoint.count} org</strong></span>
                      <div className="border-t border-slate-700 mt-1.5 pt-1.5 space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span>Rata-Rata DMF-T:</span>
                          <span className="font-mono font-bold text-indigo-400">{hoveredLinePoint.dmft.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span>Rata-Rata def-t:</span>
                          <span className="font-mono font-bold text-emerald-400">{hoveredLinePoint.deft.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Legends */}
                <div className="flex justify-center gap-6 text-[10px] font-bold pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span className="text-slate-600 dark:text-slate-300">def-t (Gigi Sulung)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-1.5 bg-indigo-600 rounded-full" />
                    <span className="text-slate-600 dark:text-slate-300">DMF-T (Gigi Tetap)</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW 2: INTERACTIVE DENTAL HEATMAP */}
          {activeSubTab === 'heatmap' && (
            <motion.div
              key="heatmap-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Toggle for Heatmap View Mode */}
              <div className="flex justify-center bg-white/80 dark:bg-slate-800/80 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl w-fit mx-auto gap-1">
                <button
                  type="button"
                  onClick={() => setHeatmapViewMode('geografis')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    heatmapViewMode === 'geografis' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <MapPin className="w-4 h-4" /> Peta Panas Geografis (Peta Wilayah)
                </button>
                <button
                  type="button"
                  onClick={() => setHeatmapViewMode('odontogram')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    heatmapViewMode === 'odontogram' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span>🦷</span> Heatmap Odontogram (Kondisi Gigi)
                </button>
              </div>

              {heatmapViewMode === 'geografis' ? (
                <GeographicHeatmap respondents={filteredRespondents} />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                  {/* Heatmap Area */}
                  <div className="glass-panel rounded-3xl p-6 border border-white/40 shadow-md space-y-4 lg:col-span-2">
                <div className="flex flex-wrap sm:flex-nowrap justify-between items-start sm:items-center gap-3 border-b border-white/30 pb-3">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                      <span>🦷 Peta Kepadatan Masalah Gigi (Heatmap Odontogram)</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold truncate">Tinjau peta oklusi gigi berlubang, rusak, atau ditambal.</p>
                  </div>

                  {/* Switch metric */}
                  <div className="flex flex-wrap gap-1 bg-white/70 dark:bg-slate-800/70 p-1 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black shrink-0 shadow-2xs">
                    <button
                      onClick={() => setHeatmapTargetMetric('decayed')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer uppercase ${heatmapTargetMetric === 'decayed' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Lubang (d/D)
                    </button>
                    <button
                      onClick={() => setHeatmapTargetMetric('missing')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer uppercase ${heatmapTargetMetric === 'missing' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Hilang (e/M)
                    </button>
                    <button
                      onClick={() => setHeatmapTargetMetric('filled')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer uppercase ${heatmapTargetMetric === 'filled' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Tambalan (f/F)
                    </button>
                  </div>
                </div>

                {/* Main Interactive Map */}
                <div className="overflow-x-auto pb-4 scrollbar-thin">
                  <div className="min-w-[640px] space-y-4 p-1">
                    
                    {/* Render FDI Heat grids */}
                    {/* 1. UPPER ROW */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                        <span>RA Kanan (Upper Right)</span>
                        <span>RA Kiri (Upper Left)</span>
                      </div>

                      <div className="flex items-center">
                        {/* Upper Right Permanent & Deciduous */}
                        <div className="flex-1 pr-4">
                          <div className="grid grid-cols-8 gap-1 justify-items-center">
                            {['18', '17', '16', '15', '14', '13', '12', '11'].map(num => {
                              const dat = odontogramHeatData[num];
                              const score = heatmapTargetMetric === 'decayed' ? dat?.decayedPct : heatmapTargetMetric === 'missing' ? dat?.missingPct : dat?.filledPct;
                              const pct = score || 0;
                              // Shading intensity
                              const bgStyle = {
                                backgroundColor: pct === 0 ? 'rgba(241, 245, 249, 0.5)' : heatmapTargetMetric === 'decayed' ? `rgba(225, 29, 72, ${Math.max(0.15, pct / 80)})` : heatmapTargetMetric === 'missing' ? `rgba(100, 116, 139, ${Math.max(0.15, pct / 80)})` : `rgba(16, 185, 129, ${Math.max(0.15, pct / 80)})`,
                                color: pct > 35 ? '#ffffff' : '#0f172a',
                                border: selectedTooth === num ? '2px solid #4f46e5' : pct > 0 ? '1px solid rgba(0,0,0,0.1)' : '1px dashed #cbd5e1'
                              };
                              return (
                                <button
                                  key={num}
                                  onClick={() => setSelectedTooth(num)}
                                  className="w-8 h-8 flex flex-col items-center justify-center rounded-lg text-[10px] font-black font-mono shadow-xs transition-all duration-200 cursor-pointer hover:scale-110"
                                  style={bgStyle}
                                >
                                  <span>{num}</span>
                                  <span className="text-[7px] leading-none opacity-80">{pct.toFixed(0)}%</span>
                                </button>
                              );
                            })}
                          </div>
                          
                          <div className="grid grid-cols-8 gap-1 justify-items-center mt-2.5">
                            <div className="col-span-3"></div>
                            {['55', '54', '53', '52', '51'].map(num => {
                              const dat = odontogramHeatData[num];
                              const score = heatmapTargetMetric === 'decayed' ? dat?.decayedPct : heatmapTargetMetric === 'missing' ? dat?.missingPct : dat?.filledPct;
                              const pct = score || 0;
                              const bgStyle = {
                                backgroundColor: pct === 0 ? 'rgba(241, 245, 249, 0.5)' : heatmapTargetMetric === 'decayed' ? `rgba(225, 29, 72, ${Math.max(0.15, pct / 80)})` : heatmapTargetMetric === 'missing' ? `rgba(100, 116, 139, ${Math.max(0.15, pct / 80)})` : `rgba(16, 185, 129, ${Math.max(0.15, pct / 80)})`,
                                color: pct > 35 ? '#ffffff' : '#0f172a',
                                border: selectedTooth === num ? '2px solid #4f46e5' : pct > 0 ? '1px solid rgba(0,0,0,0.1)' : '1px dashed #cbd5e1'
                              };
                              return (
                                <button
                                  key={num}
                                  onClick={() => setSelectedTooth(num)}
                                  className="w-8 h-8 flex flex-col items-center justify-center rounded-lg text-[10px] font-black font-mono shadow-xs transition-all duration-200 cursor-pointer hover:scale-110"
                                  style={bgStyle}
                                >
                                  <span>{num}</span>
                                  <span className="text-[7px] leading-none opacity-80">{pct.toFixed(0)}%</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Midline vertical line */}
                        <div className="w-[2px] bg-slate-400 self-stretch rounded-full mx-1" />

                        {/* Upper Left Permanent & Deciduous */}
                        <div className="flex-1 pl-4">
                          <div className="grid grid-cols-8 gap-1 justify-items-center">
                            {['21', '22', '23', '24', '25', '26', '27', '28'].map(num => {
                              const dat = odontogramHeatData[num];
                              const score = heatmapTargetMetric === 'decayed' ? dat?.decayedPct : heatmapTargetMetric === 'missing' ? dat?.missingPct : dat?.filledPct;
                              const pct = score || 0;
                              const bgStyle = {
                                backgroundColor: pct === 0 ? 'rgba(241, 245, 249, 0.5)' : heatmapTargetMetric === 'decayed' ? `rgba(225, 29, 72, ${Math.max(0.15, pct / 80)})` : heatmapTargetMetric === 'missing' ? `rgba(100, 116, 139, ${Math.max(0.15, pct / 80)})` : `rgba(16, 185, 129, ${Math.max(0.15, pct / 80)})`,
                                color: pct > 35 ? '#ffffff' : '#0f172a',
                                border: selectedTooth === num ? '2px solid #4f46e5' : pct > 0 ? '1px solid rgba(0,0,0,0.1)' : '1px dashed #cbd5e1'
                              };
                              return (
                                <button
                                  key={num}
                                  onClick={() => setSelectedTooth(num)}
                                  className="w-8 h-8 flex flex-col items-center justify-center rounded-lg text-[10px] font-black font-mono shadow-xs transition-all duration-200 cursor-pointer hover:scale-110"
                                  style={bgStyle}
                                >
                                  <span>{num}</span>
                                  <span className="text-[7px] leading-none opacity-80">{pct.toFixed(0)}%</span>
                                </button>
                              );
                            })}
                          </div>
                          
                          <div className="grid grid-cols-8 gap-1 justify-items-center mt-2.5">
                            {['61', '62', '63', '64', '65'].map(num => {
                              const dat = odontogramHeatData[num];
                              const score = heatmapTargetMetric === 'decayed' ? dat?.decayedPct : heatmapTargetMetric === 'missing' ? dat?.missingPct : dat?.filledPct;
                              const pct = score || 0;
                              const bgStyle = {
                                backgroundColor: pct === 0 ? 'rgba(241, 245, 249, 0.5)' : heatmapTargetMetric === 'decayed' ? `rgba(225, 29, 72, ${Math.max(0.15, pct / 80)})` : heatmapTargetMetric === 'missing' ? `rgba(100, 116, 139, ${Math.max(0.15, pct / 80)})` : `rgba(16, 185, 129, ${Math.max(0.15, pct / 80)})`,
                                color: pct > 35 ? '#ffffff' : '#0f172a',
                                border: selectedTooth === num ? '2px solid #4f46e5' : pct > 0 ? '1px solid rgba(0,0,0,0.1)' : '1px dashed #cbd5e1'
                              };
                              return (
                                <button
                                  key={num}
                                  onClick={() => setSelectedTooth(num)}
                                  className="w-8 h-8 flex flex-col items-center justify-center rounded-lg text-[10px] font-black font-mono shadow-xs transition-all duration-200 cursor-pointer hover:scale-110"
                                  style={bgStyle}
                                >
                                  <span>{num}</span>
                                  <span className="text-[7px] leading-none opacity-80">{pct.toFixed(0)}%</span>
                                </button>
                              );
                            })}
                            <div className="col-span-3"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* gariss oklusal middle horizontal */}
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-300" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-slate-300 text-slate-700 font-extrabold text-[8px] px-2.5 py-0.5 rounded-full uppercase tracking-widest font-mono shadow-xs">
                          Garis Oklusal / Midline
                        </span>
                      </div>
                    </div>

                    {/* 2. LOWER ROW */}
                    <div className="space-y-3">
                      <div className="flex items-center">
                        {/* Lower Right Permanent & Deciduous */}
                        <div className="flex-1 pr-4">
                          <div className="grid grid-cols-8 gap-1 justify-items-center mb-2.5">
                            <div className="col-span-3"></div>
                            {['85', '84', '83', '82', '81'].map(num => {
                              const dat = odontogramHeatData[num];
                              const score = heatmapTargetMetric === 'decayed' ? dat?.decayedPct : heatmapTargetMetric === 'missing' ? dat?.missingPct : dat?.filledPct;
                              const pct = score || 0;
                              const bgStyle = {
                                backgroundColor: pct === 0 ? 'rgba(241, 245, 249, 0.5)' : heatmapTargetMetric === 'decayed' ? `rgba(225, 29, 72, ${Math.max(0.15, pct / 80)})` : heatmapTargetMetric === 'missing' ? `rgba(100, 116, 139, ${Math.max(0.15, pct / 80)})` : `rgba(16, 185, 129, ${Math.max(0.15, pct / 80)})`,
                                color: pct > 35 ? '#ffffff' : '#0f172a',
                                border: selectedTooth === num ? '2px solid #4f46e5' : pct > 0 ? '1px solid rgba(0,0,0,0.1)' : '1px dashed #cbd5e1'
                              };
                              return (
                                <button
                                  key={num}
                                  onClick={() => setSelectedTooth(num)}
                                  className="w-8 h-8 flex flex-col items-center justify-center rounded-lg text-[10px] font-black font-mono shadow-xs transition-all duration-200 cursor-pointer hover:scale-110"
                                  style={bgStyle}
                                >
                                  <span>{num}</span>
                                  <span className="text-[7px] leading-none opacity-80">{pct.toFixed(0)}%</span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="grid grid-cols-8 gap-1 justify-items-center">
                            {['48', '47', '46', '45', '44', '43', '42', '41'].map(num => {
                              const dat = odontogramHeatData[num];
                              const score = heatmapTargetMetric === 'decayed' ? dat?.decayedPct : heatmapTargetMetric === 'missing' ? dat?.missingPct : dat?.filledPct;
                              const pct = score || 0;
                              const bgStyle = {
                                backgroundColor: pct === 0 ? 'rgba(241, 245, 249, 0.5)' : heatmapTargetMetric === 'decayed' ? `rgba(225, 29, 72, ${Math.max(0.15, pct / 80)})` : heatmapTargetMetric === 'missing' ? `rgba(100, 116, 139, ${Math.max(0.15, pct / 80)})` : `rgba(16, 185, 129, ${Math.max(0.15, pct / 80)})`,
                                color: pct > 35 ? '#ffffff' : '#0f172a',
                                border: selectedTooth === num ? '2px solid #4f46e5' : pct > 0 ? '1px solid rgba(0,0,0,0.1)' : '1px dashed #cbd5e1'
                              };
                              return (
                                <button
                                  key={num}
                                  onClick={() => setSelectedTooth(num)}
                                  className="w-8 h-8 flex flex-col items-center justify-center rounded-lg text-[10px] font-black font-mono shadow-xs transition-all duration-200 cursor-pointer hover:scale-110"
                                  style={bgStyle}
                                >
                                  <span>{num}</span>
                                  <span className="text-[7px] leading-none opacity-80">{pct.toFixed(0)}%</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Midline vertical line */}
                        <div className="w-[2px] bg-slate-400 self-stretch rounded-full mx-1" />

                        {/* Lower Left Permanent & Deciduous */}
                        <div className="flex-1 pl-4">
                          <div className="grid grid-cols-8 gap-1 justify-items-center mb-2.5">
                            {['71', '72', '73', '74', '75'].map(num => {
                              const dat = odontogramHeatData[num];
                              const score = heatmapTargetMetric === 'decayed' ? dat?.decayedPct : heatmapTargetMetric === 'missing' ? dat?.missingPct : dat?.filledPct;
                              const pct = score || 0;
                              const bgStyle = {
                                backgroundColor: pct === 0 ? 'rgba(241, 245, 249, 0.5)' : heatmapTargetMetric === 'decayed' ? `rgba(225, 29, 72, ${Math.max(0.15, pct / 80)})` : heatmapTargetMetric === 'missing' ? `rgba(100, 116, 139, ${Math.max(0.15, pct / 80)})` : `rgba(16, 185, 129, ${Math.max(0.15, pct / 80)})`,
                                color: pct > 35 ? '#ffffff' : '#0f172a',
                                border: selectedTooth === num ? '2px solid #4f46e5' : pct > 0 ? '1px solid rgba(0,0,0,0.1)' : '1px dashed #cbd5e1'
                              };
                              return (
                                <button
                                  key={num}
                                  onClick={() => setSelectedTooth(num)}
                                  className="w-8 h-8 flex flex-col items-center justify-center rounded-lg text-[10px] font-black font-mono shadow-xs transition-all duration-200 cursor-pointer hover:scale-110"
                                  style={bgStyle}
                                >
                                  <span>{num}</span>
                                  <span className="text-[7px] leading-none opacity-80">{pct.toFixed(0)}%</span>
                                </button>
                              );
                            })}
                            <div className="col-span-3"></div>
                          </div>

                          <div className="grid grid-cols-8 gap-1 justify-items-center">
                            {['31', '32', '33', '34', '35', '36', '37', '38'].map(num => {
                              const dat = odontogramHeatData[num];
                              const score = heatmapTargetMetric === 'decayed' ? dat?.decayedPct : heatmapTargetMetric === 'missing' ? dat?.missingPct : dat?.filledPct;
                              const pct = score || 0;
                              const bgStyle = {
                                backgroundColor: pct === 0 ? 'rgba(241, 245, 249, 0.5)' : heatmapTargetMetric === 'decayed' ? `rgba(225, 29, 72, ${Math.max(0.15, pct / 80)})` : heatmapTargetMetric === 'missing' ? `rgba(100, 116, 139, ${Math.max(0.15, pct / 80)})` : `rgba(16, 185, 129, ${Math.max(0.15, pct / 80)})`,
                                color: pct > 35 ? '#ffffff' : '#0f172a',
                                border: selectedTooth === num ? '2px solid #4f46e5' : pct > 0 ? '1px solid rgba(0,0,0,0.1)' : '1px dashed #cbd5e1'
                              };
                              return (
                                <button
                                  key={num}
                                  onClick={() => setSelectedTooth(num)}
                                  className="w-8 h-8 flex flex-col items-center justify-center rounded-lg text-[10px] font-black font-mono shadow-xs transition-all duration-200 cursor-pointer hover:scale-110"
                                  style={bgStyle}
                                >
                                  <span>{num}</span>
                                  <span className="text-[7px] leading-none opacity-80">{pct.toFixed(0)}%</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1">
                        <span>RB Kanan (Lower Right)</span>
                        <span>RB Kiri (Lower Left)</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Heatmap color key */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[10px] font-bold">
                  <span className="text-slate-500 uppercase tracking-wide">Intensitas Masalah</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span>0%</span>
                    <div className="w-32 h-2.5 rounded-full bg-gradient-to-r from-slate-100 to-rose-600 border border-slate-300" />
                    <span>80%+</span>
                  </div>
                </div>
              </div>

              {/* Tooth Detail Sidebar */}
              <div className="glass-panel rounded-3xl p-6 border border-white/40 shadow-md flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-white/30 pb-3">
                    <h3 className="text-xs font-black text-indigo-950 uppercase tracking-widest flex items-center gap-1.5">
                      🔬 Analisis Spesifik Elemen Gigi
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold">Klik elemen gigi di peta untuk detail audit epidemiologis.</p>
                  </div>

                  {selectedTooth ? (
                    (() => {
                      const toothInfo = odontogramHeatData[selectedTooth];
                      const isDeciduous = parseInt(selectedTooth) >= 51;
                      const options = isDeciduous ? DECIDUOUS_CODES : PERMANENT_CODES;
                      
                      return (
                        <div className="space-y-4 animate-fadeIn">
                          {/* Active card badge */}
                          <div className="flex items-center gap-3 bg-white/70 p-3 rounded-2xl border border-white/60 shadow-xs">
                            <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex flex-col items-center justify-center font-mono shadow-md shadow-indigo-600/10">
                              <span className="text-xs font-bold leading-none uppercase text-indigo-200">{isDeciduous ? 'Sulung' : 'Tetap'}</span>
                              <span className="text-lg font-black leading-none mt-1">{selectedTooth}</span>
                            </div>
                            <div>
                              <strong className="text-xs text-slate-900 font-bold block">FDI Two-Digit Code</strong>
                              <span className="text-[10px] text-slate-500 font-bold">Gigi {isDeciduous ? 'Susu / Anak-Anak' : 'Permanen Dewasa'}</span>
                            </div>
                          </div>

                          {/* Stat charts */}
                          <div className="space-y-3.5 bg-white/40 border border-white/50 p-4 rounded-2xl">
                            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Distribusi Klinis Responden</h4>
                            
                            <ProgressBar 
                              label="S - Sehat / Normal" 
                              count={toothInfo ? (toothInfo.total - (toothInfo.decayed + toothInfo.missing + toothInfo.filled)) : 0} 
                              pct={toothInfo ? toothInfo.healthyPct : 100} 
                              colorClass="bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-xs"
                            />
                            <ProgressBar 
                              label="D/d - Karies / Berlubang" 
                              count={toothInfo ? toothInfo.decayed : 0} 
                              pct={toothInfo ? toothInfo.decayedPct : 0} 
                              colorClass="bg-gradient-to-r from-rose-400 to-rose-500 shadow-xs"
                            />
                            <ProgressBar 
                              label="M/e - Dicabut Akibat Karies" 
                              count={toothInfo ? toothInfo.missing : 0} 
                              pct={toothInfo ? toothInfo.missingPct : 0} 
                              colorClass="bg-gradient-to-r from-slate-400 to-slate-500 shadow-xs"
                            />
                            <ProgressBar 
                              label="F/f - Tumpatan / Tambalan Sehat" 
                              count={toothInfo ? toothInfo.filled : 0} 
                              pct={toothInfo ? toothInfo.filledPct : 0} 
                              colorClass="bg-gradient-to-r from-indigo-400 to-indigo-500 shadow-xs"
                            />
                          </div>

                          <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-2xl text-[11px] text-amber-900/90 leading-relaxed font-medium">
                            <strong>Rekomendasi Klinis:</strong>
                            <p className="mt-1">
                              {toothInfo.decayedPct > 40 
                                ? `Tingkat karies gigi ${selectedTooth} sangat tinggi (${toothInfo.decayedPct.toFixed(0)}%). Disarankan tindakan fluoridasi lokal masif, penyuluhan diet rendah gula, dan restorasi tumpat dini.`
                                : toothInfo.decayedPct > 15
                                ? `Gigi ${selectedTooth} dalam batas karies sedang (${toothInfo.decayedPct.toFixed(0)}%). Optimalkan penggunaan fissure sealant dan edukasi menyikat gigi malam hari sebelum tidur.`
                                : `Kondisi gigi ${selectedTooth} sehat secara dominan (${toothInfo.healthyPct.toFixed(0)}% sehat). Pertahankan status bebas karies.`
                              }
                            </p>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-2">
                      <Sparkles className="w-8 h-8 text-indigo-400 animate-bounce" />
                      <p className="text-xs font-semibold max-w-xs">Silakan ketuk salah satu elemen gigi di peta oklusi untuk melihat profil statistik karies klinis.</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-55 border border-slate-200/50 p-3.5 rounded-2xl text-[10px] text-slate-500 space-y-1.5 mt-4">
                  <span className="font-extrabold text-indigo-950 uppercase tracking-widest block text-[9px]">Indeks Karies Gabungan Sesi</span>
                  <div className="flex justify-between">
                    <span>Prevalensi Karies Gigi Sulung:</span>
                    <strong className="text-slate-800 font-mono font-bold">{(rawStats.gigiSulungAvg.karies * 10).toFixed(1)}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Prevalensi Karies Gigi Tetap:</span>
                    <strong className="text-slate-800 font-mono font-bold">{(rawStats.gigiTetapAvg.karies * 10).toFixed(1)}%</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

          {/* VIEW 3: CORRELATION MATRIX */}
          {activeSubTab === 'correlation' && (
            <motion.div
              key="correlation-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Social Determinants Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Pendidikan List Card */}
                <div className="glass-panel rounded-3xl p-6 border border-white/40 shadow-md space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-white/20 pb-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" /> Pendidikan Terakhir / Orang Tua (Saringan)
                  </h4>
                  <div className="space-y-3.5">
                    {(Object.entries(stats.pendidikanBreakdown) as [string, number][]).filter(([_, count]) => count > 0).length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">Data pendidikan kosong untuk filter ini</p>
                    ) : (
                      (Object.entries(stats.pendidikanBreakdown) as [string, number][])
                        .filter(([_, count]) => count > 0)
                        .sort((a, b) => b[1] - a[1])
                        .map(([eduName, count]) => (
                          <ProgressBar
                            key={eduName}
                            label={eduName}
                            count={count}
                            pct={stats.pendidikanFilledCount ? (count / stats.pendidikanFilledCount) * 100 : 0}
                            colorClass="bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-xs"
                          />
                        ))
                    )}
                  </div>
                </div>

                {/* Pekerjaan List Card */}
                <div className="glass-panel rounded-3xl p-6 border border-white/40 shadow-md space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-white/20 pb-2">
                    <Briefcase className="w-4 h-4 text-emerald-600" /> Pekerjaan / Orang Tua (Saringan)
                  </h4>
                  <div className="space-y-3.5">
                    {(Object.entries(stats.pekerjaanBreakdown) as [string, number][]).filter(([_, count]) => count > 0).length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">Data pekerjaan kosong untuk filter ini</p>
                    ) : (
                      (Object.entries(stats.pekerjaanBreakdown) as [string, number][])
                        .filter(([_, count]) => count > 0)
                        .sort((a, b) => b[1] - a[1])
                        .map(([jobName, count]) => (
                          <ProgressBar
                            key={jobName}
                            label={jobName}
                            count={count}
                            pct={stats.pekerjaanFilledCount ? (count / stats.pekerjaanFilledCount) * 100 : 0}
                            colorClass="bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-xs"
                          />
                        ))
                    )}
                  </div>
                </div>

              </div>

              {/* Bivariate Correlation Heatmap Grid */}
              <div className="glass-panel rounded-3xl p-6 border border-white/40 shadow-md space-y-4">
                <div className="border-b border-white/30 pb-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                    📊 Matriks Korelasi Epidemiologis (Pendidikan vs Kelompok Umur)
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold">Tinjau tingkat kepadatan rujukan klinis (%) dan jumlah responden dalam kelompok silang.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[640px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="py-3 px-4 font-extrabold uppercase text-[10px]">Tingkat Pendidikan</th>
                        {correlationMatrix.columns.map(col => (
                          <th key={col} className="py-3 px-4 text-center font-extrabold uppercase text-[10px] w-40">
                            Kelompok {col} Th
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {correlationMatrix.rows.map(row => (
                        <tr key={row.education} className="hover:bg-indigo-50/25 transition-colors">
                          <td className="py-3 px-4 font-extrabold text-slate-800">{row.education}</td>
                          {row.data.map((cell, idx) => {
                            const hasData = cell.count > 0;
                            const rate = cell.referralRate;
                            // Cell color based on referral rate
                            const cellStyle = hasData ? {
                              backgroundColor: `rgba(225, 29, 72, ${Math.max(0.08, rate / 100)})`,
                              border: '1px solid rgba(0,0,0,0.05)'
                            } : {
                              backgroundColor: 'transparent'
                            };

                            return (
                              <td key={idx} className="p-2 text-center" style={cellStyle}>
                                {hasData ? (
                                  <div className="flex flex-col items-center justify-center">
                                    <span className="font-mono font-black text-slate-900 text-xs">
                                      {rate.toFixed(0)}%
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-bold leading-none mt-0.5">
                                      {cell.count} org / DMF-T: {cell.dmft.toFixed(1)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-bold font-mono">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Matrix key */}
                <div className="flex justify-between items-center text-[10px] font-bold bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
                  <span className="text-slate-500 uppercase tracking-wide">Intensitas Kerawanan Rujukan</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span>0% rujukan</span>
                    <div className="w-24 h-2 rounded-full bg-gradient-to-r from-rose-50 to-rose-600 border border-rose-200" />
                    <span>100% rujukan</span>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* VIEW 4: DESCRIPTIVE ANALYSIS VIEW */}
          {activeSubTab === 'descriptive' && (
            <motion.div
              key="descriptive-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <DescriptiveAnalysis 
                respondents={filteredRespondents} 
                allRespondentsCount={respondents.length} 
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* --- CLINICAL DATA REFERENCE TABLES --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gigi Sulung & Tetap comparative table */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4 lg:col-span-2" id="teeth-state-table-container">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
              I. RATA-RATA TEMUAN KLINIS GIGI & MULUT
            </h3>
            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold shadow-2xs">
              Tabel Komparasi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-600 border-b border-slate-200">
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px]">Kategori Keadaan Gigi</th>
                  <th className="py-3 px-3 text-right font-bold uppercase tracking-wider text-[10px]">Rata-Rata Gigi Sulung (def-t)</th>
                  <th className="py-3 px-3 text-right font-bold uppercase tracking-wider text-[10px]">Rata-Rata Gigi Tetap (DMF-T)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-indigo-50/10 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Gigi Sehat</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-extrabold">{stats.gigiSulungAvg.sehat.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-extrabold">{stats.gigiTetapAvg.sehat.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-indigo-50/10 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Gigi Berlubang / Karies (d / D)</td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-extrabold">{stats.gigiSulungAvg.karies.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-extrabold">{stats.gigiTetapAvg.karies.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-indigo-50/10 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Gigi dicabut karena karies (e / M)</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-bold">{stats.gigiSulungAvg.dicabutKaries.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-bold">{stats.gigiTetapAvg.dicabutKaries.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-indigo-50/10 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Tumpatan dengan karies</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">{stats.gigiSulungAvg.tumpatanKaries.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">{stats.gigiTetapAvg.tumpatanKaries.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-indigo-50/10 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Tumpatan tanpa karies (f / F)</td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-600 font-bold">{stats.gigiSulungAvg.tumpatanTanpaKaries.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-600 font-bold">{stats.gigiTetapAvg.tumpatanTanpaKaries.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-indigo-50/10 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Gigi dicabut sebab lain</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">{stats.gigiSulungAvg.dicabutSebabLain.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">{stats.gigiTetapAvg.dicabutSebabLain.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-indigo-50/10 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Fissure Sealant</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">{stats.gigiSulungAvg.fissureSealant.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">{stats.gigiTetapAvg.fissureSealant.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-indigo-50/10 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Protesa cekat/mahkota/implan/veneer</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">{stats.gigiSulungAvg.protesaCekat.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">{stats.gigiTetapAvg.protesaCekat.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-slate-50 bg-slate-50/30 font-bold border-t-2 border-slate-200">
                  <td className="py-3 px-3 font-bold text-indigo-950">Indeks Karies Gabungan (def-t / DMF-T)</td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-600 font-extrabold text-sm">{stats.indexAvg.deft.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono text-indigo-600 font-extrabold text-sm">{stats.indexAvg.dmft.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Interpretasi Klinis Box */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4 flex flex-col justify-between" id="clinical-interpretation-card">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-3 uppercase tracking-widest">
              II. INTERPRETASI EPIDEMIOLOGIS
            </h3>
            
            {/* DMF-T Level */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">KEPARAHAN KARIES GIGI TETAP (DMF-T)</span>
              <div className={`p-3 rounded-2xl border font-bold text-xs flex justify-between items-center shadow-xs backdrop-blur-md ${dmftSeverity.color}`}>
                <span>DMF-T: {stats.indexAvg.dmft.toFixed(2)}</span>
                <span className="uppercase text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full bg-white/80 text-slate-900 border border-white/40 shadow-xs">{dmftSeverity.label}</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{dmftSeverity.desc}</p>
            </div>

            {/* def-t Level */}
            <div className="space-y-2 pt-4 border-t border-slate-200/50">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">KEPARAHAN KARIES GIGI SULUNG (DEF-T)</span>
              <div className={`p-3 rounded-2xl border font-bold text-xs flex justify-between items-center shadow-xs backdrop-blur-md ${deftSeverity.color}`}>
                <span>def-t: {stats.indexAvg.deft.toFixed(2)}</span>
                <span className="uppercase text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full bg-white/80 text-slate-900 border border-white/40 shadow-xs">{deftSeverity.label}</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{deftSeverity.desc}</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl text-xs text-slate-700 space-y-2 shadow-xs mt-4">
            <strong className="text-indigo-950 font-extrabold block uppercase tracking-wide text-[9px]">Indeks Kesehatan Gusi & Mukosa</strong>
            <div className="flex justify-between items-center font-medium border-b border-slate-100 pb-1.5">
              <span>Gusi Berdarah (BOP)</span>
              <span className="font-mono text-slate-900 font-extrabold bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200/20">
                {((stats.mukosaPct.gusiBerdarah || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center font-medium">
              <span>Lesi Mukosa Oral</span>
              <span className="font-mono text-slate-900 font-extrabold bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200/20">
                {((stats.mukosaPct.lesiMukosaOral || 0) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
