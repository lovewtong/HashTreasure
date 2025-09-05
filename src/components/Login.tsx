// src/components/Login.tsx
//
// This component handles user authentication (login and registration).  It
// persists the username into sessionStorage upon successful login or
// registration so that other parts of the UI (e.g. Dashboard) can greet the
// user and display their initial.  The rest of the file follows the original
// implementation with only minimal changes around storing the username.

import React, { useEffect, useState, forwardRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import {
  User, KeyRound, Mail, AtSign, Eye, EyeOff,
  LoaderCircle, Gift, Phone, CreditCard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, SubmitHandler, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast, { Toaster } from 'react-hot-toast';

import HashPowerBackground from './HashPowerBackground';
import ThemeToggle from './ThemeToggle';
import '../i18n';

// ---------- Schemas ----------
const loginPasswordSchema = z.object({
  email: z.string().email({ message: 'errorInvalidEmail' }),
  password: z.string().min(6, { message: 'errorPasswordMinLength' }),
});

const loginCodeSchema = z.object({
  email: z.string().email({ message: 'errorInvalidEmail' }),
  code: z.string().min(4, { message: 'errorEnterCode' }),
});

const registerSchema = z.object({
  username: z.string().min(3, { message: 'errorUsernameMinLength' }),
  email: z.string().email({ message: 'errorInvalidEmail' }),
  password: z.string().min(6, { message: 'errorPasswordMinLength' }),
  code: z.string().min(4, { message: 'errorEnterEmailCode' }),
  alipayPhone: z.string().optional(),
  alipayName: z.string().optional(),
  inviteCode: z.string().optional(),
  phone: z.string().optional(),
});

type LoginPasswordForm = z.infer<typeof loginPasswordSchema>;
type LoginCodeForm = z.infer<typeof loginCodeSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

interface LoginProps { onLoginSuccess: () => void }
type AuthMode = 'password' | 'code';
type ViewMode = 'login' | 'register';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
  error?: boolean;
}

// ---------- Input ----------
const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ icon, error, ...props }, ref) => (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 dark:text-slate-400/80">
        {icon}
      </div>
      <input
        ref={ref}
        {...props}
        className={`w-full pl-10 pr-3 py-2.5 rounded-lg
            bg-white text-slate-900 placeholder-slate-400
            border ${error ? 'border-rose-300' : 'border-slate-200'} shadow-sm
            focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400
            transition-colors
            dark:bg-[#262626]/80 dark:text-slate-100 dark:placeholder-slate-400
            dark:border-white/10 dark:focus:ring-[#00A4EF] dark:focus:border-[#00A4EF]`}
      />
    </div>
  ),
);
FormInput.displayName = 'FormInput';

