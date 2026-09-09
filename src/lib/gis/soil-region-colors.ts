// Single source of truth for soil-region colors/styling — mirrors
// zone-colors.ts, but soil regions aren't a fixed 5-code set like zones
// (an uploaded GeoJSON can define any number of regions with arbitrary
// codes), so colors are assigned deterministically by hashing the code
// against a fixed palette instead of a hardcoded code->color map.

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

export function getSoilRegionColor(code: string | undefined): string {
  if (!code) return DEFAULT_SOIL_REGION_COLOR;
  return SOIL_REGION_PALETTE[hashCode(code) % SOIL_REGION_PALETTE.length];
}

/**
 * Leaflet GeoJSON `style` prop, parameterized by opacity so callers can
 * offer an adjustable opacity control rather than a hardcoded value.
 */
export function makeSoilRegionStyle(fillOpacity: number) {
  return (feature?: GeoJSON.Feature) => {
    const code = (feature?.properties as { code?: string } | undefined)?.code;
    const color = getSoilRegionColor(code);
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
