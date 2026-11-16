type P = { className?: string; size?: number };
const base = (size = 22) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconBag = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);
export const IconHeart = ({ className, size, filled }: P & { filled?: boolean }) => (
  <svg {...base(size)} className={className} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20s-7-4.4-9-9.1C1.7 7.5 4 4.5 7.1 4.5c1.8 0 3.2 1 4.9 2.9 1.7-1.9 3.1-2.9 4.9-2.9 3.1 0 5.4 3 4.1 6.4-2 4.7-9 9.1-9 9.1z" />
  </svg>
);
export const IconSearch = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);
export const IconPlus = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconMinus = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12h14" />
  </svg>
);
export const IconTrash = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 .9h8a1 1 0 0 0 1-.9l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
export const IconArrowLeft = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);
export const IconCheck = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const IconFilter = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
);
