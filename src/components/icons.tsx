import type { SVGProps } from "react";

export function MicOnIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

export function MicOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M18.9 13A8.5 8.5 0 0 0 19 11v-1" />
      <path d="M5 10v1a7 7 0 0 0 10.9 5.9" />
      <path d="M12 17v5" />
      <path d="M9 2a3 3 0 0 1 5.4 1.5" />
      <line x1="9" y1="18" x2="5" y2="22" />
      <line x1="15" y1="18" x2="19" y2="22" />
    </svg>
  );
}

export function CamOnIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m15 7 4.6-3.1a1 1 0 0 1 .4-.09A2 2 0 0 1 22 5.7v12.6a2 2 0 0 1-2 1.99c-.14 0-.28-.03-.4-.09L15 17" />
      <path d="M15 7v10" />
      <rect x="2" y="5" width="13" height="14" rx="2" />
    </svg>
  );
}

export function CamOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M15 12V7a2 2 0 0 0-2-2H7" />
      <path d="M17 9l3.4-2.3A1 1 0 0 1 22 7.5v6.5a1 1 0 0 1-1.6.8L17 12" />
      <path d="M4 5h2" />
      <path d="M8 19h7a2 2 0 0 0 2-2v-1" />
      <path d="M2 8v9a2 2 0 0 0 2 2h9" />
    </svg>
  );
}

export function NextIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="5 4 15 12 5 20" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  );
}

export function StopIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.6 19.6 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7 2 2 0 0 1 2-2.2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L7 10a16 16 0 0 0 6 6l1.1-1.2a2 2 0 0 1 2.1-.4c1 .3 2 .6 2.9.7a2 2 0 0 1 1.7 2Z" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="14" y1="4" x2="18" y2="4" />
    </svg>
  );
}

export function LogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 5h-4a2 2 0 0 0-2 2v2" />
      <circle cx="17" cy="12" r="5" />
      <path d="M3 13v1a5 5 0 0 0 5 5h2" />
    </svg>
  );
}

export function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M17.5 14.2A6.5 6.5 0 0 1 21.5 20" />
    </svg>
  );
}

export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2l8 3.5v5.6c0 5-3.4 8.6-8 10.4-4.6-1.8-8-5.4-8-10.4V5.5L12 2Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function SparkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="M5.6 5.6l2.1 2.1" />
      <path d="M16.3 16.3l2.1 2.1" />
      <path d="M18.4 5.6l-2.1 2.1" />
      <path d="M7.7 16.3l-2.1 2.1" />
    </svg>
  );
}

export function VideoCamIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m15 7 4.6-3.1a1 1 0 0 1 .4-.09A2 2 0 0 1 22 5.7v12.6a2 2 0 0 1-2 1.99c-.14 0-.28-.03-.4-.09L15 17" />
      <path d="M15 7v10" />
      <rect x="2" y="5" width="13" height="14" rx="2" />
    </svg>
  );
}

export function ArrowLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}