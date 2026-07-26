import MasterAuthGate from '@/components/master/MasterAuthGate';

export default function MasterLegalPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MasterAuthGate>{children}</MasterAuthGate>;
}
