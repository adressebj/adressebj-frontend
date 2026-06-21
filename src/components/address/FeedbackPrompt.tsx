'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StarRating } from '@/components/forms/StarRating';
import { useToast } from '@/components/ui/Toast';

// Longueur minimale d'une note terrain — alignée sur la validation backend
// mock (`NOTE_TOO_SHORT`).
const MIN_NOTE_LENGTH = 5;

export interface FeedbackPromptProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  /** Note 1-5 déjà laissée par l'utilisateur (pré-remplissage), sinon null. */
  currentRating: number | null;
  /** Enregistre la note (lève une exception en cas d'échec). */
  onRate: (score: number) => Promise<void>;
  /** Envoie une observation terrain (lève une exception en cas d'échec). */
  onSubmitNote: (message: string) => Promise<void>;
  /** Visiteur anonyme qui souhaite aider → invite à se connecter. */
  onRequireAuth: () => void;
}

// Étapes du dialogue : noter → (si ≤ 3 ou « passer ») contribuer → merci.
type Step = 'rate' | 'contribute' | 'done';

/**
 * Dialogue de retour présenté **explicitement** à l'arrivée (« J'y suis »), au
 * lieu d'un bloc passif laissé dans le défilement. Reproduit la séquence du CDC
 * §327 : on propose la note ; une note ≥ 4 remercie et clôt, une note ≤ 3 (ou
 * un « je préfère ne pas noter ») enchaîne sur la contribution terrain. La
 * soumission exige un compte — un visiteur anonyme se voit proposer la
 * connexion. Tout reste optionnel (fermeture libre).
 */
export function FeedbackPrompt({
  isOpen,
  onClose,
  isAuthenticated,
  currentRating,
  onRate,
  onSubmitNote,
  onRequireAuth,
}: FeedbackPromptProps) {
  const toast = useToast();
  const [step, setStep] = useState<Step>('rate');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Réinitialise le parcours à chaque ouverture.
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset du parcours à chaque ouverture de la modale
      setStep('rate');
      setNote('');
      setBusy(false);
    }
  }, [isOpen]);

  // ── Visiteur anonyme : une seule étape, l'invitation à se connecter. ──
  if (!isAuthenticated) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Vous êtes arrivé !"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={onClose}>
              Plus tard
            </Button>
            <Button
              variant="primary"
              size="md"
              leadingIcon={<LogIn className="h-4 w-4" aria-hidden="true" />}
              onClick={onRequireAuth}
            >
              Se connecter
            </Button>
          </>
        }
      >
        <p className="text-body text-text-primary leading-relaxed">
          Connectez-vous pour noter cette adresse et glisser un conseil aux
          prochains visiteurs. Ça ne prend que quelques secondes.
        </p>
      </Modal>
    );
  }

  const handleStar = async (n: number) => {
    if (busy) return;
    setBusy(true);
    try {
      await onRate(n);
      // Note basse → on enchaîne sur la contribution ; note haute → merci.
      setStep(n >= 4 ? 'done' : 'contribute');
    } catch {
      toast.show({
        message: "Impossible d'enregistrer votre note. Réessayez.",
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitNote = async () => {
    const message = note.trim();
    if (message.length < MIN_NOTE_LENGTH) {
      toast.show({
        message: 'Décrivez votre observation en quelques mots.',
        variant: 'info',
      });
      return;
    }
    setBusy(true);
    try {
      await onSubmitNote(message);
      setStep('done');
    } catch {
      toast.show({
        message: "Impossible d'envoyer votre contribution. Réessayez.",
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const title =
    step === 'contribute'
      ? 'Aidez les prochains visiteurs'
      : step === 'done'
        ? 'Merci !'
        : 'Vous y êtes !';

  const footer =
    step === 'contribute' ? (
      <>
        <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>
          Plus tard
        </Button>
        <Button
          variant="primary"
          size="md"
          loading={busy}
          onClick={() => void handleSubmitNote()}
        >
          Partager ma contribution
        </Button>
      </>
    ) : step === 'done' ? (
      <Button variant="primary" size="md" onClick={onClose}>
        Fermer
      </Button>
    ) : undefined;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
      {step === 'rate' ? (
        <div className="flex flex-col items-center gap-6 py-2">
          <p className="text-body text-text-primary text-center">
            Avez-vous trouvé facilement&nbsp;?
          </p>
          <StarRating
            currentScore={currentRating}
            disabled={busy}
            onRate={(n) => void handleStar(n)}
            size="lg"
          />
          <button
            type="button"
            onClick={() => setStep('contribute')}
            className="text-sm font-medium text-text-muted hover:text-text-primary underline-offset-2 hover:underline cursor-pointer"
          >
            Je préfère ne pas noter
          </button>
        </div>
      ) : null}

      {step === 'contribute' ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            Un repère, un raccourci, un horaire… ce qui vous a aidé (ou ce qui a
            manqué) pour arriver jusqu&apos;ici.
          </p>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-text-primary">
              Votre observation terrain
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={500}
              autoFocus
              placeholder="Ex. : portail vert juste après la pharmacie, venir par la rue de derrière (plus carrossable)…"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 leading-relaxed resize-none"
            />
          </label>
        </div>
      ) : null}

      {step === 'done' ? (
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <CheckCircle2 className="h-12 w-12 text-success" aria-hidden="true" />
          <p className="text-body text-text-primary leading-relaxed">
            C&apos;est noté&nbsp;! Votre retour aide tout le quartier à mieux
            s&apos;y retrouver.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}

export default FeedbackPrompt;
