import type { Metadata } from 'next';
import { api, ApiError } from '@/lib/api';
import { AddressView } from '@/components/address/AddressView';

interface RouteParams {
  params: Promise<{ code: string }>;
}

// Server-side fetch so WhatsApp / Twitter previews show the portal photo
// and description. Failures fall back to a generic title — never break
// the page render for a metadata miss.
export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { code } = await params;
  const upper = code.toUpperCase();

  try {
    const address = await api.publicAddress(upper);
    const description = address.instructions.assembledText;
    return {
      title: `Adresse ${upper} | AdresseBJ`,
      description,
      openGraph: {
        title: `Adresse ${upper}`,
        description,
        images: [{ url: address.photoUrl, width: 800, height: 600 }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        images: [address.photoUrl],
      },
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 410) {
      return { title: `Adresse ${upper} désactivée | AdresseBJ` };
    }
    return { title: 'Adresse introuvable | AdresseBJ' };
  }
}

export default async function AddressPage({ params }: RouteParams) {
  const { code } = await params;
  return <AddressView code={code.toUpperCase()} />;
}
