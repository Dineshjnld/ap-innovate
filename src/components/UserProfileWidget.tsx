import { Award, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const UserProfileWidget = () => {
  const { session } = useAuth();
  const user = session?.user;

  if (!user) return null;

  return (
    <div className="rounded-xl bg-card shadow-card border border-border overflow-hidden">
      {/* Banner */}
      <div className="gradient-navy h-20 relative">
        <div className="absolute -bottom-8 left-4">
          <Avatar className="h-16 w-16 border-4 border-card shadow-md">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-gold text-navy-dark text-lg font-bold">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="pt-10 px-4 pb-4">
        <h3 className="font-semibold text-foreground">{user.name}</h3>
        <p className="text-sm text-gold-dark font-medium">{user.rank}</p>
        <p className="text-xs text-muted-foreground">{user.district} District</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <Award className="h-4 w-4 text-gold-dark" />
            <div>
              <p className="text-sm font-semibold text-foreground">{user.innovationsCount}</p>
              <p className="text-xs text-muted-foreground">Innovations</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <Users className="h-4 w-4 text-info" />
            <div>
              <p className="text-sm font-semibold text-foreground">{user.connectionsCount}</p>
              <p className="text-xs text-muted-foreground">Connections</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileWidget;
