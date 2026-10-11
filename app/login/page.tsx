"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not sign in");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next && next.startsWith("/") ? next : "/crm";
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <form className="panel" onSubmit={submit} style={{ width: "100%", maxWidth: 380 }}>
        <div className="eyebrow">WELCOME BACK</div>
        <h1 style={{ margin: "7px 0 16px", fontSize: 22 }}>Sign in to Nexus</h1>

        {error ? <div className="notice notice-error">{error}</div> : null}

        <label className="field-label">
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field-label">
          Password
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        <button className="button button-primary" type="submit" disabled={busy} style={{ width: "100%", marginTop: 16 }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="muted-copy" style={{ marginTop: 14 }}>
          Demo accounts (password <b>demo1234</b>):
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="button button-outline" onClick={() => { setEmail("admin@nexus.demo"); setPassword("demo1234"); }}>
            Fill admin
          </button>
          <button type="button" className="button button-outline" onClick={() => { setEmail("member@nexus.demo"); setPassword("demo1234"); }}>
            Fill member
          </button>
        </div>
      </form>
    </div>
  );
}