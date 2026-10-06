import { useEffect, useState } from "react";

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
};

const Logo = () => (
  <div className="logo" aria-label="Pine">
    <span className="logo-mark">P</span>
    <span className="logo-name">Pine</span>
  </div>
);

function Field({ label, ...props }) {
  return <label className="field"><span>{label}</span><input {...props} /></label>;
}

function Auth({ register, setRegister, setUser }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api(register ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        body: JSON.stringify(register ? { name, email, password } : { email, password }),
      });
      setUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell page-enter">
      <div className="auth-card">
        <Logo />
        <div className="auth-copy">
          <h1>{register ? "Create your Pine Account" : "Sign in to Pine"}</h1>
          <p>{register ? "One account for everything Pine." : "Sign in to continue to your Pine Account."}</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          {register && <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />}
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus={!register} />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={register ? "new-password" : "current-password"} />
          {error && <div className="error-message">{error}</div>}
          <button className="continue-button" disabled={busy}>
            <span>{busy ? (register ? "Creating…" : "Signing in…") : register ? "Create Account" : "Continue"}</span><span className="arrow">›</span>
          </button>
        </form>
        <div className="auth-switch">
          {register ? "Already have a Pine Account?" : "Don't have a Pine Account?"}
          <button onClick={() => setRegister(!register)}>{register ? " Sign in" : " Create yours now"}</button>
        </div>
        <div className="auth-links">
          <button type="button" onClick={() => alert("Pine Privacy Policy")}>Privacy</button>
          <span> · </span>
          <button type="button" onClick={() => alert("Pine Terms of Use")}>Terms of Use</button>
        </div>
      </div>
    </div>
  );
}

function Account({ user, setUser, setDev }) {
  const [signingOut, setSigningOut] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const logout = async () => {
    setSigningOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      setUser(null);
      setDev(false);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="account-shell page-enter">
      <div className="account-card">
        <div className="account-top">
          <Logo />
          <button className="text-button" onClick={logout} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button>
        </div>
        <div className="profile-circle">{(user.name || user.email)[0].toUpperCase()}</div>
        <div className="account-copy">
          <h1>{user.name || "Your Pine Account"}</h1>
          <p>{user.email}</p>
        </div>
        <button className="account-row account-row-button" onClick={() => setShowDetails(!showDetails)}>
          <span>Account details</span><span>{showDetails ? "⌃" : "›"}</span>
        </button>
        {showDetails && (
          <div className="details-panel">
            <div><span>Name</span><b>{user.name || "Not set"}</b></div>
            <div><span>Email</span><b>{user.email}</b></div>
            <div><span>Session</span><b>Active</b></div>
          </div>
        )}
        <button className="continue-button" onClick={() => setDev(true)}>
          <span>Developer Account</span><span className="arrow">›</span>
        </button>
      </div>
    </div>
  );
}

function Developer({ setDev }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [section, setSection] = useState(null);

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/api/developer", { method: "POST" });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const sections = {
    Projects: ["Your Pine projects", "Create and manage projects connected to your developer account."],
    Credentials: ["Developer credentials", "API keys and developer access will appear here when configured."],
    Services: ["Pine services", "Connect and manage the Pine services available to your projects."],
  };

  return (
    <div className="developer-shell page-enter">
      <div className="developer-card">
        <div className="account-top">
          <Logo />
          <button className="text-button" onClick={() => setDev(false)}>Account</button>
        </div>
        <div className="developer-icon">⌘</div>
        <div className="account-copy"><h1>Pine Developer</h1><p>Build, test and ship with Pine.</p></div>

        <div className="developer-list">
          {Object.entries(sections).map(([key, value]) => (
            <button className="developer-item" key={key} onClick={() => setSection(section === key ? null : key)}>
              <span className="developer-item-copy"><b>{key}</b><small>{value[1]}</small></span>
              <i>{section === key ? "⌃" : "›"}</i>
            </button>
          ))}
        </div>

        {section && (
          <div className="developer-panel">
            <b>{sections[section][0]}</b>
            <span>{sections[section][1]}</span>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {done ? (
          <div className="success-message"><b>Developer Account ready.</b><span>Your Pine developer workspace has been created.</span></div>
        ) : (
          <button className="continue-button" onClick={create} disabled={busy}>
            <span>{busy ? "Creating…" : "Create Developer Account"}</span><span className="arrow">›</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [register, setRegister] = useState(false);
  const [developer, setDeveloper] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/auth/me").then((data) => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="boot-screen"><Logo /><div className="loader" /></div>;

  return (
    <div className="site">
      <header className="site-header">
        <Logo />
        {!user ? (
          <nav>
            <button onClick={() => { setDeveloper(false); setRegister(false); }}>Sign in</button>
            <button onClick={() => { setDeveloper(false); setRegister(true); }}>Create Account</button>
          </nav>
        ) : (
          <nav><button onClick={() => setDeveloper(!developer)}>{developer ? "Account" : "Developer"}</button></nav>
        )}
      </header>
      <main>
        {user ? (developer ? <Developer setDev={setDeveloper} /> : <Account user={user} setUser={setUser} setDev={setDeveloper} />) : <Auth register={register} setRegister={setRegister} setUser={setUser} />}
      </main>
      <footer>© {new Date().getFullYear()} Pine · Privacy · Terms</footer>
    </div>
  );
}
