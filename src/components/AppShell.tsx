import Link from "next/link";
import type { ReactNode } from "react";
import type { CurrentUser } from "@/server/auth/session";
import { LogoutButton } from "./LogoutButton";

export function AppShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div><div className="brand-mark">S</div><div className="brand-copy"><strong>SixCore Remote</strong><span>Secure Network Access</span></div></div>
      <nav>
        <Link href="/dashboard">Dashboard</Link><Link href="/companies">Empresas</Link><Link href="/devices">MikroTiks</Link><Link href="/account">Minha conta</Link>
        {user.role === "admin" && <><Link href="/users">Usuários</Link><Link href="/audit">Auditoria</Link></>}
      </nav>
      <div className="sidebar-user"><div><strong>{user.name}</strong><span>{user.role}</span></div><LogoutButton /></div>
    </aside>
    <main className="content">{children}</main>
  </div>
}
