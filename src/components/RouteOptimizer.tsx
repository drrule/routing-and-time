import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Route, Fuel, CheckCircle2, Navigation } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  address: string;
  status: 'pending' | 'in-progress' | 'completed';
  estimatedTime: number;
  lat: number;
  lng: number;
}

interface RouteOptimizerProps {
  customers: Customer[];
}

const RouteOptimizer = ({ customers }: RouteOptimizerProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'in-progress':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const totalTime = customers.reduce((acc, customer) => acc + customer.estimatedTime, 0);
  const completedJobs = customers.filter(c => c.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Route Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-muted/20 shadow-[var(--shadow-soft)]">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Route className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Stops</p>
                <p className="text-2xl font-bold text-foreground">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-muted/20 shadow-[var(--shadow-soft)]">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Est. Time</p>
                <p className="text-2xl font-bold text-foreground">{Math.floor(totalTime / 60)}h {totalTime % 60}m</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-muted/20 shadow-[var(--shadow-soft)]">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">{completedJobs}/{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-muted/20 shadow-[var(--shadow-soft)]">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Fuel className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Est. Miles</p>
                <p className="text-2xl font-bold text-foreground">23.4</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route List */}
      <Card className="shadow-[var(--shadow-medium)]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              Today's Route
            </CardTitle>
            <Button 
              variant="default" 
              className="bg-[var(--gradient-primary)] hover:opacity-90 transition-[var(--transition-smooth)]"
            >
              Optimize Route
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No clients imported yet. Use the import tool above to add your client list.</p>
              </div>
            ) : (
              customers.map((customer, index) => (
              <div 
                key={customer.id} 
                className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-card to-muted/10 hover:shadow-[var(--shadow-soft)] transition-[var(--transition-smooth)]"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{customer.name}</h3>
                    <div className="flex items-center text-muted-foreground text-sm">
                      <MapPin className="h-4 w-4 mr-1" />
                      {customer.address}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      {customer.estimatedTime}min
                    </div>
                  </div>
                  <Badge className={getStatusColor(customer.status)}>
                    {customer.status.replace('-', ' ')}
                  </Badge>
                </div>
              </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RouteOptimizer;
export type { Customer };