import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

export function CountUp({
  to,
  from = 0,
  duration = 1.5,
  className = "",
  formatter = (val) => Math.round(val).toLocaleString(),
}: CountUpProps) {
  const [hasRendered, setHasRendered] = useState(false);
  const spring = useSpring(from, { damping: 20, stiffness: 50, duration: duration * 1000 });
  const display = useTransform(spring, (current) => formatter(current));

  useEffect(() => {
    setHasRendered(true);
    spring.set(to);
  }, [spring, to]);

  // Avoid hydration mismatch by rendering the final value directly on server/first render if needed
  if (!hasRendered) {
    return <span className={className}>{formatter(to)}</span>;
  }

  return <motion.span className={className}>{display}</motion.span>;
}
