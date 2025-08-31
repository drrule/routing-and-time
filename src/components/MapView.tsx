import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map, MapPin, Navigation2 } from "lucide-react";

const MapView = () => {
  return (
    <Card className="h-[600px] shadow-[var(--shadow-medium)]">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          Route Map
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full">
        <div className="relative w-full h-[500px] bg-gradient-to-br from-muted/30 to-muted/60 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
          {/* Placeholder for map integration */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Navigation2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Interactive Map Coming Soon</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                This area will display your optimized route with customer locations, 
                turn-by-turn directions, and real-time traffic updates.
              </p>
            </div>
            
            {/* Mock route visualization */}
            <div className="mt-8 space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <div className="w-8 h-0.5 bg-gradient-to-r from-success to-warning"></div>
                <div className="w-3 h-3 bg-warning rounded-full animate-pulse"></div>
                <div className="w-8 h-0.5 bg-gradient-to-r from-warning to-muted"></div>
                <div className="w-3 h-3 bg-muted rounded-full"></div>
              </div>
              <p className="text-xs text-muted-foreground">
                Sample route: Completed → In Progress → Pending
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapView;