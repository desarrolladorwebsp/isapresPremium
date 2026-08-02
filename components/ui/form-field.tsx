import type { HTMLAttributes, LabelHTMLAttributes } from "react";
import { joinClasses } from "@/lib/utils";

export function FieldGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={joinClasses("space-y-2", className)} {...props} />;
}

export function FieldLabel({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={joinClasses("text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

export function FieldHint({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={joinClasses("text-xs text-foreground/65", className)} {...props} />
  );
}
