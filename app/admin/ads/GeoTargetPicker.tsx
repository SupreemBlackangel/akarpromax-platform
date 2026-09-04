"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchGeoLevel } from "@/src/lib/geo-registry-cache";

/**
 * Geographic targeting, chosen from the location registry rather than typed.
 *
 * This exists because the free-text boxes it replaces carried the placeholders
 * `om-muscat, sa-riyadh` and `om-muscat-governorate`, and that format cannot
 * match. `AdSlot` sends `cityId: geo.city`, and `geo.city` is a bare registry
 * code -- `JEDDAH`, not `sa-jeddah`. `isGeoMatch` lowercases both sides and
 * compares them for equality, so a campaign following the placeholder was
 * approved, activated, and invisible forever. Proved against production:
 *
 *   cityId=jeddah     -> the ad is served
 *   cityId=sa-jeddah  -> nothing
 *
 * A corrected placeholder would have been a smaller change and a worse one: it
 * would still let the next person type a code that does not exist. Selecting
 * from the registry makes the stored value correct by construction, because it
 * IS the value the matcher will be handed.
 */

export type GeoRow = { id: string; code: string | null; nameAr: string; nameEn: string };

type Level = "governorates" | "cities" | "districts";

type Group = { parent: GeoRow; rows: GeoRow[] };

/** The exact string the matcher compares. Mirrors `optionValue` in LocationCluster. */
export function targetValue(row: GeoRow): string {
  return (row.code?.trim() || row.id).toLowerCase();
}

/**
 * Compare the way the matcher does, which is case-insensitively.
 *
 * The database holds `["JEDDAH"]` -- entered before the registry codes were
 * settled -- and the admin route hands it back verbatim. `isGeoMatch`
 * lowercases both sides so the live campaign works, but a picker comparing
 * `"JEDDAH"` with `"jeddah"` would show Jeddah UNCHECKED and list `JEDDAH`
 * under "not in the registry". A moderator following that warning would strip
 * the targeting off a running campaign.
 */
const norm = (value: string): string => value.trim().toLowerCase();
const has = (list: string[], value: string): boolean => list.some((item) => norm(item) === norm(value));

async function fetchGeo(type: "countries" | Level, parentId?: string): Promise<GeoRow[]> {
  // One request per list, shared with the public shell -- see geo-registry-cache.
  return fetchGeoLevel(type, parentId) as Promise<GeoRow[]>;
}

/** Load one level for many parents at once, keeping each parent as the heading. */
async function fetchLevel(level: Level, parents: GeoRow[]): Promise<Group[]> {
  return Promise.all(parents.map(async (parent) => ({ parent, rows: await fetchGeo(level, parent.id) })));
}

function LevelPicker({
  title,
  groups,
  selected,
  onToggle,
  emptyNote,
}: {
  title: string;
  groups: Group[];
  selected: string[];
  onToggle: (value: string) => void;
  emptyNote: string;
}) {
  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  return (
    <fieldset className="ads-choice-fieldset">
      <legend>{title}</legend>
      {total === 0 ? (
        <p className="ads-geo-empty">{emptyNote}</p>
      ) : (
        groups
          .filter((group) => group.rows.length > 0)
          .map((group) => (
            <div key={group.parent.id} className="ads-geo-group">
              <strong>{group.parent.nameAr}</strong>
              <div>
                {group.rows.map((row) => {
                  const value = targetValue(row);
                  return (
                    <label key={row.id}>
                      <input type="checkbox" checked={has(selected, value)} onChange={() => onToggle(value)} />
                      {row.nameAr}
                      <small dir="ltr"> {value}</small>
                    </label>
                  );
                })}
              </div>
            </div>
          ))
      )}
    </fieldset>
  );
}

