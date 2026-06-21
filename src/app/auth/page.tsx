'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { OtpInput } from '@/components/forms/OtpInput';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { ApiError, api } from '@/lib/api';
import { classNames, isValidBeninPhone, maskPhone } from '@/lib/utils';

type Mode = 'login' | 'register';
type Step = 1 | 2;

const PHONE_FORMAT_ERROR = 'Numéro invalide. Exemple : +22960000000';
const EMAIL_FORMAT_ERROR = 'Adresse e-mail invalide.';
const PASSWORD_TOO_SHORT_ERROR = 'Mot de passe trop court (8 caractères minimum).';
const GENERIC_ERROR = "Une erreur est survenue. Réessayez dans un instant.";
const OTP_ERROR = 'Code incorrect ou expiré. Vérifiez votre SMS.';
const LOGIN_ERROR = 'Téléphone ou mot de passe incorrect.';

/**
 * Authentification Habitant (CDC v5 §3 révisé).
 *
 * Mode « Connexion » : téléphone + mot de passe → JWT direct, sans OTP.
 * Mode « Inscription » : téléphone + e-mail + mot de passe → un OTP est
 * envoyé par SMS pour vérifier le numéro ; la vérification réussie crée
 * le compte et retourne le JWT.
 *
 * `?redirect=` permet à `/auth` de ramener à la page d'origine après
 * connexion (utile pour les actions gated comme l'évaluation).
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
  }, []);

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
      await api.registerHabitant({
        phone,
        email: email.trim(),
        password,
      });
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

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (mode === 'login') await handleLogin();
      else await handleRegister();
    },
    [mode, handleLogin, handleRegister],
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
    setResendIn(0);
  }, []);

  const handleResendCode = useCallback(async () => {
    try {
      await api.registerHabitant({ phone, email: email.trim(), password });
      setOtpResetKey((n) => n + 1);
      setResendIn(45);
    } catch {
      toast.show({ message: GENERIC_ERROR, variant: 'error' });
    }
  }, [phone, email, password, toast]);

  if (!isReady || isAuthenticated) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-6"
        aria-hidden="true"
      />
    );
  }

  const localPhone = phone.startsWith('+229') ? phone.slice(4) : phone.replace(/\D+/g, '');

  return (
    <div className="min-h-screen flex flex-col items-center">
      <header className="flex h-16 w-full max-w-2xl items-center justify-between px-4 bg-surface">
        {step === 1 ? (
          <Link href="/" aria-label="Accueil" className="p-2 -ml-2 text-primary">
            <MapPin className="h-6 w-6" fill="currentColor" aria-hidden="true" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleEditPhone}
            aria-label="Retour"
            className="p-2 -ml-2 rounded-full text-primary hover:bg-surface-muted transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
        <span className="flex-1 flex justify-center pr-8">
          <Logo size="md" />
        </span>
      </header>

      <main className="relative flex-1 w-full max-w-2xl px-4 py-6 flex flex-col justify-center isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-hero-glow -z-10"
        />

        <section
          aria-labelledby="auth-title"
          className="w-full bg-surface border border-border shadow-md rounded-xl p-3 sm:p-6 flex flex-col gap-6 animate-fade-up"
        >
          {step === 1 ? (
            <>
              {/* Onglets Connexion / Inscription */}
              <div
                role="tablist"
                aria-label="Mode d'accès"
                className="grid grid-cols-2 gap-1 bg-surface-muted rounded-md p-1"
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

              <form
                key={`step-1-${mode}`}
                onSubmit={handleSubmit}
                className="animate-step-in flex flex-col gap-5"
                noValidate
              >
                <div className="flex flex-col gap-1.5 text-center">
                  <h1
                    id="auth-title"
                    className="font-display font-bold text-2xl text-primary"
                  >
                    {mode === 'login'
                      ? 'Bon retour sur AdresseBJ'
                      : 'Créer votre compte AdresseBJ'}
                  </h1>
                  <p className="text-base text-text-muted">
                    {mode === 'login'
                      ? 'Connectez-vous avec votre numéro et votre mot de passe'
                      : 'Téléphone, e-mail et mot de passe. Un code SMS vous sera envoyé pour vérifier votre numéro.'}
                  </p>
                </div>

                {/* Champ téléphone — commun aux deux modes */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="auth-phone"
                    className="text-sm font-medium text-text-primary"
                  >
                    Numéro de téléphone
                  </label>
                  <div
                    className={classNames(
                      'flex items-stretch rounded-md border-[1.5px] bg-surface transition-colors',
                      'focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20',
                      phoneError ? 'border-danger' : 'border-border-strong',
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
                      aria-invalid={phoneError ? true : undefined}
                      aria-describedby={phoneError ? 'auth-phone-error' : undefined}
                      value={localPhone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D+/g, '').slice(0, 8);
                        setPhone('+229' + digits);
                        if (phoneError) setPhoneError(null);
                      }}
                      className="flex-1 min-w-0 h-12 px-3 bg-transparent outline-none text-base text-text-primary placeholder:text-text-muted rounded-r-md"
                      required
                    />
                  </div>
                  {phoneError ? (
                    <p id="auth-phone-error" className="text-xs text-danger" role="alert">
                      {phoneError}
                    </p>
                  ) : null}
                </div>

                {/* Champ e-mail — inscription uniquement */}
                {mode === 'register' ? (
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="auth-email"
                      className="text-sm font-medium text-text-primary"
                    >
                      Adresse e-mail
                    </label>
                    <div
                      className={classNames(
                        'flex items-stretch rounded-md border-[1.5px] bg-surface transition-colors',
                        'focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20',
                        emailError ? 'border-danger' : 'border-border-strong',
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
                        aria-invalid={emailError ? true : undefined}
                        aria-describedby={emailError ? 'auth-email-error' : undefined}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError(null);
                        }}
                        className="flex-1 min-w-0 h-12 px-3 bg-transparent outline-none text-base text-text-primary placeholder:text-text-muted rounded-r-md"
                        required
                      />
                    </div>
                    {emailError ? (
                      <p id="auth-email-error" className="text-xs text-danger" role="alert">
                        {emailError}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {/* Champ mot de passe */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="auth-password"
                    className="text-sm font-medium text-text-primary"
                  >
                    Mot de passe
                  </label>
                  <div
                    className={classNames(
                      'flex items-stretch rounded-md border-[1.5px] bg-surface transition-colors',
                      'focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20',
                      passwordError ? 'border-danger' : 'border-border-strong',
                    )}
                  >
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder={
                        mode === 'register' ? '8 caractères minimum' : 'Votre mot de passe'
                      }
                      aria-invalid={passwordError ? true : undefined}
                      aria-describedby={passwordError ? 'auth-password-error' : undefined}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      className="flex-1 min-w-0 h-12 px-3 bg-transparent outline-none text-base text-text-primary placeholder:text-text-muted rounded-l-md"
                      required
                      minLength={mode === 'register' ? 8 : 1}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      className="flex items-center px-3 text-text-muted hover:text-text-primary transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {passwordError ? (
                    <p id="auth-password-error" className="text-xs text-danger" role="alert">
                      {passwordError}
                    </p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  fullWidth
                  trailingIcon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
                >
                  {mode === 'login' ? 'Se connecter' : 'Recevoir le code SMS'}
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
            <div
              key="step-2"
              className="animate-step-in flex flex-col gap-5"
              aria-live="polite"
            >
              <div className="flex flex-col gap-2 text-center">
                <h1 className="font-display font-bold text-2xl text-text-primary">
                  Vérification
                </h1>
                <p className="text-base text-text-muted">
                  Code envoyé au{' '}
                  <span className="font-medium text-text-primary">
                    {maskPhone(phone)}
                  </span>
                </p>
              </div>

              <OtpInput
                key={otpResetKey}
                length={6}
                onComplete={handleVerifyOtp}
                disabled={verifying}
              />

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
                  const cells = document.querySelectorAll<HTMLInputElement>(
                    '[aria-label^="Chiffre"]',
                  );
                  const value = Array.from(cells).map((c) => c.value).join('');
                  if (value.length === 6) {
                    void handleVerifyOtp(value);
                  }
                }}
              >
                Vérifier
              </Button>
            </div>
          )}
        </section>

        {step === 1 ? (
          <p className="mt-6 text-center text-xs text-text-muted">
            Espace modérateur ou administrateur ?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Connexion back-office
            </Link>
          </p>
        ) : null}
      </main>
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
