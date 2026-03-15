import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Camera, Mail, MapPin, Shield, Sparkles, Users, UserPlus, FileText, Clock, CheckCircle2, XCircle, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, DISTRICTS, type User, type Project } from "@/data/mockData";
import { useAuth } from "@/hooks/use-auth";
import {
  subscribeCurrentUserProfile,
  updateCurrentUserProfile,
  uploadAvatar,
  fetchUserById,
  fetchUserProjects,
  updateProject,
  toggleFollowUser,
  getFollowerInfo,
  requestConnection,
  getConnectionStatus,
  getConnectionsCount,
  uploadFiles,
} from "@/services/realtime";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { session, updateProfile } = useAuth();
  const isOwnProfile = !userId || userId === session?.user.id;
  const [profile, setProfile] = useState<User | null>(() => {
    if (isOwnProfile) {
      return session?.user ?? null;
    }
    return null;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDistrict, setEditDistrict] = useState("");
  const [editBio, setEditBio] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [connectionState, setConnectionState] = useState<"none" | "requested" | "incoming-request" | "connected">("none");
  const [followersCount, setFollowersCount] = useState(0);
  const [connectionCount, setConnectionCount] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<Partial<{ title: string; category: string[]; district: string; problemStatement: string; proposedSolution: string; budget: string; externalLinks: string[]; attachments: string[] }>>({});
  const [isSavingProject, setIsSavingProject] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingProjectFiles, setIsUploadingProjectFiles] = useState(false);

  useEffect(() => {
    if (session?.user && isOwnProfile) {
      setProfile(session.user);
    }
  }, [session, isOwnProfile]);

  useEffect(() => {
    if (isOwnProfile) {
      return;
    }

    if (userId) {
      void fetchUserById(userId).then((target) => {
        setProfile(target);
      });

      void getFollowerInfo(userId).then((info) => {
        setFollowersCount(info.count);
        setIsFollowing(info.isFollowing);
      }).catch(() => {});

      void getConnectionStatus(userId).then((res) => {
        setConnectionState(res.status as typeof connectionState);
      }).catch(() => {});

      void getConnectionsCount(userId).then((res) => {
        setConnectionCount(res.count);
      }).catch(() => {});
    }
  }, [isOwnProfile, userId, session]);

  useEffect(() => {
    if (!isOwnProfile) {
      return;
    }

    return subscribeCurrentUserProfile((user) => {
      if (user) {
        setProfile(user);
      }
    });
  }, [isOwnProfile]);

  // Load own profile follower/connection counts
  useEffect(() => {
    if (!isOwnProfile || !session?.user?.id) return;
    void getFollowerInfo(session.user.id).then((info) => setFollowersCount(info.count)).catch(() => {});
    void getConnectionsCount(session.user.id).then((res) => setConnectionCount(res.count)).catch(() => {});
  }, [isOwnProfile, session?.user?.id]);

  // Fetch user's projects
  useEffect(() => {
    const uid = isOwnProfile ? session?.user?.id : userId;
    if (!uid) return;
    void fetchUserProjects(uid).then(setUserProjects).catch(() => {});
  }, [isOwnProfile, userId, session?.user?.id]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setEditName(profile.name ?? "");
    setEditDistrict(profile.district ?? "");
    setEditBio(profile.bio ?? "");
  }, [profile]);

  const onCancelEdit = () => {
    if (!profile) {
      return;
    }

    setEditName(profile.name ?? "");
    setEditDistrict(profile.district ?? "");
    setEditBio(profile.bio ?? "");
    setIsEditing(false);
  };

  const onSaveProfile = async () => {
    if (!isOwnProfile) {
      return;
    }

    if (!profile) {
      return;
    }

    const name = editName.trim();
    const bio = editBio.trim();
    const district = editDistrict.trim();

    if (!name) {
      toast.error("Name is required");
      return;
    }

    if (!DISTRICTS.includes(district as (typeof DISTRICTS)[number])) {
      toast.error("Please select a valid district");
      return;
    }

    setIsSaving(true);

    const apiUser = await updateCurrentUserProfile({
      name,
      district,
      bio,
    });

    const mergedProfile: User = {
      ...profile,
      name,
      district,
      bio,
      ...(apiUser ?? {}),
    };

    setProfile(mergedProfile);
    updateProfile(mergedProfile);
    setIsSaving(false);
    setIsEditing(false);
    toast.success("Profile updated");
  };

  const onFollowToggle = async () => {
    if (!profile) {
      return;
    }

    try {
      const result = await toggleFollowUser(profile.id);
      setIsFollowing(result.following);
      toast.success(result.following ? `You are now following ${profile.name}` : `Unfollowed ${profile.name}`);
      // Refresh follower count
      const info = await getFollowerInfo(profile.id);
      setFollowersCount(info.count);
    } catch {
      toast.error("Failed to update follow status");
    }
  };

  const onConnectionAction = async () => {
    if (!profile) {
      return;
    }

    try {
      const result = await requestConnection(profile.id);
      const status = result.status as typeof connectionState;
      setConnectionState(status);

      if (status === "connected") {
        toast.success(`You are now connected with ${profile.name}`);
        const res = await getConnectionsCount(profile.id);
        setConnectionCount(res.count);
        return;
      }

      if (status === "requested") {
        toast.success(`Connection request sent to ${profile.name}`);
      }
    } catch {
      toast.error("Failed to send connection request");
    }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected
    e.target.value = "";

    setIsUploadingAvatar(true);
    try {
      const updatedUser = await uploadAvatar(file);
      setProfile(updatedUser);
      updateProfile(updatedUser);
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setIsUploadingAvatar(false);
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
      externalLinks: [...(project.externalLinks || [])],
      attachments: [...(project.attachments || [])],
    });
  };

  const cancelEditProject = () => {
    setEditingProjectId(null);
    setEditProject({});
  };

  const onSaveProject = async (projectId: string) => {
    if (!editProject.title?.trim()) { toast.error("Title is required"); return; }
    if (!editProject.problemStatement?.trim()) { toast.error("Problem statement is required"); return; }

    setIsSavingProject(true);
    try {
      const updated = await updateProject(projectId, {
        title: editProject.title,
        category: editProject.category,
        district: editProject.district,
        problemStatement: editProject.problemStatement,
        proposedSolution: editProject.proposedSolution,
        budget: Number(editProject.budget) || 0,
        externalLinks: editProject.externalLinks,
        attachments: editProject.attachments,
      });
      setUserProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
      setEditingProjectId(null);
      setEditProject({});
      toast.success("Project updated (v" + updated.versions + ")");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setIsSavingProject(false);
    }
  };

  const onProjectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    e.target.value = "";
    setIsUploadingProjectFiles(true);
    try {
      const uploaded = await uploadFiles(fileArray);
      setEditProject((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...uploaded.map((f) => f.url)],
      }));
    } catch {
      toast.error("File upload failed");
    } finally {
      setIsUploadingProjectFiles(false);
    }
  };

  const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    approved: { label: "Approved", className: "bg-success/10 text-success border-success/20", icon: <CheckCircle2 className="h-3 w-3" /> },
    under_review: { label: "Under Review", className: "bg-warning/10 text-warning border-warning/20", icon: <Clock className="h-3 w-3" /> },
    submitted: { label: "Submitted", className: "bg-info/10 text-info border-info/20", icon: <FileText className="h-3 w-3" /> },
    draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border", icon: <FileText className="h-3 w-3" /> },
    rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20", icon: <XCircle className="h-3 w-3" /> },
  };

  const nameInitials =
    profile?.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "AP";

  const joinedLabel = "March 2026";

  return (
    <div className="min-h-screen bg-background">
      <Header onNavigate={(target) => navigate(target === "dashboard" ? "/hub" : "/create")} onSearchChange={() => undefined} />
      <main className="mx-auto max-w-6xl px-4 pt-40 pb-8">
        {!profile ? (
          <Card className="overflow-hidden border-border shadow-card">
            <div className="h-36 bg-gradient-to-r from-navy via-navy-light to-navy-dark" />
            <CardContent className="-mt-12 p-6">
              <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                <AvatarFallback className="bg-muted text-lg font-semibold">AP</AvatarFallback>
              </Avatar>
              <h1 className="mt-4 text-2xl font-bold font-display text-foreground">Profile</h1>
              <p className="mt-2 text-sm text-muted-foreground">Profile data is loading or not available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            <Card className="overflow-hidden border-border shadow-card">
              <div className="h-36 bg-gradient-to-r from-navy via-navy-light to-navy-dark" />
              <CardContent className="-mt-14 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="flex items-end gap-4">
                    <div className="relative group">
                      <Avatar className="h-28 w-28 border-4 border-background shadow-md">
                        {profile.avatar ? <AvatarImage src={profile.avatar} alt={profile.name} /> : null}
                        <AvatarFallback className="bg-gold/20 text-2xl font-bold text-gold-dark">{nameInitials}</AvatarFallback>
                      </Avatar>
                      {isOwnProfile && (
                        <>
                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={(e) => void onAvatarChange(e)}
                          />
                          <button
                            type="button"
                            disabled={isUploadingAvatar}
                            onClick={() => avatarInputRef.current?.click()}
                            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-navy text-white flex items-center justify-center shadow-md border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                            title="Change profile photo"
                          >
                            <Camera className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-foreground font-display">{profile.name}</h1>
                      <p className="text-sm text-muted-foreground">{profile.rank} • Andhra Pradesh Police</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {profile.district}
                        </span>
                        <span>• Joined {joinedLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-info/10 text-info border-info/20">Active Officer</Badge>
                    <Badge className="bg-gold/15 text-gold-dark border-gold/30">Innovation Contributor</Badge>
                    {isOwnProfile && !isEditing ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-navy-light bg-background"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit Profile
                      </Button>
                    ) : null}
                    {isOwnProfile && isEditing ? (
                      <>
                        <Button type="button" variant="outline" onClick={onCancelEdit} disabled={isSaving}>
                          Cancel
                        </Button>
                        <Button type="button" onClick={() => void onSaveProfile()} disabled={isSaving}>
                          {isSaving ? "Saving..." : "Save"}
                        </Button>
                      </>
                    ) : null}
                    {!isOwnProfile ? (
                      <>
                        <Button type="button" variant={isFollowing ? "outline" : "default"} onClick={() => void onFollowToggle()}>
                          {isFollowing ? "Following" : "Follow"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
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
                        <Button type="button" onClick={() => navigate(`/messages?to=${profile.id}`)}>
                          Message
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="space-y-5 lg:col-span-8">
                <Card className="border-border shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg font-display">About</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-foreground">
                    {isOwnProfile && isEditing ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="profile-name">
                            Full Name
                          </label>
                          <input
                            id="profile-name"
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="profile-district">
                            District
                          </label>
                          <select
                            id="profile-district"
                            value={editDistrict}
                            onChange={(event) => setEditDistrict(event.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            {DISTRICTS.map((district) => (
                              <option key={district} value={district}>
                                {district}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="profile-bio">
                            About
                          </label>
                          <Textarea
                            id="profile-bio"
                            value={editBio}
                            onChange={(event) => setEditBio(event.target.value)}
                            className="min-h-[110px]"
                            placeholder="Describe your policing and innovation focus"
                          />
                        </div>
                      </div>
                    ) : (
                      <p>
                        {profile.bio?.trim() ||
                          "Committed to modernizing policing through data-driven innovation, rapid coordination, and officer-first digital collaboration across districts."}
                      </p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Role</p>
                        <p className="mt-1 font-semibold text-foreground">{profile.rank}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">District</p>
                        <p className="mt-1 font-semibold text-foreground">{isEditing ? editDistrict : profile.district}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg font-display">Network</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Followers</p>
                        <p className="mt-2 text-2xl font-bold text-foreground">{followersCount}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Officers following updates</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Connections</p>
                        <p className="mt-2 text-2xl font-bold text-foreground">{connectionCount}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Professional collaborators</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Innovations</p>
                        <p className="mt-2 text-2xl font-bold text-foreground">{profile.innovationsCount}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Submitted initiatives</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* My Projects */}
                {userProjects.length > 0 && (
                  <Card className="border-border shadow-card">
                    <CardHeader>
                      <CardTitle className="text-lg font-display">
                        {isOwnProfile ? "My Projects" : "Projects"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {userProjects.map((project) => {
                        const isEditingThis = editingProjectId === project.id;
                        const sc = statusConfig[project.status] ?? statusConfig.submitted;
                        return (
                          <div key={project.id} className="rounded-lg border border-border bg-muted/20 p-4">
                            {!isEditingThis ? (
                              <>
                                <div className="flex items-start justify-between gap-2">
                                  <button
                                    onClick={() => navigate(`/project/${project.id}`)}
                                    className="text-left text-sm font-semibold text-foreground hover:text-primary hover:underline"
                                  >
                                    {project.title}
                                  </button>
                                  <Badge variant="outline" className={`shrink-0 gap-1 text-[10px] ${sc.className}`}>
                                    {sc.icon} {sc.label}
                                  </Badge>
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>{project.district}</span>
                                  <span>·</span>
                                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                                  {project.versions > 1 && (
                                    <>
                                      <span>·</span>
                                      <span>v{project.versions}</span>
                                    </>
                                  )}
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {project.category.map((c) => (
                                    <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                                  ))}
                                </div>
                                {isOwnProfile && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 h-7 gap-1 px-2 text-xs"
                                    onClick={() => startEditProject(project)}
                                  >
                                    <Edit className="h-3 w-3" /> Edit
                                  </Button>
                                )}
                              </>
                            ) : (
                              <div className="space-y-3">
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
                                  <input
                                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                                    value={editProject.title ?? ""}
                                    onChange={(e) => setEditProject((p) => ({ ...p, title: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-muted-foreground">District</label>
                                  <select
                                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                                    value={editProject.district ?? ""}
                                    onChange={(e) => setEditProject((p) => ({ ...p, district: e.target.value }))}
                                  >
                                    {DISTRICTS.map((d) => (
                                      <option key={d} value={d}>{d}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Categories</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {CATEGORIES.map((cat) => {
                                      const selected = editProject.category?.includes(cat) ?? false;
                                      return (
                                        <Badge
                                          key={cat}
                                          variant={selected ? "default" : "outline"}
                                          className="cursor-pointer text-[10px]"
                                          onClick={() =>
                                            setEditProject((p) => ({
                                              ...p,
                                              category: selected
                                                ? (p.category ?? []).filter((c) => c !== cat)
                                                : [...(p.category ?? []), cat],
                                            }))
                                          }
                                        >
                                          {cat}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Problem Statement</label>
                                  <Textarea
                                    className="min-h-[60px] text-sm"
                                    value={editProject.problemStatement ?? ""}
                                    onChange={(e) => setEditProject((p) => ({ ...p, problemStatement: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Proposed Solution</label>
                                  <Textarea
                                    className="min-h-[60px] text-sm"
                                    value={editProject.proposedSolution ?? ""}
                                    onChange={(e) => setEditProject((p) => ({ ...p, proposedSolution: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Budget (₹)</label>
                                  <input
                                    type="number"
                                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                                    value={editProject.budget ?? ""}
                                    onChange={(e) => setEditProject((p) => ({ ...p, budget: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Attachments</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(editProject.attachments ?? []).map((url, idx) => (
                                      <Badge key={idx} variant="secondary" className="gap-1 text-[10px]">
                                        {url.split("/").pop()}
                                        <button
                                          className="ml-1 text-destructive hover:text-destructive/80"
                                          onClick={() =>
                                            setEditProject((p) => ({
                                              ...p,
                                              attachments: (p.attachments ?? []).filter((_, i) => i !== idx),
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
                                    className="mt-1.5 h-7 text-xs"
                                    disabled={isUploadingProjectFiles}
                                    onClick={() => editFileInputRef.current?.click()}
                                  >
                                    {isUploadingProjectFiles ? "Uploading…" : "Add Files"}
                                  </Button>
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={isSavingProject}
                                    onClick={() => onSaveProject(project.id)}
                                  >
                                    {isSavingProject ? "Saving…" : "Save Changes"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={cancelEditProject}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-5 lg:col-span-4">
                <Card className="border-border shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg font-display">Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-foreground">
                      <Mail className="h-4 w-4 text-info" />
                      <span className="truncate">{profile.email}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-foreground">
                      <Shield className="h-4 w-4 text-gold-dark" />
                      <span>{profile.rank} Officer</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-foreground">
                      <MapPin className="h-4 w-4 text-info" />
                      <span>{profile.district}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg font-display">Highlights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-foreground">
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">
                      <Sparkles className="h-4 w-4 text-gold-dark" />
                      Innovation-driven policing
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">
                      <Users className="h-4 w-4 text-info" />
                      Cross-district collaboration
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">
                      <UserPlus className="h-4 w-4 text-info" />
                      Network growth focus
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
