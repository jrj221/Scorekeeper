import { useState } from 'react';

/**
 * Manages a local draft of an object that only persists when explicitly saved.
 * Tracks dirty state so a "Save Changes" button can be shown conditionally.
 */
export function useDraft<T extends object>(initial: T | undefined, onSave: (draft: T) => void) {
  const [draft, setDraft] = useState<T | undefined>(initial);
  const [isDirty, setIsDirty] = useState(false);

  const patch = (fields: Partial<T>) => {
    setDraft(prev => (prev ? { ...prev, ...fields } : prev));
    setIsDirty(true);
  };

  const save = () => {
    if (!draft) return;
    onSave(draft);
    setIsDirty(false);
  };

  const reset = () => {
    setDraft(initial);
    setIsDirty(false);
  };

  return { draft, patch, isDirty, save, reset };
}
