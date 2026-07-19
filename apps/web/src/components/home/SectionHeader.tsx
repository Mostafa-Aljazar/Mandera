import { SectionBadge } from "@/components/SectionBadge";

type SectionHeaderProps = {
  label: string;
  title: string;
  subtitle?: string;
};

export default function SectionHeader({ label, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="mx-auto mb-14 md:mb-16 max-w-2xl text-center">
      <SectionBadge>{label}</SectionBadge>
      <h2 className="mt-4 font-outfit font-bold text-2xl md:text-3xl text-balance tracking-tight">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
          {subtitle}
        </p>
      ) : null}
      <div className="bg-primary/80 mx-auto mt-6 rounded-full w-12 h-1" />
    </div>
  );
}
