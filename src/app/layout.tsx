import type { ReactNode } from "react";
import "./styles.css";
import "@xterm/xterm/css/xterm.css";

export const metadata = {
  title: "SixCore Remote",
  description: "Gerenciamento remoto seguro de MikroTik RouterOS v7"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
