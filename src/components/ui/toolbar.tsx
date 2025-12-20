import * as React from "react";

import { cn } from "@/lib/utils";

type ToolbarProps = React.HTMLAttributes<HTMLDivElement>;

export function Toolbar({ className, ...props }: ToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/20 p-3 text-sm",
        className
      )}
      {...props}
    />
  );
}
