import CompanyAuthGate from '@/components/CompanyAuthGate.jsx';

export default function OwnersLayout({ children }) {
  return <CompanyAuthGate>{children}</CompanyAuthGate>;
}
