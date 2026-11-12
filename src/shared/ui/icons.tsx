import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const UserIcon = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></svg>
);
export const BriefcaseIcon = (p: IconProps) => (
  <svg {...base} {...p}><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" /><path d="M3 12.5h18" /></svg>
);
export const LockIcon = (p: IconProps) => (
  <svg {...base} {...p} aria-hidden={p["aria-label"] ? undefined : true} role={p["aria-label"] ? "img" : undefined}>
    <rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const HomeIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>
);
export const ListIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h10" /></svg>
);
export const GaugeIcon = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8" /><path d="M12 4v8l5.5 5.5" /></svg>
);
export const TargetIcon = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /></svg>
);
export const PlusIcon = (p: IconProps) => (
  <svg {...base} strokeWidth={2.4} {...p}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
);
export const EyeIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const EyeOffIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1" />
    <path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M15 6l-6 6 6 6" /></svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M9 6l6 6-6 6" /></svg>
);
export const CloseIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
);
export const TagIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);

export const ChartIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 20V11" />
    <path d="M10 20V5" />
    <path d="M16 20v-6" />
    <path d="M21 20H3" />
  </svg>
);
export const CalendarIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4" y="5" width="16" height="15" rx="3" />
    <path d="M4 10h16" />
    <path d="M9 3v4" />
    <path d="M15 3v4" />
  </svg>
);
/** O calendário fiscal: a folha do mês com os dias marcados, diferente do ícone das Contas. */
export const CalendarDaysIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4" y="5" width="16" height="15" rx="3" />
    <path d="M9 3v4" />
    <path d="M15 3v4" />
    <path d="M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 15h.01M12 15h.01" strokeWidth={2.6} />
  </svg>
);
export const MoreIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </svg>
);
