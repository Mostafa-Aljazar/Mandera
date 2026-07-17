import CompanyAuthGate from '@/components/CompanyAuthGate';

export default function RevenueLayout({ children }: { children: React.ReactNode }) {
  return <CompanyAuthGate>{children}</CompanyAuthGate>;
}
