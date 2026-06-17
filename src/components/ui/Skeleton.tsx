import type { CSSProperties } from 'react';
import { classNames } from '@/lib/utils';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  rounded?: boolean;
  count?: number;
  className?: string;
}

const toCssValue = (v: number | string | undefined) =>
  typeof v === 'number' ? `${v}px` : v;

export function Skeleton({
  width = '100%',
  height = 16,
  rounded = false,
  count = 1,
  className,
}: SkeletonProps) {
  const items = Array.from({ length: Math.max(1, count) });
  const style: CSSProperties = {
    width: toCssValue(width),
    height: toCssValue(height),
  };
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
      {items.map((_, idx) => (
        <span
          key={idx}
          aria-hidden="true"
          style={style}
          className={classNames(
            'block skeleton-shimmer',
            rounded ? 'rounded-full' : 'rounded-md',
            className,
          )}
        />
      ))}
    </div>
  );
}

export default Skeleton;
