import React, { useState, useRef } from 'react';
import styles from '../styles/components/DocumentViewer.module.css';
import { 
  FileText, 
  Upload, 
  Eye,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Grid,
  List,
  Loader2
} from 'lucide-react';

const DocumentViewer = ({
  documents = [],
  selectedDocument,
  onDocumentSelect,
  onFileUpload,
  uploadProgress = {},
  dragActive,
  onDragActive,
  darkMode = false,
  onDeleteDocument
}) => {
  // Debug logging for documents
  console.log('DocumentViewer received documents:', documents);
  console.log('DocumentViewer received uploadProgress:', uploadProgress);

  const fileInputRef = useRef(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showDocumentContent, setShowDocumentContent] = useState(false);
  const [documentText, setDocumentText] = useState('');

  const handleDrop = (e) => {
    e.preventDefault();
    onDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // onFileUpload(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    onDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    onDragActive(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} style={{ color: '#10b981' }} />;
      case 'processing':
      case 'accepted':
        return <Loader2 size={20} className="animate-spin" style={{ color: '#3b82f6' }} />;
      case 'error':
        return <AlertCircle size={20} style={{ color: '#ef4444' }} />;
      default:
        return <FileText size={20} style={{ color: '#9ca3af' }} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'processing':
      case 'accepted':
        return 'Processing';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'completed':
        return {
          background: '#dcfce7',
          color: '#15803d',
          border: '1px solid #bbf7d0'
        };
      case 'processing':
      case 'accepted':
        return {
          background: '#dbeafe',
          color: '#1d4ed8',
          border: '1px solid #bfdbfe'
        };
      case 'error':
        return {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca'
        };
      default:
        return {
          background: '#f3f4f6',
          color: '#374151',
          border: '1px solid #d1d5db'
        };
    }
  };

  const handleViewDocument = (doc) => {
    // Select the document to view it
    console.log('Viewing document:', doc);
    if (onDocumentSelect) {
      onDocumentSelect(doc.id);
    }
  };

  const handleViewDocumentContent = async (doc) => {
    try {
      // For now, we'll show a placeholder since we don't have the actual text content
      // In a real implementation, you would fetch this from the backend
      setDocumentText(`Document: ${doc.name}\n\nThis is a placeholder for the actual document content. In a full implementation, this would show the extracted text from your document.\n\nStatus: ${doc.status}\nUploaded: ${new Date(doc.uploadedAt).toLocaleString()}`);
      setShowDocumentContent(true);
    } catch (error) {
      console.error('Error fetching document content:', error);
      alert('Error loading document content. Please try again.');
    }
  };

  const handleDeleteDocument = (docId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this document?')) {
      onDeleteDocument(docId);
    }
  };

  const renderUploadArea = () => (
    <div className="upload-area animate-fadeInUp" style={{ display: 'none' }}>
      {/* Upload area removed */}
    </div>
  );

  // Render progress bar for uploading files
  const renderProgressBar = (fileName, progressData) => {
    if (!progressData) return null;
    
    return (
      <div
        key={`progress-${fileName}`}
        className="card-premium animate-slideInUp"
        style={{
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
          marginBottom: '16px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(245, 158, 11, 0.2)'
          }}>
            <Loader2 size={24} style={{ color: '#f59e0b' }} className="animate-spin" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              margin: '0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {fileName}
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '4px 0 0 0'
            }}>
              {progressData.status === 'uploading' ? 'Uploading...' : 
               progressData.status === 'processing' ? 'Processing...' : 
               progressData.status === 'error' ? 'Upload failed' : 'Uploading...'}
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '8px'
        }}>
          <div
            style={{
              width: `${progressData.progress || 0}%`,
              height: '100%',
              background: progressData.status === 'error' 
                ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '14px',
            color: progressData.status === 'error' ? '#dc2626' : '#6b7280'
          }}>
            {progressData.status === 'error' 
              ? (progressData.error || 'Upload failed')
              : `${progressData.progress || 0}%`
            }
          </span>
          {progressData.status === 'error' && (
            <AlertCircle size={16} style={{ color: '#dc2626' }} />
          )}
        </div>
      </div>
    );
  };

  const renderDocumentCard = (doc) => (
    <div
      key={doc.id}
      onClick={() => onDocumentSelect(doc)}
      className="card-premium animate-slideInUp"
      style={{
        padding: '20px',
        borderRadius: '16px',
        border: selectedDocument?.id === doc.id ? '2px solid #60a5fa' : '1px solid #e5e7eb',
        background: selectedDocument?.id === doc.id 
          ? 'linear-gradient(135deg, rgba(239, 246, 255, 0.8) 0%, rgba(219, 234, 254, 0.6) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: selectedDocument?.id === doc.id 
          ? '0 10px 25px rgba(59, 130, 246, 0.15)'
          : '0 4px 6px rgba(0, 0, 0, 0.05)',
        backdropFilter: 'blur(10px)'
      }}
      onMouseEnter={(e) => {
        if (selectedDocument?.id !== doc.id) {
          e.currentTarget.style.borderColor = '#93c5fd';
          e.currentTarget.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.1)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (selectedDocument?.id !== doc.id) {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '0',
          flex: '1'
        }}>
          <div style={{ flexShrink: '0' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <FileText size={24} style={{ color: '#2563eb' }} />
            </div>
          </div>
          <div style={{
            minWidth: '0',
            flex: '1'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: '0'
            }}>
              {doc.name}
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginTop: '4px',
              margin: '4px 0 0 0'
            }}>
              {formatFileSize(doc.size)} • {formatDate(doc.uploadedAt)}
            </p>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: '0'
        }}>
          {getStatusIcon(doc.status)}
        </div>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '500',
            ...getStatusBadgeStyle(doc.status)
          }}>
            {getStatusText(doc.status)}
          </span>
          {doc.pages && (
            <span style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {doc.pages} pages
            </span>
          )}
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {doc.status === 'completed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewDocument(doc);
              }}
              style={{
                padding: '8px',
                color: '#9ca3af',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#2563eb';
                e.target.style.background = 'rgba(239, 246, 255, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#9ca3af';
                e.target.style.background = 'transparent';
              }}
              title="View document"
            >
              <Eye size={16} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteDocument(doc.id, e);
            }}
            style={{
              padding: '8px',
              color: '#9ca3af',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = '#dc2626';
              e.target.style.background = 'rgba(254, 242, 242, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = '#9ca3af';
              e.target.style.background = 'transparent';
            }}
            title="Delete document"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderDocumentList = (doc) => (
    <div
      key={doc.id}
      onClick={() => onDocumentSelect(doc)}
      className="list-item-premium animate-slideInLeft"
      style={{
        padding: '16px',
        borderRadius: '12px',
        border: selectedDocument?.id === doc.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
        background: selectedDocument?.id === doc.id 
          ? 'linear-gradient(135deg, rgba(239, 246, 255, 0.8) 0%, rgba(219, 234, 254, 0.6) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: selectedDocument?.id === doc.id 
          ? '0 4px 12px rgba(59, 130, 246, 0.15), 0 0 0 2px rgba(59, 130, 246, 0.1)'
          : '0 2px 4px rgba(0, 0, 0, 0.05)',
        backdropFilter: 'blur(10px)'
      }}
      onMouseEnter={(e) => {
        if (selectedDocument?.id !== doc.id) {
          e.currentTarget.style.borderColor = '#93c5fd';
          e.currentTarget.style.background = 'rgba(239, 246, 255, 0.6)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (selectedDocument?.id !== doc.id) {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
        }
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          minWidth: '0',
          flex: '1'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: '0',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            <FileText size={20} style={{ color: '#2563eb' }} />
          </div>
          <div style={{
            minWidth: '0',
            flex: '1'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#111827',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: '0'
            }}>
              {doc.name}
            </h3>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: '2px 0 0 0'
            }}>
              {formatFileSize(doc.size)} • {formatDate(doc.uploadedAt)}
            </p>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            ...getStatusBadgeStyle(doc.status)
          }}>
            {getStatusText(doc.status)}
          </span>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewDocument(doc);
              }}
              style={{
                padding: '6px',
                color: '#9ca3af',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#2563eb';
                e.target.style.background = 'rgba(239, 246, 255, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#9ca3af';
                e.target.style.background = 'transparent';
              }}
              title="View document"
            >
              <Eye size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteDocument(doc.id, e);
              }}
              style={{
                padding: '6px',
                color: '#9ca3af',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#dc2626';
                e.target.style.background = 'rgba(254, 242, 242, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#9ca3af';
                e.target.style.background = 'transparent';
              }}
              title="Delete document"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <main className={styles.viewerContainer} style={{
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.4) 0%, rgba(255, 255, 255, 0.8) 50%, rgba(219, 234, 254, 0.4) 100%)',
      minHeight: '100vh',
      position: 'relative',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Drag overlay */}
      {dragActive && (
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
          background: 'rgba(239, 246, 255, 0.9)',
          border: '2px dashed #60a5fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '50',
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <Upload size={48} style={{
              color: '#3b82f6',
              margin: '0 auto 16px auto',
              display: 'block'
            }} />
            <p style={{
              fontSize: '20px',
              fontWeight: '500',
              color: '#1d4ed8',
              margin: '0'
            }}>Drop your files here</p>
            <p style={{
              color: '#2563eb',
              marginTop: '8px',
              margin: '8px 0 0 0'
            }}>We'll process them for you</p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className={styles.header} style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(239, 246, 255, 0.8) 100%)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
        padding: '24px 32px',
        flexShrink: '0',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <div className={styles.headerContent} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h1 className={styles.title} style={{
              fontSize: '2rem',
              fontWeight: '800',
              color: '#1e3a8a',
              margin: '0'
            }}>
              Document Viewer
            </h1>
            <p className={styles.subtitle} style={{
              color: '#3b82f6',
              marginTop: '0.5rem',
              fontWeight: '500',
              margin: '8px 0 0 0'
            }}>
              Upload and manage your documents
            </p>
          </div>
          
          <div className={styles.actions} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div className={styles.toggleGroup} style={{
              display: 'flex',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '0.5rem',
              padding: '0.25rem',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)'
            }}>
              <button
                onClick={() => setViewMode('grid')}
                className={`${styles.toggleButton} ${viewMode === 'grid' ? styles.toggleButtonActive : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: viewMode === 'grid' ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' : 'transparent',
                  color: viewMode === 'grid' ? '#1e3a8a' : '#3b82f6',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                  boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(59, 130, 246, 0.15), 0 0 0 1px rgba(59, 130, 246, 0.2)' : 'none'
                }}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`${styles.toggleButton} ${viewMode === 'list' ? styles.toggleButtonActive : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: viewMode === 'list' ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' : 'transparent',
                  color: viewMode === 'list' ? '#1e3a8a' : '#3b82f6',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                  boxShadow: viewMode === 'list' ? '0 2px 4px rgba(59, 130, 246, 0.15), 0 0 0 1px rgba(59, 130, 246, 0.2)' : 'none'
                }}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className={styles.content} style={{
        flex: '1',
        overflowY: 'auto',
        padding: '24px'
      }}>
        {/* Upload progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1e3a8a',
              marginBottom: '16px',
              margin: '0 0 16px 0'
            }}>
              Uploading Files
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(uploadProgress).map(([filename, progress]) => (
                <div key={filename} className="upload-progress-item animate-slideInLeft" style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1e3a8a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginRight: '16px',
                      flex: '1'
                    }}>
                      {filename}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '12px',
                        color: progress.status === 'completed' ? '#059669' : progress.status === 'error' ? '#dc2626' : progress.status === 'processing' ? '#d97706' : '#2563eb',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {progress.status === 'uploading' ? 'Uploading...' : progress.status === 'processing' ? 'Processing...' : progress.status === 'completed' ? 'Complete' : progress.status === 'error' ? 'Error' : 'Uploading...'}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        color: '#2563eb',
                        fontWeight: '700'
                      }}>
                        {progress.progress}%
                      </span>
                    </div>
                  </div>
                  <div style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                    borderRadius: '12px',
                    height: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    <div
                      style={{
                        height: '12px',
                        borderRadius: '12px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: progress.status === 'completed'
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : progress.status === 'error'
                          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                          : progress.status === 'processing'
                          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        width: `${progress.progress}%`
                      }}
                    />
                  </div>
                  {progress.error && (
                    <p style={{
                      fontSize: '14px',
                      color: '#dc2626',
                      marginTop: '8px',
                      fontWeight: '500',
                      margin: '8px 0 0 0'
                    }}>
                      {progress.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {documents.length === 0 ? (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              maxWidth: '448px',
              width: '100%'
            }}>
              {renderUploadArea()}
            </div>
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1e3a8a',
                margin: '0'
              }}>
                Your Documents ({documents.length})
              </h2>
            </div>
            
            {viewMode === 'grid' ? (
              <div className="documents-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px'
              }}>
                {documents.map(renderDocumentCard)}
              </div>
            ) : (
              <div className="documents-list" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {documents.map(renderDocumentList)}
              </div>
            )}

            {/* Selected Document Content Display */}
            {selectedDocument && (
              <div style={{
                marginTop: '32px',
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px'
                }}>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1e3a8a',
                    margin: '0'
                  }}>
                    {selectedDocument.name}
                  </h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      {formatFileSize(selectedDocument.size)}
                    </span>
                    <span style={{
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      • {formatDate(selectedDocument.uploadedAt)}
                    </span>
                    <button
                      onClick={() => onDocumentSelect(null)}
                      style={{
                        padding: '6px',
                        color: '#9ca3af',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        marginLeft: '12px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#dc2626';
                        e.target.style.background = 'rgba(254, 242, 242, 0.8)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#9ca3af';
                        e.target.style.background = 'transparent';
                      }}
                      title="Close document"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                {/* Document Content Viewer */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  minHeight: '400px',
                  overflow: 'hidden'
                }}>
                  {selectedDocument.type === 'application/pdf' ? (
                    <div style={{
                      height: '500px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f8fafc'
                    }}>
                      <div style={{
                        textAlign: 'center',
                        padding: '20px'
                      }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                          borderRadius: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 16px auto',
                          border: '1px solid rgba(59, 130, 246, 0.2)'
                        }}>
                          📄
                        </div>
                        <h4 style={{
                          margin: '0 0 8px 0',
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1e3a8a'
                        }}>
                          PDF Document Ready
                        </h4>
                        <p style={{
                          margin: '0 0 16px 0',
                          fontSize: '14px',
                          color: '#6b7280',
                          maxWidth: '400px'
                        }}>
                          This PDF has been processed and is ready for chat. You can ask questions about its content in the chat interface.
                        </p>
                        <div style={{
                          display: 'flex',
                          gap: '12px',
                          justifyContent: 'center',
                          flexWrap: 'wrap'
                        }}>
                          <button
                            onClick={() => {
                              // Switch to chat view with this document selected
                              if (onDocumentSelect) {
                                onDocumentSelect(selectedDocument.id);
                              }
                            }}
                            style={{
                              padding: '8px 16px',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: '500',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = 'none';
                            }}
                          >
                            Chat About This Document
                          </button>
                          <button
                            onClick={() => {
                              handleViewDocumentContent(selectedDocument);
                            }}
                            style={{
                              padding: '8px 16px',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: '500',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = 'none';
                            }}
                          >
                            View Document Content
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '20px',
                      background: '#f8fafc',
                      height: '400px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        textAlign: 'center',
                        color: '#6b7280'
                      }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                          borderRadius: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 16px auto',
                          border: '1px solid rgba(59, 130, 246, 0.2)'
                        }}>
                          📄
                        </div>
                        <h4 style={{
                          margin: '0 0 8px 0',
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1e3a8a'
                        }}>
                          Document Ready
                        </h4>
                        <p style={{
                          margin: '0 0 16px 0',
                          fontSize: '14px',
                          color: '#6b7280',
                          maxWidth: '400px'
                        }}>
                          This document has been processed and is ready for chat. You can ask questions about its content in the chat interface.
                        </p>
                        <button
                          onClick={() => {
                            // Switch to chat view with this document selected
                            if (onDocumentSelect) {
                              onDocumentSelect(selectedDocument.id);
                            }
                          }}
                          style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = 'none';
                          }}
                        >
                          Chat About This Document
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default DocumentViewer;