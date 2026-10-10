"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Overview", icon: "⌂" },
  { href: "/crm", label: "CRM", icon: "◉" },
  { href: "/marketing", label: "Marketing", icon: "↗" },
  { href: "/billing", label: "Billing", icon: "◈" },
  { href: "/analytics", label: "Analytics", icon: "▤" },
];

export function WorkspaceShell({ children, eyebrow, title, action }: { children: ReactNode; eyebrow: string; title: string; action?: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link href="/" className="brand"><span className="brand-mark">n</span><span>Nexovate</span><span className="brand-badge">BETA</span></Link>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switch"><span className="workspace-avatar">N</span><span><b>Nexus Studio</b><small>Free workspace</small></span><span className="switch-chevron">⌄</span></div>
        <div className="nav-label">PLATFORM</div>
        <nav className="side-nav">
          {navigation.map((item) => <Link href={item.href} key={item.href} className={`nav-link ${pathname === item.href ? "active" : ""}`}><span className="nav-icon">{item.icon}</span>{item.label}{item.href === "/marketing" && <span className="nav-count">3</span>}</Link>)}
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-spark">✳</span><b>Here for your next big thing.</b><p>Questions about your workspace?</p><a href="mailto:hello@nexovate.test">Talk to our team ↗</a></div><div className="profile-row"><span className="profile-avatar">JD</span><span><b>Jordan Davis</b><small>Workspace admin</small></span><span className="profile-menu">•••</span></div></div>
      </aside>
      <main className="main-column">
        <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-sep">/</span><b>{title}</b></div><div className="topbar-actions"><span className="live-indicator"><i /> All systems operational</span><button className="icon-button" aria-label="Notifications">♧<i className="notification-dot" /></button><span className="top-avatar">JD</span></div></header>
        <div className="page-wrap"><div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div>{action}</div>{children}</div>
        <footer className="footer"><span>© 2026 Nexovate Studio</span><span>Made for what’s next <b>✳</b></span></footer>
      </main>
    </div>
  );
}
