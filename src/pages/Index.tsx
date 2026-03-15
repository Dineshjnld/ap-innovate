import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Tag } from "lucide-react";
import Header from "@/components/Header";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";
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
import { subscribeDiscoverUsers } from "@/services/realtime";

const Index = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([...CATEGORIES]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([...DISTRICTS]);
  const [globalQuery, setGlobalQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    // If no categories or no districts selected, show empty list
    if (selectedCategories.length === 0 && selectedDistricts.length === 0) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeProjectsLive(
      {
        categories: selectedCategories,
        districts: selectedDistricts,
        search: globalQuery,
      },
      (result) => {
        setProjects(result);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [selectedCategories, selectedDistricts, globalQuery]);

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
        categories: selectedCategories,
        districts: selectedDistricts,
        search: "",
      }),
    [selectedCategories, selectedDistricts],
  );

  const handleViewProject = (id: string) => {
    navigate(`/project/${id}`);
  };

  const handleNavigate = (target: "dashboard" | "create-project") => {
    if (target === "create-project") {
      navigate("/create");
      return;
    }

    navigate("/hub2");
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

  // Auto-select all categories & districts the first time they load (after login)
  useEffect(() => {
    if (!session) return;
    if (autoSelectedRef.current) return;
    if (categories.length === 0 || districts.length === 0) return;
    autoSelectedRef.current = true;
    setSelectedCategories([...categories]);
    setSelectedDistricts([...districts]);
  }, [session, categories, districts]);

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

      <main className="w-full px-2 pt-[136px] pb-4">
        <StatsBar projects={allProjects} />

        <div className="flex flex-col lg:flex-row gap-3 items-start">
          {/* ── Left: Flash Updates ──────────────────────────── */}
          <aside className="w-full lg:w-[28%] lg:sticky lg:top-[136px] lg:max-h-[calc(100vh-145px)] lg:overflow-y-auto shrink-0 order-2 lg:order-1 z-30 scrollbar-thin scrollbar-thumb-muted-foreground/20">
            <LiveFlashTicker onOpenProject={handleViewProject} />
          </aside>

          {/* ── Right: Filters + Projects ────────────────────── */}
          <section className="w-full lg:flex-1 min-w-0 order-1 lg:order-2 flex flex-col gap-2">
            {/* Filter Dropdowns Row */}
            <div className="flex flex-col sm:flex-row gap-2">
              <MultiSelectDropdown
                label="Categories"
                icon={<Tag className="h-3.5 w-3.5" />}
                options={categories}
                selected={selectedCategories}
                onChange={setSelectedCategories}
                accentColor="text-amber-600"
              />
              <MultiSelectDropdown
                label="Districts"
                icon={<MapPin className="h-3.5 w-3.5" />}
                options={districts}
                selected={selectedDistricts}
                onChange={setSelectedDistricts}
                accentColor="text-sky-600"
              />
            </div>

            {/* Project List */}
            <div className="rounded-xl bg-card border border-border shadow-card overflow-hidden flex flex-col h-[calc(100vh-200px)]">
              <div className="bg-card px-3 py-2.5 border-b border-border shadow-sm z-10 shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground font-display">Project List</h2>
                  <span className="text-xs text-muted-foreground">
                    {projects.length} project{projects.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

                <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40">
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
                                    onClick={() => setSelectedCategories((current) => (current.includes(category) ? current : [...current, category]))}
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
                                    onClick={() => setSelectedDistricts((current) => (current.includes(district) ? current : [...current, district]))}
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
