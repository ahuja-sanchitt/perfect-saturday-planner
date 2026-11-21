// One drawn icon set, one stroke weight (1.75). No Unicode glyphs or emoji as icons.
type P = { size?: number; className?: string };
const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export const CheckIcon = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const CrossIcon = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
);
export const RetryIcon = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" /></svg>
);
export const InfoIcon = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></svg>
);
export const ThumbUpIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M7 10v11M15 5.9 14 10h5.8a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 18.4 21H7V10l4-8a3 3 0 0 1 4 3.9Z" /></svg>
);
export const ThumbDownIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M17 14V3M9 18.1 10 14H4.2a2 2 0 0 1-2-2.3l1.4-7A2 2 0 0 1 5.6 3H17v11l-4 8a3 3 0 0 1-4-3.9Z" /></svg>
);
export const ArrowRightIcon = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const PanelIcon = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></svg>
);
export const SunIcon = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);

/** The agent's thinking mark: a filled four-point sparkle. `spinning` turns it while work is in flight. */
export const Sparkle = ({ size = 18, className = "", spinning = false }: P & { spinning?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={`${spinning ? "sparkle" : ""} ${className}`}>
    <path fill="currentColor" d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5v.2c-4.6.6-6.9 2.9-7.5 7.5h-.2c-.6-4.6-2.9-6.9-7.5-7.5V10c4.6-.6 6.9-2.9 7.5-7.5h.2Z" transform="translate(0 2)" />
  </svg>
);
