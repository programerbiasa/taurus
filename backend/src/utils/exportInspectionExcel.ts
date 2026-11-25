import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { UnitInspection } from '../models/UnitInspection';

/**
 * Utility untuk membuat file Excel Resmi Formulir Inspeksi PT LANCAR JAYA MITRA ABADI
 * Berdasarkan template resmi contoh.xlsx (Sheet 1.FORM INSPEKSI)
 * - Format dinamis (otomatis menyesuaikan bila unit/item bertambah)
 * - Foto dokumentasi diletakkan di posisi PALING BAWAH setelah tanda tangan
 * - Menggunakan border presisi, warna sel resmi, font terbaca jelas, dan tata letak rapi
 */
export async function generateInspectionExcel(items: UnitInspection[], targetDateStr?: string): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const templatePath = path.join(__dirname, '../../templates/template_inspeksi_elma.xlsx');

  if (!fs.existsSync(templatePath)) {
    throw new Error('Template file tidak ditemukan di: ' + templatePath);
  }

  await wb.xlsx.readFile(templatePath);

  // Hapus Sheet 2 jika ada
  const ws2 = wb.getWorksheet('2. CONTOH INSPEKSI RADIO DLL');
  if (ws2) wb.removeWorksheet(ws2.id);

  const ws = wb.getWorksheet('1.FORM INSPEKSI');
  if (!ws) {
    throw new Error('Sheet 1.FORM INSPEKSI tidak ditemukan di dalam template.');
  }

  // Tanggal display (contoh: 24 November 2026)
  const displayDate = targetDateStr || items[0]?.inspection_date || new Date().toISOString().split('T')[0];
  const cleanDate = displayDate.includes('T') ? displayDate.split('T')[0] : displayDate;
  const [y, m, d] = cleanDate.split('-');
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const monthName = months[parseInt(m || '1', 10) - 1] || m;
  const formalDateText = `${parseInt(d || '1', 10)} ${monthName} ${y}`;

  // Update Tanggal di Subheader Kop (S3)
  const s3 = ws.getCell('S3');
  if (s3) s3.value = cleanDate;

  // Tangkap styling dan isi statis dari baris 10 s/d 24 (Unit 1)
  const templateRows: { height: number; cells: any[] }[] = [];
  for (let r = 10; r <= 24; r++) {
    const row = ws.getRow(r);
    const cells: any[] = [];
    for (let c = 1; c <= 19; c++) {
      const cell = row.getCell(c);
      cells.push({
        val: cell.value,
        font: cell.font ? { ...cell.font } : undefined,
        fill: cell.fill ? { ...cell.fill } : undefined,
        border: cell.border ? { ...cell.border } : undefined,
        alignment: cell.alignment ? { ...cell.alignment } : undefined,
        numFmt: cell.numFmt,
      });
    }
    templateRows.push({ height: row.height, cells });
  }

  // Hapus semua merge lama yang ada di row >= 10
  const existingMerges = [...(ws.model.merges || [])];
  for (const mg of existingMerges) {
    const match = mg.match(/[0-9]+/g);
    if (match && match.some(num => parseInt(num, 10) >= 10)) {
      try {
        ws.unMergeCells(mg);
      } catch (e) {
        // ignore
      }
    }
  }

  // Bersihkan isi dan format cell dari row >= 10 lama template agar tidak ada baris hantu
  const initialRowCount = ws.rowCount;
  for (let r = 10; r <= initialRowCount; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 19; c++) {
      const cell = row.getCell(c);
      cell.value = null;
      cell.fill = { type: 'pattern', pattern: 'none' } as any;
      cell.border = undefined as any;
      cell.font = undefined as any;
    }
  }

  const uploadDir = path.join(process.cwd(), 'uploads');
  const thinBorder = {
    top: { style: 'thin' as const },
    left: { style: 'thin' as const },
    bottom: { style: 'thin' as const },
    right: { style: 'thin' as const },
  };

  // Tulis setiap unit inspeksi secara dinamis (15 baris per unit)
  let currentRow = 10;
  const count = items.length > 0 ? items.length : 1;

  for (let i = 0; i < count; i++) {
    const it = items[i] || ({} as UnitInspection);
    const startRow = currentRow;
    const no = i + 1;

    const isRadioOk = it.radio_status === 'Ada/layak';
    const isCameraOk = (it.camera_status || it.camera_cabin_status) === 'Ada/layak';
    const isOpen = it.inspection_status === 'Open';
    const isClose = it.inspection_status === 'Close';

    // Data radio (1.1 - 1.4)
    const radioOkMap: Record<string, boolean> = {
      '1.1': (it.radio_kelistrikan || (isRadioOk ? 'Ada' : 'Tidak ada')) === 'Ada',
      '1.2': (it.radio_antena || (isRadioOk ? 'Ada' : 'Tidak ada')) === 'Ada',
      '1.3': (it.radio_kabel || (isRadioOk ? 'Ada' : 'Tidak ada')) === 'Ada',
      '1.4': (it.radio_chanel || (isRadioOk ? 'Ada' : 'Tidak ada')) === 'Ada',
    };

    // Data kamera (2.1 - 2.8)
    const cameraOkMap: Record<string, boolean> = {
      '2.1': (it.camera_kelistrikan || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada',
      '2.2': (it.camera_posisi || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada',
      '2.3': (it.camera_internet || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada',
      '2.4': (it.camera_gps || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada',
      '2.5': (it.camera_dascam || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada',
      '2.6': (it.camera_kabin || it.camera_cabin_status || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada',
      '2.7': (it.camera_fatigue || it.camera_fatigue_status || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada',
      '2.8': (it.camera_memcard || it.camera_penyimpanan || (isCameraOk ? 'Ada' : 'Tidak ada')) === 'Ada',
    };

    // Tulis 15 baris untuk unit ini
    for (let rIdx = 0; rIdx < 15; rIdx++) {
      const r = startRow + rIdx;
      const row = ws.getRow(r);
      const tpl = templateRows[rIdx];
      row.height = tpl.height;

      for (let c = 1; c <= 19; c++) {
        const cell = row.getCell(c);
        const tplCell = tpl.cells[c - 1];
        if (tplCell.font) cell.font = { ...tplCell.font };
        if (tplCell.fill) cell.fill = { ...tplCell.fill };
        if (tplCell.border) cell.border = { ...tplCell.border };
        if (tplCell.alignment) cell.alignment = { ...tplCell.alignment };
        if (tplCell.val !== null && tplCell.val !== undefined) {
          cell.value = tplCell.val;
        } else {
          cell.value = null;
        }
      }

      // Baris 14 dari blok adalah spacer row (pemisah antar unit)
      if (rIdx === 14) {
        continue;
      }

      // Nilai spesifik per baris
      if (rIdx === 0) {
        // Baris Header Radio (Row 0):
        row.getCell(2).value = no;
        row.getCell(3).value = it.site_location || 'BEK / BIANGAN';
        row.getCell(4).value = it.inspection_type || 'PM';
        row.getCell(5).value = it.unit_number || '-';
        row.getCell(6).value = it.old_unit_number || '';
        row.getCell(7).value = it.vehicle_brand || '-';
        row.getCell(8).value = it.vehicle_model || '-';
        row.getCell(9).value = null; // Kolom Foto di tabel dikosongkan (foto diletakkan di paling bawah)
        row.getCell(15).value = it.radio_notes || (isRadioOk ? 'OK' : 'Rusak / Tdk Ada');
        row.getCell(16).value = isOpen ? '1' : '';
        row.getCell(17).value = isClose ? '1' : '';
        row.getCell(18).value = it.inspection_date || cleanDate;
        row.getCell(19).value = it.inspector_name || 'Twom';
      } else if (rIdx >= 1 && rIdx <= 4) {
        // Sub-radio 1.1 - 1.4
        const subKey = `1.${rIdx}`;
        const isOk = radioOkMap[subKey];
        row.getCell(13).value = isOk ? 'Ada' : '';
        row.getCell(14).value = !isOk ? 'v' : '';
      } else if (rIdx === 5) {
        // Baris Header Kamera (Row 5):
        row.getCell(15).value = it.camera_notes || it.camera_cabin_notes || (isCameraOk ? 'OK' : 'Rusak / Tdk Ada');
      } else if (rIdx >= 6 && rIdx <= 13) {
        // Sub-kamera 2.1 - 2.8
        const subKey = `2.${rIdx - 5}`;
        const isOk = cameraOkMap[subKey];
        row.getCell(13).value = isOk ? 'Ada' : '';
        row.getCell(14).value = !isOk ? 'v' : '';
      }
    }

    // Merge Cells untuk Unit ini
    ws.mergeCells(startRow, 2, startRow + 13, 2); // B: NO.
    ws.mergeCells(startRow, 3, startRow + 13, 3); // C: SITE
    ws.mergeCells(startRow, 4, startRow + 13, 4); // D: JENIS
    ws.mergeCells(startRow, 5, startRow + 13, 5); // E: NO LAMBUNG
    ws.mergeCells(startRow, 6, startRow + 13, 6); // F: NO LAMBUNG LAMA
    ws.mergeCells(startRow, 7, startRow + 13, 7); // G: MERK
    ws.mergeCells(startRow, 8, startRow + 13, 8); // H: MODEL/TYPE

    // Foto Radio (Row 0..4, Col I)
    ws.mergeCells(startRow, 9, startRow + 4, 9);
    // Header Radio Rig (Cols K..N)
    ws.mergeCells(startRow, 11, startRow, 14);
    // Keterangan Radio (Row 0..4, Col O)
    ws.mergeCells(startRow, 15, startRow + 4, 15);

    // Foto Kamera (Row 5..13, Col I)
    ws.mergeCells(startRow + 5, 9, startRow + 13, 9);
    // No 2 Kamera (Row 5..13, Col J)
    ws.mergeCells(startRow + 5, 10, startRow + 13, 10);
    // Header Kamera (Cols K..N)
    ws.mergeCells(startRow + 5, 11, startRow + 5, 14);
    // Keterangan Kamera (Row 5..13, Col O)
    ws.mergeCells(startRow + 5, 15, startRow + 13, 15);

    // Status Open (Row 0..13, Col P)
    ws.mergeCells(startRow, 16, startRow + 13, 16);
    // Status Close (Row 0..13, Col Q)
    ws.mergeCells(startRow, 17, startRow + 13, 17);
    // Tgl Inspeksi (Row 0..13, Col R)
    ws.mergeCells(startRow, 18, startRow + 13, 18);
    // Ttd Penanggung Jawab (Row 0..13, Col S)
    ws.mergeCells(startRow, 19, startRow + 13, 19);

    // Spacer Row (Row 14, Cols B..S)
    ws.mergeCells(startRow + 14, 2, startRow + 14, 19);

    // Berikan warna kuning untuk Open, hijau untuk Close
    const openCell = ws.getCell(startRow, 16);
    if (isOpen) {
      openCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' }, // Kuning Terang
      };
      openCell.font = { bold: true, size: 14 };
      openCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    const closeCell = ws.getCell(startRow, 17);
    if (isClose) {
      closeCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF92D050' }, // Hijau Segar
      };
      closeCell.font = { bold: true, size: 14 };
      closeCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    currentRow += 15;
  }

  // Tanda Tangan di Kanan Bawah
  const sigStart = currentRow + 1;

  // Tanggal Biangan
  const dateCell = ws.getCell(sigStart, 15);
  dateCell.value = `Biangan, ${formalDateText}`;
  dateCell.font = { name: 'Calibri', size: 11, bold: false };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.mergeCells(sigStart, 15, sigStart, 19);

  // Judul Penanggung Jawab
  const pjCell = ws.getCell(sigStart + 1, 15);
  pjCell.value = 'Penanggung Jawab Inspeksi:';
  pjCell.font = { name: 'Calibri', size: 11, bold: true };
  pjCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.mergeCells(sigStart + 1, 15, sigStart + 1, 19);

  // Tabel TTD Header: Nama (O:P), Jabatan (Q:R), Ttd (S)
  const hRow = ws.getRow(sigStart + 2);
  hRow.height = 22;
  ws.getCell(sigStart + 2, 15).value = 'Nama';
  ws.getCell(sigStart + 2, 17).value = 'Jabatan';
  ws.getCell(sigStart + 2, 19).value = 'Ttd';

  for (let c = 15; c <= 19; c++) {
    const cell = hRow.getCell(c);
    cell.font = { name: 'Calibri', size: 11, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    cell.border = thinBorder;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
  ws.mergeCells(sigStart + 2, 15, sigStart + 2, 16);
  ws.mergeCells(sigStart + 2, 17, sigStart + 2, 18);

  const insp1 = items[0]?.inspector_name || 'Twom';
  const role1 = items[0]?.inspector_role || 'IT Support';
  const insp2 = items[0]?.inspector2_name && items[0]?.inspector2_name !== '-' ? items[0]?.inspector2_name : 'Ali';
  const role2 = items[0]?.inspector2_role && items[0]?.inspector2_role !== '-' ? items[0]?.inspector2_role : 'IT Support';

  // Baris Petugas 1
  const r1 = ws.getRow(sigStart + 3);
  r1.height = 30;
  r1.getCell(15).value = `1. ${insp1}`;
  r1.getCell(17).value = role1;
  r1.getCell(19).value = ''; // Ruang kosong untuk paraf / tanda tangan fisik
  for (let c = 15; c <= 19; c++) {
    const cell = r1.getCell(c);
    cell.font = { name: 'Calibri', size: 11 };
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', horizontal: c === 19 ? 'center' : 'left' };
  }
  ws.mergeCells(sigStart + 3, 15, sigStart + 3, 16);
  ws.mergeCells(sigStart + 3, 17, sigStart + 3, 18);

  // Baris Petugas 2
  const r2 = ws.getRow(sigStart + 4);
  r2.height = 30;
  r2.getCell(15).value = `2. ${insp2}`;
  r2.getCell(17).value = role2;
  r2.getCell(19).value = ''; // Ruang kosong untuk paraf / tanda tangan fisik
  for (let c = 15; c <= 19; c++) {
    const cell = r2.getCell(c);
    cell.font = { name: 'Calibri', size: 11 };
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', horizontal: c === 19 ? 'center' : 'left' };
  }
  ws.mergeCells(sigStart + 4, 15, sigStart + 4, 16);
  ws.mergeCells(sigStart + 4, 17, sigStart + 4, 18);

  // =========================================================================
  // LAMPIRAN DOKUMENTASI FOTO (SELALU DI POSISI PALING BAWAH SESUAI INSTRUKSI)
  // =========================================================================
  let photoRow = sigStart + 6;

  // Header Bagian Dokumentasi Foto
  const docHeaderRow = ws.getRow(photoRow);
  docHeaderRow.height = 26;
  const docHeaderCell = docHeaderRow.getCell(2);
  docHeaderCell.value = 'DOKUMENTASI FOTO FISIK INSPEKSI UNIT';
  docHeaderCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E293B' } };
  docHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 2; c <= 19; c++) {
    const cell = docHeaderRow.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2EFDA' }, // Hijau lembut senada
    };
    cell.border = thinBorder;
  }
  ws.mergeCells(photoRow, 2, photoRow, 19);

  photoRow += 2;

  // Tampilkan foto setiap unit di bagian bawah
  for (let i = 0; i < count; i++) {
    const it = items[i] || ({} as UnitInspection);
    const unitNo = it.unit_number || '-';
    const brandModel = `${it.vehicle_brand || ''} ${it.vehicle_model || ''}`.trim() || '-';

    // Subheader Unit
    const uHeaderRow = ws.getRow(photoRow);
    uHeaderRow.height = 22;
    const uHeaderCell = uHeaderRow.getCell(2);
    uHeaderCell.value = `UNIT #${i + 1}: ${unitNo} (${brandModel}) | Lokasi: ${it.site_location || 'BEK / BIANGAN'} | Tgl: ${it.inspection_date || cleanDate}`;
    uHeaderCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    uHeaderCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    for (let c = 2; c <= 19; c++) {
      const cell = uHeaderRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' },
      };
      cell.border = thinBorder;
    }
    ws.mergeCells(photoRow, 2, photoRow, 19);

    // Label Foto: Radio (B..I) dan Kamera (K..S), Kolom J pemisah
    const labelRow = ws.getRow(photoRow + 1);
    labelRow.height = 20;

    labelRow.getCell(2).value = 'Foto Radio Rig';
    for (let c = 2; c <= 9; c++) {
      const cell = labelRow.getCell(c);
      cell.font = { name: 'Calibri', size: 11, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      cell.border = thinBorder;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    ws.mergeCells(photoRow + 1, 2, photoRow + 1, 9);

    labelRow.getCell(11).value = 'Foto Kamera (Cabin / Fatigue)';
    for (let c = 11; c <= 19; c++) {
      const cell = labelRow.getCell(c);
      cell.font = { name: 'Calibri', size: 11, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      cell.border = thinBorder;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    ws.mergeCells(photoRow + 1, 11, photoRow + 1, 19);

    // Box area foto (14 baris per box, tinggi 18pt per baris)
    const boxStartRow = photoRow + 2;
    const boxEndRow = photoRow + 15;

    for (let br = boxStartRow; br <= boxEndRow; br++) {
      const bRow = ws.getRow(br);
      bRow.height = 18;
      for (let c = 2; c <= 9; c++) {
        bRow.getCell(c).border = thinBorder;
      }
      for (let c = 11; c <= 19; c++) {
        bRow.getCell(c).border = thinBorder;
      }
    }

    ws.mergeCells(boxStartRow, 2, boxEndRow, 9);   // Box Radio: B..I
    ws.mergeCells(boxStartRow, 11, boxEndRow, 19); // Box Kamera: K..S

    // 1. Embed Foto Radio Rig
    let hasRadioImg = false;
    if (it.radio_photo_url) {
      const radioFilename = path.basename(it.radio_photo_url);
      const radioPath = path.join(uploadDir, radioFilename);
      if (fs.existsSync(radioPath)) {
        try {
          const imgExt = radioFilename.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
          const imgId = wb.addImage({
            filename: radioPath,
            extension: imgExt,
          });
          ws.addImage(imgId, {
            tl: { col: 1.1, row: boxStartRow - 0.9 },
            br: { col: 8.9, row: boxEndRow + 0.9 },
            editAs: 'oneCell',
          } as any);
          hasRadioImg = true;
        } catch (e) {
          console.error('Error adding radio image to bottom section:', e);
        }
      }
    }
    if (!hasRadioImg) {
      const emptyCell = ws.getCell(boxStartRow, 2);
      emptyCell.value = '- Tidak ada foto radio -';
      emptyCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
      emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // 2. Embed Foto Kamera
    let hasCamImg = false;
    const camUrl = it.camera_photo_url || it.photo_url;
    if (camUrl) {
      const camFilename = path.basename(camUrl);
      const camPath = path.join(uploadDir, camFilename);
      if (fs.existsSync(camPath)) {
        try {
          const imgExt = camFilename.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
          const imgId = wb.addImage({
            filename: camPath,
            extension: imgExt,
          });
          ws.addImage(imgId, {
            tl: { col: 10.1, row: boxStartRow - 0.9 },
            br: { col: 18.9, row: boxEndRow + 0.9 },
            editAs: 'oneCell',
          } as any);
          hasCamImg = true;
        } catch (e) {
          console.error('Error adding camera image to bottom section:', e);
        }
      }
    }
    if (!hasCamImg) {
      const emptyCell = ws.getCell(boxStartRow, 11);
      emptyCell.value = '- Tidak ada foto kamera -';
      emptyCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
      emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Spacer antar unit di bagian foto
    photoRow = boxEndRow + 2;
  }

  return wb;
}
