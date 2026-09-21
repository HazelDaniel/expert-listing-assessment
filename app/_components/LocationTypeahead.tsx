"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useDebouncedValue } from "../_hooks/useDebouncedValue";
import type { Status, LocationResult } from "@/search.types";
import { DEBOUNCE_MS, LISTBOX_ID, MIN_QUERY_LENGTH, NOMINATIM_ENDPOINT } from "../_config/search";



const resultCache = new Map<string, LocationResult[]>();

/** Exposed for tests, and for any caller that wants a hard cache refresh. */
export function clearLocationCache() {
  resultCache.clear();
}

function parseResults(raw: unknown): LocationResult[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any) => ({
    id: String(item.place_id),
    label: String(item.display_name),
    lat: String(item.lat),
    lon: String(item.lon),
  }));
}

export default function LocationTypeahead() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selected, setSelected] = useState<LocationResult | null>(null);

  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);


  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      setStatus("idle");
      setResults([]);
      setIsOpen(false);
      return;
    }

    const cached = resultCache.get(debouncedQuery);
    if (cached) {
      abortRef.current?.abort();
      requestIdRef.current += 1; // invalidate any request still in flight
      setResults(cached);
      setStatus(cached.length === 0 ? "empty" : "success");
      setIsOpen(true);
      setActiveIndex(-1);
      return;
    }

    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setIsOpen(true);

    const url = `${NOMINATIM_ENDPOINT}?format=json&addressdetails=0&limit=6&q=${encodeURIComponent(
      debouncedQuery
    )}`;

    fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (requestId !== requestIdRef.current) return; // a newer request has superseded this one
        const parsed = parseResults(data);
        resultCache.set(debouncedQuery, parsed);
        setResults(parsed);
        setStatus(parsed.length === 0 ? "empty" : "success");
        setActiveIndex(-1);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;
        setStatus("error");
        setResults([]);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  const showListbox =
    isOpen && (status === "loading" || status === "success" || status === "empty" || status === "error");

  const activeOptionId = useMemo(() => {
    const active = activeIndex >= 0 ? results[activeIndex] : undefined;
    return active ? `${LISTBOX_ID}-option-${active.id}` : undefined;
  }, [activeIndex, results]);

  function handleSelect(result: LocationResult) {
    setSelected(result);
    setQuery(result.label);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showListbox || results.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        if (activeIndex >= 0) {
          event.preventDefault();
          handleSelect(results[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  }

  return (
    <div className="typeahead">
      <label className="typeahead__label text-xl" htmlFor="location-input">
        Search a location
        <span className="size-6 inline-flex items-center justify-center">
          <svg className="scale-[1.2]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C12.8487 19 14.551 18.3729 15.9056 17.3199L19.2929 20.7071C19.6834 21.0976 20.3166 21.0976 20.7071 20.7071C21.0976 20.3166 21.0976 19.6834 20.7071 19.2929L17.3199 15.9056C18.3729 14.551 19 12.8487 19 11C19 6.58172 15.4183 3 11 3ZM5 11C5 7.68629 7.68629 5 11 5C14.3137 5 17 7.68629 17 11C17 14.3137 14.3137 17 11 17C7.68629 17 5 14.3137 5 11Z" fill="currentColor"></path> </g></svg>
        </span>
      </label>

      <div className="typeahead__field">
        <input
          id="location-input"
          type="text"
          role="combobox"
          aria-expanded={showListbox}
          aria-controls={LISTBOX_ID}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          placeholder="Try 'Lekki' or 'Ikeja'"
          className="typeahead__input"
          value={query}
          onChange={(event) => {
            setSelected(null);
            setQuery(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 100)}
        />
        {status === "loading" && (
          <span className="typeahead__spinner animate-spin" aria-hidden="true" />
        )}
      </div>
      <div className="typeahead__bg-container">
        <div className="typeahead__field-bg"></div>
      </div>

      {/* Screen-reader-only live region; the visible feedback lives in the listbox below */}
      <div aria-live="polite" className="sr-only typeahead__sr-status">
        {status === "loading" && "Searching…"}
        {status === "empty" && `No matches for '${debouncedQuery}'`}
        {status === "error" && "Something went wrong loading results."}
        {status === "success" && `${results.length} result${results.length === 1 ? "" : "s"} found`}
      </div>

      {showListbox && (
        <ul id={LISTBOX_ID} role="listbox" className="typeahead__listbox">
          {status === "loading" && results.length === 0 && (
            <li className="typeahead__row typeahead__row--muted" aria-hidden="true">
              Searching...
            </li>
          )}
          {status === "error" && (
            <li className="typeahead__row typeahead__row--muted" aria-hidden="true">
              Couldn't load results. Check your connection and try again.
            </li>
          )}
          {status === "empty" && (
            <li className="typeahead__row typeahead__row--muted" aria-hidden="true">
              No locations match "{debouncedQuery}".
            </li>
          )}
          {results.map((result, index) => (
            <li
              key={result.id}
              id={`${LISTBOX_ID}-option-${result.id}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`typeahead__row${index === activeIndex ? " typeahead__row--active" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => handleSelect(result)}
            >
              {result.label}
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <p className="typeahead__selection">
          <span className="typeahead__selection-label">Selected:</span>{" "}
          <span className="typeahead__selection-content">{selected.label} ({selected.lat}, {selected.lon})</span>
        </p>
      )}
    </div>
  );
}
