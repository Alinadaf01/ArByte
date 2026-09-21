"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface SearchContextValue {
  term: string;
  setTerm: (term: string) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

/**
 * جستجوی سراسری هدر — همان چیزی که در DataTable صفحه‌ی جاری فیلتر می‌کند
 * (معادل ساده‌شده‌ی runGlobalSearch در قالب مرجع). هر صفحه‌ای که جدول دارد
 * از `usePageSearch()` می‌خواند.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [term, setTerm] = useState("");
  const value = useMemo(() => ({ term, setTerm }), [term]);
  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function usePageSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("usePageSearch must be used within SearchProvider");
  return ctx;
}
