import React, { useState, useRef } from 'react';
import { RefreshCw, Download, FileSpreadsheet, AlertTriangle, Upload, Trash2 } from 'lucide-react';

export default function ImportExport({ showNotification }) {
  const [clearing, setClearing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Custom Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordCallback, setPasswordCallback] = useState(null);

  const fileInputRef = useRef(null);

  // Helper to open password prompt modal
  const requestPassword = (callback) => {
    setPasswordCallback(() => callback);
    setIsPasswordModalOpen(true);
    setPasswordValue('');
    setPasswordError('');
  };

  const handlePasswordSubmit = () => {
    if (passwordValue === '0707') {
      setIsPasswordModalOpen(false);
      setPasswordValue('');
      setPasswordError('');
      if (passwordCallback) passwordCallback();
    } else {
      setPasswordError('Incorrect password. Access denied.');
    }
  };

  // 1. Wipe database handler
  const handleClearDatabase = () => {
    requestPassword(() => {
      const doubleConfirm = confirm(
        'WARNING: Are you sure you want to WIPE all records from the cloud database?\n\n' +
        'This will delete all 3,500+ Yarn and Sewing Thread records, leaving the tables completely empty.'
      );
      if (!doubleConfirm) return;

      const tripleConfirm = confirm(
        'FINAL CONFIRMATION:\n\nType OK to proceed with deleting all data. This action is irreversible.'
      );
      if (!tripleConfirm) return;

      setClearing(true);
      fetch('/api/sync/clear', { method: 'POST' })
        .then(res => {
          if (!res.ok) throw new Error('Clear failed');
          return res.json();
        })
        .then(data => {
          showNotification(data.message || 'Cloud database successfully cleared.');
          setClearing(false);
        })
        .catch(err => {
          console.error(err);
          showNotification('Failed to clear database.', 'error');
          setClearing(false);
        });
    });
  };

  // 2. Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // 3. Drag & Drop Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      if (!isXlsx) {
        showNotification('Please select a valid Excel file (.xlsx or .xls)', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  // 4. Upload & Sync Handler (Base64)
  const handleUploadAndSync = () => {
    if (!selectedFile) {
      showNotification('Please choose an Excel file first.', 'error');
      return;
    }

    requestPassword(() => {
      setUploading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const base64Data = e.target.result.split(',')[1];
        
        fetch('/api/sync/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fileData: base64Data })
        })
        .then(res => {
          if (!res.ok) throw new Error('Upload & sync failed');
          return res.json();
        })
        .then(data => {
          showNotification(
            `Import completed successfully! Uploaded ${data.yarnCount} yarn records and ${data.threadCount} thread records to Supabase.`
          );
          setSelectedFile(null);
          setUploading(false);
        })
        .catch(err => {
          console.error(err);
          showNotification('Failed to upload Excel data. Check if format matches template.', 'error');
          setUploading(false);
        });
      } catch (err) {
        console.error(err);
        showNotification('Failed to process Excel file.', 'error');
        setUploading(false);
      }
    };
    
    reader.onerror = () => {
      showNotification('Failed to read file.', 'error');
      setUploading(false);
    };

    reader.readAsDataURL(selectedFile);
    });
  };

  // 5. Export Handler (legacy file sync on server disk)
  const handleExport = () => {
    setExporting(true);
    fetch('/api/sync/export', { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error('Export failed');
        return res.json();
      })
      .then(data => {
        showNotification('Web database successfully written back to server Excel file!');
        setExporting(false);
      })
      .catch(err => {
        console.error(err);
        showNotification('Failed to export. Check if file is open in Excel on server.', 'error');
        setExporting(false);
      });
  };

  return (
    <div className="sync-card-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', maxWidth: 'none' }}>
      
      {/* Card 1: Clear Database */}
      <div className="sync-card" style={{ borderTop: '4px solid var(--danger-color)' }}>
        <div className="sync-icon-box" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}>
          <Trash2 size={24} className={clearing ? 'animate-spin' : ''} />
        </div>
        <div className="sync-content">
          <h3 className="sync-title">Clear Cloud Database</h3>
          <p className="sync-description">
            Completely erase all records currently stored in the cloud database. 
            Use this to empty the tables before performing a clean upload of your latest Excel file.
          </p>
          <div style={{ marginTop: '1rem' }}>
            <button 
              className="btn btn-danger" 
              onClick={handleClearDatabase}
              disabled={clearing || uploading}
              style={{ background: 'var(--danger-color)', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer' }}
            >
              {clearing ? 'Clearing Database...' : 'Wipe Database'}
            </button>
          </div>
        </div>
      </div>

      {/* Card 2: Manual Upload & Sync */}
      <div className="sync-card" style={{ borderTop: '4px solid var(--primary-color)' }}>
        <div className="sync-icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)' }}>
          <Upload size={24} className={uploading ? 'animate-spin' : ''} />
        </div>
        <div className="sync-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h3 className="sync-title">Upload & Sync Excel File</h3>
          <p className="sync-description">
            Drag and drop or select your **Yarn Follow Up.xlsx** file. The app will parse it locally and sync all records to your cloud database in real-time.
          </p>
          
          <div 
            className={`upload-zone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
            style={{
              border: '2px dashed rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragActive ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.02)',
              marginTop: '1rem',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FileSpreadsheet size={32} style={{ color: selectedFile ? 'var(--success-color)' : 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {selectedFile ? selectedFile.name : 'Drag & drop Excel file here or click to browse'}
            </span>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".xlsx, .xls"
              onChange={handleFileChange}
            />
          </div>

          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleUploadAndSync}
              disabled={uploading || !selectedFile || clearing}
              style={{ flex: 1, padding: '0.6rem 1.2rem' }}
            >
              {uploading ? 'Uploading & Syncing...' : 'Upload to Cloud'}
            </button>
            {selectedFile && (
              <button 
                className="btn" 
                onClick={() => setSelectedFile(null)}
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: 'none', padding: '0.6rem 1rem', borderRadius: '6px' }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Download Excel */}
      <div className="sync-card" style={{ borderTop: '4px solid var(--success-color)' }}>
        <div className="sync-icon-box" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>
          <Download size={24} className={exporting ? 'animate-spin' : ''} />
        </div>
        <div className="sync-content">
          <h3 className="sync-title">Export & Download Report</h3>
          <p className="sync-description">
            Generate and download a clean, professionally formatted corporate report containing the latest real-time entries from your cloud database.
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button 
              className="btn" 
              style={{ background: 'var(--success-color)', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px' }}
              onClick={() => window.open('/api/sync/download', '_blank')}
            >
              Download Excel Report
            </button>
            <button 
              className="btn" 
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1.2rem', borderRadius: '6px' }}
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Saving on Server...' : 'Save on Server'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ gridColumn: '1 / -1', padding: '1.25rem', background: 'var(--warning-glow)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <AlertTriangle size={20} style={{ color: 'var(--warning-color)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          <span style={{ fontWeight: 600, color: 'var(--warning-color)' }}>Notice: </span>
          Wiping the database deletes all records from the cloud. To restore them, select your **Yarn Follow Up.xlsx** file and click **Upload to Cloud**. The file will be parsed in-memory, and all entries will be uploaded back to your cloud database automatically.
        </div>
      </div>
      
      {isPasswordModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-window" style={{ maxWidth: '400px', height: 'auto', padding: '2rem' }}>
            <h3 className="modal-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              🔑 Authentication Required
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', textAlign: 'left' }}>
              Please enter the administrator password to proceed.
            </p>
            <input 
              type="password" 
              className="form-control"
              placeholder="Enter password..."
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit(); }}
              autoFocus
              style={{ marginBottom: '1rem' }}
            />
            {passwordError && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'left' }}>
                {passwordError}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                type="button"
                className="btn" 
                onClick={() => { setIsPasswordModalOpen(false); setPasswordValue(''); setPasswordError(''); }}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handlePasswordSubmit}>
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
