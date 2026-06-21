'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Pause, Play, Plus, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { api } from '@/lib/api';
import { classNames, isValidBeninPhone } from '@/lib/utils';
import type { AdminModerator, ModeratorStatus } from '@/types/api';

const STATUS_LABEL: Record<ModeratorStatus, string> = {
  active: 'Actif',
  suspended: 'Suspendu',
};

export default function AdminModeratorsPage() {
  useRequireAdmin();
  const toast = useToast();
  const [moderators, setModerators] = useState<AdminModerator[] | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .adminModerators()
      .then(setModerators)
      .catch(() => {
        toast.show({
          message: 'Impossible de charger les modérateurs.',
          variant: 'error',
        });
        setModerators([]);
      });
  }, [toast]);

  useEffect(load, [load]);

  const handleInvite = useCallback(async () => {
    if (!isValidBeninPhone(phone.trim())) {
      setPhoneError('Numéro invalide. Exemple : +22960000000');
      return;
    }
    setPhoneError(null);
    setCreating(true);
    try {
      const created = await api.adminCreateModerator({
        phone: phone.trim(),
        email: email.trim() || null,
      });
      setModerators((current) => (current ? [created, ...current] : [created]));
      toast.show({
        message: `Modérateur ${created.phone} invité.`,
        variant: 'success',
      });
      setInviteOpen(false);
      setPhone('');
      setEmail('');
    } catch {
      toast.show({ message: 'Invitation impossible.', variant: 'error' });
    } finally {
      setCreating(false);
    }
  }, [phone, email, toast]);

  const handleToggle = useCallback(
    async (mod: AdminModerator) => {
      setToggling(mod.id);
      const next: ModeratorStatus =
        mod.status === 'active' ? 'suspended' : 'active';
      try {
        await api.adminUpdateModerator(mod.id, { status: next });
        setModerators((current) =>
          current
            ? current.map((m) => (m.id === mod.id ? { ...m, status: next } : m))
            : current,
        );
        toast.show({
          message:
            next === 'suspended'
              ? `Modérateur ${mod.phone} suspendu.`
              : `Modérateur ${mod.phone} réactivé.`,
          variant: 'success',
        });
      } catch {
        toast.show({ message: 'Action impossible.', variant: 'error' });
      } finally {
        setToggling(null);
      }
    },
    [toast],
  );

  // Envoie un email de réinitialisation au modérateur. L'action est
  // confirmée par toast — pas de modale supplémentaire car non-destructif.
  const handleResetPassword = useCallback(
    async (mod: AdminModerator) => {
      setToggling(mod.id);
      try {
        await api.adminResetModeratorPassword(mod.id);
        toast.show({
          message: `Email de réinitialisation envoyé à ${mod.email ?? mod.phone}.`,
          variant: 'success',
        });
      } catch {
        toast.show({
          message: 'Envoi impossible pour le moment.',
          variant: 'error',
        });
      } finally {
        setToggling(null);
      }
    },
    [toast],
  );

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
            Modérateurs
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Gérez les comptes habilités à valider les soumissions et traiter
            les signalements.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setInviteOpen(true)}
          leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
        >
          Inviter un modérateur
        </Button>
      </header>

      {moderators === null ? (
        <ul className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="card rounded-xl p-4">
              <Skeleton width="100%" height={40} />
            </li>
          ))}
        </ul>
      ) : moderators.length === 0 ? (
        <div className="card rounded-xl p-8 text-center flex flex-col items-center gap-3">
          <ShieldCheck
            className="h-10 w-10 text-text-muted"
            aria-hidden="true"
          />
          <p className="text-text-primary">
            Aucun modérateur pour l&apos;instant.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => setInviteOpen(true)}
            leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            Inviter le premier
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {moderators.map((m) => (
            <ModeratorCard
              key={m.id}
              moderator={m}
              busy={toggling === m.id}
              onToggle={() => void handleToggle(m)}
              onResetPassword={() => void handleResetPassword(m)}
            />
          ))}
        </ul>
      )}

      <Modal
        isOpen={inviteOpen}
        onClose={() => {
          if (!creating) {
            setInviteOpen(false);
            setPhoneError(null);
          }
        }}
        title="Inviter un modérateur"
        footer={
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setInviteOpen(false)}
              disabled={creating}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={creating}
              onClick={() => void handleInvite()}
            >
              Envoyer l&apos;invitation
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            Le compte est créé en mode actif. Le modérateur recevra un SMS de
            confirmation au prochain login.
          </p>
          <Input
            label="Numéro de téléphone"
            placeholder="+22960000000"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (phoneError) setPhoneError(null);
            }}
            error={phoneError ?? undefined}
            inputMode="tel"
            autoComplete="off"
          />
          <Input
            label="Email (optionnel)"
            type="email"
            placeholder="modo@adressebj.bj"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
          />
        </div>
      </Modal>
    </section>
  );
}

interface ModeratorCardProps {
  moderator: AdminModerator;
  busy: boolean;
  onToggle: () => void;
  onResetPassword: () => void;
}

function ModeratorCard({
  moderator,
  busy,
  onToggle,
  onResetPassword,
}: ModeratorCardProps) {
  const suspended = moderator.status === 'suspended';
  return (
    <li
      className={classNames(
        'card rounded-xl p-5 flex flex-col gap-4',
        suspended && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="w-12 h-12 rounded-full bg-primary-surface text-primary text-base font-bold flex items-center justify-center"
          >
            {moderator.phone.replace(/\D+/g, '').slice(-2)}
          </span>
          <div>
            <p className="font-medium text-text-primary">{moderator.phone}</p>
            {moderator.email ? (
              <p className="text-xs text-text-muted">{moderator.email}</p>
            ) : null}
          </div>
        </div>
        <Badge variant={suspended ? 'danger' : 'success'} size="sm">
          {STATUS_LABEL[moderator.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
        <div className="flex flex-col">
          <span className="text-xs text-text-muted">Décisions</span>
          <span className="font-display font-bold text-h3 text-text-primary">
            {moderator.decisionsCount}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-text-muted">Taux d&apos;approbation</span>
          <span className="font-display font-bold text-h3 text-text-primary">
            {Math.round(moderator.approvalRate * 100)} %
          </span>
        </div>
      </div>

      <div className="border-t border-border pt-4 flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-text-muted">
          {moderator.lastActiveAt
            ? `Vu ${formatRelative(moderator.lastActiveAt)}`
            : 'Jamais connecté'}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetPassword}
            disabled={busy}
            leadingIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
          >
            Réinit. mdp
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggle}
            disabled={busy}
            leadingIcon={
              suspended ? (
                <Play className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Pause className="h-4 w-4" aria-hidden="true" />
              )
            }
            className={suspended ? '' : '!text-danger hover:!bg-danger-light/40'}
          >
            {suspended ? 'Réactiver' : 'Suspendre'}
          </Button>
        </div>
      </div>
    </li>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'à l’instant';
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return `le ${new Date(iso).toLocaleDateString('fr-FR')}`;
}
