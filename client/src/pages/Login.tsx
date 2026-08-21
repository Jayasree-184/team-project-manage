import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useSession } from "@/auth/useSession";

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useSession();
  const [email, setEmail] = useState("admin@teammanager.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(""); try { await login.mutateAsync({ email, password }); navigate("/app"); } catch (err) { setError(err instanceof Error ? err.message : "Unable to authenticate."); } };
  const copyCredentials = async (role: "Admin" | "Member", credentials: string) => {
    try {
      await navigator.clipboard.writeText(credentials);
      setCopied(role);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("Clipboard access is unavailable. Select the credentials manually.");
    }
  };
  return <main className="auth-frame concrete"><section className="auth-card brutalist-border"><div className="mono text-[11px] mb-12">ATLAS OFFICE / SECURE ENTRY</div><h1 className="display text-6xl leading-[.86] mb-5">Make work<br /><span className="text-[#b85f35]">visible.</span></h1><p className="muted mb-8 max-w-sm">A project control system for teams moving through complex work.</p>{error && <div className="error-box mb-5">{error}</div>}<form onSubmit={submit} className="space-y-5"><label className="block"><span className="field-label mono">Operator email</span><input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label className="block"><span className="field-label mono">Access key</span><input className="field" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required /></label><button className="btn w-full" disabled={login.isPending}>{login.isPending ? "VERIFYING..." : "ENTER CONTROL ROOM →"}</button></form><div className="mt-8 border-t border-black/30 pt-4 text-xs muted"><div className="mono text-[9px] mb-2">DEMO ACCESS / COPY READY</div><div className="credential-row"><span>Admin: admin@teammanager.local / Admin123!</span><button type="button" className="login-copy-btn" onClick={() => copyCredentials("Admin", "admin@teammanager.local / Admin123!")} aria-label="Copy Admin demo credentials">{copied === "Admin" ? <Check size={14} /> : <Copy size={14} />}<span>{copied === "Admin" ? "COPIED" : "COPY"}</span></button></div><div className="credential-row"><span>Member: member@teammanager.local / Member123!</span><button type="button" className="login-copy-btn" onClick={() => copyCredentials("Member", "member@teammanager.local / Member123!")} aria-label="Copy Team Member demo credentials">{copied === "Member" ? <Check size={14} /> : <Copy size={14} />}<span>{copied === "Member" ? "COPIED" : "COPY"}</span></button></div><div className="mono credential-status" aria-live="polite">{copied ? `${copied.toUpperCase()} CREDENTIALS COPIED TO CLIPBOARD` : "Evaluator access only / non-production accounts"}</div></div></section></main>;
}
