import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import apPoliceLogo from "@/assets/ap-police-logo.png";
import dgpLogo from "@/assets/dgp.png";

/* ─── tiny reusable field wrapper ───────────────────────────────────────── */
const Field = ({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-semibold text-slate-200">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);

/* ─── main page ─────────────────────────────────────────────────────────── */
const SignInPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  /* Redirect if already authenticated */
  if (!authLoading && isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from ?? "/hub";
    return <Navigate to={from} replace />;
  }

  const fromPath = (location.state as { from?: string } | null)?.from ?? "/hub";

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldError(null);

    if (!email.trim() || !password) {
      setFieldError("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      toast.success("Welcome back! Signed in successfully.");
      navigate(fromPath, { replace: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to sign in. Please try again.";
      setFieldError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0f1e] flex flex-col">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-700/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-amber-500/5 blur-[100px]" />
      </div>

      {/* Top nav bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <img src={apPoliceLogo} alt="AP Police" className="h-11 w-11 object-contain drop-shadow-lg" />
        <div className="text-center">
          <p className="text-base font-bold tracking-wide text-white font-display">AP Police Innovation Hub</p>
          <p className="text-[11px] text-slate-400 tracking-widest uppercase">PRISM · Secure Portal</p>
        </div>
        <img src={dgpLogo} alt="DGP" className="h-11 w-11 rounded-lg object-cover shadow-lg" />
      </header>

      {/* Card */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Badge */}
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400 shadow-inner">
              <ShieldCheck className="h-3.5 w-3.5" />
              Authorised Personnel Only
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
            <h1 className="text-2xl font-bold text-white font-display">Sign In</h1>
            <p className="mt-1 text-sm text-slate-400">
              Access the innovation collaboration workspace
            </p>

            <form className="mt-7 space-y-5" onSubmit={onSubmit} noValidate>
              {/* Email */}
              <Field id="email" label="Official Email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="officer@appolice.gov.in"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldError(null); }}
                    required
                    className="h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
              </Field>

              {/* Password */}
              <Field id="password" label="Password">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldError(null); }}
                    required
                    className="h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-11 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              {/* Inline error */}
              {fieldError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {fieldError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="relative mt-2 h-11 w-full overflow-hidden rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-sm font-bold text-navy-dark shadow-lg transition-all hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Verifying…
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              New officer?{" "}
              <Link
                to="/signup"
                className="font-semibold text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors"
              >
                Create an account
              </Link>
            </p>
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-[11px] text-slate-600">
            All activity on this platform is logged and monitored for security.
          </p>
        </div>
      </main>
    </div>
  );
};

export default SignInPage;
