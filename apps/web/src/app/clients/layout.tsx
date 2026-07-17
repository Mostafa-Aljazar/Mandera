import CompanyAuthGate from '@/components/CompanyAuthGate';

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return <CompanyAuthGate>{children}</CompanyAuthGate>;
}
