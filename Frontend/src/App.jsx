import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import DocumentViewer from './components/DocumentViewer';
import FileUpload from './FileUpload';
import styles from './styles/App.module.css';
import './styles/global.css';

// Configure axios base URL for backend API
axios.defaults.baseURL = 'https://chatpdf-7k6m.onrender.com';
axios.defaults.timeout = 30000;

function App() {
  const [currentView, setCurrentView] = useState('chat');
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load saved data on mount
  useEffect(() => {
    try {
      const savedChats = localStorage.getItem('zerra_chats_v2');
      const savedDocs = localStorage.getItem('zerra_documents');
      const savedTheme = localStorage.getItem('zerra_theme');
      let parsedChats = [];
      if (savedChats) {
        parsedChats = JSON.parse(savedChats);
        setChats(parsedChats);
        if (parsedChats.length > 0) {
          setCurrentChatId(parsedChats[0].id);
        }
      }
      if (!savedChats || parsedChats.length === 0) {
        // No existing chat: auto-create one
        const newChat = {
          id: `chat-${Date.now()}`,
          title: 'New Chat',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setChats([newChat]);
        setCurrentChatId(newChat.id);
      }
      if (savedDocs) {
        setUploadedDocuments(JSON.parse(savedDocs));
      }
      if (savedTheme === 'dark') {
        setDarkMode(true);
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
      localStorage.removeItem('zerra_chats_v2');
      localStorage.removeItem('zerra_documents');
      localStorage.removeItem('zerra_theme');
    }
  }, []);

  // Save data when it changes
  useEffect(() => {
    try {
      if (chats.length > 0) {
        localStorage.setItem('zerra_chats_v2', JSON.stringify(chats));
      }
    } catch (error) {
      console.error('Error saving chats:', error);
    }
  }, [chats]);

  useEffect(() => {
    try {
      localStorage.setItem('zerra_documents', JSON.stringify(uploadedDocuments));
    } catch (error) {
      console.error('Error saving documents:', error);
    }
  }, [uploadedDocuments]);

  useEffect(() => {
    try {
      localStorage.setItem('zerra_theme', darkMode ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }, [darkMode]);

  const toggleTheme = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const handleNewChat = useCallback(() => {
    const newChat = {
      id: `chat-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setCurrentView('chat');
  }, []);

  const handleDeleteChat = useCallback((chatId) => {
    setChats(prev => {
      const newChats = prev.filter(chat => chat.id !== chatId);
      if (currentChatId === chatId) {
        setCurrentChatId(newChats[0]?.id || null);
      }
      return newChats;
    });
  }, [currentChatId]);

  const handleSendMessage = useCallback(async (content) => {
    if (!currentChatId || !content.trim()) return;
    
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now()
    };

    // Update chat with user message immediately
    setChats(prev => 
      prev.map(chat => 
        chat.id === currentChatId 
          ? { 
              ...chat, 
              messages: [...(chat.messages || []), userMessage],
              title: chat.title === 'New Chat' ? content.trim().substring(0, 50) + (content.trim().length > 50 ? '...' : '') : chat.title,
              updatedAt: new Date().toISOString()
            } 
          : chat
      )
    );

    try {
      setIsLoading(true);
      setError(null);
      
      // Call the real backend chat API
      const chatRequest = {
        query: content.trim()
      };
      
      // If there's a selected document, include its ID in the chat request
      if (selectedDocument && selectedDocument.id) {
        chatRequest.document_id = selectedDocument.id;
      }
      
      const response = await axios.post('/chat', chatRequest, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout for AI responses
      });
      
      if (response.data && response.data.answer) {
        const aiMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: response.data.answer,
          timestamp: Date.now() + 1
        };
        
        // Update chat with AI response
        setChats(prev => 
          prev.map(chat => 
            chat.id === currentChatId 
              ? { 
                  ...chat, 
                  messages: [...(chat.messages || []).filter(msg => msg.id !== userMessage.id), userMessage, aiMessage],
                  updatedAt: new Date().toISOString()
                } 
              : chat
          )
        );
      } else {
        throw new Error('Invalid response from chat API');
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorContent = 'Sorry, I encountered an error processing your message. Please try again.';
      
      // Handle specific error types
      if (error.code === 'ECONNABORTED') {
        errorContent = 'The request timed out. The AI model might be busy. Please try again.';
      } else if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const detail = error.response.data?.detail || error.response.data?.message;
        
        if (status === 400) {
          errorContent = detail || 'Invalid request. Please check your message and try again.';
        } else if (status === 500) {
          errorContent = detail || 'Server error occurred. Please try again later.';
        } else if (status === 503) {
          errorContent = 'The AI service is temporarily unavailable. Please try again later.';
        } else {
          errorContent = detail || `Server error (${status}). Please try again.`;
        }
      } else if (error.request) {
        // Network error
        errorContent = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorContent);
      
      // Add error message to chat
      const errorMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: errorContent,
        timestamp: Date.now() + 1,
        error: true
      };
      
      setChats(prev => 
        prev.map(chat => 
          chat.id === currentChatId 
            ? { 
                ...chat, 
                messages: [...(chat.messages || []).filter(msg => msg.id !== userMessage.id), userMessage, errorMessage],
                updatedAt: new Date().toISOString()
              } 
            : chat
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentChatId]);

  // Document delete handler
  const handleDeleteDocument = useCallback((docId) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== docId));
    setSelectedDocument(prev => (prev && prev.id === docId ? null : prev));
  }, []);

  const handleFileUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    
    const formData = new FormData();
    const fileArray = Array.from(files);
    fileArray.forEach(file => formData.append('files', file));

    // Initialize progress for each file
    fileArray.forEach(file => {
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: { progress: 0, status: 'uploading', error: null }
      }));
    });

    try {
      console.log('Starting upload to backend with files:', fileArray.map(f => f.name));
      
      // Upload files to backend
      const response = await axios.post('/api/v1/upload-multi', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          fileArray.forEach(file => {
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: {
                ...prev[file.name],
                progress: percent,
                status: percent === 100 ? 'processing' : 'uploading'
              }
            }));
          });
        }
      });
      
      console.log('Upload response received:', response.data);
      
      if (response.data && Array.isArray(response.data.results)) {
        const newDocs = response.data.results.map(result => {
          const file = fileArray.find(f => f.name === result.filename);
          return {
            id: result.document_id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: result.filename,
            size: file?.size || 0,
            type: file?.type || 'application/pdf',
            status: result.status === 'accepted' ? 'completed' : 'error',
            error: result.status !== 'accepted' ? (result.message || 'Upload failed') : null,
            uploadedAt: new Date().toISOString()
          };
        });

        setUploadedDocuments(prev => [...newDocs, ...prev]);

        // Update progress to completed/error
        newDocs.forEach(doc => {
          setUploadProgress(prev => ({
            ...prev,
            [doc.name]: {
              ...prev[doc.name],
              progress: 100,
              status: doc.status,
              error: doc.error
            }
          }));
        });
        
        // Clean up progress after 5 seconds to allow users to see completion state
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            fileArray.forEach(file => {
              // Only remove if the upload is completed or errored
              if (prev[file.name]?.status === 'completed' || prev[file.name]?.status === 'error') {
                delete newProgress[file.name];
              }
            });
            return newProgress;
          });
        }, 10000); // Increased from 5 to 10 seconds
        
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (error) {
      console.error('Error uploading files:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Update all files to error state
      fileArray.forEach(file => {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: {
            ...prev[file.name],
            progress: 0,
            status: 'error',
            error: error.response?.data?.message || error.message || 'Upload failed'
          }
        }));
      });
      
      // Clean up progress after 5 seconds for errors
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          fileArray.forEach(file => {
            delete newProgress[file.name];
          });
          return newProgress;
        });
      }, 10000); // Increased from 5 to 10 seconds
    }
  }, []);

  const currentChat = chats.find(chat => chat.id === currentChatId) || {};
  const currentDocument = selectedDocument || 
    (currentChat?.documentId ? 
      uploadedDocuments.find(doc => doc.id === currentChat.documentId) : null);

  return (
    <div className={styles.appContainer} data-theme={darkMode ? 'dark' : 'light'}>
      <div className={styles.mainContent}>
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          chats={chats}
          currentChatId={currentChatId}
          onChatSelect={setCurrentChatId}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          uploadedDocuments={uploadedDocuments}
          onDocumentSelect={(docId) => {
            const doc = uploadedDocuments.find(d => d.id === docId);
            setSelectedDocument(doc);
            setCurrentView('documents');
          }}
          onDeleteDocument={handleDeleteDocument}
          selectedDocument={selectedDocument}
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
        />

        <main className={styles.content}>
          {currentView === 'chat' ? (
            <ChatInterface
              chat={currentChat}
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
              uploadProgress={uploadProgress}
              dragActive={dragActive}
              onDragActive={setDragActive}
              darkMode={darkMode}
              isLoading={isLoading}
              selectedDocument={selectedDocument}
            />
          ) : (
            <DocumentViewer
              documents={uploadedDocuments}
              selectedDocument={selectedDocument}
              onDocumentSelect={(docId) => {
                const docObj = uploadedDocuments.find(d => d.id === docId);
                setSelectedDocument(docObj);
                setCurrentView('documents');
              }}
              onFileUpload={handleFileUpload}
              uploadProgress={uploadProgress}
              dragActive={dragActive}
              onDragActive={setDragActive}
              darkMode={darkMode}
              onDeleteDocument={handleDeleteDocument}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
