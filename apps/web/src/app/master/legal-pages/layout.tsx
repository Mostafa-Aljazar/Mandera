import MasterAuthGate from '@/components/MasterAuthGate';

export default function MasterLegalPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MasterAuthGate>{children}</MasterAuthGate>;
}
