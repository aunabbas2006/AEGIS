"use client";

import { animate, useInView, useMotionValue, useTransform, motion } from "framer-motion";
import { useEffect, useRef } from "react";

interface Props {
  value: number;
  decimals?: number;
  suffix?: string;
}

/** Counts up from the previous value whenever `value` changes (and on first view). */
export function AnimatedNumber({ value, decimals = 0, suffix = "" }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const current = useMotionValue(0);
  const text = useTransform(current, (v) => `${v.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(current, value, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [current, inView, value]);

  return <motion.span ref={ref}>{text}</motion.span>;
}
