import MasterAuthGate from '@/components/master/MasterAuthGate';

export default function MasterPortalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MasterAuthGate>{children}</MasterAuthGate>;
}
