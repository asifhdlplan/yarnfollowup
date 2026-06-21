import XLSX from 'xlsx';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');
import path from 'path';
import fs from 'fs';
import { db } from './database.js';

const EXCEL_PATH = path.join(process.cwd(), 'Yarn Follow up.xlsx');

// Helper to convert column index to letter
function idxToColLetter(idx) {
  let temp = idx;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Convert Excel serial date to YYYY-MM-DD
function convertExcelDate(val) {
  if (!val) return '';
  const num = parseFloat(val);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const date = new Date((num - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  return String(val);
}

// Auto-detect which row contains headers by scanning for "serial" or "spr"
function detectHeaderRow(sheet) {
  const ref = sheet['!ref'];
  if (!ref) return 2; // Default to Row 3 (index 2)
  const range = XLSX.utils.decode_range(ref);
  for (let r = range.s.r; r <= Math.min(range.e.r, 10); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      if (cell && cell.v !== undefined) {
        const val = String(cell.v).toLowerCase();
        if (val.includes('serial') || val.includes('spr no') || val.includes('sap pr')) {
          return r;
        }
      }
    }
  }
  return 2; // Fallback
}

// Parse worksheet
function parseSheet(sheet) {
  const data = [];
  const headers = {};
  
  const ref = sheet['!ref'];
  if (!ref) return { headers, data };
  
  const headerRowIdx = detectHeaderRow(sheet);
  const range = XLSX.utils.decode_range(ref);
  const endRow = range.e.r;
  const startCol = range.s.c;
  const endCol = range.e.c;
  
  // Read Headers
  for (let c = startCol; c <= endCol; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    const cell = sheet[cellRef];
    if (cell && cell.v !== undefined) {
      const hName = String(cell.v).replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
      headers[c] = hName;
    }
  }
  
  // Read Data rows
  for (let r = headerRowIdx + 1; r <= endRow; r++) {
    // Skip summary/totals row but keep reading subsequent rows
    const firstCellRef = XLSX.utils.encode_cell({ r, c: 0 });
    const firstCell = sheet[firstCellRef];
    if (firstCell && String(firstCell.v).toLowerCase().includes('total')) {
      continue;
    }

    let isEmpty = true;
    const rowObj = { RowNumber: r + 1 };
    const maxActiveCol = Math.max(...Object.keys(headers).map(Number), 25);
    
    for (let c = startCol; c <= maxActiveCol; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      let val = '';
      
      if (cell && cell.v !== undefined) {
        val = String(cell.v).trim();
        isEmpty = false;
      }
      
      const hName = headers[c] || `Col${c}`;
      
      if (hName.toLowerCase().includes('date') || hName.toLowerCase().includes('asking') || hName.toLowerCase().includes('procurement')) {
        rowObj[hName] = convertExcelDate(val);
      } else {
        rowObj[hName] = val;
      }
    }
    
    if (!isEmpty) {
      data.push(rowObj);
    }
  }
  
  return { headers, data };
}

// Custom generator for formal styled management report sheets using exceljs
async function generateFormalSheet(workbook, dataList, isYarn) {
  const sheet = workbook.addWorksheet(isYarn ? 'Yarn follow up' : 'Sewing thread', {
    views: [{ showGridLines: true }]
  });
  
  const headers = isYarn ? [
    "Serial", "SPR No / SAP PR", "SPR Date", "Article", "Buyer", "Mkt", "Order Quantity", "Demanded Count", 
    "Required Supplier", "Costing Price $", "Certification / Speciality", "Yarn TC NO", "TC Status", 
    "Demand Ton", "Receive (Ton)", "Yet to Receive", "PPC Asking (1st)", "Procurement", 
    "Actual delivery date", "PI /Actual Supplier", "PI No/SAP PO", "PI Date", "LC Open", "LC No", "LC Kg", "Remarks"
  ] : [
    "Serial", "SPR No / SAP PR", "SPR Date", "Article", "Buyer", "Mkt", "Order Quantity", "Demanded Count", 
    "Required Supplier", "Costing Price $", "Demand", "Receive", "Yet to Receive", "PPC Asking (1st)", 
    "Procurement 1st Cons", "Actual delivery date", "PI /Actual Supplier", "PI No/SAP PO", "PI Date", 
    "LC Open", "LC No", "LC Kg", "Remarks"
  ];

  const endColIdx = headers.length;
  
  // Row 1: Title Block
  const titleRow = sheet.getRow(1);
  titleRow.height = 40;
  sheet.mergeCells(1, 1, 1, endColIdx);
  const titleCell = titleRow.getCell(1);
  titleCell.value = isYarn 
    ? "Yarn Demand Report Summary - HDL"
    : "HA-MEEM GROUP - SEWING THREAD PROCUREMENT TRACKING REPORT";
  titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1F497D' }
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Row 2: Subtitle
  const subtitleRow = sheet.getRow(2);
  subtitleRow.height = 24;
  sheet.mergeCells(2, 1, 2, endColIdx);
  const subtitleCell = subtitleRow.getCell(1);
  subtitleCell.value = `Report Generation Date: ${new Date().toLocaleDateString('en-GB')} | Status: Confidential Active Database`;
  subtitleCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'E0E0E0' } };
  subtitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '366092' }
  };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Row 3: Spacer Row
  const spacerRow = sheet.getRow(3);
  spacerRow.height = 12;
  for (let c = 1; c <= endColIdx; c++) {
    spacerRow.getCell(c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F2F2F2' }
    };
  }

  // Row 4: Column Headers
  const headerRow = sheet.getRow(4);
  headerRow.height = 30;
  for (let c = 0; c < headers.length; c++) {
    const cell = headerRow.getCell(c + 1);
    cell.value = headers[c];
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2C5E8A' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'D3D3D3' } },
      left: { style: 'thin', color: { argb: 'D3D3D3' } },
      bottom: { style: 'medium', color: { argb: '1F497D' } },
      right: { style: 'thin', color: { argb: 'D3D3D3' } }
    };
  }

  // Rows 5+: Data Rows
  const startRow = 5;
  for (let i = 0; i < dataList.length; i++) {
    const rowData = dataList[i];
    const rIdx = startRow + i;
    const row = sheet.getRow(rIdx);
    row.height = 20;
    
    const isEven = i % 2 === 1;
    const rowBgColor = isEven ? 'F2F5F8' : 'FFFFFF';
    
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      const val = rowData[key];
      const cell = row.getCell(c + 1);
      
      let alignment = { vertical: 'middle', horizontal: 'left' };
      let numFormat = null;
      let cellType = 'string';
      let parsedVal = val === undefined || val === null ? '' : val;
      
      const lowerKey = key.toLowerCase();
      
      if (lowerKey === 'serial' || lowerKey.includes('pr no') || lowerKey.includes('lc no') || lowerKey.includes('tc no')) {
        alignment = { vertical: 'middle', horizontal: 'center' };
        parsedVal = String(parsedVal).trim();
      } else if (lowerKey.includes('date')) {
        alignment = { vertical: 'middle', horizontal: 'center' };
        parsedVal = String(parsedVal).trim();
      } else if (
        lowerKey.includes('quantity') || 
        (lowerKey.includes('demand') && !lowerKey.includes('count')) || 
        lowerKey.includes('receive') || 
        lowerKey.includes('price') || 
        lowerKey.includes('kg')
      ) {
        alignment = { vertical: 'middle', horizontal: 'right' };
        if (parsedVal !== '') {
          const num = parseFloat(String(parsedVal).replace(/,/g, '').trim());
          if (!isNaN(num)) {
            parsedVal = num;
            cellType = 'number';
            if (lowerKey.includes('price')) {
              numFormat = '$#,##0.00';
            } else if (lowerKey.includes('quantity')) {
              numFormat = '#,##0';
            } else {
              numFormat = '#,##0.00';
            }
          }
        }
      }
      
      cell.value = parsedVal;
      if (cellType === 'number') {
        cell.numFmt = numFormat;
      }
      
      cell.font = { name: 'Segoe UI', size: 9, color: { argb: '333333' } };
      cell.alignment = alignment;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBgColor }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } }
      };
    }
  }

  // Summary Row (Row 5 + N)
  const summaryRowIdx = startRow + dataList.length;
  const summaryRow = sheet.getRow(summaryRowIdx);
  summaryRow.height = 24;
  
  const summaryFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'DCE6F1' }
  };
  const summaryBorder = {
    top: { style: 'thin', color: { argb: 'B0C4DE' } },
    bottom: { style: 'double', color: { argb: '000000' } },
    left: { style: 'thin', color: { argb: 'E0E0E0' } },
    right: { style: 'thin', color: { argb: 'E0E0E0' } }
  };
  
  const labelEndCol = isYarn ? 13 : 10;
  sheet.mergeCells(summaryRowIdx, 1, summaryRowIdx, labelEndCol);
  
  const labelCell = summaryRow.getCell(1);
  labelCell.value = "TOTAL SUMMARY";
  labelCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '1F497D' } };
  labelCell.alignment = { vertical: 'middle', horizontal: 'right' };
  
  for (let c = 1; c <= endColIdx; c++) {
    const cell = summaryRow.getCell(c);
    cell.fill = summaryFill;
    cell.border = summaryBorder;
  }
  
  const endCellRow = summaryRowIdx - 1;
  
  if (isYarn) {
    const cols = [14, 15, 16];
    cols.forEach(colIdx => {
      const colLetter = idxToColLetter(colIdx - 1);
      const cell = summaryRow.getCell(colIdx);
      cell.value = {
        formula: `SUM(${colLetter}${startRow}:${colLetter}${endCellRow})`,
        result: 0
      };
      cell.numFmt = '#,##0.00';
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '1F497D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    });
  } else {
    const cols = [11, 12, 13];
    cols.forEach(colIdx => {
      const colLetter = idxToColLetter(colIdx - 1);
      const cell = summaryRow.getCell(colIdx);
      cell.value = {
        formula: `SUM(${colLetter}${startRow}:${colLetter}${endCellRow})`,
        result: 0
      };
      cell.numFmt = '#,##0.00';
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '1F497D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    });
  }

  sheet.columns = headers.map(col => {
    let width = 15;
    if (col === "Serial") width = 8;
    else if (col === "SPR No / SAP PR") width = 18;
    else if (col === "SPR Date" || col === "PI Date" || col === "Actual delivery date") width = 15;
    else if (col === "Article") width = 25;
    else if (col === "Buyer" || col === "PI /Actual Supplier" || col === "Required Supplier") width = 22;
    else if (col === "Demand Ton" || col === "Receive (Ton)" || col === "Yet to Receive" || col === "Demand" || col === "Receive") width = 16;
    else if (col === "Remarks") width = 35;
    
    return { key: col, width: width };
  });

  sheet.getRow(1).height = 40;
  sheet.getRow(2).height = 24;
  sheet.getRow(3).height = 12;
  sheet.getRow(4).height = 30;
  for (let i = 0; i < dataList.length; i++) {
    sheet.getRow(startRow + i).height = 20;
  }
  sheet.getRow(summaryRowIdx).height = 24;
}

export const excelSync = {
  async importFromExcel() {
    if (!fs.existsSync(EXCEL_PATH)) {
      throw new Error(`Excel file not found at ${EXCEL_PATH}`);
    }
    
    const workbook = XLSX.readFile(EXCEL_PATH);
    const yarnSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('yarn'));
    const threadSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('thread'));
    
    if (!yarnSheetName) {
      throw new Error('Yarn follow up sheet not found in workbook');
    }
    
    const yarnSheetObj = workbook.Sheets[yarnSheetName];
    const { data: yarnData } = parseSheet(yarnSheetObj);
    
    let threadData = [];
    if (threadSheetName) {
      const threadSheetObj = workbook.Sheets[threadSheetName];
      const parsed = parseSheet(threadSheetObj);
      threadData = parsed.data;
    }
    
    const newDb = {
      yarn: yarnData,
      thread: threadData
    };
    const success = await db.write(newDb);
    if (!success) {
      throw new Error('Failed to write data to Supabase cloud database.');
    }
    
    return {
      yarnCount: yarnData.length,
      threadCount: threadData.length
    };
  },

  async importFromBuffer(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const yarnSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('yarn'));
    const threadSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('thread'));
    
    if (!yarnSheetName) {
      throw new Error('Yarn follow up sheet not found in workbook');
    }
    
    const yarnSheetObj = workbook.Sheets[yarnSheetName];
    const { data: yarnData } = parseSheet(yarnSheetObj);
    
    let threadData = [];
    if (threadSheetName) {
      const threadSheetObj = workbook.Sheets[threadSheetName];
      const parsed = parseSheet(threadSheetObj);
      threadData = parsed.data;
    }
    
    const newDb = {
      yarn: yarnData,
      thread: threadData
    };
    
    const success = await db.write(newDb);
    if (!success) {
      throw new Error('Failed to write data to Supabase cloud database.');
    }
    
    return {
      yarnCount: yarnData.length,
      threadCount: threadData.length
    };
  },

  async exportToExcel() {
    const currentDb = await db.read();
    const workbook = new ExcelJS.Workbook();
    await generateFormalSheet(workbook, currentDb.yarn, true);
    await generateFormalSheet(workbook, currentDb.thread, false);
    await workbook.xlsx.writeFile(EXCEL_PATH);
    return true;
  },

  async exportSingleSheetToExcel(dataList, isYarn, outputPath) {
    const workbook = new ExcelJS.Workbook();
    await generateFormalSheet(workbook, dataList, isYarn);
    await workbook.xlsx.writeFile(outputPath);
    return true;
  }
};
