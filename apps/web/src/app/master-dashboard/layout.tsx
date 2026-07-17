import MasterAuthGate from '@/components/MasterAuthGate';

export default function MasterDashboardLayout({ children }: { children: React.ReactNode }) {
  return <MasterAuthGate>{children}</MasterAuthGate>;
}
