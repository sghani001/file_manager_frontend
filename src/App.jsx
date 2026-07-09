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
  MessageSquare,
  X,
  Share2,
  Send,
  Key,
  Calendar,
  Download,
  Copy,
  Plus,
  ArrowRight
} from 'lucide-react';
import './App.css';

// Set Rails backend API base URL
axios.defaults.baseURL = 'http://localhost:3000';

// Inject authorization token on every request
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
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
  const [drawerTab, setDrawerTab] = useState('details'); // 'details', 'share', 'chat'
  
  // Drawer - Sharing Link Form States
  const [expiresIn, setExpiresIn] = useState('60'); // minutes
  const [maxAccesses, setMaxAccesses] = useState('1'); // accesses
  const [sharePasscode, setSharePasscode] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);

  // Drawer - Single File Chat States
  const [fileMessages, setFileMessages] = useState([]);
  const [fileInput, setFileInput] = useState('');
  const [sendingFileChat, setSendingFileChat] = useState(false);

  // Floating Global Chat Assistant States
  const [globalChatOpen, setGlobalChatOpen] = useState(false);
  const [globalMessages, setGlobalMessages] = useState([
    { sender: 'bot', text: "Hi! I am your **CloudVault AI Assistant**. 🧠 Ask me anything about your files, like *\"Summarize my files\"* or *\"Which files failed?\"*." }
  ]);
  const [globalInput, setGlobalInput] = useState('');
  const [sendingGlobalChat, setSendingGlobalChat] = useState(false);

  // Expiring Public Share Route (Dynamic routing parser)
  const [shareToken, setShareToken] = useState(null);
  const [shareLinkInfo, setShareLinkInfo] = useState(null);
  const [sharePasscodeAttempt, setSharePasscodeAttempt] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  const fileInputRef = useRef(null);
  const fileChatEndRef = useRef(null);
  const globalChatEndRef = useRef(null);

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

  // Scroll chats to bottom when new messages arrive
  useEffect(() => {
    fileChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [fileMessages]);

  useEffect(() => {
    globalChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [globalMessages, globalChatOpen]);

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
    setGlobalChatOpen(false);
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
      await axios.post(`/api/v1/files/${fileId}/mark_uploaded`);
      triggerToast('Simulation Activated', 'Background Lambda simulator successfully running.', 'info');
      fetchFiles(true);
    } catch (err) {
      console.error("Simulation error:", err);
      triggerToast('Simulation Error', `Failed to trigger: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  // Generate Temporary sharing link
  const handleGenerateShareLink = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setGeneratingLink(true);
    setGeneratedLink('');

    try {
      const { data } = await axios.post('/api/v1/share_links', {
        user_file_id: selectedFile.id,
        expires_in_minutes: expiresIn,
        max_accesses: maxAccesses,
        passcode: sharePasscode
      });

      setGeneratedLink(data.share_url);
      triggerToast('Share Link Created', 'Public temporary link compiled successfully.', 'success');
    } catch (err) {
      console.error("Share error:", err);
      triggerToast('Link Creation Failed', err.response?.data?.error || 'Failed to create share link', 'error');
    } finally {
      setGeneratingLink(false);
    }
  };

  // Single file AI chat
  const handleFileChatSend = async (e) => {
    e.preventDefault();
    if (!fileInput.trim() || !selectedFile) return;
    
    const userMsg = fileInput;
    setFileMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setFileInput('');
    setSendingFileChat(true);

    try {
      const { data } = await axios.post('/api/v1/chat', {
        prompt: userMsg,
        user_file_id: selectedFile.id
      });
      setFileMessages(prev => [...prev, { sender: 'bot', text: data.response }]);
    } catch (err) {
      console.error(err);
      setFileMessages(prev => [...prev, { sender: 'bot', text: 'Error communicating with AI assistant.' }]);
    } finally {
      setSendingFileChat(false);
    }
  };

  // Global vault AI chat
  const handleGlobalChatSend = async (e) => {
    e.preventDefault();
    if (!globalInput.trim()) return;

    const userMsg = globalInput;
    setGlobalMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setGlobalInput('');
    setSendingGlobalChat(true);

    try {
      const { data } = await axios.post('/api/v1/chat', {
        prompt: userMsg
      });
      setGlobalMessages(prev => [...prev, { sender: 'bot', text: data.response }]);
    } catch (err) {
      console.error(err);
      setGlobalMessages(prev => [...prev, { sender: 'bot', text: 'Error communicating with AI assistant.' }]);
    } finally {
      setSendingGlobalChat(false);
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

  const renderDashboard = () => {
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
                          onClick={() => {
                            setSelectedFile(file);
                            setDrawerTab('details');
                            // Clear single chat thread
                            setFileMessages([]);
                            setGeneratedLink('');
                          }}
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
                                onClick={() => {
                                  setSelectedFile(file);
                                  setDrawerTab('share');
                                  setGeneratedLink('');
                                }}
                                style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <Share2 size={12} /> Share
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

        {/* Global Chat Floating Assistant */}
        <div className="chat-widget">
          <button className="chat-fab" onClick={() => setGlobalChatOpen(!globalChatOpen)}>
            {globalChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
          </button>

          {globalChatOpen && (
            <div className="chat-window">
              <div className="chat-header">
                <span className="chat-title">
                  <MessageSquare size={16} style={{ color: 'var(--accent-primary)' }} /> CloudVault AI Agent
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bedrock RAG Simulator</span>
              </div>

              <div className="chat-history">
                {globalMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-bubble chat-bubble-${msg.sender}`}>
                    {msg.text.includes('**') || msg.text.includes('*') ? (
                      // Parse basic markdown bullet points for chatbot formatting
                      <div dangerouslySetInnerHTML={{ 
                        __html: msg.text
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/\n/g, '<br />')
                      }} />
                    ) : (
                      msg.text
                    )}
                  </div>
                ))}
                {sendingGlobalChat && (
                  <div className="chat-bubble chat-bubble-bot" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <Loader2 className="animate-spin" size={14} /> AI is thinking...
                  </div>
                )}
                <div ref={globalChatEndRef} />
              </div>

              <form className="chat-input-area" onSubmit={handleGlobalChatSend}>
                <input 
                  type="text" 
                  className="chat-input" 
                  placeholder="Ask a question about your files..."
                  value={globalInput}
                  onChange={(e) => setGlobalInput(e.target.value)}
                  disabled={sendingGlobalChat}
                />
                <button type="submit" className="chat-send-btn" disabled={sendingGlobalChat}>
                  <Send size={14} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Slide-out Drawer Panel */}
        {selectedFile && (
          <>
            <div className="drawer-overlay" onClick={() => setSelectedFile(null)}></div>
            <div className={`drawer ${selectedFile ? 'drawer-open' : ''}`}>
              <div className="drawer-header">
                <div className="drawer-title-area">
                  <div className="drawer-filename">{selectedFile.name}</div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedFile.file_type}</span>
                </div>
                <button className="toast-close" onClick={() => setSelectedFile(null)} style={{ padding: '0.5rem' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="drawer-tabs">
                <button className={`drawer-tab ${drawerTab === 'details' ? 'active' : ''}`} onClick={() => setDrawerTab('details')}>
                  File Info
                </button>
                <button className={`drawer-tab ${drawerTab === 'share' ? 'active' : ''}`} onClick={() => setDrawerTab('share')}>
                  Sharing Links
                </button>
                <button className={`drawer-tab ${drawerTab === 'chat' ? 'active' : ''}`} onClick={() => setDrawerTab('chat')}>
                  File AI Chat
                </button>
              </div>

              <div className="drawer-body">
                {/* Details Tab */}
                {drawerTab === 'details' && (
                  <>
                    <div>
                      <div className="drawer-section-title">Analysis Summary</div>
                      <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        {selectedFile.processing_job?.status === 'completed' ? (
                          selectedFile.processing_job?.result?.summary || 'No summary available.'
                        ) : selectedFile.processing_job?.status === 'failed' ? (
                          <span style={{ color: 'var(--color-error)' }}>
                            Processing failed: {selectedFile.processing_job?.error_message}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Analysis queued. Processing in background...</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="drawer-section-title">AI Content Tags</div>
                      <div className="tag-container">
                        {selectedFile.processing_job?.result?.tags?.map((tag, idx) => (
                          <span key={idx} className="tag-pill" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>#{tag}</span>
                        )) || <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tags generated yet.</span>}
                      </div>
                    </div>

                    <div>
                      <div className="drawer-section-title">File Details</div>
                      <div className="meta-grid">
                        <div className="meta-item">
                          <div className="meta-label">Storage Key</div>
                          <div className="meta-value" style={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>{selectedFile.s3_key}</div>
                        </div>
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
                      </div>
                    </div>

                    {selectedFile.processing_job?.result && (
                      <div>
                        <div className="drawer-section-title">RAW Engine Results</div>
                        <pre className="results-preview" style={{ maxWidth: '100%' }}>
                          {JSON.stringify(selectedFile.processing_job.result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}

                {/* Share Tab */}
                {drawerTab === 'share' && (
                  <>
                    <h4 style={{ fontWeight: '600' }}>Create Expiring Share Link</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Generate a secure random link for external sharing. The link will self-destruct once it reaches the download limits.
                    </p>

                    <form onSubmit={handleGenerateShareLink} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div className="form-group">
                        <label className="form-label">Expiry duration</label>
                        <select className="form-input" value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)}>
                          <option value="5">5 Minutes (Instant Expiry)</option>
                          <option value="60">1 Hour</option>
                          <option value="1440">24 Hours</option>
                          <option value="0">Never Expire</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Download access limit</label>
                        <select className="form-input" value={maxAccesses} onChange={(e) => setMaxAccesses(e.target.value)}>
                          <option value="1">1 Download Only (Self-Destructs)</option>
                          <option value="5">5 Downloads</option>
                          <option value="10">10 Downloads</option>
                          <option value="">Unlimited Downloads</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Optional Passcode protection</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. 1234 (Leave blank for public access)"
                          value={sharePasscode}
                          onChange={(e) => setSharePasscode(e.target.value)}
                        />
                      </div>

                      <button type="submit" className="btn btn-primary" disabled={generatingLink}>
                        {generatingLink ? <Loader2 className="animate-spin" size={18} /> : 'Generate Secure Link'}
                      </button>
                    </form>

                    {generatedLink && (
                      <div className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--accent-border)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '700' }}>
                          Copy Shareable Link
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={generatedLink} 
                            readOnly 
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }} 
                          />
                          <button 
                            className="btn btn-secondary" 
                            style={{ width: 'auto', padding: '0.4rem 0.8rem' }}
                            onClick={() => {
                              navigator.clipboard.writeText(generatedLink);
                              triggerToast('Copied to Clipboard', 'Link copied to copy buffer.', 'success');
                            }}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* File Chat Tab */}
                {drawerTab === 'chat' && (
                  <>
                    <h4 style={{ fontWeight: '600' }}>AI Assistant chat: {selectedFile.name}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      Ask questions directly about this document's properties, size, or processed labels.
                    </p>

                    <div className="drawer-chat-container">
                      <div className="chat-history" style={{ padding: '0.75rem' }}>
                        {fileMessages.length === 0 && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>
                            Ask a question to start chatting about this file. E.g. *"Summarize this file"*
                          </div>
                        )}
                        {fileMessages.map((msg, idx) => (
                          <div key={idx} className={`chat-bubble chat-bubble-${msg.sender}`} style={{ fontSize: '0.8rem' }}>
                            {msg.text.includes('**') ? (
                              <div dangerouslySetInnerHTML={{ 
                                __html: msg.text
                                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/\n/g, '<br />')
                              }} />
                            ) : (
                              msg.text
                            )}
                          </div>
                        ))}
                        {sendingFileChat && (
                          <div className="chat-bubble chat-bubble-bot" style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.8rem' }}>
                            <Loader2 className="animate-spin" size={12} /> AI analyzing...
                          </div>
                        )}
                        <div ref={fileChatEndRef} />
                      </div>

                      <form className="chat-input-area" onSubmit={handleFileChatSend} style={{ padding: '0.5rem' }}>
                        <input 
                          type="text" 
                          className="chat-input" 
                          placeholder="Ask about this file..."
                          value={fileInput}
                          onChange={(e) => setFileInput(e.target.value)}
                          disabled={sendingFileChat}
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                        />
                        <button type="submit" className="chat-send-btn" disabled={sendingFileChat} style={{ width: '2rem', height: '2rem' }}>
                          <ArrowRight size={14} />
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
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
