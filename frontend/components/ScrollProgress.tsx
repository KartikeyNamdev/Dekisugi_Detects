"use client";

import { useEffect, useState } from "react";
import { useScrollY } from "@/lib/useScrollProgress";

export default function ScrollProgress() {
  const scrollY = useScrollY();
  const [max, setMax] = useState(1);

  useEffect(() => {
    const update = () => setMax(Math.max(document.documentElement.scrollHeight - window.innerHeight, 1));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const progress = Math.min(scrollY / max, 1);

  return (
    <div className="scroll-progress" aria-hidden="true">
      <div className="scroll-progress-bar" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
