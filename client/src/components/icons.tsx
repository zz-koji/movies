import type { ReactNode, SVGProps } from 'react';

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'strokeWidth' | 'width' | 'height'> & {
  size?: number;
  strokeWidth?: number;
};

const createIcon = (paths: ReactNode) =>
  function Icon({ size = 18, strokeWidth = 1.6, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {paths}
      </svg>
    );
  };

export const IconMovie = createIcon(
  <>
    <rect x={3.5} y={5} width={17} height={14} rx={2.5} />
    <line x1={9} y1={5} x2={9} y2={19} />
    <line x1={15} y1={5} x2={15} y2={19} />
    <circle cx={9} cy={9} r={0.8} fill="currentColor" />
    <circle cx={15} cy={9} r={0.8} fill="currentColor" />
    <circle cx={9} cy={15} r={0.8} fill="currentColor" />
    <circle cx={15} cy={15} r={0.8} fill="currentColor" />
  </>
);

export const IconBellPlus = createIcon(
  <>
    <path d="M18 15a4.5 4.5 0 0 0 1.5-3.4v-1.1A7.5 7.5 0 0 0 12 3a7.5 7.5 0 0 0-7.5 7.5v1.1A4.5 4.5 0 0 0 6 15l-1 1.5h14Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
    <path d="M12 10v4" />
    <path d="M10 12h4" />
  </>
);

export const IconClock = createIcon(
  <>
    <circle cx={12} cy={12} r={8.5} />
    <path d="M12 7v6l3 2" />
  </>
);

export const IconDeviceTv = createIcon(
  <>
    <rect x={3.5} y={5} width={17} height={12} rx={2} />
    <line x1={8} y1={19} x2={16} y2={19} />
    <line x1={12} y1={17} x2={12} y2={21} />
  </>
);

export const IconDownload = createIcon(
  <>
    <path d="M12 4v11" />
    <polyline points="8 11 12 15 16 11" />
    <path d="M4 19h16" />
  </>
);

export const IconFilter = createIcon(
  <>
    <path d="M4 6h16" />
    <path d="M7 12h10" />
    <path d="M10 18h4" />
  </>
);

export const IconListCheck = createIcon(
  <>
    <path d="M9 7h11" />
    <path d="M9 12h11" />
    <path d="M9 17h11" />
    <polyline points="4.5 6 6.5 8 8.5 5.5" />
    <polyline points="4.5 11 6.5 13 8.5 10.5" />
    <polyline points="4.5 16 6.5 18 8.5 15.5" />
  </>
);

export const IconSearch = createIcon(
  <>
    <circle cx={11} cy={11} r={6.5} />
    <line x1={16.5} y1={16.5} x2={21} y2={21} />
  </>
);

export const IconStars = createIcon(
  <>
    <path d="M12 5.2 13.7 9l4 .3-3.1 2.6.9 3.9-3.5-2.1-3.5 2.1.9-3.9L6.3 9.3l4-.3Z" />
    <circle cx={6} cy={6} r={1} fill="currentColor" />
    <circle cx={18} cy={6} r={1} fill="currentColor" />
  </>
);

export const IconArrowsSort = createIcon(
  <>
    <path d="M8 5v14" />
    <polyline points="5.5 8.5 8 6 10.5 8.5" />
    <path d="M16 19V5" />
    <polyline points="13.5 15.5 16 18 18.5 15.5" />
  </>
);

export const IconBellRinging = createIcon(
  <>
    <path d="M12 3a6 6 0 0 0-6 6v2.4l-1.5 2.3H19.5L18 11.4V9a6 6 0 0 0-6-6Z" />
    <path d="M9 18a3 3 0 0 0 6 0" />
    <path d="M5 4l1.5 1.5" />
    <path d="M19 4l-1.5 1.5" />
  </>
);

export const IconBookmark = createIcon(
  <>
    <path d="M7 4h10a1.5 1.5 0 0 1 1.5 1.5v14l-6.5-3.5L5.5 19.5v-14A1.5 1.5 0 0 1 7 4Z" />
  </>
);

export const IconPlayerPlay = createIcon(
  <>
    <circle cx={12} cy={12} r={8.5} />
    <polygon points="10 9 16 12 10 15" fill="currentColor" stroke="none" />
  </>
);

export const IconUser = createIcon(
  <>
    <circle cx={12} cy={9} r={4} />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </>
);
