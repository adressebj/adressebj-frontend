import { ReportDetailView } from '@/components/address/ReportDetailView';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function AdminReportDetailPage({ params }: RouteParams) {
  const { id } = await params;
  return <ReportDetailView id={id} />;
}
