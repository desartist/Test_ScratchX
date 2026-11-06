/**
 * Web app manifest — served by Next.js at /manifest.webmanifest and linked
 * from every page. Without it Chrome only offers "Create shortcut" ("This
 * app cannot be installed") and shows a letter instead of the logo.
 * Icons: public/icons/ (rendered from public/logo-icon.svg).
 */
export default function manifest() {
  return {
    id: "/",
    name: "ScratchX",
    short_name: "ScratchX",
    description: "Digital scratch-card campaigns, rewards and customer engagement.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#010f44",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
