import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { User, KeyRound, ShieldCheck, Mail, AtSign } from 'lucide-react';

// Props an interface for the component
interface LoginProps {
  onLoginSuccess: () => void;
}

// Defines the current view mode
type ViewMode = 'login' | 'register';

/**
 * A commercial-grade, enterprise-ready authentication component.
 * Built upon the "Carbon & Amber" design system for clarity, professionalism, and user trust.
 * Implements all 12 specified UI/UX principles.
 *
 * @param {LoginProps} props - The component props.
 * @returns {React.ReactElement} The rendered authentication component.
 */
const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { t } = useTranslation();

  // --- STATE MANAGEMENT ---
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  
  // State for Login form - Principle: Control & Forgiveness (Separated state prevents data collision)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // State for Register form
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCode, setRegCode] = useState('');

  // Common UI State for feedback
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // --- EFFECTS ---
  // Manages the countdown timer for the "send code" button
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isSendingCode) {
      setIsSendingCode(false);
    }
    return () => clearTimeout(timer);
  }, [countdown, isSendingCode]);

  // --- HANDLERS ---
  const handleViewChange = (mode: ViewMode) => {
    setError(null); // Clear errors on view change
    setIsLoading(false);
    setViewMode(mode);
  };

  const handleSendCode = async () => {
    if (!regEmail || !regEmail.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }
    setError(null);
    setIsSendingCode(true);
    try {
      await invoke('send_code', { email: regEmail, type: 'register' });
      setCountdown(60);
    } catch (err) {
      setError(err as string);
      setIsSendingCode(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await invoke('login', { username: loginUsername, password: loginPassword });
      onLoginSuccess();
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await invoke('register', { username: regUsername, password: regPassword, email: regEmail, code: regCode });
      onLoginSuccess();
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER LOGIC: Componentization Principle ---
  const InputField = ({ id, type, placeholder, value, onChange, icon, children }: { id: string, type: string, placeholder: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, icon: React.ReactNode, children?: React.ReactNode }) => (
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-500 transition-colors duration-300 group-focus-within:text-amber-400">
        {icon}
      </div>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full py-3 pl-12 pr-4 text-gray-200 bg-gray-900/50 border border-gray-700 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent transition-all duration-300"
        required
      />
      {children}
    </div>
  );

  const LoginForm = () => (
    <form className="space-y-6" onSubmit={handleLoginSubmit}>
      <InputField id="login-username" type="text" placeholder={t('usernameOrEmail')} value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} icon={<User size={18} />} />
      <InputField id="login-password" type="password" placeholder={t('password')} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} icon={<KeyRound size={18} />} />
      <div className="text-right">
        <a href="#" className="text-sm font-medium text-gray-400 hover:text-amber-400 hover:underline transition-colors">{t('forgotPassword')}</a>
      </div>
      <AuthButton isLoading={isLoading} text={t('signIn')} loadingText={t('loggingIn')} />
    </form>
  );

  const RegisterForm = () => (
    <form className="space-y-6" onSubmit={handleRegisterSubmit}>
      <InputField id="reg-username" type="text" placeholder={t('username')} value={regUsername} onChange={(e) => setRegUsername(e.target.value)} icon={<AtSign size={18} />} />
      <InputField id="reg-email" type="email" placeholder={t('email')} value={regEmail} onChange={(e) => setRegEmail(e.target.value)} icon={<Mail size={18} />} />
      <InputField id="reg-password" type="password" placeholder={t('password')} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} icon={<KeyRound size={18} />} />
      <InputField id="reg-code" type="text" placeholder={t('enterCode')} value={regCode} onChange={(e) => setRegCode(e.target.value)} icon={<ShieldCheck size={18} />}>
        <button type="button" onClick={handleSendCode} disabled={isSendingCode || countdown > 0} className="absolute text-sm font-semibold text-amber-400 hover:text-amber-300 right-4 top-1/2 -translate-y-1/2 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors">
          {countdown > 0 ? t('resendIn', { count: countdown }) : t('sendCode')}
        </button>
      </InputField>
      <AuthButton isLoading={isLoading} text={t('register')} loadingText={t('registering')} />
    </form>
  );

  const AuthButton = ({ isLoading, text, loadingText }: { isLoading: boolean, text: string, loadingText: string }) => (
    <button type="submit" disabled={isLoading} className="group relative flex items-center justify-center w-full px-4 py-3 font-semibold text-gray-900 bg-amber-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden">
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all duration-300 ease-in-out opacity-100 group-hover:opacity-0"></span>
      <span className="relative flex items-center">
        {isLoading && <div className="w-5 h-5 mr-3 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>}
        {isLoading ? loadingText : text}
      </span>
    </button>
  );

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-[#121212] font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,193,7,0.15),rgba(255,255,255,0))]"></div>
      <div className="relative z-10 w-full max-w-md">
        {/* Principle: Hierarchy - The card is the central focus. */}
        <div className="p-8 bg-gray-900/70 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl shadow-black/50">
          <h1 className="text-3xl font-bold text-center text-gray-100">
            {viewMode === 'login' ? t('userLogin') : t('signUp')}
          </h1>
          
          {viewMode === 'login' ? <LoginForm /> : <RegisterForm />}
        </div>
        
        {/* Principle: Predictability - The toggle between login/register is in a common location. */}
        <div className="mt-6 text-sm text-center">
          <span className="text-gray-500">
            {viewMode === 'login' ? t('noAccount') : t('backToLogin')}
          </span>
          <button onClick={() => handleViewChange(viewMode === 'login' ? 'register' : 'login')} className="ml-2 font-semibold text-amber-400 hover:underline">
            {viewMode === 'login' ? t('signUp') : t('userLogin')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
