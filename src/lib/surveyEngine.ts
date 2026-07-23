import { RespondentData } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

// 1. Calculate Statistics
export interface SurveyStats {
  totalRespondents: number;
  
  // Pendidikan Breakdown
  pendidikanBreakdown: Record<string, number>;
  pendidikanFilledCount: number;
  
  // Pekerjaan Breakdown
  pekerjaanBreakdown: Record<string, number>;
  pekerjaanFilledCount: number;
  
  // Jenis Kelamin Breakdown
  genderBreakdown: Record<string, number>;
  genderFilledCount: number;
  
  // Kelompok Umur Breakdown
  ageGroupBreakdown: Record<string, number>;
  ageGroupFilledCount: number;
  
  // Gigi Sulung (Deciduous) Averages
  gigiSulungAvg: {
    sehat: number;
    karies: number;
    dicabutKaries: number;
    tumpatanKaries: number;
    tumpatanTanpaKaries: number;
    dicabutSebabLain: number;
    fissureSealant: number;
    protesaCekat: number;
    tidakTumbuh: number;
    lainLain: number;
  };
  
  // Gigi Tetap (Permanent) Averages
  gigiTetapAvg: {
    sehat: number;
    karies: number;
    dicabutKaries: number;
    tumpatanKaries: number;
    tumpatanTanpaKaries: number;
    dicabutSebabLain: number;
    fissureSealant: number;
    protesaCekat: number;
    tidakTumbuh: number;
    lainLain: number;
  };
  
  // Indices Averages
  indexAvg: {
    d: number;      // Gigi sulung karies
    e: number;      // Gigi sulung dicabut karies
    f: number;      // Gigi sulung tumpatan tanpa karies
    deft: number;   // Gigi sulung d+e+f
    D: number;      // Gigi tetap karies
    M: number;      // Gigi tetap dicabut karies
    F: number;      // Gigi tetap tumpatan tanpa karies
    dmft: number;   // Gigi tetap D+M+F
  };
  
  // Mukosa State percentages
  mukosaPct: {
    gusiBerdarah: number;
    lesiMukosaOral: number;
  };
  
  // Rencana Tindak Lanjut percentages
  tindakLanjutPct: {
    perluPerawatanSegera: number;
    perluPerawatanTidakSegera: number;
    perluDirujuk: number;
    dirujukKePuskesmas: number;
    dirujukKeRSUmum: number;
    dirujukKeRSGM: number;
    dirujukKeKlinikPratama: number;
    dirujukKeKlinikUtama: number;
  };
}

export function calculateSurveyStats(respondents: RespondentData[]): SurveyStats {
  const total = respondents.length;
  
  const stats: SurveyStats = {
    totalRespondents: total,
    pendidikanBreakdown: { 'SD': 0, 'SMP': 0, 'SMA': 0, 'Diploma': 0, 'S1/D4': 0, 'S2': 0, 'S3': 0, 'Tidak Sekolah': 0 },
    pendidikanFilledCount: 0,
    pekerjaanBreakdown: { 'ASN/PNS/PPPK': 0, 'TNI/POLRI': 0, 'PEGAWAI BUMN': 0, 'PEGAWAI SWASTA': 0, 'WIRASWASTA/WIRAUSAHA': 0, 'PELAJAR/MAHASISWA': 0, 'PENGURUS/IBU RUMAH TANGGA': 0, 'ASISTEN RUMAH TANGGA': 0, 'TIDAK BEKERJA': 0 },
    pekerjaanFilledCount: 0,
    genderBreakdown: { 'Laki-laki': 0, 'Perempuan': 0 },
    genderFilledCount: 0,
    ageGroupBreakdown: { '5-10': 0, '10-18': 0, '18-60': 0, '60+': 0 },
    ageGroupFilledCount: 0,
    
    gigiSulungAvg: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
    gigiTetapAvg: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
    
    indexAvg: { d: 0, e: 0, f: 0, deft: 0, D: 0, M: 0, F: 0, dmft: 0 },
    mukosaPct: { gusiBerdarah: 0, lesiMukosaOral: 0 },
    tindakLanjutPct: { perluPerawatanSegera: 0, perluPerawatanTidakSegera: 0, perluDirujuk: 0, dirujukKePuskesmas: 0, dirujukKeRSUmum: 0, dirujukKeRSGM: 0, dirujukKeKlinikPratama: 0, dirujukKeKlinikUtama: 0 }
  };

  if (total === 0) return stats;

  let gsSehatSum = 0, gsKariesSum = 0, gsDicabutKariesSum = 0, gsTumpatanKariesSum = 0, gsTumpatanTanpaKariesSum = 0, gsDicabutSebabLainSum = 0, gsFissureSum = 0, gsProtesaSum = 0, gsTidakTumbuhSum = 0, gsLainSum = 0;
  let gtSehatSum = 0, gtKariesSum = 0, gtDicabutKariesSum = 0, gtTumpatanKariesSum = 0, gtTumpatanTanpaKariesSum = 0, gtDicabutSebabLainSum = 0, gtFissureSum = 0, gtProtesaSum = 0, gtTidakTumbuhSum = 0, gtLainSum = 0;
  
  let gusiBerdarahCount = 0;
  let lesiMukosaCount = 0;
  
  let rwtSegeraCount = 0;
  let rwtTidakSegeraCount = 0;
  let rwtRujukCount = 0;
  let rujPuskesmasCount = 0;
  let rujRSUmumCount = 0;
  let rujRSGMCount = 0;
  let rujPratamaCount = 0;
  let rujUtamaCount = 0;

  respondents.forEach(r => {
    // Breakdown Pendidikan (ignore optional values if empty)
    if (r.pendidikan) {
      stats.pendidikanBreakdown[r.pendidikan] = (stats.pendidikanBreakdown[r.pendidikan] || 0) + 1;
      stats.pendidikanFilledCount++;
    }
    // Breakdown Pekerjaan
    if (r.pekerjaan) {
      stats.pekerjaanBreakdown[r.pekerjaan] = (stats.pekerjaanBreakdown[r.pekerjaan] || 0) + 1;
      stats.pekerjaanFilledCount++;
    }
    // Breakdown Gender
    if (r.jenisKelamin) {
      stats.genderBreakdown[r.jenisKelamin] = (stats.genderBreakdown[r.jenisKelamin] || 0) + 1;
      stats.genderFilledCount++;
    }
    // Breakdown Kelompok Umur
    if (r.kelompokUmur) {
      stats.ageGroupBreakdown[r.kelompokUmur] = (stats.ageGroupBreakdown[r.kelompokUmur] || 0) + 1;
      stats.ageGroupFilledCount++;
    }

    // Gigi Sulung sums
    gsSehatSum += r.gigiSulung?.sehat || 0;
    gsKariesSum += r.gigiSulung?.karies || 0;
    gsDicabutKariesSum += r.gigiSulung?.dicabutKaries || 0;
    gsTumpatanKariesSum += r.gigiSulung?.tumpatanKaries || 0;
    gsTumpatanTanpaKariesSum += r.gigiSulung?.tumpatanTanpaKaries || 0;
    gsDicabutSebabLainSum += r.gigiSulung?.dicabutSebabLain || 0;
    gsFissureSum += r.gigiSulung?.fissureSealant || 0;
    gsProtesaSum += r.gigiSulung?.protesaCekat || 0;
    gsTidakTumbuhSum += r.gigiSulung?.tidakTumbuh || 0;
    gsLainSum += r.gigiSulung?.lainLain || 0;

    // Gigi Tetap sums
    gtSehatSum += r.gigiTetap?.sehat || 0;
    gtKariesSum += r.gigiTetap?.karies || 0;
    gtDicabutKariesSum += r.gigiTetap?.dicabutKaries || 0;
    gtTumpatanKariesSum += r.gigiTetap?.tumpatanKaries || 0;
    gtTumpatanTanpaKariesSum += r.gigiTetap?.tumpatanTanpaKaries || 0;
    gtDicabutSebabLainSum += r.gigiTetap?.dicabutSebabLain || 0;
    gtFissureSum += r.gigiTetap?.fissureSealant || 0;
    gtProtesaSum += r.gigiTetap?.protesaCekat || 0;
    gtTidakTumbuhSum += r.gigiTetap?.tidakTumbuh || 0;
    gtLainSum += r.gigiTetap?.lainLain || 0;

    // Mukosa
    if (r.mukosa?.gusiBerdarah) gusiBerdarahCount++;
    if (r.mukosa?.lesiMukosaOral) lesiMukosaCount++;

    // RTL
    if (r.tindakLanjut?.perluPerawatanSegera) rwtSegeraCount++;
    if (r.tindakLanjut?.perluPerawatanTidakSegera) rwtTidakSegeraCount++;
    if (r.tindakLanjut?.perluDirujuk) rwtRujukCount++;
    
    if (r.tindakLanjut?.dirujukKe === 'puskesmas') rujPuskesmasCount++;
    else if (r.tindakLanjut?.dirujukKe === 'rs_umum') rujRSUmumCount++;
    else if (r.tindakLanjut?.dirujukKe === 'rsgm_rskgm') rujRSGMCount++;
    else if (r.tindakLanjut?.dirujukKe === 'klinik_pratama') rujPratamaCount++;
    else if (r.tindakLanjut?.dirujukKe === 'klinik_utama') rujUtamaCount++;
  });

  // Calculate Averages for Gigi Sulung
  stats.gigiSulungAvg = {
    sehat: gsSehatSum / total,
    karies: gsKariesSum / total,
    dicabutKaries: gsDicabutKariesSum / total,
    tumpatanKaries: gsTumpatanKariesSum / total,
    tumpatanTanpaKaries: gsTumpatanTanpaKariesSum / total,
    dicabutSebabLain: gsDicabutSebabLainSum / total,
    fissureSealant: gsFissureSum / total,
    protesaCekat: gsProtesaSum / total,
    tidakTumbuh: gsTidakTumbuhSum / total,
    lainLain: gsLainSum / total,
  };

  // Calculate Averages for Gigi Tetap
  stats.gigiTetapAvg = {
    sehat: gtSehatSum / total,
    karies: gtKariesSum / total,
    dicabutKaries: gtDicabutKariesSum / total,
    tumpatanKaries: gtTumpatanKariesSum / total,
    tumpatanTanpaKaries: gtTumpatanTanpaKariesSum / total,
    dicabutSebabLain: gtDicabutSebabLainSum / total,
    fissureSealant: gtFissureSum / total,
    protesaCekat: gtProtesaSum / total,
    tidakTumbuh: gtTidakTumbuhSum / total,
    lainLain: gtLainSum / total,
  };

  // Indices Averages
  stats.indexAvg = {
    d: stats.gigiSulungAvg.karies,
    e: stats.gigiSulungAvg.dicabutKaries,
    f: stats.gigiSulungAvg.tumpatanTanpaKaries,
    deft: stats.gigiSulungAvg.karies + stats.gigiSulungAvg.dicabutKaries + stats.gigiSulungAvg.tumpatanTanpaKaries,
    D: stats.gigiTetapAvg.karies,
    M: stats.gigiTetapAvg.dicabutKaries,
    F: stats.gigiTetapAvg.tumpatanTanpaKaries,
    dmft: stats.gigiTetapAvg.karies + stats.gigiTetapAvg.dicabutKaries + stats.gigiTetapAvg.tumpatanTanpaKaries,
  };

  // Mukosa Percentages
  stats.mukosaPct = {
    gusiBerdarah: gusiBerdarahCount / total,
    lesiMukosaOral: lesiMukosaCount / total,
  };

  // Tindak Lanjut Percentages
  stats.tindakLanjutPct = {
    perluPerawatanSegera: rwtSegeraCount / total,
    perluPerawatanTidakSegera: rwtTidakSegeraCount / total,
    perluDirujuk: rwtRujukCount / total,
    dirujukKePuskesmas: rujPuskesmasCount / total,
    dirujukKeRSUmum: rujRSUmumCount / total,
    dirujukKeRSGM: rujRSGMCount / total,
    dirujukKeKlinikPratama: rujPratamaCount / total,
    dirujukKeKlinikUtama: rujUtamaCount / total,
  };

  return stats;
}

