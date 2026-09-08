"use client";

import { Component, type ReactNode } from "react";

import { MapPin, RefreshCw } from "lucide-react";

/**
 * Contains Leaflet's DOM lifecycle errors ("Cannot read properties of
 * undefined (reading 'appendChild')", "Map container is being reused")
 * so a transient re-mount doesn't blow up the whole DPR wizard page.
 *
 * Root cause: react-leaflet MapContainer is not resilient to React 19
 * StrictMode double-invoke + Turbopack HMR. The map's DOM refs can go
 * stale between the first tear-down and the second mount. Rather than
 * fight Leaflet's internal lifecycle, we catch the error and offer a
 * one-click "reload map" that force-remounts the child.
 */
interface State {
  hasError: boolean;
  bumpKey: number;
}

export class MapErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, bumpKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (typeof console !== "undefined") {
      console.warn("[MapErrorBoundary] Leaflet render error, showing recovery UI:", error);
    }
  }

  handleReload = () => {
    this.setState((s) => ({ hasError: false, bumpKey: s.bumpKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 text-center">
          <MapPin className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Map failed to load</p>
            <p className="text-xs text-muted-foreground">
              Coordinates are still saved. Click below to reload the map.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <RefreshCw className="h-3 w-3" /> Reload map
          </button>
        </div>
      );
    }
    return <div key={this.state.bumpKey}>{this.props.children}</div>;
  }
}
