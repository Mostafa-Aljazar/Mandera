import CompanyAuthGate from '@/components/CompanyAuthGate.jsx';

export default function ClientsLayout({ children }) {
  return <CompanyAuthGate>{children}</CompanyAuthGate>;
}
