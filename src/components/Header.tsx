import { Leaf, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="bg-card border-b border-border shadow-[var(--shadow-soft)]">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[var(--gradient-primary)] rounded-lg flex items-center justify-center shadow-[var(--shadow-soft)]">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Mow Magic Route</h1>
              <p className="text-sm text-muted-foreground">Professional Lawn Care</p>
            </div>
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="hover:bg-muted transition-[var(--transition-smooth)]"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="hover:bg-muted transition-[var(--transition-smooth)]"
            >
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;