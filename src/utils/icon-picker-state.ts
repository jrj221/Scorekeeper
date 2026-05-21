// Module-level pending icon — set by icon-picker screen, consumed by callers on focus
let _pending: string | null = null;

export function setPendingIcon(icon: string | null) {
  _pending = icon;
}

export function consumePendingIcon(): string | null {
  const v = _pending;
  _pending = null;
  return v;
}
