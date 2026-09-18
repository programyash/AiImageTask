interface ModelBadgeProps {
  model: string;
  /** False when no API key is configured; the dot turns amber. */
  ready: boolean;
}

/** Small pill naming the Gemini model in use. */
export function ModelBadge({ model, ready }: ModelBadgeProps) {
  return (
    <span
      className="inline-flex h-8 items-center gap-2 rounded-full border border-line bg-muted/70 px-3 text-[13px] font-medium text-ink-2"
      title={ready ? `Using ${model}` : 'No API key configured'}
    >
      <span
        className={`h-2 w-2 rounded-full ${ready ? 'bg-brand-600' : 'bg-amber-500'}`}
        aria-hidden="true"
      />
      <span className="max-w-[180px] truncate">{model}</span>
    </span>
  );
}