// ---------- Component ----------
const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { t, i18n } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const loginPasswordForm = useForm<LoginPasswordForm>({
    resolver: zodResolver(loginPasswordSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const loginCodeForm = useForm<LoginCodeForm>({
    resolver: zodResolver(loginCodeSchema),
    mode: 'onChange',
    defaultValues: { email: '', code: '' },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      username: '', email: '', password: '', code: '',
      alipayPhone: '', alipayName: '', inviteCode: '', phone: '',
    },
  });

  const isLogin = viewMode === 'login';

  useEffect(() => {
    let timer: number;
    if (countdown > 0) timer = window.setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    const form = isLogin ? loginCodeForm : registerForm;
    const ok = await form.trigger('email');
    if (!ok) return;
    const email = form.getValues().email;
    setSendingCode(true);
    toast.loading(t('sending'), { id: 'code-toast' });
    try {
      await invoke('send_code', { email, type: isLogin ? 'LOGIN' : 'REGISTER' });
      toast.success(t('sendCodeSuccess'), { id: 'code-toast' });
      setCountdown(60);
    } catch (e: any) {
      const msg = typeof e === 'string' ? e : (e as Error).message;
      toast.error(t(msg ?? 'errorSendFailed'), { id: 'code-toast' });
    } finally {
      setSendingCode(false);
    }
  };

  // 登录提交：如果成功则将 userName 写入 sessionStorage
  const onLoginSubmit: SubmitHandler<LoginPasswordForm | LoginCodeForm> = async (data) => {
    const toastId = toast.loading(t('loggingIn'));
    try {
      let result: any;
      if (authMode === 'password') {
        const { email, password } = data as LoginPasswordForm;
        result = await invoke('login', { email, password });
      } else {
        const { email, code } = data as LoginCodeForm;
        result = await invoke('login_by_code', { email, code });
      }
      // 如果接口返回用户名则存储；否则尝试从用户档案接口获取
      if (result && typeof result.userName === 'string') {
        sessionStorage.setItem('userName', result.userName);
      } else {
        // 调用 get_profile 获取 userName
        try {
          const profile: any = await invoke('get_profile');
          if (profile && typeof profile.userName === 'string') {
            sessionStorage.setItem('userName', profile.userName);
          }
        } catch {}
      }
      toast.success(t('loginSuccess'), { id: toastId });
      onLoginSuccess();
    } catch (e: any) {
      const msg = typeof e === 'string' ? e : (e as Error).message;
      toast.error(t(msg ?? 'errorLoginFailed'), { id: toastId });
    }
  };

  // 注册提交：如果成功，则把输入的用户名保存到 sessionStorage 方便跳转后显示
  const onRegisterSubmit: SubmitHandler<RegisterForm> = async (data) => {
    const toastId = toast.loading(t('registering'));
    try {
      await invoke('register', {
        username: data.username, password: data.password, email: data.email, code: data.code,
        alipayPhone: data.alipayPhone || null, alipayName: data.alipayName || null,
        inviteCode: data.inviteCode || null, phone: data.phone || null,
      });
      toast.success(t('registerSuccess'), { id: toastId });
      // 保存用户名供登录后显示。若后端返回值包含 userName 也会被 Login 提取
      sessionStorage.setItem('userName', data.username);
      setViewMode('login');
      setAuthMode('password');
      loginPasswordForm.reset({ email: data.email });
    } catch (e: any) {
      const msg = typeof e === 'string' ? e : (e as Error).message;
      toast.error(t(msg ?? 'errorRegisterFailed'), { id: toastId });
    }
  };

  const toggleLang = () => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh');
  const getSubmitHandler = () => (
    isLogin
      ? (authMode === 'password'
          ? loginPasswordForm.handleSubmit(onLoginSubmit)
          : loginCodeForm.handleSubmit(onLoginSubmit))
      : registerForm.handleSubmit(onRegisterSubmit)
  );

  const { isSubmitting: isLoginPasswordSubmitting, errors: loginPasswordErrors } = loginPasswordForm.formState;
  const { isSubmitting: isLoginCodeSubmitting, errors: loginCodeErrors } = loginCodeForm.formState;
  const { isSubmitting: isRegisterSubmitting, errors: registerErrors } = registerForm.formState;
  const isSubmitting = isLoginPasswordSubmitting || isLoginCodeSubmitting || isRegisterSubmitting;

  const Pill = ({ active, children, onClick, label }: any) => (
    <button
      role="tab"
      aria-label={label}
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
          ${active
            ? 'bg-[#0078D4] text-white dark:bg-[#00A4EF]'
            : 'text-slate-700 hover:bg-sky-100 dark:text-slate-200 dark:hover:bg-white/10'}`}
    >
      {children}
    </button>
  );

  const renderLoginForm = () => (
    <>
      <div className="mb-4 flex gap-2 p-1 bg-sky-50 rounded-lg dark:bg-white/5" role="tablist" aria-label={t('authMethodSwitch')}>
        <Pill active={authMode === 'password'} onClick={() => setAuthMode('password')} label={t('passwordLogin')}>
          {t('passwordLogin')}
        </Pill>
        <Pill active={authMode === 'code'} onClick={() => setAuthMode('code')} label={t('codeLogin')}>
          {t('codeLogin')}
        </Pill>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={authMode}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
        >
          {authMode === 'password' ? (
            <div className="space-y-4">
              <FormInput
                icon={<Mail size={18} />}
                type="email"
                placeholder={t('emailPlaceholder')}
                {...loginPasswordForm.register('email')}
                error={!!loginPasswordErrors.email}
              />
              <div className="relative">
                <FormInput
                  icon={<KeyRound size={18} />}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('passwordPlaceholder')}
                  {...loginPasswordForm.register('password')}
                  error={!!loginPasswordErrors.password}
                />
                <button
                  type="button"
                  aria-label={showPassword ? t('togglePasswordHide') : t('togglePasswordShow')}
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <FormInput
                icon={<Mail size={18} />}
                type="email"
                placeholder={t('emailPlaceholder')}
                {...loginCodeForm.register('email')}
                error={!!loginCodeErrors.email}
              />
              <div className="flex gap-3 items-start">
                <div className="flex-grow">
                  <FormInput
                    icon={<AtSign size={18} />}
                    placeholder={t('codePlaceholder')}
                    {...loginCodeForm.register('code')}
                    error={!!loginCodeErrors.code}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || countdown > 0}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50
                                  focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                                  disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap
                                  dark:bg-white/10 dark:text-slate-100 dark:border-white/10 dark:hover:bg-white/15"
                >
                  {countdown > 0 ? t('resendIn', { count: countdown }) : (sendingCode ? t('sending') : t('sendCode'))}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );

  const renderRegisterForm = () => (
    <div className="space-y-4">
      <FormInput icon={<User size={18} />} placeholder={t('usernamePlaceholder')} {...registerForm.register('username')} error={!!registerErrors?.username} />
      <FormInput icon={<Mail size={18} />} type="email" placeholder={t('emailPlaceholder')} {...registerForm.register('email')} error={!!registerErrors?.email} />
      <FormInput icon={<KeyRound size={18} />} type="password" placeholder={t('passwordPlaceholder')} {...registerForm.register('password')} error={!!registerErrors?.password} />
      <FormInput icon={<AtSign size={18} />} placeholder={t('codePlaceholder')} {...registerForm.register('code')} error={!!registerErrors?.code} />
      <FormInput icon={<Phone size={18} />} placeholder={t('alipayPhonePlaceholder')} {...registerForm.register('alipayPhone')} />
      <FormInput icon={<CreditCard size={18} />} placeholder={t('alipayNamePlaceholder')} {...registerForm.register('alipayName')} />
      <FormInput icon={<Gift size={18} />} placeholder={t('inviteCodePlaceholder')} {...registerForm.register('inviteCode')} />
      <button
        type="button"
        onClick={() => handleSendCode()}
        disabled={sendingCode || countdown > 0}
        className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                     disabled:opacity-60 disabled:cursor-not-allowed
                     dark:bg-white/10 dark:text-slate-100 dark:border-white/10 dark:hover:bg-white/15"
      >
        {countdown > 0 ? t('resendIn', { count: countdown }) : (sendingCode ? t('sending') : t('sendCode'))}
      </button>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      <HashPowerBackground />
      <Toaster position="top-center" reverseOrder={false} />
      <div className="relative z-10 w-full max-w-md p-8 bg-white rounded-xl shadow-lg dark:bg-[#1A1A1A]/95 dark:text-slate-100 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{isLogin ? t('login') : t('register')}</h2>
          <ThemeToggle />
        </div>
        <div className="flex gap-2" role="tablist" aria-label={t('viewSwitch')}>
          <button
            role="tab"
            aria-selected={isLogin}
            onClick={() => setViewMode('login')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
              ${isLogin
                ? 'bg-[#0078D4] text-white dark:bg-[#00A4EF]'
                : 'text-slate-700 hover:bg-sky-100 dark:text-slate-200 dark:hover:bg-white/10'}`}
          >
            {t('login')}
          </button>
          <button
            role="tab"
            aria-selected={!isLogin}
            onClick={() => setViewMode('register')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
              ${!isLogin
                ? 'bg-[#0078D4] text-white dark:bg-[#00A4EF]'
                : 'text-slate-700 hover:bg-sky-100 dark:text-slate-200 dark:hover:bg-white/10'}`}
          >
            {t('register')}
          </button>
        </div>
        <form onSubmit={getSubmitHandler()} className="space-y-6">
          {isLogin ? renderLoginForm() : renderRegisterForm()}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0078D4] hover:bg-[#005FA3]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                       disabled:opacity-60 disabled:cursor-not-allowed dark:bg-[#00A4EF] dark:hover:bg-[#0080C9]"
          >
            {isLogin ? t('loginButton') : t('registerButton')}
          </button>
        </form>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={toggleLang} className="underline decoration-dashed">
            {i18n.language === 'zh' ? 'English' : '中文'}
          </button>
          {isLogin && (
            <button type="button" onClick={() => setAuthMode(authMode === 'password' ? 'code' : 'password')} className="underline decoration-dashed">
              {authMode === 'password' ? t('useCodeLogin') : t('usePasswordLogin')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;