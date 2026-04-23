import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  Edit,
  FileText,
  IndianRupee,
  Mail,
  MapPin,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, DISTRICTS, type Project, type User } from "@/data/mockData";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchCurrentUserProfileOverview,
  fetchUserProfileOverview,
  updateCurrentUserProfile,
  uploadAvatar,
  updateProject,
  toggleFollowUser,
  requestConnection,
  uploadFiles,
} from "@/services/realtime";

const currency = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

const ProfilePage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { session, updateProfile } = useAuth();
  const isOwnProfile = !userId || userId === session?.user.id;

  const [profile, setProfile] = useState<User | null>(() => (isOwnProfile ? session?.user ?? null : null));
  const [followersCount, setFollowersCount] = useState(0);
  const [connectionCount, setConnectionCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [connectionState, setConnectionState] = useState<"none" | "requested" | "incoming-request" | "connected">("none");
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDistrict, setEditDistrict] = useState("");
  const [editBio, setEditBio] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<Partial<{
    title: string;
    category: string[];
    district: string;
    problemStatement: string;
    proposedSolution: string;
    budget: string;
    funding: string;
    officerInCharge: string;
    company: string;
    externalLinks: string[];
    attachments: string[];
  }>>({});
  const [isSavingProject, setIsSavingProject] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingProjectFiles, setIsUploadingProjectFiles] = useState(false);

  useEffect(() => {
    if (isOwnProfile && session?.user) {
      setProfile(session.user);
    }
  }, [isOwnProfile, session?.user]);

  useEffect(() => {
    let active = true;

    const loadOverview = async () => {
      setIsLoading(true);

      const overview = isOwnProfile
        ? await fetchCurrentUserProfileOverview()
        : userId
          ? await fetchUserProfileOverview(userId)
          : null;

      if (!active) return;

      if (!overview) {
        setProfile(null);
        setFollowersCount(0);
        setConnectionCount(0);
        setIsFollowing(false);
        setConnectionState("none");
        setUserProjects([]);
        setIsLoading(false);
        return;
      }

      setProfile(overview.user);
      setFollowersCount(overview.stats.followersCount);
      setConnectionCount(overview.stats.connectionsCount);
      setIsFollowing(overview.relationship.isFollowing);
      setConnectionState(overview.relationship.connectionStatus);
      setUserProjects(overview.projects);
      setIsLoading(false);

      if (overview.relationship.isOwnProfile) {
        updateProfile(overview.user);
      }
    };

    void loadOverview();

    return () => {
      active = false;
    };
  }, [isOwnProfile, userId, updateProfile]);

  useEffect(() => {
    if (!profile) return;
    setEditName(profile.name ?? "");
    setEditDistrict(profile.district ?? "");
    setEditBio(profile.bio ?? "");
  }, [profile]);

  const profileInitials =
    profile?.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "AP";

  const statCards = useMemo(() => {
    return [
      {
        label: "Followers",
        value: followersCount,
        note: "Officers tracking updates",
      },
      {
        label: "Connections",
        value: connectionCount,
        note: "Trusted collaborators",
      },
      {
        label: "Innovations",
        value: profile?.innovationsCount ?? userProjects.length,
        note: "Projects submitted",
      },
    ];
  }, [followersCount, connectionCount, profile?.innovationsCount, userProjects.length]);

  const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    approved: { label: "Approved", className: "bg-emerald-500/12 text-emerald-700 border-emerald-500/20 dark:text-emerald-300", icon: <CheckCircle2 className="h-3 w-3" /> },
    under_review: { label: "Under Review", className: "bg-amber-500/12 text-amber-700 border-amber-500/20 dark:text-amber-300", icon: <Clock className="h-3 w-3" /> },
    submitted: { label: "Submitted", className: "bg-sky-500/12 text-sky-700 border-sky-500/20 dark:text-sky-300", icon: <FileText className="h-3 w-3" /> },
    draft: { label: "Draft", className: "bg-slate-500/12 text-slate-700 border-slate-500/20 dark:text-slate-300", icon: <FileText className="h-3 w-3" /> },
    rejected: { label: "Rejected", className: "bg-rose-500/12 text-rose-700 border-rose-500/20 dark:text-rose-300", icon: <XCircle className="h-3 w-3" /> },
  };

  const onSaveProfile = async () => {
    if (!isOwnProfile || !profile) return;

    const name = editName.trim();
    const district = editDistrict.trim();
    const bio = editBio.trim();

    if (!name) {
      toast.error("Name is required");
      return;
    }

    if (!DISTRICTS.includes(district as (typeof DISTRICTS)[number])) {
      toast.error("Please select a valid district");
      return;
    }

    setIsSaving(true);

    try {
      const updatedUser = await updateCurrentUserProfile({ name, district, bio });
      setProfile(updatedUser);
      updateProfile(updatedUser);
      setIsEditing(false);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const onCancelEdit = () => {
    if (!profile) return;
    setEditName(profile.name ?? "");
    setEditDistrict(profile.district ?? "");
    setEditBio(profile.bio ?? "");
    setIsEditing(false);
  };

  const onAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = "";
    setIsUploadingAvatar(true);

    try {
      const updatedUser = await uploadAvatar(file);
      setProfile(updatedUser);
      updateProfile(updatedUser);
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload photo");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onFollowToggle = async () => {
    if (!profile) return;

    try {
      const result = await toggleFollowUser(profile.id);
      setIsFollowing(result.following);
      setFollowersCount((count) => Math.max(0, count + (result.following ? 1 : -1)));
      toast.success(result.following ? `You are now following ${profile.name}` : `Unfollowed ${profile.name}`);
    } catch {
      toast.error("Failed to update follow status");
    }
  };

  const onConnectionAction = async () => {
    if (!profile) return;

    const previousState = connectionState;

    try {
      const result = await requestConnection(profile.id);
      const nextState = result.status as typeof connectionState;
      setConnectionState(nextState);

      if (previousState !== "connected" && nextState === "connected") {
        setConnectionCount((count) => count + 1);
        toast.success(`You are now connected with ${profile.name}`);
        return;
      }

      if (nextState === "requested") {
        toast.success(`Connection request sent to ${profile.name}`);
      }
    } catch {
      toast.error("Failed to send connection request");
    }
  };

  const startEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setEditProject({
      title: project.title,
      category: [...project.category],
      district: project.district,
      problemStatement: project.problemStatement,
      proposedSolution: project.proposedSolution,
      budget: String(project.budget || ""),
      funding: project.funding || "Self Funding",
      officerInCharge: project.officerInCharge || "",
      company: project.company || "",
      externalLinks: [...(project.externalLinks || [])],
      attachments: [...(project.attachments || [])],
    });
  };

  const cancelEditProject = () => {
    setEditingProjectId(null);
    setEditProject({});
  };

  const onSaveProject = async (projectId: string) => {
    if (!editProject.title?.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!editProject.problemStatement?.trim()) {
      toast.error("Problem statement is required");
      return;
    }

    setIsSavingProject(true);

    try {
      const updated = await updateProject(projectId, {
        title: editProject.title,
        category: editProject.category,
        district: editProject.district,
        problemStatement: editProject.problemStatement,
        proposedSolution: editProject.proposedSolution,
        budget: Number(editProject.budget) || 0,
        funding: editProject.funding || "Self Funding",
        officerInCharge: editProject.officerInCharge || "",
        company: editProject.company || "",
        externalLinks: editProject.externalLinks,
        attachments: editProject.attachments,
      });

      setUserProjects((prev) => prev.map((project) => (project.id === projectId ? updated : project)));
      setEditingProjectId(null);
      setEditProject({});
      toast.success(`Project updated (v${updated.versions})`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update project");
    } finally {
      setIsSavingProject(false);
    }
  };

  const onProjectFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    event.target.value = "";
    setIsUploadingProjectFiles(true);

    try {
      const uploaded = await uploadFiles(Array.from(files));
      setEditProject((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...uploaded.map((file) => file.url)],
      }));
    } catch {
      toast.error("File upload failed");
    } finally {
      setIsUploadingProjectFiles(false);
    }
  };

  return (
    <div className="min-h-screen liquid-page">
      <Header onNavigate={(target) => navigate(target === "dashboard" ? "/hub" : "/create")} />

      <main className="mx-auto max-w-7xl px-4 pb-8 pt-40">
        {!profile && isLoading ? (
          <div className="space-y-5">
            <div className="liquid-panel h-72 animate-pulse" />
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="space-y-5 lg:col-span-8">
                <div className="liquid-panel h-48 animate-pulse" />
                <div className="liquid-panel h-80 animate-pulse" />
              </div>
              <div className="space-y-5 lg:col-span-4">
                <div className="liquid-panel h-56 animate-pulse" />
                <div className="liquid-panel h-40 animate-pulse" />
              </div>
            </div>
          </div>
        ) : !profile ? (
          <Card className="liquid-panel overflow-hidden border-none">
            <CardContent className="p-8 text-center">
              <p className="text-lg font-bold text-slate-700 dark:text-white">Profile unavailable</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                The officer profile could not be loaded right now.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            <section className="liquid-panel relative overflow-hidden border-none px-6 py-6 shadow-[0_24px_80px_rgba(16,34,61,0.12)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(252,221,112,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(41,121,255,0.16),transparent_30%)]" />
              <div className="relative">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge className="border-gold/25 bg-gold/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-gold-dark">
                      Verified Internal Officer
                    </Badge>
                    <Badge className="border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
                      AP Innovate Network
                    </Badge>
                  </div>
                  {isLoading ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs text-slate-500 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
                      <Clock className="h-3.5 w-3.5" /> Syncing profile…
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                    <div className="group relative">
                      <Avatar className="h-32 w-32 ring-4 ring-white/80 shadow-2xl dark:ring-white/10">
                        {profile.avatar ? <AvatarImage src={profile.avatar} alt={profile.name} /> : null}
                        <AvatarFallback className="bg-gold/20 text-3xl font-black text-gold-dark">
                          {profileInitials}
                        </AvatarFallback>
                      </Avatar>
                      {isOwnProfile ? (
                        <>
                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={(event) => void onAvatarChange(event)}
                          />
                          <button
                            type="button"
                            disabled={isUploadingAvatar}
                            onClick={() => avatarInputRef.current?.click()}
                            className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-navy text-white shadow-lg transition-all hover:scale-[1.04] disabled:cursor-not-allowed disabled:opacity-50"
                            title="Change profile photo"
                          >
                            <Camera className="h-4 w-4" />
                          </button>
                        </>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-navy/55 dark:text-white/45">
                        Officer Profile
                      </p>
                      <h1 className="mt-2 text-4xl font-black tracking-tight text-navy-dark dark:text-white font-display">
                        {profile.name}
                      </h1>
                      <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {profile.rank} · Andhra Pradesh Police
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {profile.district}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {profile.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isOwnProfile && !isEditing ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl border-white/80 bg-white/75 shadow-sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Edit Profile
                      </Button>
                    ) : null}
                    {isOwnProfile && isEditing ? (
                      <>
                        <Button type="button" variant="outline" className="rounded-2xl" onClick={onCancelEdit} disabled={isSaving}>
                          Cancel
                        </Button>
                        <Button type="button" className="rounded-2xl bg-gold text-navy hover:bg-gold-dark" onClick={() => void onSaveProfile()} disabled={isSaving}>
                          {isSaving ? "Saving..." : "Save Profile"}
                        </Button>
                      </>
                    ) : null}
                    {!isOwnProfile ? (
                      <>
                        <Button
                          type="button"
                          variant={isFollowing ? "outline" : "default"}
                          className={isFollowing ? "rounded-2xl border-white/80 bg-white/75 shadow-sm" : "rounded-2xl bg-gold text-navy hover:bg-gold-dark"}
                          onClick={() => void onFollowToggle()}
                        >
                          {isFollowing ? "Following" : "Follow"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl border-white/80 bg-white/75 shadow-sm"
                          onClick={() => void onConnectionAction()}
                          disabled={connectionState === "requested" || connectionState === "connected"}
                        >
                          {connectionState === "connected"
                            ? "Connected"
                            : connectionState === "requested"
                              ? "Requested"
                              : connectionState === "incoming-request"
                                ? "Accept Request"
                                : "Connect"}
                        </Button>
                        <Button
                          type="button"
                          className="rounded-2xl bg-navy text-white hover:bg-navy-light"
                          onClick={() => navigate(`/messages?to=${profile.id}`)}
                        >
                          Message
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {statCards.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[1.4rem] border border-white/80 bg-white/70 px-4 py-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-950/40"
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{stat.label}</p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-navy-dark dark:text-white">{stat.value}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-12">
              <div className="space-y-5 lg:col-span-8">
                <Card className="liquid-panel overflow-hidden border-none">
                  <CardHeader>
                    <CardTitle className="text-xl font-display text-navy-dark dark:text-white">About</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
                    {isOwnProfile && isEditing ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1.5 md:col-span-1">
                          <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Full Name</label>
                          <input
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            className="h-11 w-full rounded-2xl border border-white/80 bg-white/80 px-4 text-sm outline-none dark:border-white/10 dark:bg-slate-950/40"
                          />
                        </div>
                        <div className="space-y-1.5 md:col-span-1">
                          <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">District</label>
                          <select
                            value={editDistrict}
                            onChange={(event) => setEditDistrict(event.target.value)}
                            className="h-11 w-full rounded-2xl border border-white/80 bg-white/80 px-4 text-sm outline-none dark:border-white/10 dark:bg-slate-950/40"
                          >
                            {DISTRICTS.map((district) => (
                              <option key={district} value={district}>
                                {district}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Professional Note</label>
                          <Textarea
                            value={editBio}
                            onChange={(event) => setEditBio(event.target.value)}
                            className="min-h-[130px] rounded-[1.4rem] border-white/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/40"
                            placeholder="Describe your innovation focus, field experience, or policing priorities."
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[15px] leading-7">
                        {profile.bio?.trim() ||
                          "Committed to strengthening policing through field-ready innovation, structured approvals, and trusted officer-to-officer collaboration across districts."}
                      </p>
                    )}

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-[1.3rem] border border-white/80 bg-white/70 px-4 py-4 shadow-sm dark:border-white/10 dark:bg-slate-950/35">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Current Role</p>
                        <p className="mt-2 text-base font-bold text-navy-dark dark:text-white">{profile.rank}</p>
                      </div>
                      <div className="rounded-[1.3rem] border border-white/80 bg-white/70 px-4 py-4 shadow-sm dark:border-white/10 dark:bg-slate-950/35">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">District</p>
                        <p className="mt-2 text-base font-bold text-navy-dark dark:text-white">{isEditing ? editDistrict : profile.district}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="liquid-panel overflow-hidden border-none">
                  <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle className="text-xl font-display text-navy-dark dark:text-white">
                      {isOwnProfile ? "Innovation Portfolio" : "Recent Innovations"}
                    </CardTitle>
                    <div className="rounded-full border border-white/80 bg-white/75 px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:border-white/10 dark:bg-slate-950/35 dark:text-slate-300">
                      {userProjects.length} active record{userProjects.length === 1 ? "" : "s"}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {userProjects.length === 0 ? (
                      <div className="rounded-[1.4rem] border border-dashed border-slate-300/80 bg-white/55 px-5 py-10 text-center dark:border-white/10 dark:bg-slate-950/30">
                        <p className="text-base font-bold text-slate-700 dark:text-white">No innovations published yet</p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          Project submissions will appear here with approval status, version history, and attachments.
                        </p>
                      </div>
                    ) : (
                      userProjects.map((project) => {
                        const isEditingThis = editingProjectId === project.id;
                        const status = statusConfig[project.status] ?? statusConfig.submitted;

                        return (
                          <div
                            key={project.id}
                            className="rounded-[1.5rem] border border-white/80 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/35"
                          >
                            {!isEditingThis ? (
                              <>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <button
                                      onClick={() => navigate(`/project/${project.id}`)}
                                      className="text-left text-lg font-black tracking-tight text-navy-dark transition-colors hover:text-navy-light dark:text-white"
                                    >
                                      {project.title}
                                    </button>
                                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                      {project.problemStatement}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className={`w-fit gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${status.className}`}>
                                    {status.icon} {status.label}
                                  </Badge>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                  <div className="rounded-2xl border border-white/70 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-slate-900/30">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Budget</p>
                                    <p className="mt-1 flex items-center gap-1 text-sm font-bold text-slate-700 dark:text-slate-100">
                                      <IndianRupee className="h-3.5 w-3.5" />
                                      {currency.format(project.budget || 0)}
                                    </p>
                                  </div>
                                  <div className="rounded-2xl border border-white/70 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-slate-900/30">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Lead Officer</p>
                                    <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-100">{project.officerInCharge || "Not specified"}</p>
                                  </div>
                                  <div className="rounded-2xl border border-white/70 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-slate-900/30">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Version</p>
                                    <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-100">v{project.versions}</p>
                                  </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  {project.category.map((category) => (
                                    <Badge key={category} className="rounded-full border-gold/20 bg-gold/12 text-[11px] font-semibold text-gold-dark">
                                      {category}
                                    </Badge>
                                  ))}
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                  <span>{project.district}</span>
                                  <span>·</span>
                                  <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                                  {project.company ? (
                                    <>
                                      <span>·</span>
                                      <span className="inline-flex items-center gap-1">
                                        <Building2 className="h-3 w-3" /> {project.company}
                                      </span>
                                    </>
                                  ) : null}
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl border-white/80 bg-white/80 dark:border-white/10 dark:bg-slate-900/35"
                                    onClick={() => navigate(`/project/${project.id}`)}
                                  >
                                    Open Project <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                                  </Button>
                                  {isOwnProfile ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="rounded-xl"
                                      onClick={() => startEditProject(project)}
                                    >
                                      <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                                    </Button>
                                  ) : null}
                                </div>
                              </>
                            ) : (
                              <div className="space-y-4">
                                <div>
                                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">Title</label>
                                  <input
                                    className="h-11 w-full rounded-2xl border border-white/80 bg-white/85 px-4 text-sm dark:border-white/10 dark:bg-slate-950/40"
                                    value={editProject.title ?? ""}
                                    onChange={(event) => setEditProject((prev) => ({ ...prev, title: event.target.value }))}
                                  />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">District</label>
                                    <select
                                      className="h-11 w-full rounded-2xl border border-white/80 bg-white/85 px-4 text-sm dark:border-white/10 dark:bg-slate-950/40"
                                      value={editProject.district ?? ""}
                                      onChange={(event) => setEditProject((prev) => ({ ...prev, district: event.target.value }))}
                                    >
                                      {DISTRICTS.map((district) => (
                                        <option key={district} value={district}>
                                          {district}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">Budget (INR)</label>
                                    <input
                                      type="number"
                                      className="h-11 w-full rounded-2xl border border-white/80 bg-white/85 px-4 text-sm dark:border-white/10 dark:bg-slate-950/40"
                                      value={editProject.budget ?? ""}
                                      onChange={(event) => setEditProject((prev) => ({ ...prev, budget: event.target.value }))}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">Categories</label>
                                  <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map((category) => {
                                      const selected = editProject.category?.includes(category) ?? false;
                                      return (
                                        <Badge
                                          key={category}
                                          variant={selected ? "default" : "outline"}
                                          className={`cursor-pointer rounded-full px-3 py-1 text-[11px] ${selected ? "bg-gold text-navy hover:bg-gold-dark" : "border-white/80 bg-white/75 dark:border-white/10 dark:bg-slate-950/35"}`}
                                          onClick={() =>
                                            setEditProject((prev) => ({
                                              ...prev,
                                              category: selected
                                                ? (prev.category ?? []).filter((item) => item !== category)
                                                : [...(prev.category ?? []), category],
                                            }))
                                          }
                                        >
                                          {category}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">Problem Statement</label>
                                  <Textarea
                                    className="min-h-[90px] rounded-[1.4rem] border-white/80 bg-white/85 dark:border-white/10 dark:bg-slate-950/40"
                                    value={editProject.problemStatement ?? ""}
                                    onChange={(event) => setEditProject((prev) => ({ ...prev, problemStatement: event.target.value }))}
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">Proposed Solution</label>
                                  <Textarea
                                    className="min-h-[100px] rounded-[1.4rem] border-white/80 bg-white/85 dark:border-white/10 dark:bg-slate-950/40"
                                    value={editProject.proposedSolution ?? ""}
                                    onChange={(event) => setEditProject((prev) => ({ ...prev, proposedSolution: event.target.value }))}
                                  />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">Funding Source</label>
                                    <input
                                      className="h-11 w-full rounded-2xl border border-white/80 bg-white/85 px-4 text-sm dark:border-white/10 dark:bg-slate-950/40"
                                      value={editProject.funding ?? "Self Funding"}
                                      onChange={(event) => setEditProject((prev) => ({ ...prev, funding: event.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">Officer in Charge</label>
                                    <input
                                      className="h-11 w-full rounded-2xl border border-white/80 bg-white/85 px-4 text-sm dark:border-white/10 dark:bg-slate-950/40"
                                      value={editProject.officerInCharge ?? ""}
                                      onChange={(event) => setEditProject((prev) => ({ ...prev, officerInCharge: event.target.value }))}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">Company / Partner</label>
                                  <input
                                    className="h-11 w-full rounded-2xl border border-white/80 bg-white/85 px-4 text-sm dark:border-white/10 dark:bg-slate-950/40"
                                    value={editProject.company ?? ""}
                                    onChange={(event) => setEditProject((prev) => ({ ...prev, company: event.target.value }))}
                                    placeholder="Vendor, implementation partner, or company name"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">Attachments</label>
                                  <div className="flex flex-wrap gap-2">
                                    {(editProject.attachments ?? []).map((url, index) => (
                                      <Badge key={`${url}-${index}`} variant="outline" className="rounded-full border-white/80 bg-white/70 px-3 py-1 text-[11px] dark:border-white/10 dark:bg-slate-950/35">
                                        {url.split("/").pop()}
                                        <button
                                          className="ml-2 text-rose-500"
                                          onClick={() =>
                                            setEditProject((prev) => ({
                                              ...prev,
                                              attachments: (prev.attachments ?? []).filter((_, itemIndex) => itemIndex !== index),
                                            }))
                                          }
                                        >
                                          ×
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                  <input ref={editFileInputRef} type="file" multiple className="hidden" onChange={onProjectFileUpload} />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 rounded-xl border-white/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/35"
                                    disabled={isUploadingProjectFiles}
                                    onClick={() => editFileInputRef.current?.click()}
                                  >
                                    {isUploadingProjectFiles ? "Uploading..." : "Add Files"}
                                  </Button>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    className="rounded-xl bg-gold text-navy hover:bg-gold-dark"
                                    disabled={isSavingProject}
                                    onClick={() => void onSaveProject(project.id)}
                                  >
                                    {isSavingProject ? "Saving..." : "Save Changes"}
                                  </Button>
                                  <Button variant="outline" size="sm" className="rounded-xl" onClick={cancelEditProject}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-5 lg:col-span-4">
                <Card className="liquid-panel border-none">
                  <CardHeader>
                    <CardTitle className="text-xl font-display text-navy-dark dark:text-white">Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-950/35">
                      <Mail className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                      <span className="truncate text-sm text-slate-700 dark:text-slate-200">{profile.email}</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-950/35">
                      <Shield className="h-4 w-4 text-gold-dark dark:text-gold" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{profile.rank} Officer</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-950/35">
                      <MapPin className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{profile.district}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="liquid-panel border-none">
                  <CardHeader>
                    <CardTitle className="text-xl font-display text-navy-dark dark:text-white">Network Pulse</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                    <div className="rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-slate-950/35">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Follower Momentum</p>
                      <p className="mt-2 text-2xl font-black text-navy-dark dark:text-white">{followersCount}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Officer interest in updates and submissions.</p>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-slate-950/35">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Connection Status</p>
                      <p className="mt-2 text-base font-bold text-navy-dark dark:text-white">
                        {isOwnProfile
                          ? "Internal owner view"
                          : connectionState === "connected"
                            ? "Connected"
                            : connectionState === "requested"
                              ? "Request pending"
                              : connectionState === "incoming-request"
                                ? "Awaiting your approval"
                                : "Not connected yet"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="liquid-panel border-none">
                  <CardHeader>
                    <CardTitle className="text-xl font-display text-navy-dark dark:text-white">Highlights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-950/35">
                      <Sparkles className="h-4 w-4 text-gold-dark dark:text-gold" />
                      Innovation-led policing mindset
                    </div>
                    <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-950/35">
                      <Users className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                      Cross-district collaboration ready
                    </div>
                    <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-950/35">
                      <UserPlus className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                      Structured approval workflow aware
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProfilePage;
