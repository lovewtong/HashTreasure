// src/components/Login.tsx
import React, { useEffect, useState, forwardRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { User, KeyRound, Mail, AtSign, Eye, EyeOff, LoaderCircle, Gift, Phone, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, SubmitHandler, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast, { Toaster } from 'react-hot-toast';

import HashPowerBackground from './HashPowerBackground';
import '../i18n';

// Zod Schemas for validation
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

interface LoginProps {
  onLoginSuccess: () => void;
}

type AuthMode = 'password' | 'code';
type ViewMode = 'login' | 'register';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
  error?: boolean;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ icon, error, ...props }, ref) => (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
        {icon}
      </div>
      <input
        ref={ref}
        {...props}
        className={`w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/5 border ${
          error ? 'border-red-500/50' : 'border-white/20'
        } placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-colors duration-300`}
      />
    </div>
  )
);


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
      username: '',
      email: '',
      password: '',
      code: '',
      alipayPhone: '',
      alipayName: '',
      inviteCode: '',
      phone: '',
    },
  });

  const isLogin = viewMode === 'login';

  useEffect(() => {
    let timer: number;
    if (countdown > 0) {
      timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    const form = isLogin ? loginCodeForm : registerForm;
    const isEmailValid = await form.trigger('email');

    if (!isEmailValid) {
      return;
    }

    const email = form.getValues().email;

    setSendingCode(true);
    toast.loading(t('sending'), { id: 'code-toast' });
    try {
      await invoke('send_code', { email, type: isLogin ? 'LOGIN' : 'REGISTER' });
      toast.success(t('sendCodeSuccess'), { id: 'code-toast' });
      setCountdown(60);
    } catch (e: any) {
      const errorMessage = typeof e === 'string' ? e : (e as Error).message;
      toast.error(t(errorMessage ?? 'errorSendFailed'), { id: 'code-toast' });
    } finally {
      setSendingCode(false);
    }
  };

  const onLoginSubmit: SubmitHandler<LoginPasswordForm | LoginCodeForm> = async (data) => {
    const toastId = toast.loading(t('loggingIn'));
    try {
      if (authMode === 'password') {
        const { email, password } = data as LoginPasswordForm;
        // --- MODIFIED: Pass `email` instead of `username` to match the backend command ---
        await invoke('login', { email, password });
      } else {
        const { email, code } = data as LoginCodeForm;
        await invoke('login_by_code', { email, code });
      }
      toast.success(t('loginSuccess'), { id: toastId });
      onLoginSuccess();
    } catch (e: any) {
        const errorMessage = typeof e === 'string' ? e : (e as Error).message;
        toast.error(t(errorMessage ?? 'errorLoginFailed'), { id: toastId });
    }
  };

  const onRegisterSubmit: SubmitHandler<RegisterForm> = async (data) => {
    const toastId = toast.loading(t('registering'));
    try {
      await invoke('register', { 
        username: data.username, 
        password: data.password, 
        email: data.email, 
        code: data.code,
        alipayPhone: data.alipayPhone || null,
        alipayName: data.alipayName || null,
        inviteCode: data.inviteCode || null,
        phone: data.phone || null,
      });
      toast.success(t('registerSuccess'), { id: toastId });
      setViewMode('login');
      setAuthMode('password');
      loginPasswordForm.reset({ email: data.email });
    } catch (e: any) {
        const errorMessage = typeof e === 'string' ? e : (e as Error).message;
        toast.error(t(errorMessage ?? 'errorRegisterFailed'), { id: toastId });
    }
  };

  const toggleLang = () => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh');

  const getSubmitHandler = () => {
    if (isLogin) {
      return authMode === 'password' 
        ? loginPasswordForm.handleSubmit(onLoginSubmit)
        : loginCodeForm.handleSubmit(onLoginSubmit);
    }
    return registerForm.handleSubmit(onRegisterSubmit);
  };

  const { isSubmitting: isLoginPasswordSubmitting, errors: loginPasswordErrors } = loginPasswordForm.formState;
  const { isSubmitting: isLoginCodeSubmitting, errors: loginCodeErrors } = loginCodeForm.formState;
  const { isSubmitting: isRegisterSubmitting, errors: registerErrors } = registerForm.formState;
  const isSubmitting = isLoginPasswordSubmitting || isLoginCodeSubmitting || isRegisterSubmitting;

  const renderLoginForm = () => (
    <>
      <div className="mb-4 flex gap-2 p-1 bg-white/5 rounded-lg" role="tablist" aria-label={t('authMethodSwitch')}>
        <button role="tab" aria-selected={authMode === 'password'} onClick={() => setAuthMode('password')} className={`flex-1 py-2 rounded-md text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors ${authMode === 'password' ? 'bg-cyan-600/70 text-white shadow-md' : 'text-gray-300 hover:bg-white/10'}`}>
          {t('passwordLogin')}
        </button>
        <button role="tab" aria-selected={authMode === 'code'} onClick={() => setAuthMode('code')} className={`flex-1 py-2 rounded-md text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors ${authMode === 'code' ? 'bg-cyan-600/70 text-white shadow-md' : 'text-gray-300 hover:bg-white/10'}`}>
          {t('codeLogin')}
        </button>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={authMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {authMode === 'password' ? (
            <div className="space-y-4">
              <FormInput icon={<Mail size={18} />} type="email" placeholder={t('emailPlaceholder')} {...loginPasswordForm.register('email')} error={!!loginPasswordErrors.email} />
              <div className="relative">
                <FormInput icon={<KeyRound size={18} />} type={showPassword ? 'text' : 'password'} placeholder={t('passwordPlaceholder')} {...loginPasswordForm.register('password')} error={!!loginPasswordErrors.password} />
                <button type="button" aria-label={showPassword ? t('togglePasswordHide') : t('togglePasswordShow')} onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <FormInput icon={<Mail size={18} />} type="email" placeholder={t('emailPlaceholder')} {...loginCodeForm.register('email')} error={!!loginCodeErrors.email} />
              <div className="flex gap-3 items-start">
                <div className="flex-grow">
                  <FormInput icon={<AtSign size={18} />} placeholder={t('codePlaceholder')} {...loginCodeForm.register('code')} error={!!loginCodeErrors.code} />
                </div>
                <button type="button" onClick={handleSendCode} disabled={sendingCode || countdown > 0} className="px-4 py-2.5 rounded-lg text-sm font-medium focus:outline-none focus-visible:ring-2 bg-white/10 hover:bg-white/20 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap">
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
      <FormInput icon={<User size={18} />} placeholder={t('usernamePlaceholder')} {...registerForm.register('username')} error={!!registerErrors.username} />
      <FormInput icon={<Mail size={18} />} type="email" placeholder={t('emailPlaceholder')} {...registerForm.register('email')} error={!!registerErrors.email} />
      <div className="relative">
        <FormInput icon={<KeyRound size={18} />} type={showPassword ? 'text' : 'password'} placeholder={t('passwordPlaceholder')} {...registerForm.register('password')} error={!!registerErrors.password} />
        <button type="button" aria-label={showPassword ? t('togglePasswordHide') : t('togglePasswordShow')} onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <div className="flex gap-3 items-start">
        <div className="flex-grow">
          <FormInput icon={<AtSign size={18} />} placeholder={t('codePlaceholder')} {...registerForm.register('code')} error={!!registerErrors.code} />
        </div>
        <button type="button" onClick={handleSendCode} disabled={sendingCode || countdown > 0} className="px-4 py-2.5 rounded-lg text-sm font-medium focus:outline-none focus-visible:ring-2 bg-white/10 hover:bg-white/20 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap">
          {countdown > 0 ? t('resendIn', { count: countdown }) : (sendingCode ? t('sending') : t('sendCode'))}
        </button>
      </div>
      <FormInput icon={<Phone size={18} />} placeholder={t('phoneOptionalPlaceholder')} {...registerForm.register('phone')} error={!!registerErrors.phone} />
      <FormInput icon={<CreditCard size={18} />} placeholder={t('alipayPhoneOptionalPlaceholder')} {...registerForm.register('alipayPhone')} error={!!registerErrors.alipayPhone} />
      <FormInput icon={<User size={18} />} placeholder={t('alipayNameOptionalPlaceholder')} {...registerForm.register('alipayName')} error={!!registerErrors.alipayName} />
      <FormInput icon={<Gift size={18} />} placeholder={t('inviteCodeOptionalPlaceholder')} {...registerForm.register('inviteCode')} error={!!registerErrors.inviteCode} />
    </div>
  );

  const getErrorMessage = () => {
    let errors: FieldErrors;
    if (isLogin) {
      errors = authMode === 'password' ? loginPasswordErrors : loginCodeErrors;
    } else {
      errors = registerErrors;
    }
    for (const key in errors) {
      if (errors[key as keyof typeof errors]) {
        return t((errors[key as keyof typeof errors]?.message) as string);
      }
    }
    return null;
  };
  
  const errorMessage = getErrorMessage();

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <HashPowerBackground />
      <Toaster position="top-center" toastOptions={{ className: 'bg-gray-800 text-white border border-white/20' }} />
      
      <div className="relative z-10 flex flex-col min-h-screen text-gray-100 font-sans">
        <header className="w-full max-w-7xl mx-auto px-6 pt-6 flex items-center justify-between">
          <div className="text-xl font-bold tracking-wider select-none text-white/90">{t('appName')}</div>
          <button aria-label={t('switchLanguage')} onClick={toggleLang} className="text-sm rounded-md px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors">
            {i18n.language === 'zh' ? 'EN' : '中'}
          </button>
        </header>

        <main className="flex-grow flex items-center justify-center p-4">
          <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.section initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="order-2 md:order-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-white tracking-wide">{t('tagline')}</h2>
              <p className="text-base md:text-lg text-gray-300 mt-6 max-w-lg mx-auto md:mx-0">{t('description')}</p>
            </motion.section>

            <motion.section initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.4 }} className="order-1 md:order-2">
              <div className="w-full max-w-sm mx-auto p-8 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl shadow-cyan-500/10">
                <h3 className="text-2xl font-semibold mb-6 text-center text-white/90">{isLogin ? t('loginTitle') : t('registerTitle')}</h3>
                <form onSubmit={getSubmitHandler()} className="space-y-4" noValidate>
                  {isLogin ? renderLoginForm() : renderRegisterForm()}
                  <AnimatePresence>
                    {errorMessage && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div role="alert" className="text-sm text-red-400 text-center pt-2">{errorMessage}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="pt-4 space-y-3">
                    <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-lg font-semibold text-white bg-cyan-600 hover:bg-cyan-500 hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 transition-all duration-300 flex items-center justify-center">
                      {isSubmitting && <LoaderCircle className="animate-spin mr-2" size={20} />}
                      {isSubmitting ? t(isLogin ? 'loggingIn' : 'registering') : t(isLogin ? 'signIn' : 'register')}
                    </button>
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <button type="button" onClick={() => { setViewMode(isLogin ? 'register' : 'login'); loginPasswordForm.reset(); loginCodeForm.reset(); registerForm.reset(); }} className="hover:underline hover:text-white transition-colors">
                        {isLogin ? t('noAccountRegister') : t('hasAccountLogin')}
                      </button>
                      {isLogin && (<a href="#" className="text-sm hover:underline hover:text-white transition-colors">{t('forgotPassword')}</a>)}
                    </div>
                  </div>
                </form>
              </div>
            </motion.section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;
