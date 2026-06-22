'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { OtpInput } from '@/components/forms/OtpInput';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { ApiError, api } from '@/lib/api';
import { classNames, isValidBeninPhone, maskPhone } from '@/lib/utils';

type Mode = 'login' | 'register' | 'reset';
type Step = 1 | 2;

const PHONE_FORMAT_ERROR = 'Numéro invalide. Exemple : +22960000000';
const EMAIL_FORMAT_ERROR = 'Adresse e-mail invalide.';
const PASSWORD_TOO_SHORT_ERROR = 'Mot de passe trop court (8 caractères minimum).';
const GENERIC_ERROR = 'Une erreur est survenue. Réessayez dans un instant.';
const OTP_ERROR = 'Code incorrect ou expiré. Vérifiez votre SMS.';
const LOGIN_ERROR = 'Téléphone ou mot de passe incorrect.';

/**
 * Authentification Habitant (CDC v5 §3 révisé) — split-screen premium.
 *
 * `mode` : Connexion (téléphone + mot de passe), Inscription (téléphone +
 * e-mail + mot de passe → OTP SMS), Réinitialisation (téléphone → OTP SMS →
 * nouveau mot de passe, auto-connexion). `?redirect=` ramène à la page d'origine.
 *
 * Aucune mention du back-office ici : les deux mondes sont étanches.
 */
