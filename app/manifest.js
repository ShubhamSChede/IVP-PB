// Lets phones "Add to Home Screen" and open the site full-screen like an app.
export default function manifest() {
  return {
    name: "IVP Pickleball 2026",
    short_name: "IVP Pickleball",
    description: "Live scores, fixtures, standings and chat for IVP Pickleball 2026.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#2f313a",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
