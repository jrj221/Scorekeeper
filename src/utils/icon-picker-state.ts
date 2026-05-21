// Module-level pending icon — set by icon-picker screen, consumed by callers on focus.
// undefined = nothing pending; null = user explicitly cleared the icon; string = icon name selected.
let _pending: string | null | undefined = undefined;

export function setPendingIcon(icon: string | null) {
  _pending = icon;
}

export function consumePendingIcon(): string | null | undefined {
  const v = _pending;
  _pending = undefined;
  return v;
}
