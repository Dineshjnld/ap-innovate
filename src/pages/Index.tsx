import { useState, useMemo } from "react";
import Header from "@/components/Header";
import UserProfileWidget from "@/components/UserProfileWidget";
import FilterPanel from "@/components/FilterPanel";
import LiveFeed from "@/components/LiveFeed";
import ProjectCard from "@/components/ProjectCard";
import ProjectDetail from "@/components/ProjectDetail";
import CreateProjectForm from "@/components/CreateProjectForm";
import StatsBar from "@/components/StatsBar";
import { MOCK_PROJECTS } from "@/data/mockData";
import { toast } from "sonner";

type Page = "dashboard" | "project-detail" | "create-project";

const Index = () => {
  const [page, setPage] = useState<Page>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);

  const filteredProjects = useMemo(() => {
    return MOCK_PROJECTS.filter((p) => {
      if (selectedCategories.length > 0 && !p.category.some((c) => selectedCategories.includes(c))) return false;
      if (selectedDistricts.length > 0 && !selectedDistricts.includes(p.district)) return false;
      return true;
    });
  }, [selectedCategories, selectedDistricts]);

  const selectedProject = MOCK_PROJECTS.find((p) => p.id === selectedProjectId);

  const handleViewProject = (id: string) => {
    setSelectedProjectId(id);
    setPage("project-detail");
    window.scrollTo(0, 0);
  };

  const handleCreateProject = () => {
    setPage("create-project");
    window.scrollTo(0, 0);
  };

  const handleNavigate = (target: string) => {
    setPage("dashboard");
    window.scrollTo(0, 0);
  };

  const handleProjectSubmit = () => {
    toast.success("Innovation submitted successfully!", {
      description: "Your project will be reviewed by senior officers.",
    });
    setPage("dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onCreateProject={handleCreateProject} onNavigate={handleNavigate} />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {page === "project-detail" && selectedProject ? (
          <ProjectDetail project={selectedProject} onBack={() => setPage("dashboard")} />
        ) : page === "create-project" ? (
          <CreateProjectForm onBack={() => setPage("dashboard")} onSubmit={handleProjectSubmit} />
        ) : (
          <>
            <StatsBar />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Sidebar */}
              <aside className="lg:col-span-3 space-y-4 order-2 lg:order-1">
                <UserProfileWidget />
                <FilterPanel
                  selectedCategories={selectedCategories}
                  selectedDistricts={selectedDistricts}
                  onCategoriesChange={setSelectedCategories}
                  onDistrictsChange={setSelectedDistricts}
                />
              </aside>

              {/* Main Content */}
              <section className="lg:col-span-6 order-1 lg:order-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground font-display">
                    Innovations
                    {(selectedCategories.length > 0 || selectedDistricts.length > 0) && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({filteredProjects.length} results)
                      </span>
                    )}
                  </h2>
                  {(selectedCategories.length > 0 || selectedDistricts.length > 0) && (
                    <button
                      onClick={() => { setSelectedCategories([]); setSelectedDistricts([]); }}
                      className="text-xs text-gold-dark hover:text-gold font-medium"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {filteredProjects.map((project, i) => (
                    <div key={project.id} className="animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                      <ProjectCard project={project} onView={handleViewProject} />
                    </div>
                  ))}
                  {filteredProjects.length === 0 && (
                    <div className="rounded-xl bg-card border border-border p-12 text-center">
                      <p className="text-muted-foreground">No innovations match your filters.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Right Sidebar */}
              <aside className="lg:col-span-3 order-3">
                <LiveFeed onViewProject={handleViewProject} />
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
