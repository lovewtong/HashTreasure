import React, { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Home, BarChart2, HardDrive, LogOut } from 'lucide-react';

import ThemeToggle from './ThemeToggle';
import Tag from './ui/Tag';
import Switch from './ui/Switch';
import Progress from './ui/Progress';
import Table from './ui/Table';

type DeviceStatus = 'online' | 'offline' | 'maintain';
type DeviceView = { name: string; status: DeviceStatus; power: number; enabled: boolean; };

function toDeviceStatus(code: unknown): DeviceStatus {
  if (code === 1 || code === 'online') return 'online';
  if (code === 2 || code === 'maintain') return 'maintain';
  return 'offline';
}

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
          <stop offset="0%" stopOpacity="0.35" stopColor={stroke} />
          <stop offset="100%" stopOpacity="0" stopColor={stroke} />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.5" />
      <path d={`${path} L 312 90 L 8 90 Z`} fill="url(#g)" />
      <text x="8" y="16" fontSize="10" className="fill-slate-500 dark:fill-slate-300">min {min}</text>
      <text x="268" y="16" fontSize="10" className="fill-slate-500 dark:fill-slate-300">max {max}</text>
    </svg>
  );
};

const Dashboard: React.FC<{ onLogout?: () => void; onGoWithdraw?: () => void; }> = ({ onLogout, onGoWithdraw }) => {
  const [summaryCash, setSummaryCash] = useState<number>(0);
  const [todayCny, setTodayCny] = useState<number>(0);
  const [trend, setTrend] = useState<number[]>([]);
  const [devices, setDevices] = useState<DeviceView[]>([]);

  // —— CPU 状态 ——
  const [isCpuMining, setIsCpuMining] = useState<boolean>(
    () => (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('isCpuMining') === '1') || false
  );
  const [cpuHashrate, setCpuHashrate] = useState<number>(0); // 10s
  const [cpuAlgo, setCpuAlgo] = useState<string>('');

  // 拉取余额/收益/设备（根据你的后端 API 名称调整；没有也不会报错）
  useEffect(() => {
    invoke<{ cashBalance: number }>('get_balance').then(b => setSummaryCash(b?.cashBalance ?? 0)).catch(() => { });
    invoke<Array<{ cnyAmount?: number; calAmount?: number }>>('get_daily_stats')
      .then((list) => {
        const last = (list || []).slice(-12);
        setTrend(last.map((i) => i.cnyAmount ?? i.calAmount ?? 0));
        setTodayCny(list?.at(-1)?.cnyAmount ?? 0);
      }).catch(() => { });
    invoke<{ list: Array<{ deviceId: string; deviceName?: string; status: number | string; cpuHashrate?: number; gpuHashrate?: number }> }>('get_devices', { page: 1, size: 10 })
      .then((res) => {
        const rows: DeviceView[] = (res?.list || []).map((d) => {
          const status = toDeviceStatus(d.status);
          return { name: d.deviceName || d.deviceId, status, power: Math.round(((d.cpuHashrate || 0) + (d.gpuHashrate || 0)) % 100), enabled: status === 'online' };
        });
        setDevices(rows);
      }).catch(() => { });
  }, []);

  // 恢复 CPU 运行状态 + 初始算力/算法；并订阅实时事件
  useEffect(() => {
    let unlisten1: (() => void) | undefined;
    let unlisten2: (() => void) | undefined;
    (async () => {
      try {
        const running = await invoke<boolean>('is_cpu_mining');
        setIsCpuMining(!!running);
        sessionStorage.setItem('isCpuMining', running ? '1' : '0');
      } catch { }
      try {
        const algo = await invoke<string | null>('get_cpu_algo');
        if (algo) setCpuAlgo(algo);
      } catch { }
      try {
        const v = await invoke<number | null>('get_cpu_hashrate');
        if (typeof v === 'number') setCpuHashrate(v);
      } catch { }

      unlisten1 = await listen<number>('cpu_hashrate', (e) => {
        if (typeof e.payload === 'number') setCpuHashrate(e.payload);
      });
      unlisten2 = await listen<string>('cpu_algo', (e) => {
        if (typeof e.payload === 'string') setCpuAlgo(e.payload);
      });
    })();
    return () => { unlisten1 && unlisten1(); unlisten2 && unlisten2(); };
  }, []);

  const toggleMining = () => {
    if (!isCpuMining) {
      invoke('start_cpu_mining')
        .then(() => { setIsCpuMining(true); sessionStorage.setItem('isCpuMining', '1'); })
        .catch(() => { });
    } else {
      invoke('stop_cpu_mining')
        .then(() => { setIsCpuMining(false); sessionStorage.setItem('isCpuMining', '0'); })
        .catch(() => { });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="flex flex-col w-64 p-4 bg-white border-r border-slate-200 dark:bg-[#1A1A1A]/95 dark:border-white/10">
        <div className="flex items-center mb-6">
          <img src="https://placehold.co/40x40/0078D4/FFFFFF?text=C" alt="Logo" className="w-10 h-10 rounded-lg" />
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
            onClick={async () => { try { await invoke('logout'); onLogout && onLogout(); } catch { } }}
            className="flex items-center w-full px-4 py-2 text-sm text-left bg-slate-100 rounded-lg hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15"
          >
            <LogOut className="w-4 h-4 mr-3" />登出
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">欢迎回来！</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300 text-sm">这是您的主控制面板。</p>
          </div>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-colors ${isCpuMining ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            onClick={toggleMining}
          >
            {isCpuMining ? '停止 CPU 挖矿' : '启动 CPU 挖矿'}
          </button>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">总算力</h3>
            <p className="mt-3 text-3xl font-extrabold text-[#0078D4] dark:text-[#00A4EF]">142.6 <span className="text-slate-500 dark:text-slate-300 text-xs align-middle">TH/s</span></p>
            <div className="mt-4"><Progress value={72} /></div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">今日收益 (预估)</h3>
            <p className="mt-3 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">¥ {todayCny.toFixed(2)}</p>
            <div className="mt-4 flex items-center gap-2"><Tag variant="success">+3.2%</Tag><span className="text-xs text-slate-500 dark:text-slate-300">较昨日</span></div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">账户余额</h3>
            <p className="mt-3 text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">¥ {summaryCash.toFixed(2)}</p>
            <div className="mt-4">
              <button className="btn-secondary text-xs" onClick={() => (onGoWithdraw ? onGoWithdraw() : (window.location.hash = '#/withdraw'))}>可提现</button>
            </div>
          </div>

          {/* CPU 实时算力（10s） */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">CPU 实时算力</h3>
            <p className="mt-3 text-3xl font-extrabold text-[#0078D4] dark:text-[#00A4EF]">
              {cpuAlgo ? `${cpuAlgo} · ` : ''}{cpuHashrate.toFixed(1)} <span className="text-slate-500 dark:text-slate-300 text-xs align-middle">H/s</span>
            </p>
            <div className="mt-4"><Progress value={Math.max(0, Math.min(100, (cpuHashrate / 1000) * 100))} /></div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="glass-card p-6 xl:col-span-1">
            <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-800 dark:text-slate-100">最近收益趋势</h3><Tag variant="primary">实时</Tag></div>
            <MiniLineChart data={trend.length ? trend : [32, 38, 35, 48, 52, 47, 61, 66, 63, 72, 68, 76]} className="w-full h-[90px] mt-4" />
          </div>

          <div className="xl:col-span-2">
            <Table headers={['设备', '状态', '算力', '开关']} rows={
              devices.map((d, i): React.ReactNode[] => ([
                d.name,
                d.status === 'online' ? <Tag key={`s-${i}`} variant="success">在线</Tag> : d.status === 'maintain' ? <Tag key={`s-${i}`} variant="warning">保养</Tag> : <Tag key={`s-${i}`} variant="danger">离线</Tag>,
                <div key={`p-${i}`} className="w-40"><Progress value={d.power} showLabel={false} /></div>,
                <Switch key={`sw-${i}`} checked={d.enabled} onChange={(v) => {
                  setDevices(prev => { const next = [...prev]; next[i] = { ...next[i], enabled: v }; return next; });
                }} />
              ]))
            } striped hoverable />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
