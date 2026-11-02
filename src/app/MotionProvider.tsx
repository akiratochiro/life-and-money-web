import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "motion/react";

const loadFeatures = () => import("./motionFeatures").then((module) => module.default);

/**
 * LazyMotion com `strict`: só o componente `m` pode ser usado (o `motion` completo carregaria
 * todas as animações no bundle inicial). `reducedMotion="user"` segue o prefers-reduced-motion:
 * para quem pediu menos movimento, deslocamentos e escalas são desligados e sobra só o fade.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: "easeOut" }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
