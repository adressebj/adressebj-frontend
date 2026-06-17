'use client';

import { useState, type ReactNode } from 'react';
import { Check, Link as LinkIcon, MessageCircle } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export interface ShareButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  url: string;
  title?: string;
  text?: string;
  /** When true, prefer the Web Share API if available. */
  preferNativeShare?: boolean;
  children?: ReactNode;
}

export function ShareButton({
  url,
  title,
  text,
  preferNativeShare = true,
  children,
  ...buttonProps
}: ShareButtonProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    if (preferNativeShare && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // User cancelled or share unavailable — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard?.writeText?.(url);
      setCopied(true);
      toast.show({ message: 'Lien copié !', variant: 'success' });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.show({
        message: 'Impossible de copier le lien. Essayez à la main.',
        variant: 'error',
      });
    }
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      leadingIcon={
        copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : preferNativeShare ? (
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
        ) : (
          <LinkIcon className="h-4 w-4" aria-hidden="true" />
        )
      }
      {...buttonProps}
    >
      {children ?? (copied ? 'Copié !' : 'Partager')}
    </Button>
  );
}

export default ShareButton;
