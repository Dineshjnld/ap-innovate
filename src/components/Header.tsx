import { useState } from "react";
import {
  Search, Bell, MessageSquare, LogOut, Menu, X, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import apPoliceLogo from "@/assets/ap-police-logo.png";

interface HeaderProps {
  onCreateProject: () => void;
  onNavigate: (page: string) => void;
}

const Header = ({ onCreateProject, onNavigate }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="gradient-navy sticky top-0 z-50 border-b border-navy-light">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <button
          onClick={() => onNavigate("dashboard")}
          className="flex items-center gap-3"
        >
          <img src={apPoliceLogo} alt="AP Police" className="h-10 w-10 object-contain" />
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold leading-tight text-primary-foreground font-display">
              AP Police
            </h1>
            <p className="text-xs text-gold">Innovation Hub</p>
          </div>
        </button>

        {/* Search */}
        <div className="hidden md:flex relative mx-6 flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search innovations, officers, districts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg bg-navy-light/50 pl-9 pr-4 text-sm text-primary-foreground placeholder:text-primary-foreground/40 outline-none focus:ring-2 focus:ring-gold/50 border border-navy-light"
          />
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            size="sm"
            className="bg-gold text-navy-dark hover:bg-gold-dark font-semibold"
            onClick={onCreateProject}
          >
            <Plus className="h-4 w-4" />
            New Innovation
          </Button>
          <Button variant="ghost" size="icon" className="text-primary-foreground/70 hover:text-gold hover:bg-navy-light">
            <MessageSquare className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-primary-foreground/70 hover:text-gold hover:bg-navy-light relative">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold animate-pulse-gold" />
          </Button>
          <Button variant="ghost" size="icon" className="text-primary-foreground/70 hover:text-gold hover:bg-navy-light">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile menu */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-primary-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden gradient-navy border-t border-navy-light px-4 pb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="h-9 w-full rounded-lg bg-navy-light/50 pl-9 pr-4 text-sm text-primary-foreground placeholder:text-primary-foreground/40 outline-none border border-navy-light"
            />
          </div>
          <Button className="w-full bg-gold text-navy-dark hover:bg-gold-dark font-semibold" onClick={onCreateProject}>
            <Plus className="h-4 w-4" /> New Innovation
          </Button>
        </div>
      )}
    </header>
  );
};

export default Header;
