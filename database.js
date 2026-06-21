import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('WARNING: SUPABASE_URL or SUPABASE_KEY is missing from environment. Database connection will fail.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Allowed database schema columns for Yarn
const YARN_COLUMNS = [
  "RowNumber", "Serial", "SPR No / SAP PR", "SPR Date", "Article", "Buyer", "Mkt", "Order Quantity", "Demanded Count", 
  "Required Supplier", "Costing Price $", "Certification / Speciality", "Yarn TC NO", "TC Status", 
  "Demand Ton", "Receive (Ton)", "Yet to Receive", "PPC Asking (1st)", "Procurement", 
  "Actual delivery date", "PI /Actual Supplier", "PI No/SAP PO", "PI Date", "LC Open", "LC No", "LC Kg", "Remarks"
];

// Allowed database schema columns for Sewing Thread
const THREAD_COLUMNS = [
  "RowNumber", "Serial", "SPR No / SAP PR", "SPR Date", "Article", "Buyer", "Mkt", "Order Quantity", "Demanded Count", 
  "Required Supplier", "Costing Price $", "Demand", "Receive", "Yet to Receive", "PPC Asking (1st)", 
  "Procurement 1st Cons", "Actual delivery date", "PI /Actual Supplier", "PI No/SAP PO", "PI Date", 
  "LC Open", "LC No", "LC Kg", "Remarks"
];

// Robust helper to parse numbers and avoid NaN values
const getNumeric = (val) => {
  if (val === undefined || val === null) return 0;
  const num = parseFloat(String(val).replace(/,/g, '').trim());
  return isNaN(num) ? 0 : num;
};

// Helper to filter out keys that don't match the database schema columns
const sanitizeRecord = (record, allowedColumns) => {
  const sanitized = {};
  allowedColumns.forEach(col => {
    if (record[col] !== undefined) {
      sanitized[col] = record[col];
    }
  });
  return sanitized;
};

export const db = {
  // Sync wrapper (returns promise) to check database seeding status
  async read() {
    try {
      const yarn = await this.getYarn();
      const thread = await this.getThread();
      return { yarn, thread };
    } catch (error) {
      console.error('Failed to read database from Supabase:', error);
      return { yarn: [], thread: [] };
    }
  },

  // Overwrite entire database (used for Excel import sync)
  async write(data) {
    try {
      // 1. Delete all existing records (where RowNumber >= 0)
      const { error: deleteYarnError } = await supabase
        .from('yarn')
        .delete()
        .gte('RowNumber', 0);
      if (deleteYarnError) throw deleteYarnError;
      
      const { error: deleteThreadError } = await supabase
        .from('thread')
        .delete()
        .gte('RowNumber', 0);
      if (deleteThreadError) throw deleteThreadError;
      
      // 2. Batch insert Yarn records in chunks of 200
      if (data.yarn && data.yarn.length > 0) {
        const batchSize = 200;
        for (let i = 0; i < data.yarn.length; i += batchSize) {
          const batch = data.yarn.slice(i, i + batchSize).map(item => {
            const demand = getNumeric(item["Demand Ton"]);
            const receive = getNumeric(item["Receive (Ton)"]);
            const cleaned = {
              ...item,
              "Yet to Receive": (demand - receive).toFixed(2)
            };
            return sanitizeRecord(cleaned, YARN_COLUMNS);
          });
          
          const { error: insertYarnError } = await supabase
            .from('yarn')
            .insert(batch);
          if (insertYarnError) throw insertYarnError;
        }
      }
      
      // 3. Batch insert Thread records in chunks of 200
      if (data.thread && data.thread.length > 0) {
        const batchSize = 200;
        for (let i = 0; i < data.thread.length; i += batchSize) {
          const batch = data.thread.slice(i, i + batchSize).map(item => {
            const demand = getNumeric(item["Demand"]);
            const receive = getNumeric(item["Receive"]);
            const cleaned = {
              ...item,
              "Yet to Receive": (demand - receive).toFixed(2)
            };
            return sanitizeRecord(cleaned, THREAD_COLUMNS);
          });
          
          const { error: insertThreadError } = await supabase
            .from('thread')
            .insert(batch);
          if (insertThreadError) throw insertThreadError;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to write bulk data to Supabase:', error.message);
      return false;
    }
  },

  // --- Yarn Operations ---
  async getYarn() {
    let allData = [];
    let from = 0;
    let to = 999;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('yarn')
        .select('*')
        .range(from, to);
        
      if (error) {
        console.error('Supabase getYarn error:', error.message);
        throw error;
      }
      
      if (data && data.length > 0) {
        allData = allData.concat(data);
        from += 1000;
        to += 1000;
      } else {
        hasMore = false;
      }
    }
    return allData;
  },

  async updateYarn(rowNumber, updatedFields) {
    // 1. Fetch existing record to merge fields safely
    const { data: existing, error: fetchError } = await supabase
      .from('yarn')
      .select('*')
      .eq('RowNumber', parseInt(rowNumber))
      .single();
      
    if (fetchError) throw fetchError;
    if (!existing) return null;
    
    // 2. Merge changes
    const merged = { ...existing, ...updatedFields };
    
    // 3. Re-calculate Yet to Receive
    const demand = getNumeric(merged["Demand Ton"]);
    const receive = getNumeric(merged["Receive (Ton)"]);
    merged["Yet to Receive"] = (demand - receive).toFixed(2);
    
    // 4. Sanitize payload
    const cleaned = sanitizeRecord(merged, YARN_COLUMNS);
    delete cleaned.RowNumber;
    delete cleaned.created_at;
    
    // 5. Update table
    const { data: updated, error: updateError } = await supabase
      .from('yarn')
      .update(cleaned)
      .eq('RowNumber', parseInt(rowNumber))
      .select();
      
    if (updateError) throw updateError;
    return updated && updated.length > 0 ? updated[0] : null;
  },

  async createYarn(record) {
    // Get max RowNumber to assign the next primary key
    const { data, error: fetchError } = await supabase
      .from('yarn')
      .select('RowNumber')
      .order('RowNumber', { ascending: false })
      .limit(1);
      
    if (fetchError) throw fetchError;
    
    const maxRow = data && data.length > 0 ? data[0].RowNumber : 3;
    const newRowNumber = Number(maxRow) + 1;
    
    const demand = getNumeric(record["Demand Ton"]);
    const receive = getNumeric(record["Receive (Ton)"]);
    const yetToReceive = (demand - receive).toFixed(2);
    
    const newRecord = {
      ...record,
      RowNumber: newRowNumber,
      "Yet to Receive": yetToReceive
    };
    
    // Sanitize payload
    const cleaned = sanitizeRecord(newRecord, YARN_COLUMNS);
    
    const { data: insertedData, error: insertError } = await supabase
      .from('yarn')
      .insert([cleaned])
      .select();
      
    if (insertError) throw insertError;
    return insertedData && insertedData.length > 0 ? insertedData[0] : null;
  },

  async deleteYarn(rowNumber) {
    const { data, error } = await supabase
      .from('yarn')
      .delete()
      .eq('RowNumber', parseInt(rowNumber))
      .select();
      
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  // --- Sewing Thread Operations ---
  async getThread() {
    let allData = [];
    let from = 0;
    let to = 999;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('thread')
        .select('*')
        .range(from, to);
        
      if (error) {
        console.error('Supabase getThread error:', error.message);
        throw error;
      }
      
      if (data && data.length > 0) {
        allData = allData.concat(data);
        from += 1000;
        to += 1000;
      } else {
        hasMore = false;
      }
    }
    return allData;
  },

  async updateThread(rowNumber, updatedFields) {
    const { data: existing, error: fetchError } = await supabase
      .from('thread')
      .select('*')
      .eq('RowNumber', parseInt(rowNumber))
      .single();
      
    if (fetchError) throw fetchError;
    if (!existing) return null;
    
    const merged = { ...existing, ...updatedFields };
    
    const demand = getNumeric(merged["Demand"]);
    const receive = getNumeric(merged["Receive"]);
    merged["Yet to Receive"] = (demand - receive).toFixed(2);
    
    // Sanitize payload
    const cleaned = sanitizeRecord(merged, THREAD_COLUMNS);
    delete cleaned.RowNumber;
    delete cleaned.created_at;
    
    const { data: updated, error: updateError } = await supabase
      .from('thread')
      .update(cleaned)
      .eq('RowNumber', parseInt(rowNumber))
      .select();
      
    if (updateError) throw updateError;
    return updated && updated.length > 0 ? updated[0] : null;
  },

  async createThread(record) {
    const { data, error: fetchError } = await supabase
      .from('thread')
      .select('RowNumber')
      .order('RowNumber', { ascending: false })
      .limit(1);
      
    if (fetchError) throw fetchError;
    
    const maxRow = data && data.length > 0 ? data[0].RowNumber : 3;
    const newRowNumber = Number(maxRow) + 1;
    
    const demand = getNumeric(record["Demand"]);
    const receive = getNumeric(record["Receive"]);
    const yetToReceive = (demand - receive).toFixed(2);
    
    const newRecord = {
      ...record,
      RowNumber: newRowNumber,
      "Yet to Receive": yetToReceive
    };
    
    // Sanitize payload
    const cleaned = sanitizeRecord(newRecord, THREAD_COLUMNS);
    
    const { data: insertedData, error: insertError } = await supabase
      .from('thread')
      .insert([cleaned])
      .select();
      
    if (insertError) throw insertError;
    return insertedData && insertedData.length > 0 ? insertedData[0] : null;
  },

  async deleteThread(rowNumber) {
    const { data, error } = await supabase
      .from('thread')
      .delete()
      .eq('RowNumber', parseInt(rowNumber))
      .select();
      
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  // Clear all database records
  async clear() {
    try {
      const { error: deleteYarnError } = await supabase
        .from('yarn')
        .delete()
        .gte('RowNumber', 0);
      if (deleteYarnError) throw deleteYarnError;
      
      const { error: deleteThreadError } = await supabase
        .from('thread')
        .delete()
        .gte('RowNumber', 0);
      if (deleteThreadError) throw deleteThreadError;
      
      return true;
    } catch (error) {
      console.error('Failed to clear database:', error.message);
      return false;
    }
  },

  // --- User Operations ---
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('id', { ascending: true });
      
    if (error) {
      console.error('Supabase getUsers error:', error.message);
      throw error;
    }
    return data || [];
  },

  async createUser(record) {
    const { data, error } = await supabase
      .from('users')
      .insert([record])
      .select();
      
    if (error) {
      console.error('Supabase createUser error:', error.message);
      throw error;
    }
    return data && data.length > 0 ? data[0] : null;
  },

  async updateUser(id, updatedFields) {
    const { data, error } = await supabase
      .from('users')
      .update(updatedFields)
      .eq('id', parseInt(id))
      .select();
      
    if (error) {
      console.error('Supabase updateUser error:', error.message);
      throw error;
    }
    return data && data.length > 0 ? data[0] : null;
  },

  async deleteUser(id) {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', parseInt(id))
      .select();
      
    if (error) {
      console.error('Supabase deleteUser error:', error.message);
      throw error;
    }
    return data && data.length > 0 ? data[0] : null;
  }
};
