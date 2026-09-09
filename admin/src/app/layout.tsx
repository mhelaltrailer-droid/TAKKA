import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Cairo, Geist_Mono } from "next/font/google";
import { isClerkConfigured } from "@/lib/clerk";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-body",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

const display = Cairo({
  variable: "--font-display",
  subsets: ["arabic", "latin"],
  weight: ["700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "تكة | كله على تكة",
  description:
    "تكة منصة تربط العملاء بالمطابخ المنزلية لطلب الأكل البيتي بسهولة وسرعة داخل نطاقهم القريب.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const content = (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${display.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-body)]">
        {children}
      </body>
    </html>
  );

  if (!isClerkConfigured) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
