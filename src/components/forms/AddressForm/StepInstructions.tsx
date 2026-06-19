'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { buildAssembledText } from '@/lib/utils';
import type { NearbyLandmark } from '@/types/api';

export interface StepInstructionsValue {
  steps: string[];
  assembledText: string;
}

export interface StepInstructionsProps {
  value: StepInstructionsValue | null;
  onComplete: (value: StepInstructionsValue) => void;
  /** Position GPS captée à l'étape précédente — sert à proposer le repère de
      départ le plus proche (Overpass). Absente en édition : la détection est
      alors sautée (on rend directement l'éditeur pré-rempli). */
  gps?: { lat: number; lng: number } | null;
}

// Le point de départ est `steps[0]` ; les questions ci-dessous décrivent la
// suite du trajet depuis ce repère (CDC v5 §Besoin 1).
const AFTER_PROMPTS = [
  {
    label: 'Combien de voies après ce repère ?',
    hint: 'ex : 2 voies après, tourner à droite',
  },
  {
    label: 'Quel élément visuel distinctif identifie votre portail ?',
    hint: 'ex : portail bleu, grand manguier devant la cour',
  },
];
// Saisie libre du point de départ (mode « free »).
const START_PROMPT = {
  label: 'De quel repère connu partez-vous ?',
  hint: 'ex : la pharmacie Les Potiers, le marché Dantokpa…',
};

type Mode = 'querying' | 'confirm' | 'guided' | 'free';

