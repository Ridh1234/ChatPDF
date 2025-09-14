import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, FileText, Bot, User, Loader, ExternalLink } from 'lucide-react';
import axios from 'axios';
import './Dashboard.css';

function Dashboard() {
  const [selectedDocument, setSelectedDocument] = useState(null);
  // Map of documentId -> messages array for isolated chat histories
  const [chatHistories, setChatHistories] = useState({});
  const [messages, setMessages] = useState([]); // current active document messages (derived)
  const [inputMessage, setInputMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentContent, setDocumentContent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [recentDocuments, setRecentDocuments] = useState([]); // will be removed from UI per new requirement
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Helper: sanitize Gemini output for natural conversation
  const sanitizeGemini = (text) => {
    if (!text) return '';
    let cleaned = text;
    // Remove bold **text**
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
    // Remove single *emphasis* while keeping bullet lists (lines starting with * ) intact
    cleaned = cleaned.replace(/(^|\s)\*(?!\s)([^*]+?)\*(?=\s|[.,!?;:]|$)/g, '$1$2');
    // Collapse excessive blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    // Trim stray leading/trailing asterisks
    cleaned = cleaned.replace(/^\*+\s*/gm, '* '); // keep bullets with single *
    // Remove lines that are just a solitary bullet symbol
    cleaned = cleaned.replace(/^\*\s*$/gm, '');
    return cleaned.trim();
  };

  // Fetch docs (for potential future features) & attempt doc auto-load via query param
  useEffect(() => { 
    fetchRecentDocuments();
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('doc');
    if (docId) {
      loadDocument(parseInt(docId, 10));
    }
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchRecentDocuments = async () => {
    try {
      const response = await axios.get('/api/v1/documents');
      if (response.data.success) {
        setRecentDocuments(response.data.documents.slice(0, 5)); // Get last 5 documents
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a PDF file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/v1/upload-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      if (response.data.success) {
        const documentId = response.data.document_id;
        await loadDocument(documentId);

        if (response.data.duplicate) {
          // Duplicate: show info message, keep existing chat history if any
            const infoMsg = {
              type: 'assistant',
              content: `That PDF is already uploaded. Opening existing document "${response.data.filename}" (${response.data.total_pages} pages).`,
              timestamp: new Date().toISOString()
            };
            setChatHistories(prev => ({
              ...prev,
              [documentId]: [...(prev[documentId] || []), infoMsg]
            }));
            setMessages(prev => [...prev, infoMsg]);
        } else {
          // New upload path
          const welcome = [{
            type: 'assistant',
            content: `Great! I've processed "${response.data.filename}" (${response.data.total_pages} pages). Ask me anything about it!`,
            timestamp: new Date().toISOString()
          }];
          setChatHistories(prev => ({ ...prev, [documentId]: welcome }));
          setMessages(welcome);
        }
      }
    } catch (error) {
  console.error('Upload error:', error);
  alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const loadDocument = async (documentId) => {
    try {
      const [docResponse, contentResponse] = await Promise.all([
        axios.get(`/api/v1/documents/${documentId}`),
        axios.get(`/api/v1/documents/${documentId}/content`)
      ]);

      if (docResponse.data.success && contentResponse.data.success) {
        setSelectedDocument(docResponse.data.document);
        setDocumentContent(contentResponse.data.content);
        setCurrentPage(1);
        setTotalPages(contentResponse.data.content.total_pages);
        
        // Set PDF URL for viewing
        setPdfUrl(`/api/v1/documents/${documentId}/pdf`);

  // Restore existing chat history if present
  setMessages(prev => chatHistories[documentId] || prev);
      }
    } catch (error) {
      console.error('Error loading document:', error);
    }
  };

  const selectDocument = async (document) => {
    await loadDocument(document.id);
    setMessages(prev => {
      const existing = chatHistories[document.id];
      if (existing) return existing;
      const starter = [{
        type: 'assistant',
        content: `Loaded "${document.original_filename}" (${document.total_pages} pages). What would you like to know?`,
        timestamp: new Date().toISOString()
      }];
      setChatHistories(ch => ({ ...ch, [document.id]: starter }));
      return starter;
    });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedDocument) return;

    const userMessage = {
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    // Optimistically append to current messages and persist per-document
    setMessages(prev => [...prev, userMessage]);
    setChatHistories(prev => ({
      ...prev,
      [selectedDocument.id]: [...(prev[selectedDocument.id] || []), userMessage]
    }));
    setInputMessage('');
    setIsChatting(true);

    try {
      const response = await axios.post('/api/v1/chat', {
        question: userMessage.content,
        document_id: selectedDocument.id,
        context: messages.slice(-4) // Send last 4 messages as context
      });

      const assistantMessage = {
        type: 'assistant',
        content: sanitizeGemini(response.data.answer),
        timestamp: new Date().toISOString(),
        confidence: response.data.confidence
      };

      setMessages(prev => [...prev, assistantMessage]);
      setChatHistories(prev => ({
        ...prev,
        [selectedDocument.id]: [...(prev[selectedDocument.id] || []), assistantMessage]
      }));
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        type: 'assistant',
        content: 'I apologize, but I encountered an error while processing your question. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      setChatHistories(prev => ({
        ...prev,
        [selectedDocument.id]: [...(prev[selectedDocument.id] || []), errorMessage]
      }));
    } finally {
      setIsChatting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderPageContent = () => {
    if (!pdfUrl) return null;
    return (
      <iframe
        src={pdfUrl}
        className="embedded-pdf"
        title="PDF Viewer"
      />
    );
  };

  const handleDeleteCurrent = async () => {
    if (!selectedDocument) return;
    if (!window.confirm('Delete this document permanently?')) return;
    try {
      await axios.delete(`/api/v1/documents/${selectedDocument.id}`);
      setSelectedDocument(null);
      setPdfUrl(null);
      setMessages([]);
      setChatHistories(prev => {
        const copy = { ...prev };
        delete copy[selectedDocument.id];
        return copy;
      });
      // Remove doc param if present
      const url = new URL(window.location.href);
      url.searchParams.delete('doc');
      window.history.replaceState({}, '', url.toString());
      fetchRecentDocuments();
    } catch (e) {
      alert('Failed to delete document.');
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-content">
    {/* Left Panel - PDF Viewer only (recent docs removed) */}
        <div className="left-panel">
          <div className="panel-header">
            <FileText size={20} />
      <h2>Document</h2>
          </div>

          {selectedDocument ? (
            <div className="document-viewer no-header">
              <div className="document-content full-pdf">
                {renderPageContent()}
              </div>
            </div>
          ) : (
            <div className="no-document">
              <FileText size={48} />
              <h3>No Document Selected</h3>
              <p>Upload a PDF or select from recent documents to start chatting</p>
            </div>
          )}
        </div>

        {/* Right Panel - Chat Interface */}
        <div className="right-panel">
          <div className="panel-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={20} />
              <h2>Chat with PDF</h2>
            </div>
            {selectedDocument && (
              <button className="delete-doc-btn" onClick={handleDeleteCurrent} title="Delete Document">
                Delete
              </button>
            )}
          </div>

          {/* Upload Section */}
          <div className="upload-section">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button 
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload size={20} />
              {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload PDF'}
            </button>

            {isUploading && (
              <div className="upload-progress">
                <div 
                  className="progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Chat Messages */}
          <div className="chat-container">
            <div className="messages">
              {messages.length === 0 ? (
                <div className="welcome-message">
                  <Bot size={32} />
                  <h3>Welcome to Inferra.ai</h3>
                  <p>Upload a PDF document to start chatting with it using AI!</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`message ${message.type} ${message.isError ? 'error' : ''}`}
                  >
                    <div className="message-avatar">
                      {message.type === 'user' ? <User size={20} /> : <Bot size={20} />}
                    </div>
                    <div className="message-content">
                      <p>{message.content}</p>
                      <span className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {isChatting && (
                <div className="message assistant typing">
                  <div className="message-avatar">
                    <Bot size={20} />
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <Loader className="spinning" size={16} />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="message-input">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={selectedDocument ? "Ask anything about this document..." : "Please upload a document first"}
                disabled={!selectedDocument || isChatting}
                rows={1}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || !selectedDocument || isChatting}
                className="send-btn"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
