import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Home, BarChart2, HardDrive, LogOut, ChevronDown, ChevronUp } from 'lucide-react';

interface DashboardProps {
  onLogout: () => void;
}

const NavItem = ({ icon, text, active = false }: { icon: React.ReactNode, text: string, active?: boolean }) => (
  <a
    href="#"
    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
      active
        ? 'bg-blue-600 text-white shadow-lg'
        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
    }`}
  >
    {icon}
    <span className="ml-4">{text}</span>
  </a>
);

const UserProfile = ({ onLogout }: { onLogout: () => Promise<void> }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center w-full p-2 space-x-3 text-left transition-colors duration-200 bg-gray-100 rounded-lg hover:bg-gray-200">
                <img className="flex-shrink-0 object-cover w-10 h-10 rounded-full" src="https://placehold.co/100x100/E2E8F0/4A5568?text=U" alt="User" />
                <div className="flex-1">
                    <h2 className="text-sm font-semibold text-gray-900">用户名</h2>
                    <p className="text-xs text-gray-500">在线</p>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 z-10 w-full mt-2 origin-top-right bg-white rounded-md shadow-lg bottom-full">
                    <div className="py-1">
                        <button
                            onClick={onLogout}
                            className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                        >
                            <LogOut className="w-4 h-4 mr-3" />
                            登出
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const handleLogout = async () => {
    try {
      await invoke('logout');
      onLogout();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="flex flex-col w-64 p-4 bg-white border-r border-gray-200">
        <div className="flex items-center mb-8">
            <img src="https://placehold.co/40x40/6366F1/FFFFFF?text=C" alt="Logo" className="w-10 h-10 rounded-lg"/>
            <h1 className="ml-3 text-xl font-bold text-gray-800">客户端</h1>
        </div>
        <nav className="flex-1 space-y-2">
          <NavItem icon={<Home size={20} />} text="主页" active={true} />
          <NavItem icon={<HardDrive size={20} />} text="设备管理" />
          <NavItem icon={<BarChart2 size={20} />} text="收益统计" />
        </nav>
        <div className="mt-auto">
            <UserProfile onLogout={handleLogout} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">欢迎回来！</h2>
          <p className="mt-2 text-gray-600">这是您的主控制面板。</p>
        </header>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Placeholder cards */}
          <div className="p-6 bg-white rounded-xl shadow-md">
            <h3 className="font-semibold text-gray-800">在线设备</h3>
            <p className="mt-2 text-4xl font-bold text-blue-600">5</p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-md">
            <h3 className="font-semibold text-gray-800">今日收益 (预估)</h3>
            <p className="mt-2 text-4xl font-bold text-green-600">¥ 12.34</p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-md">
            <h3 className="font-semibold text-gray-800">账户余额</h3>
            <p className="mt-2 text-4xl font-bold text-indigo-600">¥ 567.89</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

