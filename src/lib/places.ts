import "server-only";
import data from "@/data/places.json";

// Countries and cities (100k+ people) from GeoNames, built by scripts/build-places.py.
// Coordinates are city or country centres, never anyone's actual location.

export type Country = { code: string; name: string; lat: number; lng: number; tz?: string };
export type City = { id: number; name: string; cc: string; lat: number; lng: number; tz: string; region?: string };

const countries = data.countries as Country[];
const cities = data.cities as City[]; // most populous first
const countryByCode = new Map(countries.map((c) => [c.code, c]));
const cityById = new Map(cities.map((c) => [c.id, c]));

/** Country choices for forms: code + name only. */
export const COUNTRY_OPTIONS = countries.map(({ code, name }) => ({ code, name }));

export const getCountry = (code: string | null | undefined) => (code ? countryByCode.get(code) : undefined);
export const getCity = (id: number | null | undefined) => (id ? cityById.get(id) : undefined);

export const cityLabel = (c: City) => (c.region ? `${c.name} (${c.region})` : c.name);

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** City suggestions in one country: name starts with the query first, then contains it. */
export function searchCities(cc: string, q: string, limit = 8) {
  const needle = fold(q.trim());
  if (!countryByCode.has(cc)) return [];
  const inCountry = cities.filter((c) => c.cc === cc);
  if (!needle) return inCountry.slice(0, limit);
  const starts = inCountry.filter((c) => fold(c.name).startsWith(needle));
  const contains = inCountry.filter((c) => !fold(c.name).startsWith(needle) && fold(c.name).includes(needle));
  return [...starts, ...contains].slice(0, limit);
}

/** tz: the place's own timezone (city, or a single-zone country); null when a country spans several. */
export type Place = { key: string; label: string; country: string; lat: number; lng: number; tz: string | null };

/**
 * The public map position for a builder's chosen country/city: the city centre, or the
 * country centre when no city was chosen. Null if the choice isn't valid.
 */
export function placeFor(countryCode: string | null, cityId: number | null): Place | null {
  const country = getCountry(countryCode);
  if (!country) return null;
  const city = getCity(cityId);
  if (city && city.cc === country.code) {
    return { key: `c${city.id}`, label: `${cityLabel(city)}, ${country.name}`, country: country.name, lat: city.lat, lng: city.lng, tz: city.tz };
  }
  return { key: `n${country.code}`, label: country.name, country: country.name, lat: country.lat, lng: country.lng, tz: country.tz ?? null };
}

/** Database filter for everyone at a place key ("c123" city, "nPK" country-only). */
export function placeWhere(key: string): { cityId: number } | { countryCode: string; cityId: null } | null {
  if (/^c\d{1,10}$/.test(key) && getCity(Number(key.slice(1)))) return { cityId: Number(key.slice(1)) };
  if (/^n[A-Z]{2}$/.test(key) && getCountry(key.slice(1))) return { countryCode: key.slice(1), cityId: null };
  return null;
}
