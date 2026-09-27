import type { ComponentProps } from "react";
import { cn } from "./lib/utils";

// shadcn/ui's Skeleton primitive (https://ui.shadcn.com/docs/components/skeleton),
// recolored to the site's own --surface-alt token instead of Tailwind's default
// bg-muted since this project doesn't run shadcn's theme setup.
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-2xl bg-[var(--surface-alt)]", className)} {...props} />;
}
