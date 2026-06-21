import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { db } from './database.js';
import { excelSync } from './excel_sync.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Robust helper to parse numbers and avoid NaN values
const getNumeric = (val) => {
  if (val === undefined || val === null) return 0;
  const num = parseFloat(String(val).replace(/,/g, '').trim());
  return isNaN(num) ? 0 : num;
};

// Auto-seed database from Excel if Supabase tables are empty
(async () => {
  try {
    const currentDb = await db.read();
    if (currentDb.yarn.length === 0 && currentDb.thread.length === 0) {
      console.log('Supabase database is empty. Auto-seeding from Yarn Follow up.xlsx...');
      const result = await excelSync.importFromExcel();
      console.log(`Auto-seeded: ${result.yarnCount} yarn records, ${result.threadCount} thread records.`);
    }
  } catch (error) {
    console.error('Failed to auto-seed database from Excel:', error.message);
  }
})();

// Helper to parse dates for sorting
const parseToDate = (val) => {
  if (!val) return new Date(0);
  
  const strVal = String(val).trim();
  if (!strVal || strVal.toLowerCase() === 'n/a' || strVal.toLowerCase() === 'tba') {
    return new Date(0);
  }
  
  // 1. Check if it matches YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdRegex = /^(\d{4})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])$/;
  const ymdMatch = strVal.match(ymdRegex);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day);
  }
  
  // 2. Check if it matches DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyRegex = /^(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](\d{4})$/;
  const dmyMatch = strVal.match(dmyRegex);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day);
  }

  // 3. Check if it matches DD-MM-YY or DD/MM/YY or DD.MM.YY
  const dmyShortRegex = /^(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](\d{2})$/;
  const dmyShortMatch = strVal.match(dmyShortRegex);
  if (dmyShortMatch) {
    const day = parseInt(dmyShortMatch[1], 10);
    const month = parseInt(dmyShortMatch[2], 10) - 1;
    let year = parseInt(dmyShortMatch[3], 10);
    year += year < 50 ? 2000 : 1900; // Pivot year 50
    return new Date(year, month, day);
  }
  
  // 4. Check if it's an Excel serial number
  const num = parseFloat(strVal);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    return new Date((num - 25569) * 86400 * 1000);
  }
  
  // 5. Try standard parser
  const parsed = Date.parse(strVal);
  return isNaN(parsed) ? new Date(0) : new Date(parsed);
};

