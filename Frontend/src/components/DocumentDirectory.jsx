import React, { useState, useEffect } from 'react';
import { Search, FileText, Calendar, Trash2, Eye, MoreVertical, Layers, HardDrive } from 'lucide-react';
import axios from 'axios';
import './DocumentDirectory.css';

function DocumentDirectory() {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [searchQuery, documents]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/v1/documents');
      if (response.data.success) {
        setDocuments(response.data.documents);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterDocuments = () => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
      return;
    }

    const filtered = documents.filter(doc =>
      doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredDocuments(filtered);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
      return;
    }

    try {
      const response = await axios.get(`/api/v1/search?query=${encodeURIComponent(searchQuery)}`);
      if (response.data.success) {
        setFilteredDocuments(response.data.documents);
      }
    } catch (error) {
      console.error('Search error:', error);
      filterDocuments(); // Fallback to client-side search
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      const response = await axios.delete(`/api/v1/documents/${documentId}`);
      if (response.data.success) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        setShowDeleteConfirm(null);
        // Refresh stats
        fetchDocuments();
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="document-directory loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-directory">
      {/* Header */}
      <div className="directory-header">
        <div className="header-content">
          <h1>Document Directory</h1>
          <p>Manage your uploaded PDF documents</p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon icon-bg"><FileText size={24} /></div>
            <div className="stat-content">
              <h3>{stats.total_documents || 0}</h3>
              <p>Total Documents</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon icon-bg"><Layers size={24} /></div>
            <div className="stat-content">
              <h3>{stats.total_pages || 0}</h3>
              <p>Total Pages</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon icon-bg"><HardDrive size={24} /></div>
            <div className="stat-content">
              <h3>{stats.total_size_mb || 0} MB</h3>
              <p>Storage Used</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search documents by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="search-btn">
            Search
          </button>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="documents-section">
        {filteredDocuments.length === 0 ? (
          <div className="no-documents">
            <FileText size={64} />
            <h3>
              {searchQuery ? 'No documents found' : 'No documents uploaded yet'}
            </h3>
            <p>
              {searchQuery 
                ? 'Try adjusting your search terms' 
                : 'Upload your first PDF document to get started'}
            </p>
          </div>
        ) : (
          <div className="documents-grid">
            {filteredDocuments.map((document) => (
              <div key={document.id} className="document-card">
                <div className="document-header">
                  <div className="document-icon">
                    <FileText size={24} />
                  </div>
                  <div className="document-actions">
                    <button 
                      className="action-btn"
                      onClick={() => setSelectedDoc(selectedDoc === document.id ? null : document.id)}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {selectedDoc === document.id && (
                      <div className="actions-menu">
                        <button 
                          className="menu-item view"
                          onClick={() => {
                            // Navigate to dashboard with this document
                            window.location.href = `/?doc=${document.id}`;
                          }}
                        >
                          <Eye size={16} />
                          View & Chat
                        </button>
                        <button 
                          className="menu-item delete"
                          onClick={() => setShowDeleteConfirm(document.id)}
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="document-content">
                  <h3 className="document-title">{document.original_filename}</h3>
                  
                  <div className="document-meta">
                    <div className="meta-item">
                      <Calendar size={14} />
                      <span>{formatDate(document.upload_date)}</span>
                    </div>
                    <div className="meta-item">
                      <span>{document.total_pages} pages</span>
                    </div>
                    <div className="meta-item">
                      <span>{formatFileSize(document.file_size)}</span>
                    </div>
                  </div>

                  <div className="document-status">
                    <span className={`status-badge ${document.processing_status}`}>
                      {document.processing_status}
                    </span>
                  </div>
                </div>

                <div className="document-footer">
                  <button 
                    className="primary-btn"
                    onClick={() => {
                      window.location.href = `/?doc=${document.id}`;
                    }}
                  >
                    <Eye size={16} />
                    Open Document
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Delete Document</h3>
            <p>
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button 
                className="delete-btn"
                onClick={() => handleDeleteDocument(showDeleteConfirm)}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentDirectory;
