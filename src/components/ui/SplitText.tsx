import { motion, Variants } from 'framer-motion';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  variants?: Variants;
}

export function SplitText({ text, className = '', delay = 0, variants }: SplitTextProps) {
  const words = text.split(' ');

  const defaultVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1 + delay,
        duration: 0.4,
        ease: [0.2, 0.65, 0.3, 0.9],
      },
    }),
  };

  return (
    <div className={`flex flex-wrap ${className}`}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          custom={i}
          variants={variants || defaultVariants}
          initial="hidden"
          animate="visible"
          className="mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
}
