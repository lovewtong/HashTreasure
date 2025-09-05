import React, { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Home, BarChart2, HardDrive, LogOut } from 'lucide-react';

import ThemeToggle from './ThemeToggle';
import Tag from './ui/Tag';
import Progress from './ui/Progress';

// -----------------------------------------------------------------------------
// Dashboard
//
// This component renders the main control panel for the mining client.  In
// addition to the existing CPU mining controls it now exposes a GPU panel and
// button.  The client greets the user by name and displays the first letter
// (or Chinese character) of the username in the sidebar.  The graph and
// device table have been removed as per the requirements.
//
// The CPU panel will initially display “算法:rx/0.0”。 When a user starts
// mining there is a delay before hashrate data is available; during this
// warm‑up period a friendly message is shown.  Once hashrate updates arrive
// the current algorithm and hashrate are displayed.  Stopping the miner
// resets the display back to its default state.  GPU mining is not yet
// implemented so toggling the GPU button simply changes the UI state.

type DeviceStatus = 'online' | 'offline' | 'maintain';
type DeviceView = { name: string; status: DeviceStatus; power: number; enabled: boolean; };

function toDeviceStatus(code: unknown): DeviceStatus {
  if (code === 1 || code === 'online') return 'online';
  if (code === 2 || code === 'maintain') return 'maintain';
  return 'offline';
}

