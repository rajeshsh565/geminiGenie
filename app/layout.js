import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { shadesOfPurple} from "@clerk/themes";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Gemini Genie: Your AI Assistant",
  description: "a simple chat/content generation app utilizing gemini ai model",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider appearance={{signIn:shadesOfPurple, signUp: shadesOfPurple}}>
      <html lang="en">
        <body className={inter.className}>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
