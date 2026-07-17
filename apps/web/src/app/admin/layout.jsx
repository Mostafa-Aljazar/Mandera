import MasterAuthGate from '@/components/MasterAuthGate.jsx';

export default function AdminLayout({ children }) {
  return <MasterAuthGate>{children}</MasterAuthGate>;
}