// Helper to filter and paginate array
function getFilteredRecords(list, search = '', status = '', page = 1, limit = 50) {
  let filtered = [...list];
  
  // Apply Search
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(item => {
      return Object.entries(item).some(([key, val]) => {
        if (key === 'RowNumber') return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }
  
  // Apply Status Filter
  if (status) {
    filtered = filtered.filter(item => {
      const demand = getNumeric(item["Demand Ton"] || item["Demand"]);
      const receive = getNumeric(item["Receive (Ton)"] || item["Receive"]);
      
      if (status === 'fully_received') {
        return demand > 0 && receive >= demand;
      } else if (status === 'not_received') {
        return receive === 0 && demand > 0;
      } else if (status === 'partially_received') {
        return receive > 0 && receive < demand;
      } else if (status === 'over_received') {
        return receive > demand;
      }
      return true;
    });
  }

  // Sort by SPR Date descending, and secondary by SPR No / SAP PR descending
  filtered.sort((a, b) => {
    const dateA = parseToDate(a["SPR Date"]);
    const dateB = parseToDate(b["SPR Date"]);
    
    if (dateA.getTime() !== dateB.getTime()) {
      if (dateA.getTime() === 0) return 1;
      if (dateB.getTime() === 0) return -1;
      return dateB - dateA;
    }
    
    const prA = String(a["SPR No / SAP PR"] || '');
    const prB = String(b["SPR No / SAP PR"] || '');
    return prB.localeCompare(prA, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Calculate stats before paginating
  const total = filtered.length;
  
  // Paginate
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const endIndex = startIndex + parseInt(limit);
  const paginated = filtered.slice(startIndex, endIndex);
  
  return {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
    records: paginated
  };
}

function getFilteredRecordsWithoutPagination(list, search = '', status = '') {
  let filtered = [...list];
  
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(item => {
      return Object.entries(item).some(([key, val]) => {
        if (key === 'RowNumber') return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }
  
  if (status) {
    filtered = filtered.filter(item => {
      const demand = getNumeric(item["Demand Ton"] || item["Demand"]);
      const receive = getNumeric(item["Receive (Ton)"] || item["Receive"]);
      
      if (status === 'fully_received') {
        return demand > 0 && receive >= demand;
      } else if (status === 'not_received') {
        return receive === 0 && demand > 0;
      } else if (status === 'partially_received') {
        return receive > 0 && receive < demand;
      } else if (status === 'over_received') {
        return receive > demand;
      }
      return true;
    });
  }

  filtered.sort((a, b) => {
    const dateA = parseToDate(a["SPR Date"]);
    const dateB = parseToDate(b["SPR Date"]);
    
    if (dateA.getTime() !== dateB.getTime()) {
      if (dateA.getTime() === 0) return 1;
      if (dateB.getTime() === 0) return -1;
      return dateB - dateA;
    }
    
    const prA = String(a["SPR No / SAP PR"] || '');
    const prB = String(b["SPR No / SAP PR"] || '');
    return prB.localeCompare(prA, undefined, { numeric: true, sensitivity: 'base' });
  });

  return filtered;
}

// --- Yarn API Endpoints ---
app.get('/api/yarn/metadata', async (req, res) => {
  try {
    const list = await db.getYarn();
    const fields = ["Demanded Count", "Article", "Buyer", "Mkt", "Required Supplier"];
    const uniqueValues = {};
    fields.forEach(f => {
      const unique = [...new Set(list.map(item => item[f] ? String(item[f]).trim() : '').filter(Boolean))];
      uniqueValues[f] = unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    });

    const maxSerial = list.reduce((maxVal, r) => {
      const val = parseInt(r.Serial, 10);
      return !isNaN(val) && val > maxVal ? val : maxVal;
    }, 0);
    const nextSerial = maxSerial + 1;

    res.json({ uniqueValues, nextSerial });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/yarn', async (req, res) => {
  try {
    const { search, status, page, limit } = req.query;
    const list = await db.getYarn();
    const result = getFilteredRecords(list, search, status, page, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/yarn/download', async (req, res) => {
  try {
    const { search, status } = req.query;
    const list = await db.getYarn();
    const result = getFilteredRecordsWithoutPagination(list, search, status);
    
    const excelFile = path.join(process.cwd(), 'Yarn_Filtered_Report.xlsx');
    await excelSync.exportSingleSheetToExcel(result, true, excelFile);
    
    res.download(excelFile, 'Yarn_Follow_Up_Management_Report.xlsx', (err) => {
      if (fs.existsSync(excelFile)) {
        fs.unlinkSync(excelFile);
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/yarn', async (req, res) => {
  try {
    const newRecord = await db.createYarn(req.body);
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/yarn/:rowNumber', async (req, res) => {
  try {
    const { rowNumber } = req.params;
    const updated = await db.updateYarn(rowNumber, req.body);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Record not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/yarn/:rowNumber', async (req, res) => {
  try {
    const { rowNumber } = req.params;
    const deleted = await db.deleteYarn(rowNumber);
    if (deleted) {
      res.json({ message: 'Record deleted successfully', record: deleted });
    } else {
      res.status(404).json({ error: 'Record not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Sewing Thread API Endpoints ---
app.get('/api/thread/metadata', async (req, res) => {
  try {
    const list = await db.getThread();
    const fields = ["Demanded Count", "Article", "Buyer", "Mkt", "Required Supplier"];
    const uniqueValues = {};
    fields.forEach(f => {
      const unique = [...new Set(list.map(item => item[f] ? String(item[f]).trim() : '').filter(Boolean))];
      uniqueValues[f] = unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    });

    const maxSerial = list.reduce((maxVal, r) => {
      const val = parseInt(r.Serial, 10);
      return !isNaN(val) && val > maxVal ? val : maxVal;
    }, 0);
    const nextSerial = maxSerial + 1;

    res.json({ uniqueValues, nextSerial });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/thread', async (req, res) => {
  try {
    const { search, status, page, limit } = req.query;
    const list = await db.getThread();
    const result = getFilteredRecords(list, search, status, page, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/thread/download', async (req, res) => {
  try {
    const { search, status } = req.query;
    const list = await db.getThread();
    const result = getFilteredRecordsWithoutPagination(list, search, status);
    
    const excelFile = path.join(process.cwd(), 'Thread_Filtered_Report.xlsx');
    await excelSync.exportSingleSheetToExcel(result, false, excelFile);
    
    res.download(excelFile, 'Sewing_Thread_Tracking_Report.xlsx', (err) => {
      if (fs.existsSync(excelFile)) {
        fs.unlinkSync(excelFile);
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/thread', async (req, res) => {
  try {
    const newRecord = await db.createThread(req.body);
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/thread/:rowNumber', async (req, res) => {
  try {
    const { rowNumber } = req.params;
    const updated = await db.updateThread(rowNumber, req.body);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Record not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/thread/:rowNumber', async (req, res) => {
  try {
    const { rowNumber } = req.params;
    const deleted = await db.deleteThread(rowNumber);
    if (deleted) {
      res.json({ message: 'Record deleted successfully', record: deleted });
    } else {
      res.status(404).json({ error: 'Record not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Analytics Endpoint ---
app.get('/api/analytics', async (req, res) => {
  try {
    const yarn = await db.getYarn();
    const thread = await db.getThread();

    const getMetrics = (list, isYarn) => {
      let demanded = 0;
      let received = 0;
      let yet = 0;
      let completed = 0;
      let partial = 0;
      let notStarted = 0;
      let over = 0;

      const buyerMap = {};
      const supplierMap = {};

      list.forEach(item => {
        const d = getNumeric(item["Demand Ton"] || item["Demand"]);
        const r = getNumeric(item["Receive (Ton)"] || item["Receive"]);
        const y = getNumeric(item["Yet to Receive"] || (d - r));

        demanded += d;
        received += r;
        yet += y;

        if (d === 0) {
          if (r > 0) over++; else completed++;
        } else if (r === 0) {
          notStarted++;
        } else if (r >= d) {
          if (r > d) over++; else completed++;
        } else {
          partial++;
        }

        const buyer = item.Buyer || '(Blank)';
        if (!buyerMap[buyer]) buyerMap[buyer] = { demanded: 0, received: 0, count: 0 };
        buyerMap[buyer].demanded += d;
        buyerMap[buyer].received += r;
        buyerMap[buyer].count++;

        const supplier = item["PI /Actual Supplier"] || item["Required Supplier"] || '(Blank)';
        if (!supplierMap[supplier]) supplierMap[supplier] = { demanded: 0, received: 0, count: 0 };
        supplierMap[supplier].demanded += d;
        supplierMap[supplier].received += r;
        supplierMap[supplier].count++;
      });

      const topBuyers = Object.entries(buyerMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.demanded - a.demanded)
        .slice(0, 10);

      const topSuppliers = Object.entries(supplierMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.demanded - a.demanded)
        .slice(0, 10);

      return {
        demanded,
        received,
        yet,
        orders: list.length,
        status: { completed, partial, notStarted, over },
        topBuyers,
        topSuppliers
      };
    };

    res.json({
      yarn: getMetrics(yarn, true),
      thread: getMetrics(thread, false)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Excel Sync endpoints ---
app.post('/api/sync/import', async (req, res) => {
  try {
    const result = await excelSync.importFromExcel();
    res.json({ message: 'Import completed successfully', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all database records
app.post('/api/sync/clear', async (req, res) => {
  try {
    const success = await db.clear();
    if (success) {
      res.json({ message: 'All database records successfully cleared.' });
    } else {
      res.status(500).json({ error: 'Failed to clear database.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload and sync a manually provided Excel file
app.post('/api/sync/upload', async (req, res) => {
  try {
    const { fileData } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'No file data received.' });
    }
    
    // Decode Base64 string to buffer
    const buffer = Buffer.from(fileData, 'base64');
    
    // Parse the buffer and write to the database
    const result = await excelSync.importFromBuffer(buffer);
    res.json({ message: 'Import completed successfully', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync/export', async (req, res) => {
  try {
    await excelSync.exportToExcel();
    res.json({ message: 'Export completed successfully. XLSX file updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sync/download', async (req, res) => {
  try {
    await excelSync.exportToExcel();
    const excelFile = path.join(process.cwd(), 'Yarn Follow up.xlsx');
    res.download(excelFile, 'Yarn_Follow_Up_Management_Report.xlsx');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Authentication & User Control Endpoints ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    let users = [];
    try {
      users = await db.getUsers();
    } catch (dbErr) {
      console.warn('Database user read failed, checking fallback credentials:', dbErr.message);
    }
    
    if (users.length === 0) {
      if (username.toLowerCase() === 'admin' && password === 'admin') {
        return res.json({ success: true, user: { username: 'admin', isFallback: true } });
      }
      return res.status(401).json({ error: 'Invalid credentials. (Note: Database users table is empty, use admin/admin)' });
    }
    
    const matchedUser = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (matchedUser) {
      return res.json({ success: true, user: { id: matchedUser.id, username: matchedUser.username } });
    }
    
    return res.status(401).json({ error: 'Invalid username or password' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (err) {
    if (err.message && err.message.includes('does not exist')) {
      return res.json([{ id: 0, username: 'admin', password: 'admin', isFallback: true }]);
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const newUser = await db.createUser({ username, password });
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const updated = await db.updateUser(id, { username, password });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === 0) {
    return res.status(400).json({ error: 'Cannot delete the fallback administrator account' });
  }
  try {
    const deleted = await db.deleteUser(id);
    res.json({ message: 'User deleted successfully', user: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend statically in production
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Coworkers can access on http://<your-ip>:${PORT}`);
});
