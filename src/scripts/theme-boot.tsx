const THEME_BOOT_SCRIPT = `(function () {
  try {
    var root = document.documentElement;
    var PERSISTENCE = {"theme_mode":"client-cookie","theme_preset":"client-cookie","font":"client-cookie","content_layout":"client-cookie","navbar_style":"client-cookie","sidebar_variant":"client-cookie","sidebar_collapsible":"client-cookie"};
    var DEFAULTS = {"theme_mode":"light","theme_preset":"default","font":"inter","content_layout":"centered","navbar_style":"sticky","sidebar_variant":"inset","sidebar_collapsible":"icon"};

    function readCookie(name) {
      var match = document.cookie.split("; ").find(function(c) {
        return c.startsWith(name + "=");
      });
      return match ? decodeURIComponent(match.split("=")[1]) : null;
    }

    function readLocal(name) {
      try { return window.localStorage.getItem(name); } catch (e) { return null; }
    }

    function readPreference(key, fallback) {
      var mode = PERSISTENCE[key];
      var value = null;
      if (mode === "localStorage") value = readLocal(key);
      if (!value && (mode === "client-cookie" || mode === "server-cookie")) value = readCookie(key);
      if (!value || typeof value !== "string") return fallback;
      return value;
    }

    var rawMode = readPreference("theme_mode", DEFAULTS.theme_mode);
    var rawPreset = readPreference("theme_preset", DEFAULTS.theme_preset);
    var rawFont = readPreference("font", DEFAULTS.font);
    var rawContentLayout = readPreference("content_layout", DEFAULTS.content_layout);
    var rawNavbarStyle = readPreference("navbar_style", DEFAULTS.navbar_style);
    var rawSidebarVariant = readPreference("sidebar_variant", DEFAULTS.sidebar_variant);
    var rawSidebarCollapsible = readPreference("sidebar_collapsible", DEFAULTS.sidebar_collapsible);

    var isValidMode = rawMode === "dark" || rawMode === "light" || rawMode === "system";
    var mode = isValidMode ? rawMode : DEFAULTS.theme_mode;
    var resolvedMode = mode === "system" && window.matchMedia
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : mode;

    root.classList.toggle("dark", resolvedMode === "dark");
    root.setAttribute("data-theme-mode", mode);
    root.setAttribute("data-theme-preset", rawPreset || DEFAULTS.theme_preset);
    root.setAttribute("data-font", rawFont || DEFAULTS.font);
    root.setAttribute("data-content-layout", rawContentLayout || DEFAULTS.content_layout);
    root.setAttribute("data-navbar-style", rawNavbarStyle || DEFAULTS.navbar_style);
    root.setAttribute("data-sidebar-variant", rawSidebarVariant || DEFAULTS.sidebar_variant);
    root.setAttribute("data-sidebar-collapsible", rawSidebarCollapsible || DEFAULTS.sidebar_collapsible);
    root.style.colorScheme = resolvedMode === "dark" ? "dark" : "light";

  } catch (e) {
    console.warn("ThemeBootScript error:", e);
  }
})();`;

export function ThemeBootScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />;
}
