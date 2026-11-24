import { Poppins } from "next/font/google";
import "./globals.css";
import Nav from "@/components/layout/Nav";
import { EditorProvider } from "@/components/providers/EditorProvider";
import { LiveDataProvider } from "@/components/providers/LiveDataProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata = {
  title: "IVP Pickleball 2026",
  description: "Live fixtures, scores, standings and playoffs — 10 teams, Swiss + IPL playoffs.",
  applicationName: "IVP Pickleball",
  // Installed to the home screen: full-screen, black status bar, own name.
  appleWebApp: { capable: true, title: "IVP Pickleball", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets safe-area insets work on notched phones
  themeColor: "#000000",
  interactiveWidget: "resizes-content", // Android: keyboard shrinks the page, so the chat box stays visible
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${poppins.variable} h-full`}>
      <body className="flex min-h-dvh flex-col bg-bg text-ink">
        <ToastProvider>
          <LiveDataProvider>
            <EditorProvider>
              <Nav />
              <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-6 lg:pt-6 lg:pb-12">
                {children}
              </main>
            </EditorProvider>
          </LiveDataProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
