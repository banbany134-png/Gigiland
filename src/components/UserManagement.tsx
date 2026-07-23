import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Shield, UserCheck, UserX, KeyRound, AlertTriangle, Search, Info, Trash2, Sparkles, UserPlus, X, Check, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '../types';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'active' | 'disabled';
  createdAt?: string;
  clinic?: string;
  customPassword?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal for adding a new user
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('petugas_lapangan');
  const [newPassword, setNewPassword] = useState('');
  const [newClinic, setNewClinic] = useState('Puskesmas/Stan Utama');
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, 'users');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          uid: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || 'Pengguna Tanpa Nama',
          role: data.role || 'petugas_lapangan',
          status: data.status || 'active',
          createdAt: data.createdAt || '',
          clinic: data.clinic || '',
          customPassword: data.customPassword || ''
        });
      });
      setUsers(list);
      setLoading(false);
    }, (error) => {
      console.error("Gagal memuat pengguna:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newDisplayName.trim()) return;

    setAddingUser(true);
    try {
      const uid = 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const userRef = doc(db, 'users', uid);
      
      const newProfile: UserProfile = {
        uid,
        email: newEmail.trim().toLowerCase(),
        displayName: newDisplayName.trim(),
        role: newRole,
        status: 'active',
        clinic: newClinic.trim(),
        customPassword: newPassword || '123456',
        createdAt: new Date().toISOString()
      };

      await setDoc(userRef, newProfile);
      showToast(`✨ Pengguna baru "${newDisplayName}" (${newRole}) berhasil ditambahkan!`);
      
      // Reset form
      setNewEmail('');
      setNewDisplayName('');
      setNewPassword('');
      setNewRole('petugas_lapangan');
      setShowAddModal(false);
    } catch (err) {
      console.error("Gagal menambahkan pengguna:", err);
      showToast("Gagal mendaftarkan pengguna baru.", "error");
    } finally {
      setAddingUser(false);
    }
  };

  const handleRoleChange = async (uid: string, updatedRole: UserRole) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role: updatedRole });
      showToast("Peran pengguna berhasil diperbarui!");
    } catch (err) {
      console.error("Gagal memperbarui peran:", err);
      showToast("Gagal memperbarui peran pengguna.", "error");
    }
  };

  const handleStatusToggle = async (uid: string, currentStatus: UserProfile['status']) => {
    const newStatus: UserProfile['status'] = currentStatus === 'active' ? 'disabled' : 'active';
    const message = newStatus === 'active' ? "Akun berhasil diaktifkan!" : "Akun berhasil dinonaktifkan!";
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { status: newStatus });
      showToast(message);
    } catch (err) {
      console.error("Gagal mengubah status:", err);
      showToast("Gagal memperbarui status akun.", "error");
    }
  };

  const handleResetPassword = async (user: UserProfile) => {
    const newPass = Math.random().toString(36).substring(2, 8).toUpperCase();
    const confirmReset = window.confirm(`Apakah Anda yakin ingin menyetel ulang kata sandi pengguna "${user.displayName}"?\n\nKata sandi baru sementara: ${newPass}`);
    if (confirmReset) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          customPassword: newPass 
        });
        showToast(`Kata sandi "${user.displayName}" di-reset ke: ${newPass}`);
      } catch (err) {
        console.error("Gagal reset password:", err);
        showToast("Gagal menyetel ulang kata sandi.", "error");
      }
    }
  };

  const handleDeleteUser = async (uid: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data pengguna "${name}" dari sistem?`)) {
      try {
        const userRef = doc(db, 'users', uid);
        await deleteDoc(userRef);
        showToast(`Pengguna "${name}" berhasil dihapus.`);
      } catch (err) {
        console.error("Gagal menghapus pengguna:", err);
        showToast("Gagal menghapus pengguna.", "error");
      }
    }
  };

  const handleCleanAndResetUsers = async () => {
    const confirmReset = window.confirm(
      "Apakah Anda yakin ingin membersihkan seluruh data sampah & merestart user default yang rapi?\n\nTindakan ini akan menghapus semua pengguna yang duplikat dan menyisakan daftar default resmi per masing-masing peran (Administrator, Peneliti, Petugas Lapangan)."
    );
    if (!confirmReset) return;

    setLoading(true);
    try {
      // 1. Ambil semua dokumen user di Firestore
      const querySnapshot = await getDocs(collection(db, 'users'));
      const batch = writeBatch(db);
      
      querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();

      // 2. Tulis data pengguna default resmi dengan banbuny134@gmail.com sebagai SATU-SATUNYA Super Admin
      const defaultUsers = [
        {
          uid: 'sole-superadmin-uid',
          email: 'banbuny134@gmail.com',
          displayName: 'Super Admin (banbuny134@gmail.com)',
          role: 'administrator' as const,
          status: 'active' as const,
          clinic: 'Pusat Administrator DentaSync',
          customPassword: 'banbunny2025',
          createdAt: new Date().toISOString()
        },
        {
          uid: 'sole-superadmin-alt-uid',
          email: 'banbany134@gmail.com',
          displayName: 'Super Admin (banbany134@gmail.com)',
          role: 'administrator' as const,
          status: 'active' as const,
          clinic: 'Pusat Administrator DentaSync',
          customPassword: 'banbunny2025',
          createdAt: new Date().toISOString()
        },
        {
          uid: 'demo-peneliti-uid',
          email: 'peneliti@dentasync.id',
          displayName: 'Drg. Maya Indah (Peneliti)',
          role: 'peneliti' as const,
          status: 'active' as const,
          clinic: 'Pusat Riset Epidemiologi Gigi',
          createdAt: new Date().toISOString()
        },
        {
          uid: 'demo-petugas_lapangan-uid',
          email: 'petugas@dentasync.id',
          displayName: 'Budi Santoso (Petugas Lapangan)',
          role: 'petugas_lapangan' as const,
          status: 'active' as const,
          clinic: 'Stan Pemeriksaan Lapangan 1',
          createdAt: new Date().toISOString()
        },
        {
          uid: 'demo-pasien-uid',
          email: 'pasien@dentasync.id',
          displayName: 'Rina Kusumah (Pasien)',
          role: 'pasien' as const,
          status: 'active' as const,
          clinic: 'Stan 1 Bandung',
          createdAt: new Date().toISOString()
        }
      ];

      const newBatch = writeBatch(db);
      for (const u of defaultUsers) {
        const userRef = doc(db, 'users', u.uid);
        newBatch.set(userRef, u);
      }
      await newBatch.commit();
      
      showToast("✨ Berhasil membersihkan data sampah dan mengatur ulang pengguna default resmi!");
    } catch (err) {
      console.error("Gagal membersihkan & mereset daftar pengguna:", err);
      showToast("Gagal mereset daftar pengguna.", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!u) return false;
    const matchesSearch = (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate role statistics
  const countAdmin = users.filter(u => u.role === 'administrator' || u.role === 'super_admin' || u.role === 'admin_klinik').length;
  const countPeneliti = users.filter(u => u.role === 'peneliti').length;
  const countPetugas = users.filter(u => u.role === 'petugas_lapangan' || u.role === 'operator').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2" id="user-management-root">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-2 animate-fadeIn ${
          toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-600 text-white border-rose-500'
        }`} id="user-mgmt-toast">
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="glass-panel p-5 rounded-2xl shadow-md border border-white/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-600/90 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Manajemen Pengguna & Peran (RBAC)</h2>
            <p className="text-xs text-slate-500 font-bold">Pendaftaran pengguna baru, kelola peran (Administrator, Peneliti, Petugas Lapangan), serta kontrol status akun.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer transition-all hover:scale-[1.03] shadow-md"
            id="btn-add-new-user"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Pengguna Baru</span>
          </button>

          <button
            type="button"
            onClick={handleCleanAndResetUsers}
            className="flex items-center gap-1.5 px-3 py-2 bg-pink-50 hover:bg-pink-100 border border-pink-200/50 text-pink-700 text-xs font-black rounded-xl cursor-pointer transition-all hover:scale-[1.03] shadow-xs"
            title="Bersihkan data sampah & rapikan daftar user default"
            id="btn-clean-reset-users"
          >
            <Sparkles className="w-4 h-4 text-pink-500 animate-bounce" />
            <span>Reset User Default</span>
          </button>
        </div>
      </div>

      {/* RBAC Role Statistics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3" id="user-role-stats">
        <div className="glass-panel p-4 rounded-2xl border border-white/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Terdaftar</span>
            <span className="text-2xl font-black text-slate-900 font-mono">{users.length}</span>
          </div>
          <Users className="w-7 h-7 text-indigo-500/80" />
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-indigo-200/50 bg-indigo-50/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest block">Administrator</span>
            <span className="text-2xl font-black text-indigo-950 font-mono">{countAdmin}</span>
          </div>
          <Shield className="w-7 h-7 text-indigo-600" />
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-teal-200/50 bg-teal-50/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-teal-700 uppercase tracking-widest block">Peneliti</span>
            <span className="text-2xl font-black text-teal-950 font-mono">{countPeneliti}</span>
          </div>
          <Users className="w-7 h-7 text-teal-600" />
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-amber-200/50 bg-amber-50/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest block">Petugas Lapangan</span>
            <span className="text-2xl font-black text-amber-950 font-mono">{countPetugas}</span>
          </div>
          <UserCheck className="w-7 h-7 text-amber-600" />
        </div>
      </div>

      {/* Filters and Search */}
      <div className="glass-panel p-4.5 rounded-2xl shadow-md grid grid-cols-1 md:grid-cols-3 gap-3 border border-white/40">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-indigo-600/70" />
          <input
            type="text"
            placeholder="Cari nama atau email pengguna..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/40 border border-white/50 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white/80 transition-all font-semibold"
          />
        </div>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white/40 border border-white/50 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white/80 transition-all font-bold cursor-pointer"
        >
          <option value="all">Semua Peran (RBAC)</option>
          <option value="administrator">Administrator (Akses Penuh)</option>
          <option value="peneliti">Peneliti (Analisis & Pelaporan)</option>
          <option value="petugas_lapangan">Petugas Lapangan (Input Data)</option>
          <option value="pasien">Pasien / Skrining Mandiri</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white/40 border border-white/50 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white/80 transition-all font-bold cursor-pointer"
        >
          <option value="all">Semua Status Akun</option>
          <option value="active">Aktif</option>
          <option value="disabled">Dinonaktifkan</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-3xl shadow-lg border border-white/30 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-xs text-slate-600 font-bold mt-4">Memuat daftar pengguna...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/30 text-slate-600 border-b border-white/30 font-bold uppercase tracking-wider">
                  <th className="py-4 px-4">Nama Pengguna</th>
                  <th className="py-4 px-4">Email Terdaftar</th>
                  <th className="py-4 px-4">Peran Hak Akses (Role)</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-center">Aksi Manajemen Administrator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20 text-slate-700 font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 font-bold bg-white/25">
                      Tidak ada pengguna yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-white/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-indigo-950 text-sm">{user.displayName}</span>
                          {user.clinic && <span className="text-[10px] text-indigo-700 font-bold">Klinik/Instansi: {user.clinic}</span>}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-slate-600">{user.email}</td>
                      <td className="py-4 px-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                          className="px-2.5 py-1.5 bg-white/60 border border-white/80 rounded-xl text-xs font-black text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                        >
                          <option value="administrator">1. Administrator (Akses Penuh)</option>
                          <option value="super_admin">1b. Super Admin</option>
                          <option value="peneliti">2. Peneliti (Analisis & Laporan)</option>
                          <option value="petugas_lapangan">3. Petugas Lapangan (Input Data)</option>
                          <option value="operator">3b. Operator Surveyor</option>
                          <option value="pasien">4. Pasien / Skrining Mandiri</option>
                        </select>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          user.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/20' 
                            : 'bg-rose-100 text-rose-800 border border-rose-200/20'
                        }`}>
                          {user.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Toggle Status Button */}
                          <button
                            onClick={() => handleStatusToggle(user.uid, user.status)}
                            className={`p-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all hover:scale-105 cursor-pointer ${
                              user.status === 'active'
                                ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                            }`}
                            title={user.status === 'active' ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                          >
                            {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            <span>{user.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</span>
                          </button>

                          {/* Reset Password Button */}
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 text-indigo-600 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all hover:scale-105 cursor-pointer"
                            title="Setel Ulang Password"
                          >
                            <KeyRound className="w-4 h-4" />
                            <span>Reset Pass</span>
                          </button>
                          
                          {/* Delete User profile */}
                          <button
                            onClick={() => handleDeleteUser(user.uid, user.displayName)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-600 border border-rose-200 text-rose-600 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all hover:scale-105 cursor-pointer"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500 hover:text-white" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Pendaftaran Pengguna Baru oleh Administrator */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" id="modal-add-user">
          <div className="glass-panel-heavy bg-white p-6 sm:p-8 rounded-3xl border border-white/60 shadow-2xl max-w-md w-full relative space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Pendaftaran Pengguna Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Lengkap Pengguna</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Drg. Maya Indah"
                  value={newDisplayName}
                  onChange={e => setNewDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Resmi</label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: maya.indah@dentasync.id"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Peran Hak Akses (RBAC)</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                >
                  <option value="administrator">1. Administrator (Akses Penuh)</option>
                  <option value="peneliti">2. Peneliti (Analisis & Pelaporan Data)</option>
                  <option value="petugas_lapangan">3. Petugas Lapangan (Akses Input Data)</option>
                  <option value="pasien">4. Pasien / Skrining Mandiri</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Klinik / Unit Kerja</label>
                <input
                  type="text"
                  placeholder="Contoh: Puskesmas Bandung"
                  value={newClinic}
                  onChange={e => setNewClinic(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kata Sandi Awal (Opsional)</label>
                <input
                  type="text"
                  placeholder="Defaut: 123456"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md"
                >
                  {addingUser ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Guide Banner */}
      <div className="bg-indigo-50/50 border border-indigo-100 p-4.5 rounded-2xl flex gap-3 text-xs text-indigo-950 font-semibold">
        <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-extrabold uppercase tracking-wider text-indigo-900 block">Panduan Hak Akses Berbasis Peran (RBAC):</span>
          <p className="text-slate-600 leading-relaxed">
            - <strong>Administrator:</strong> Memiliki akses penuh ke seluruh fitur, manajemen user, konfigurasi cloud, input data, dan ekspor.<br/>
            - <strong>Peneliti:</strong> Berfokus pada analisis data real-time, grafik statistik DMF-T, serta ekspor laporan PDF/Excel.<br/>
            - <strong>Petugas Lapangan:</strong> Berfokus pada input survei klinis, Odontogram visual, dan pencatatan responden lapangan.
          </p>
        </div>
      </div>

    </div>
  );
}
