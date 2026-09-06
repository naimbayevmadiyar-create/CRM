import { cn } from "@/lib/format";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Field({ label, className, ...rest }: InputProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <input
        {...rest}
        className={cn(
          "h-12 w-full rounded-[var(--radius-card)] border border-border bg-surface px-4",
          "text-text outline-none transition-colors placeholder:text-muted",
          "focus:border-primary",
          className,
        )}
      />
    </label>
  );
}

type AreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string };

export function TextArea({ label, className, ...rest }: AreaProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <textarea
        {...rest}
        className={cn(
          "min-h-24 w-full rounded-[var(--radius-card)] border border-border bg-surface",
          "px-4 py-3 text-text outline-none transition-colors placeholder:text-muted",
          "focus:border-primary",
          className,
        )}
      />
    </label>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { label: string };

export function Select({ label, className, children, ...rest }: SelectProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <select
        {...rest}
        className={cn(
          "h-12 w-full rounded-[var(--radius-card)] border border-border bg-surface px-3",
          "text-text outline-none transition-colors focus:border-primary",
          className,
        )}
      >
        {children}
      </select>
    </label>
  );
}
