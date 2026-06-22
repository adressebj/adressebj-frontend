'use client';

import { Suspense, useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

export default function BackofficeResetPasswordPage() {
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
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (password.length < 8) {
        setError('Mot de passe trop court (8 caractères minimum).');
        return;
      }
      if (password !== confirm) {
        setError('Les deux mots de passe ne correspondent pas.');
        return;
      }
      setError(null);
      setSaving(true);
      try {
        await api.adminResetPassword(token, password);
        setDone(true);
      } catch {
        toast.show({
          message: 'Lien invalide ou expiré. Demandez-en un nouveau.',
          variant: 'error',
        });
      } finally {
        setSaving(false);
      }
    },
    [password, confirm, token, toast],
  );

  // Lien sans jeton — on n'affiche pas le formulaire.
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-bg">
        <div className="w-full max-w-md card p-6 sm:p-8 flex flex-col items-center text-center gap-3">
          <h1 className="font-display font-bold text-xl text-text-primary">
            Lien invalide
          </h1>
          <p className="text-sm text-text-muted">
            Ce lien de réinitialisation est incomplet ou expiré.
          </p>
          <Link
            href="/admin/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-bg">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <span
            aria-hidden="true"
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas-deep text-accent ring-1 ring-accent/30"
          >
            {done ? <CheckCircle2 className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}
          </span>
          <h1 className="font-display font-bold text-2xl text-text-primary">
            {done ? 'Mot de passe mis à jour' : 'Nouveau mot de passe'}
          </h1>
          <p className="text-sm text-text-muted max-w-xs">
            {done
              ? 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.'
              : 'Choisissez un nouveau mot de passe pour votre compte.'}
          </p>
        </header>

        {!done ? (
          <form
            onSubmit={handleSubmit}
            className="w-full card p-5 sm:p-6 flex flex-col gap-5 animate-fade-up"
            noValidate
          >
            <Input
              label="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="8 caractères minimum"
              leadingIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
            />
            <Input
              label="Confirmer le mot de passe"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ressaisissez le mot de passe"
              leadingIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
            />
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" size="lg" loading={saving} fullWidth>
              Mettre à jour
            </Button>
          </form>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => router.replace('/admin/login')}
          >
            Aller à la connexion
          </Button>
        )}

        {!done ? (
          <Link
            href="/admin/login"
            className="text-sm text-text-muted hover:text-text-primary inline-flex items-center gap-1 self-center"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à la connexion
          </Link>
        ) : null}
      </div>
    </div>
  );
}
