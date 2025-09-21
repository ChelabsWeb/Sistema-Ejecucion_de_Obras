import * as React from "react";
import { cn } from "./utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  footer?: React.ReactNode;
}

export function Card({
  title,
  description,
  footer,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-6 shadow-sm",
        className
      )}
      {...props}
    >
      {title ? <h3 className="text-lg font-semibold leading-tight">{title}</h3> : null}
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {children}
      {footer ? <div className="pt-4 text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
