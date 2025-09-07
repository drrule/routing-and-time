import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Route, Fuel, CheckCircle2, Navigation, GripVertical, CheckCircle, Copy } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";

export interface Customer {
  id: string;
  name: string;
  address: string;
  completed: boolean;
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const getStatusColor = (completed: boolean) => {
    return completed ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground';
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
    if (!homeBase) {
      toast({
        title: "Set Home Base",
        description: "Please set a starting address before optimizing.",
        variant: "destructive",
      });
      return;
    }
    if (customers.length === 0) {
      toast({
        title: "No clients imported",
        description: "Import your client list to optimize a route.",
        variant: "destructive",
      });
      return;
    }

    // Calculate current route distance for comparison
    const currentDistance = calculateRouteDistance();

    const unvisited = [...customers];
    const optimized: Customer[] = [];
    let currentLat = homeBase.lat;
    let currentLng = homeBase.lng;

    console.log('Starting optimization from home base:', { lat: currentLat, lng: currentLng });

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
      
      console.log(`Added ${nearestCustomer.name} at distance ${nearestDistance.toFixed(1)} miles`);
    }

    // Calculate optimized route distance
    const optimizedDistance = calculateOptimizedRouteDistance(optimized);
    const savings = currentDistance - optimizedDistance;
    const savingsPercent = currentDistance > 0 ? (savings / currentDistance * 100) : 0;

    console.log('Route optimization complete:', {
      original: currentDistance.toFixed(1),
      optimized: optimizedDistance.toFixed(1),
      savings: savings.toFixed(1)
    });

    onOptimize?.(optimized);

    // Show optimization results
    toast({
      title: "Single-Day Route Optimized! 🎯",
      description: `Saved ${savings.toFixed(1)} miles (${savingsPercent.toFixed(1)}%). New route: ${optimizedDistance.toFixed(1)} miles`,
      duration: 5000,
    });
  };

  // Calculate distance for a specific route order
  const calculateOptimizedRouteDistance = (routeCustomers: Customer[]) => {
    if (!homeBase || routeCustomers.length === 0) return 0;
    
    let totalDistance = 0;
    let currentLat = homeBase.lat;
    let currentLng = homeBase.lng;

    for (const customer of routeCustomers) {
      totalDistance += calculateDistance(currentLat, currentLng, customer.lat, customer.lng);
      currentLat = customer.lat;
      currentLng = customer.lng;
    }

    // Add distance back to home base
    totalDistance += calculateDistance(currentLat, currentLng, homeBase.lat, homeBase.lng);
    return totalDistance;
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

  const completedJobs = customers.filter(c => c.completed).length;
  const totalDistance = calculateRouteDistance();

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Create new array with reordered customers
    const newCustomers = [...customers];
    const draggedCustomer = newCustomers[draggedIndex];
    
    // Remove the dragged item
    newCustomers.splice(draggedIndex, 1);
    
    // Insert at new position
    newCustomers.splice(dropIndex, 0, draggedCustomer);
    
    // Update the route
    onOptimize?.(newCustomers);
    
    // Show feedback
    toast({
      title: "Route Reordered! 🔄",
      description: `Moved ${draggedCustomer.name} to position ${dropIndex + 1}`,
      duration: 2000,
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const copyAddress = async (address: string, customerName: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: "Address Copied! 📋",
        description: `${customerName}'s address copied to clipboard`,
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy address to clipboard",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const toggleCustomerStatus = (customerId: string) => {
    const updatedCustomers = customers.map(customer =>
      customer.id === customerId
        ? { ...customer, completed: !customer.completed }
        : customer
    );
    onOptimize?.(updatedCustomers);
  };

  return (
    <div className="space-y-6">
      {/* Route Summary - reduced to 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                  <GripVertical className="h-3 w-3" />
                  Drag and drop to reorder stops manually
                </div>
                {customers.map((customer, index) => (
                <div 
                  key={customer.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center justify-between p-4 rounded-lg border 
                    bg-gradient-to-r from-card to-muted/10 
                    hover:shadow-[var(--shadow-soft)] 
                    transition-[var(--transition-smooth)]
                    cursor-move select-none
                    ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                    ${dragOverIndex === index && draggedIndex !== index ? 'border-primary border-2 bg-primary/5' : ''}
                  `}
                >
                  <div className="flex items-center space-x-4">
                    <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                      {index + 1}
                    </div>
                    <button
                      onClick={() => toggleCustomerStatus(customer.id)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        customer.completed 
                          ? 'bg-success border-success text-white' 
                          : 'border-muted-foreground hover:border-primary'
                      }`}
                    >
                      {customer.completed && <CheckCircle className="h-4 w-4" />}
                    </button>
                    <div className="flex-1">
                      <p className={`font-medium ${customer.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {customer.name}
                      </p>
                      <p className={`text-sm text-muted-foreground ${customer.completed ? 'line-through' : ''}`}>
                        {customer.address}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {customer.completed ? (
                      <Badge className={getStatusColor(customer.completed)}>
                        Done
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyAddress(customer.address, customer.name)}
                        className="h-8 px-3"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    )}
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RouteOptimizer;