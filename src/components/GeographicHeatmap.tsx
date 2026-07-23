import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RespondentData } from '../types';
import { MapPin, Users, Activity, Heart, ShieldAlert, Navigation, Search, X, Loader2, CheckCircle2, AlertCircle, PlusCircle } from 'lucide-react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface GeographicHeatmapProps {
  respondents: RespondentData[];
}

interface StationStats {
  name: string;
  lat: number;
  lng: number;
  totalRespondents: number;
  avgDMFT: number;
  avgDeft: number;
  activeCariesRate: number;
  perluDirujukPct: number;
  maleCount: number;
  femaleCount: number;
}

interface CustomStation {
  id: string;
  nama_stan: string;
  latitude: number;
  longitude: number;
}

const STATIONS_PRESET = [
  { name: 'Stan Puskesmas Tebet', lat: -6.2441, lng: 106.8432 },
  { name: 'Stan Kelurahan Menteng', lat: -6.1953, lng: 106.8231 },
  { name: 'Stan Posyandu Kebayoran', lat: -6.2415, lng: 106.7984 },
  { name: 'Stan TK Al-Azhar Kelapa Gading', lat: -6.1584, lng: 106.8973 },
  { name: 'Stan Balai RW Kalideres', lat: -6.1425, lng: 106.7021 }
];

