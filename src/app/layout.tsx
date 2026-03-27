import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const siteName = "Conecta Advogados";
const defaultTitle = "Conecta Advogados | Encontre Advogados e Gere Novos Clientes";
const defaultDescription =
  "Plataforma para conectar clientes e advogados com onboarding inteligente, leads qualificados e gestão de atendimento.";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  applicationName: siteName,
  keywords: [
    "advogado",
    "encontrar advogado",
    "leads jurídicos",
    "plataforma para advogados",
    "direito civil",
    "direito trabalhista",
    "consultoria jurídica",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: "legal services",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName,
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: "/brand/conectaImage.jpeg",
        width: 1200,
        height: 630,
        alt: "Conecta Advogados",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/brand/conectaImage.jpeg"],
  },
  icons: {
    icon: [
      { url: "/brand/conecta-logo.svg", type: "image/svg+xml" },
      { url: "/brand/conecta-logo.svg", rel: "shortcut icon", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/conecta-logo.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* META PIXEL - substituir pelo ID real */}
        {/* GTM - substituir pelo container ID */}
        {/* API de Conversoes - configurar via env */}
        {children}
      </body>
    </html>
  );
}
