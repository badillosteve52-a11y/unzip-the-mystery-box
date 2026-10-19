export function Filtro({
  label,
  value,
  onChange,
  opciones,
  todos = "Todos",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opciones: { value: string; label: string }[];
  todos?: string | null;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-40 rounded-md border border-input bg-card px-2 text-sm text-foreground"
      >
        {todos !== null && <option value="">{todos}</option>}
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export const unicos = (xs: (string | null | undefined)[]) =>
  [...new Set(xs.filter((x): x is string => !!x))].sort().map((x) => ({ value: x, label: x }));
