import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import DocumentViewer from './components/DocumentViewer';
import styles from './styles/App.module.css';
import 'styles/global.css';

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
      
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);
        setChats(parsedChats);
        if (parsedChats.length > 0) {
          setCurrentChatId(parsedChats[0].id);
        }
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
      if (uploadedDocuments.length > 0) {
        localStorage.setItem('zerra_documents', JSON.stringify(uploadedDocuments));
      }
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

    // Update chat with user message
    setChats(prev => 
      prev.map(chat => 
        chat.id === currentChatId 
          ? { 
              ...chat, 
              messages: [...(chat.messages || []), userMessage],
              updatedAt: new Date().toISOString()
            } 
          : chat
      )
    );

    try {
      setIsLoading(true);
      
      // Simulate API call (replace with actual API call)
      const response = await new Promise(resolve => {
        setTimeout(() => {
          resolve({
            data: {
              response: `This is a simulated response to: ${content}`,
              sources: []
            }
          });
        }, 1000);
      });

      const botMessage = {
        id: `msg-${Date.now()}-bot`,
        role: 'assistant',
        content: response.data.response,
        timestamp: Date.now(),
        sources: response.data.sources || []
      };

      // Update chat with bot response
      setChats(prev => 
        prev.map(chat => 
          chat.id === currentChatId 
            ? { 
                ...chat, 
                messages: [...(chat.messages || []), botMessage],
                updatedAt: new Date().toISOString()
              } 
            : chat
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        type: 'error',
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: Date.now()
      };

      setChats(prev => 
        prev.map(chat => 
          chat.id === currentChatId 
            ? { 
                ...chat, 
                messages: [...(chat.messages || []), errorMessage],
                updatedAt: new Date().toISOString()
              } 
            : chat
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentChatId]);

  const handleFileUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    
    const newDocuments = [];
    
    for (const file of files) {
      const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a new document object
      const newDoc = {
        id: docId,
        name: file.name,
        type: file.type,
        size: file.size,
        status: 'uploading',
        progress: 0,
        uploadedAt: new Date().toISOString()
      };
      
      newDocuments.push(newDoc);
      
      // Update progress
      setUploadProgress(prev => ({
        ...prev,
        [docId]: 0
      }));
      
      // Simulate file upload with progress
      try {
        // Replace with actual file upload logic
        const totalSize = file.size;
        let uploaded = 0;
        const chunkSize = Math.ceil(totalSize / 10);
        
        while (uploaded < totalSize) {
          await new Promise(resolve => setTimeout(resolve, 300));
          uploaded = Math.min(uploaded + chunkSize, totalSize);
          const progress = Math.round((uploaded / totalSize) * 100);
          
          setUploadProgress(prev => ({
            ...prev,
            [docId]: progress
          }));
        }
        
        // Update document status
        setUploadedDocuments(prev => 
          prev.map(doc => 
            doc.id === docId 
              ? { ...doc, status: 'processed', progress: 100 } 
              : doc
          )
        );
        
        // Create a new chat for the uploaded document
        const newChat = {
          id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          title: file.name,
          documentId: docId,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setChats(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        setCurrentView('chat');
        
      } catch (error) {
        console.error('Error uploading file:', error);
        
        setUploadedDocuments(prev => 
          prev.map(doc => 
            doc.id === docId 
              ? { ...doc, status: 'error', error: 'Upload failed' } 
              : doc
          )
        );
      } finally {
        // Clean up progress
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[docId];
          return newProgress;
        });
      }
    }
    
    // Add new documents to the list
    setUploadedDocuments(prev => [...newDocuments, ...prev]);
    
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
            />
          ) : (
            <DocumentViewer
              document={currentDocument}
              onBack={() => setCurrentView('chat')}
              darkMode={darkMode}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
