import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { AuthCallbackHandler } from "@/components/auth-callback-handler";
import { CartProvider } from "@/components/cart-provider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Form / Field - Objects for the everyday",
  description: "Considered essentials for the places you work, wander, and live.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
      <body>
        <AuthCallbackHandler>
          <CartProvider>{children}</CartProvider>
        </AuthCallbackHandler>
      </body>
    </html>
  );
}