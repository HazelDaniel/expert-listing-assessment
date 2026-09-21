import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates once `delayMs`
 * has passed without `value` changing again.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}