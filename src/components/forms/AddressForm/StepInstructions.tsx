'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { buildAssembledText } from '@/lib/utils';

export interface StepInstructionsValue {
  steps: string[];
  assembledText: string;
}

export interface StepInstructionsProps {
  value: StepInstructionsValue | null;
  onComplete: (value: StepInstructionsValue) => void;
}

const PROMPTS = [
  {
    label: 'Depuis quel repère connu démarre-t-on ?',
    hint: 'ex : Pharmacie Les Potiers, marché Dantokpa…',
  },
  {
    label: 'Quelle direction prendre ?',
    hint: 'ex : Prendre la voie pavée à droite, puis la 2ème rue à gauche.',
  },
  {
    label: 'Comment reconnaître le lieu ?',
    hint: 'ex : Portail noir avec un grand manguier devant la cour.',
  },
];

export function StepInstructions({ value, onComplete }: StepInstructionsProps) {
  const [steps, setSteps] = useState<string[]>(() => {
    if (value?.steps && value.steps.length > 0) return [...value.steps];
    return ['', '', ''];
  });

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

  const handleAddStep = () => {
    setSteps((current) => [...current, '']);
  };

  const handleRemoveStep = (index: number) => {
    setSteps((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned = steps.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length < 2) return;
    onComplete({ steps: cleaned, assembledText: buildAssembledText(cleaned) });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <header className="flex flex-col gap-2 text-center">
        <h2 className="font-display font-bold text-2xl text-primary">
          Comment arriver chez vous&nbsp;?
        </h2>
        <p className="text-base text-text-muted">
          Donnez des indications claires pour guider vos visiteurs jusqu’à votre
          porte.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {steps.map((step, idx) => {
          const prompt = PROMPTS[idx];
          const label = prompt
            ? `${idx + 1}. ${prompt.label}`
            : `${idx + 1}. Indication supplémentaire`;
          const hint = prompt?.hint;
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
              {idx >= PROMPTS.length ? (
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

      <div className="bg-primary-surface border border-primary/20 rounded-md p-4 flex flex-col gap-3">
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
