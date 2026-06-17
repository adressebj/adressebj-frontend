'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Check, MapPin, User, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { classNames } from '@/lib/utils';
import type { ModerationQueueItem } from '@/types/api';

type SortOrder = 'oldest' | 'newest';

export default function AdminModerationQueuePage() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<ModerationQueueItem[] | null>(null);
  const [quartierFilter, setQuartierFilter] = useState<string>('all');
  const [sort, setSort] = useState<SortOrder>('oldest');
  const [acting, setActing] = useState<string | null>(null);

  const load = () => {
    setItems(null);
    api
      .adminModerationQueue()
      .then(setItems)
      .catch(() => {
        toast.show({
          message: 'Impossible de charger la file de modération.',
          variant: 'error',
        });
        setItems([]);
      });
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const quartiers = useMemo(
    () => Array.from(new Set((items ?? []).map((it) => it.quartierName))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    if (!items) return [];
    const list =
      quartierFilter === 'all'
        ? items.slice()
        : items.filter((i) => i.quartierName === quartierFilter);
    list.sort((a, b) => {
      const aTs = new Date(a.submittedAt).getTime();
      const bTs = new Date(b.submittedAt).getTime();
      return sort === 'oldest' ? aTs - bTs : bTs - aTs;
    });
    return list;
  }, [items, quartierFilter, sort]);

  const decide = async (
    code: string,
    decision: 'approved' | 'rejected',
  ) => {
    setActing(code);
    try {
      await api.adminDecideQueueItem(code, { status: decision });
      setItems((current) =>
        current ? current.filter((i) => i.code !== code) : current,
      );
      toast.show({
        message:
          decision === 'approved'
            ? `Adresse ${code} validée.`
            : `Adresse ${code} rejetée.`,
        variant: 'success',
      });
    } catch {
      toast.show({ message: 'Action impossible pour l’instant.', variant: 'error' });
    } finally {
      setActing(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <nav
            aria-label="Fil d'Ariane"
            className="flex items-center gap-2 text-xs text-text-muted mb-2"
          >
            <Link href="/admin/moderation" className="hover:text-primary">
              Modération
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-semibold text-primary">
              Adresses en attente
            </span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
              File de traitement
            </h1>
            {items ? (
              <Badge variant={filtered.length > 0 ? 'danger' : 'success'}>
                {filtered.length} adresse{filtered.length > 1 ? 's' : ''}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <label className="text-xs text-text-muted flex flex-col gap-1">
            Quartier
            <select
              value={quartierFilter}
              onChange={(e) => setQuartierFilter(e.target.value)}
              className="h-10 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">Tous</option>
              {quartiers.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-text-muted flex flex-col gap-1">
            Tri
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOrder)}
              className="h-10 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="oldest">Plus anciennes</option>
              <option value="newest">Plus récentes</option>
            </select>
          </label>
        </div>
      </header>

      {items === null ? (
        <ul className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="card rounded-xl p-4 flex gap-4">
              <Skeleton width={120} height={90} />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton width={180} height={20} />
                <Skeleton width={140} height={14} />
                <Skeleton width="100%" height={36} />
              </div>
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <div className="card rounded-xl p-8 text-center flex flex-col items-center gap-2">
          <Check className="h-10 w-10 text-success" aria-hidden="true" />
          <p className="text-text-primary font-medium">
            Aucune adresse en attente. Bon travail&nbsp;!
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {filtered.map((item) => (
            <QueueCard
              key={item.code}
              item={item}
              acting={acting === item.code}
              onOpen={() =>
                router.push(`/admin/moderation/queue/${item.code}`)
              }
              onApprove={() => void decide(item.code, 'approved')}
              onReject={() => void decide(item.code, 'rejected')}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface QueueCardProps {
  item: ModerationQueueItem;
  acting: boolean;
  onOpen: () => void;
  onApprove: () => void;
  onReject: () => void;
}

function QueueCard({
  item,
  acting,
  onOpen,
  onApprove,
  onReject,
}: QueueCardProps) {
  const submittedRel = formatRelative(item.submittedAt);
  return (
    <li
      className={classNames(
        'card card-interactive rounded-xl p-4 flex flex-col gap-4 cursor-pointer',
        acting && 'opacity-60 pointer-events-none',
      )}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Voir le détail de ${item.code}`}
    >
      <div className="flex gap-4">
        <div className="relative w-[120px] h-[90px] shrink-0 rounded-lg overflow-hidden bg-surface-muted">
          <Image
            src={item.photoUrl}
            alt={`Photo de l'adresse ${item.code}`}
            fill
            sizes="120px"
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-display font-bold text-h3 text-text-primary tracking-wide">
              {item.code}
            </span>
            {item.isFresh ? (
              <Badge variant="success" size="sm">
                Nouveau
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-text-muted">{item.quartierName}</p>
          <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
            <User className="h-3.5 w-3.5" aria-hidden="true" />
            Soumis par {item.ownerPhoneMasked} · {submittedRel}
          </p>
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 text-text-muted mb-2">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs">
            GPS&nbsp;: {item.gps.lat.toFixed(4)}° N, {item.gps.lng.toFixed(4)}° E
            · Précision ~{item.gpsAccuracyMeters} m
          </span>
        </div>
        <p className="text-sm text-text-primary bg-surface-muted p-3 rounded-md italic">
          “{item.assembledText}”
        </p>
      </div>
      <div
        className="border-t border-border pt-4 flex items-center justify-end gap-3"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={onReject}
          leadingIcon={<X className="h-4 w-4" aria-hidden="true" />}
          className="!text-danger hover:!bg-danger-light/40"
        >
          Rejeter
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onApprove}
          leadingIcon={<Check className="h-4 w-4" aria-hidden="true" />}
        >
          Valider
        </Button>
      </div>
    </li>
  );
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'à l’instant';
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}
