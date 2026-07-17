import CompanyAuthGate from '@/components/CompanyAuthGate.jsx';

export default function PropertiesLayout({ children }) {
  return <CompanyAuthGate>{children}</CompanyAuthGate>;
}