const Dashboard: React.FC<{ onLogout?: () => void; onGoWithdraw?: () => void; }> = ({ onLogout, onGoWithdraw }) => {
  // 用户名和首字母，用于在侧边栏和欢迎语中使用
  const [userName, setUserName] = useState<string>('');
  const userInitial = useMemo(() => {
    if (!userName) return '';
    const ch = userName.charAt(0);
    // 如果是中文直接显示，否则转换成大写首字母
    return /[\u4e00-\u9fa5]/.test(ch) ? ch : ch.toUpperCase();
  }, [userName]);

  // 账户相关统计
  const [summaryCash, setSummaryCash] = useState<number>(0);
  const [todayCny, setTodayCny] = useState<number>(0);

  // CPU mining state
  const [isCpuMining, setIsCpuMining] = useState<boolean>(
    () => (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('isCpuMining') === '1') || false
  );
  const [cpuHashrate, setCpuHashrate] = useState<number>(0);
  const [cpuAlgo, setCpuAlgo] = useState<string>('rx');
  const [cpuStarting, setCpuStarting] = useState<boolean>(false);

  // GPU mining state (no backend yet)
  const [isGpuMining, setIsGpuMining] = useState<boolean>(false);
  const [gpuHashrate, setGpuHashrate] = useState<number>(0);
  const [gpuAlgo] = useState<string>('rx');
  const [gpuStarting, setGpuStarting] = useState<boolean>(false);

  // 拉取初始数据：用户信息、余额和收益等
  useEffect(() => {
    // 从 sessionStorage 获取用户名称（在登录或注册时存入）
    const storedName = sessionStorage.getItem('userName');
    if (storedName) setUserName(storedName);

    /*
     * 调用后端接口获取账户信息、余额与今日收益。
     * 新后端接口文档提供了 `GET /api/v1/user/profile` 用于一次性返回
     * 用户的基础信息、计算余额(calBalance) 和 现金余额(cashBalance)。
     * 这里尝试调用 tauri 的 `get_profile` 命令来兼容新的后端实现，
     * 如果该命令不存在则回退到旧的 `get_balance`/`get_daily_stats` 调用。
     */
    invoke<{ uid?: number; userName?: string; calBalance?: number; cashBalance?: number }>('get_profile')
      .then(profile => {
        if (profile) {
          if (typeof profile.cashBalance === 'number') {
            setSummaryCash(profile.cashBalance);
          }
          if (typeof profile.calBalance === 'number') {
            // 假设 calBalance 表示今日预估收益；若业务定义不同可调整
            setTodayCny(profile.calBalance);
          }
        }
      })
      .catch(() => {
        // 如果新接口不可用则兼容旧接口
        invoke<{ cashBalance: number }>('get_balance')
          .then(b => setSummaryCash(b?.cashBalance ?? 0))
          .catch(() => {});
        invoke<Array<{ cnyAmount?: number; calAmount?: number }>>('get_daily_stats')
          .then(list => {
            setTodayCny(list?.at(-1)?.cnyAmount ?? list?.at(-1)?.calAmount ?? 0);
          })
          .catch(() => {});
      });
  }, []);

  // 恢复 CPU 运行状态 + 订阅事件
  useEffect(() => {
    let unlistenHashrate: (() => void) | undefined;
    let unlistenAlgo: (() => void) | undefined;
    (async () => {
      try {
        const running = await invoke<boolean>('is_cpu_mining');
        setIsCpuMining(!!running);
        sessionStorage.setItem('isCpuMining', running ? '1' : '0');
      } catch {}
      try {
        const algo = await invoke<string | null>('get_cpu_algo');
        if (algo) setCpuAlgo(algo);
      } catch {}
      try {
        const h = await invoke<number | null>('get_cpu_hashrate');
        if (typeof h === 'number') setCpuHashrate(h);
      } catch {}

      // 订阅实时算力
      unlistenHashrate = await listen<number>('cpu_hashrate', e => {
        if (typeof e.payload === 'number') {
          setCpuHashrate(e.payload);
          setCpuStarting(false);
        }
      });
      // 订阅算法变化
      unlistenAlgo = await listen<string>('cpu_algo', e => {
        if (typeof e.payload === 'string') {
          setCpuAlgo(e.payload);
          setCpuStarting(false);
        }
      });
    })();
    return () => {
      unlistenHashrate && unlistenHashrate();
      unlistenAlgo && unlistenAlgo();
    };
  }, []);

  // 切换 CPU 挖矿
  const toggleCpuMining = () => {
    if (!isCpuMining) {
      // 开始挖矿并进入启动阶段
      setCpuStarting(true);
      invoke('start_cpu_mining')
        .then(() => {
          setIsCpuMining(true);
          sessionStorage.setItem('isCpuMining', '1');
        })
        .catch(() => {
          setCpuStarting(false);
        });
    } else {
      // 停止挖矿并重置显示
      invoke('stop_cpu_mining')
        .then(() => {
          setIsCpuMining(false);
          sessionStorage.setItem('isCpuMining', '0');
          setCpuStarting(false);
          setCpuHashrate(0);
          setCpuAlgo('rx');
        })
        .catch(() => {});
    }
  };

  // 切换 GPU 挖矿（目前仅修改状态，无后端实现）
  const toggleGpuMining = () => {
    if (!isGpuMining) {
      setGpuStarting(true);
      // 模拟短暂启动时间
      setTimeout(() => {
        setIsGpuMining(true);
        setGpuStarting(false);
        setGpuHashrate(0);
      }, 300);
    } else {
      setIsGpuMining(false);
      setGpuStarting(false);
      setGpuHashrate(0);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="flex flex-col w-64 p-4 bg-white border-r border-slate-200 dark:bg-[#1A1A1A]/95 dark:border-white/10">
        <div className="flex items-center mb-6">
          {/* 显示用户首字母或中文 */}
          <div className="w-10 h-10 rounded-lg bg-[#0078D4] flex items-center justify-center text-white text-lg font-bold">
            {userInitial || 'U'}
          </div>
          <h1 className="ml-3 text-xl font-bold text-slate-800 dark:text-white">客户端</h1>
          <ThemeToggle className="ml-auto" />
        </div>
        <nav className="flex-1 space-y-2">
          <a className="flex items-center px-4 py-3 text-sm font-semibold rounded-lg bg-[#0078D4] text-white shadow-lg">
            <Home size={20} /><span className="ml-3">主页</span>
          </a>
          <a className="flex items-center px-4 py-3 text-sm font-semibold rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
            <HardDrive size={20} /><span className="ml-3">设备管理</span>
          </a>
          <a className="flex items-center px-4 py-3 text-sm font-semibold rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
            <BarChart2 size={20} /><span className="ml-3">收益统计</span>
          </a>
        </nav>
        <div className="mt-auto">
          <button
            onClick={async () => {
              try {
                await invoke('logout');
                sessionStorage.removeItem('userName');
                onLogout && onLogout();
              } catch {}
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-left bg-slate-100 rounded-lg hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15"
          >
            <LogOut className="w-4 h-4 mr-3" />登出
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            {/* 欢迎语包含用户名 */}
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">欢迎回来！{userName}</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300 text-sm">这是您的主控制面板，开始今天的挖矿收益吧！</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-colors ${isCpuMining ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
              onClick={toggleCpuMining}
            >
              {isCpuMining ? '停止 CPU 挖矿' : '启动 CPU 挖矿'}
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-colors ${isGpuMining ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              onClick={toggleGpuMining}
            >
              {isGpuMining ? '停止 GPU 挖矿' : '启动 GPU 挖矿'}
            </button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-colors bg-gray-200 text-slate-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-slate-200 dark:hover:bg-gray-600"
              onClick={() => (onGoWithdraw ? onGoWithdraw() : (window.location.hash = '#/withdraw'))}
            >
              提现
            </button>
          </div>
        </header>

        {/* Statistics cards */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* 今日收益 */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">今日收益 (预估)</h3>
            <p className="mt-3 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">¥ {todayCny.toFixed(2)}</p>
            <div className="mt-4 flex items-center gap-2"><Tag variant="success">+3.2%</Tag><span className="text-xs text-slate-500 dark:text-slate-300">较昨日</span></div>
          </div>
          {/* 账户余额 */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">账户余额</h3>
            <p className="mt-3 text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">¥ {summaryCash.toFixed(2)}</p>
            <div className="mt-4">
              <button className="btn-secondary text-xs" onClick={() => (onGoWithdraw ? onGoWithdraw() : (window.location.hash = '#/withdraw'))}>可提现</button>
            </div>
          </div>
          {/* CPU 实时算力 */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">CPU 实时算力</h3>
            <p className="mt-3 text-xl font-bold text-[#0078D4] dark:text-[#00A4EF]">
              {cpuStarting ? '正在启动挖矿内核，稍晚显示算力' : `算法:${cpuAlgo}/${cpuHashrate.toFixed(1)}`} <span className="text-slate-500 dark:text-slate-300 text-xs align-middle">H/s</span>
            </p>
            <div className="mt-4"><Progress value={Math.max(0, Math.min(100, (cpuHashrate / 1000) * 100))} /></div>
          </div>
          {/* GPU 实时算力 */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">GPU 实时算力</h3>
            <p className="mt-3 text-xl font-bold text-[#0078D4] dark:text-[#00A4EF]">
              {gpuStarting ? '正在启动挖矿内核，稍晚显示算力' : `算法:${gpuAlgo}/${gpuHashrate.toFixed(1)}`} <span className="text-slate-500 dark:text-slate-300 text-xs align-middle">H/s</span>
            </p>
            <div className="mt-4"><Progress value={Math.max(0, Math.min(100, (gpuHashrate / 1000) * 100))} /></div>
          </div>
        </section>
        {/* 其他内容（趋势图和设备表）已根据需求删除 */}
      </main>
    </div>
  );
};

export default Dashboard;