import Script from "next/script";

export function ThemeBootScript() {
  return <Script src="/theme-boot.js" strategy="beforeInteractive" />;
}
