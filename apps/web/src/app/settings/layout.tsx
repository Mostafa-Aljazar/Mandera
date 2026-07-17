import CompanyAuthGate from '@/components/CompanyAuthGate';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <CompanyAuthGate>{children}</CompanyAuthGate>;
}
