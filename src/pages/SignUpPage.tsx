import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  BadgeCheck,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { DISTRICTS, RANKS } from "@/data/mockData";
import { useAuth } from "@/hooks/use-auth";
import apPoliceLogo from "@/assets/ap-police-logo.png";
import dgpLogo from "@/assets/dgp.png";

/* ─── password strength util ─────────────────────────────────────────────── */
const getStrength = (pw: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
  if (score === 3) return { score, label: "Fair", color: "bg-amber-400" };
  if (score === 4) return { score, label: "Good", color: "bg-lime-400" };
  return { score, label: "Strong", color: "bg-emerald-500" };
};

/* ─── reusable input row ─────────────────────────────────────────────────── */
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

/* ─── shared input classes ───────────────────────────────────────────────── */
const inputCls =
  "h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all";

const selectCls =
  "h-11 w-full rounded-lg border border-white/10 bg-[#141929] px-3 text-sm text-white focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all";

/* ─── main page ─────────────────────────────────────────────────────────── */
const SignUpPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, signUp } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rank, setRank] = useState("");
  const [district, setDistrict] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const sortedDistricts = useMemo(() => [...DISTRICTS].sort((a, b) => a.localeCompare(b)), []);
  const strength = useMemo(() => getStrength(password), [password]);

  if (isAuthenticated) {
    return <Navigate to="/hub" replace />;
  }

  const validate = (): string | null => {
    if (!name.trim()) return "Full name is required.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Enter a valid email address.";
    if (!rank) return "Please select your rank.";
    if (!district) return "Please select your district.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
    if (!/[0-9]/.test(password)) return "Password must contain a number.";
    return null;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      setFieldError(error);
      return;
    }

    setFieldError(null);
    setIsSubmitting(true);
    try {
      await signUp({ name: name.trim(), email: email.trim(), password, rank, district });
      toast.success("Account created! Welcome to the Innovation Hub.");
      navigate("/hub", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to create account. Please try again.";
      setFieldError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0f1e] flex flex-col">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[550px] w-[550px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-700/10 blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[200px] w-[400px] rounded-full bg-amber-500/5 blur-[80px]" />
      </div>

      {/* Top nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <img src={apPoliceLogo} alt="AP Police" className="h-11 w-11 object-contain drop-shadow-lg" />
        <div className="text-center">
          <p className="text-base font-bold tracking-wide text-white font-display">AP Police Innovation Hub</p>
          <p className="text-[11px] text-slate-400 tracking-widest uppercase">PRISM · Officer Registration</p>
        </div>
        <img src={dgpLogo} alt="DGP" className="h-11 w-11 rounded-lg object-cover shadow-lg" />
      </header>

      {/* Card */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Badge */}
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Officer Account Registration
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <h1 className="text-2xl font-bold text-white font-display">Create Officer Account</h1>
            </div>

            <form onSubmit={onSubmit} noValidate className="space-y-5">
              {/* Row 1: Name + Email */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="name" label="Full Name">
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="DySP Ravi Kumar"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setFieldError(null); }}
                      required
                      className={inputCls + " pl-10"}
                    />
                  </div>
                </Field>

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
                      className={inputCls + " pl-10"}
                    />
                  </div>
                </Field>
              </div>

              {/* Row 2: Rank + District */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="rank" label="Rank">
                  <div className="relative">
                    <BadgeCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <select
                      id="rank"
                      value={rank}
                      onChange={(e) => { setRank(e.target.value); setFieldError(null); }}
                      required
                      className={selectCls + " pl-10"}
                    >
                      <option value="" disabled>Select rank…</option>
                      {RANKS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </Field>

                <Field id="district" label="District">
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <select
                      id="district"
                      value={district}
                      onChange={(e) => { setDistrict(e.target.value); setFieldError(null); }}
                      required
                      className={selectCls + " pl-10"}
                    >
                      <option value="" disabled>Select district…</option>
                      {sortedDistricts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </Field>
              </div>

              {/* Password */}
              <Field
                id="password"
                label="Password"
                hint="Min. 8 chars with uppercase, lowercase, and a number."
              >
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldError(null); }}
                    required
                    className={inputCls + " pl-10 pr-11"}
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

                {/* Strength meter */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= strength.score ? strength.color : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Password strength:{" "}
                      <span
                        className={
                          strength.score <= 2
                            ? "text-red-400"
                            : strength.score === 3
                            ? "text-amber-400"
                            : strength.score === 4
                            ? "text-lime-400"
                            : "text-emerald-400"
                        }
                      >
                        {strength.label}
                      </span>
                    </p>
                  </div>
                )}
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
                className="mt-2 h-11 w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-sm font-bold text-navy-dark shadow-lg transition-all hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating account…
                  </span>
                ) : (
                  "Create Officer Account"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="font-semibold text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-600">
            All activity on this platform is logged and monitored for security.
          </p>
        </div>
      </main>
    </div>
  );
};

export default SignUpPage;
