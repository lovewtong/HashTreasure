// src/components/Dashboard.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Home, BarChart2, HardDrive, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Tag from './ui/Tag';
import Switch from './ui/Switch';
import Progress from './ui/Progress';
import Table from './ui/Table';

type DeviceStatus = 'online' | 'offline' | 'maintain';
type DeviceView = {
  name: string;
  status: DeviceStatus;
  power: number;
  enabled: boolean;
};

function toDeviceStatus(code: unknown): DeviceStatus {
  if (code === 1 || code === 'online') return 'online';
  if (code === 2 || code === 'maintain') return 'maintain';
  return 'offline';
}

interface DashboardProps {
  onLogout: () => void;
  /** 可选：父层传入跳转到提现页的方法。不传则默认改 hash 跳转到 #/withdraw */
  onGoWithdraw?: () => void;
}

/** 观察 <html> 的 .dark，用于图表换主题色 */
const useIsDark = () => {
  const [isDark, setIsDark] = useState(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains('dark'));
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    update();
    return () => obs.disconnect();
  }, []);
  return isDark;
};

/** 零依赖迷你折线图（SVG），颜色跟随主题蓝：浅色 #0078D4 / 深色 #00A4EF */
const MiniLineChart: React.FC<{ data: number[]; className?: string }> = ({ data, className }) => {
  const isDark = useIsDark();
  const stroke = isDark ? '#00A4EF' : '#0078D4';

  const { path, min, max } = useMemo(() => {
    const w = 320, h = 90, pad = 8;
    const min = Math.min(...data), max = Math.max(...data);
    const r = max - min || 1;
    const norm = (v: number) => (h - pad) - ((v - min) / r) * (h - pad * 2);
    const step = (w - pad * 2) / Math.max(1, data.length - 1);
    const d = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${pad + i * step} ${norm(v)}`).join(' ');
    return { path: d, min, max };
  }, [data]);

  return (
    <svg viewBox="0 0 320 90" className={className}>
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopOpacity="0.35" stopColor={stroke}/>
          <stop offset="100%" stopOpacity="0" stopColor={stroke}/>
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.5" />
      <path d={`${path} L 312 90 L 8 90 Z`} fill="url(#g)" />
      <text x="8" y="16" fontSize="10" className="fill-slate-500 dark:fill-slate-300">min {min}</text>
      <text x="268" y="16" fontSize="10" className="fill-slate-500 dark:fill-slate-300">max {max}</text>
    </svg>
  );
};

const NavItem = ({ icon, text, active = false }:{
  icon: React.ReactNode; text: string; active?: boolean;
}) => (
  <a
    href="#"
    className={`flex items-center px-4 py-3 text-sm font-semibold rounded-lg transition-colors
      ${active
        ? 'bg-[#0078D4] text-white shadow-lg dark:bg-white/10 dark:text-white'
        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white'
      }`}
  >
    {icon}<span className="ml-3">{text}</span>
  </a>
);

const UserProfile = ({ onLogout }: { onLogout: () => Promise<void> }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full p-2 space-x-3 text-left transition-colors
                   bg-slate-100 rounded-lg hover:bg-slate-200
                   dark:bg-white/10 dark:hover:bg-white/15"
      >
        <img className="flex-shrink-0 object-cover w-10 h-10 rounded-full" src="https://placehold.co/100x100/E2E8F0/4A5568?text=U" alt="User" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">用户名</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">在线</p>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-10 w-full mt-2 origin-top-right
                        bg-white rounded-md shadow-lg bottom-full border border-slate-200
                        dark:bg-[#1E1E1E] dark:border-white/10">
          <div className="py-1">
            <button
              onClick={onLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-left text-slate-700 hover:bg-slate-100
                         dark:text-slate-200 dark:hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-3" />登出
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ onLogout, onGoWithdraw }) => {
  const [summaryCash, setSummaryCash] = useState<number>(0);
  const [todayCny, setTodayCny] = useState<number>(0);
  const [trend, setTrend] = useState<number[]>([]);
  const [devices, setDevices] = useState<DeviceView[]>([]);

  // CPU 挖矿状态：用于控制顶部按钮文本和颜色
  const [isCpuMining, setIsCpuMining] = useState<boolean>(false);

  // 加载数据（全部走 Tauri 命令）
  useEffect(() => {
    // 余额
    invoke<{ cashBalance: number }>('get_balance')
      .then((b) => setSummaryCash(b?.cashBalance ?? 0))
      .catch(() => {});

    // 每日收益
    invoke<Array<{ cnyAmount?: number; calAmount?: number }>>('get_daily_stats')
      .then((list) => {
        const last = (list || []).slice(-12);
        setTrend(last.map((i) => i.cnyAmount ?? i.calAmount ?? 0));
        setTodayCny(list?.at(-1)?.cnyAmount ?? 0);
      })
      .catch(() => {});

    // 设备列表
    invoke<{ list: Array<{ deviceId: string; deviceName?: string; status: number | string; cpuHashrate?: number; gpuHashrate?: number }> }>(
      'get_devices',
      { page: 1, size: 10 }
    )
      .then((res) => {
        const rows: DeviceView[] = (res?.list || []).map((d) => {
          const status = toDeviceStatus(d.status);
          return {
            name: d.deviceName || d.deviceId,
            status,
            power: Math.round(((d.cpuHashrate || 0) + (d.gpuHashrate || 0)) % 100),
            enabled: status === 'online',
          };
        });
        setDevices(rows);
      })
      .catch(() => {});
  }, []);

  // 切换 CPU 挖矿的回调。当未挖矿时调用 start_cpu_mining；正在挖矿时调用 stop_cpu_mining
  const handleToggleMining = () => {
    if (!isCpuMining) {
      invoke('start_cpu_mining')
        .then(() => {
          setIsCpuMining(true);
        })
        .catch((err) => {
          console.error('Failed to start CPU mining:', err);
        });
    } else {
      invoke('stop_cpu_mining')
        .then(() => {
          setIsCpuMining(false);
        })
        .catch((err) => {
          console.error('Failed to stop CPU mining:', err);
        });
    }
  };

  const handleLogout = async () => {
    try { await invoke('logout'); onLogout(); } catch (_) {}
  };

  const rows = devices.map((d, i): React.ReactNode[] => ([
    d.name,
    d.status === 'online' ? <Tag key={`s-${i}`} variant="success">在线</Tag> :
      d.status === 'maintain' ? <Tag key={`s-${i}`} variant="warning">保养</Tag> :
      <Tag key={`s-${i}`} variant="danger">离线</Tag>,
    <div key={`p-${i}`} className="w-40"><Progress value={d.power} showLabel={false} /></div>,
    <Switch
      key={`sw-${i}`}
      checked={d.enabled}
      onChange={(v) => {
        setDevices((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], enabled: v };
          return next;
        });
      }}
    />
  ]));

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="flex flex-col w-64 p-4 bg-white border-r border-slate-200 dark:bg-[#1A1A1A]/95 dark:border-white/10">
        <div className="flex items-center mb-6">
          <img src="https://placehold.co/40x40/0078D4/FFFFFF?text=C" alt="Logo" className="w-10 h-10 rounded-lg"/>
          <h1 className="ml-3 text-xl font-bold text-slate-800 dark:text-white">客户端</h1>
          <ThemeToggle className="ml-auto" />
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem icon={<Home size={20} />} text="主页" active />
          <NavItem icon={<HardDrive size={20} />} text="设备管理" />
          <NavItem icon={<BarChart2 size={20} />} text="收益统计" />
        </nav>

        <div className="mt-auto">
          <UserProfile onLogout={handleLogout} />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* 顶部欢迎标题和 CPU 挖矿按钮 */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="h-fluid-1 font-bold text-slate-900 dark:text-white">欢迎回来！</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300 text-fluid-sm">这是您的主控制面板。</p>
          </div>
          {/* CPU 挖矿开关按钮，根据状态改变颜色和文案 */}
          <button
            className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-colors
              ${isCpuMining
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            onClick={handleToggleMining}
          >
            {isCpuMining ? '停止 CPU 挖矿' : '启动 CPU 挖矿'}
          </button>
        </header>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">总算力</h3>
            <p className="mt-3 stat-value font-extrabold text-[#0078D4] dark:text-[#00A4EF]">
              142.6 <span className="text-slate-500 dark:text-slate-300 text-fluid-sm align-middle">TH/s</span>
            </p>
            <div className="mt-4"><Progress value={72} /></div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">今日收益 (预估)</h3>
            <p className="mt-3 stat-value font-extrabold text-emerald-600 dark:text-emerald-400">
              ¥ {todayCny.toFixed(2)}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Tag variant="success">+3.2%</Tag>
              <span className="text-fluid-sm text-slate-500 dark:text-slate-300">较昨日</span>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">账户余额</h3>
            <p className="mt-3 stat-value font-extrabold text-indigo-600 dark:text-indigo-400">
              ¥ {summaryCash.toFixed(2)}
            </p>

            {/* ✅ 可提现按钮 */}
            <div className="mt-4">
              <button
                className="btn-secondary text-fluid-sm"
                onClick={() => (onGoWithdraw ? onGoWithdraw() : (window.location.hash = '#/withdraw'))}
              >
                可提现
              </button>
            </div>
          </div>
        </section>

        {/* Chart + Table */}
        <section className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="glass-card p-6 xl:col-span-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">最近收益趋势</h3>
              <Tag variant="primary">实时</Tag>
            </div>
            <MiniLineChart
              data={trend.length ? trend : [32, 38, 35, 48, 52, 47, 61, 66, 63, 72, 68, 76]}
              className="w-full h-[90px] mt-4"
            />
          </div>

          <div className="xl:col-span-2">
            <Table headers={['设备', '状态', '算力', '开关']} rows={rows} striped hoverable />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
