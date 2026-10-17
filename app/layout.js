
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { DM_Sans, Lora } from "next/font/google";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

export const metadata = {
  title: "PrepIQ | AI Interview Marketplace",
  description:
    "Prepare smarter with PrepIQ, your AI-powered interview preparation platform.",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${lora.variable} ${dmSans.variable} flex min-h-screen flex-col font-sans`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Header />

            

<main className="flex flex-1 w-full items-center justify-center pt-20">
  {children}
</main>


            <Toaster richColors />

            <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
              Made by Priyam | PrepIQ
            </footer>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
