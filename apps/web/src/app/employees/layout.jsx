import CompanyAuthGate from '@/components/CompanyAuthGate.jsx';

export default function EmployeesLayout({ children }) {
  return <CompanyAuthGate>{children}</CompanyAuthGate>;
}
