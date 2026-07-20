import CompanyAuthGate from "@/components/company/CompanyAuthGate";

export default function CompanyAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CompanyAuthGate>{children}</CompanyAuthGate>;
}
