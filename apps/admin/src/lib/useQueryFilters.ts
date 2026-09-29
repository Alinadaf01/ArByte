import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/** Syncs a flat filter object to the URL query string — every admin list
 * page's filters live here, not in component state, so a reload or a
 * shared link reproduces the same view. */
export function useQueryFilters<T extends Record<string, string>>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = useMemo(() => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const raw = searchParams.get(key as string);
      if (raw !== null) result[key] = raw as T[typeof key];
    }
    return result;
  }, [searchParams, defaults]);

  const setFilters = useCallback(
    (patch: Partial<T>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined || value === "" || value === defaults[key])
            next.delete(key);
          else next.set(key, value);
        }
        if (!("page" in patch)) next.delete("page");
        return next;
      });
    },
    [setSearchParams, defaults],
  );

  return [values, setFilters] as const;
}
