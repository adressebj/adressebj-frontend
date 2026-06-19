'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { classNames } from '@/lib/utils';

export interface BottomSheetProps {
  /** Toujours visible (poignée + entête : compteur, filtres). */
  peek: React.ReactNode;
  /** Corps scrollable révélé à l'ouverture (la liste). */
  children: React.ReactNode;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /**
   * Apparence de la feuille :
   *  - `glass` (défaut) : verre dépoli sur la carte de découverte (`/carte`).
   *  - `solid` : papier opaque, langage « fiche-repère » de `/a/[code]` —
   *    pas de glassmorphisme, surface pleine et bord net.
   */
  surface?: 'glass' | 'solid';
}

const MAX_VH = 0.82;

/**
 * Feuille inférieure glissante (mobile). Deux points d'ancrage : repliée
 * (entête seule visible) / dépliée (corps). Glisser la poignée suit le doigt
 * puis s'aimante au plus proche ; un tap sur la poignée bascule. La carte
 * reste pleinement interactive derrière.
 *
 * `surface="glass"` = verre dépoli (découverte) ; `surface="solid"` = papier
 * opaque (fiche-repère).
 */
export function BottomSheet({
  peek,
  children,
  expanded,
  onExpandedChange,
  surface = 'glass',
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const [peekH, setPeekH] = useState(0);
  const [sheetH, setSheetH] = useState(0);
  // Translation pendant un drag actif (null = pas de drag → position d'ancrage).
  const [drag, setDrag] = useState<number | null>(null);
  const dragState = useRef({ startY: 0, base: 0, moved: false });

  useEffect(() => {
    const measure = () => {
      if (peekRef.current) setPeekH(peekRef.current.offsetHeight);
      if (sheetRef.current) setSheetH(sheetRef.current.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (peekRef.current) ro.observe(peekRef.current);
    if (sheetRef.current) ro.observe(sheetRef.current);
    return () => ro.disconnect();
  }, []);

  // Décalage vers le bas en position repliée : on ne laisse dépasser que
  // l'entête. Avant mesure, on garde la feuille hors-écran (entrée glissée
  // propre, pas de flash « ouverte »).
  const measured = sheetH > 0;
  const collapsedOffset = Math.max(sheetH - peekH, 0);
  const base = expanded ? 0 : measured ? collapsedOffset : 1000;
  const translate = drag ?? base;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragState.current = {
        startY: e.clientY,
        base,
        moved: false,
      };
      setDrag(base);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [base],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (drag === null) return;
      const dy = e.clientY - dragState.current.startY;
      if (Math.abs(dy) > 4) dragState.current.moved = true;
      const next = Math.min(
        Math.max(dragState.current.base + dy, 0),
        collapsedOffset,
      );
      setDrag(next);
    },
    [drag, collapsedOffset],
  );

  const handlePointerUp = useCallback(() => {
    if (drag === null) return;
    // Tap sans glisse → bascule ; sinon aimante au plus proche.
    const shouldExpand = dragState.current.moved
      ? drag < collapsedOffset / 2
      : !expanded;
    onExpandedChange(shouldExpand);
    setDrag(null);
  }, [drag, collapsedOffset, expanded, onExpandedChange]);

  // Sécurité : relâcher hors-fenêtre.
  useEffect(() => {
    if (drag === null) return;
    const up = () => handlePointerUp();
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, handlePointerUp]);

  return (
    <div
      ref={sheetRef}
      className={classNames(
        'fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-[var(--radius-2xl)] shadow-lg lg:hidden',
        surface === 'solid'
          ? 'bg-surface border-t border-border'
          : 'glass',
      )}
      style={{
        maxHeight: `${MAX_VH * 100}dvh`,
        transform: `translateY(${translate}px)`,
        transition: drag === null ? 'transform 320ms cubic-bezier(0.16,1,0.3,1)' : 'none',
      }}
    >
      {/* `peekRef` mesure toute la partie visible repliée (poignée + entête).
         Le drag n'est attaché qu'à la **poignée** : les chips de l'entête
         restent scrollables nativement sans déclencher le glissement. */}
      <div ref={peekRef} className="shrink-0">
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex justify-center cursor-grab touch-none select-none active:cursor-grabbing pt-2.5 pb-2"
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={expanded ? 'Réduire la liste' : 'Afficher la liste'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onExpandedChange(!expanded);
            }
          }}
        >
          <div
            aria-hidden="true"
            className="h-1.5 w-10 rounded-full bg-border-strong"
          />
        </div>
        {peek}
      </div>

      <div
        className={classNames(
          'min-h-0 flex-1 overflow-y-auto overscroll-contain',
          surface === 'solid' ? 'bg-surface' : 'bg-surface/60',
          expanded ? '' : 'pointer-events-none',
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default BottomSheet;
