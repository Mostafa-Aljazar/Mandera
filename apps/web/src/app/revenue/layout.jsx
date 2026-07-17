import CompanyAuthGate from '@/components/CompanyAuthGate.jsx';

export default function RevenueLayout({ children }) {
  return <CompanyAuthGate>{children}</CompanyAuthGate>;
}
