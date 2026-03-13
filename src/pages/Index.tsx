import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import FilterPanel from "@/components/FilterPanel";
import LiveFlashTicker from "@/components/LiveFlashTicker";
import ProjectCard from "@/components/ProjectCard";
import StatsBar from "@/components/StatsBar";
import { CATEGORIES, DISTRICTS, type Project, type User } from "@/data/mockData";
import { useAuth } from "@/hooks/use-auth";
import {
  buildProjectsQueryString,
  subscribeAllProjectsLive,
  subscribeProjectsLive,
} from "@/services/projectsApi";
import { seedDatabaseIfEmpty } from "@/services/database";
import { subscribeDiscoverUsers } from "@/services/realtime";

const Index = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [draftCategories, setDraftCategories] = useState<string[]>([]);
  const [draftDistricts, setDraftDistricts] = useState<string[]>([]);
  const [appliedCategories, setAppliedCategories] = useState<string[]>([]);
  const [appliedDistricts, setAppliedDistricts] = useState<string[]>([]);
  const [globalQuery, setGlobalQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    seedDatabaseIfEmpty();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeProjectsLive(
      {
        categories: appliedCategories,
        districts: appliedDistricts,
        search: "",
      },
      (result) => {
        setProjects(result);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [appliedCategories, appliedDistricts]);

  useEffect(() => {
    return subscribeAllProjectsLive((result) => {
      setAllProjects(result);
    });
  }, []);

  useEffect(() => {
    return subscribeDiscoverUsers((users) => {
      setDiscoverUsers(users);
    });
  }, []);

  const queryPreview = useMemo(
    () =>
      buildProjectsQueryString({
        categories: appliedCategories,
        districts: appliedDistricts,
        search: "",
      }),
    [appliedCategories, appliedDistricts],
  );

  const handleViewProject = (id: string) => {
    navigate(`/project/${id}`);
  };

  const handleNavigate = (target: "dashboard" | "create-project") => {
    if (target === "create-project") {
      navigate("/create");
      return;
    }

    navigate("/hub");
  };

  const handleRunFilters = () => {
    setAppliedCategories(draftCategories);
    setAppliedDistricts(draftDistricts);
  };

  const categories = useMemo(
    () => {
      const metadata = Array.from(CATEGORIES);
      const fromProjects = allProjects.flatMap((project) => project.category);
      return Array.from(new Set([...metadata, ...fromProjects])).sort((a, b) => a.localeCompare(b));
    },
    [allProjects],
  );

  const districts = useMemo(
    () => {
      const metadata = Array.from(DISTRICTS);
      const fromProjects = allProjects.map((project) => project.district);
      return Array.from(new Set([...metadata, ...fromProjects])).sort((a, b) => a.localeCompare(b));
    },
    [allProjects],
  );

  const knownProfiles = useMemo(
    () => discoverUsers.filter((user) => user.id !== session?.user.id),
    [discoverUsers, session],
  );

  const normalizedGlobalQuery = globalQuery.trim().toLowerCase();

  const globalProjectResults = useMemo(() => {
    if (!normalizedGlobalQuery) {
      return [];
    }

    return allProjects
      .filter((project) => {
        const haystack = [
          project.title,
          project.district,
          project.author.name,
          project.author.rank,
          ...project.category,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedGlobalQuery);
      })
      .slice(0, 6);
  }, [allProjects, normalizedGlobalQuery]);

  const globalProfileResults = useMemo(() => {
    if (!normalizedGlobalQuery) {
      return [];
    }

    return knownProfiles
      .filter((profile) => {
        const haystack = [profile.name, profile.email, profile.rank, profile.district]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedGlobalQuery);
      })
      .slice(0, 6);
  }, [knownProfiles, normalizedGlobalQuery]);

  const globalCategoryResults = useMemo(() => {
    if (!normalizedGlobalQuery) {
      return [];
    }

    return categories
      .filter((category) => category.toLowerCase().includes(normalizedGlobalQuery))
      .slice(0, 8);
  }, [categories, normalizedGlobalQuery]);

  const globalDistrictResults = useMemo(() => {
    if (!normalizedGlobalQuery) {
      return [];
    }

    return districts
      .filter((district) => district.toLowerCase().includes(normalizedGlobalQuery))
      .slice(0, 8);
  }, [districts, normalizedGlobalQuery]);

  const hasGlobalResults =
    globalProjectResults.length > 0 ||
    globalProfileResults.length > 0 ||
    globalCategoryResults.length > 0 ||
    globalDistrictResults.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header
        onNavigate={handleNavigate}
        onSearchChange={setGlobalQuery}
      />

      <main className="mx-auto max-w-7xl px-4 pt-40 pb-6">
        <StatsBar projects={allProjects} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4 order-2 lg:order-1">
            <LiveFlashTicker onOpenProject={handleViewProject} />
          </aside>

          <section className="lg:col-span-8 order-1 lg:order-2 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
              <div className="xl:col-span-2">
                <FilterPanel
                  selectedCategories={draftCategories}
                  selectedDistricts={draftDistricts}
                  categories={categories}
                  districts={districts}
                  onCategoriesChange={setDraftCategories}
                  onDistrictsChange={setDraftDistricts}
                  onRunFilters={handleRunFilters}
                />
              </div>

              <div className="xl:col-span-3 rounded-xl bg-card border border-border shadow-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h2 className="text-lg font-bold text-foreground font-display">Project List</h2>
                  <p className="text-xs text-muted-foreground">
                    GET /projects{queryPreview ? `?${queryPreview}` : ""}
                  </p>
                </div>

                {normalizedGlobalQuery ? (
                  <div className="mb-4 rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Global Search Results</p>
                    <p className="mt-1 text-xs text-muted-foreground">Query: {globalQuery}</p>

                    {!hasGlobalResults ? (
                      <p className="mt-3 text-sm text-muted-foreground">No matching profiles, projects, categories, or districts.</p>
                    ) : (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-md border border-border bg-background p-3">
                          <p className="text-xs font-semibold text-foreground">Profiles ({globalProfileResults.length})</p>
                          <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                            {globalProfileResults.length === 0 ? (
                              <p>No profile matches</p>
                            ) : (
                              globalProfileResults.map((profile) => (
                                <button
                                  key={profile.id}
                                  type="button"
                                  onClick={() => navigate(`/profile/${profile.id}`)}
                                  className="block w-full rounded px-2 py-1 text-left hover:bg-muted"
                                >
                                  <span className="font-medium text-foreground">{profile.name}</span>
                                  <span className="ml-1">({profile.rank}, {profile.district})</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="rounded-md border border-border bg-background p-3">
                          <p className="text-xs font-semibold text-foreground">Projects ({globalProjectResults.length})</p>
                          <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                            {globalProjectResults.length === 0 ? (
                              <p>No project matches</p>
                            ) : (
                              globalProjectResults.map((project) => (
                                <button
                                  key={project.id}
                                  type="button"
                                  onClick={() => handleViewProject(project.id)}
                                  className="block w-full rounded px-2 py-1 text-left hover:bg-muted"
                                >
                                  <span className="font-medium text-foreground">{project.title}</span>
                                  <span className="ml-1">({project.district})</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="rounded-md border border-border bg-background p-3">
                          <p className="text-xs font-semibold text-foreground">Categories ({globalCategoryResults.length})</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {globalCategoryResults.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No category matches</p>
                            ) : (
                              globalCategoryResults.map((category) => (
                                <button
                                  key={category}
                                  type="button"
                                  onClick={() => setDraftCategories((current) => (current.includes(category) ? current : [...current, category]))}
                                  className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-foreground"
                                >
                                  {category}
                                </button>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="rounded-md border border-border bg-background p-3">
                          <p className="text-xs font-semibold text-foreground">Districts ({globalDistrictResults.length})</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {globalDistrictResults.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No district matches</p>
                            ) : (
                              globalDistrictResults.map((district) => (
                                <button
                                  key={district}
                                  type="button"
                                  onClick={() => setDraftDistricts((current) => (current.includes(district) ? current : [...current, district]))}
                                  className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-foreground"
                                >
                                  {district}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {isLoading ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                    Loading projects...
                  </div>
                ) : projects.length === 0 ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                    No projects found for the selected filters.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.map((project) => (
                      <ProjectCard key={project.id} project={project} onView={handleViewProject} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
