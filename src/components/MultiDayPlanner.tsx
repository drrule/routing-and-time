import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Route, Copy, CheckCircle, MoreVertical, Shuffle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { clusterCustomers, optimizeDayRoute, calculateDistance } from "@/utils/clustering";
import { Customer } from "@/components/RouteOptimizer";

interface HomeBase {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface DayPlan {
  day: number;
  dayName: string;
  customers: Customer[];
  totalDistance: number;
}

interface MultiDayPlannerProps {
  customers: Customer[];
  homeBase: HomeBase | null;
  onUpdateCustomers: (customers: Customer[]) => void;
}

const MultiDayPlanner = ({ customers, homeBase, onUpdateCustomers }: MultiDayPlannerProps) => {
  const [numDays, setNumDays] = useState(3);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [draggedCustomer, setDraggedCustomer] = useState<Customer | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Generate initial clustering when customers or settings change
  useEffect(() => {
    if (customers.length === 0) {
      setDayPlans([]);
      return;
    }

    generateDayPlans();
  }, [customers, numDays, homeBase]);

  const generateDayPlans = () => {
    if (!homeBase) {
      toast({
        title: "Set Home Base",
        description: "Please set a starting address before planning multiple days.",
        variant: "destructive",
      });
      return;
    }

    // Only plan for incomplete customers
    const incompleteCustomers = customers.filter(c => !c.completed);
    
    if (incompleteCustomers.length === 0) {
      setDayPlans([]);
      return;
    }

    const clusters = clusterCustomers(incompleteCustomers, numDays, homeBase);
    
    const plans: DayPlan[] = clusters.map((cluster, index) => {
      const dayCustomers = cluster.points.map(point => point.data);
      const optimizedCustomers = optimizeDayRoute(dayCustomers, homeBase);
      const totalDistance = calculateDayDistance(optimizedCustomers);

      return {
        day: index + 1,
        dayName: dayNames[index] || `Day ${index + 1}`,
        customers: optimizedCustomers,
        totalDistance
      };
    });

    setDayPlans(plans.filter(plan => plan.customers.length > 0));
  };

  const calculateDayDistance = (dayCustomers: Customer[]): number => {
    if (!homeBase || dayCustomers.length === 0) return 0;
    
    let totalDistance = 0;
    let currentLat = homeBase.lat;
    let currentLng = homeBase.lng;

    for (const customer of dayCustomers) {
      totalDistance += calculateDistance(currentLat, currentLng, customer.lat, customer.lng);
      currentLat = customer.lat;
      currentLng = customer.lng;
    }

    // Add distance back to home base
    totalDistance += calculateDistance(currentLat, currentLng, homeBase.lat, homeBase.lng);
    return totalDistance;
  };

  const copyDayAddresses = (dayPlan: DayPlan) => {
    const addressList = dayPlan.customers.map((customer, index) => 
      `${index + 1}. ${customer.name} - ${customer.address}`
    ).join('\n');
    
    navigator.clipboard.writeText(addressList);
    toast({
      title: "Day Plan Copied! 📋",
      description: `${dayPlan.dayName} addresses copied to clipboard`,
      duration: 3000,
    });
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
    onUpdateCustomers(updatedCustomers);
  };

  const optimizeDayRoutes = () => {
    const optimizedPlans = dayPlans.map(plan => ({
      ...plan,
      customers: optimizeDayRoute(plan.customers, homeBase!),
      totalDistance: calculateDayDistance(plan.customers)
    }));
    
    setDayPlans(optimizedPlans);
    
    toast({
      title: "Routes Optimized! 🎯",
      description: "All day routes have been optimized for shortest distance",
      duration: 3000,
    });
  };

  // Drag and drop handlers
  const handleDragStart = (customer: Customer) => {
    setDraggedCustomer(customer);
  };

  const handleDragOver = (e: React.DragEvent, dayIndex: number) => {
    e.preventDefault();
    setDragOverDay(dayIndex);
  };

  const handleDragLeave = () => {
    setDragOverDay(null);
  };

  const handleDrop = (e: React.DragEvent, targetDayIndex: number) => {
    e.preventDefault();
    
    if (!draggedCustomer) return;

    // Find source day
    const sourceDayIndex = dayPlans.findIndex(plan => 
      plan.customers.some(c => c.id === draggedCustomer.id)
    );

    if (sourceDayIndex === targetDayIndex) {
      setDraggedCustomer(null);
      setDragOverDay(null);
      return;
    }

    // Move customer between days
    const updatedPlans = [...dayPlans];
    
    // Remove from source day
    if (sourceDayIndex !== -1) {
      updatedPlans[sourceDayIndex] = {
        ...updatedPlans[sourceDayIndex],
        customers: updatedPlans[sourceDayIndex].customers.filter(c => c.id !== draggedCustomer.id)
      };
    }

    // Add to target day
    updatedPlans[targetDayIndex] = {
      ...updatedPlans[targetDayIndex],
      customers: [...updatedPlans[targetDayIndex].customers, draggedCustomer]
    };

    // Recalculate distances
    updatedPlans.forEach(plan => {
      plan.totalDistance = calculateDayDistance(plan.customers);
    });

    setDayPlans(updatedPlans);
    setDraggedCustomer(null);
    setDragOverDay(null);

    toast({
      title: "Customer Moved! 🔄",
      description: `${draggedCustomer.name} moved to ${updatedPlans[targetDayIndex].dayName}`,
      duration: 2000,
    });
  };

  const totalCustomers = dayPlans.reduce((sum, plan) => sum + plan.customers.length, 0);
  const totalDistance = dayPlans.reduce((sum, plan) => sum + plan.totalDistance, 0);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="shadow-[var(--shadow-medium)]">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Multi-Day Route Planning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="num-days" className="text-sm font-medium">Working Days:</label>
              <Select value={numDays.toString()} onValueChange={(value) => setNumDays(parseInt(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={generateDayPlans} variant="outline" size="sm">
              <Shuffle className="h-4 w-4 mr-2" />
              Re-cluster
            </Button>

            <Button onClick={optimizeDayRoutes} variant="default" size="sm">
              <Route className="h-4 w-4 mr-2" />
              Optimize All Routes
            </Button>
          </div>

          {/* Summary */}
          {dayPlans.length > 0 && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{totalCustomers}</p>
                <p className="text-sm text-muted-foreground">Total Stops</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{dayPlans.length}</p>
                <p className="text-sm text-muted-foreground">Working Days</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{totalDistance.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Total Miles</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Plans */}
      {dayPlans.length === 0 ? (
        <Card className="shadow-[var(--shadow-medium)]">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                {customers.filter(c => !c.completed).length === 0 
                  ? "All customers completed! 🎉" 
                  : "Set home base and import customers to plan multiple days"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {dayPlans.map((dayPlan, dayIndex) => (
            <Card 
              key={dayPlan.day}
              className={`shadow-[var(--shadow-medium)] transition-all ${
                dragOverDay === dayIndex ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, dayIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, dayIndex)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{dayPlan.dayName}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyDayAddresses(dayPlan)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy All
                  </Button>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{dayPlan.customers.length} stops</span>
                  <span>{dayPlan.totalDistance.toFixed(1)} miles</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayPlan.customers.map((customer, customerIndex) => (
                  <div
                    key={customer.id}
                    draggable
                    onDragStart={() => handleDragStart(customer)}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-all cursor-move"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                      {customerIndex + 1}
                    </div>
                    <button
                      onClick={() => toggleCustomerStatus(customer.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        customer.completed 
                          ? 'bg-success border-success text-white' 
                          : 'border-muted-foreground hover:border-primary'
                      }`}
                    >
                      {customer.completed && <CheckCircle className="h-3 w-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${customer.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {customer.name}
                      </p>
                      <p className={`text-xs text-muted-foreground truncate ${customer.completed ? 'line-through' : ''}`}>
                        {customer.address}
                      </p>
                    </div>
                    {!customer.completed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyAddress(customer.address, customer.name)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {dayPlan.customers.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">Drop customers here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiDayPlanner;