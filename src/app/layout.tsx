import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "kine · Registro clínico para kinesiólogos",
    template: "%s · kine",
  },
  description:
    "Historia clínica, mapa corporal del dolor y evolución sesión a sesión. Todo tu consultorio de kinesiología en un solo lugar.",
  applicationName: "kine",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ececf0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${interTight.variable} h-full`}>
      <body className="min-h-full bg-canvas text-ink antialiased">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast:
                "!rounded-2xl !border-0 !bg-ink !text-white !shadow-float !font-sans !text-sm !px-4 !py-3",
              description: "!text-white/70",
              actionButton: "!bg-white !text-ink !rounded-full",
            },
          }}
        />
      </body>
    </html>
  );
}
