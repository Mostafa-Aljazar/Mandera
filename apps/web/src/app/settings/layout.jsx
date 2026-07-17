import CompanyAuthGate from '@/components/CompanyAuthGate.jsx';

export default function SettingsLayout({ children }) {
  return <CompanyAuthGate>{children}</CompanyAuthGate>;
}
