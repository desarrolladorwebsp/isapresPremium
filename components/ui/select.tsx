import type { SelectHTMLAttributes } from "react";
import { joinClasses } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  className,
  options,
  placeholder,
  defaultValue,
  value,
  ...props
}: SelectProps) {
  const selectProps =
    value !== undefined
      ? { value }
      : { defaultValue: defaultValue ?? "" };

  return (
    <select
      {...selectProps}
      className={joinClasses(
        "h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
