import logoRed from "@/assets/matmama-logo-red.png";
import logoWhite from "@/assets/matmama-logo-white.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  alt?: string;
}

/**
 * Theme-aware Matmama logo.
 * - Light mode: red logo
 * - Dark mode: white logo
 */
export function Logo({ className, alt = "Matmama by Rex Health" }: LogoProps) {
  return (
    <>
      <img
        src={logoRed}
        alt={alt}
        className={cn("block dark:hidden object-contain", className)}
      />
      <img
        src={logoWhite}
        alt={alt}
        className={cn("hidden dark:block object-contain", className)}
      />
    </>
  );
}
