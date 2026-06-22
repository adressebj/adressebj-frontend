'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Globe,
  LogOut,
  Mail,
  Phone,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { OtpInput } from '@/components/forms/OtpInput';
import { ApiError, api } from '@/lib/api';
import { isValidBeninPhone } from '@/lib/utils';
import type { User } from '@/types/api';

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const { logout } = useAuth();
  const push = usePushNotifications();

  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailDraft, setEmailDraft] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [explainOpen, setExplainOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [phoneConfirm, setPhoneConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  // ─── Flow de changement de numéro (CDC §8 /dashboard/profile) ────────
  // Deux étapes : (1) saisir le nouveau numéro + envoyer OTP, (2) saisir
  // l'OTP reçu pour confirmer. Sur succès → déconnexion + redirect /auth.
  const [phoneChangeOpen, setPhoneChangeOpen] = useState(false);
  const [phoneChangeStep, setPhoneChangeStep] = useState<1 | 2>(1);
  const [newPhone, setNewPhone] = useState('');
  const [newPhoneError, setNewPhoneError] = useState<string | null>(null);
  const [phoneChangeBusy, setPhoneChangeBusy] = useState(false);
  const [phoneChangeOtpKey, setPhoneChangeOtpKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.me();
        if (!cancelled) {
          setMe(data);
          setEmailDraft(data.email ?? '');
        }
      } catch {
        if (!cancelled) {
          toast.show({
            message: 'Impossible de charger votre profil.',
            variant: 'error',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const handleSaveEmail = useCallback(async () => {
    const trimmed = emailDraft.trim();
    if (trimmed && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      toast.show({ message: 'Adresse email invalide.', variant: 'error' });
      return;
    }
    setSavingEmail(true);
    try {
      const updated = await api.updateMe({ email: trimmed || null });
      setMe(updated);
      toast.show({ message: 'Profil mis à jour.', variant: 'success' });
    } catch {
      toast.show({
        message: "Impossible d'enregistrer l'email. Réessayez.",
        variant: 'error',
      });
    } finally {
      setSavingEmail(false);
    }
  }, [emailDraft, toast]);

  const handleSubscribeConfirm = useCallback(async () => {
    setExplainOpen(false);
    setSubscribing(true);
    try {
      const ok = await push.subscribe();
      toast.show({
        message: ok
          ? 'Notifications activées.'
          : "Permission refusée. Vous pouvez la rétablir depuis les paramètres du navigateur.",
        variant: ok ? 'success' : 'error',
      });
    } finally {
      setSubscribing(false);
    }
  }, [push, toast]);

  const handleUnsubscribe = useCallback(async () => {
    setSubscribing(true);
    try {
      const ok = await push.unsubscribe();
      toast.show({
        message: ok ? 'Notifications désactivées.' : 'Échec de la désactivation.',
        variant: ok ? 'success' : 'error',
      });
    } finally {
      setSubscribing(false);
    }
  }, [push, toast]);

  const canDelete =
    !!me && phoneConfirm.trim() === me.phone && !deleting;

  const handlePhoneChangeRequest = useCallback(async () => {
    const trimmed = newPhone.trim();
    if (!isValidBeninPhone(trimmed)) {
      setNewPhoneError('Numéro invalide. Exemple : +22960000000');
      return;
    }
    if (me && trimmed === me.phone) {
      setNewPhoneError('C’est déjà votre numéro actuel.');
      return;
    }
    setNewPhoneError(null);
    setPhoneChangeBusy(true);
    try {
      await api.requestPhoneChange(trimmed);
      setPhoneChangeStep(2);
      setPhoneChangeOtpKey((n) => n + 1);
    } catch {
      toast.show({
        message: 'Impossible d’envoyer le code. Réessayez.',
        variant: 'error',
      });
    } finally {
      setPhoneChangeBusy(false);
    }
  }, [newPhone, me, toast]);

  const handlePhoneChangeConfirm = useCallback(
    async (code: string) => {
      setPhoneChangeBusy(true);
      try {
        await api.confirmPhoneChange(newPhone.trim(), code);
        toast.show({
          message:
            'Numéro mis à jour. Reconnectez-vous avec votre nouveau numéro.',
          variant: 'success',
        });
        logout();
        router.push('/auth');
      } catch (err) {
        if (
          err instanceof ApiError &&
          err.code === 'INVALID_OR_EXPIRED_OTP'
        ) {
          toast.show({
            message: 'Code incorrect ou expiré.',
            variant: 'error',
          });
          setPhoneChangeOtpKey((n) => n + 1);
        } else {
          toast.show({ message: 'Confirmation impossible.', variant: 'error' });
        }
      } finally {
        setPhoneChangeBusy(false);
      }
    },
    [newPhone, logout, router, toast],
  );

  const handleDeleteAccount = useCallback(async () => {
    if (!canDelete || !me) return;
    setDeleting(true);
    try {
      await api.deleteMe();
      logout();
      toast.show({
        message:
          'Votre compte est supprimé et vos données personnelles ont été anonymisées immédiatement.',
        variant: 'success',
      });
      router.push('/');
    } catch (err) {
      const message =
        err instanceof ApiError && err.code === 'PHONE_MISMATCH'
          ? 'Le numéro saisi ne correspond pas à votre compte.'
          : 'Impossible de supprimer le compte pour le moment.';
      toast.show({ message, variant: 'error' });
    } finally {
      setDeleting(false);
    }
  }, [canDelete, logout, me, router, toast]);

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 flex flex-col gap-5">
        <Skeleton width={180} height={28} />
        <Skeleton width="100%" height={80} count={3} />
      </section>
    );
  }

  if (!me) return null;

  return (
    <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 flex flex-col gap-4">
      <header className="flex flex-col gap-1 animate-fade-up">
        <h1 className="font-display font-bold text-h2 text-text-primary">
          Mon profil
        </h1>
        <p className="text-sm text-text-muted">
          Votre numéro, vos préférences et votre compte.
        </p>
      </header>

      {/* Identity card */}
      <section className="card motif-paper p-6 flex flex-col items-center text-center animate-fade-up">
        <div className="relative mb-4">
          {/* Halo doux derrière l'avatar — donne un peu de présence sans
             se prendre pour Material Design. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-soft-pulse"
          />
          <span
            aria-hidden="true"
            className="relative w-20 h-20 rounded-full bg-primary-surface flex items-center justify-center font-display font-bold text-[32px] text-primary ring-2 ring-primary/20"
          >
            {me.phone.slice(-2)}
          </span>
        </div>
        <p className="inline-flex items-center gap-2 text-base text-text-primary">
          <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-medium tracking-wide">{me.phone}</span>
        </p>
        <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-success-light text-success rounded-full text-xs font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Compte vérifié
        </span>
        <p className="text-xs text-text-muted mt-4 mb-3">
          Votre numéro vous sert à vous connecter. Si vous le changez, il faudra
          vous reconnecter avec le nouveau.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPhoneChangeOpen(true)}
        >
          Changer mon numéro
        </Button>
      </section>

      {/* Preferences card */}
      <section aria-labelledby="prefs-title" className="card p-4 animate-fade-up stagger-1">
        <h2
          id="prefs-title"
          className="font-display font-semibold text-base text-text-primary mb-4"
        >
          Préférences
        </h2>
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <Bell
                className="h-5 w-5 text-text-muted mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-base text-text-primary">Notifications push</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {push.isSupported
                    ? 'Pour être prévenu de ce qui se passe sur vos adresses'
                    : 'Votre navigateur ne les gère pas'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={push.isSubscribed}
              aria-label="Notifications push"
              disabled={!push.isSupported || !push.isReady || subscribing}
              onClick={() =>
                push.isSubscribed ? void handleUnsubscribe() : setExplainOpen(true)
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${
                push.isSubscribed ? 'bg-primary' : 'bg-border-strong'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  push.isSubscribed ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="flex gap-4 items-center">
              <Globe className="h-5 w-5 text-text-muted" aria-hidden="true" />
              <p className="text-base text-text-primary">Langue</p>
            </div>
            <div className="flex items-center gap-2 text-text-muted">
              <p className="text-base">Français</p>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* Email card */}
      <section aria-labelledby="email-title" className="card p-4 animate-fade-up stagger-2">
        <h2
          id="email-title"
          className="font-display font-semibold text-base text-text-primary mb-4"
        >
          Email (optionnel)
        </h2>
        <div className="flex flex-col gap-3">
          <Input
            label="Adresse email"
            type="email"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            leadingIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
            placeholder="vous@exemple.com"
            hint="Sert seulement à vous contacter si besoin. Jamais pour vous connecter."
          />
          <Button
            variant="primary"
            size="md"
            onClick={() => void handleSaveEmail()}
            loading={savingEmail}
            className="self-start"
          >
            Enregistrer
          </Button>
        </div>
      </section>

      {/* Security card */}
      <section aria-labelledby="security-title" className="card p-4 animate-fade-up stagger-3">
        <h2
          id="security-title"
          className="font-display font-semibold text-base text-text-primary mb-4"
        >
          Sécurité
        </h2>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="w-full flex items-center justify-between py-2 active:opacity-70 transition-opacity cursor-pointer"
        >
          <span className="flex gap-4 items-center">
            <LogOut className="h-5 w-5 text-danger" aria-hidden="true" />
            <span className="text-base text-danger">Se déconnecter</span>
          </span>
          <ChevronRight className="h-5 w-5 text-text-muted" aria-hidden="true" />
        </button>
      </section>

      {/* Danger zone card */}
      <section
        aria-labelledby="danger-title"
        className="card p-4 !border-danger/40 animate-fade-up stagger-4"
      >
        <h2 id="danger-title" className="text-base font-medium text-danger mb-3">
          Suppression du compte
        </h2>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="flex items-center gap-2 text-danger text-sm font-medium py-2 hover:opacity-80 active:scale-95 transition-all cursor-pointer"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Supprimer mon compte
        </button>
        <p className="text-xs text-danger mt-1">
          C’est définitif : toutes vos adresses seront désactivées.
        </p>
      </section>

      {/* Changement de numéro — flow en 2 étapes (saisie + OTP). À la
         confirmation on déconnecte volontairement l'utilisateur pour
         le forcer à se reconnecter avec le nouvel identifiant. */}
      <Modal
        isOpen={phoneChangeOpen}
        onClose={() => {
          if (!phoneChangeBusy) {
            setPhoneChangeOpen(false);
            setPhoneChangeStep(1);
            setNewPhone('');
            setNewPhoneError(null);
          }
        }}
        title={
          phoneChangeStep === 1 ? 'Changer mon numéro' : 'Confirmer le changement'
        }
        footer={
          phoneChangeStep === 1 ? (
            <>
              <Button
                variant="ghost"
                size="md"
                onClick={() => setPhoneChangeOpen(false)}
                disabled={phoneChangeBusy}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={phoneChangeBusy}
                onClick={() => void handlePhoneChangeRequest()}
              >
                Recevoir le code
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="md"
              onClick={() => setPhoneChangeStep(1)}
              disabled={phoneChangeBusy}
            >
              Modifier le numéro
            </Button>
          )
        }
      >
        {phoneChangeStep === 1 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-muted">
              Entrez votre nouveau numéro. On vous y enverra un code. Une fois
              confirmé, vous vous reconnecterez avec ce nouveau numéro.
            </p>
            <Input
              label="Nouveau numéro de téléphone"
              placeholder="+22960000000"
              value={newPhone}
              onChange={(e) => {
                setNewPhone(e.target.value);
                if (newPhoneError) setNewPhoneError(null);
              }}
              error={newPhoneError ?? undefined}
              inputMode="tel"
              autoComplete="off"
              leadingIcon={<Phone className="h-4 w-4" aria-hidden="true" />}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              Saisissez le code reçu par SMS au{' '}
              <span className="font-medium text-text-primary">{newPhone}</span>.
            </p>
            <OtpInput
              key={phoneChangeOtpKey}
              length={6}
              onComplete={(code) => void handlePhoneChangeConfirm(code)}
              disabled={phoneChangeBusy}
            />
          </div>
        )}
      </Modal>

      <Modal
        isOpen={explainOpen}
        onClose={() => setExplainOpen(false)}
        title="Activer les notifications push"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setExplainOpen(false)}>
              Plus tard
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => void handleSubscribeConfirm()}
            >
              Autoriser dans mon navigateur
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm text-text-primary">
          <p>
            On vous préviendra notamment&nbsp;:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-text-muted">
            <li>quand une de vos adresses a besoin d’être corrigée&nbsp;;</li>
            <li>quand une de vos adresses a été retirée.</li>
          </ul>
          <p className="text-text-muted">
            Votre navigateur va vous demander l’autorisation juste après. Vous
            pourrez la retirer quand vous voulez.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={deleteOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setPhoneConfirm('');
          }
        }}
        title="Supprimer mon compte"
        footer={
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                setDeleteOpen(false);
                setPhoneConfirm('');
              }}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={deleting}
              disabled={!canDelete}
              onClick={() => void handleDeleteAccount()}
            >
              Supprimer définitivement
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm text-text-primary">
          <p>
            C’est <strong>définitif</strong>. Vos adresses seront désactivées et
            vos informations supprimées sous 30&nbsp;jours.
          </p>
          <Input
            label={`Saisissez votre numéro de téléphone (${me.phone}) pour confirmer`}
            value={phoneConfirm}
            onChange={(e) => setPhoneConfirm(e.target.value)}
            autoComplete="off"
            inputMode="tel"
          />
        </div>
      </Modal>
    </section>
  );
}

