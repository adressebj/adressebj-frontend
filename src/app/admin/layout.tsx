import { AdminShell } from '@/components/layout/AdminShell';

export const metadata = {
  title: {
    default: 'Administration | AdresseBJ',
    template: '%s · Administration | AdresseBJ',
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
