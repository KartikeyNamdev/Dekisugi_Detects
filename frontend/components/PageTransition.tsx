"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const OUT_DURATION_MS = 180;

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = usePrefersReducedMotion();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [stage, setStage] = useState<"in" | "out">("in");
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Adjust state during render in response to the pathname prop changing —
  // the React-documented alternative to doing this in an effect. Starts
  // the fade-out the same render the new route arrives, no extra
  // effect round-trip before anything happens.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (reduceMotion) {
      setDisplayChildren(children);
    } else {
      setStage("out");
    }
  }

  // The timer is a genuine side effect (an external clock), so it belongs
  // in an effect — only the state adjustment above needed moving out.
  useEffect(() => {
    if (stage !== "out") return;
    const outTimer = setTimeout(() => {
      setDisplayChildren(children);
      setStage("in");
    }, OUT_DURATION_MS);
    return () => clearTimeout(outTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  return (
    <div className={`page-transition page-transition-${stage}`}>{displayChildren}</div>
  );
}
