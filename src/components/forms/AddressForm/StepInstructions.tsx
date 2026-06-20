'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Check,
  CheckCircle2,
  Eye,
  GripVertical,
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
import { buildAssembledText, classNames } from '@/lib/utils';
import type { NearbyLandmark } from '@/types/api';
import { StepHeading } from './StepHeading';
import { StepNote } from './StepNote';

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

// Saisie libre du point de départ (mode « free »). Le LIBELLÉ est figé : un test
// d'édition et l'UX en dépendent.
const START_PROMPT = {
  label: 'À partir de quel repère connu voulez-vous indiquer ?',
  hint: 'ex : la pharmacie Les Potiers, le marché Dantokpa…',
};
// Étapes intermédiaires : une indication libre par étape (« que faire ensuite »),
// volontairement générique — la question « combien de voies » ne collait pas à
// tous les contextes (pas de voies, repère atypique…).
const MIDDLE_PROMPT = {
  label: 'Que faut-il faire ensuite ?',
  hint: 'ex : tourner à droite après l’école, continuer tout droit sur 100 m…',
};
// Dernière étape, TOUJOURS le repère visuel d'arrivée (reformulé pour l'UX).
const ARRIVAL_PROMPT = {
  label: 'À quoi reconnaît-on l’endroit une fois sur place ?',
  hint: 'ex : portail bleu, grand manguier devant la cour, mur orange',
};

interface StepItem {
  id: string;
  text: string;
}

// Compteur d'ids stables pour les clés DnD — au niveau module (pas un ref), afin
// de pouvoir générer un id dans l'initialiseur d'état sans « lire un ref pendant
// le rendu ». L'unicité globale suffit (les ids ne servent que de clés React/DnD).
let stepIdSeq = 0;
const nextStepId = () => `step-${stepIdSeq++}`;

type Mode = 'querying' | 'confirm' | 'guided' | 'free';