export default function GeographicHeatmap({ respondents }: GeographicHeatmapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Record<string, L.CircleMarker>>({});
  
  const [selectedStationName, setSelectedStationName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customStations, setCustomStations] = useState<CustomStation[]>([]);

  // Modal Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [namaStan, setNamaStan] = useState('');
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // 0. Listen to custom stations in real-time from Firestore
  useEffect(() => {
    const docRef = doc(db, 'sessions', 'lokasi_stan');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const list = (data.stations || []).map((item: any, index: number) => ({
          id: item.id || `station-${index}`,
          nama_stan: item.nama_stan || '',
          latitude: Number(item.latitude) || 0,
          longitude: Number(item.longitude) || 0
        }));
        setCustomStations(list);
      } else {
        setCustomStations([]);
      }
    }, (error) => {
      console.error("Gagal mendengarkan lokasi_stan dari Firestore:", error);
    });

    return () => unsubscribe();
  }, []);

  // 1. Group and calculate stats per station
  const stationStatsList = useMemo<StationStats[]>(() => {
    const groups: Record<string, RespondentData[]> = {};
    
    // Initialize groups with preset stations
    STATIONS_PRESET.forEach(station => {
      groups[station.name] = [];
    });

    // Initialize groups with custom stations from Firestore
    customStations.forEach(station => {
      groups[station.nama_stan] = [];
    });
    
    // Populate with respondent data
    respondents.forEach(r => {
      const name = r.lokasi_stan || 'Stan Puskesmas Tebet';
      if (!groups[name]) groups[name] = [];
      groups[name].push(r);
    });

    return Object.entries(groups).map(([name, list]) => {
      const total = list.length;
      const totalDMFT = list.reduce((sum, r) => sum + (r.dmft || 0), 0);
      const totalDeft = list.reduce((sum, r) => sum + (r.deft || 0), 0);
      
      const maleCount = list.filter(r => r.jenisKelamin === 'Laki-laki').length;
      const femaleCount = list.filter(r => r.jenisKelamin === 'Perempuan').length;
      const activeCariesCount = list.filter(r => (r.gigiSulung.karies > 0) || (r.gigiTetap.karies > 0)).length;
      const perluDirujukCount = list.filter(r => r.tindakLanjut.perluDirujuk).length;

      // Coordinate matching from custom stations, preset stations, or first respondent
      const customMatch = customStations.find(s => s.nama_stan === name);
      const presetMatch = STATIONS_PRESET.find(s => s.name === name);

      const lat = customMatch ? customMatch.latitude : (presetMatch ? presetMatch.lat : (list[0]?.latitude || -6.2441));
      const lng = customMatch ? customMatch.longitude : (presetMatch ? presetMatch.lng : (list[0]?.longitude || 106.8432));

      return {
        name,
        lat,
        lng,
        totalRespondents: total,
        avgDMFT: total > 0 ? (totalDMFT / total) : 0,
        avgDeft: total > 0 ? (totalDeft / total) : 0,
        activeCariesRate: total > 0 ? ((activeCariesCount / total) * 100) : 0,
        perluDirujukPct: total > 0 ? ((perluDirujukCount / total) * 100) : 0,
        maleCount,
        femaleCount
      };
    }).sort((a, b) => {
      // Sort: Active stats first, then 0 respondents at the bottom alphabetically
      if (a.totalRespondents > 0 && b.totalRespondents === 0) return -1;
      if (a.totalRespondents === 0 && b.totalRespondents > 0) return 1;
      return b.avgDMFT - a.avgDMFT;
    });
  }, [respondents, customStations]);

  const filteredStations = useMemo(() => {
    return stationStatsList.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stationStatsList, searchQuery]);

  const selectedStation = useMemo(() => {
    if (!selectedStationName) return null;
    return stationStatsList.find(s => s.name === selectedStationName) || null;
  }, [stationStatsList, selectedStationName]);

  const getColorForSeverity = (dmft: number) => {
    if (dmft === 0) return '#10b981'; // Green (Bebas Karies)
    if (dmft <= 1.5) return '#eab308'; // Yellow (Rendah)
    if (dmft <= 3.0) return '#f97316'; // Orange (Sedang)
    return '#ef4444'; // Red (Sangat Tinggi)
  };

  const getSeverityLabel = (dmft: number) => {
    if (dmft === 0) return { label: 'Bebas Karies', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    if (dmft <= 1.5) return { label: 'Tingkat Rendah', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    if (dmft <= 3.0) return { label: 'Tingkat Sedang', class: 'bg-orange-100 text-orange-800 border-orange-200' };
    return { label: 'Tingkat Sangat Tinggi (Hotspot)', class: 'bg-rose-100 text-rose-800 border-rose-200' };
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center of Jakarta as starting point
    const map = L.map(mapContainerRef.current, {
      center: [-6.1953, 106.8231],
      zoom: 11,
      zoomControl: false // custom placement below
    });

    // Custom positioned zoom control
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Dynamic light/dark tiles from CartoDB
    const isDarkInitial = document.documentElement.classList.contains('dark');
    const initialTileUrl = isDarkInitial 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const tiles = L.tileLayer(initialTileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    tileLayerRef.current = tiles;
    mapRef.current = map;

    // Handle container resize (e.g. fullscreen toggle, sidebar collapse)
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Listen to dark mode changes reactively and swap tile layers
  useEffect(() => {
    const map = mapRef.current;
    const tiles = tileLayerRef.current;
    if (!map || !tiles) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          const newUrl = isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
          tiles.setUrl(newUrl);
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, [mapRef.current, tileLayerRef.current]);

  // Update Markers when stationStatsList changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    stationStatsList.forEach(station => {
      const color = station.totalRespondents === 0 ? '#a78bfa' : getColorForSeverity(station.avgDMFT);
      const radius = station.totalRespondents === 0 
        ? 10 
        : Math.max(12, Math.min(32, 10 + station.totalRespondents * 0.4));

      const marker = L.circleMarker([station.lat, station.lng], {
        radius,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 0.95,
        fillOpacity: 0.75
      }).addTo(map);

      const popupContent = station.totalRespondents === 0 ? `
        <div style="font-family: 'Inter', sans-serif; min-width: 240px; padding: 6px;">
          <div style="font-weight: 900; font-size: 13px; color: #1e1b4b; margin-bottom: 2px;">${station.name}</div>
          <div style="font-size: 10px; color: #64748b; margin-bottom: 8px;">Koordinat: ${station.lat.toFixed(5)}, ${station.lng.toFixed(5)}</div>
          
          <div style="background-color: #f5f3ff; border-radius: 8px; padding: 10px; border: 1px dashed #c084fc; margin-bottom: 8px; text-align: center;">
            <div style="font-size: 11px; font-weight: 800; color: #6b21a8; margin-bottom: 2px;">Stan Baru Ditambahkan</div>
            <div style="font-size: 10px; color: #701a75;">Belum ada responden terdaftar di stan ini.</div>
          </div>
          <div style="font-size: 10px; font-weight: bold; color: #4f46e5; text-align: center;">
            Gunakan nama stan ini saat mengisi Form Input Pemeriksaan.
          </div>
        </div>
      ` : `
        <div style="font-family: 'Inter', sans-serif; min-width: 240px; padding: 6px;">
          <div style="font-weight: 900; font-size: 13px; color: #1e1b4b; margin-bottom: 2px;">${station.name}</div>
          <div style="font-size: 10px; color: #64748b; margin-bottom: 8px;">Koordinat: ${station.lat.toFixed(5)}, ${station.lng.toFixed(5)}</div>
          
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 8px; border: 1px solid #e2e8f0; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #64748b;">Sampel Responden:</span>
              <strong style="color: #0f172a;">${station.totalRespondents} orang</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #64748b;">Rerata DMF-T:</span>
              <strong style="color: #ef4444;">${station.avgDMFT.toFixed(2)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span style="color: #64748b;">Prevalensi Karies:</span>
              <strong style="color: #f97316;">${station.activeCariesRate.toFixed(1)}%</strong>
            </div>
          </div>
          <div style="font-size: 10px; font-weight: bold; color: #4f46e5; text-align: center; cursor: pointer;">
            Klik stasiun di panel samping untuk rincian
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        setSelectedStationName(station.name);
      });

      markersRef.current[station.name] = marker;
    });

    // Auto-fit bounds (include both active & 0-respondent stations to map properly)
    if (stationStatsList.length > 0) {
      const latLngs = stationStatsList.map(s => L.latLng(s.lat, s.lng));
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stationStatsList]);

  // Navigate & open popup programmatically when selectedStationName changes
  const handleSelectStation = (station: StationStats) => {
    setSelectedStationName(station.name);
    const map = mapRef.current;
    if (map) {
      map.setView([station.lat, station.lng], 14, { animate: true });
      const marker = markersRef.current[station.name];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  // Add New Station Form Handler
  const handleSubmitNewStation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('submitting');
    setErrorMessage('');

    // Input Validation
    const trimmedName = namaStan.trim();
    const parsedLat = parseFloat(latInput);
    const parsedLng = parseFloat(lngInput);

    if (!trimmedName) {
      setFormStatus('error');
      setErrorMessage('Nama stan tidak boleh kosong.');
      return;
    }

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setFormStatus('error');
      setErrorMessage('Latitude harus berupa angka antara -90 dan 90.');
      return;
    }

    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      setFormStatus('error');
      setErrorMessage('Longitude harus berupa angka antara -180 dan 180.');
      return;
    }

    try {
      const docRef = doc(db, 'sessions', 'lokasi_stan');
      const docSnap = await getDoc(docRef);
      let currentStations = [];
      if (docSnap.exists()) {
        currentStations = docSnap.data().stations || [];
      }

      const newStation = {
        id: Math.random().toString(36).substring(2, 9),
        nama_stan: trimmedName,
        latitude: parsedLat,
        longitude: parsedLng,
        createdAt: new Date().toISOString()
      };

      await setDoc(docRef, {
        stations: [...currentStations, newStation]
      });

      setFormStatus('success');
      setTimeout(() => {
        setIsModalOpen(false);
        // Reset fields
        setNamaStan('');
        setLatInput('');
        setLngInput('');
        setFormStatus('idle');
      }, 1500);

    } catch (error: any) {
      console.error("Error saving new station:", error);
      setFormStatus('error');
      setErrorMessage(error?.message || 'Gagal menyimpan data ke Firestore.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="geographic-heatmap-container">
      {/* 1. MAP VISUALIZATION CONTAINER */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass-panel border border-white/45 p-4 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2">
              <Navigation className="w-4 h-4 text-indigo-600 animate-pulse" /> Peta Panas Geografis Tingkat Karies
            </h4>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">
              Diameter lingkaran mewakili jumlah sampel responden; Warna melambangkan tingkat karies (DMF-T).
            </p>
          </div>
          
          {/* Map Legend */}
          <div className="flex flex-wrap items-center gap-3 bg-white/60 px-3.5 py-1.5 border border-white/80 rounded-2xl text-[9px] font-extrabold text-slate-600 shadow-2xs">
            <span className="text-slate-400 uppercase tracking-wider mr-1 text-[8px]">Index DMF-T:</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" /> Bebas (0)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 border border-white" /> Rendah (≤1.5)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-white" /> Sedang (≤3.0)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white" /> Tinggi (&gt;3.0)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 border border-white animate-pulse" /> Stan Baru (0)
            </span>
          </div>
        </div>

        {/* The Map */}
        <div className="relative glass-panel border border-white/45 rounded-3xl overflow-hidden shadow-lg h-[480px]">
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        </div>
      </div>

      {/* 2. SIDEBAR DETAILS & LIST */}
      <div className="lg:col-span-1 space-y-5">
        {/* Search and List */}
        <div className="glass-panel border border-white/45 p-4.5 rounded-3xl shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
            <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4.5 h-4.5 text-indigo-600" /> Daftar Stan Survei
            </h4>
            <span className="bg-indigo-100/50 border border-indigo-200/20 text-indigo-800 text-[10px] font-black font-mono px-2 py-0.5 rounded-lg">
              {filteredStations.length} Titik
            </span>
          </div>

          {/* Add New Station Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            id="btn-add-new-station"
            className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-600 hover:from-violet-600 hover:via-purple-600 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.01]"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            <span>➕ Tambah Stan Baru</span>
          </button>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari stan pemeriksaan..."
              className="w-full pl-8.5 pr-4 py-2 bg-white/50 border border-white/60 focus:bg-white/80 focus:border-indigo-500/50 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Scrollable list */}
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredStations.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic">
                Stan tidak ditemukan.
              </div>
            ) : (
              filteredStations.map(station => {
                const isSelected = selectedStationName === station.name;
                const dotColor = station.totalRespondents === 0 ? '#a78bfa' : getColorForSeverity(station.avgDMFT);
                return (
                  <button
                    key={station.name}
                    onClick={() => handleSelectStation(station)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600/10 border-indigo-500/40 shadow-xs' 
                        : 'bg-white/40 border-white/55 hover:bg-white/60 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="text-xs font-extrabold text-slate-800 truncate flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-white shadow-2xs" style={{ backgroundColor: dotColor }} />
                        <span className="truncate">{station.name}</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                        {station.totalRespondents === 0 ? (
                          <span className="text-violet-600 font-extrabold uppercase text-[9px] tracking-wider bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">Stan Baru / Kosong</span>
                        ) : (
                          <>
                            <span>{station.totalRespondents} Responden</span>
                            <span>•</span>
                            <span>DMF-T: {station.avgDMFT.toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Active Station Report Card */}
        <div className="glass-panel border border-white/45 p-5 rounded-3xl shadow-md min-h-[220px] relative overflow-hidden">
          {selectedStation ? (
            selectedStation.totalRespondents === 0 ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Header for Empty Station */}
                <div className="border-b border-white/20 pb-3">
                  <span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border mb-1.5 bg-violet-100 text-violet-800 border-violet-200">
                    Belum Ada Responden
                  </span>
                  <h4 className="text-sm font-black text-indigo-950 leading-snug">{selectedStation.name}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                    Lat: {selectedStation.lat.toFixed(5)}, Lng: {selectedStation.lng.toFixed(5)}
                  </p>
                </div>

                {/* Empty details panel */}
                <div className="bg-violet-50/50 border border-violet-100 p-4.5 rounded-2xl text-center space-y-2">
                  <MapPin className="w-7 h-7 text-violet-500 mx-auto animate-bounce" />
                  <h5 className="text-xs font-black text-violet-950">Stan Kosong Terdaftar</h5>
                  <p className="text-[11px] text-violet-800/80 leading-relaxed font-semibold">
                    Belum ada data rekam medis responden yang terdaftar pada titik ini. Silakan input responden baru di tab <strong>Input Pemeriksaan</strong> dan pilih lokasi stan ini agar terpetakan otomatis.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fadeIn">
                {/* Header */}
                <div className="border-b border-white/20 pb-3">
                  <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border mb-1.5 ${getSeverityLabel(selectedStation.avgDMFT).class}`}>
                    {getSeverityLabel(selectedStation.avgDMFT).label}
                  </span>
                  <h4 className="text-sm font-black text-indigo-950 leading-snug">{selectedStation.name}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                    Lat: {selectedStation.lat.toFixed(5)}, Lng: {selectedStation.lng.toFixed(5)}
                  </p>
                </div>

                {/* Grid of stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/40 border border-white/45 p-3 rounded-2xl text-left">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Rerata DMF-T</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black text-slate-900 font-mono">{selectedStation.avgDMFT.toFixed(2)}</span>
                      <span className="text-[10px] text-rose-600 font-bold">gigi</span>
                    </div>
                  </div>

                  <div className="bg-white/40 border border-white/45 p-3 rounded-2xl text-left">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Rerata def-t</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black text-slate-900 font-mono">{selectedStation.avgDeft.toFixed(2)}</span>
                      <span className="text-[10px] text-emerald-600 font-bold">gigi</span>
                    </div>
                  </div>

                  <div className="bg-white/40 border border-white/45 p-3 rounded-2xl text-left">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Prevalensi Karies</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black text-slate-900 font-mono">{selectedStation.activeCariesRate.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="bg-white/40 border border-white/45 p-3 rounded-2xl text-left">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Perlu Rujukan</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black text-slate-900 font-mono">{selectedStation.perluDirujukPct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Sample demographics */}
                <div className="pt-2 flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-indigo-500" /> Sampel Gender:</span>
                  <span className="font-mono text-slate-700">
                    {selectedStation.maleCount} L / {selectedStation.femaleCount} P
                  </span>
                </div>
              </div>
            )
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <MapPin className="w-10 h-10 text-slate-300 mb-3 animate-bounce" />
              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                Pilih atau klik salah satu stasiun survei di peta untuk melihat lembar analisis rincian epidemiologi karies gigi.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AESTHETIC PASTEL PURPLE/BLUE MODAL FORM */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => formStatus !== 'submitting' && setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              id="modal-backdrop"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-violet-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 space-y-4"
              id="modal-add-station"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-violet-100/50 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Tambah Stan Baru</h3>
                    <p className="text-[9px] text-slate-500 font-bold">Daftarkan koordinat stan kesehatan baru</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={formStatus === 'submitting'}
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmitNewStation} className="space-y-4">
                {/* 1. Nama Stan */}
                <div className="space-y-1">
                  <label htmlFor="nama_stan" className="block text-[10px] font-black uppercase text-violet-900/70 dark:text-slate-400 tracking-wider">
                    Nama Stan Pemeriksaan
                  </label>
                  <input
                    type="text"
                    id="nama_stan"
                    name="nama_stan"
                    value={namaStan}
                    onChange={(e) => setNamaStan(e.target.value)}
                    placeholder="Contoh: Stan Puskesmas Pasar Minggu"
                    disabled={formStatus === 'submitting'}
                    className="w-full px-4 py-2.5 bg-violet-50/30 border border-violet-100 focus:bg-white dark:bg-slate-800/40 dark:border-slate-700/60 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:border-violet-500/50 focus:outline-none transition-all"
                    required
                  />
                </div>

                {/* Coordinates Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* 2. Latitude */}
                  <div className="space-y-1">
                    <label htmlFor="latitude" className="block text-[10px] font-black uppercase text-violet-900/70 dark:text-slate-400 tracking-wider">
                      Latitude (Lintang)
                    </label>
                    <input
                      type="number"
                      step="any"
                      id="latitude"
                      name="latitude"
                      value={latInput}
                      onChange={(e) => setLatInput(e.target.value)}
                      placeholder="Contoh: -6.2146"
                      disabled={formStatus === 'submitting'}
                      className="w-full px-4 py-2.5 bg-violet-50/30 border border-violet-100 focus:bg-white dark:bg-slate-800/40 dark:border-slate-700/60 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:border-violet-500/50 focus:outline-none transition-all"
                      required
                    />
                  </div>

                  {/* 3. Longitude */}
                  <div className="space-y-1">
                    <label htmlFor="longitude" className="block text-[10px] font-black uppercase text-violet-900/70 dark:text-slate-400 tracking-wider">
                      Longitude (Bujur)
                    </label>
                    <input
                      type="number"
                      step="any"
                      id="longitude"
                      name="longitude"
                      value={lngInput}
                      onChange={(e) => setLngInput(e.target.value)}
                      placeholder="Contoh: 106.8451"
                      disabled={formStatus === 'submitting'}
                      className="w-full px-4 py-2.5 bg-violet-50/30 border border-violet-100 focus:bg-white dark:bg-slate-800/40 dark:border-slate-700/60 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:border-violet-500/50 focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Quick Jakarta Center Coordinate Autofill Helper */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={formStatus === 'submitting'}
                    onClick={() => {
                      // Randomize coordinate slightly around central Jakarta to make it easy for users to test
                      const randomLat = (-6.1953 + (Math.random() - 0.5) * 0.15).toFixed(5);
                      const randomLng = (106.8231 + (Math.random() - 0.5) * 0.15).toFixed(5);
                      setLatInput(randomLat);
                      setLngInput(randomLng);
                    }}
                    className="text-[9px] font-extrabold text-violet-600 hover:text-violet-700 uppercase tracking-widest cursor-pointer"
                  >
                    📍 Isi Acak Area Jakarta
                  </button>
                </div>

                {/* Form Message States */}
                <AnimatePresence mode="wait">
                  {formStatus === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl flex items-start gap-2 text-xs"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                      <span className="font-semibold">{errorMessage}</span>
                    </motion.div>
                  )}

                  {formStatus === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs"
                    >
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                      <span className="font-extrabold">Sukses! Stan baru berhasil disimpan.</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={formStatus === 'submitting'}
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formStatus === 'submitting' || formStatus === 'success'}
                    className="flex-1 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    {formStatus === 'submitting' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan Stan</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
