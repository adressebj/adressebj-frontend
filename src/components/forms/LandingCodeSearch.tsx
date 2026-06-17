'use client';

import { useRouter } from 'next/navigation';
import { CodeSearchInput } from '@/components/forms/CodeSearchInput';

// Thin client island that wires the search input to the visitor route
// without forcing the whole landing page to be a client component.
export function LandingCodeSearch() {
  const router = useRouter();
  return (
    <CodeSearchInput
      onSearch={(code) => {
        router.push(`/a/${code}`);
      }}
    />
  );
}

export default LandingCodeSearch;
