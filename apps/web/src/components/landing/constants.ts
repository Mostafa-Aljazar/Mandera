import {
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  UserPlus,
} from "lucide-react";

export const LOGO_URL =
  "https://horizons-cdn.hostinger.com/6149b89f-35de-4601-ab2a-f81b6d19b0ae/61673acd93c0f988a7668a1bcdc561f5.png";

export const heroHighlights = [
  { icon: Building2, labelKey: "Properties" },
  { icon: Users, labelKey: "Clients" },
  { icon: Briefcase, labelKey: "Employees" },
] as const;

export const steps = [
  { num: "01", icon: UserPlus, titleKey: "step1_title", descKey: "step1_desc" },
  {
    num: "02",
    icon: Building2,
    titleKey: "step2_title",
    descKey: "step2_desc",
  },
  { num: "03", icon: Users, titleKey: "step3_title", descKey: "step3_desc" },
  {
    num: "04",
    icon: TrendingUp,
    titleKey: "step4_title",
    descKey: "step4_desc",
  },
] as const;

export const featureBlocks = [
  {
    step: "01",
    icon: Building2,
    titleKey: "feat1_title",
    descKey: "feat1_desc",
    image:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80",
    imageAlt: "Modern home exterior",
    reverse: false,
  },
  {
    step: "02",
    icon: Users,
    titleKey: "feat2_title",
    descKey: "feat2_desc",
    image:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80",
    imageAlt: "Client meeting in a modern office",
    reverse: true,
  },
  {
    step: "03",
    icon: Briefcase,
    titleKey: "feat3_title",
    descKey: "feat3_desc",
    image:
      "https://images.unsplash.com/photo-1600607686527-6fb886090705?w=800&auto=format&fit=crop&q=80",
    imageAlt: "Modern office environment",
    reverse: false,
  },
] as const;
