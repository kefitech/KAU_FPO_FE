// Single source of truth for soil-region colors/styling — mirrors
// zone-colors.ts. Unlike zones (a fixed 5-code set), soil regions aren't a
// fixed set of region codes (an uploaded GeoJSON can define any number of
// regions with arbitrary codes) -- but KAU's soil_type values ARE one of a
// known, fixed vocabulary (Laterite, Red, Alluvial, Black cotton, Forest
// and mountain, Organic, Sandy/Coastal), so color is keyed off soil_type
// (matched case-insensitively, tolerant of a trailing "soil" and of
// "Sandy" / "Coastal" being used separately), not the region code. A
// region whose soil_type doesn't match any of these falls back to a
// per-code hash color so it still gets a distinct, stable color instead of
// all collapsing to one default.

const SOIL_TYPE_COLORS: { match: RegExp; color: string }[] = [
  { match: /laterite/i, color: "#90532B" },
  { match: /red/i, color: "#E62A27" },
  { match: /alluvial/i, color: "#FDE910" },
  { match: /black\s*cotton/i, color: "#404041" },
  { match: /forest|mountain/i, color: "#F7931E" },
  { match: /organic/i, color: "#52AB33" },
  { match: /sandy|coastal/i, color: "#B4BDCF" },
];

const SOIL_REGION_PALETTE = [
  "#B5651D", // laterite brown
  "#D2B48C", // sandy/alluvial tan
  "#6B8E23", // forest loam green
  "#8B5A2B", // dark loam
  "#C97B3D", // red loam
  "#4A6741", // deep forest
  "#A0522D", // sienna
  "#7A6C5D", // clay grey-brown
];

export const DEFAULT_SOIL_REGION_COLOR = "#888780";

function hashCode(code: string): number {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash << 5) - hash + code.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Fallback for a soil_type that doesn't match the known KAU vocabulary. */
export function getSoilRegionColor(code: string | undefined): string {
  if (!code) return DEFAULT_SOIL_REGION_COLOR;
  return SOIL_REGION_PALETTE[hashCode(code) % SOIL_REGION_PALETTE.length];
}

/**
 * Primary color lookup — keyed off the region's soil_type (KAU's fixed
 * palette) with a stable per-code fallback for anything unrecognized.
 */
export function getSoilTypeColor(soilType: string | undefined, code: string | undefined): string {
  if (soilType) {
    const match = SOIL_TYPE_COLORS.find((entry) => entry.match.test(soilType));
    if (match) return match.color;
  }
  return getSoilRegionColor(code);
}

/**
 * Leaflet GeoJSON `style` prop, parameterized by opacity so callers can
 * offer an adjustable opacity control rather than a hardcoded value.
 */
export function makeSoilRegionStyle(fillOpacity: number) {
  return (feature?: GeoJSON.Feature) => {
    const props = feature?.properties as { code?: string; soil_type?: string } | undefined;
    const color = getSoilTypeColor(props?.soil_type, props?.code);
    return {
      color,
      weight: 2,
      fillColor: color,
      fillOpacity,
    };
  };
}

/** Leaflet GeoJSON `onEachFeature` prop — binds the standard soil region tooltip. */
export function bindSoilRegionTooltip(feature: GeoJSON.Feature, layer: L.Layer) {
  const props = feature.properties as { name_en?: string; soil_type?: string } | undefined;
  if (props?.name_en) {
    layer.bindTooltip(
      `<strong>${props.name_en}</strong>${props.soil_type ? `<br/>${props.soil_type}` : ""}`,
      { sticky: true },
    );
  }
}
