import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Search, FileText, Building2, DoorClosed, Loader2, User } from "lucide-react";

type SearchResult = {
  id: string;
  type: "tenant" | "contract" | "unit" | "property";
  title: string;
  subtitle?: string;
  href: string;
};

const ICONS: Record<SearchResult["type"], ReactNode> = {
  tenant: <User className="w-4 h-4 text-sky-500" />,
  contract: <FileText className="w-4 h-4 text-indigo-500" />,
  unit: <DoorClosed className="w-4 h-4 text-rose-500" />,
  property: <Building2 className="w-4 h-4 text-emerald-500" />,
};

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchId = useRef(0);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    const currentFetch = ++fetchId.current;
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      api
        .get<SearchResult[]>("/api/search", { params: { q: query }, signal: controller.signal })
        .then((res) => {
          if (fetchId.current !== currentFetch) return;
          setResults(res.data || []);
          setActiveIdx(0);
        })
        .catch((error: any) => {
          if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") return;
          console.error("Search failed", error);
        })
        .finally(() => {
          if (fetchId.current === currentFetch) {
            setLoading(false);
          }
        });
    }, 250);
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      if (!containerRef.current) return;
      if (containerRef.current.contains(ev.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleResults = useMemo(() => results.slice(0, 10), [results]);
  const showDropdown = open && (loading || query.trim().length > 0);

  function handleSelect(item: SearchResult) {
    setOpen(false);
    setQuery("");
    setResults([]);
    navigate(item.href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!visibleResults.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIdx((idx) => (idx + 1) % visibleResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIdx((idx) => (idx - 1 + visibleResults.length) % visibleResults.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      handleSelect(visibleResults[activeIdx]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="hidden md:block w-72 relative" ref={containerRef}>
      <div className="relative">
        <Search className="w-4 h-4 absolute top-1/2 start-3 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          className="w-full ps-10 pe-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
          placeholder="بحث عن مستأجر أو عقد أو وحدة..."
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {showDropdown ? (
        <div className="global-search-dropdown absolute mt-2 right-0 left-0 rounded-xl shadow-xl z-50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              جارٍ البحث...
            </div>
          ) : visibleResults.length ? (
            <ul className="max-h-72 overflow-y-auto py-1 scroll-area">
              {visibleResults.map((item, idx) => (
                <li key={item.id}>
                  <button
                    className={`global-search-item w-full px-4 py-2 text-right text-sm flex flex-col gap-1 rounded-lg transition ${idx === activeIdx ? "global-search-item--active" : ""
                      }`}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(item)}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium">{item.title}</span>
                      <span>{ICONS[item.type]}</span>
                    </span>
                    {item.subtitle ? (
                      <span className="global-search-item__subtitle text-xs">{item.subtitle}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-4 px-4 text-sm text-gray-500 text-right">لا توجد نتائج مطابقة.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
