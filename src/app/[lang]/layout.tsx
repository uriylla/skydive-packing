import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import { I18nProvider } from "@/i18n/client";
import { LOCALES } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getI18n, getLocale } from "@/i18n/server";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.app.title, description: d.app.description };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale} dict={getDictionary(locale)}>
          <Nav />
          <main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
