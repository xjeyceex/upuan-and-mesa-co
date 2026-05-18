type Props = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export function PageHeader({ title, description, children }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 sm:gap-5">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-xl text-base leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
