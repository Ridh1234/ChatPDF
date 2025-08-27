import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  Send, 
  Paperclip,
  AlertTriangle,
  Bot,
  User,
  Loader2,
  MessageCircle
} from 'lucide-react';
import styles from '../styles/components/ChatInterface.module.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.errorBoundary}>
          <h3>Something went wrong</h3>
          <p>Please refresh the page and try again.</p>
          <button
            onClick={() => window.location.reload()}
            className={styles.refreshButton}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// API Service
const chatAPI = {
  sendMessage: async (message, documentIds = []) => {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: message
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  
  uploadFiles: async (files, onProgress) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await fetch(`${API_BASE_URL}/api/v1/upload-multi`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    return response.json();
  },
  
  getUploadStatus: async (docId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/status/${docId}`);
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }
    return response.json();
  }
};

// Message Component
const Message = ({ message, isUser, isError = false }) => {
  const containerClass = `${styles.messageContainer} ${isUser ? styles.user : styles.assistant}`;
  const contentClass = `${styles.messageContent} ${isUser ? styles.user : styles.assistant}`;

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        {message.content}
      </div>
      <div className={styles.messageTimestamp}>
        {new Date(message.timestamp || Date.now()).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </div>
    </div>
  );
};

Message.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string,
    content: PropTypes.string.isRequired,
    timestamp: PropTypes.number,
    role: PropTypes.oneOf(['user', 'assistant']).isRequired,
    type: PropTypes.string
  }).isRequired,
  isUser: PropTypes.bool,
  isError: PropTypes.bool
};

Message.defaultProps = {
  isUser: false,
  isError: false
};

const ChatInterface = ({
  chat = {},
  onSendMessage,
  onFileUpload,
  uploadProgress = {},
  dragActive = false,
  onDragActive,
  darkMode = false,
  isLoading = false,
  selectedDocument = null
}) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!input.trim() || isLoading) return;
    
    // Call parent's send message handler
    if (onSendMessage) {
      await onSendMessage(input.trim());
    }
    
    setInput('');
    setError(null);
  }, [input, isLoading, onSendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  }, [handleSubmit]);

  const handleFileChange = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setError(null);
    setShowUploadPopup(true);
    
    try {
      // Call parent's file upload handler
      if (onFileUpload) {
        await onFileUpload(files);
      }
      
      // Reset progress after a delay
      setTimeout(() => {
        // Progress will be managed by the parent component
      }, 2000);
      
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Failed to upload files. Please try again.');
    } finally {
      setShowUploadPopup(false);
    }
    
    // Reset file input
    e.target.value = '';
  }, [onFileUpload]);

  return (
    <ErrorBoundary>
      <div className={styles.chatContainer} data-theme={darkMode ? 'dark' : 'light'}>
        {/* Messages Container */}
        <div className={styles.messagesContainer}>
          {/* Document Context Indicator */}
          {selectedDocument && (
            <div style={{
              padding: '16px',
              margin: '16px',
              background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.9) 0%, rgba(219, 234, 254, 0.8) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
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
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                📄
              </div>
              <div>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e3a8a'
                }}>
                  Chatting about: {selectedDocument.name}
                </p>
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  Your questions will be answered based on this document
                </p>
              </div>
            </div>
          )}
          
          <div className={styles.messagesWrapper}>
            {chat.messages && chat.messages.length > 0 ? (
              chat.messages.map((message, index) => (
                <Message 
                  key={message.id || index} 
                  message={message} 
                  isUser={message.role === 'user'}
                  isError={message.type === 'error'}
                />
              ))
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>
                  <MessageCircle size={24} />
                </div>
                <h2 className={styles.emptyStateTitle}>
                  How can I help you today?
                </h2>
                <p className={styles.emptyStateDescription}>
                  Ask me anything or upload documents to get started with your analysis.
                </p>
              </div>
            )}
            
            {isLoading && (
              <div className={styles.loadingIndicator}>
                <div className={styles.loadingIcon}>
                  <Bot size={12} />
                </div>
                <span className={styles.loadingText}>
                  Thinking
                </span>
                <div className={styles.loadingDots}>
                  <div className={styles.loadingDot}></div>
                  <div className={styles.loadingDot}></div>
                  <div className={styles.loadingDot}></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <footer className={styles.inputArea}>
          <div className={styles.inputWrapper}>
            {/* File Upload Progress */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className={styles.uploadProgressContainer}>
                {Object.entries(uploadProgress).map(([fileName, progress]) => (
                  <div key={fileName} className={styles.uploadProgressItem}>
                    <div className={styles.uploadProgressHeader}>
                      <span className={styles.uploadFileName}>{fileName}</span>
                      <span className={styles.uploadStatus}>{progress.status}</span>
                    </div>
                    <div className={styles.uploadProgressBar}>
                      <div 
                        className={styles.uploadProgressFill}
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                    {progress.error && (
                      <div className={styles.uploadError}>{progress.error}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className={styles.inputContainer}>
              {/* File Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={styles.fileUploadButton}
                title="Upload file"
                style={{ 
                  border: 'none', 
                  outline: 'none', 
                  background: 'transparent',
                  boxShadow: 'none'
                }}
                onFocus={(e) => e.target.style.outline = 'none'}
              >
                <Paperclip size={20} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                className={styles.fileInput}
                onChange={handleFileChange}
                multiple
                accept=".pdf,.txt,.doc,.docx,.md"
                style={{ display: 'none' }}
              />

              {/* Message Input */}
              <div className={styles.textAreaContainer}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={styles.messageTextarea}
                  placeholder="Type your message..."
                  rows={1}
                  disabled={isLoading}
                  style={{
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                    resize: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.outline = 'none';
                    e.target.style.border = 'none';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Send Button */}
              <button
                type="button"
                onClick={handleSubmit}
                className={styles.sendButton}
                disabled={!input.trim() || isLoading}
                title="Send message"
                style={{ 
                  border: 'none', 
                  outline: 'none', 
                  background: 'transparent',
                  boxShadow: 'none'
                }}
                onFocus={(e) => e.target.style.outline = 'none'}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

ChatInterface.propTypes = {
  chat: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    messages: PropTypes.array,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string
  }),
  onSendMessage: PropTypes.func.isRequired,
  onFileUpload: PropTypes.func.isRequired,
  uploadProgress: PropTypes.objectOf(
    PropTypes.shape({
      progress: PropTypes.number.isRequired,
      status: PropTypes.string.isRequired,
      error: PropTypes.string
    })
  ),
  dragActive: PropTypes.bool,
  onDragActive: PropTypes.func,
  darkMode: PropTypes.bool,
  isLoading: PropTypes.bool,
  selectedDocument: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    status: PropTypes.string
  })
};

ChatInterface.defaultProps = {
  chat: {},
  uploadProgress: {},
  dragActive: false,
  darkMode: false,
  isLoading: false,
  selectedDocument: null
};

export default ChatInterface;
