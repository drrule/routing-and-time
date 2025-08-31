import { useState } from "react";
import Header from "@/components/Header";
import RouteOptimizer, { Customer } from "@/components/RouteOptimizer";
import MapView from "@/components/MapView";
import ClientImporter from "@/components/ClientImporter";

const Index = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Route Optimization Panel */}
          <div className="space-y-6">
            <ClientImporter onImport={setCustomers} />
            <RouteOptimizer customers={customers} />
          </div>
          
          {/* Map View */}
          <div>
            <MapView customers={customers} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
