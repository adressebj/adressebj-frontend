'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function BackofficeForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = email.trim();
      if (!EMAIL_RE.test(trimmed)) {
        setError('Adresse email invalide.');
        return;
      }
      setError(null);
      setSending(true);
      try {
        await api.adminForgotPassword(trimmed);
        setSent(true);
      } catch {
        toast.show({
          message: 'Impossible d’envoyer le lien. Réessayez.',
          variant: 'error',
        });
      } finally {
        setSending(false);
      }
    },
    [email, toast],
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-bg">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <span
            aria-hidden="true"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-surface text-primary ring-1 ring-primary/15"
          >
            {sent ? (
              <CheckCircle2 className="h-7 w-7" />
            ) : (
              <Mail className="h-7 w-7" />
            )}
          </span>
          <h1 className="font-display font-bold text-2xl text-text-primary">
            {sent ? 'Lien envoyé' : 'Mot de passe oublié'}
          </h1>
          <p className="text-sm text-text-muted max-w-xs">
            {sent
              ? 'Si un compte existe pour cette adresse, vous recevrez un lien de réinitialisation sous quelques minutes.'
              : 'Saisissez votre email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.'}
          </p>
        </header>

        {!sent ? (
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
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" size="lg" loading={sending} fullWidth>
              Envoyer le lien
            </Button>
          </form>
        ) : (
          <div className="w-full bg-surface border border-border rounded-xl shadow-md p-5 sm:p-6 flex flex-col gap-3 animate-fade-up">
            <p className="text-sm text-text-muted">
              Pensez à vérifier vos courriers indésirables si vous ne le trouvez pas.
            </p>
          </div>
        )}

        <Link
          href="/login"
          className="text-sm text-text-muted hover:text-text-primary inline-flex items-center gap-1 self-center"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