export function StepInstructions({
  value,
  onComplete,
  gps,
}: StepInstructionsProps) {
  const hasInitialValue = !!(value?.steps && value.steps.length > 0);

  // Génère des items à ids stables (clés DnD) indépendants de la position.
  const makeItems = (texts: string[]): StepItem[] =>
    texts.map((text) => ({ id: nextStepId(), text }));

  const [mode, setMode] = useState<Mode>(() =>
    hasInitialValue ? 'free' : gps ? 'querying' : 'free',
  );
  const [landmark, setLandmark] = useState<NearbyLandmark | null>(null);
  const [noLandmark, setNoLandmark] = useState(false);
  // items[0] = repère (départ) · items[dernier] = repère visuel (arrivée) ·
  // items du milieu = indications de trajet (réordonnables). Toujours ≥ 2.
  const [items, setItems] = useState<StepItem[]>(() => {
    if (hasInitialValue) {
      const arr = [...value!.steps];
      while (arr.length < 2) arr.push('');
      return makeItems(arr);
    }
    return makeItems(['', '', '']);
  });

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

  const steps = useMemo(() => items.map((it) => it.text), [items]);
  const assembledText = useMemo(() => buildAssembledText(steps), [steps]);
  // Le départ (items[0]) et l'arrivée (dernier) sont obligatoires ; les étapes
  // de milieu restent optionnelles. En mode « guided » le départ est le repère
  // verrouillé, donc toujours renseigné.
  const startFilled = mode === 'guided' || items[0].text.trim().length > 0;
  const arrivalFilled = items[items.length - 1].text.trim().length > 0;
  const canSubmit = startFilled && arrivalFilled;

  const sensors = useSensors(
    // Petite distance d'activation → le tap dans un champ ne déclenche pas un drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setText = (id: string, text: string) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, text } : it)));
  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((it) => it.id !== id));
  // Insère une indication de trajet juste avant le repère d'arrivée (dernier).
  const addMiddle = () =>
    setItems((prev) => {
      const out = [...prev];
      out.splice(out.length - 1, 0, { id: nextStepId(), text: '' });
      return out;
    });

  // Réordonnancement : uniquement les étapes du milieu (départ et arrivée figés).
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((it) => it.id === active.id);
      const newIndex = prev.findIndex((it) => it.id === over.id);
      const lastMovable = prev.length - 2;
      if (
        oldIndex < 1 ||
        newIndex < 1 ||
        oldIndex > lastMovable ||
        newIndex > lastMovable
      ) {
        return prev;
      }
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  // Scénario 1 : on part du repère détecté — il devient l'étape 0 verrouillée.
  const acceptLandmark = () => {
    if (!landmark) return;
    setItems(makeItems([`Partir de ${landmark.name}`, '', '']));
    setMode('guided');
  };
  // Scénario 2 : le repère auto est invalidé/supprimé — saisie libre.
  const rejectLandmark = () => {
    setItems(makeItems(['', '', '']));
    setMode('free');
  };
  // Depuis « guided » : retirer le repère auto et saisir soi-même le départ.
  const unlockStart = () => {
    setItems((prev) => prev.map((it, i) => (i === 0 ? { ...it, text: '' } : it)));
    setMode('free');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    // Le départ et l'arrivée sont garantis non vides (obligatoires) ; on ne
    // retire que les étapes de milieu laissées vides.
    const cleaned = steps.map((s) => s.trim()).filter(Boolean);
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
        <StepHeading
          title="Un repère pour démarrer ?"
          subtitle="On a trouvé un lieu connu tout près. S’il est bien visible depuis la rue, vos visiteurs partiront de là."
        />

        <div className="card p-5 flex items-center gap-4">
          <MapPin
            className="h-6 w-6 shrink-0 text-primary"
            strokeWidth={2}
            aria-hidden="true"
          />
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
  const middle = items.slice(1, -1);
  const arrival = items[items.length - 1];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <StepHeading
        title="Comment arriver chez vous ?"
        subtitle={
          guided
            ? 'Indiquez le trajet une étape à la fois depuis ce repère, jusqu’à votre porte.'
            : 'Choisissez votre repère de départ, puis le trajet une étape à la fois jusqu’à votre porte.'
        }
      />

      {noLandmark && !guided ? (
        <StepNote variant="info" icon={MapPin}>
          Aucun repère connu détecté autour de vous. Choisissez vous-même le
          point de départ le plus parlant pour vos visiteurs.
        </StepNote>
      ) : null}

      <div className="flex flex-col gap-3">
        {/* ── DÉPART — repère (verrouillé en première position) ── */}
        {guided ? (
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-primary/30 bg-primary-surface px-4 py-3">
            <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                Départ
              </p>
              <p className="font-medium text-text-primary truncate">
                {landmark?.name ?? items[0].text}
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
            label={START_PROMPT.label}
            hint={START_PROMPT.hint}
            value={items[0].text}
            onChange={(e) => setText(items[0].id, e.target.value)}
            placeholder={START_PROMPT.hint}
            leadingIcon={<MapPin className="h-4 w-4" aria-hidden="true" />}
            required
          />
        )}

        {/* ── TRAJET — indications du milieu, réordonnables en drag & drop ── */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={middle.map((it) => it.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {middle.map((item) => (
                <SortableStep
                  key={item.id}
                  id={item.id}
                  value={item.text}
                  onChange={(t) => setText(item.id, t)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addMiddle}
          leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          className="self-start"
        >
          Ajouter une étape
        </Button>

        {/* ── ARRIVÉE — repère visuel (verrouillé en dernière position) ── */}
        <Input
          label={ARRIVAL_PROMPT.label}
          hint={ARRIVAL_PROMPT.hint}
          value={arrival.text}
          onChange={(e) => setText(arrival.id, e.target.value)}
          placeholder={ARRIVAL_PROMPT.hint}
          leadingIcon={<Eye className="h-4 w-4" aria-hidden="true" />}
          required
        />
      </div>

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
        {canSubmit
          ? 'Continuer'
          : !startFilled
            ? 'Indiquez le point de départ'
            : 'Indiquez le repère d’arrivée'}
      </Button>
    </form>
  );
}

interface SortableStepProps {
  id: string;
  value: string;
  onChange: (text: string) => void;
  onRemove: () => void;
}

/** Une indication de trajet (étape du milieu) — déplaçable par sa poignée. */
function SortableStep({ id, value, onChange, onRemove }: SortableStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={classNames(
        'flex items-end gap-2',
        isDragging && 'relative z-10 opacity-80',
      )}
    >
      <button
        type="button"
        aria-label="Déplacer cette étape"
        className="h-11 w-8 shrink-0 flex items-center justify-center rounded-[var(--radius-md)] text-text-muted hover:text-text-primary hover:bg-surface-muted cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="flex-1">
        <Input
          label={MIDDLE_PROMPT.label}
          hint={MIDDLE_PROMPT.hint}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={MIDDLE_PROMPT.hint}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        aria-label="Supprimer cette étape"
        className="h-11"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

export default StepInstructions;
