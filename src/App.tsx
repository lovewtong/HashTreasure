import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
// 全局 CSS 已在 main.tsx 导入，这里不再需要导入 "./styles.css"
import './i18n';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await invoke('get_auth_token');
        if (token) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Failed to check token:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-lg font-medium text-gray-600">Loading...</div>
        </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900">
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
