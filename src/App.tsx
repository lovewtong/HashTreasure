import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Withdraw from './components/Withdraw'; // ✅ 新增：提现页
import './i18n';

type View = 'dashboard' | 'withdraw';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');

  // 保持你原有的 token 检查逻辑
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await invoke<string | null>('get_auth_token');
        if (token) setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to check token:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, []);

  // 极简 hash 路由：#/withdraw 与 #/dashboard
  useEffect(() => {
    const syncFromHash = () => {
      const h = (window.location.hash || '#/dashboard').replace('#/', '');
      setView(h === 'withdraw' ? 'withdraw' : 'dashboard');
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const gotoWithdraw = () => (window.location.hash = '#/withdraw');
  const gotoDashboard = () => (window.location.hash = '#/dashboard');

  const handleLoginSuccess = () => setIsAuthenticated(true);
  const handleLogout = () => setIsAuthenticated(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-lg font-medium text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900">
      {isAuthenticated ? (
        view === 'withdraw'
          ? <Withdraw onBack={gotoDashboard} />
          : <Dashboard onLogout={handleLogout} onGoWithdraw={gotoWithdraw} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
