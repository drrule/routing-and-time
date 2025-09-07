import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Route, Copy, CheckCircle, MoreVertical, Shuffle, Plus, Minus } from "lucide-react";
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
  onDayPlansChange: (dayPlans: DayPlan[]) => void;
}

const MultiDayPlanner = ({ customers, homeBase, onUpdateCustomers, onDayPlansChange }: MultiDayPlannerProps) => {
  const [numDays, setNumDays] = useState(3);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [draggedCustomer, setDraggedCustomer] = useState<Customer | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [hasNewCustomers, setHasNewCustomers] = useState(false);
  const [lastCustomerCount, setLastCustomerCount] = useState(0);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Track when new customers are added
  useEffect(() => {
    const currentCount = customers.length;
    if (currentCount > lastCustomerCount) {
      setHasNewCustomers(true);
    }
    setLastCustomerCount(currentCount);
  }, [customers.length, lastCustomerCount]);

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
    onDayPlansChange(plans.filter(plan => plan.customers.length > 0));
    
    // Hide re-cluster button after clustering
    setHasNewCustomers(false);
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
    onDayPlansChange(optimizedPlans);
    
    toast({
      title: "Multi-Day Routes Optimized! 🎯",
      description: "All day routes have been optimized for shortest distance",
      duration: 3000,
    });
  };

  // Identify customer groups (house groups within walking distance)
  const identifyCustomerGroups = (customers: Customer[]): Customer[][] => {
    const HOUSE_GROUP_DISTANCE = 0.1; // miles (increased - roughly 6-8 houses)
    const groups: Customer[][] = [];
    const used = new Set<string>();

    customers.forEach(customer => {
      if (used.has(customer.id)) return;

      const group: Customer[] = [customer];
      used.add(customer.id);

      // Find all other customers within house group distance
      customers.forEach(otherCustomer => {
        if (used.has(otherCustomer.id)) return;
        
        const distance = calculateDistance(customer.lat, customer.lng, otherCustomer.lat, otherCustomer.lng);
        if (distance <= HOUSE_GROUP_DISTANCE) {
          group.push(otherCustomer);
          used.add(otherCustomer.id);
        }
      });

      groups.push(group);
    });

    return groups;
  };

  const moveCustomerGroupBetweenDays = (customers: Customer[], fromDayIndex: number, toDayIndex: number) => {
    const updatedPlans = [...dayPlans];
    
    // Remove customers from source day
    updatedPlans[fromDayIndex] = {
      ...updatedPlans[fromDayIndex],
      customers: updatedPlans[fromDayIndex].customers.filter(c => 
        !customers.some(groupCustomer => groupCustomer.id === c.id)
      )
    };

    // Add customers to target day
    updatedPlans[toDayIndex] = {
      ...updatedPlans[toDayIndex],
      customers: [...updatedPlans[toDayIndex].customers, ...customers]
    };

    // Recalculate distances and optimize both affected days
    updatedPlans[fromDayIndex].customers = optimizeDayRoute(updatedPlans[fromDayIndex].customers, homeBase!);
    updatedPlans[fromDayIndex].totalDistance = calculateDayDistance(updatedPlans[fromDayIndex].customers);
    
    updatedPlans[toDayIndex].customers = optimizeDayRoute(updatedPlans[toDayIndex].customers, homeBase!);
    updatedPlans[toDayIndex].totalDistance = calculateDayDistance(updatedPlans[toDayIndex].customers);

    setDayPlans(updatedPlans);
    onDayPlansChange(updatedPlans);
    setHasNewCustomers(false); // Hide re-cluster button after manual adjustment
  };

  const calculateDayCentroid = (dayCustomers: Customer[]) => {
    if (dayCustomers.length === 0 && homeBase) {
      return { lat: homeBase.lat, lng: homeBase.lng };
    }
    
    if (dayCustomers.length === 0) {
      return { lat: 37.210388, lng: -93.297256 }; // Fallback
    }

    const avgLat = dayCustomers.reduce((sum, customer) => sum + customer.lat, 0) / dayCustomers.length;
    const avgLng = dayCustomers.reduce((sum, customer) => sum + customer.lng, 0) / dayCustomers.length;
    
    return { lat: avgLat, lng: avgLng };
  };

  const makeHeavier = (targetDayIndex: number) => {
    if (!homeBase) return;
    
    const targetDay = dayPlans[targetDayIndex];
    if (!targetDay) return;

    // Find the best house group or individual customer to move from other days
    let bestMove: { customers: Customer[]; sourceDayIndex: number; distance: number } | null = null;
    let bestDistance = Infinity;

    // Calculate centroid of target day for proximity comparison
    const targetCentroid = calculateDayCentroid(targetDay.customers);

    dayPlans.forEach((sourceDay, sourceDayIndex) => {
      if (sourceDayIndex === targetDayIndex || sourceDay.customers.length <= 1) return;

      // Check for house groups (customers within ~3 houses)
      const houseGroups = identifyCustomerGroups(sourceDay.customers);
      
      houseGroups.forEach(group => {
        // Calculate distance from group centroid to target day centroid
        const groupCentroid = {
          lat: group.reduce((sum, c) => sum + c.lat, 0) / group.length,
          lng: group.reduce((sum, c) => sum + c.lng, 0) / group.length
        };
        
        const distanceToTarget = calculateDistance(
          groupCentroid.lat, groupCentroid.lng,
          targetCentroid.lat, targetCentroid.lng
        );

        if (distanceToTarget < bestDistance && group.length <= sourceDay.customers.length - 1) {
          bestDistance = distanceToTarget;
          bestMove = {
            customers: group,
            sourceDayIndex,
            distance: distanceToTarget
          };
        }
      });
    });

    if (bestMove) {
      moveCustomerGroupBetweenDays(bestMove.customers, bestMove.sourceDayIndex, targetDayIndex);
      const groupSize = bestMove.customers.length;
      const groupDesc = groupSize > 1 ? `house group (${groupSize} customers)` : bestMove.customers[0].name;
      toast({
        title: "Day Made Heavier! ➕",
        description: `Moved ${groupDesc} to ${targetDay.dayName}`,
        duration: 2000,
      });
    } else {
      toast({
        title: "No Optimal Move Found",
        description: "No suitable customers to move from other days",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const makeLighter = (sourceDayIndex: number) => {
    if (!homeBase) return;
    
    const sourceDay = dayPlans[sourceDayIndex];
    if (!sourceDay || sourceDay.customers.length <= 1) {
      toast({
        title: "Cannot Make Lighter",
        description: "Day must have at least 2 customers",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    // Find the best house group or individual customer to move to another day
    let bestMove: { customers: Customer[]; targetDayIndex: number; distance: number } | null = null;
    let bestDistance = Infinity;

    // Check for house groups in source day
    const houseGroups = identifyCustomerGroups(sourceDay.customers);
    
    houseGroups.forEach(group => {
      const groupCentroid = {
        lat: group.reduce((sum, c) => sum + c.lat, 0) / group.length,
        lng: group.reduce((sum, c) => sum + c.lng, 0) / group.length
      };

      dayPlans.forEach((targetDay, targetDayIndex) => {
        if (targetDayIndex === sourceDayIndex) return;

        // Calculate distance from group to target day centroid
        const targetCentroid = calculateDayCentroid(targetDay.customers);
        const distanceToTarget = calculateDistance(
          groupCentroid.lat, groupCentroid.lng,
          targetCentroid.lat, targetCentroid.lng
        );

        if (distanceToTarget < bestDistance) {
          bestDistance = distanceToTarget;
          bestMove = {
            customers: group,
            targetDayIndex,
            distance: distanceToTarget
          };
        }
      });
    });

    if (bestMove) {
      moveCustomerGroupBetweenDays(bestMove.customers, sourceDayIndex, bestMove.targetDayIndex);
      const groupSize = bestMove.customers.length;
      const groupDesc = groupSize > 1 ? `house group (${groupSize} customers)` : bestMove.customers[0].name;
      toast({
        title: "Day Made Lighter! ➖",
        description: `Moved ${groupDesc} to ${dayPlans[bestMove.targetDayIndex].dayName}`,
        duration: 2000,
      });
    }
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
    moveCustomerGroupBetweenDays([draggedCustomer], sourceDayIndex, targetDayIndex);
    setDraggedCustomer(null);
    setDragOverDay(null);

    toast({
      title: "Customer Moved! 🔄",
      description: `${draggedCustomer.name} moved to ${dayPlans[targetDayIndex].dayName}`,
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
            
            {hasNewCustomers && (
              <Button onClick={generateDayPlans} variant="outline" size="sm">
                <Shuffle className="h-4 w-4 mr-2" />
                Re-cluster
              </Button>
            )}

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
                
                {/* Day Controls */}
                <div className="pt-3 border-t flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => makeHeavier(dayIndex)}
                    className="flex-1 h-8"
                    disabled={dayPlans.filter(p => p.customers.length > 0).length <= 1}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Heavier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => makeLighter(dayIndex)}
                    className="flex-1 h-8"
                    disabled={dayPlan.customers.length <= 1}
                  >
                    <Minus className="h-3 w-3 mr-1" />
                    Lighter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiDayPlanner;