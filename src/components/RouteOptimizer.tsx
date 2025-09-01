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

interface HomeBase {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface RouteOptimizerProps {
  customers: Customer[];
  homeBase: HomeBase | null;
  onOptimize?: (optimizedCustomers: Customer[]) => void;
}

const RouteOptimizer = ({ customers, homeBase, onOptimize }: RouteOptimizerProps) => {
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

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Optimize route using Nearest Neighbor algorithm
  const optimizeRoute = () => {
    if (!homeBase || customers.length === 0) return;

    const unvisited = [...customers];
    const optimized: Customer[] = [];
    let currentLat = homeBase.lat;
    let currentLng = homeBase.lng;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = calculateDistance(currentLat, currentLng, unvisited[0].lat, unvisited[0].lng);

      // Find the nearest unvisited customer
      for (let i = 1; i < unvisited.length; i++) {
        const distance = calculateDistance(currentLat, currentLng, unvisited[i].lat, unvisited[i].lng);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      // Move to the nearest customer
      const nearestCustomer = unvisited.splice(nearestIndex, 1)[0];
      optimized.push(nearestCustomer);
      currentLat = nearestCustomer.lat;
      currentLng = nearestCustomer.lng;
    }

    onOptimize?.(optimized);
  };

  // Calculate total route distance
  const calculateRouteDistance = () => {
    if (!homeBase || customers.length === 0) return 0;
    
    let totalDistance = 0;
    let currentLat = homeBase.lat;
    let currentLng = homeBase.lng;

    for (const customer of customers) {
      totalDistance += calculateDistance(currentLat, currentLng, customer.lat, customer.lng);
      currentLat = customer.lat;
      currentLng = customer.lng;
    }

    // Add distance back to home base
    totalDistance += calculateDistance(currentLat, currentLng, homeBase.lat, homeBase.lng);
    return totalDistance;
  };

  const totalTime = customers.reduce((acc, customer) => acc + customer.estimatedTime, 0);
  const completedJobs = customers.filter(c => c.status === 'completed').length;
  const totalDistance = calculateRouteDistance();

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
                <p className="text-2xl font-bold text-foreground">{totalDistance.toFixed(1)}</p>
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
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={optimizeRoute}
              disabled={!homeBase || customers.length === 0}
            >
              <Route className="h-4 w-4 mr-2" />
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