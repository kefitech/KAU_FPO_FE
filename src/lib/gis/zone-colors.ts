// ── New file: src/lib/gis/zone-colors.ts ──
// Single source of truth for zone colors/styling — imported by both
// the farmer-facing cultivation area map and the admin zones map, so
// there's exactly one place to update if the palette ever changes.

export const ZONE_COLORS: Record<string, string> = {
  coastal_zone: "#1D9E75",
  high_ranges: "#7F77DD",
  southern_zone: "#D85A30",
  central_zone: "#C2348C",
  northern_zone: "#888780",
};

export const DEFAULT_ZONE_COLOR = "#888780";

export function getZoneColor(code: string | undefined): string {
  return (code && ZONE_COLORS[code]) || DEFAULT_ZONE_COLOR;
}

/**
 * Leaflet GeoJSON `style` prop, parameterized by opacity so callers can
 * offer an adjustable opacity control rather than a hardcoded value.
 */
export function makeZoneStyle(fillOpacity: number) {
  return (feature?: GeoJSON.Feature) => {
    const code = (feature?.properties as { code?: string } | undefined)?.code;
    const color = getZoneColor(code);
    return {
      color,
      weight: 2,
      fillColor: color,
      fillOpacity,
    };
  };
}

/** Leaflet GeoJSON `onEachFeature` prop — binds the standard zone tooltip. */
export function bindZoneTooltip(feature: GeoJSON.Feature, layer: L.Layer) {
  const props = feature.properties as { name_en?: string; soil_type?: string } | undefined;
  if (props?.name_en) {
    layer.bindTooltip(
      `<strong>${props.name_en}</strong>${props.soil_type ? `<br/>${props.soil_type}` : ""}`,
      { sticky: true },
    );
  }
}