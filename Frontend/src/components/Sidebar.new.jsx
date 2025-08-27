import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  MessageSquare,
  FileText,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Settings,
  Bot,
  Clock
} from 'lucide-react';
import styles from '../styles/components/Sidebar.module.css';

const Sidebar = ({
  currentView,
  onViewChange,
  chats = [],
  currentChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  uploadedDocuments = [],
  onDocumentSelect,
  selectedDocument,
  darkMode = false,
  onToggleTheme
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredChat, setHoveredChat] = useState(null);

  const formatChatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now - date) / 36e5;
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 1 week
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const truncateText = (text, maxLength = 30) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleChatClick = (chatId) => {
    onViewChange('chat');
    onChatSelect(chatId);
  };

  const handleDocumentClick = (docId) => {
    onViewChange('documents');
    onDocumentSelect(docId);
  };

  const handleNewChat = () => {
    onNewChat();
    onViewChange('chat');
  };

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        {!isCollapsed && <h2 className={styles.sidebarTitle}>ChatPDF</h2>}
        <button 
          onClick={toggleCollapse} 
          className={styles.toggleButton}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navSection}>
          <button 
            onClick={handleNewChat}
            className={styles.newChatButton}
          >
            <Plus size={18} className={styles.newChatButtonIcon} />
            <span className={styles.newChatButtonText}>New Chat</span>
          </button>
        </div>

        {/* Chats Section */}
        <div className={styles.navSection}>
          <div className={styles.navHeader}>
            <MessageSquare size={16} />
            {!isCollapsed && <span className={styles.navHeaderText}>Recent Chats</span>}
          </div>
          <ul className={styles.list}>
            {chats.map((chat) => (
              <li 
                key={chat.id} 
                className={`${styles.listItem} ${currentChatId === chat.id ? styles.active : ''}`}
                onMouseEnter={() => setHoveredChat(chat.id)}
                onMouseLeave={() => setHoveredChat(null)}
              >
                <button
                  onClick={() => handleChatClick(chat.id)}
                  className={`${styles.listItemButton} ${currentView === 'chat' && currentChatId === chat.id ? styles.active : ''}`}
                >
                  <MessageSquare size={16} className={styles.listItemIcon} />
                  {!isCollapsed && (
                    <>
                      <span className={styles.listItemText}>
                        {truncateText(chat.title || 'Untitled Chat')}
                      </span>
                      <span className={styles.listItemTime}>
                        {formatChatTime(chat.updatedAt || chat.createdAt)}
                      </span>
                    </>
                  )}
                </button>
                {!isCollapsed && hoveredChat === chat.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className={styles.deleteButton}
                    aria-label="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            ))}
            {(chats.length === 0 && !isCollapsed) && (
              <li className={styles.listItem}>
                <div className={styles.listItemButton}>
                  <span className={styles.listItemText}>No recent chats</span>
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* Documents Section */}
        <div className={styles.navSection}>
          <div className={styles.navHeader}>
            <FileText size={16} />
            {!isCollapsed && <span className={styles.navHeaderText}>Documents</span>}
          </div>
          <ul className={styles.list}>
            {uploadedDocuments.map((doc) => (
              <li 
                key={doc.id} 
                className={`${styles.listItem} ${selectedDocument?.id === doc.id ? styles.active : ''}`}
              >
                <button
                  onClick={() => handleDocumentClick(doc.id)}
                  className={`${styles.listItemButton} ${currentView === 'documents' && selectedDocument?.id === doc.id ? styles.active : ''}`}
                >
                  <FileText size={16} className={styles.listItemIcon} />
                  {!isCollapsed && (
                    <span className={styles.listItemText}>
                      {truncateText(doc.name || 'Untitled Document')}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {(uploadedDocuments.length === 0 && !isCollapsed) && (
              <li className={styles.listItem}>
                <div className={styles.listItemButton}>
                  <span className={styles.listItemText}>No documents</span>
                </div>
              </li>
            )}
          </ul>
        </div>
      </nav>

      <div className={styles.sidebarFooter}>
        <button 
          onClick={onToggleTheme}
          className={styles.themeToggle}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <div className={styles.themeToggleContent}>
            {darkMode ? (
              <Sun size={18} className={styles.themeToggleIcon} />
            ) : (
              <Moon size={18} className={styles.themeToggleIcon} />
            )}
            {!isCollapsed && (
              <span className={styles.themeToggleText}>
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <div className={styles.themeToggleIconRight}>
              <Settings size={16} />
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

Sidebar.propTypes = {
  currentView: PropTypes.oneOf(['chat', 'documents', 'settings']),
  onViewChange: PropTypes.func.isRequired,
  chats: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      updatedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)])
    })
  ),
  currentChatId: PropTypes.string,
  onChatSelect: PropTypes.func.isRequired,
  onNewChat: PropTypes.func.isRequired,
  onDeleteChat: PropTypes.func.isRequired,
  uploadedDocuments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
      status: PropTypes.string
    })
  ),
  onDocumentSelect: PropTypes.func.isRequired,
  selectedDocument: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string
  }),
  darkMode: PropTypes.bool,
  onToggleTheme: PropTypes.func.isRequired
};

export default Sidebar;
