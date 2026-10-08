import type { ReactNode } from "react";
import Analytics from "../analytics";
import "../globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ko"><body>{children}<Analytics /></body></html>;
}
