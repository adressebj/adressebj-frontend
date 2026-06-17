'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Flag,
  MapPin,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import type { ModerationStats } from '@/types/api';

type CardTone = 'primary' | 'warning' | 'info' | 'accent';

interface HubCard {
  key: keyof ModerationStats;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  href: string;
  cta: string;
  primary: boolean;
  tone: CardTone;
}

const CARDS: HubCard[] = [
  {
    key: 'pendingAddresses',
    title: 'Adresses en attente',
    subtitle: 'Soumissions à valider',
    icon: MapPin,
    href: '/admin/moderation/queue',
    cta: 'Traiter',
    primary: true,
    tone: 'primary',
  },
  {
    key: 'pendingReports',
    title: 'Signalements',
    subtitle: 'Signalements à examiner',
    icon: Flag,
    href: '/admin/reports',
    cta: 'Examiner',
    primary: false,
    tone: 'warning',
  },
  {
    key: 'pendingContributions',
    title: 'Contributions terrain',
    subtitle: 'Précisions visiteurs à vérifier',
    icon: MessageSquare,
    href: '/admin/contributions',
    cta: 'Vérifier',
    primary: false,
    tone: 'info',
  },
];

const TONE_BG: Record<CardTone, string> = {
  primary: 'bg-primary-surface text-primary',
  warning: 'bg-warning-light text-warning',
  info: 'bg-info-light text-info',
  accent: 'bg-accent-light text-accent-text',
};

export default function AdminModerationHubPage() {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .adminModerationStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-8">
      <header>
        <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
          Modération
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Gérez les flux d&apos;informations et validez les contributions
          citoyennes.
        </p>
      </header>

      {error ? (
        <div className="card rounded-xl p-5">
          <p className="text-text-primary">
            Impossible de récupérer les compteurs pour l&apos;instant.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CARDS.map((card) => (
            <li key={card.key}>
              <HubCardItem
                card={card}
                count={stats ? stats[card.key] : null}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HubCardItem({
  card,
  count,
}: {
  card: HubCard;
  count: number | null;
}) {
  const Icon = card.icon;
  return (
    <Link
      href={card.href}
      className="card card-interactive rounded-xl p-6 flex flex-col justify-between min-h-[200px] group focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40"
    >
      <div className="flex justify-between items-start">
        <span
          aria-hidden="true"
          className={`flex h-12 w-12 items-center justify-center rounded-full ${TONE_BG[card.tone]} transition-colors`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <CountBadge count={count} />
      </div>
      <div className="mt-5 flex flex-col gap-1">
        <h3 className="font-display font-semibold text-h3 text-text-primary">
          {card.title}
        </h3>
        <p className="text-sm text-text-muted">{card.subtitle}</p>
        <span
          className={`mt-4 inline-flex items-center gap-1 self-start text-sm font-semibold ${
            card.primary ? 'text-primary' : 'text-text-primary'
          }`}
        >
          {card.cta}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}

function CountBadge({ count }: { count: number | null }): ReactNode {
  if (count === null) return <Skeleton width={40} height={28} />;
  if (count === 0) {
    return (
      <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-surface-muted text-text-muted text-sm font-semibold">
        0
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-danger text-text-inverse text-sm font-bold">
      {count}
    </span>
  );
}
