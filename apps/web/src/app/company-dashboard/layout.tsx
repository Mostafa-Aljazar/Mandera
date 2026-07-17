import CompanyAuthGate from '@/components/CompanyAuthGate';

export default function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  return <CompanyAuthGate>{children}</CompanyAuthGate>;
}