export default function GeoTargetPicker({
  countryCodes,
  regionIds,
  cities,
  districtIds,
  onChange,
}: {
  countryCodes: string[];
  regionIds: string[];
  cities: string[];
  districtIds: string[];
  onChange: (field: "regionIds" | "cities" | "districtIds", next: string[]) => void;
}) {
  const [countries, setCountries] = useState<GeoRow[]>([]);
  const [governorates, setGovernorates] = useState<Group[]>([]);
  const [cityGroups, setCityGroups] = useState<Group[]>([]);
  const [districtGroups, setDistrictGroups] = useState<Group[]>([]);

  useEffect(() => {
    let active = true;
    void fetchGeo("countries").then((rows) => {
      if (active) setCountries(rows);
    });
    return () => {
      active = false;
    };
  }, []);

  // Keyed by the joined codes rather than the array, so a re-render with an
  // equal-but-new array does not refetch every level underneath it.
  const countryKey = countryCodes.join(",");
  const selectedCountries = useMemo(
    () => countries.filter((row) => has(countryCodes, targetValue(row))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [countries, countryKey],
  );

  useEffect(() => {
    let active = true;
    if (selectedCountries.length === 0) return () => { active = false; };
    void fetchLevel("governorates", selectedCountries).then((result) => {
      if (active) setGovernorates(result);
    });
    return () => {
      active = false;
    };
  }, [selectedCountries]);

  // Shown, rather than stored: deselecting a country must drop its governorates
  // from the screen, and clearing state inside the effect that loads it is what
  // triggers a cascading render.
  const governorateGroups = useMemo(
    () => governorates.filter((group) => selectedCountries.some((row) => row.id === group.parent.id)),
    [governorates, selectedCountries],
  );

  const regionKey = regionIds.join(",");
  const selectedGovernorates = useMemo(
    () => governorateGroups.flatMap((group) => group.rows).filter((row) => has(regionIds, targetValue(row))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [governorateGroups, regionKey],
  );

  useEffect(() => {
    let active = true;
    if (selectedGovernorates.length === 0) return () => { active = false; };
    void fetchLevel("cities", selectedGovernorates).then((result) => {
      if (active) setCityGroups(result);
    });
    return () => {
      active = false;
    };
  }, [selectedGovernorates]);

  const visibleCityGroups = useMemo(
    () => cityGroups.filter((group) => selectedGovernorates.some((row) => row.id === group.parent.id)),
    [cityGroups, selectedGovernorates],
  );

  const cityKey = cities.join(",");
  const selectedCities = useMemo(
    () => visibleCityGroups.flatMap((group) => group.rows).filter((row) => has(cities, targetValue(row))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleCityGroups, cityKey],
  );

  useEffect(() => {
    let active = true;
    if (selectedCities.length === 0) return () => { active = false; };
    void fetchLevel("districts", selectedCities).then((result) => {
      if (active) setDistrictGroups(result);
    });
    return () => {
      active = false;
    };
  }, [selectedCities]);

  const visibleDistrictGroups = useMemo(
    () => districtGroups.filter((group) => selectedCities.some((row) => row.id === group.parent.id)),
    [districtGroups, selectedCities],
  );

  const toggle = useCallback(
    (field: "regionIds" | "cities" | "districtIds", current: string[], value: string) => {
      onChange(
        field,
        has(current, value)
          ? current.filter((item) => norm(item) !== norm(value))
          : [...current, value],
      );
    },
    [onChange],
  );

  // A campaign saved before this picker existed may hold a value the registry
  // does not offer -- including one that can never match. Showing it is the
  // point: it is removable, and until it is removed the campaign is not
  // silently rewritten just by opening the form.
  const known = useMemo(() => {
    const set = new Set<string>();
    for (const group of [...governorateGroups, ...visibleCityGroups, ...visibleDistrictGroups]) {
      for (const row of group.rows) set.add(targetValue(row));
    }
    return set;
  }, [governorateGroups, visibleCityGroups, visibleDistrictGroups]);

  const strays = [
    ...regionIds.filter((value) => !known.has(norm(value))).map((value) => ({ field: "regionIds" as const, value })),
    ...cities.filter((value) => !known.has(norm(value))).map((value) => ({ field: "cities" as const, value })),
    ...districtIds.filter((value) => !known.has(norm(value))).map((value) => ({ field: "districtIds" as const, value })),
  ];

  return (
    <div className="ads-geo-picker">
      <LevelPicker
        title="المناطق / المحافظات"
        groups={governorateGroups}
        selected={regionIds}
        onToggle={(value) => toggle("regionIds", regionIds, value)}
        emptyNote={
          countryCodes.length === 0
            ? "لم تُحدَّد دولة — الإعلان يظهر في كل الدول. حدِّد دولة أعلاه لاختيار مناطقها."
            : "لا توجد مناطق مسجّلة لهذه الدولة في دليل المواقع بعد."
        }
      />
      <LevelPicker
        title="المدن"
        groups={visibleCityGroups}
        selected={cities}
        onToggle={(value) => toggle("cities", cities, value)}
        emptyNote="اختر منطقة لعرض مدنها."
      />
      <LevelPicker
        title="الأحياء"
        groups={visibleDistrictGroups}
        selected={districtIds}
        onToggle={(value) => toggle("districtIds", districtIds, value)}
        emptyNote="اختر مدينة لعرض أحيائها."
      />

      {strays.length > 0 && (
        <div className="ads-geo-strays">
          <strong>قيم محفوظة غير موجودة في دليل المواقع</strong>
          <p>
            هذه القيم لن تطابق أي زائر ما لم تكن رمزاً حقيقياً في الدليل — مثل <span dir="ltr">sa-jeddah</span>{" "}
            التي لا تطابق شيئاً، بينما <span dir="ltr">jeddah</span> تطابق. احذفها واختر البديل من القوائم أعلاه.
          </p>
          <div>
            {strays.map(({ field, value }) => (
              <button
                key={`${field}:${value}`}
                type="button"
                onClick={() =>
                  toggle(field, field === "regionIds" ? regionIds : field === "cities" ? cities : districtIds, value)
                }
              >
                <span dir="ltr">{value}</span> ✕
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
