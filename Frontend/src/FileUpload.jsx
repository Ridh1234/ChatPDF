import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function FileUpload({ onUploadComplete }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState([]); // [{filename, status, errorMsg, document_id, percent, phase}]
  const pollTimerRef = useRef(null);

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const startPollingStatuses = (items) => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const updates = await Promise.all(items.map(async (it) => {
          if (!it.document_id) return it;
          try {
            const { data } = await axios.get(`/api/v1/status/${it.document_id}`);
            return {
              ...it,
              status: data.status || it.status,
              percent: typeof data.percent === 'number' ? data.percent : (it.percent ?? 0),
              phase: data.phase || it.phase || 'processing',
              errorMsg: data.error || it.errorMsg || '',
            };
          } catch (e) {
            return it;
          }
        }));
        setUploadStatus(updates);
        const allDone = updates.every(u => u.status === 'completed' || u.status === 'error');
        if (allDone) stopPolling();
      } catch (e) {
        // ignore transient errors
      }
    }, 1500);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) return;
    setUploading(true);
    setUploadStatus([]);
    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));
    try {
      const { data } = await axios.post('/api/v1/upload-multi', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data?.results) {
        const items = data.results.map(r => ({
          filename: r.filename,
          status: r.status,
          errorMsg: r.status !== 'accepted' ? r.message : '',
          document_id: r.document_id,
          percent: 0,
          phase: 'queued',
        }));
        setUploadStatus(items);
        if (onUploadComplete) onUploadComplete(data.results);
        const toPoll = items.filter(i => i.status === 'accepted' && i.document_id);
        if (toPoll.length) startPollingStatuses(toPoll);
      } else {
        setUploadStatus([{ filename: 'Unknown', status: 'error', errorMsg: 'No response from backend.' }]);
      }
    } catch (err) {
      setUploadStatus([{ filename: 'Unknown', status: 'error', errorMsg: err.message }]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container animate-fadeInUp" style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 50%, #dbeafe 100%)',
      padding: '32px',
      borderRadius: '16px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
      border: '1px solid #bfdbfe',
      marginBottom: '32px',
      width: '100%',
      maxWidth: '1024px',
      margin: '0 auto 32px auto',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Premium Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
          }}>
            <span style={{
              color: 'white',
              fontSize: '20px'
            }}>📄</span>
          </div>
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1e3a8a',
              margin: '0 0 4px 0'
            }}>Upload Documents</h2>
            <p style={{
              color: '#2563eb',
              fontWeight: '500',
              margin: '0',
              fontSize: '14px'
            }}>Upload PDFs, Word docs, and text files for AI analysis</p>
          </div>
        </div>
      </div>

      {/* Premium File Upload Area */}
      <div className="upload-area card-premium" style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: '16px',
        border: '2px dashed #93c5fd',
        padding: '32px',
        marginBottom: '24px',
        textAlign: 'center',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#60a5fa';
        e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#93c5fd';
        e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
          }}>
            <span style={{
              color: '#2563eb',
              fontSize: '24px'
            }}>⬆️</span>
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1e3a8a',
            margin: '0 0 8px 0'
          }}>Choose Files to Upload</h3>
          <p style={{
            color: '#2563eb',
            margin: '0 0 16px 0',
            fontSize: '14px'
          }}>Select multiple documents for processing</p>
        </div>
        
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="btn-primary"
          style={{
            display: 'inline-block',
            padding: '16px 32px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            borderRadius: '16px',
            fontWeight: '600',
            boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            border: 'none',
            fontSize: '16px'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 12px 35px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.3)';
          }}
        >
          Select Files
        </label>
        
        {selectedFiles.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{
              fontWeight: '600',
              color: '#1e3a8a',
              marginBottom: '12px',
              fontSize: '16px'
            }}>Selected Files ({selectedFiles.length}):</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedFiles.map((file, i) => (
                <div key={i} className="file-item animate-fadeInUp" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #bfdbfe',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                    }}>
                      <span style={{
                        color: '#2563eb',
                        fontSize: '14px'
                      }}>📄</span>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{
                        fontWeight: '500',
                        color: '#1e3a8a',
                        fontSize: '14px',
                        margin: '0 0 2px 0'
                      }}>{file.name}</p>
                      <p style={{
                        color: '#3b82f6',
                        fontSize: '12px',
                        margin: '0'
                      }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Premium Upload Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '24px'
      }}>
        <button
          className="btn-primary"
          disabled={uploading || !selectedFiles.length}
          onClick={handleUpload}
          style={{
            padding: '16px 48px',
            background: (uploading || !selectedFiles.length) 
              ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)' 
              : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            borderRadius: '16px',
            fontWeight: '600',
            boxShadow: (uploading || !selectedFiles.length) 
              ? '0 4px 12px rgba(0, 0, 0, 0.1)' 
              : '0 8px 25px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s ease',
            cursor: (uploading || !selectedFiles.length) ? 'not-allowed' : 'pointer',
            border: 'none',
            fontSize: '18px',
            opacity: (uploading || !selectedFiles.length) ? '0.6' : '1'
          }}
          onMouseEnter={(e) => {
            if (!(uploading || !selectedFiles.length)) {
              e.target.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 12px 35px rgba(59, 130, 246, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!(uploading || !selectedFiles.length)) {
              e.target.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.3)';
            }
          }}
        >
          {uploading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div className="animate-spin" style={{
                width: '20px',
                height: '20px',
                border: '2px solid white',
                borderTop: '2px solid transparent',
                borderRadius: '50%'
              }}></div>
              Uploading...
            </div>
          ) : (
            `Upload ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}`
          )}
        </button>
      </div>

      {/* Premium Status Display */}
      {uploadStatus.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{
            fontWeight: '600',
            color: '#1e3a8a',
            marginBottom: '16px',
            fontSize: '16px'
          }}>Upload Results:</h4>
          {uploadStatus.map((s, i) => (
            <div key={i} className="status-card animate-fadeInUp" style={{
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
              border: s.status === 'completed' ? '1px solid #bbf7d0' : s.status === 'error' ? '1px solid #fecaca' : '1px solid #bfdbfe',
              background: s.status === 'completed'
                ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                : s.status === 'error'
                ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              color: s.status === 'completed' ? '#15803d' : s.status === 'error' ? '#dc2626' : '#1e3a8a'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: '1' }}>
                  <p style={{ fontWeight: '600', margin: '0 0 8px 0', fontSize: '14px' }}>{s.filename}</p>
                  <div style={{ height: '10px', background: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ width: `${Math.min(Math.max(s.percent ?? 0, 0), 100)}%`, height: '100%', background: s.status === 'error' ? '#fecaca' : '#60a5fa', transition: 'width 0.5s ease' }} />
                  </div>
                  <p style={{ fontSize: '12px', opacity: '0.8', margin: 0 }}>
                    Status: {(s.status || 'processing').charAt(0).toUpperCase() + (s.status || 'processing').slice(1)}{s.phase ? ` · ${s.phase}` : ''}{typeof s.percent === 'number' ? ` · ${s.percent}%` : ''}
                    {s.errorMsg && ` · ${s.errorMsg}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
