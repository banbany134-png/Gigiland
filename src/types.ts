export interface DeciduousTeethState {
  sehat: number;                     // Sehat
  karies: number;                    // Gigi Berlubang/Karies (d)
  dicabutKaries: number;             // Gigi dicabut karena karies (e)
  tumpatanKaries: number;            // Tumpatan dengan karies
  tumpatanTanpaKaries: number;       // Tumpatan tanpa karies (f)
  dicabutSebabLain: number;          // Gigi dicabut karena sebab lain
  fissureSealant: number;            // Fissure Sealant
  protesaCekat: number;              // Protesa cekat/mahkota cekat/implan/veneer
  tidakTumbuh: number;               // Gigi tidak tumbuh
  lainLain: number;                  // Lain-lain
}

export interface PermanentTeethState {
  sehat: number;                     // Sehat
  karies: number;                    // Gigi Berlubang/Karies (D)
  dicabutKaries: number;             // Gigi dicabut karena karies (M)
  tumpatanKaries: number;            // Tumpatan dengan karies
  tumpatanTanpaKaries: number;       // Tumpatan tanpa karies (F)
  dicabutSebabLain: number;          // Gigi dicabut karena sebab lain
  fissureSealant: number;            // Fissure Sealant
  protesaCekat: number;              // Protesa cekat/mahkota cekat/implan/veneer
  tidakTumbuh: number;               // Gigi tidak tumbuh
  lainLain: number;                  // Lain-lain
}

export interface MukosaState {
  gusiBerdarah: boolean;             // Gusi berdarah
  lesiMukosaOral: boolean;           // Lesi Mukosa Oral
}

export interface TindakLanjutState {
  perluPerawatanSegera: boolean;     // Perlu perawatan segera
  perluPerawatanTidakSegera: boolean; // Perlu perawatan tidak segera
  perluDirujuk: boolean;             // Perlu dirujuk
  dirujukKe: 'puskesmas' | 'rs_umum' | 'rsgm_rskgm' | 'klinik_pratama' | 'klinik_utama' | 'tidak_dirujuk';
}

export interface RespondentData {
  id?: string;
  nomorResponden?: string;          // e.g. 'DSP-2026-001'
  nama: string;
  tanggalInput: string;             // ISO String or YYYY-MM-DD
  tanggalLahir?: string;            // YYYY-MM-DD
  alamat?: string;                  // Address
  noTelepon?: string;               // Phone number
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  umur: number;
  kelompokUmur: '5-10' | '10-18' | '18-60' | '60+';
  pendidikan: 'SD' | 'SMP' | 'SMA' | 'Diploma' | 'S1/D4' | 'S2' | 'S3' | 'Tidak Sekolah';
  pekerjaan: 'ASN/PNS/PPPK' | 'TNI/POLRI' | 'PEGAWAI BUMN' | 'PEGAWAI SWASTA' | 'WIRASWASTA/WIRAUSAHA' | 'PELAJAR/MAHASISWA' | 'PENGURUS/IBU RUMAH TANGGA' | 'ASISTEN RUMAH TANGGA' | 'TIDAK BEKERJA';
  
  // OHI-S & Clinical Indicators
  ohisScore?: number;               // 0.0 - 6.0
  ohisCategory?: 'Baik' | 'Sedang' | 'Buruk';
  diagnosis?: string;               // Clinical Diagnosis
  tindakan?: string;                // Dental Treatment/Action
  informedConsent?: boolean | 'ACC' | 'Disetujui'; // Informed Consent status
  riwayatPemeriksaan?: string;      // Exam History summary
  isPriorityPatient?: boolean;      // Highlight flag (e.g. Pablo Gavi)
  catatanKhusus?: string;           // Special notes

  // Dental states
  gigiSulung: DeciduousTeethState;
  gigiTetap: PermanentTeethState;
  teethStatus?: Record<string, string>;
  
  // Indices (calculated)
  deft: number;                     // d + e + f
  dmft: number;                     // D + M + F
  
  // Mukosa & RTL
  mukosa: MukosaState;
  tindakLanjut: TindakLanjutState;
  
  // Metadata
  createdBy: string;                // User email or "Anonim"
  createdAt: any;                   // Firestore Timestamp or Date
  
  // Location details (for geographical heatmap)
  lokasi_stan?: string;
  latitude?: number;
  longitude?: number;
}

export interface SurveySession {
  id: string;
  name: string;
  passcode: string;
  createdAt: any;
  createdBy: string;
}

export type UserRole = 
  | 'administrator' 
  | 'peneliti' 
  | 'petugas_lapangan' 
  | 'super_admin' 
  | 'admin_klinik' 
  | 'operator' 
  | 'pasien';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'active' | 'disabled';
  createdAt?: string;
  clinic?: string;
  customPassword?: string;
}
