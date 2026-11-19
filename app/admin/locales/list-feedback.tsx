"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const Feedback = createContext<(message: string, destination?: string) => void>(() => {});
export const useListFeedback = () => useContext(Feedback);

export default function ListFeedback({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const route = pathname + (query ? "?" + query : "");
  const [previousRoute, setPreviousRoute] = useState(route);
  const [notice, setNotice] = useState<{ route: string; message: string } | null>(null);
  if (previousRoute !== route) {
    setPreviousRoute(route);
    if (notice && notice.route !== route) setNotice(null);
  }
  return <Feedback.Provider value={(message, destination = route) => setNotice({ message, route: destination })}>
    <p role="status" className="admin-list-feedback">{notice?.route === route ? notice.message : ""}</p>
    {children}
  </Feedback.Provider>;
}
