import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { User, KeyRound, Mail, AtSign, Eye, EyeOff } from 'lucide-react';
import HashPowerBackground from './HashPowerBackground';
import '../i18n'; // 修正了导入路径

interface LoginProps {
  onLoginSuccess: () => void;
}

type AuthMode = 'password' | 'code';
type ViewMode = 'login' | 'register';

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { t, i18n } = useTranslation();

  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (sendingCode) {
      setSendingCode(false);
    }
    return () => clearTimeout(timer);
  }, [countdown, sendingCode]);

  const isValidEmail = (v: string) => /\S+@\S+\.\S+/.test(v);

  const handleSendCode = async () => {
    setError(null);
    const targetEmail = viewMode === 'login' ? email : (viewMode === 'register' ? email : '');
    if (!isValidEmail(targetEmail)) {
      setError(t('errorInvalidEmail'));
      return;
    }
    setSendingCode(true);
    try {
      await invoke('send_code', { email: targetEmail, type: 'login_or_register' });
      setCountdown(60);
    } catch (e: any) {
      setError(t(e?.message ?? 'errorSendFailed'));
      setSendingCode(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError(t('errorInvalidEmail'));
      return;
    }
    if (authMode === 'password' && !password) {
      setError(t('errorEnterPassword'));
      return;
    }
    if (authMode === 'code' && !code) {
      setError(t('errorEnterCode'));
      return;
    }
    setBusy(true);
    try {
      if (authMode === 'password') {
        await invoke('login', { username: email, password });
      } else {
        await invoke('login_by_code', { email, code });
      }
      onLoginSuccess();
    } catch (e: any) {
      setError(t(e?.message ?? 'errorLoginFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!username) { setError(t('errorEnterUsername')); return; }
    if (!isValidEmail(email)) { setError(t('errorInvalidEmail')); return; }
    if (!password) { setError(t('errorEnterPassword')); return; }
    if (!code) { setError(t('errorEnterEmailCode')); return; }
    
    setBusy(true);
    try {
      await invoke('register', { username, password, email, code });
      onLoginSuccess();
    } catch (e: any) {
      setError(t(e?.message ?? 'errorRegisterFailed'));
    } finally {
      setBusy(false);
    }
  };

  const toggleLang = () => {
    const newLng = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLng);
  };

  return (
    // 【关键修正】: 恢复 bg-black，确保有一个坚实的底色，并添加 overflow-hidden
    <div className="relative min-h-screen w-full bg-black text-gray-100 font-sans overflow-hidden">
      {/* HashPowerBackground 现在是页面的底层背景。它自身的样式应包含 z-index: -10 */}
      <HashPowerBackground />

      {/* 【关键修正】: 所有UI内容都放在一个 z-10 的容器里，确保它们在背景之上 */}
      <div className="relative z-10">
        <header className="w-full max-w-6xl mx-auto px-4 pt-6 flex items-center justify-between">
          <div className="text-lg font-bold tracking-wide select-none">{t('appName')}</div>
          <div className="flex items-center gap-3">
            <button
              aria-label={t('switchLanguage')}
              onClick={toggleLang}
              className="text-sm rounded-md px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {i18n.language === 'zh' ? '中 / EN' : 'EN / 中'}
            </button>
          </div>
        </header>

        <main className="flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <section className="order-2 md:order-1 px-4 md:px-8">
              <h2 className="text-2xl md:text-3xl font-extrabold leading-tight mb-4">{t('tagline')}</h2>
              <p className="text-sm md:text-base text-gray-300 mb-6">{t('description')}</p>
              <div className="mt-4 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-300">{t('currentNetworkPower')}</div>
                    <div className="text-xl font-semibold mt-1">1.24 PH/s</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-300 text-right">{t('hourlyEarnings')}</div>
                    <div className="text-lg font-semibold mt-1">0.0024 CAL</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="order-1 md:order-2 px-4 md:px-8">
              <div className="mx-auto max-w-md">
                <div className="p-6 rounded-2xl bg-black/30 backdrop-blur-lg border border-white/10 shadow-2xl">
                  <h3 className="text-xl font-semibold mb-4">{viewMode === 'login' ? t('loginTitle') : t('registerTitle')}</h3>

                  {viewMode === 'login' && (
                    <div className="mb-4 flex gap-2" role="tablist" aria-label={t('authMethodSwitch')}>
                      <button role="tab" aria-selected={authMode === 'password'} onClick={() => setAuthMode('password')} className={`flex-1 py-2 rounded-md text-sm font-medium focus:outline-none focus-visible:ring-2 ${authMode === 'password' ? 'bg-cyan-600/70 text-white' : 'bg-white/10 text-gray-200'}`}>
                        {t('passwordLogin')}
                      </button>
                      <button role="tab" aria-selected={authMode === 'code'} onClick={() => setAuthMode('code')} className={`flex-1 py-2 rounded-md text-sm font-medium focus:outline-none focus-visible:ring-2 ${authMode === 'code' ? 'bg-cyan-600/70 text-white' : 'bg-white/10 text-gray-200'}`}>
                        {t('codeLogin')}
                      </button>
                    </div>
                  )}

                  <form onSubmit={viewMode === 'login' ? handleLogin : handleRegister} className="space-y-4" aria-live="polite">
                    {viewMode === 'register' && (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400"><User size={18} /></div>
                        <input aria-label={t('usernamePlaceholder')} value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('usernamePlaceholder')} className="w-full pl-12 pr-3 py-2 rounded-lg bg-transparent border border-white/20 placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400" minLength={3} />
                      </div>
                    )}

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400"><Mail size={18} /></div>
                      <input aria-label={t('emailPlaceholder')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('emailPlaceholder')} className="w-full pl-12 pr-3 py-2 rounded-lg bg-transparent border border-white/20 placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400" required />
                    </div>

                    {(authMode === 'password' || viewMode === 'register') && (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400"><KeyRound size={18} /></div>
                        <input aria-label={t('passwordPlaceholder')} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('passwordPlaceholder')} className="w-full pl-12 pr-10 py-2 rounded-lg bg-transparent border border-white/20 placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400" required minLength={6} />
                        <button type="button" aria-label={showPassword ? t('togglePasswordHide') : t('togglePasswordShow')} onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded focus:outline-none focus-visible:ring-2">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    )}

                    {(authMode === 'code' || viewMode === 'register') && (
                      <div className="flex gap-3 items-center">
                        <div className="relative flex-grow">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400"><AtSign size={18} /></div>
                          <input aria-label={t('codePlaceholder')} value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('codePlaceholder')} className="w-full pl-12 pr-3 py-2 rounded-lg bg-transparent border border-white/20 placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400" required />
                        </div>
                        <button type="button" onClick={handleSendCode} disabled={sendingCode || countdown > 0} className="px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus-visible:ring-2 bg-white/10 hover:bg-white/20 disabled:opacity-60">
                          {countdown > 0 ? t('resendIn', { count: countdown }) : (sendingCode ? t('sending') : t('sendCode'))}
                        </button>
                      </div>
                    )}

                    <div aria-live="assertive" className="min-h-[1.25rem]">
                      {error && <div role="alert" className="text-sm text-red-400">{error}</div>}
                    </div>

                    <div className="space-y-2">
                      <button type="submit" disabled={busy} className="w-full py-2 rounded-lg font-semibold text-white bg-cyan-600/90 hover:bg-cyan-600 hover:shadow-lg disabled:opacity-60 focus:outline-none focus-visible:ring-2">
                        {busy ? t(viewMode === 'login' ? 'loggingIn' : 'registering') : t(viewMode === 'login' ? 'signIn' : 'register')}
                      </button>

                      <div className="flex items-center justify-between text-sm text-gray-300">
                        <button type="button" onClick={() => setViewMode(viewMode === 'login' ? 'register' : 'login')} className="hover:underline">
                          {viewMode === 'login' ? t('noAccountRegister') : t('hasAccountLogin')}
                        </button>

                        {viewMode === 'login' && (
                          <a href="#" className="text-sm hover:underline">{t('forgotPassword')}</a>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;
