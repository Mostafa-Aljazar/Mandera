import CompanyAuthGate from '@/components/CompanyAuthGate';

export default function PropertiesLayout({ children }: { children: React.ReactNode }) {
  return <CompanyAuthGate>{children}</CompanyAuthGate>;
}
