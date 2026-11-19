import type { ReactNode } from "react";

const paths = {
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></>,
  server: <><rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h2M7 17.5h2"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></>,
  layers: <><path d="m3 7 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 17l9 5 9-5"/></>,
  search: <><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/></>,
  edit: <><path d="m14 5 5 5M4 20l5-1L21 7l-5-5L4 14z"/></>,
  home: <><path d="m3 10 9-7 9 7M5.5 9v11h5v-6h3v6h5V9"/></>,
  store: <><path d="M3 10 5 4h14l2 6M4 10v2a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0v-2M5 14v6h14v-6M9 20v-4h5v4"/></>,
  review: <><rect x="4" y="4" width="16" height="17" rx="3"/><path d="M9 3h6v3H9zM8 13l3 3 5-6"/></>,
  sync: <><path d="M20 5v6h-6M4 19v-6h6M5 8a8 8 0 0 1 14-1l1 4M4 13l1 4a8 8 0 0 0 14-1"/></>,
  settings: <><path d="m9 4 1-2h4l1 2 2 1 2-.1 2 3-1 2v3l1 2-2 3-2-.1-2 1-1 2h-4l-1-2-2-1-2 .1-2-3 1-2v-3L3 8l2-3L7 5z"/><circle cx="12" cy="11.5" r="3"/></>,
  external: <><path d="M13 4h7v7m0-7L9 15M10 5H5v14h14v-5"/></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  time: <><path d="M5 3h14M5 21h14M7 3c0 5 1 6 5 9-4 3-5 4-5 9m10-18c0 5-1 6-5 9 4 3 5 4 5 9"/></>,
  alert: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3v.1"/></>,
  target: <><path d="M19 11a7.5 7.5 0 1 1-6-6M15 11a3.5 3.5 0 1 1-3-3M12 12l8-8m-1-2v3h3"/></>,
  glass: <><path d="m3 4 9 10 9-10H3Zm9 10v6m-4 1h8M7 8h10"/></>,
  mug: <><path d="M5 8h12v12H5zM17 9h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M8 11v6m4-6v6"/><path d="M5 8a2 2 0 0 1 0-4 3 3 0 0 1 5-1 3 3 0 0 1 5 1 2 2 0 0 1 2 4"/></>,
} satisfies Record<string, ReactNode>;

export type AdminIconName = keyof typeof paths;
export default function AdminIcon({ name, size = 20 }: { name: AdminIconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
