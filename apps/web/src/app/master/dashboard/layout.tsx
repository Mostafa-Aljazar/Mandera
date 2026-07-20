import MasterAuthGate from '@/components/master/MasterAuthGate';

export default function MasterDashboardLayout({ children }: { children: React.ReactNode }) {
  return <MasterAuthGate>{children}</MasterAuthGate>;
}
