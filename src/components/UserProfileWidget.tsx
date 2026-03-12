import { User as UserIcon, Award, Users } from "lucide-react";
import { MOCK_CURRENT_USER } from "@/data/mockData";

const UserProfileWidget = () => {
  const user = MOCK_CURRENT_USER;

  return (
    <div className="rounded-xl bg-card shadow-card border border-border overflow-hidden">
      {/* Banner */}
      <div className="gradient-navy h-20 relative">
        <div className="absolute -bottom-8 left-4">
          <div className="h-16 w-16 rounded-full bg-gold flex items-center justify-center border-4 border-card shadow-md">
            <UserIcon className="h-7 w-7 text-navy-dark" />
          </div>
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