// 2. Export to Excel
export function exportToExcel(respondents: RespondentData[], sessionName: string) {
  const stats = calculateSurveyStats(respondents);
  
  // Tab 1: Data Responden
  const respondentRows = respondents.map((r, index) => ({
    'No': index + 1,
    'Nama': r.nama || 'Anonim',
    'Tanggal Input': r.tanggalInput,
    'Jenis Kelamin': r.jenisKelamin,
    'Umur (Tahun)': r.umur,
    'Kelompok Umur': r.kelompokUmur === '5-10' ? '5-10 Tahun' : r.kelompokUmur === '10-18' ? '10-18 Tahun' : r.kelompokUmur === '18-60' ? '18-60 Tahun' : '60+ Tahun',
    'Pendidikan terakhir': r.pendidikan || '-',
    'Pekerjaan': r.pekerjaan || '-',
    
    // Gigi Sulung (gs)
    'G.Sulung Sehat': r.gigiSulung.sehat,
    'G.Sulung Karies (d)': r.gigiSulung.karies,
    'G.Sulung Dicabut Karies (e)': r.gigiSulung.dicabutKaries,
    'G.Sulung Tumpatan (f)': r.gigiSulung.tumpatanTanpaKaries,
    'def-t': r.deft,
    
    // Gigi Tetap (gt)
    'G.Tetap Sehat': r.gigiTetap.sehat,
    'G.Tetap Karies (D)': r.gigiTetap.karies,
    'G.Tetap Dicabut Karies (M)': r.gigiTetap.dicabutKaries,
    'G.Tetap Tumpatan (F)': r.gigiTetap.tumpatanTanpaKaries,
    'DMF-T': r.dmft,
    
    // Mukosa
    'Gusi Berdarah': r.mukosa.gusiBerdarah ? 'Ya' : 'Tidak',
    'Lesi Mukosa Oral': r.mukosa.lesiMukosaOral ? 'Ya' : 'Tidak',
    
    // RTL
    'Perlu Perawatan Segera': r.tindakLanjut.perluPerawatanSegera ? 'Ya' : 'Tidak',
    'Perlu Perawatan Tidak Segera': r.tindakLanjut.perluPerawatanTidakSegera ? 'Ya' : 'Tidak',
    'Perlu Dirujuk': r.tindakLanjut.perluDirujuk ? 'Ya' : 'Tidak',
    'Dirujuk Ke': r.tindakLanjut.dirujukKe === 'tidak_dirujuk' ? 'Tidak Dirujuk' : r.tindakLanjut.dirujukKe.toUpperCase().replace('_', ' '),
  }));

  const wb = XLSX.utils.book_new();
  const wsRespondents = XLSX.utils.json_to_sheet(respondentRows);
  XLSX.utils.book_append_sheet(wb, wsRespondents, 'Data Responden');

  // Tab 2: Laporan Ringkasan (Averages & Breakdowns)
  const summaryData = [
    ['RINGKASAN SURVEY KESEHATAN GIGI DAN MULUT'],
    ['Sesi:', sessionName],
    ['Tanggal Ekspor:', new Date().toLocaleDateString('id-ID')],
    ['Jumlah Responden:', stats.totalRespondents],
    [],
    ['KARAKTERISTIK RESPONDEN'],
    ['Kategori', 'Variabel', 'Jumlah', 'Persentase'],
    
    // Gender Breakdown
    ['Jenis Kelamin', 'Laki-laki', stats.genderBreakdown['Laki-laki'], stats.genderFilledCount ? `${((stats.genderBreakdown['Laki-laki'] / stats.genderFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    ['Jenis Kelamin', 'Perempuan', stats.genderBreakdown['Perempuan'], stats.genderFilledCount ? `${((stats.genderBreakdown['Perempuan'] / stats.genderFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    
    // Age Group Breakdown
    ['Kelompok Umur', '5-10 tahun (anak-anak)', stats.ageGroupBreakdown['5-10'], stats.ageGroupFilledCount ? `${((stats.ageGroupBreakdown['5-10'] / stats.ageGroupFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    ['Kelompok Umur', '10-18 tahun (remaja)', stats.ageGroupBreakdown['10-18'], stats.ageGroupFilledCount ? `${((stats.ageGroupBreakdown['10-18'] / stats.ageGroupFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    ['Kelompok Umur', '18-60 tahun (produktif)', stats.ageGroupBreakdown['18-60'], stats.ageGroupFilledCount ? `${((stats.ageGroupBreakdown['18-60'] / stats.ageGroupFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    ['Kelompok Umur', '60 tahun ke atas (lansia)', stats.ageGroupBreakdown['60+'], stats.ageGroupFilledCount ? `${((stats.ageGroupBreakdown['60+'] / stats.ageGroupFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    
    [],
    ['RATA-RATA KEADAAN GIGI SULUNG'],
    ['Parameter', 'Rata-Rata'],
    ['Sehat', stats.gigiSulungAvg.sehat.toFixed(2)],
    ['Gigi Berlubang/Karies (d)', stats.gigiSulungAvg.karies.toFixed(2)],
    ['Gigi dicabut karena karies (e)', stats.gigiSulungAvg.dicabutKaries.toFixed(2)],
    ['Tumpatan dengan karies', stats.gigiSulungAvg.tumpatanKaries.toFixed(2)],
    ['Tumpatan tanpa karies (f)', stats.gigiSulungAvg.tumpatanTanpaKaries.toFixed(2)],
    ['Gigi dicabut karena sebab lain', stats.gigiSulungAvg.dicabutSebabLain.toFixed(2)],
    ['Fissure Sealant', stats.gigiSulungAvg.fissureSealant.toFixed(2)],
    ['Protesa cekat/mahkota cekat/implan/veneer', stats.gigiSulungAvg.protesaCekat.toFixed(2)],
    ['Gigi tidak tumbuh', stats.gigiSulungAvg.tidakTumbuh.toFixed(2)],
    ['Lain-lain', stats.gigiSulungAvg.lainLain.toFixed(2)],
    ['Indeks def-t (d+e+f)', stats.indexAvg.deft.toFixed(2)],

    [],
    ['RATA-RATA KEADAAN GIGI TETAP'],
    ['Parameter', 'Rata-Rata'],
    ['Sehat', stats.gigiTetapAvg.sehat.toFixed(2)],
    ['Gigi Berlubang/Karies (D)', stats.gigiTetapAvg.karies.toFixed(2)],
    ['Gigi dicabut karena karies (M)', stats.gigiTetapAvg.dicabutKaries.toFixed(2)],
    ['Tumpatan dengan karies', stats.gigiTetapAvg.tumpatanKaries.toFixed(2)],
    ['Tumpatan tanpa karies (F)', stats.gigiTetapAvg.tumpatanTanpaKaries.toFixed(2)],
    ['Gigi dicabut karena sebab lain', stats.gigiTetapAvg.dicabutSebabLain.toFixed(2)],
    ['Fissure Sealant', stats.gigiTetapAvg.fissureSealant.toFixed(2)],
    ['Protesa cekat/mahkota cekat/implan/veneer', stats.gigiTetapAvg.protesaCekat.toFixed(2)],
    ['Gigi tidak tumbuh', stats.gigiTetapAvg.tidakTumbuh.toFixed(2)],
    ['Lain-lain', stats.gigiTetapAvg.lainLain.toFixed(2)],
    ['Indeks DMF-T (D+M+F)', stats.indexAvg.dmft.toFixed(2)],

    [],
    ['KEADAAN MUKOSA'],
    ['Kondisi', 'Persentase'],
    ['Gusi berdarah', `${(stats.mukosaPct.gusiBerdarah * 100).toFixed(2)}%`],
    ['Lesi Mukosa Oral', `${(stats.mukosaPct.lesiMukosaOral * 100).toFixed(2)}%`],

    [],
    ['RENCANA TINDAK LANJUT (RTL)'],
    ['Tindakan', 'Persentase'],
    ['Perlu perawatan segera', `${(stats.tindakLanjutPct.perluPerawatanSegera * 100).toFixed(2)}%`],
    ['Perlu perawatan tidak segera', `${(stats.tindakLanjutPct.perluPerawatanTidakSegera * 100).toFixed(2)}%`],
    ['Perlu dirujuk', `${(stats.tindakLanjutPct.perluDirujuk * 100).toFixed(2)}%`],
    ['Dirujuk ke puskesmas', `${(stats.tindakLanjutPct.dirujukKePuskesmas * 100).toFixed(2)}%`],
    ['Dirujuk ke RS Umum', `${(stats.tindakLanjutPct.dirujukKeRSUmum * 100).toFixed(2)}%`],
    ['Dirujuk ke RSGM/RSKGM', `${(stats.tindakLanjutPct.dirujukKeRSGM * 100).toFixed(2)}%`],
    ['Dirujuk ke Klinik Pratama', `${(stats.tindakLanjutPct.dirujukKeKlinikPratama * 100).toFixed(2)}%`],
    ['Dirujuk ke Klinik Utama', `${(stats.tindakLanjutPct.dirujukKeKlinikUtama * 100).toFixed(2)}%`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Laporan');

  // Trigger browser download
  const cleanName = sessionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  XLSX.writeFile(wb, `survey_gigi_dan_mulut_${cleanName}.xlsx`);
}

// 3. Export to PDF
export function exportToPdf(respondents: RespondentData[], sessionName: string) {
  const stats = calculateSurveyStats(respondents);
  const doc = new jsPDF();
  
  // Set Bahasa Font & Styling
  doc.setFont('Helvetica', 'normal');
  
  // Header Box
  doc.setFillColor(30, 41, 59); // Charcoal/Navy Slate background
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('Helvetica', 'bold');
  doc.text('LAPORAN HASIL SURVEY KESEHATAN GIGI DAN MULUT', 15, 17);
  
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Sesi Survey: ${sessionName}`, 15, 25);
  doc.text(`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')} | Total Responden: ${stats.totalRespondents} Orang`, 15, 32);
  
  // Content spacing start
  let y = 50;

  // Function to add subheaders
  const sectionHeader = (title: string) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 5, 182, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 17, y);
    y += 10;
  };

  // Section 1: Karakteristik Responden
  sectionHeader('I. KARAKTERISTIK RESPONDEN');
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  
  const col1 = 15;
  const col2 = 80;
  const col3 = 140;

  doc.setFont('Helvetica', 'bold');
  doc.text('Kelompok Umur:', col1, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`- Anak-anak (5-10th): ${stats.ageGroupBreakdown['5-10']} org (${stats.ageGroupFilledCount ? ((stats.ageGroupBreakdown['5-10']/stats.ageGroupFilledCount)*100).toFixed(1) : 0}%)`, col1, y + 6);
  doc.text(`- Remaja (10-18th): ${stats.ageGroupBreakdown['10-18']} org (${stats.ageGroupFilledCount ? ((stats.ageGroupBreakdown['10-18']/stats.ageGroupFilledCount)*100).toFixed(1) : 0}%)`, col1, y + 12);
  doc.text(`- Produktif (18-60th): ${stats.ageGroupBreakdown['18-60']} org (${stats.ageGroupFilledCount ? ((stats.ageGroupBreakdown['18-60']/stats.ageGroupFilledCount)*100).toFixed(1) : 0}%)`, col1, y + 18);
  doc.text(`- Lansia (60th+): ${stats.ageGroupBreakdown['60+']} org (${stats.ageGroupFilledCount ? ((stats.ageGroupBreakdown['60+']/stats.ageGroupFilledCount)*100).toFixed(1) : 0}%)`, col1, y + 24);

  doc.setFont('Helvetica', 'bold');
  doc.text('Jenis Kelamin:', col2, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`- Laki-laki: ${stats.genderBreakdown['Laki-laki']} org (${stats.genderFilledCount ? ((stats.genderBreakdown['Laki-laki']/stats.genderFilledCount)*100).toFixed(1) : 0}%)`, col2, y + 6);
  doc.text(`- Perempuan: ${stats.genderBreakdown['Perempuan']} org (${stats.genderFilledCount ? ((stats.genderBreakdown['Perempuan']/stats.genderFilledCount)*100).toFixed(1) : 0}%)`, col2, y + 12);

  // Add SD, SMP, SMA count
  doc.setFont('Helvetica', 'bold');
  doc.text('Pendidikan (Dominan):', col3, y);
  doc.setFont('Helvetica', 'normal');
  const eduSorted = Object.entries(stats.pendidikanBreakdown).sort((a,b) => b[1] - a[1]);
  doc.text(`1. ${eduSorted[0][0]}: ${eduSorted[0][1]} org`, col3, y + 6);
  doc.text(`2. ${eduSorted[1][0]}: ${eduSorted[1][1]} org`, col3, y + 12);
  doc.text(`3. ${eduSorted[2][0]}: ${eduSorted[2][1]} org`, col3, y + 18);

  y += 35;

  // Section 2: Keadaan Gigi
  sectionHeader('II. ANALISIS KEADAAN GIGI (RATA-RATA per RESPONDEN)');

  // Table header
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y - 4, 182, 6, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Parameter Keadaan Gigi', 17, y);
  doc.text('Gigi Sulung (Deciduous)', 105, y);
  doc.text('Gigi Tetap (Permanent)', 150, y);
  
  y += 6;
  doc.setTextColor(51, 65, 85);
  doc.setFont('Helvetica', 'normal');

  const rows = [
    { label: 'Sehat', sulung: stats.gigiSulungAvg.sehat, tetap: stats.gigiTetapAvg.sehat },
    { label: 'Gigi Berlubang / Karies (d / D)', sulung: stats.gigiSulungAvg.karies, tetap: stats.gigiTetapAvg.karies },
    { label: 'Gigi Dicabut karena karies (e / M)', sulung: stats.gigiSulungAvg.dicabutKaries, tetap: stats.gigiTetapAvg.dicabutKaries },
    { label: 'Tumpatan dengan karies', sulung: stats.gigiSulungAvg.tumpatanKaries, tetap: stats.gigiTetapAvg.tumpatanKaries },
    { label: 'Tumpatan tanpa karies (f / F)', sulung: stats.gigiSulungAvg.tumpatanTanpaKaries, tetap: stats.gigiTetapAvg.tumpatanTanpaKaries },
    { label: 'Fissure Sealant', sulung: stats.gigiSulungAvg.fissureSealant, tetap: stats.gigiTetapAvg.fissureSealant },
    { label: 'Protesa Cekat / Implan', sulung: stats.gigiSulungAvg.protesaCekat, tetap: stats.gigiTetapAvg.protesaCekat },
    { label: 'Gigi Tidak Tumbuh', sulung: stats.gigiSulungAvg.tidakTumbuh, tetap: stats.gigiTetapAvg.tidakTumbuh },
  ];

  rows.forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 5.5, 'F');
    }
    doc.text(row.label, 17, y);
    doc.text(row.sulung.toFixed(2), 115, y);
    doc.text(row.tetap.toFixed(2), 160, y);
    y += 5.5;
  });

  y += 5;

  // Section 3: Indeks Karies
  sectionHeader('III. INDEKS PENGALAMAN KARIES');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);

  // Deciduous
  doc.setFont('Helvetica', 'bold');
  doc.text(`Rata-rata Indeks def-t (Gigi Sulung): ${stats.indexAvg.deft.toFixed(2)}`, col1, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Kandungan indeks: d (karies) = ${stats.indexAvg.d.toFixed(2)} | e (dicabut) = ${stats.indexAvg.e.toFixed(2)} | f (tumpatan) = ${stats.indexAvg.f.toFixed(2)}`, col1, y + 5);

  // Permanent
  y += 13;
  doc.setFont('Helvetica', 'bold');
  doc.text(`Rata-rata Indeks DMF-T (Gigi Tetap): ${stats.indexAvg.dmft.toFixed(2)}`, col1, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Kandungan indeks: D (karies) = ${stats.indexAvg.D.toFixed(2)} | M (dicabut) = ${stats.indexAvg.M.toFixed(2)} | F (tumpatan) = ${stats.indexAvg.F.toFixed(2)}`, col1, y + 5);

  // Clinical interpretation
  y += 12;
  doc.setFont('Helvetica', 'bold');
  doc.text('Interpretasi Klinis:', col1, y);
  doc.setFont('Helvetica', 'normal');
  let dmftCategory = 'Sangat Rendah (< 1.2)';
  if (stats.indexAvg.dmft >= 1.2 && stats.indexAvg.dmft < 2.7) dmftCategory = 'Rendah (1.2 - 2.6)';
  else if (stats.indexAvg.dmft >= 2.7 && stats.indexAvg.dmft < 4.5) dmftCategory = 'Sedang (2.7 - 4.4)';
  else if (stats.indexAvg.dmft >= 4.5 && stats.indexAvg.dmft < 6.6) dmftCategory = 'Tinggi (4.5 - 6.5)';
  else if (stats.indexAvg.dmft >= 6.6) dmftCategory = 'Sangat Tinggi (>= 6.6)';

  let deftCategory = 'Sangat Rendah (< 1.2)';
  if (stats.indexAvg.deft >= 1.2 && stats.indexAvg.deft < 2.7) deftCategory = 'Rendah (1.2 - 2.6)';
  else if (stats.indexAvg.deft >= 2.7 && stats.indexAvg.deft < 4.5) deftCategory = 'Sedang (2.7 - 4.4)';
  else if (stats.indexAvg.deft >= 4.5 && stats.indexAvg.deft < 6.6) deftCategory = 'Tinggi (4.5 - 6.5)';
  else if (stats.indexAvg.deft >= 6.6) deftCategory = 'Sangat Tinggi (>= 6.6)';

  doc.text(`- Tingkat keparahan karies gigi tetap (DMF-T) berada dalam kategori: ${dmftCategory}`, col1, y + 5);
  doc.text(`- Tingkat keparahan karies gigi sulung (def-t) berada dalam kategori: ${deftCategory}`, col1, y + 10);

  y += 22;

  // New Page
  doc.addPage();
  y = 20;

  // Header for page 2
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y - 5, 182, 8, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('LAPORAN HASIL SURVEY KESEHATAN GIGI (Sambungan)', 17, y);
  
  y += 12;

  // Section 4: Mukosa
  sectionHeader('IV. KEADAAN MUKOSA ORAL & GUSI');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Persentase Gusi Berdarah (Bleeding on Probing): ${(stats.mukosaPct.gusiBerdarah * 100).toFixed(2)}%`, col1, y);
  doc.text(`Persentase Lesi Mukosa Oral (Oral Mucosal Lesion): ${(stats.mukosaPct.lesiMukosaOral * 100).toFixed(2)}%`, col1, y + 6);
  
  y += 18;

  // Section 5: RTL
  sectionHeader('V. RENCANA TINDAK LANJUT & SISTEM RUJUKAN');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`- Perlu perawatan gigi segera: ${(stats.tindakLanjutPct.perluPerawatanSegera * 100).toFixed(2)}%`, col1, y);
  doc.text(`- Perlu perawatan gigi tidak segera: ${(stats.tindakLanjutPct.perluPerawatanTidakSegera * 100).toFixed(2)}%`, col1, y + 6);
  doc.text(`- Memerlukan rujukan ke faskes lanjutan: ${(stats.tindakLanjutPct.perluDirujuk * 100).toFixed(2)}%`, col1, y + 12);
  
  doc.setFont('Helvetica', 'bold');
  doc.text('Distribusi Rujukan Faskes:', col1, y + 20);
  doc.setFont('Helvetica', 'normal');
  doc.text(`- Puskesmas: ${(stats.tindakLanjutPct.dirujukKePuskesmas * 100).toFixed(2)}%`, col1, y + 26);
  doc.text(`- RS Umum: ${(stats.tindakLanjutPct.dirujukKeRSUmum * 100).toFixed(2)}%`, col1, y + 32);
  doc.text(`- RSGM / RS Gigi & Mulut: ${(stats.tindakLanjutPct.dirujukKeRSGM * 100).toFixed(2)}%`, col1, y + 38);
  doc.text(`- Klinik Pratama: ${(stats.tindakLanjutPct.dirujukKeKlinikPratama * 100).toFixed(2)}%`, col1, y + 44);
  doc.text(`- Klinik Utama: ${(stats.tindakLanjutPct.dirujukKeKlinikUtama * 100).toFixed(2)}%`, col1, y + 50);

  y += 65;

  // Section 6: Penandatangan / Pengesahan
  sectionHeader('VI. REKOMENDASI & PENGESAHAN');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Berdasarkan hasil survey kesehatan gigi dan mulut yang terkumpul, disarankan untuk:', col1, y);
  doc.text('1. Meningkatkan edukasi cara menyikat gigi yang baik dan benar pada kelompok responden dominan.', col1, y + 5);
  doc.text('2. Melakukan kontrol periodik 6 bulan sekali bagi seluruh responden yang berisiko karies.', col1, y + 10);
  doc.text('3. Memfasilitasi rujukan ke faskes / puskesmas terdekat bagi responden dengan karies aktif & calculus.', col1, y + 15);

  y += 35;
  
  // Signature Lines
  doc.setFont('Helvetica', 'normal');
  doc.text('Mengetahui / Penanggung Jawab,', col1, y);
  doc.text('Dokter Gigi Pemeriksa (Dentist in Charge)', col1, y + 5);
  doc.setFont('Helvetica', 'bold');
  doc.text('drg. Banny', col1, y + 20);
  doc.setFont('Helvetica', 'normal');
  doc.text('SIP/STR: 33.01.100.2.2026 - DentaSync Pro', col1, y + 25);

  doc.text('Disetujui oleh,', col3, y);
  doc.text('Kepala Klinik / Instansi DentaSync', col3, y + 5);
  doc.setFont('Helvetica', 'bold');
  doc.text('Klinik Utama DentaSync Pro', col3, y + 20);
  doc.setFont('Helvetica', 'normal');
  doc.text('No. Laporan: LAP-DSP/2026/07/001', col3, y + 25);

  // Trigger browser download
  const cleanName = sessionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`laporan_survey_gigi_${cleanName}.pdf`);
}

// 4. Generate 30 FC Barcelona Squad & Football Legends Sample Respondents
export function generateBarcelonaSquadRespondents(): RespondentData[] {
  const squadData = [
    {
      no: 'DSP-2026-001',
      nama: 'Pablo Gavi',
      gender: 'Laki-laki' as const,
      age: 21,
      dob: '2004-08-05',
      address: 'Ciutat Esportiva Joan Gamper, Sant Joan Despí, Barcelona',
      phone: '+34 612 001 006',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'SMA' as const,
      ohis: 0.0,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 0,
      diagnosis: 'Gigi & Jaringan Periodontal Sempurna / Bebas Karies (Gigi Atlet Prioritas)',
      tindakan: 'Pembersihan Rutin & Aplikasi Fluoride Varnish',
      consent: 'ACC',
      history: '2026-07-20: Pre-Season Dental Screening (Kondisi Gigi Sangat Sehat & Terawat Sempurna)',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: true,
      catatan: '★ PASIEN PRIORITAS UTAMA: Kebersihan Gigi & Jaringan Periodontal Sempurna (OHI-S 0.0)'
    },
    {
      no: 'DSP-2026-002',
      nama: 'Pedri',
      gender: 'Laki-laki' as const,
      age: 23,
      dob: '2002-11-25',
      address: 'Av. Onze de Setembre, Sant Joan Despí, Barcelona',
      phone: '+34 612 002 008',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'SMA' as const,
      ohis: 0.4,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 0,
      diagnosis: 'Oklusi Normal & Bebas Karies Active',
      tindakan: 'Pembersihan Karang Gigi & Edukasi Dental Flossing',
      consent: 'ACC',
      history: '2026-07-15: Kontrol Rutin 6 Bulanan',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Gigi terawat dengan sangat baik'
    },
    {
      no: 'DSP-2026-003',
      nama: 'Lamine Yamal',
      gender: 'Laki-laki' as const,
      age: 18,
      dob: '2007-07-13',
      address: 'La Masia Academy, Sant Joan Despí, Barcelona',
      phone: '+34 612 003 019',
      job: 'PELAJAR/MAHASISWA' as const,
      edu: 'SMA' as const,
      ohis: 0.6,
      ohisCat: 'Baik' as const,
      d: 1, m: 0, f: 0,
      diagnosis: 'Karies Enamel Pit & Fissure Molar 1 Kanan',
      tindakan: 'Penambalan Resin Komposit Microhybrid',
      consent: 'ACC',
      history: '2026-06-10: Penambalan Komposit Molar 1',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Aplikasi Fissure Sealant pada gigi molar tersisa'
    },
    {
      no: 'DSP-2026-004',
      nama: 'Robert Lewandowski',
      gender: 'Laki-laki' as const,
      age: 37,
      dob: '1988-08-21',
      address: 'Castelldefels, Barcelona',
      phone: '+34 612 004 009',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'S1/D4' as const,
      ohis: 0.8,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 2,
      diagnosis: 'Restorasi Tumpatan Komposit Molar Terawat Baik',
      tindakan: 'Polishing Tumpatan & Scaling Supragingival',
      consent: 'ACC',
      history: '2026-05-18: Polishing Tumpatan',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Kondisi kebersihan mulut sangat terjaga'
    },
    {
      no: 'DSP-2026-005',
      nama: 'Raphinha',
      gender: 'Laki-laki' as const,
      age: 29,
      dob: '1996-12-14',
      address: 'Gavà Mar, Barcelona',
      phone: '+34 612 005 011',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'SMA' as const,
      ohis: 1.1,
      ohisCat: 'Baik' as const,
      d: 1, m: 0, f: 0,
      diagnosis: 'Karies Superficialis Premolar 2 Atas',
      tindakan: 'Penambalan Light Cure Komposit Nanofill',
      consent: 'ACC',
      history: '2026-07-02: Konsultasi Karies Premolar',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Penggunaan mouthguard saat pertandingan'
    },
    {
      no: 'DSP-2026-006',
      nama: 'Frenkie de Jong',
      gender: 'Laki-laki' as const,
      age: 28,
      dob: '1997-05-12',
      address: 'Pedralbes, Barcelona',
      phone: '+34 612 006 021',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'S1/D4' as const,
      ohis: 0.5,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 0,
      diagnosis: 'Jaringan Periodontal Sehat & Bebas Karies',
      tindakan: 'Aplikasi Topical Fluoride Varnish',
      consent: 'ACC',
      history: '2026-06-25: Profilaksis & Fluoridasi',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Hygiene mulut prima'
    },
    {
      no: 'DSP-2026-007',
      nama: 'Ronald Araújo',
      gender: 'Laki-laki' as const,
      age: 26,
      dob: '1999-03-07',
      address: 'Sant Cugat del Vallès, Barcelona',
      phone: '+34 612 007 004',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'SMA' as const,
      ohis: 1.4,
      ohisCat: 'Sedang' as const,
      d: 1, m: 0, f: 1,
      diagnosis: 'Gingivitis Marginalis Ringan & Kalkulus Supragingival',
      tindakan: 'Scaling Ultrasonic & Obat Kumur Chlorhexidine',
      consent: 'ACC',
      history: '2026-07-10: Scaling Supragingival',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Evaluasi plak ulang 2 minggu lagi'
    },
    {
      no: 'DSP-2026-008',
      nama: 'Jules Koundé',
      gender: 'Laki-laki' as const,
      age: 27,
      dob: '1998-11-12',
      address: 'Eixample, Barcelona',
      phone: '+34 612 008 023',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'SMA' as const,
      ohis: 1.0,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 1,
      diagnosis: 'Restorasi Tumpatan Premolar Sehat',
      tindakan: 'Kontrol Periodik & Pembersihan Karang Gigi',
      consent: 'ACC',
      history: '2026-04-12: Check-up Periodik',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Status oklusi baik'
    },
    {
      no: 'DSP-2026-009',
      nama: 'Ter Stegen',
      gender: 'Laki-laki' as const,
      age: 33,
      dob: '1992-04-30',
      address: 'Sitges, Barcelona',
      phone: '+34 612 009 001',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'S1/D4' as const,
      ohis: 0.7,
      ohisCat: 'Baik' as const,
      d: 0, m: 1, f: 1,
      diagnosis: 'Pasca Extraksi M3 & Custom Nightguard Bruksisme',
      tindakan: 'Pembersihan Karang Gigi & Fitting Nightguard',
      consent: 'ACC',
      history: '2026-05-30: Odontektomi M3 Bawah Kiri',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Monitoring proteksi gigi saat tidur'
    },
    {
      no: 'DSP-2026-010',
      nama: 'Alejandro Balde',
      gender: 'Laki-laki' as const,
      age: 22,
      dob: '2003-10-18',
      address: 'Sant Boi de Llobregat, Barcelona',
      phone: '+34 612 010 003',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'SMA' as const,
      ohis: 1.2,
      ohisCat: 'Baik' as const,
      d: 1, m: 0, f: 0,
      diagnosis: 'Karies Superficialis Molar 2 Bawah',
      tindakan: 'Penambalan Glass Ionomer Cement (GIC)',
      consent: 'ACC',
      history: '2026-07-01: Penambalan GIC Molar 2',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Edukasi cara sikat gigi daerah posterior'
    },
    {
      no: 'DSP-2026-011',
      nama: 'Pau Cubarsí',
      gender: 'Laki-laki' as const,
      age: 19,
      dob: '2007-01-22',
      address: 'Estany de Banyoles, Girona / Barcelona',
      phone: '+34 612 011 002',
      job: 'PELAJAR/MAHASISWA' as const,
      edu: 'SMA' as const,
      ohis: 0.5,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 0,
      diagnosis: 'Gigi Tetap Lengkap & Jaringan Periodontal Sehat',
      tindakan: 'Aplikasi Fluoride & Edukasi Teknik Sikat Gigi',
      consent: 'ACC',
      history: '2026-07-18: Skrining Rutin Remaja',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Kebersihan mulut sangat baik'
    },
    {
      no: 'DSP-2026-012',
      nama: 'Fermín López',
      gender: 'Laki-laki' as const,
      age: 22,
      dob: '2003-05-11',
      address: 'El Prat de Llobregat, Barcelona',
      phone: '+34 612 012 016',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'SMA' as const,
      ohis: 0.9,
      ohisCat: 'Baik' as const,
      d: 1, m: 0, f: 0,
      diagnosis: 'Karies Media Premolar 1 Kiri',
      tindakan: 'Penambalan Komposit Nanohibrid Estetis',
      consent: 'ACC',
      history: '2026-06-14: Penambalan Premolar',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Prosedur berjalan lancar tanpa komplikasi'
    },
    {
      no: 'DSP-2026-013',
      nama: 'Dani Olmo',
      gender: 'Laki-laki' as const,
      age: 27,
      dob: '1998-05-07',
      address: 'Terrassa, Barcelona',
      phone: '+34 612 013 020',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'S1/D4' as const,
      ohis: 0.8,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 1,
      diagnosis: 'Restorasi Komposit Sehat & Bebas Inflamasi Gusi',
      tindakan: 'Check-up Periodik & Cleaning Supreagingival',
      consent: 'ACC',
      history: '2026-07-08: Pemeriksaan Rutin',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Status kebersihan gusi stabil'
    },
    {
      no: 'DSP-2026-014',
      nama: 'Marc Casadó',
      gender: 'Laki-laki' as const,
      age: 22,
      dob: '2003-09-14',
      address: 'Sant Pere de Vilamajor, Barcelona',
      phone: '+34 612 014 017',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'SMA' as const,
      ohis: 0.6,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 0,
      diagnosis: 'Bebas Karies & Bebas Karang Gigi',
      tindakan: 'Profilaksis Rutin & Aplikasi Fluoride',
      consent: 'ACC',
      history: '2026-07-12: Profilaksis Gigi Rutin',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Kondisi rongga mulut optimal'
    },
    {
      no: 'DSP-2026-015',
      nama: 'Iñigo Martínez',
      gender: 'Laki-laki' as const,
      age: 34,
      dob: '1991-05-17',
      address: 'Sarrià-Sant Gervasi, Barcelona',
      phone: '+34 612 015 005',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'S1/D4' as const,
      ohis: 1.8,
      ohisCat: 'Sedang' as const,
      d: 1, m: 1, f: 1,
      diagnosis: 'Calculus Subgingival Moderate & Impaksi Molar 3',
      tindakan: 'Scaling Full Mouth & Surat Rujukan Odontektomi',
      consent: 'ACC',
      history: '2026-06-22: Deep Scaling & Rujukan Odontektomi',
      rujukan: 'rsgm_rskgm' as const,
      isPriority: false,
      catatan: 'Dirujuk ke RSGM untuk Bedah Mulut M3'
    },
    {
      no: 'DSP-2026-016',
      nama: 'Ferran Torres',
      gender: 'Laki-laki' as const,
      age: 25,
      dob: '2000-02-29',
      address: 'Les Corts, Barcelona',
      phone: '+34 612 016 007',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'SMA' as const,
      ohis: 0.9,
      ohisCat: 'Baik' as const,
      d: 1, m: 0, f: 0,
      diagnosis: 'Karies Incipien White Spot Molar 1',
      tindakan: 'Aplikasi Terapi Remineralisasi CPP-ACP Pastes',
      consent: 'ACC',
      history: '2026-07-05: Terapi Remineralisasi Enamel',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Evaluasi respon remineralisasi 1 bulan lagi'
    },
    {
      no: 'DSP-2026-017',
      nama: 'Ansu Fati',
      gender: 'Laki-laki' as const,
      age: 23,
      dob: '2002-10-31',
      address: 'Sant Just Desvern, Barcelona',
      phone: '+34 612 017 010',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'SMA' as const,
      ohis: 1.3,
      ohisCat: 'Sedang' as const,
      d: 1, m: 0, f: 1,
      diagnosis: 'Karies Dentin & Gingivitis Ringan Interdental',
      tindakan: 'Penambalan Komposit & Instuksi Hygiene',
      consent: 'ACC',
      history: '2026-06-18: Penambalan Komposit',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Meningkatkan frekuensi penggunaan dental floss'
    },
    {
      no: 'DSP-2026-018',
      nama: 'Wojciech Szczęsny',
      gender: 'Laki-laki' as const,
      age: 35,
      dob: '1990-04-18',
      address: 'Marbella / Barcelona',
      phone: '+34 612 018 025',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'S1/D4' as const,
      ohis: 1.5,
      ohisCat: 'Sedang' as const,
      d: 0, m: 1, f: 2,
      diagnosis: 'Restorasi Crown PFM Sehat & Karang Gigi Mild',
      tindakan: 'Scaling Supragingival & Polishing Mahkota',
      consent: 'ACC',
      history: '2026-07-11: Cleaning & Check-up Crown',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Perawatan berkala restorasi crown'
    },
    {
      no: 'DSP-2026-019',
      nama: 'Aitana Bonmatí',
      gender: 'Perempuan' as const,
      age: 28,
      dob: '1998-01-18',
      address: 'Sant Pere de Ribes, Barcelona',
      phone: '+34 612 019 014',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'S1/D4' as const,
      ohis: 0.3,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 0,
      diagnosis: 'Status Gigi & Jaringan Mulut Sangat Baik (Bebas Karies)',
      tindakan: 'Pembersihan Rutin & Custom Sport Mouthguard',
      consent: 'ACC',
      history: '2026-07-19: Pemeriksaan Gigi Atlet Femení & Custom Mouthguard',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Kondisi kesehatan mulut terbaik skuad wanita'
    },
    {
      no: 'DSP-2026-020',
      nama: 'Alexia Putellas',
      gender: 'Perempuan' as const,
      age: 31,
      dob: '1994-02-04',
      address: 'Mollet del Vallès, Barcelona',
      phone: '+34 612 020 011',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'S1/D4' as const,
      ohis: 0.4,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 1,
      diagnosis: 'Restorasi Veneer Poroselain Anterior Terawat',
      tindakan: 'Kontrol Periodik Veneer & Polishing',
      consent: 'ACC',
      history: '2026-06-30: Maintenance Veneer Anterior',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Kondisi estetika gigi sangat harmonis'
    },
    {
      no: 'DSP-2026-021',
      nama: 'Lionel Messi',
      gender: 'Laki-laki' as const,
      age: 38,
      dob: '1987-06-24',
      address: 'Castelldefels / Miami / Barcelona',
      phone: '+34 612 021 010',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'SMA' as const,
      ohis: 0.5,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 1,
      diagnosis: 'Kondisi Gigi Terawat Sangat Baik & Tumpatan Inlay Sehat',
      tindakan: 'Pembersihan Karang Gigi & Profilaksis Rutin',
      consent: 'ACC',
      history: '2026-07-04: Pemeriksaan Rutin Legenda',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Legenda klub dengan hygiene mulut teratur'
    },
    {
      no: 'DSP-2026-022',
      nama: 'Neymar Jr',
      gender: 'Laki-laki' as const,
      age: 33,
      dob: '1992-02-05',
      address: 'Bougival / Barcelona',
      phone: '+34 612 022 011',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'SMA' as const,
      ohis: 1.2,
      ohisCat: 'Baik' as const,
      d: 1, m: 0, f: 1,
      diagnosis: 'Karies Enamel Premolar & Prosedur Bleaching Estetis',
      tindakan: 'Penambalan Komposit Nanofill & Touch-up Bleaching',
      consent: 'ACC',
      history: '2026-05-20: Bleaching In-Office & Penambalan',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Gigi estetis dengan perawat berkala'
    },
    {
      no: 'DSP-2026-023',
      nama: 'Andrés Iniesta',
      gender: 'Laki-laki' as const,
      age: 41,
      dob: '1984-05-11',
      address: 'Fuentealbilla / Barcelona',
      phone: '+34 612 023 008',
      job: 'WIRASWASTA/WIRAUSAHA' as const,
      edu: 'S1/D4' as const,
      ohis: 0.8,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 2,
      diagnosis: 'Restorasi Inlay Ceramic Molar Terawat Baik',
      tindakan: 'Kontrol Periodik 6 Bulanan & Cleaning',
      consent: 'ACC',
      history: '2026-06-01: Check-up Periodik Inlay',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Oklusi stabil dan sehat'
    },
    {
      no: 'DSP-2026-024',
      nama: 'Xavi Hernández',
      gender: 'Laki-laki' as const,
      age: 45,
      dob: '1980-01-25',
      address: 'Terrassa / Barcelona',
      phone: '+34 612 024 006',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'S1/D4' as const,
      ohis: 1.0,
      ohisCat: 'Baik' as const,
      d: 1, m: 1, f: 1,
      diagnosis: 'Calculus Moderate & Karies Sekunder Molar 2',
      tindakan: 'Scaling Full Mouth & Penggantian Restorasi',
      consent: 'ACC',
      history: '2026-06-15: Penggantian Tumpatan Komposit',
      rujukan: 'puskesmas' as const,
      isPriority: false,
      catatan: 'Rujukan tindak lanjut perawatan rutin'
    },
    {
      no: 'DSP-2026-025',
      nama: 'Carles Puyol',
      gender: 'Laki-laki' as const,
      age: 47,
      dob: '1978-04-13',
      address: 'La Pobla de Segur / Barcelona',
      phone: '+34 612 025 005',
      job: 'WIRASWASTA/WIRAUSAHA' as const,
      edu: 'S1/D4' as const,
      ohis: 1.6,
      ohisCat: 'Sedang' as const,
      d: 1, m: 2, f: 1,
      diagnosis: 'Attrition Gigi Anterior & Periodontitis Ringan',
      tindakan: 'Scaling Deep, Nightguard & Rujukan RS Umum',
      consent: 'ACC',
      history: '2026-05-10: Penanganan Attrition Gigi',
      rujukan: 'rs_umum' as const,
      isPriority: false,
      catatan: 'Memerlukan perawatan mahkota pasca trauma lapangan'
    },
    {
      no: 'DSP-2026-026',
      nama: 'Gerard Piqué',
      gender: 'Laki-laki' as const,
      age: 38,
      dob: '1987-02-02',
      address: 'Sarrià / Barcelona',
      phone: '+34 612 026 003',
      job: 'WIRASWASTA/WIRAUSAHA' as const,
      edu: 'S1/D4' as const,
      ohis: 0.9,
      ohisCat: 'Baik' as const,
      d: 0, m: 1, f: 1,
      diagnosis: 'Pasca Extraksi M3 Kanan Bawah & Tumpatan Sehat',
      tindakan: 'Profilaksis Rutin & Flossing Education',
      consent: 'ACC',
      history: '2026-07-03: Examination & Scaling',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Status kesehatan gigi baik'
    },
    {
      no: 'DSP-2026-027',
      nama: 'Sergio Busquets',
      gender: 'Laki-laki' as const,
      age: 37,
      dob: '1988-07-16',
      address: 'Badia del Vallès / Barcelona',
      phone: '+34 612 027 005',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'SMA' as const,
      ohis: 0.7,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 1,
      diagnosis: 'Gigi Molar Tumpatan Sehat Tanpa Kebocoran',
      tindakan: 'Kontrol Rutin Enam Bulanan',
      consent: 'ACC',
      history: '2026-06-20: Evaluation of Dental Fillings',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Kebersihan gusi baik'
    },
    {
      no: 'DSP-2026-028',
      nama: 'Jordi Alba',
      gender: 'Laki-laki' as const,
      age: 36,
      dob: '1989-03-21',
      address: 'L\'Hospitalet de Llobregat / Barcelona',
      phone: '+34 612 028 018',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'SMA' as const,
      ohis: 1.1,
      ohisCat: 'Baik' as const,
      d: 1, m: 0, f: 1,
      diagnosis: 'Karies Enamel Superficialis Molar 1',
      tindakan: 'Penambalan Komposit & Topikal Fluoride',
      consent: 'ACC',
      history: '2026-07-14: Penambalan Molar 1',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Perawatan komposit berhasil'
    },
    {
      no: 'DSP-2026-029',
      nama: 'Mapi León',
      gender: 'Perempuan' as const,
      age: 30,
      dob: '1995-06-13',
      address: 'Zaragoza / Barcelona',
      phone: '+34 612 029 004',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'S1/D4' as const,
      ohis: 0.4,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 0,
      diagnosis: 'Gigi & Mulut Sangat Sehat (Bebas Karies)',
      tindakan: 'Check-up Periodik & Custom Mouthguard',
      consent: 'ACC',
      history: '2026-07-16: Skrining Rutin Tim Wanita FCB',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Sangat disiplin menjaga kebersihan gigi'
    },
    {
      no: 'DSP-2026-030',
      nama: 'Patri Guijarro',
      gender: 'Perempuan' as const,
      age: 27,
      dob: '1998-05-17',
      address: 'Palma de Mallorca / Barcelona',
      phone: '+34 612 030 012',
      job: 'PEGAWAI SWASTA' as const,
      edu: 'S1/D4' as const,
      ohis: 0.5,
      ohisCat: 'Baik' as const,
      d: 0, m: 0, f: 1,
      diagnosis: 'Tumpatan Fissure Sealant Sehat & Bebas Plak',
      tindakan: 'Pembersihan Karang Gigi & Polishing',
      consent: 'ACC',
      history: '2026-07-17: Scaling & Polishing Rutin',
      rujukan: 'tidak_dirujuk' as const,
      isPriority: false,
      catatan: 'Kondisi kesehatan jaringan penyangga baik'
    }
  ];

  const currentDate = '2026-07-22';

  return squadData.map((item) => {
    // Determine permanent dentition count
    const gtKaries = item.d;
    const gtDicabut = item.m;
    const gtTumpatan = item.f;
    const gtSehat = Math.max(28, 32 - (gtKaries + gtDicabut + gtTumpatan));

    // Calculate DMFT & deft
    const dmft = gtKaries + gtDicabut + gtTumpatan;
    const deft = 0; // Adult/Young Adult professional squad - 0 primary teeth

    const mukosaGusiBerdarah = item.ohis > 1.3;
    const mukosaLesi = false;

    const perluSegera = item.rujukan !== 'tidak_dirujuk';
    const perluDirujuk = item.rujukan !== 'tidak_dirujuk';

    return {
      nomorResponden: item.no,
      nama: item.nama,
      tanggalInput: currentDate,
      tanggalLahir: item.dob,
      alamat: item.address,
      noTelepon: item.phone,
      jenisKelamin: item.gender,
      umur: item.age,
      kelompokUmur: item.age <= 18 ? '10-18' : '18-60',
      pendidikan: item.edu,
      pekerjaan: item.job,
      ohisScore: item.ohis,
      ohisCategory: item.ohisCat,
      diagnosis: item.diagnosis,
      tindakan: item.tindakan,
      informedConsent: item.consent as any,
      riwayatPemeriksaan: item.history,
      isPriorityPatient: item.isPriority,
      catatanKhusus: item.catatan,
      gigiSulung: {
        sehat: 0,
        karies: 0,
        dicabutKaries: 0,
        tumpatanKaries: 0,
        tumpatanTanpaKaries: 0,
        dicabutSebabLain: 0,
        fissureSealant: 0,
        protesaCekat: 0,
        tidakTumbuh: 0,
        lainLain: 0
      },
      gigiTetap: {
        sehat: gtSehat,
        karies: gtKaries,
        dicabutKaries: gtDicabut,
        tumpatanKaries: 0,
        tumpatanTanpaKaries: gtTumpatan,
        dicabutSebabLain: 0,
        fissureSealant: 0,
        protesaCekat: 0,
        tidakTumbuh: 0,
        lainLain: 0
      },
      deft,
      dmft,
      mukosa: {
        gusiBerdarah: mukosaGusiBerdarah,
        lesiMukosaOral: mukosaLesi
      },
      tindakLanjut: {
        perluPerawatanSegera: perluSegera,
        perluPerawatanTidakSegera: !perluSegera && dmft > 0,
        perluDirujuk,
        dirujukKe: item.rujukan
      },
      lokasi_stan: 'Klinik Utama DentaSync Pro (Camp Nou)',
      latitude: 41.3809,
      longitude: 2.1228,
      createdBy: 'drg. Banny',
      createdAt: new Date().toISOString()
    };
  });
}

// 5. Alias generateMockRespondents to generateBarcelonaSquadRespondents
export function generateMockRespondents(): RespondentData[] {
  return generateBarcelonaSquadRespondents();
}
