import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  File as FileIcon, 
  Mail, 
  Lock, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  FolderOpen,
  X,
  Share2,
  Key,
  Calendar,
  Download,
  Copy,
  Plus
} from 'lucide-react';
import './App.css';

// API base URL — set VITE_API_URL for local dev, empty for production (nginx proxy)
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

// Inject authorization token on every request (except S3 presigned URL uploads)
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && !config.url.includes('amazonaws.com')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Toast Notifications State (Non-shifting overlay alerts)
  const [toasts, setToasts] = useState([]);

  // App States
  const [files, setFiles] = useState([]);
  const [activeUploads, setActiveUploads] = useState({}); // key -> { name, progress }
  const [loading, setLoading] = useState(false);
  const [fetchingFiles, setFetchingFiles] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Slide-out Drawer Panel States
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewText, setPreviewText] = useState('');

  // Expiring Public Share Route (Dynamic routing parser)
  const [shareToken, setShareToken] = useState(null);
  const [shareLinkInfo, setShareLinkInfo] = useState(null);
  const [sharePasscodeAttempt, setSharePasscodeAttempt] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  const fileInputRef = useRef(null);

  // Parse share URLs on load (e.g. /share/abcxyz)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      const tokenStr = path.split('/share/')[1];
      if (tokenStr) {
        setShareToken(tokenStr);
        loadPublicShareInfo(tokenStr);
      }
    }
  }, []);

  // Toast Helper
  const triggerToast = (title, message, type = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Load profile if token is available
  useEffect(() => {
    if (token && !shareToken) {
      setLoading(true);
      axios.get('/api/v1/profile')
        .then((res) => {
          setUser(res.data.user);
          fetchFiles();
        })
        .catch((err) => {
          console.error("Session expired:", err);
          handleLogout();
        })
        .finally(() => setLoading(false));
    }
  }, [token, shareToken]);

  // Poll files every 3 seconds
  useEffect(() => {
    if (!user || shareToken) return;
    const interval = setInterval(() => {
      fetchFiles(true); // silent fetch
    }, 3000);
    return () => clearInterval(interval);
  }, [user, shareToken]);

  // Sync selectedFile updates when files list refreshes
  useEffect(() => {
    if (selectedFile) {
      const updated = files.find(f => f.id === selectedFile.id);
      if (updated) setSelectedFile(updated);
    }
  }, [files]);

  // Fetch file preview when a file is selected
  useEffect(() => {
    if (!selectedFile) { setPreviewUrl(''); setPreviewText(''); return; }
    const ft = selectedFile.file_type;
    if (ft?.startsWith('image/') || ft === 'application/pdf') {
      axios.get(`/api/v1/files/${selectedFile.id}/download`, { responseType: 'blob' })
        .then((res) => {
          setPreviewUrl(window.URL.createObjectURL(res.data));
          setPreviewText('');
        })
        .catch(() => { setPreviewUrl(''); setPreviewText(''); });
    } else if (ft?.startsWith('text/')) {
      axios.get(`/api/v1/files/${selectedFile.id}/download`, { responseType: 'text' })
        .then((res) => {
          setPreviewText(res.data);
          setPreviewUrl('');
        })
        .catch(() => { setPreviewUrl(''); setPreviewText(''); });
    } else {
      setPreviewUrl('');
      setPreviewText('');
    }
  }, [selectedFile?.id]);

  const loadPublicShareInfo = async (tokenStr) => {
    setShareLoading(true);
    setShareError('');
    try {
      // Validate share token (Check requires passcode / expired)
      const { data } = await axios.post(`/api/v1/shares/${tokenStr}/validate`);
      setShareLinkInfo(data);
    } catch (err) {
      setShareError(err.response?.data?.error || 'This link has expired, self-destructed, or is invalid.');
    } finally {
      setShareLoading(false);
    }
  };

  const handleDownloadPublicFile = () => {
    // Open download trigger in new tab
    const passcodeParam = shareLinkInfo?.requires_passcode ? `&passcode=${encodeURIComponent(sharePasscodeAttempt)}` : '';
    window.open(`http://localhost:3000/api/v1/shares/${shareToken}?token=${shareToken}${passcodeParam}`, '_blank');
    
    // Auto-refresh validation status after a delay (handles single-use self-destruct update)
    setTimeout(() => {
      loadPublicShareInfo(shareToken);
    }, 2000);
  };

  const fetchFiles = (silent = false) => {
    if (!silent) setFetchingFiles(true);
    axios.get('/api/v1/files')
      .then((res) => {
        setFiles(res.data);
      })
      .catch((err) => {
        console.error("Error fetching files:", err);
      })
      .finally(() => {
        if (!silent) setFetchingFiles(false);
      });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      triggerToast('Validation Error', 'Please fill in all credentials.', 'error');
      return;
    }
    setLoading(true);

    const url = authMode === 'signup' ? '/api/v1/signup' : '/api/v1/login';
    try {
      const { data } = await axios.post(url, { email, password });
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      triggerToast(
        authMode === 'signup' ? 'Account Created' : 'Access Granted',
        authMode === 'signup' ? 'Welcome to your secure CloudVault!' : `Successfully logged in as ${data.user.email}`,
        'success'
      );
      setEmail('');
      setPassword('');
    } catch (err) {
      const errMsg = err.response?.data?.errors?.join(', ') || err.response?.data?.error || 'Authentication failed';
      triggerToast('Authentication Failed', errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setFiles([]);
    setSelectedFile(null);
    triggerToast('Logged Out', 'Your session has been securely closed.', 'info');
  };

  // S3 PUT Upload trigger
  const uploadFile = async (file) => {
    const uploadId = Math.random().toString(36).substr(2, 9);
    
    setActiveUploads(prev => ({
      ...prev,
      [uploadId]: { name: file.name, progress: 0 }
    }));

    try {
      const { data } = await axios.post('/api/v1/files/presigned_url', {
        filename: file.name,
        file_type: file.type,
        file_size: file.size
      });

      await axios.put(data.presigned_url, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setActiveUploads(prev => ({
            ...prev,
            [uploadId]: { ...prev[uploadId], progress: percent }
          }));
        }
      });

      await axios.post(`/api/v1/files/${data.file_id}/mark_uploaded`);

      setActiveUploads(prev => {
        const copy = { ...prev };
        delete copy[uploadId];
        return copy;
      });

      triggerToast('Upload Complete', `"${file.name}" uploaded. Processing analysis queued.`, 'success');
      fetchFiles(true);
    } catch (err) {
      console.error("Upload error:", err);
      triggerToast('Upload Failed', `Failed to upload "${file.name}": ${err.response?.data?.error || err.message}`, 'error');
      
      setActiveUploads(prev => {
        const copy = { ...prev };
        delete copy[uploadId];
        return copy;
      });
    }
  };

  const triggerSimulation = async (fileId) => {
    try {
      await axios.post(`/api/v1/files/${fileId}/reprocess`);
      triggerToast('Reprocessing', 'Lambda invoked for file reprocessing.', 'info');
      fetchFiles(true);
    } catch (err) {
      console.error("Reprocess error:", err);
      triggerToast('Reprocess Error', `Failed: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  // Generate Temporary sharing link
  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const { data } = await axios.get(`/api/v1/files/${fileId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      triggerToast('Download Failed', err.response?.data?.error || err.message, 'error');
    }
  };

  // Drag and Drop handlers
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
      const droppedFiles = Array.from(e.dataTransfer.files);
      droppedFiles.forEach(file => uploadFile(file));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFiles = Array.from(e.target.files);
      selectedFiles.forEach(file => uploadFile(file));
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="file-type-icon" size={18} />;
    if (fileType === 'application/pdf') return <FileText className="file-type-icon" size={18} />;
    return <FileIcon className="file-type-icon" size={18} />;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'uploading':
        return <span className="badge badge-uploading"><Loader2 size={12} className="animate-spin" /> Uploading</span>;
      case 'processing':
        return <span className="badge badge-processing"><Loader2 size={12} className="animate-spin" /> Processing</span>;
      case 'processed':
        return <span className="badge badge-processed"><CheckCircle2 size={12} /> Processed</span>;
      case 'failed':
        return <span className="badge badge-failed"><AlertCircle size={12} /> Failed</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  // Filter files on query matching name, type, summary or tags
  const filteredFiles = files.filter(file => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchesName = file.name.toLowerCase().includes(q);
    const matchesType = file.file_type.toLowerCase().includes(q);
    const tags = file.processing_job?.result?.tags || [];
    const matchesTags = tags.some(tag => tag.toLowerCase().includes(q));
    const summary = file.processing_job?.result?.summary || '';
    const matchesSummary = summary.toLowerCase().includes(q);
    return matchesName || matchesType || matchesTags || matchesSummary;
  });

  const renderToasts = () => {
    return (
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <AlertCircle className="toast-icon" size={18} />
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-message">{toast.message}</div>
            </div>
            <button className="toast-close" onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderPublicShareView = () => {
    return (
      <div className="public-share-wrapper">
        <div className="glass-card public-share-card">
          <div className="public-share-icon">
            <Share2 size={32} />
          </div>

          <h2 style={{ marginBottom: '0.5rem', fontWeight: '700' }}>Secure Share Link</h2>
          
          {shareError ? (
            <div className="alert alert-danger" style={{ margin: '1.5rem 0' }}>
              <AlertCircle size={18} /> {shareError}
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                This is a secure, self-destructing download link generated by CloudVault.
              </p>

              {shareLinkInfo?.requires_passcode && (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Enter Passcode to Access</label>
                  <div style={{ position: 'relative' }}>
                    <Key size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="Enter file passcode" 
                      value={sharePasscodeAttempt}
                      onChange={(e) => setSharePasscodeAttempt(e.target.value)}
                      style={{ paddingLeft: '2.5rem' }}
                      required
                    />
                  </div>
                </div>
              )}

              <button className="btn btn-primary" onClick={handleDownloadPublicFile} disabled={shareLoading}>
                {shareLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Download size={18} /> Download Secure File
                  </>
                )}
              </button>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {shareLinkInfo?.max_accesses && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <RefreshCw size={12} /> Limit: {shareLinkInfo.max_accesses} Download(s)
                  </span>
                )}
                {shareLinkInfo?.expires_at && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} /> Expires: {new Date(shareLinkInfo.expires_at).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAuth = () => {
    return (
      <div className="auth-wrapper">
        <div className="glass-card">
          <div className="auth-header">
            <div className="logo-section" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div className="logo-icon">
                <UploadCloud size={20} />
              </div>
              <span className="logo-title">CloudVault</span>
            </div>
            <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p>{authMode === 'login' ? 'Enter your details to manage files' : 'Register to start uploading files'}</p>
          </div>

          <form onSubmit={handleAuth}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                authMode === 'login' ? 'Sign In' : 'Sign Up'
              )}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button 
              className="btn-text" 
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
              }}
            >
              {authMode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFilePreview = () => {
    if (!selectedFile) return null;
    return (
      <div className="app-container">
        <header className="header">
          <div className="logo-section">
            <div className="logo-icon">
              <UploadCloud size={20} />
            </div>
            <span className="logo-title">CloudVault</span>
          </div>
          <div className="user-nav">
            <button className="btn btn-secondary" onClick={() => setSelectedFile(null)} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
              &larr; Back to Vault
            </button>
          </div>
        </header>

        <div className="preview-container">
          <div className="glass-card" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: '700', marginBottom: '0.25rem' }}>{selectedFile.name}</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedFile.file_type}</span>
            </div>

            {previewUrl ? (
              <div style={{ marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
                {selectedFile.file_type?.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt={selectedFile.name}
                    style={{ width: '100%', height: 'auto', maxHeight: '70vh', objectFit: 'contain', display: 'block' }}
                  />
                ) : selectedFile.file_type === 'application/pdf' ? (
                  <iframe
                    src={previewUrl}
                    title={selectedFile.name}
                    style={{ width: '100%', height: '70vh', border: 'none' }}
                  />
                ) : null}
              </div>
            ) : previewText ? (
              <div style={{ marginBottom: '1.5rem', borderRadius: '8px', overflow: 'auto', maxHeight: '70vh', background: 'rgba(0,0,0,0.2)', padding: '1.5rem' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{previewText}</pre>
              </div>
            ) : null}

            <button
              className="btn btn-primary"
              onClick={() => handleDownloadFile(selectedFile.id, selectedFile.name)}
              style={{ width: '100%', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Download size={16} /> Download Original
            </button>

            <div>
              <div className="drawer-section-title">File Details</div>
              <div className="meta-grid">
                <div className="meta-item">
                  <div className="meta-label">File Size</div>
                  <div className="meta-value">{formatBytes(selectedFile.file_size)}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Status</div>
                  <div className="meta-value" style={{ textTransform: 'capitalize' }}>{selectedFile.status}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Processed At</div>
                  <div className="meta-value">
                    {selectedFile.processed_at ? new Date(selectedFile.processed_at).toLocaleString() : '-'}
                  </div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Storage Key</div>
                  <div className="meta-value" style={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>{selectedFile.s3_key}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    if (selectedFile) return renderFilePreview();
    return (
      <div className="app-container">
        {/* Header */}
        <header className="header">
          <div className="logo-section">
            <div className="logo-icon">
              <UploadCloud size={20} />
            </div>
            <span className="logo-title">CloudVault</span>
            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '20px', color: '#c084fc', fontWeight: '600' }}>Enterprise</span>
          </div>
          
          <div className="user-nav">
            <span className="user-email">{user?.email}</span>
            <button className="btn btn-secondary btn-danger" onClick={handleLogout} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </header>

        {/* Global Toolbar - Search */}
        <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
          <div className="search-bar-container">
            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search by file name, extension, summary description or AI tags..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Left panel - Upload */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>Upload New Files</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Upload images or PDF files. Once uploaded, they are automatically processed by our backend engine.
            </p>

            <div 
              className={`dropzone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
            >
              <UploadCloud className="dropzone-icon" />
              <div className="dropzone-text">
                <span>Click to upload</span> or drag and drop
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                PNG, JPEG, PDF up to 50MB
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                className="file-input" 
                onChange={handleFileChange}
                multiple
              />
            </div>

            {/* Active Uploads */}
            {Object.keys(activeUploads).length > 0 && (
              <div className="uploads-list">
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                  Active Uploads ({Object.keys(activeUploads).length})
                </h4>
                {Object.entries(activeUploads).map(([id, upload]) => (
                  <div key={id} className="upload-item">
                    <div className="upload-info">
                      <span className="upload-filename">{upload.name}</span>
                      <span className="upload-percent">{upload.progress}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${upload.progress}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel - Files list */}
          <div className="glass-card table-card">
            <div className="table-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2>Your Vault Files</h2>
                {fetchingFiles && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />}
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={() => fetchFiles()} 
                style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem' }}
                disabled={fetchingFiles}
              >
                <RefreshCw size={12} className={fetchingFiles ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {filteredFiles.length === 0 && !fetchingFiles ? (
              <div className="empty-state">
                <FolderOpen className="empty-state-icon" />
                <h3>No files match query</h3>
                <p style={{ fontSize: '0.9rem', maxWidth: '300px' }}>
                  Try resetting your search query or uploading new documents.
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="files-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Size</th>
                      <th>Status</th>
                      <th>Processing Result</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((file) => {
                      const tags = file.processing_job?.result?.tags || [];
                      const summary = file.processing_job?.result?.summary || '';
                      
                      return (
                        <tr 
                          key={file.id} 
                          onClick={() => setSelectedFile(file)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <div className="file-name-cell">
                              {getFileIcon(file.file_type)}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span className="file-name-txt" title={file.name} style={{ fontWeight: '600' }}>{file.name}</span>
                                {tags.length > 0 && (
                                  <div className="tag-container" style={{ marginTop: '2px' }}>
                                    {tags.slice(0, 3).map((tag, idx) => (
                                      <span key={idx} className="tag-pill">#{tag}</span>
                                    ))}
                                    {tags.length > 3 && <span className="tag-pill" style={{ opacity: 0.7 }}>+{tags.length - 3}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{formatBytes(file.file_size)}</td>
                          <td>{getStatusBadge(file.status)}</td>
                          <td style={{ maxWidth: '320px' }}>
                            {file.processing_job ? (
                              file.processing_job.status === 'completed' ? (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' }} title={summary}>
                                  {summary}
                                </div>
                              ) : file.processing_job.status === 'failed' ? (
                                <span style={{ color: 'var(--color-error)', fontSize: '0.8rem', fontWeight: '500' }}>
                                  Error: {file.processing_job.error_message}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                  Awaiting analysis...
                                </span>
                              )
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                              {file.status !== 'processed' && (
                                <button 
                                  className="btn btn-secondary"
                                  onClick={() => triggerSimulation(file.id)}
                                  style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  <RefreshCw size={12} /> {file.status === 'failed' ? 'Retry' : 'Process'}
                                </button>
                              )}
                              <button
                                className="btn btn-secondary"
                                onClick={() => setSelectedFile(file)}
                                style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <Share2 size={12} /> View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>


      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-primary)' }} />
        <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Securing connection...</span>
      </div>
    );
  }

  return (
    <>
      {renderToasts()}
      {shareToken ? renderPublicShareView() : (user ? renderDashboard() : renderAuth())}
    </>
  );
}

export default App;