export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen flex items-center justify-center gap-2 p-6 text-text-muted"
          aria-busy="true"
        >
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Chargement…</span>
        </main>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReady, isAuthenticated, login } = useAuth();
  const toast = useToast();

  const redirectParam = searchParams?.get('redirect');
  const next =
    redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
      ? redirectParam
      : '/dashboard';

  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<Step>(1);

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetCode, setResetCode] = useState('');

  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpResetKey, setOtpResetKey] = useState(0);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (step !== 2 || resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [step, resendIn]);

  // Déjà connecté → ramène directement à la destination.
  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace(next);
    }
  }, [isReady, isAuthenticated, next, router]);

  const switchMode = useCallback((newMode: Mode) => {
    setMode(newMode);
    setStep(1);
    setPhoneError(null);
    setEmailError(null);
    setPasswordError(null);
    setPassword('');
    setResetCode('');
  }, []);

  const setLocalDigits = useCallback(
    (digits: string) => {
      setPhone('+229' + digits);
      if (phoneError) setPhoneError(null);
    },
    [phoneError],
  );

  const handleLogin = useCallback(async () => {
    if (!isValidBeninPhone(phone)) {
      setPhoneError(PHONE_FORMAT_ERROR);
      return;
    }
    if (password.length < 1) {
      setPasswordError('Le mot de passe est requis.');
      return;
    }
    setSubmitting(true);
    try {
      const { accessToken } = await api.loginHabitant(phone, password);
      login(accessToken);
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
        toast.show({ message: LOGIN_ERROR, variant: 'error' });
      } else if (err instanceof ApiError && err.code === 'HABITANT_SUSPENDED') {
        toast.show({
          message: 'Votre compte a été désactivé par un modérateur.',
          variant: 'error',
        });
      } else {
        toast.show({ message: GENERIC_ERROR, variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }, [phone, password, login, next, router, toast]);

  const handleRegister = useCallback(async () => {
    let valid = true;
    if (!isValidBeninPhone(phone)) {
      setPhoneError(PHONE_FORMAT_ERROR);
      valid = false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError(EMAIL_FORMAT_ERROR);
      valid = false;
    }
    if (password.length < 8) {
      setPasswordError(PASSWORD_TOO_SHORT_ERROR);
      valid = false;
    }
    if (!valid) return;

    setSubmitting(true);
    try {
      await api.registerHabitant({ phone, email: email.trim(), password });
      setStep(2);
      setOtpResetKey((n) => n + 1);
      setResendIn(45);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_PHONE_FORMAT') setPhoneError(PHONE_FORMAT_ERROR);
        else if (err.code === 'INVALID_EMAIL_FORMAT') setEmailError(EMAIL_FORMAT_ERROR);
        else if (err.code === 'PASSWORD_TOO_SHORT') setPasswordError(PASSWORD_TOO_SHORT_ERROR);
        else if (err.code === 'PHONE_ALREADY_REGISTERED') {
          toast.show({
            message: 'Ce numéro est déjà associé à un compte. Connectez-vous.',
            variant: 'error',
          });
          switchMode('login');
        } else if (err.code === 'EMAIL_ALREADY_REGISTERED') {
          setEmailError('Cet e-mail est déjà utilisé.');
        } else {
          toast.show({ message: GENERIC_ERROR, variant: 'error' });
        }
      } else {
        toast.show({ message: GENERIC_ERROR, variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }, [phone, email, password, switchMode, toast]);

  // Réinitialisation — étape 1 : demande de l'OTP par téléphone.
  const handleRequestReset = useCallback(async () => {
    if (!isValidBeninPhone(phone)) {
      setPhoneError(PHONE_FORMAT_ERROR);
      return;
    }
    setSubmitting(true);
    try {
      await api.forgotPasswordHabitant(phone);
      setStep(2);
      setOtpResetKey((n) => n + 1);
      setResetCode('');
      setResendIn(45);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_PHONE_FORMAT') {
        setPhoneError(PHONE_FORMAT_ERROR);
      } else {
        toast.show({ message: GENERIC_ERROR, variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }, [phone, toast]);

  // Réinitialisation — étape 2 : OTP + nouveau mot de passe → auto-connexion.
  const handleResetPassword = useCallback(async () => {
    if (resetCode.length !== 6) return;
    if (password.length < 8) {
      setPasswordError(PASSWORD_TOO_SHORT_ERROR);
      return;
    }
    setVerifying(true);
    try {
      const { accessToken } = await api.resetPasswordHabitant(phone, resetCode, password);
      login(accessToken);
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_OR_EXPIRED_OTP') {
        toast.show({ message: OTP_ERROR, variant: 'error' });
        setOtpResetKey((n) => n + 1);
        setResetCode('');
      } else if (err instanceof ApiError && err.code === 'PASSWORD_TOO_SHORT') {
        setPasswordError(PASSWORD_TOO_SHORT_ERROR);
      } else {
        toast.show({ message: GENERIC_ERROR, variant: 'error' });
      }
    } finally {
      setVerifying(false);
    }
  }, [phone, resetCode, password, login, next, router, toast]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (mode === 'login') await handleLogin();
      else if (mode === 'register') await handleRegister();
      else await handleRequestReset();
    },
    [mode, handleLogin, handleRegister, handleRequestReset],
  );

  const handleVerifyOtp = useCallback(
    async (code: string) => {
      if (verifying) return;
      setVerifying(true);
      try {
        const { accessToken } = await api.verifyOtp(phone, code);
        login(accessToken);
        router.replace(next);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'INVALID_OR_EXPIRED_OTP') {
          toast.show({ message: OTP_ERROR, variant: 'error' });
        } else {
          toast.show({ message: GENERIC_ERROR, variant: 'error' });
        }
        setOtpResetKey((n) => n + 1);
      } finally {
        setVerifying(false);
      }
    },
    [phone, verifying, login, next, router, toast],
  );

  const handleEditPhone = useCallback(() => {
    setStep(1);
    setOtpResetKey((n) => n + 1);
    setResetCode('');
    setResendIn(0);
  }, []);

  const handleResendCode = useCallback(async () => {
    try {
      if (mode === 'reset') {
        await api.forgotPasswordHabitant(phone);
      } else {
        await api.registerHabitant({ phone, email: email.trim(), password });
      }
      setOtpResetKey((n) => n + 1);
      setResendIn(45);
    } catch {
      toast.show({ message: GENERIC_ERROR, variant: 'error' });
    }
  }, [mode, phone, email, password, toast]);

  if (!isReady || isAuthenticated) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-6"
        aria-hidden="true"
      />
    );
  }

  const localPhone = phone.startsWith('+229') ? phone.slice(4) : phone.replace(/\D+/g, '');

  const heading =
    mode === 'login'
      ? 'Bon retour sur AdresseBJ'
      : mode === 'register'
        ? 'Créer votre compte AdresseBJ'
        : 'Réinitialiser votre mot de passe';
  const subheading =
    mode === 'login'
      ? 'Connectez-vous avec votre numéro et votre mot de passe.'
      : mode === 'register'
        ? 'Téléphone, e-mail et mot de passe. Un code SMS vérifiera votre numéro.'
        : 'Saisissez votre numéro : nous vous enverrons un code pour en choisir un nouveau.';

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      <AuthBrandPanel />

      <div className="flex min-h-screen flex-col">
        {/* En-tête : logo (mobile) + retour contextuel. */}
        <header className="flex h-16 w-full items-center justify-between px-4 sm:px-8">
          {step === 2 ? (
            <button
              type="button"
              onClick={handleEditPhone}
              aria-label="Retour"
              className="p-2 -ml-2 rounded-full text-primary hover:bg-surface-muted transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-6 w-6" aria-hidden="true" />
            </button>
          ) : mode === 'reset' ? (
            <button
              type="button"
              onClick={() => switchMode('login')}
              aria-label="Retour à la connexion"
              className="p-2 -ml-2 rounded-full text-primary hover:bg-surface-muted transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-6 w-6" aria-hidden="true" />
            </button>
          ) : (
            <Link href="/" aria-label="Accueil" className="-ml-1 lg:hidden">
              <Logo size="md" />
            </Link>
          )}
          <span aria-hidden="true" />
        </header>

        <main className="relative flex flex-1 flex-col justify-center px-4 pb-10 sm:px-8 isolate">
          <div className="mx-auto w-full max-w-md">
            <section
              aria-labelledby="auth-title"
              className="flex flex-col gap-6 animate-fade-up"
            >
              {step === 1 ? (
                <>
                  {/* Onglets Connexion / Inscription — masqués en mode reset. */}
                  {mode !== 'reset' ? (
                    <div
                      role="tablist"
                      aria-label="Mode d'accès"
                      className="grid grid-cols-2 gap-1 rounded-md bg-surface-muted p-1"
                    >
                      {(['login', 'register'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          role="tab"
                          aria-selected={mode === m}
                          onClick={() => switchMode(m)}
                          className={classNames(
                            'h-9 rounded-sm text-sm font-medium transition-colors cursor-pointer',
                            mode === m
                              ? 'bg-surface text-text-primary shadow-sm'
                              : 'text-text-muted hover:text-text-primary',
                          )}
                        >
                          {m === 'login' ? 'Connexion' : 'Inscription'}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <form
                    key={`step-1-${mode}`}
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-5 animate-step-in"
                    noValidate
                  >
                    <div className="flex flex-col gap-1.5">
                      <h1
                        id="auth-title"
                        className="font-display font-black text-3xl text-text-primary"
                      >
                        {heading}
                      </h1>
                      <p className="text-text-muted">{subheading}</p>
                    </div>

                    <PhoneField
                      localPhone={localPhone}
                      onDigits={setLocalDigits}
                      error={phoneError}
                    />

                    {mode === 'register' ? (
                      <EmailField
                        value={email}
                        onChange={(v) => {
                          setEmail(v);
                          if (emailError) setEmailError(null);
                        }}
                        error={emailError}
                      />
                    ) : null}

                    {mode !== 'reset' ? (
                      <PasswordField
                        label="Mot de passe"
                        value={password}
                        onChange={(v) => {
                          setPassword(v);
                          if (passwordError) setPasswordError(null);
                        }}
                        error={passwordError}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        placeholder={
                          mode === 'register' ? '8 caractères minimum' : 'Votre mot de passe'
                        }
                        minLength={mode === 'register' ? 8 : 1}
                        show={showPassword}
                        onToggleShow={() => setShowPassword((v) => !v)}
                        trailing={
                          mode === 'login' ? (
                            <button
                              type="button"
                              onClick={() => switchMode('reset')}
                              className="self-end text-xs font-medium text-primary hover:underline cursor-pointer"
                            >
                              Mot de passe oublié ?
                            </button>
                          ) : null
                        }
                      />
                    ) : null}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={submitting}
                      fullWidth
                      trailingIcon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
                    >
                      {mode === 'login'
                        ? 'Se connecter'
                        : mode === 'register'
                          ? 'Recevoir le code SMS'
                          : 'Envoyer le code'}
                    </Button>

                    {mode === 'register' ? (
                      <p className="text-center text-xs text-text-muted">
                        En continuant, vous acceptez les{' '}
                        <Link href="/" className="font-medium text-primary hover:underline">
                          CGU
                        </Link>
                        .
                      </p>
                    ) : null}
                  </form>
                </>
              ) : (
                <div key="step-2" className="flex flex-col gap-5 animate-step-in" aria-live="polite">
                  <div className="flex flex-col gap-2">
                    <h1
                      id="auth-title"
                      className="font-display font-black text-3xl text-text-primary"
                    >
                      Vérification
                    </h1>
                    <p className="text-text-muted">
                      Code envoyé au{' '}
                      <span className="font-medium text-text-primary">{maskPhone(phone)}</span>
                    </p>
                  </div>

                  <OtpInput
                    key={otpResetKey}
                    length={6}
                    onComplete={mode === 'reset' ? () => {} : handleVerifyOtp}
                    onChange={mode === 'reset' ? setResetCode : undefined}
                    disabled={verifying}
                  />

                  {mode === 'reset' ? (
                    <PasswordField
                      label="Nouveau mot de passe"
                      value={password}
                      onChange={(v) => {
                        setPassword(v);
                        if (passwordError) setPasswordError(null);
                      }}
                      error={passwordError}
                      autoComplete="new-password"
                      placeholder="8 caractères minimum"
                      minLength={8}
                      show={showPassword}
                      onToggleShow={() => setShowPassword((v) => !v)}
                    />
                  ) : null}

                  <div className="flex flex-col items-center gap-4">
                    {resendIn > 0 ? (
                      <p className="text-sm text-text-muted">
                        Renvoyer le code dans{' '}
                        <span className="font-bold">
                          0:{String(resendIn).padStart(2, '0')}
                        </span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={verifying}
                        className="text-sm font-medium text-primary hover:underline cursor-pointer"
                      >
                        Renvoyer le code maintenant
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleEditPhone}
                      disabled={verifying}
                      className="text-sm font-medium text-primary hover:underline cursor-pointer"
                    >
                      Modifier le numéro
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    loading={verifying}
                    fullWidth
                    onClick={() => {
                      if (mode === 'reset') {
                        void handleResetPassword();
                        return;
                      }
                      const cells = document.querySelectorAll<HTMLInputElement>(
                        '[aria-label^="Chiffre"]',
                      );
                      const value = Array.from(cells).map((c) => c.value).join('');
                      if (value.length === 6) void handleVerifyOtp(value);
                    }}
                  >
                    {mode === 'reset' ? 'Réinitialiser le mot de passe' : 'Vérifier'}
                  </Button>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Champs réutilisables ───────────────────────────────────────────────────

function PhoneField({
  localPhone,
  onDigits,
  error,
}: {
  localPhone: string;
  onDigits: (digits: string) => void;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="auth-phone" className="text-sm font-medium text-text-primary">
        Numéro de téléphone
      </label>
      <div
        className={classNames(
          'flex items-stretch rounded-md border-[1.5px] bg-surface transition-colors',
          'focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20',
          error ? 'border-danger' : 'border-border-strong',
        )}
      >
        <span className="flex items-center gap-2 px-3 border-r border-border-strong text-base text-text-primary select-none">
          <BeninFlag />
          +229
        </span>
        <input
          id="auth-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="00 00 00 00"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'auth-phone-error' : undefined}
          value={localPhone}
          onChange={(e) => onDigits(e.target.value.replace(/\D+/g, '').slice(0, 8))}
          className="flex-1 min-w-0 h-12 px-3 bg-transparent outline-none text-base text-text-primary placeholder:text-text-muted rounded-r-md"
          required
        />
      </div>
      {error ? (
        <p id="auth-phone-error" className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function EmailField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="auth-email" className="text-sm font-medium text-text-primary">
        Adresse e-mail
      </label>
      <div
        className={classNames(
          'flex items-stretch rounded-md border-[1.5px] bg-surface transition-colors',
          'focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20',
          error ? 'border-danger' : 'border-border-strong',
        )}
      >
        <span className="flex items-center px-3 border-r border-border-strong text-text-muted select-none">
          <Mail className="h-4 w-4" aria-hidden="true" />
        </span>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'auth-email-error' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 h-12 px-3 bg-transparent outline-none text-base text-text-primary placeholder:text-text-muted rounded-r-md"
          required
        />
      </div>
      {error ? (
        <p id="auth-email-error" className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
  minLength,
  show,
  onToggleShow,
  trailing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
  autoComplete: string;
  placeholder: string;
  minLength: number;
  show: boolean;
  onToggleShow: () => void;
  trailing?: React.ReactNode;
}) {
  const id = label === 'Mot de passe' ? 'auth-password' : 'auth-new-password';
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      <div
        className={classNames(
          'flex items-stretch rounded-md border-[1.5px] bg-surface transition-colors',
          'focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20',
          error ? 'border-danger' : 'border-border-strong',
        )}
      >
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 h-12 px-3 bg-transparent outline-none text-base text-text-primary placeholder:text-text-muted rounded-l-md"
          required
          minLength={minLength}
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="flex items-center px-3 text-text-muted hover:text-text-primary transition-colors"
        >
          {show ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {trailing}
    </div>
  );
}

// Drapeau du Bénin — bande verte verticale, jaune (haut) / rouge (bas).
function BeninFlag() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-3.5 w-5 overflow-hidden rounded-[2px] border border-border"
    >
      <span className="w-1/3 bg-[#008751]" />
      <span className="flex w-2/3 flex-col">
        <span className="h-1/2 bg-[#FCD116]" />
        <span className="h-1/2 bg-[#E8112D]" />
      </span>
    </span>
  );
}
