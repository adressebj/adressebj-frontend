'use client';

import { useCallback, useEffect, useState } from 'react';
import { Key, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { api } from '@/lib/api';
import { classNames } from '@/lib/utils';
import type { ApiKey } from '@/types/api';

function maskKey(key: string): string {
  if (!key.startsWith('bj_live_')) return key;
  const tail = key.slice(8, 12);
  return `bj_live_${tail}…`;
}

export default function AdminApiKeysPage() {
  useRequireAdmin();
  const toast = useToast();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [label, setLabel] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [createdValue, setCreatedValue] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .adminApiKeys()
      .then(setKeys)
      .catch(() => {
        toast.show({ message: 'Impossible de charger les clés API.', variant: 'error' });
        setKeys([]);
      });
  }, [toast]);

  useEffect(load, [load]);

  const handleCreate = useCallback(async () => {
    if (!label.trim()) {
      toast.show({ message: 'Précisez un libellé pour la clé.', variant: 'error' });
      return;
    }
    setCreating(true);
    try {
      const created = await api.adminCreateApiKey({
        label: label.trim(),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setKeys((current) => (current ? [created, ...current] : [created]));
      setCreatedValue(created.key);
      setLabel('');
      setExpiresAt('');
      toast.show({ message: 'Nouvelle clé créée.', variant: 'success' });
    } catch {
      toast.show({ message: 'Création impossible pour l’instant.', variant: 'error' });
    } finally {
      setCreating(false);
    }
  }, [expiresAt, label, toast]);

  const handleRevoke = useCallback(async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const result = await api.adminRevokeApiKey(revokeTarget.id);
      setKeys((current) =>
        current
          ? current.map((k) =>
              k.id === revokeTarget.id
                ? { ...k, status: 'REVOKED', revokedAt: result.revokedAt }
                : k,
            )
          : current,
      );
      toast.show({ message: 'Clé révoquée.', variant: 'success' });
      setRevokeTarget(null);
    } catch {
      toast.show({ message: 'Révocation impossible.', variant: 'error' });
    } finally {
      setRevoking(false);
    }
  }, [revokeTarget, toast]);

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-6 flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
            Clés API
          </h1>
          <p className="text-sm text-text-muted">
            Une clé révoquée renvoie immédiatement HTTP 401 `API_KEY_REVOKED`.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => {
            setCreatedValue(null);
            setCreateOpen(true);
          }}
        >
          Créer une clé
        </Button>
      </header>

      <div className="bg-surface rounded-lg border border-border shadow-sm overflow-x-auto">
        {keys === null ? (
          <div className="p-5 space-y-3">
            <Skeleton width="100%" height={20} count={3} />
          </div>
        ) : keys.length === 0 ? (
          <p className="p-6 text-text-muted text-sm">Aucune clé API enregistrée.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-[0.08em] text-text-muted">
              <tr>
                <th className="text-left px-4 py-3">Libellé</th>
                <th className="text-left px-4 py-3">Clé</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-left px-4 py-3">Créée</th>
                <th className="text-left px-4 py-3">Expire</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => {
                const revoked = key.status === 'REVOKED';
                return (
                  <tr
                    key={key.id}
                    className={classNames(
                      'border-t border-dashed border-border',
                      revoked && 'opacity-60',
                    )}
                  >
                    <td className="px-4 py-3 text-text-primary">{key.label}</td>
                    <td className="px-4 py-3 font-mono text-text-muted">{maskKey(key.key)}</td>
                    <td className="px-4 py-3">
                      {revoked ? (
                        <Badge variant="danger">Révoquée</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {new Date(key.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {key.expiresAt
                        ? new Date(key.expiresAt).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!revoked ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevokeTarget(key)}
                        >
                          Révoquer
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={createOpen}
        onClose={() => {
          if (!creating) {
            setCreateOpen(false);
            setCreatedValue(null);
          }
        }}
        title={createdValue ? 'Clé créée' : 'Créer une nouvelle clé API'}
        footer={
          createdValue ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setCreateOpen(false);
                setCreatedValue(null);
              }}
            >
              J’ai copié la clé
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="md" onClick={() => setCreateOpen(false)} disabled={creating}>
                Annuler
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => void handleCreate()}
                loading={creating}
              >
                Créer
              </Button>
            </>
          )
        }
      >
        {createdValue ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-primary">
              Copiez la clé maintenant — elle ne sera plus visible en clair après
              fermeture de cette fenêtre.
            </p>
            <code className="block bg-surface-muted rounded-md p-3 font-mono text-sm break-all">
              {createdValue}
            </code>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Input
              label="Libellé"
              placeholder="Ex : App livraison Gozem (prod)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-text-primary">
                Expiration (optionnelle)
              </span>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-11 rounded-md border border-border bg-surface px-3 text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <p className="text-xs text-text-muted inline-flex items-center gap-1.5">
              <Key className="h-3 w-3" aria-hidden="true" /> La clé sera affichée
              une seule fois après création.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={revokeTarget !== null}
        onClose={() => {
          if (!revoking) setRevokeTarget(null);
        }}
        title="Révoquer cette clé API"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setRevokeTarget(null)} disabled={revoking}>
              Annuler
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={revoking}
              onClick={() => void handleRevoke()}
            >
              Révoquer définitivement
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-primary leading-relaxed">
          La clé{' '}
          <code className="font-mono text-text-muted">
            {revokeTarget ? maskKey(revokeTarget.key) : ''}
          </code>{' '}
          renverra immédiatement HTTP 401 sur toutes ses requêtes futures. Cette
          action est <strong>irréversible</strong>.
        </p>
      </Modal>
    </section>
  );
}
