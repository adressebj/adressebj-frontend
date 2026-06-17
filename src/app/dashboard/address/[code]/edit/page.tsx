import { EditAddressView } from '@/components/address/EditAddressView';

interface RouteParams {
  params: Promise<{ code: string }>;
}

export default async function EditAddressPage({ params }: RouteParams) {
  const { code } = await params;
  return <EditAddressView code={code} />;
}
