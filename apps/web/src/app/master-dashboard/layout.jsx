import MasterAuthGate from '@/components/MasterAuthGate.jsx';

export default function MasterDashboardLayout({ children }) {
  return <MasterAuthGate>{children}</MasterAuthGate>;
}
