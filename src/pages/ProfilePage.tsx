import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Mail, MapPin, Shield, Sparkles, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DISTRICTS, type User } from "@/data/mockData";
import { useAuth } from "@/hooks/use-auth";
import { seedDatabaseIfEmpty } from "@/services/database";
import { subscribeCurrentUserProfile, updateCurrentUserProfile } from "@/services/realtime";
import {
  getConnectionCount,
  getFollowerCount,
  getRelationshipState,
  requestConnection,
  respondConnectionRequest,
  toggleFollowUser,
} from "@/services/auth";
import { fetchUserById } from "@/services/realtime";

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

      const relation = getRelationshipState(userId);
      setIsFollowing(relation.isFollowing);
      setConnectionState(relation.connection);
    }
  }, [isOwnProfile, userId, session]);

  useEffect(() => {
    if (!isOwnProfile) {
      return;
    }

    seedDatabaseIfEmpty();
    return subscribeCurrentUserProfile((user) => {
      if (user) {
        setProfile(user);
      }
    });
  }, [isOwnProfile]);

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

  const onFollowToggle = () => {
    if (!profile) {
      return;
    }

    const nextFollowing = toggleFollowUser(profile.id);
    setIsFollowing(nextFollowing);
    toast.success(nextFollowing ? `You are now following ${profile.name}` : `Unfollowed ${profile.name}`);
  };

  const onConnectionAction = () => {
    if (!profile) {
      return;
    }

    if (connectionState === "incoming-request") {
      const next = respondConnectionRequest(profile.id, true);
      setConnectionState(next);
      toast.success(`You are now connected with ${profile.name}`);
      return;
    }

    const next = requestConnection(profile.id);
    setConnectionState(next);

    if (next === "connected") {
      toast.success(`You are now connected with ${profile.name}`);
      return;
    }

    if (next === "requested") {
      toast.success(`Connection request sent to ${profile.name}`);
    }
  };

  const nameInitials =
    profile?.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "AP";

  const followersCount = profile
    ? isOwnProfile
      ? Math.max(profile.connectionsCount + profile.innovationsCount * 3, profile.connectionsCount)
      : Math.max(getFollowerCount(profile.id), profile.connectionsCount)
    : 0;

  const connectionCount = profile
    ? isOwnProfile
      ? profile.connectionsCount
      : Math.max(getConnectionCount(profile.id), profile.connectionsCount)
    : 0;

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
                    <Avatar className="h-28 w-28 border-4 border-background shadow-md">
                      {profile.avatar ? <AvatarImage src={profile.avatar} alt={profile.name} /> : null}
                      <AvatarFallback className="bg-gold/20 text-2xl font-bold text-gold-dark">{nameInitials}</AvatarFallback>
                    </Avatar>
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
                        <Button type="button" variant={isFollowing ? "outline" : "default"} onClick={onFollowToggle}>
                          {isFollowing ? "Following" : "Follow"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onConnectionAction}
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
