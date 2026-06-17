'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  Bell,
  Database,
  Flag,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import type { AdminStats } from '@/mocks/data';

type CardTone = 'primary' | 'accent' | 'danger' | 'info';

interface CardSpec {
  key: keyof AdminStats;
  label: string;
  icon: LucideIcon;
  tone: CardTone;
}

const CARDS: CardSpec[] = [
  { key: 'activeAddresses', label: 'Adresses actives', icon: Database, tone: 'primary' },
  { key: 'visitsToday', label: 'Visites aujourd’hui', icon: Activity, tone: 'accent' },
  { key: 'pendingReports', label: 'Signalements en attente', icon: Flag, tone: 'danger' },
  { key: 'activeQuartiers', label: 'Quartiers actifs', icon: MapPin, tone: 'info' },
];

export default function AdminHomePage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .adminStats()
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
      <header className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
            Tableau de bord
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Indicateurs clés du référentiel AdresseBJ en temps quasi réel.
          </p>
        </div>
        <span className="relative p-2 text-text-muted" aria-hidden="true">
          <Bell className="h-6 w-6" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger rounded-full border-2 border-bg" />
        </span>
      </header>

      {error ? (
        <div className="bg-surface border border-border shadow-sm rounded-lg p-5">
          <p className="text-text-primary">
            Impossible de récupérer les statistiques pour l’instant.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <li key={card.key}>
                <StatCard
                  label={card.label}
                  tone={card.tone}
                  value={
                    stats ? (
                      stats[card.key].toLocaleString('fr-FR')
                    ) : (
                      <Skeleton width={80} height={32} />
                    )
                  }
                  icon={<Icon className="h-5 w-5" aria-hidden="true" />}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const TONES: Record<CardTone, string> = {
  primary: 'bg-primary-surface text-primary',
  accent: 'bg-accent-light text-accent-text',
  danger: 'bg-danger-light text-danger',
  info: 'bg-info-light text-info',
};

function StatCard({
  label,
  value,
  icon,
  tone = 'primary',
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: CardTone;
}) {
  return (
    <article className="card card-interactive rounded-xl p-5 flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-muted">{label}</span>
        <span
          className={`inline-flex items-center justify-center p-2 rounded-lg ${TONES[tone]}`}
        >
          {icon}
        </span>
      </div>
      <div className="font-display font-bold text-[32px] leading-none text-text-primary">
        {value}
      </div>
    </article>
  );
}
