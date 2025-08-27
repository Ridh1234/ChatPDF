import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const CHAT_STORAGE_KEY = 'zerra_chats_v1';

function getStoredChats() {
  try {
    const data = localStorage.getItem(CHAT_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveChats(chats) {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
}

function Chat() {
  const [chats, setChats] = useState(getStoredChats()); // [{id, messages: [{role, content, timestamp}]}]
  const [currentChatIdx, setCurrentChatIdx] = useState(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats, currentChatIdx]);

  // Save chats to localStorage
  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  function startNewChat() {
    setChats(prev => [{ id: Date.now(), messages: [] }, ...prev]);
    setCurrentChatIdx(0);
    setInput('');
    setError(null);
  }

  function selectChat(idx) {
    setCurrentChatIdx(idx);
    setInput('');
    setError(null);
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    const userMsg = { role: 'user', content: input, timestamp: Date.now() };
    // Add user message
    setChats(prev => {
      const updated = [...prev];
      updated[currentChatIdx].messages.push(userMsg);
      return updated;
    });
    setInput('');
    try {
      const res = await axios.post('/chat', { query: userMsg.content });
      const botMsg = {
        role: 'bot',
        content: res.data.answer,
        timestamp: Date.now(),
      };
      setChats(prev => {
        const updated = [...prev];
        updated[currentChatIdx].messages.push(botMsg);
        return updated;
      });
    } catch (err) {
      setError('Error contacting backend.');
    } finally {
      setLoading(false);
    }
  }

  const currentChat = chats[currentChatIdx] || { messages: [] };

  return (
    <div className="chat-container" style={{
      display: 'flex',
      height: '100vh',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Premium Sidebar for chat history */}
      <div className="chat-sidebar" style={{
        width: '320px',
        background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 50%, #dbeafe 100%)',
        borderRight: '1px solid #bfdbfe',
        boxShadow: '4px 0 25px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #bfdbfe',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          boxShadow: '0 4px 25px rgba(37, 99, 235, 0.3)'
        }}>
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
              <div style={{
                width: '40px',
                height: '40px',
                background: 'white',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}>
                <span style={{
                  color: '#2563eb',
                  fontWeight: '700',
                  fontSize: '18px'
                }}>Z</span>
              </div>
              <span style={{
                fontWeight: '700',
                fontSize: '20px',
                color: 'white'
              }}>Zerra.ai</span>
            </div>
            <button
              onClick={startNewChat}
              title="Start new chat"
              className="btn-primary"
              style={{
                padding: '8px 16px',
                background: 'white',
                color: '#2563eb',
                borderRadius: '12px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#eff6ff';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.transform = 'scale(1)';
              }}
            >
              New Chat
            </button>
          </div>
        </div>
        <div style={{
          flex: '1',
          overflowY: 'auto',
          padding: '16px'
        }}>
          {chats.length === 0 ? (
            <div style={{
              padding: '24px',
              textAlign: 'center'
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
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
              }}>
                <span style={{
                  color: '#2563eb',
                  fontSize: '24px'
                }}>💬</span>
              </div>
              <p style={{
                color: '#2563eb',
                fontWeight: '500',
                margin: '0 0 4px 0',
                fontSize: '16px'
              }}>No conversations yet</p>
              <p style={{
                color: '#3b82f6',
                fontSize: '14px',
                margin: '0'
              }}>Start your first chat!</p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {chats.map((chat, idx) => (
                <div
                  key={chat.id}
                  onClick={() => selectChat(idx)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid',
                    borderColor: idx === currentChatIdx ? '#93c5fd' : '#bfdbfe',
                    background: idx === currentChatIdx 
                      ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' 
                      : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    boxShadow: idx === currentChatIdx 
                      ? '0 8px 25px rgba(59, 130, 246, 0.2)' 
                      : '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    if (idx !== currentChatIdx) {
                      e.target.style.background = 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
                      e.target.style.borderColor = '#93c5fd';
                      e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (idx !== currentChatIdx) {
                      e.target.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
                      e.target.style.borderColor = '#bfdbfe';
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }
                  }}
                >
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
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)'
                    }}>
                      <span style={{
                        color: '#2563eb',
                        fontSize: '14px'
                      }}>💬</span>
                    </div>
                    <div style={{
                      flex: '1',
                      minWidth: '0'
                    }}>
                      <p style={{
                        fontWeight: '600',
                        color: '#1e3a8a',
                        fontSize: '14px',
                        margin: '0 0 2px 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {chat.messages.length > 0
                          ? chat.messages[0].content.slice(0, 30) + '...'
                          : 'New Chat'}
                      </p>
                      <p style={{
                        color: '#3b82f6',
                        fontSize: '12px',
                        margin: '0'
                      }}>
                        {chat.messages.length} message{chat.messages.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Premium Main chat window */}
      <div className="chat-main" style={{
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #eff6ff 100%)'
      }}>
        <div style={{
          flex: '1',
          overflowY: 'auto',
          padding: '32px'
        }}>
          {currentChat.messages.length === 0 && (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div className="welcome-card animate-fadeInUp" style={{
                textAlign: 'center',
                maxWidth: '512px',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.1)',
                border: '1px solid #bfdbfe'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px auto',
                  boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)'
                }}>
                  <span style={{
                    color: 'white',
                    fontSize: '32px'
                  }}>🚀</span>
                </div>
                <h2 style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#1e3a8a',
                  margin: '0 0 16px 0'
                }}>
                  Welcome to Zerra.ai
                </h2>
                <p style={{
                  color: '#2563eb',
                  margin: '0 0 32px 0',
                  fontSize: '18px',
                  fontWeight: '500',
                  lineHeight: '1.6'
                }}>
                  Your intelligent AI assistant is ready to help. Start a conversation to get insights and answers.
                </p>
              </div>
            </div>
          )}
          <div style={{
            maxWidth: '1024px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {currentChat.messages.map((msg, i) => (
              <div
                key={i}
                className="message-item animate-fadeInUp"
                style={{
                  display: 'flex',
                  gap: '16px',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {msg.role !== 'user' && (
                  <div style={{ flexShrink: '0' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
                      border: '2px solid #93c5fd',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                    }}>
                      <span style={{
                        color: '#2563eb',
                        fontWeight: '700',
                        fontSize: '16px'
                      }}>Z</span>
                    </div>
                  </div>
                )}
                <div
                  className="message-bubble"
                  style={{
                    maxWidth: '512px',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    boxShadow: msg.role === 'user' 
                      ? '0 8px 25px rgba(59, 130, 246, 0.3)' 
                      : '0 8px 25px rgba(0, 0, 0, 0.1)',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                      : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: msg.role === 'user' ? 'none' : '1px solid #bfdbfe',
                    color: msg.role === 'user' ? 'white' : '#1e3a8a',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  <p style={{
                    fontWeight: '500',
                    lineHeight: '1.6',
                    margin: '0 0 12px 0',
                    fontSize: '15px'
                  }}>{msg.content}</p>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: msg.role === 'user' ? 'rgba(255, 255, 255, 0.8)' : '#3b82f6',
                    margin: '0'
                  }}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div style={{ flexShrink: '0' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}>
                      <span style={{
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '12px'
                      }}>You</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="loading-message animate-fadeInUp" style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'flex-start'
              }}>
                <div style={{ flexShrink: '0' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
                    border: '2px solid #93c5fd',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                  }}>
                    <span style={{
                      color: '#2563eb',
                      fontWeight: '700',
                      fontSize: '16px'
                    }}>Z</span>
                  </div>
                </div>
                <div style={{
                  maxWidth: '512px',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: '1px solid #bfdbfe',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '4px'
                    }}>
                      <div className="animate-bounce" style={{
                        width: '8px',
                        height: '8px',
                        background: '#3b82f6',
                        borderRadius: '50%'
                      }}></div>
                      <div className="animate-bounce" style={{
                        width: '8px',
                        height: '8px',
                        background: '#3b82f6',
                        borderRadius: '50%',
                        animationDelay: '0.1s'
                      }}></div>
                      <div className="animate-bounce" style={{
                        width: '8px',
                        height: '8px',
                        background: '#3b82f6',
                        borderRadius: '50%',
                        animationDelay: '0.2s'
                      }}></div>
                    </div>
                    <span style={{
                      color: '#2563eb',
                      fontWeight: '500',
                      fontSize: '15px'
                    }}>Zerra.ai is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>
        {/* Premium Input box */}
        <div className="chat-input-area" style={{
          borderTop: '1px solid #bfdbfe',
          background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
          boxShadow: '0 -4px 25px rgba(0, 0, 0, 0.1)'
        }}>
          <form
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '24px',
              maxWidth: '1024px',
              margin: '0 auto',
              gap: '16px'
            }}
            onSubmit={sendMessage}
          >
            <input
              type="text"
              style={{
                flex: '1',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '2px solid #bfdbfe',
                outline: 'none',
                background: 'white',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                fontWeight: '500',
                color: '#1e3a8a',
                fontSize: '15px',
                transition: 'all 0.2s ease'
              }}
              placeholder="Ask Zerra.ai anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              autoFocus
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#bfdbfe';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '16px 32px',
                background: loading || !input.trim() 
                  ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' 
                  : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                borderRadius: '16px',
                fontWeight: '600',
                boxShadow: loading || !input.trim() 
                  ? '0 4px 12px rgba(156, 163, 175, 0.3)' 
                  : '0 4px 12px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s ease',
                border: 'none',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? '0.5' : '1',
                fontSize: '15px'
              }}
              disabled={loading || !input.trim()}
              onMouseEnter={(e) => {
                if (!loading && input.trim()) {
                  e.target.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && input.trim()) {
                  e.target.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }
              }}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>
          {error && (
            <div style={{
              padding: '0 24px 16px 24px',
              maxWidth: '1024px',
              margin: '0 auto'
            }}>
              <div className="error-message animate-fadeInUp" style={{
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                fontSize: '14px'
              }}>
                <strong style={{ fontWeight: '600' }}>Error:</strong> {error}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chat;
