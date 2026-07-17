import MasterAuthGate from '@/components/MasterAuthGate';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <MasterAuthGate>{children}</MasterAuthGate>;
}
