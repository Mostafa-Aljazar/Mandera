import CompanyAuthGate from '@/components/CompanyAuthGate';

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  return <CompanyAuthGate>{children}</CompanyAuthGate>;
}
