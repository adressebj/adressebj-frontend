'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { ApiError, api } from '@/lib/api';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function BackofficeLoginPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, isModerator, isAdmin, login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Déjà connecté en back-office → redirige immédiatement vers /admin.
  // Un Habitant qui atterrit ici n'est pas redirigé (il peut basculer).
  useEffect(() => {
    if (isReady && isAuthenticated && (isModerator || isAdmin)) {
      router.replace('/admin');
    }
  }, [isReady, isAuthenticated, isModerator, isAdmin, router]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = email.trim();
      if (!EMAIL_RE.test(trimmed)) {
        setError('Adresse email invalide.');
        return;
      }
      if (!password) {
        setError('Saisissez votre mot de passe.');
        return;
      }
      setError(null);
      setLoggingIn(true);
      try {
        const { accessToken } = await api.adminLogin(trimmed, password);
        login(accessToken);
        router.replace('/admin');
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === 'ACCOUNT_SUSPENDED') {
            setError('Votre compte est suspendu.');
          } else {
            setError('Identifiants incorrects.');
          }
        } else {
          toast.show({
            message: 'Connexion impossible pour le moment.',
            variant: 'error',
          });
        }
      } finally {
        setLoggingIn(false);
      }
    },
    [email, password, login, router, toast],
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-bg">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <span
            aria-hidden="true"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-surface text-primary ring-1 ring-primary/15"
          >
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h1 className="font-display font-bold text-2xl text-text-primary">
            Connexion back-office
          </h1>
          <p className="text-sm text-text-muted max-w-xs">
            Espace réservé aux modérateurs et administrateurs.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="w-full bg-surface border border-border rounded-xl shadow-md p-5 sm:p-6 flex flex-col gap-5 animate-fade-up"
          noValidate
        >
          <Input
            label="Adresse email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="vous@adressebj.bj"
            leadingIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
          />
          <Input
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="••••••••"
            leadingIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
          />

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loggingIn}
            fullWidth
            leadingIcon={<LogIn className="h-5 w-5" aria-hidden="true" />}
          >
            Se connecter
          </Button>

          <div className="flex justify-between items-center text-xs">
            <Link
              href="/forgot-password"
              className="font-medium text-primary hover:underline"
            >
              Mot de passe oublié ?
            </Link>
            <Link href="/auth" className="text-text-muted hover:text-text-primary">
              Espace Habitant
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
