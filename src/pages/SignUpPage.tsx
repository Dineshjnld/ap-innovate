import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DISTRICTS, RANKS } from "@/data/mockData";
import { useAuth } from "@/hooks/use-auth";
import apPoliceLogo from "@/assets/ap-police-logo.png";
import dgpLogo from "@/assets/dgp.png";

const SignUpPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, signUp } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rank, setRank] = useState("");
  const [district, setDistrict] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedDistricts = useMemo(() => [...DISTRICTS].sort((a, b) => a.localeCompare(b)), []);

  if (isAuthenticated) {
    return <Navigate to="/hub" replace />;
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await signUp({
        name,
        email,
        password,
        rank,
        district,
      });
      toast.success("Account created successfully");
      navigate("/hub", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign up";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy-light to-navy-dark p-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between py-5 text-primary-foreground">
        <img src={apPoliceLogo} alt="AP Police" className="h-12 w-12 object-contain" />
        <p className="text-lg font-bold font-display">AP Police Innovation Hub</p>
        <img src={dgpLogo} alt="DGP" className="h-12 w-12 rounded-md object-cover" />
      </div>

      <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-primary-foreground/20 bg-primary-foreground/95 p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-foreground font-display">Create Officer Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use official metadata for onboarding</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Official Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="rank">Rank</Label>
              <select
                id="rank"
                title="Rank"
                value={rank}
                onChange={(event) => setRank(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Select rank</option>
                {RANKS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="district">District</Label>
              <select
                id="district"
                title="District"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Select district</option>
                {sortedDistricts.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Minimum 8 characters with uppercase, lowercase, and a number</p>
          </div>

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <p className="mt-5 text-sm text-muted-foreground">
          Already have an account? <Link to="/signin" className="font-semibold text-navy underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
