"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { removeWorldLocation, setWorldLocation, type WorldState } from "@/actions/world";
import { submitKeepingValues } from "@/lib/submit-keeping-values";

export type LocationDefaults = { countryCode: string; cityId: number | null; cityLabel: string; onWorldMap: boolean };

const input =
  "mt-1.5 w-full rounded-sm border border-line-strong bg-surface px-3 py-2.5 text-body transition-colors duration-120 placeholder:text-muted/70 focus:border-cobalt focus:outline-none aria-[invalid=true]:border-red";

/**
 * Country + optional city + map visibility. `plant` mode (the World Map dialog) treats pressing
 * "Plant my flag" as the opt-in; settings mode shows an explicit checkbox, off for new builders.
 */
export function LocationForm({
  countries,
  defaults,
  mode,
  onSaved,
  onRemoved,
}: {
  countries: { code: string; name: string }[];
  defaults: LocationDefaults;
  mode: "plant" | "settings";
  onSaved?: (state: WorldState) => void;
  onRemoved?: () => void;
}) {
  const [country, setCountry] = useState(defaults.countryCode);
  const [cityText, setCityText] = useState(defaults.cityLabel);
  const [cityId, setCityId] = useState<number | null>(defaults.cityId);
  const [suggestions, setSuggestions] = useState<{ id: number; label: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [removed, setRemoved] = useState(false);
  const listId = useId();

  const [state, action, pending] = useActionState(async (prev: WorldState, data: FormData) => {
    const result = await setWorldLocation(prev, data);
    if (result.ok) {
      setRemoved(false);
      onSaved?.(result);
    }
    return result;
  }, {});
  const e = state.errors ?? {};

  // City suggestions from our place list, as the builder types.
  useEffect(() => {
    if (!country || !open) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/world/cities?country=${country}&q=${encodeURIComponent(cityText)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j) => {
          setSuggestions(j.cities);
          setActive(0);
        })
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [country, cityText, open]);

  const choose = (c: { id: number; label: string }) => {
    setCityId(c.id);
    setCityText(c.label);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submitKeepingValues(action)} className="space-y-4">
        <div>
          <label htmlFor={`${listId}-country`} className="text-body font-medium">Country</label>
          <select
            id={`${listId}-country`}
            name="countryCode"
            value={country}
            onChange={(ev) => {
              setCountry(ev.target.value);
              setCityId(null);
              setCityText("");
            }}
            required
            aria-invalid={Boolean(e.countryCode)}
            className={input}
          >
            <option value="">Choose a country</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          {e.countryCode && <p className="mt-1 text-body-s text-red" role="alert">{e.countryCode}</p>}
        </div>

        <div className="relative">
          <label htmlFor={`${listId}-city`} className="text-body font-medium">
            City <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={`${listId}-city`}
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={`${listId}-list`}
            aria-autocomplete="list"
            aria-activedescendant={open && suggestions[active] ? `${listId}-opt-${suggestions[active].id}` : undefined}
            disabled={!country}
            value={cityText}
            placeholder={country ? "Start typing, e.g. Lahore" : "Choose a country first"}
            autoComplete="off"
            onChange={(ev) => {
              setCityText(ev.target.value);
              setCityId(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(ev) => {
              if (!open || suggestions.length === 0) return;
              if (ev.key === "ArrowDown") {
                ev.preventDefault();
                setActive((a) => (a + 1) % suggestions.length);
              } else if (ev.key === "ArrowUp") {
                ev.preventDefault();
                setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
              } else if (ev.key === "Enter") {
                ev.preventDefault();
                choose(suggestions[active]);
              } else if (ev.key === "Escape") {
                setOpen(false);
              }
            }}
            aria-invalid={Boolean(e.cityId)}
            className={input}
          />
          <input type="hidden" name="cityId" value={cityId ?? ""} />
          {open && suggestions.length > 0 && (
            <ul id={`${listId}-list`} role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-sm border border-line-strong bg-surface py-1 shadow-xl">
              {suggestions.map((c, i) => (
                <li
                  key={c.id}
                  id={`${listId}-opt-${c.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    choose(c);
                  }}
                  className={`cursor-pointer px-3 py-2 text-body ${i === active ? "bg-cobalt/15 text-ink" : "text-muted hover:bg-surface-2"}`}
                >
                  {c.label}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-body-s text-muted">
            {cityText && !cityId ? "Pick a city from the list, or clear it to show just your country." : "The map shows your city's centre (or your country's), never your exact location."}
          </p>
          {e.cityId && <p className="mt-1 text-body-s text-red" role="alert">{e.cityId}</p>}
        </div>

        {mode === "settings" ? (
          <label className="flex cursor-pointer items-start gap-3 border border-line-strong p-4 has-checked:border-amber has-checked:bg-amber/10">
            <input type="checkbox" name="onWorldMap" defaultChecked={defaults.onWorldMap} className="mt-1 size-4 accent-[var(--amber)]" />
            <span>
              <span className="block text-body font-semibold">Show me on the World Map</span>
              <span className="block text-body-s text-muted">Your name, photo and this place appear on the public map and your profile. Turn it off any time.</span>
            </span>
          </label>
        ) : (
          <input type="hidden" name="onWorldMap" value="on" />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || !country || Boolean(cityText && !cityId)} className="h-11 rounded-sm bg-cobalt px-5 text-body font-semibold text-on-cobalt disabled:opacity-50">
            {pending ? "saving…" : mode === "plant" ? "plant my flag" : "save location"}
          </button>
          {state.ok && mode === "settings" && (
            <span className="text-body-s text-green" role="status">
              {state.onMap ? `Saved. You're on the map in ${state.place?.label}.` : "Saved privately. You're not on the map."}
            </span>
          )}
        </div>
      </form>

      {(defaults.countryCode || state.ok) && !removed && (
        <form
          action={async () => {
            await removeWorldLocation();
            setRemoved(true);
            setCountry("");
            setCityId(null);
            setCityText("");
            onRemoved?.();
          }}
          className="border-t border-line pt-4"
        >
          <button type="submit" className="text-body-s font-semibold text-red hover:underline">
            remove my flag and location
          </button>
        </form>
      )}
      {removed && <p className="text-body-s text-muted" role="status">Removed. You&apos;re no longer on the map, and no location is saved.</p>}
    </div>
  );
}