export function StepInstructions({
  value,
  onComplete,
  gps,
}: StepInstructionsProps) {
  const hasInitialValue = !!(value?.steps && value.steps.length > 0);
  const [mode, setMode] = useState<Mode>(() =>
    hasInitialValue ? 'free' : gps ? 'querying' : 'free',
  );
  const [landmark, setLandmark] = useState<NearbyLandmark | null>(null);
  const [noLandmark, setNoLandmark] = useState(false);
  const [steps, setSteps] = useState<string[]>(() =>
    hasInitialValue ? [...value!.steps] : ['', '', ''],
  );

  // Détection du repère de départ le plus proche — uniquement en création
  // (mode « querying »). Tolérant : `null` → rédaction libre (cas normal). Le
  // setState vit dans le `.then` (asynchrone), pas dans le corps de l'effet.
  useEffect(() => {
    if (mode !== 'querying' || !gps) return;
    let cancelled = false;
    void api.nearbyLandmark(gps.lat, gps.lng).then((found) => {
      if (cancelled) return;
      if (found) {
        setLandmark(found);
        setMode('confirm');
      } else {
        setNoLandmark(true);
        setMode('free');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode, gps]);

  const assembledText = useMemo(() => buildAssembledText(steps), [steps]);
  const validCount = steps.filter((s) => s.trim()).length;
  const canSubmit = validCount >= 2;

  const handleChange = (index: number, next: string) => {
    setSteps((current) => {
      const out = [...current];
      out[index] = next;
      return out;
    });
  };
  const handleAddStep = () => setSteps((current) => [...current, '']);
  const handleRemoveStep = (index: number) =>
    setSteps((current) => current.filter((_, i) => i !== index));

  // Scénario 1 : on part du repère détecté — il devient l'étape 0 verrouillée.
  const acceptLandmark = () => {
    if (!landmark) return;
    setSteps([`Partir de ${landmark.name}`, '', '']);
    setMode('guided');
  };
  // Scénario 2 : le repère auto est invalidé/supprimé — saisie libre.
  const rejectLandmark = () => {
    setSteps(['', '', '']);
    setMode('free');
  };
  // Depuis « guided » : changer d'avis, retirer le repère auto et saisir
  // soi-même le point de départ.
  const unlockStart = () => {
    setSteps((current) => ['', ...current.slice(1)]);
    setMode('free');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned = steps.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length < 2) return;
    onComplete({ steps: cleaned, assembledText: buildAssembledText(cleaned) });
  };

  // ── Recherche du repère ────────────────────────────────────────────────────
  if (mode === 'querying') {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-text-muted">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm">Recherche d’un repère connu autour de vous…</p>
      </div>
    );
  }

  // ── Confirmation du repère détecté (cas 1) ─────────────────────────────────
  if (mode === 'confirm' && landmark) {
    return (
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-1 text-center">
          <h2 className="font-display font-bold text-2xl text-text-primary">
            Un repère pour démarrer ?
          </h2>
          <p className="text-sm text-text-muted">
            On a trouvé un lieu connu tout près. S’il est bien visible depuis la
            rue, vos visiteurs partiront de là.
          </p>
        </header>

        <div className="card p-5 flex items-center gap-4">
          {/* Médaillon losange — langage de marque (cf. CategoryMedallion). */}
          <span
            className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center"
            aria-hidden="true"
          >
            <span className="absolute inset-0 rotate-45 rounded-[12px] bg-primary-surface border border-accent/40 shadow-sm" />
            <MapPin className="relative h-5 w-5 text-primary" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
              Repère le plus proche
            </p>
            <p className="font-display font-semibold text-lg leading-tight text-text-primary truncate">
              {landmark.name}
            </p>
            <p className="text-xs text-text-muted">
              à ~{landmark.distanceM} m
              {landmark.category ? ` · ${landmark.category}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={acceptLandmark}
            leadingIcon={<Check className="h-5 w-5" aria-hidden="true" />}
          >
            Oui, je pars de là
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            onClick={rejectLandmark}
            leadingIcon={<X className="h-4 w-4" aria-hidden="true" />}
          >
            Non, ce n’est pas le bon
          </Button>
        </div>
      </div>
    );
  }

  // ── Éditeur d'instructions (guided | free) ─────────────────────────────────
  const guided = mode === 'guided';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <header className="flex flex-col gap-2 text-center">
        <h2 className="font-display font-bold text-2xl text-text-primary">
          Comment arriver chez vous&nbsp;?
        </h2>
        <p className="text-base text-text-muted">
          {guided
            ? 'Décrivez le trajet à partir de ce repère, jusqu’à votre portail.'
            : 'Décrivez le trajet depuis un repère connu, jusqu’à votre portail.'}
        </p>
      </header>

      {noLandmark && !guided ? (
        <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-surface-muted border border-border px-4 py-3">
          <MapPin
            className="h-4 w-4 text-text-muted shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-text-muted leading-relaxed">
            Aucun repère connu détecté autour de vous. Choisissez vous-même le
            point de départ le plus parlant pour vos visiteurs.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {/* ── Point de départ ── */}
        {guided ? (
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-primary/30 bg-primary-surface px-4 py-3">
            <MapPin
              className="h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                Point de départ
              </p>
              <p className="font-medium text-text-primary truncate">
                {landmark?.name ?? steps[0]}
              </p>
            </div>
            <button
              type="button"
              onClick={unlockStart}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Changer
            </button>
          </div>
        ) : (
          <Input
            label={`1. ${START_PROMPT.label}`}
            hint={START_PROMPT.hint}
            value={steps[0] ?? ''}
            onChange={(e) => handleChange(0, e.target.value)}
            placeholder={START_PROMPT.hint}
          />
        )}

        {/* ── Étapes suivantes (depuis le point de départ) ── */}
        {steps.slice(1).map((step, i) => {
          const idx = i + 1;
          const prompt = AFTER_PROMPTS[i];
          const label = prompt
            ? `${idx + 1}. ${prompt.label}`
            : `${idx + 1}. Indication supplémentaire`;
          const hint = prompt?.hint;
          const removable = idx >= 1 + AFTER_PROMPTS.length;
          return (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label={label}
                  hint={hint}
                  value={step}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  placeholder={prompt?.hint ?? 'Description complémentaire'}
                />
              </div>
              {removable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveStep(idx)}
                  aria-label={`Supprimer l’étape ${idx + 1}`}
                  className="h-11"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleAddStep}
        leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
        className="self-start"
      >
        Ajouter une étape
      </Button>

      <div className="bg-primary-surface border border-primary/20 rounded-[var(--radius-md)] p-4 flex flex-col gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
          Aperçu des instructions
        </p>
        <p className="text-sm text-text-primary leading-relaxed min-h-[1.5rem] border-l-2 border-primary/40 pl-3">
          {assembledText ||
            'Vos réponses apparaîtront ici, regroupées en une phrase lisible.'}
        </p>
        {assembledText ? (
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="flex items-center gap-1.5 text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clair et précis
            </span>
            <span>{assembledText.length} caractères</span>
          </div>
        ) : null}
      </div>

      <Button type="submit" variant="primary" size="lg" disabled={!canSubmit} fullWidth>
        {canSubmit ? 'Continuer' : `Minimum 2 étapes (${validCount}/2)`}
      </Button>
    </form>
  );
}

export default StepInstructions;
