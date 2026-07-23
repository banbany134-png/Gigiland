import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  FileDown, 
  TrendingUp, 
  PlusCircle, 
  TableProperties, 
  CloudSun, 
  Sparkles,
  Award,
  Users,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Shield,
  Clock,
  Heart,
  Smile,
  AlertTriangle,
  BookmarkCheck,
  ChevronRight,
  LayoutDashboard,
  BarChart3,
  Menu,
  X,
  Printer,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  Check,
  Laptop,
  Smartphone
} from 'lucide-react';
import { collection, doc, addDoc, onSnapshot, query, deleteDoc, getDocs, writeBatch, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { RespondentData, UserRole } from './types';
import { exportToExcel, exportToPdf, generateMockRespondents } from './lib/surveyEngine';

// Subcomponents
import Dashboard from './components/Dashboard';
import DescriptiveAnalysis from './components/DescriptiveAnalysis';
import DentalForm from './components/DentalForm';
import RespondentsList from './components/RespondentsList';
import SessionManager from './components/SessionManager';
import Login from './components/Login';
import UserManagement from './components/UserManagement';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stats' | 'input' | 'data' | 'cloud' | 'users'>('dashboard');
  
  // Navigation layout states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'laptop' | 'mobile'>('laptop');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Firestore sync state
  const [respondents, setRespondents] = useState<RespondentData[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Session state
  const [currentSessionId, setCurrentSessionId] = useState<string>('session-default-2026');
  const [currentSessionName, setCurrentSessionName] = useState<string>('Stan Utama Pemeriksaan Gigi 2026');
  const [sessionPasscode, setSessionPasscode] = useState<string>('dentasync2026');
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
  } | null>(() => {
    const saved = localStorage.getItem('currentUserProfile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (parsed.email?.includes('banb') || parsed.email === 'banbuny134@gmail.com' || parsed.email === 'banbany134@gmail.com') {
            parsed.role = 'administrator';
            localStorage.setItem('currentUserProfile', JSON.stringify(parsed));
          }
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing saved profile:", e);
      }
    }
    const superAdminProfile = {
      uid: 'sole-superadmin-uid',
      email: 'banbuny134@gmail.com',
      displayName: 'Super Admin (banbuny134@gmail.com)',
      role: 'administrator' as UserRole
    };
    localStorage.setItem('currentUserProfile', JSON.stringify(superAdminProfile));
    return superAdminProfile;
  });

  const [editingRespondent, setEditingRespondent] = useState<RespondentData | null>(null);

  // Sync state with Firebase auth change & ensure Super Admin status in Firestore
  useEffect(() => {
    // Write sole super admin user doc to Firestore & purge legacy admin docs
    const syncSuperAdminDoc = async () => {
      try {
        const adminDocRef = doc(db, 'users', 'sole-superadmin-uid');
        await setDoc(adminDocRef, {
          uid: 'sole-superadmin-uid',
          email: 'banbuny134@gmail.com',
          displayName: 'Super Admin (banbuny134@gmail.com)',
          role: 'administrator',
          status: 'active',
          customPassword: 'banbunny2025',
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Clean up legacy super admin docs from firestore
        const legacyUids = ['google-sim-user-id', 'uid-super-admin-poltekkes', 'demo-administrator-uid', 'demo-super_admin-uid'];
        for (const uid of legacyUids) {
          try {
            await deleteDoc(doc(db, 'users', uid));
          } catch (e) {}
        }
      } catch (err) {
        console.warn("Could not sync super admin doc to firestore:", err);
      }
    };
    syncSuperAdminDoc();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        let role = docSnap.exists() ? (docSnap.data().role || 'pasien') : 'pasien';

        if (user.email?.includes('banb') || user.email === 'banbuny134@gmail.com' || user.email === 'banbany134@gmail.com') {
          role = 'administrator';
          await setDoc(docRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Super Admin (banbuny134@gmail.com)',
            role: 'administrator',
            status: 'active',
            customPassword: 'banbunny2025',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }

        const profile = {
          uid: user.uid,
          email: user.email || 'banbuny134@gmail.com',
          displayName: docSnap.exists() ? (docSnap.data().displayName || user.displayName || 'Super Admin') : (user.displayName || 'Super Admin'),
          role: role as UserRole
        };
        setCurrentUser(profile);
        localStorage.setItem('currentUserProfile', JSON.stringify(profile));
      } else {
        const currentLocal = localStorage.getItem('currentUserProfile');
        if (currentLocal) {
          try {
            const parsed = JSON.parse(currentLocal);
            if (parsed.email?.includes('banb') || parsed.email === 'banbuny134@gmail.com' || parsed.email === 'banbany134@gmail.com') {
              parsed.role = 'administrator';
              setCurrentUser(parsed);
              localStorage.setItem('currentUserProfile', JSON.stringify(parsed));
              return;
            }
          } catch (e) {}
        }
        // Fallback to default super admin profile if logged out
        const defaultSuperAdmin = {
          uid: 'sole-superadmin-uid',
          email: 'banbuny134@gmail.com',
          displayName: 'Super Admin (banbuny134@gmail.com)',
          role: 'administrator' as const
        };
        setCurrentUser(defaultSuperAdmin);
        localStorage.setItem('currentUserProfile', JSON.stringify(defaultSuperAdmin));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    localStorage.removeItem('currentUserProfile');
    setEditingRespondent(null);
    setActiveTab('dashboard');
  };

  // Sync to Cloud Firestore when Session ID changes
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const colRef = collection(db, 'sessions', currentSessionId, 'respondents');
    const q = query(colRef);

    // Setup real-time listener
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Auto-seed initial 30 FC Barcelona squad respondents to Firestore if empty
        const mockData = generateMockRespondents();
        setRespondents(mockData);
        try {
          const batch = writeBatch(db);
          mockData.forEach((item) => {
            const newDocRef = doc(colRef);
            const { id, ...payload } = item;
            batch.set(newDocRef, {
              ...payload,
              createdAt: new Date().toISOString()
            });
          });
          await batch.commit();
        } catch (e) {
          console.error("Auto-seed error:", e);
        }
        setLoading(false);
        return;
      }

      const list: RespondentData[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data,
        } as RespondentData);
      });
      
      setRespondents(list);
      setLoading(false);
    }, (error) => {
      console.error("Gagal mendengarkan data dari cloud:", error);
      setRespondents(generateMockRespondents());
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentSessionId, currentUser]);

  // Cloud Actions
  const handleSaveRespondent = async (data: Omit<RespondentData, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      if (editingRespondent?.id) {
        // Edit mode: update existing doc
        const docRef = doc(db, 'sessions', currentSessionId, 'respondents', editingRespondent.id);
        await setDoc(docRef, {
          ...data,
          createdAt: editingRespondent.createdAt || new Date().toISOString(),
          createdBy: editingRespondent.createdBy || currentUser?.email || 'operator@dentasync.id'
        }, { merge: true });
        
        setEditingRespondent(null);
        setActiveTab('data');
      } else {
        // Creation mode: add new doc
        const colRef = collection(db, 'sessions', currentSessionId, 'respondents');
        await addDoc(colRef, {
          ...data,
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.email || 'operator@dentasync.id'
        });
        setActiveTab('data');
      }
    } catch (err) {
      console.error("Gagal menyimpan responden:", err);
      throw err;
    }
  };

  const handleDeleteRespondent = async (id: string) => {
    try {
      const docRef = doc(db, 'sessions', currentSessionId, 'respondents', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Gagal menghapus responden:", err);
      throw err;
    }
  };

  const handleLoadMockData = async (mockData: RespondentData[]) => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const colRef = collection(db, 'sessions', currentSessionId, 'respondents');
      
      mockData.forEach((item) => {
        const newDocRef = doc(colRef); // Auto-generate ID in subcollection
        // Save without ID property as it becomes the doc name
        const { id, ...payload } = item;
        batch.set(newDocRef, {
          ...payload,
          createdAt: new Date().toISOString()
        });
      });
      
      await batch.commit();
    } catch (err) {
      console.error("Gagal mengunggah data kustom:", err);
      alert("Gagal mengunggah data ke Cloud.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSessionData = async () => {
    setLoading(true);
    try {
      const colRef = collection(db, 'sessions', currentSessionId, 'respondents');
      const qSnapshot = await getDocs(colRef);
      
      const batch = writeBatch(db);
      qSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (err) {
      console.error("Gagal membersihkan data:", err);
      alert("Gagal mengosongkan data.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = (id: string, name: string, passcode: string) => {
    setCurrentSessionId(id);
    setCurrentSessionName(name);
    setSessionPasscode(passcode);
    setActiveTab('dashboard');
  };

  // Trigger Exports
  const triggerPdfExport = () => {
    if (respondents.length === 0) {
      alert("Tidak ada data untuk diekspor ke PDF!");
      return;
    }
    exportToPdf(respondents, 'DentaSync Pro - drg. Banny');
  };

  const triggerExcelExport = () => {
    if (respondents.length === 0) {
      alert("Tidak ada data untuk diekspor ke Excel!");
      return;
    }
    exportToExcel(respondents, 'DentaSync Pro - drg. Banny');
  };

  const triggerPrintPreview = () => {
    try {
      window.focus();
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (err) {
      console.error("Gagal memicu window.print:", err);
      window.print();
    }
  };

  // Login page fallback
  if (!currentUser) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-[#0F172A]' : 'bg-[#FAFAFC]'} transition-colors duration-300`}>
        <Login onLoginSuccess={(profile) => {
          setCurrentUser(profile);
          localStorage.setItem('currentUserProfile', JSON.stringify(profile));
          if (profile.role === 'pasien') {
            setActiveTab('dashboard'); // Default patient landing or will be handled by role-based JSX
          }
        }} />
      </div>
    );
  }

  // Filter respondents for patients
  const patientRecords = respondents.filter(r => {
    if (!r) return false;
    const userDisplayName = (currentUser?.displayName || '').toLowerCase().trim();
    const respondentName = (r.nama || '').toLowerCase().trim();
    const matchesName = Boolean(userDisplayName && respondentName && (respondentName === userDisplayName || respondentName.includes(userDisplayName)));
    const matchesEmail = Boolean(r.createdBy && currentUser?.email && r.createdBy === currentUser.email);
    return matchesName || matchesEmail;
  });

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-[#0F172A]' : 'bg-[#FAFAFC]'} text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 flex flex-col overflow-x-hidden w-full`} id="app-root">
      
      {/* ========================================== */}
      {/* TOP HEADER BAR                              */}
      {/* ========================================== */}
      <header 
        className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 shadow-xs backdrop-blur-md" 
        id="app-header"
      >
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16 gap-2">
            
            {/* Left Header: Toggle Button & Brand Logo & Active Session */}
            <div className="flex items-center gap-3">
              {/* Desktop Collapse Toggle / Mobile Drawer Toggle Button */}
              <button
                onClick={() => {
                  if (viewMode === 'mobile' || (typeof window !== 'undefined' && window.innerWidth < 1024)) {
                    setMobileMenuOpen(!mobileMenuOpen);
                  } else {
                    setIsSidebarCollapsed(!isSidebarCollapsed);
                  }
                }}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
                title="Buka/Tutup Sidebar Navigasi"
                id="btn-sidebar-toggle"
              >
                <Menu className={`w-5 h-5 ${viewMode === 'mobile' ? 'block' : 'lg:hidden'}`} />
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className={`w-5 h-5 ${viewMode === 'mobile' ? 'hidden' : 'hidden lg:block'}`} />
                ) : (
                  <PanelLeftClose className={`w-5 h-5 ${viewMode === 'mobile' ? 'hidden' : 'hidden lg:block'}`} />
                )}
              </button>

              {/* Brand Logo */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/20 font-black">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none font-display">
                    DentaSync Pro
                  </h1>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wide mt-0.5 hidden sm:block">
                    Sistem BI & Rekam Medis Klinik
                  </p>
                </div>
              </div>

              {/* Active Session Badge (Desktop/Tablet) */}
              <div className="hidden md:flex items-center gap-1.5 ml-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200 truncate max-w-[180px]" title={currentSessionName}>
                  Sesi: {currentSessionName}
                </span>
              </div>
            </div>

            {/* Right Header: Quick Actions, Dark Switch, User Profile */}
            <div className="flex items-center gap-2">
              
              {/* Quick Actions (Print Preview, PDF, Excel) */}
              {currentUser.role !== 'pasien' && (
                <div className="hidden sm:flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-2">
                  <button
                    onClick={triggerPrintPreview}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/70 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-black rounded-xl transition-all cursor-pointer hover:scale-[1.02]"
                    title="Print Preview (Laporan drg. Banny)"
                    id="btn-header-print"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden md:inline">Print</span>
                  </button>

                  <button
                    onClick={triggerPdfExport}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/70 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-black rounded-xl transition-all cursor-pointer hover:scale-[1.02]"
                    title="Export PDF (drg. Banny)"
                    id="btn-header-pdf"
                  >
                    <FileDown className="w-3.5 h-3.5 text-rose-600" />
                    <span className="hidden md:inline">PDF</span>
                  </button>

                  <button
                    onClick={triggerExcelExport}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/70 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black rounded-xl transition-all cursor-pointer hover:scale-[1.02]"
                    title="Export Excel Dataset (drg. Banny)"
                    id="btn-header-excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden md:inline">Excel</span>
                  </button>
                </div>
              )}

              {/* Mode Tampilan Toggle (Laptop vs HP) */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs">
                <button
                  onClick={() => setViewMode('laptop')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    viewMode === 'laptop'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Mode Laptop (Desktop View)"
                  id="btn-mode-laptop"
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Laptop</span>
                </button>
                <button
                  onClick={() => setViewMode('mobile')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    viewMode === 'mobile'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Mode HP (Simulasi Frame HP)"
                  id="btn-mode-hp"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mode HP</span>
                </button>
              </div>

              {/* Dark Mode Switch */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer text-slate-700 dark:text-slate-200"
                title={darkMode ? "Ubah ke Mode Terang" : "Ubah ke Mode Gelap"}
                id="btn-header-darkmode"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* User Profile Chip */}
              <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 pl-2.5 pr-1.5 py-1 rounded-2xl">
                <div className="flex flex-col text-right leading-tight hidden xs:block">
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 max-w-[120px] truncate block" title={currentUser.displayName}>
                    {currentUser.displayName}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                    {currentUser.role === 'administrator' ? 'Super Admin' : currentUser.role.replace('_', ' ')}
                  </span>
                </div>

                <div className="w-7 h-7 bg-indigo-600 text-white font-black text-xs rounded-xl flex items-center justify-center uppercase shadow-2xs">
                  {currentUser.displayName.charAt(0)}
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                  title="Keluar (Log Out)"
                  id="btn-header-logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* ========================================== */}
      {/* MOBILE SLIDE-OUT DRAWER MENU OVERLAY        */}
      {/* ========================================== */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex" id="mobile-menu-drawer">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Drawer content panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-80 max-w-[85vw] bg-white dark:bg-slate-900 h-full p-5 shadow-2xl flex flex-col justify-between overflow-y-auto z-50 border-r border-slate-200 dark:border-slate-800"
            >
              <div className="space-y-6">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md font-black">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 dark:text-slate-100 font-display">
                        DentaSync Pro
                      </h2>
                      <p className="text-[10px] text-slate-500 font-bold">Menu Navigasi Mobile</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Tutup Menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Active Session Info */}
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">Sesi Aktif</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{currentSessionName}</p>
                  </div>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 block mb-2">
                    Modul Utama
                  </span>

                  {/* Dashboard / Analisis */}
                  <button
                    onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                      activeTab === 'dashboard'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4.5 h-4.5 shrink-0" />
                      <span>Analisis Real-Time</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </button>

                  {/* Statistik */}
                  <button
                    onClick={() => { setActiveTab('stats'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                      activeTab === 'stats'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                      <span>Statistik Deskriptif</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </button>

                  {/* Input Data */}
                  {(currentUser.role === 'administrator' || currentUser.role === 'super_admin' || currentUser.role === 'admin_klinik' || currentUser.role === 'petugas_lapangan' || currentUser.role === 'operator') && (
                    <button
                      onClick={() => { setEditingRespondent(null); setActiveTab('input'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                        activeTab === 'input'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <PlusCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                        <span>Input Pemeriksaan</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-40" />
                    </button>
                  )}

                  {/* Data Responden */}
                  <button
                    onClick={() => { setActiveTab('data'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                      activeTab === 'data'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TableProperties className="w-4.5 h-4.5 shrink-0" />
                      <span>Data Responden</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </button>

                  {/* Sesi Cloud */}
                  {(currentUser.role === 'administrator' || currentUser.role === 'super_admin' || currentUser.role === 'admin_klinik') && (
                    <button
                      onClick={() => { setActiveTab('cloud'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                        activeTab === 'cloud'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CloudSun className="w-4.5 h-4.5 text-sky-500 shrink-0" />
                        <span>Sesi Klinik Cloud</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-40" />
                    </button>
                  )}

                  {/* Kelola User */}
                  {(currentUser.role === 'administrator' || currentUser.role === 'super_admin') && (
                    <button
                      onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                        activeTab === 'users'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-4.5 h-4.5 shrink-0" />
                        <span>Manajemen User</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-40" />
                    </button>
                  )}
                </nav>

                {/* Quick Actions (Print, PDF, Excel) */}
                {currentUser.role !== 'pasien' && (
                  <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 block">
                      Ekspor & Cetak
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => { triggerPrintPreview(); setMobileMenuOpen(false); }}
                        className="flex flex-col items-center justify-center p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-[11px] font-black border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                      >
                        <Printer className="w-4 h-4 mb-1 text-indigo-600" />
                        <span>Print</span>
                      </button>
                      <button
                        onClick={() => { triggerPdfExport(); setMobileMenuOpen(false); }}
                        className="flex flex-col items-center justify-center p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-[11px] font-black border border-rose-200 dark:border-rose-800 cursor-pointer"
                      >
                        <FileDown className="w-4 h-4 mb-1 text-rose-600" />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => { triggerExcelExport(); setMobileMenuOpen(false); }}
                        className="flex flex-col items-center justify-center p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-[11px] font-black border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 mb-1 text-emerald-600" />
                        <span>Excel</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Info & Logout at bottom of drawer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 mt-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-xl flex items-center justify-center font-black">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{currentUser.displayName}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{currentUser.role.replace('_', ' ')}</p>
                  </div>
                </div>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-black transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar Sesi</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Container Area with Padding Top for Compact Fixed Header */}
      <div className="pt-14 sm:pt-16 min-h-screen">
        
        {/* PATIENT ROLE VIEW */}
        {currentUser.role === 'pasien' ? (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="patient-portal">
            {/* Patient Header Welcome */}
            <div className="glass-panel p-6 rounded-3xl border border-white/50 dark:border-white/10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-5 bg-gradient-to-r from-indigo-50/50 via-white/40 to-indigo-50/30 dark:from-indigo-950/10 dark:via-slate-900/40 dark:to-indigo-950/5">
              <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-950 rounded-2xl flex items-center justify-center text-indigo-700 dark:text-indigo-300 shadow-inner">
                  <Smile className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-indigo-950 dark:text-indigo-100 tracking-tight">Selamat Datang di Portal Pasien DentaSync Pro</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">Pantau kesehatan dental, diagnosa odontogram mandiri, dan akses rekam medis pribadi Anda secara instan.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/30 px-4 py-2 rounded-2xl">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 font-mono">Terkoneksi Rekam Medis</span>
              </div>
            </div>

            {/* Records check */}
            {patientRecords.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Side: Medical Exam Card details */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="glass-panel p-5 rounded-3xl border border-white/50 dark:border-white/10 shadow-md space-y-4">
                    <h3 className="text-sm font-black text-indigo-950 dark:text-indigo-200 border-b border-white/20 pb-3 uppercase tracking-wider flex items-center gap-2">
                      <BookmarkCheck className="w-5 h-5 text-indigo-600" /> Rekam Medis Saya
                    </h3>
                    
                    <div className="space-y-3 text-xs">
                      {patientRecords.map((record, index) => (
                        <div key={record.id || index} className="p-4 bg-white/40 dark:bg-slate-900/40 border border-white/60 dark:border-white/10 rounded-2xl shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-indigo-950 dark:text-indigo-300">Pemeriksaan #{index + 1}</span>
                            <span className="text-[10px] font-mono font-bold text-slate-500">{record.tanggalInput}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            <div>Stan: <strong className="text-indigo-900 dark:text-indigo-200">{record.lokasi_stan}</strong></div>
                            <div>Umur: <strong className="text-slate-800 dark:text-slate-200">{record.umur} Tahun</strong></div>
                            <div className="border-t border-white/20 pt-1 mt-1">Indeks def-t: <strong className="text-emerald-600 font-mono">{record.deft}</strong></div>
                            <div className="border-t border-white/20 pt-1 mt-1">Indeks DMF-T: <strong className="text-indigo-600 font-mono">{record.dmft}</strong></div>
                          </div>

                          <div className="border-t border-white/20 pt-2 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Status Mukosa:</span>
                            <div className="flex flex-wrap gap-1">
                              {record.mukosa.gusiBerdarah ? (
                                <span className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200/20 text-[9px] px-2 py-0.5 rounded-full font-black">GUSI BERDARAH</span>
                              ) : (
                                <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/20 text-[9px] px-2 py-0.5 rounded-full font-black">GUSI NORMAL</span>
                              )}
                              {record.mukosa.lesiMukosaOral && (
                                <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/20 text-[9px] px-2 py-0.5 rounded-full font-black">ADA LESI MUKOSA</span>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-white/20 pt-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Rencana Tindak Lanjut:</span>
                            {record.tindakLanjut.perluDirujuk ? (
                              <div className="p-2.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/20 rounded-xl text-rose-800 dark:text-rose-300 font-bold leading-relaxed text-[11px]">
                                Disarankan rujukan lanjutan ke: <strong className="uppercase">{record.tindakLanjut.dirujukKe.replace('_', ' ')}</strong>. Segera hubungi dokter gigi di fasilitas terdekat.
                              </div>
                            ) : (
                              <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/20 rounded-xl text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                                Kesehatan gigi Anda dalam kategori baik. Lanjutkan perawatan mandiri dan gosok gigi 2x sehari.
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side: Interactive Read-Only Odontogram */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="glass-panel p-5 rounded-3xl border border-white/50 dark:border-white/10 shadow-md">
                    <div className="border-b border-white/20 pb-3 mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                        <Heart className="w-5 h-5 text-rose-500" /> Peta Odontogram Pemeriksaan Anda
                      </h3>
                      <span className="text-[10px] font-bold text-slate-500 bg-white/60 dark:bg-slate-800 px-2.5 py-1 rounded-xl">Read Only</span>
                    </div>
                    <div className="pointer-events-none">
                      <DentalForm 
                        onSaveRespondent={async () => {}} 
                        nextRespondentNumber={0} 
                        editingRespondent={patientRecords[0]} 
                      />
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              /* No record case: Independent self-screening interactive form */
              <div className="space-y-6">
                <div className="glass-panel p-6 rounded-3xl border border-white/40 shadow-md space-y-4">
                  <div className="flex gap-3 text-amber-800 bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs font-semibold">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <span className="font-extrabold uppercase tracking-wider text-amber-900 block">Belum Ada Rekam Medis Resmi:</span>
                      <p className="mt-0.5 text-slate-600">
                        Anda belum melakukan pemeriksaan resmi di stan kesehatan gigi. Jangan khawatir! Anda dapat melakukan **Skrining Mandiri Interaktif** di bawah ini untuk mengisi data kondisi gigi Anda sendiri. Data ini akan langsung disinkronkan ke Cloud Klinik agar dapat dipantau oleh dokter penanggung jawab.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="glass-panel p-5 rounded-3xl border border-white/45 shadow-lg">
                  <h3 className="text-sm font-black text-indigo-950 dark:text-indigo-200 mb-4 border-b border-white/25 pb-3">Pendaftaran Skrining Mandiri Baru</h3>
                  <DentalForm 
                    onSaveRespondent={handleSaveRespondent}
                    nextRespondentNumber={respondents.length + 1}
                    editingRespondent={{
                      nama: currentUser.displayName,
                      umur: 24,
                      kelompokUmur: '18-60',
                      jenisKelamin: 'Laki-laki',
                      pendidikan: 'SMA',
                      pekerjaan: 'PEGAWAI SWASTA',
                      teethStatus: {},
                      gigiSulung: { sehat: 20, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
                      gigiTetap: { sehat: 32, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
                      deft: 0,
                      dmft: 0,
                      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
                      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' },
                      lokasi_stan: 'Skrining Mandiri Portal Pasien',
                      latitude: -6.2441,
                      longitude: 106.8432,
                      tanggalInput: new Date().toISOString().split('T')[0],
                      createdBy: currentUser.email,
                      createdAt: new Date().toISOString()
                    }}
                  />
                </div>
              </div>
            )}
          </main>
        ) : (
          /* MODERN SAAS MEDICAL LAYOUT: PERSISTENT LEFT SIDEBAR + WORKSPACE AREA */
          <div className={
            viewMode === 'mobile'
              ? "flex-1 max-w-[430px] w-full mx-auto my-4 bg-white/90 dark:bg-slate-900/90 border-[8px] border-slate-800 dark:border-slate-800 rounded-[44px] shadow-2xl relative overflow-hidden flex flex-col p-3 pb-20 transition-all duration-300"
              : "flex-1 max-w-[1700px] w-full mx-auto px-3 sm:px-6 py-4 flex flex-col lg:flex-row gap-6 items-start pb-6 min-w-0"
          }>
            
            {/* Smartphone Notch when in Mode HP */}
            {viewMode === 'mobile' && (
              <div className="w-28 h-4 bg-slate-800 rounded-b-xl flex items-center justify-center shrink-0 mx-auto mb-3">
                <div className="w-10 h-1 bg-slate-700 rounded-full"></div>
              </div>
            )}

            {/* ------------------------------------------ */}
            {/* DESKTOP LEFT SIDEBAR NAVIGATION BAR         */}
            {/* ------------------------------------------ */}
            <aside 
              id="desktop-sidebar"
              className={`${
                viewMode === 'mobile' ? 'hidden' : 'hidden lg:flex'
              } flex-col shrink-0 sticky top-20 transition-all duration-300 ease-in-out z-30 ${
                isSidebarCollapsed ? 'w-20' : 'w-64 xl:w-72'
              }`}
            >
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3.5 shadow-md space-y-5">
                
                {/* Sidebar Header & Collapse Toggle */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800">
                  {!isSidebarCollapsed && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                        <LayoutDashboard className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider font-display">
                        Navigasi Utama
                      </span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className={`p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer ${
                      isSidebarCollapsed ? 'mx-auto' : ''
                    }`}
                    title={isSidebarCollapsed ? "Perluas Sidebar" : "Kecilkan Sidebar"}
                  >
                    {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                  </button>
                </div>

                {/* Grouped Sidebar Navigation Menu */}
                <nav className="space-y-5">
                  
                  {/* GROUP 1: UTAMA / ANALYTICS */}
                  <div className="space-y-1">
                    {!isSidebarCollapsed && (
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 block mb-1">
                        Analisis
                      </span>
                    )}

                    {/* Tab 1: Analisis Real-Time */}
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className={`w-full flex items-center rounded-2xl font-black text-xs transition-all cursor-pointer group relative ${
                        isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                      } ${
                        activeTab === 'dashboard'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Analisis Real-Time"
                      id="tab-sidebar-dashboard"
                    >
                      <div className="flex items-center gap-2.5">
                        <TrendingUp className="w-4 h-4 shrink-0" />
                        {!isSidebarCollapsed && <span>Analisis Real-Time</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'dashboard' ? 'translate-x-0.5' : 'opacity-30'}`} />
                      )}
                    </button>

                    {/* Tab Statistik & Analisis Deskriptif */}
                    <button
                      onClick={() => setActiveTab('stats')}
                      className={`w-full flex items-center rounded-2xl font-black text-xs transition-all cursor-pointer group relative ${
                        isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                      } ${
                        activeTab === 'stats'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Statistik & Analisis Deskriptif"
                      id="tab-sidebar-stats"
                    >
                      <div className="flex items-center gap-2.5">
                        <BarChart3 className="w-4 h-4 shrink-0 text-amber-500" />
                        {!isSidebarCollapsed && <span>Statistik & Analisis</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'stats' ? 'translate-x-0.5' : 'opacity-30'}`} />
                      )}
                    </button>
                  </div>

                  {/* GROUP 2: DATA KLINIK / CLINICAL DATA */}
                  <div className="space-y-1 border-t border-slate-200/60 dark:border-slate-800 pt-3">
                    {!isSidebarCollapsed && (
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 block mb-1">
                        Data Klinik
                      </span>
                    )}

                    {/* Tab 2: Input Pemeriksaan */}
                    {(currentUser.role === 'administrator' || currentUser.role === 'super_admin' || currentUser.role === 'admin_klinik' || currentUser.role === 'petugas_lapangan' || currentUser.role === 'operator') && (
                      <button
                        onClick={() => { setEditingRespondent(null); setActiveTab('input'); }}
                        className={`w-full flex items-center rounded-2xl font-black text-xs transition-all cursor-pointer group relative ${
                          isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                        } ${
                          activeTab === 'input'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Input Pemeriksaan Odontogram"
                        id="tab-sidebar-input"
                      >
                        <div className="flex items-center gap-2.5">
                          <PlusCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                          {!isSidebarCollapsed && <span>Input Pemeriksaan</span>}
                        </div>
                        {!isSidebarCollapsed && (
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'input' ? 'translate-x-0.5' : 'opacity-30'}`} />
                        )}
                      </button>
                    )}

                    {/* Tab 3: Data Responden */}
                    <button
                      onClick={() => setActiveTab('data')}
                      className={`w-full flex items-center rounded-2xl font-black text-xs transition-all cursor-pointer group relative ${
                        isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                      } ${
                        activeTab === 'data'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Data Responden & Rekam Medis"
                      id="tab-sidebar-data"
                    >
                      <div className="flex items-center gap-2.5">
                        <TableProperties className="w-4 h-4 shrink-0" />
                        {!isSidebarCollapsed && <span>Data Responden</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'data' ? 'translate-x-0.5' : 'opacity-30'}`} />
                      )}
                    </button>

                    {/* Tab 4: Sesi Klinik Cloud */}
                    {(currentUser.role === 'administrator' || currentUser.role === 'super_admin' || currentUser.role === 'admin_klinik') && (
                      <button
                        onClick={() => setActiveTab('cloud')}
                        className={`w-full flex items-center rounded-2xl font-black text-xs transition-all cursor-pointer group relative ${
                          isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                        } ${
                          activeTab === 'cloud'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Sesi Klinik Cloud"
                        id="tab-sidebar-cloud"
                      >
                        <div className="flex items-center gap-2.5">
                          <CloudSun className="w-4 h-4 shrink-0 text-sky-500" />
                          {!isSidebarCollapsed && <span>Sesi Klinik Cloud</span>}
                        </div>
                        {!isSidebarCollapsed && (
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'cloud' ? 'translate-x-0.5' : 'opacity-30'}`} />
                        )}
                      </button>
                    )}
                  </div>

                  {/* GROUP 3: PENGATURAN / SETTINGS */}
                  {(currentUser.role === 'administrator' || currentUser.role === 'super_admin') && (
                    <div className="space-y-1 border-t border-slate-200/60 dark:border-slate-800 pt-3">
                      {!isSidebarCollapsed && (
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 block mb-1">
                          Pengaturan
                        </span>
                      )}

                      <button
                        onClick={() => setActiveTab('users')}
                        className={`w-full flex items-center rounded-2xl font-black text-xs transition-all cursor-pointer group relative ${
                          isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                        } ${
                          activeTab === 'users'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Manajemen User & Role"
                        id="tab-sidebar-users"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 shrink-0" />
                          {!isSidebarCollapsed && <span>Manajemen User</span>}
                        </div>
                        {!isSidebarCollapsed && (
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'users' ? 'translate-x-0.5' : 'opacity-30'}`} />
                        )}
                      </button>
                    </div>
                  )}

                  {/* GROUP 4: EKSPOR & CETAK (DESKTOP SIDEBAR QUICK ACTIONS) */}
                  {(currentUser.role as string) !== 'pasien' && (
                    <div className="space-y-1.5 border-t border-slate-200/60 dark:border-slate-800 pt-3">
                      {!isSidebarCollapsed && (
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 block mb-1">
                          Ekspor & Cetak
                        </span>
                      )}

                      {isSidebarCollapsed ? (
                        <div className="flex flex-col items-center gap-2 pt-1">
                          <button
                            onClick={triggerPrintPreview}
                            className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
                            title="Print Preview (Dialog Cetak)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={triggerPdfExport}
                            className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Export PDF Laporan"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={triggerExcelExport}
                            className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Export Excel Rekam Medis"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          <button
                            onClick={triggerPrintPreview}
                            className="flex flex-col items-center justify-center p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-[10px] font-black border border-indigo-200/60 dark:border-indigo-800 hover:bg-indigo-100 transition-all cursor-pointer"
                            title="Cetak Laporan Hasil Survey"
                          >
                            <Printer className="w-3.5 h-3.5 mb-0.5 text-indigo-600" />
                            <span>Print</span>
                          </button>
                          <button
                            onClick={triggerPdfExport}
                            className="flex flex-col items-center justify-center p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-[10px] font-black border border-rose-200/60 dark:border-rose-800 hover:bg-rose-100 transition-all cursor-pointer"
                            title="Unduh File PDF Laporan"
                          >
                            <FileDown className="w-3.5 h-3.5 mb-0.5 text-rose-600" />
                            <span>PDF</span>
                          </button>
                          <button
                            onClick={triggerExcelExport}
                            className="flex flex-col items-center justify-center p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-[10px] font-black border border-emerald-200/60 dark:border-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer"
                            title="Unduh Spreadsheet Excel"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 mb-0.5 text-emerald-600" />
                            <span>Excel</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </nav>

                {/* Active Session Info Widget in Sidebar */}
                {!isSidebarCollapsed && (
                  <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800">
                    <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Sesi Aktif</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={currentSessionName}>
                        {currentSessionName}
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </aside>

            {/* ------------------------------------------ */}
            {/* MAIN WORKSPACE CONTENT VIEW                 */}
            {/* ------------------------------------------ */}
            <main className="flex-1 min-w-0 w-full space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-lg" id="loader-view">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-slate-700 dark:text-slate-300 text-sm mt-4 font-bold">Sinkronisasi data dengan Firestore Cloud...</p>
                </div>
              ) : (
                <div className="animate-fadeIn" id="tab-content-area">
                  {/* Official Printable Header Kop Surat (Appears only on paper print) */}
                  <div className="hidden print:block mb-6 p-4 border-b-2 border-slate-900 text-slate-900 font-sans">
                    <div className="flex justify-between items-start pb-3 border-b border-slate-300">
                      <div>
                        <h1 className="text-xl font-black uppercase tracking-wider text-slate-900 font-display">
                          KLINIK GIGI & MULUT DENTASYNC PRO
                        </h1>
                        <p className="text-xs font-bold text-slate-800 mt-1">
                          Dokter Penanggung Jawab: drg. Banny (SIP/STR: 33.01.100.2.2026)
                        </p>
                        <p className="text-[11px] text-slate-600">
                          Sesi Klinik Cloud: <strong className="text-slate-900">{currentSessionName}</strong>
                        </p>
                      </div>
                      <div className="text-right text-[10px] text-slate-700 space-y-1">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-300 font-bold uppercase rounded">
                          Laporan Resmi Rekam Medis
                        </span>
                        <p className="font-mono text-[11px]">
                          {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="font-bold text-indigo-900">
                          Total Data: {respondents.length} Pasien Responden
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tab Views */}
                  {activeTab === 'dashboard' && (
                    <Dashboard respondents={respondents} />
                  )}

                  {activeTab === 'stats' && (
                    <DescriptiveAnalysis respondents={respondents} allRespondentsCount={respondents.length} />
                  )}

                  {activeTab === 'input' && (
                    <DentalForm 
                      onSaveRespondent={handleSaveRespondent} 
                      nextRespondentNumber={respondents.length + 1} 
                      editingRespondent={editingRespondent}
                      onCancelEdit={() => {
                        setEditingRespondent(null);
                        setActiveTab('data');
                      }}
                    />
                  )}

                  {activeTab === 'data' && (
                    <RespondentsList 
                      respondents={respondents} 
                      onDeleteRespondent={handleDeleteRespondent} 
                      userRole={currentUser.role}
                      onEditRespondent={(resp) => {
                        setEditingRespondent(resp);
                        setActiveTab('input');
                      }}
                    />
                  )}

                  {activeTab === 'cloud' && (currentUser.role === 'administrator' || currentUser.role === 'super_admin' || currentUser.role === 'admin_klinik') && (
                    <SessionManager
                      currentSessionId={currentSessionId}
                      currentSessionName={currentSessionName}
                      sessionPasscode={sessionPasscode}
                      onJoinSession={handleJoinSession}
                      onLoadMockData={handleLoadMockData}
                      onClearSessionData={handleClearSessionData}
                      respondentsCount={respondents.length}
                    />
                  )}

                  {activeTab === 'users' && (currentUser.role === 'administrator' || currentUser.role === 'super_admin') && (
                    <UserManagement />
                  )}
                </div>
              )}
            </main>

          </div>
        )}

      </div>

      {/* ========================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (SMARTPHONE)   */}
      {/* ========================================== */}
      {currentUser.role !== 'pasien' && (
        <nav 
          id="mobile-bottom-nav"
          className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 px-3 py-2 justify-around items-center shadow-2xl transition-all ${
            viewMode === 'mobile' ? 'flex' : 'hidden lg:hidden'
          }`}
        >
          
          {/* Icon 1: Analisis Real-Time */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative ${
              activeTab === 'dashboard' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title="Analisis Real-Time (Dasbor Utama)"
            aria-label="Analisis Real-Time"
          >
            <TrendingUp className="w-5 h-5" />
            {activeTab === 'dashboard' && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 bg-white rounded-full"></span>
            )}
          </button>

          {/* Icon 2: Statistik & Analisis Deskriptif */}
          <button
            onClick={() => setActiveTab('stats')}
            className={`p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative ${
              activeTab === 'stats' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105' 
                : 'text-amber-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title="Statistik & Analisis Deskriptif"
            aria-label="Statistik & Analisis"
          >
            <BarChart3 className="w-5 h-5" />
            {activeTab === 'stats' && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 bg-white rounded-full"></span>
            )}
          </button>

          {/* Icon 3: Input Pemeriksaan Odontogram */}
          {(currentUser.role === 'administrator' || currentUser.role === 'super_admin' || currentUser.role === 'admin_klinik' || currentUser.role === 'petugas_lapangan' || currentUser.role === 'operator') && (
            <button
              onClick={() => { setEditingRespondent(null); setActiveTab('input'); }}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative -mt-3 shadow-lg ${
                activeTab === 'input' 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/40 ring-4 ring-emerald-500/20 scale-110' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/30'
              }`}
              title="Input Pemeriksaan Odontogram Baru"
              aria-label="Input Pemeriksaan"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          )}

          {/* Icon 4: Data Responden */}
          <button
            onClick={() => setActiveTab('data')}
            className={`p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative ${
              activeTab === 'data' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title="Data Responden & Rekam Medis"
            aria-label="Data Responden"
          >
            <TableProperties className="w-5 h-5" />
            {activeTab === 'data' && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 bg-white rounded-full"></span>
            )}
          </button>

          {/* Icon 5: Menu Slide-out Drawer (☰) */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2.5 rounded-2xl flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
            title="Buka Menu Drawer Lengkap (☰)"
            aria-label="Menu Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

        </nav>
      )}

      {/* Mini App Footer */}
      <footer className="text-center py-6 text-xs text-slate-500 font-bold border-t border-slate-200/40 dark:border-slate-800/40 mt-auto" id="app-footer">
        <p>DentaSync Pro • SIP/STR drg. Banny: 33.01.100.2.2026 • Real-Time Firestore Sync</p>
      </footer>

    </div>
  );
}
