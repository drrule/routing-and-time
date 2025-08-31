import Header from "@/components/Header";
import RouteOptimizer from "@/components/RouteOptimizer";
import MapView from "@/components/MapView";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Route Optimization Panel */}
          <div className="space-y-6">
            <RouteOptimizer />
          </div>
          
          {/* Map View */}
          <div>
            <MapView />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
