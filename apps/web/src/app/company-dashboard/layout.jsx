import CompanyAuthGate from '@/components/CompanyAuthGate.jsx';

export default function CompanyDashboardLayout({ children }) {
  return <CompanyAuthGate>{children}</CompanyAuthGate>;
}
