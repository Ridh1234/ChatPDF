import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Moon, Sun, LayoutDashboard, Files } from 'lucide-react';
import Dashboard from './components/Dashboard';
import DocumentDirectory from './components/DocumentDirectory';
import './App.css';
import logoSvg from './assets/logo.svg';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Load theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className={`app ${darkMode ? 'dark' : ''}`}>
      <div className="app-container">
        {/* Sidebar */}
        <aside className="sidebar fixed">
          <div className="sidebar-header">
            <div className="logo">
              <div className="logo-icon pro">
                <img src={logoSvg} alt="Inferra.ai" className="logo-img" />
              </div>
              <h1>Inferra.ai</h1>
            </div>
          </div>

          <nav className="sidebar-nav">
            <ul>
              <li>
                <button 
                  className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
                  onClick={() => navigate('/')}
                >
                  <LayoutDashboard size={18} />
                  <span className="nav-text">Dashboard</span>
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${location.pathname === '/documents' ? 'active' : ''}`}
                  onClick={() => navigate('/documents')}
                >
                  <Files size={18} />
                  <span className="nav-text">Documents</span>
                </button>
              </li>
            </ul>
          </nav>

          <div className="sidebar-footer">
            <button className="theme-toggle" onClick={toggleTheme}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span className="theme-text">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={<DocumentDirectory />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
