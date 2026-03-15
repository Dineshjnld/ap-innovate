import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Users,
  FileText,
  MessageSquare,
  Clock,
  Search,
  Shield,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import type { User, Project } from "@/data/mockData";
import type { ProjectVersion } from "@/services/database";
import {
  adminFetchProjects,
  adminFetchUsers,
  adminFetchStats,
  adminUpdateUserRole,
  fetchProjectVersions,
} from "@/services/realtime";

const STATUS_OPTIONS = ["all", "submitted", "under_review", "approved", "rejected"] as const;

const statusBadge: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-success/10 text-success border-success/20" },
  under_review: { label: "Under Review", className: "bg-warning/10 text-warning border-warning/20" },
  submitted: { label: "Submitted", className: "bg-info/10 text-info border-info/20" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [stats, setStats] = useState({ totalProjects: 0, totalUsers: 0, totalComments: 0, pendingReview: 0 });
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [activeTab, setActiveTab] = useState<"projects" | "users">("projects");

  // Version history
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Guard: admin only
  useEffect(() => {
    if (session && session.user.role !== "admin") {
      toast.error("Access denied");
      navigate("/hub2", { replace: true });
    }
  }, [session, navigate]);

  // Load stats
  useEffect(() => {
    void adminFetchStats().then(setStats).catch(() => {});
  }, []);

  // Load projects when filter changes
  useEffect(() => {
    const params: { status?: string; q?: string } = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (searchQ.trim()) params.q = searchQ.trim();
    void adminFetchProjects(params).then(setProjects).catch(() => {});
  }, [statusFilter, searchQ]);

  // Load users
  useEffect(() => {
    if (activeTab === "users") {
      void adminFetchUsers().then(setUsers).catch(() => {});
    }
  }, [activeTab]);

  const toggleVersions = async (projectId: string) => {
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null);
      return;
    }
    setExpandedProjectId(projectId);
    setLoadingVersions(true);
    try {
      const v = await fetchProjectVersions(projectId);
      setVersions(v);
    } catch {
      toast.error("Failed to load version history");
    } finally {
      setLoadingVersions(false);
    }
  };

  const onToggleRole = async (user: User) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      const updated = await adminUpdateUserRole(user.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      toast.success(`${user.name} is now ${newRole}`);
    } catch {
      toast.error("Failed to update role");
    }
  };

  if (session?.user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background font-body">
      <Header onNavigate={(p) => navigate(p === "dashboard" ? "/hub2" : "/create")} />
      <main className="mx-auto max-w-7xl px-4 pt-36 pb-12 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold font-display text-foreground">Admin Dashboard</h1>

        {/* Stats Row */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Projects", value: stats.totalProjects, icon: FileText, color: "text-info" },
            { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-success" },
            { label: "Comments", value: stats.totalComments, icon: MessageSquare, color: "text-gold-dark" },
            { label: "Pending Review", value: stats.pendingReview, icon: Clock, color: "text-warning" },
          ].map((s) => (
            <Card key={s.label} className="border-border shadow-card">
              <CardContent className="flex items-center gap-3 p-4">
                <s.icon className={`h-8 w-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tab Selector */}
        <div className="mb-4 flex gap-2 border-b border-border pb-2">
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-t ${activeTab === "projects" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("projects")}
          >
            <FileText className="mr-1.5 inline h-4 w-4" /> Projects
          </button>
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-t ${activeTab === "users" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("users")}
          >
            <Users className="mr-1.5 inline h-4 w-4" /> Users
          </button>
        </div>

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <Card className="border-border shadow-card">
            <CardHeader className="flex-row flex-wrap items-center gap-3">
              <CardTitle className="text-lg font-display">All Projects</CardTitle>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search…"
                    className="h-8 w-48 rounded-md border border-border bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                  />
                </div>
                <select
                  className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s === "all" ? "All Statuses" : statusBadge[s]?.label ?? s}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Title</th>
                      <th className="px-4 py-2.5 font-medium">Author</th>
                      <th className="px-4 py-2.5 font-medium">District</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Ver</th>
                      <th className="px-4 py-2.5 font-medium">Updated</th>
                      <th className="px-4 py-2.5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => {
                      const sb = statusBadge[p.status] ?? statusBadge.submitted;
                      const isExpanded = expandedProjectId === p.id;
                      return (
                        <>
                          <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-2.5 font-medium">
                              <button
                                className="text-left hover:text-primary hover:underline"
                                onClick={() => navigate(`/project/${p.id}`)}
                              >
                                {p.title}
                              </button>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={p.author.avatar} />
                                  <AvatarFallback className="text-[10px]">{p.author.name[0]}</AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-[120px]">{p.author.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{p.district}</td>
                            <td className="px-4 py-2.5">
                              <Badge variant="outline" className={`text-[10px] ${sb.className}`}>{sb.label}</Badge>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">v{p.versions}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{new Date(p.updatedAt).toLocaleDateString()}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`/project/${p.id}`)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {p.versions > 1 && (
                                  <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => toggleVersions(p.id)}>
                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    History
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${p.id}-versions`}>
                              <td colSpan={7} className="bg-muted/10 px-4 py-3">
                                {loadingVersions ? (
                                  <p className="text-xs text-muted-foreground">Loading history…</p>
                                ) : versions.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No version history</p>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">Edit History</p>
                                    {versions.map((v) => (
                                      <div key={v.id} className="rounded-md border border-border bg-background p-3 text-xs">
                                        <div className="flex items-center justify-between">
                                          <span className="font-semibold">Version {v.version}</span>
                                          <span className="text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span>
                                        </div>
                                        {v.editedBy && (
                                          <p className="mt-0.5 text-muted-foreground">Edited by: {v.editedBy.name} ({v.editedBy.rank})</p>
                                        )}
                                        <p className="mt-1"><strong>Title:</strong> {v.title}</p>
                                        <p><strong>District:</strong> {v.district}</p>
                                        <p><strong>Categories:</strong> {v.category.join(", ")}</p>
                                        <details className="mt-1">
                                          <summary className="cursor-pointer text-primary hover:underline">Full details</summary>
                                          <div className="mt-1 space-y-1 pl-2 border-l-2 border-border">
                                            <p><strong>Problem:</strong> {v.problemStatement}</p>
                                            <p><strong>Solution:</strong> {v.proposedSolution}</p>
                                            <p><strong>Budget:</strong> ₹{v.budget.toLocaleString()}</p>
                                            {v.attachments.length > 0 && <p><strong>Attachments:</strong> {v.attachments.length} file(s)</p>}
                                          </div>
                                        </details>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                    {projects.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No projects found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-display">All Users</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Name</th>
                      <th className="px-4 py-2.5 font-medium">Email</th>
                      <th className="px-4 py-2.5 font-medium">Rank</th>
                      <th className="px-4 py-2.5 font-medium">District</th>
                      <th className="px-4 py-2.5 font-medium">Role</th>
                      <th className="px-4 py-2.5 font-medium">Projects</th>
                      <th className="px-4 py-2.5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={u.avatar} />
                              <AvatarFallback className="text-[10px]">{u.name[0]}</AvatarFallback>
                            </Avatar>
                            <button
                              className="hover:text-primary hover:underline"
                              onClick={() => navigate(`/profile/${u.id}`)}
                            >
                              {u.name}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-2.5">{u.rank}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{u.district}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-[10px]">
                            {u.role === "admin" ? (
                              <><Shield className="mr-1 inline h-3 w-3" />Admin</>
                            ) : (
                              "User"
                            )}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{u.innovationsCount}</td>
                        <td className="px-4 py-2.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onToggleRole(u)}
                          >
                            {u.role === "admin" ? "Remove Admin" : "Make Admin"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
