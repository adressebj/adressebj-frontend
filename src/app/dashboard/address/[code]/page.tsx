import { OwnerAddressView } from '@/components/address/OwnerAddressView';

interface RouteParams {
  params: Promise<{ code: string }>;
}

export default async function OwnerAddressPage({ params }: RouteParams) {
  const { code } = await params;
  return <OwnerAddressView code={code} />;
}
