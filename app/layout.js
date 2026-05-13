import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { shadesOfPurple } from "@clerk/themes";
import Providers from "./providers";
import { cookies } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Gemini Genie: Your AI Assistant",
  description: "a simple chat/content generation app utilizing gemini ai model",
};

export default async function RootLayout({ children }) {
  const user = await currentUser();
  const theme_from_cookie = (await cookies()).get("theme")?.value;
  // Priority: Clerk User Profile > Cookie > Default
  const theme =
    user?.unsafeMetadata?.theme || theme_from_cookie || "cupcake";
  return (
    <ClerkProvider
      appearance={{ signIn: shadesOfPurple, signUp: shadesOfPurple }}
    >
      <html lang="en" data-theme={theme}>
        <body className={inter.className}>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
