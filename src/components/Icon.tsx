import type { ReactNode } from 'react';

export type IconName =
  | 'calendar'
  | 'dumbbell'
  | 'chart'
  | 'user'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'chevronUp'
  | 'plus'
  | 'check'
  | 'minus'
  | 'close'
  | 'play'
  | 'timer'
  | 'edit'
  | 'trash'
  | 'copy'
  | 'download'
  | 'upload'
  | 'bell'
  | 'settings'
  | 'activity'
  | 'note'
  | 'more'
  | 'flame'
  | 'clock'
  | 'alert'
  | 'arrowLeft'
  | 'refresh'
  | 'target'
  | 'skip'
  | 'search'
  | 'list'
  | 'sparkles';

const ICONS: Record<IconName, ReactNode> = {
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
      <path d="M8 2.5v4M16 2.5v4M3 9.5h18" />
      <path d="M8 13h2M14 13h2M8 17h2M14 17h2" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M7 7.5v9M17 7.5v9M4 10v4M20 10v4M7 12h10" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19.5V4.5M4 19.5h16" />
      <path d="M7.5 15.5l4-5 3 2.8 5-7" />
      <circle cx="7.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13.3" r="1" fill="currentColor" stroke="none" />
      <circle cx="19.5" cy="6.3" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c.7-4 3.8-6 7.5-6s6.8 2 7.5 6" />
    </>
  ),
  chevronLeft: <path d="M15 18l-6-6 6-6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronUp: <path d="M6 15l6-6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M20 6.5L9.5 17 4 11.5" />,
  minus: <path d="M5 12h14" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  play: (
    <>
      <path d="M8 5.5v13l10-6.5-10-6.5z" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 10v4l2.7 1.8M9.5 2.5h5" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7.5 18.5l-4 1 1-4L16.5 3.5z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M4 20.5h16" />
    </>
  ),
  upload: (
    <>
      <path d="M12 21V9M7.5 13.5L12 9l4.5 4.5M4 3.5h16" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8.5a6 6 0 10-12 0c0 7-3 7-3 8.5h18c0-1.5-3-1.5-3-8.5z" />
      <path d="M10 21h4" />
    </>
  ),
  settings: (
    <>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
      <circle cx="8" cy="6.5" r="2" fill="var(--surface, #161b23)" />
      <circle cx="16" cy="12" r="2" fill="var(--surface, #161b23)" />
      <circle cx="10" cy="17.5" r="2" fill="var(--surface, #161b23)" />
    </>
  ),
  activity: (
    <>
      <path d="M3 12h4l2.2-7 4.2 14 2.2-7H21" />
    </>
  ),
  note: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  flame: (
    <>
      <path d="M12 22c4 0 7-2.7 7-6.5 0-3-2-5-3.5-6.5-.7 2-2 2.5-2.5 1.5-.6-1.2-.5-3-.5-4.5-3 2-7 5.5-7 9.5C5.5 19.3 8 22 12 22z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5L22 20.5H2L12 3.5z" />
      <path d="M12 9v5M12 17.2v.1" />
    </>
  ),
  arrowLeft: <path d="M19 12H5M12 19l-7-7 7-7" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 11-2.3-5.7" />
      <path d="M20 4.5V10h-5.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  skip: (
    <>
      <path d="M5 5l9.5 7L5 19V5z" />
      <path d="M19 5v14" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6l1.5 1.5L8 4.8M4 12l1.5 1.5L8 10.8M4 18l1.5 1.5L8 16.8" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z" />
      <path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, className, strokeWidth = 1.8 }: IconProps) {
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
      className={className}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
