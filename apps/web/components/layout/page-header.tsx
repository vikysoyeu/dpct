import Link from "next/link";
import clsx from "clsx";
import { BackButton } from "@/components/navigation/back-button";

type HeaderAction = {
  href?: string;
  label: string;
  variant?: "primary" | "secondary";
  type?: "link" | "back";
};

type PageHeaderProps = {
  title: string;
  subtitle: string;
  actions?: HeaderAction[];
};

export function PageHeader({ title, subtitle, actions = [] }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm font-medium text-text-subtle lg:text-base">{subtitle}</p>
      </div>

      {actions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          {actions.map((action) => {
            const isPrimary = action.variant !== "secondary";
            const className = clsx(
              "rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
              isPrimary
                ? "bg-gradient-to-br from-primary to-primary-strong text-white shadow-ambient"
                : "bg-surface-high text-text-main hover:bg-surface-low"
            );

            if (action.type === "back") {
              return (
                <BackButton key={`back-${action.label}`} fallbackHref={action.href} className={className}>
                  {action.label}
                </BackButton>
              );
            }

            return (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href ?? "/"}
                scroll={false}
                className={className}
              >
                {action.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
