import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import apPoliceLogo from "@/assets/ap-police-logo.png";
import dgpLogo from "@/assets/dgp.png";

const SignInPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/hub" replace />;
  }

  const fromPath = (location.state as { from?: string } | null)?.from ?? "/hub";

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await signIn({ email, password });
      toast.success("Signed in successfully");
      navigate(fromPath, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy-light to-navy-dark p-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between py-5 text-primary-foreground">
        <img src={apPoliceLogo} alt="AP Police" className="h-12 w-12 object-contain" />
        <p className="text-lg font-bold font-display">AP Police Innovation Hub</p>
        <img src={dgpLogo} alt="DGP" className="h-12 w-12 rounded-md object-cover" />
      </div>

      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-primary-foreground/20 bg-primary-foreground/95 p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-foreground font-display">Sign In</h1>
        <p className="mt-1 text-sm text-muted-foreground">Access the innovation collaboration workspace</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Official Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="officer@appolice.gov.in"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="mt-5 text-sm text-muted-foreground">
          New officer account? <Link to="/signup" className="font-semibold text-navy underline">Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default SignInPage;
