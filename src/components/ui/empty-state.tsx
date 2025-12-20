import * as React from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title?: string;
  description: string;
  align?: "left" | "center";
  className?: string;
  children?: React.ReactNode;
};

export function EmptyState({
  title,
  description,
  align = "left",
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground",
        align === "center" ? "text-center" : "text-left",
        className
      )}
    >
      {title ? <p className="text-base font-semibold text-foreground">{title}</p> : null}
      <p className={title ? "mt-1" : ""}>{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
