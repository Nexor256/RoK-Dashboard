import React, { ReactNode } from "react";
import { motion, Variants } from "framer-motion";

interface AnimatedGroupProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
}

export function AnimatedGroup({ children, className, stagger = 0.1 }: AnimatedGroupProps) {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className={className}>
      {React.Children.map(children, (child) => (
        <motion.div variants={item}>{child}</motion.div>
      ))}
    </motion.div>
  );
}
