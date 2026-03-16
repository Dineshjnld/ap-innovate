import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  FolderKanban,
  Workflow,
  BadgeCheck,
  MessagesSquare,
  Users,
  Search,
} from "lucide-react";
import apPoliceLogo from "@/assets/ap-police-logo.png";
import dgpLogo from "@/assets/dgp.png";
import cmPortrait from "@/assets/cm.png";
import dgpPortrait from "@/assets/dgp.png";

const platformFeatures = [
  {
    title: "Central Innovation Repository",
    description: "Maintain a single statewide source of approved, in-review, and draft innovations.",
    icon: <FolderKanban className="h-5 w-5" />,
  },
  {
    title: "Structured Approval Workflow",
    description: "Route ideas through rank-based review with comments, status transitions, and decision history.",
    icon: <Workflow className="h-5 w-5" />,
  },
  {
    title: "Role-Aware Governance",
    description: "Enable officers, command leadership, and administrators with secure responsibility-based controls.",
    icon: <BadgeCheck className="h-5 w-5" />,
  },
  {
    title: "Live Discussions",
    description: "Support threaded project conversations for implementation notes, clarifications, and field feedback.",
    icon: <MessagesSquare className="h-5 w-5" />,
  },
  {
    title: "Officer Collaboration Network",
    description: "Promote cross-district collaboration with professional profiles, connections, and engagement signals.",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Unified Discovery",
    description: "Search innovations, officers, and discussions quickly for faster execution and reduced duplication.",
    icon: <Search className="h-5 w-5" />,
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-x-0 top-0 z-50 border-b border-navy-light gradient-navy">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid h-20 grid-cols-3 items-center">
            <img src={apPoliceLogo} alt="AP Police" className="justify-self-start h-12 w-12 sm:h-14 sm:w-14 object-contain" />
            <p className="justify-self-center text-base sm:text-2xl font-bold text-primary-foreground font-display whitespace-nowrap">
              AP POLICE Innovation Hub
            </p>
            <img src={dgpLogo} alt="DGP" className="justify-self-end h-12 w-12 sm:h-14 sm:w-14 rounded-md object-cover border border-gold/30" />
          </div>
        </div>
      </div>

      <header className="relative overflow-hidden border-b border-border bg-gradient-to-br from-navy via-navy-light to-navy-dark pt-20">
        <div className="absolute -top-24 -right-12 h-64 w-64 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-info/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold-light">
                <Sparkles className="h-3.5 w-3.5" />
                AP Police - AI Collaboration Layer
              </p>
              <h1 className="mt-4 text-3xl font-black leading-tight text-primary-foreground md:text-5xl font-display">
                AI-Driven Innovation and Collaboration for Law Enforcement
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-primary-foreground/75 md:text-base">
                A secure internal workspace for officers to submit innovations, collaborate across districts,
                track approvals, discuss implementation, and build institutional knowledge.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/signin"
                  className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-navy-dark hover:bg-gold-dark"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="rounded-lg border border-primary-foreground/30 px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Sign Up
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="grid gap-3 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-4 backdrop-blur-sm">
                <div className="rounded-xl border border-primary-foreground/10 bg-navy-light/35 p-3 text-primary-foreground">
                  <div className="flex items-center gap-3">
                    <img src={cmPortrait} alt="Chief Minister" className="h-14 w-14 rounded-lg object-cover" />
                    <div>
                      <p className="text-xs text-primary-foreground/70">Leadership</p>
                      <p className="text-sm font-semibold">Hon'ble Chief Minister, Andhra Pradesh</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-primary-foreground/10 bg-navy-light/35 p-3 text-primary-foreground">
                  <div className="flex items-center gap-3">
                    <img src={dgpPortrait} alt="Director General of Police" className="h-14 w-14 rounded-lg object-cover" />
                    <div>
                      <p className="text-xs text-primary-foreground/70">Police Command</p>
                      <p className="text-sm font-semibold">Director General of Police (HoPF), Andhra Pradesh</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">Platform Features</p>
            <h2 className="mt-1 text-2xl md:text-3xl font-bold text-foreground font-display">
              Built for Professional Police Operations
            </h2>
          </div>
          <p className="max-w-lg text-sm text-muted-foreground">
            Designed for innovation lifecycle management from proposal to approval, implementation, and knowledge retention.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {platformFeatures.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="mb-3 inline-flex items-center justify-center rounded-lg bg-gold/10 p-2 text-gold-dark">
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
          Workflow: Submit Innovation &rarr; Review & Discussion &rarr; Senior Approval &rarr; District Adoption
        </div>
      </section>

      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>AP Police Innovation Platform - Internal Use Only</p>
          <p>Copyright 2026 AP Police. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
