// API Configuration for different environments

// Get API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper function to build full API URLs
export const buildApiUrl = (endpoint) => {
  if (API_BASE_URL) {
    return `${API_BASE_URL}${endpoint}`;
  }
  return endpoint; // Use proxy in development
};

// Default axios configuration
export const API_DEFAULTS = {
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
};
