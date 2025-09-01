import { useState } from "react";
import Header from "@/components/Header";
import RouteOptimizer, { Customer } from "@/components/RouteOptimizer";
import MapView from "@/components/MapView";
import ClientImporter from "@/components/ClientImporter";
import HomeBaseSetup from "@/components/HomeBaseSetup";

interface HomeBase {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

const Index = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [homeBase, setHomeBase] = useState<HomeBase | null>(null);
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Route Optimization Panel */}
          <div className="space-y-6">
            <HomeBaseSetup homeBase={homeBase} onSave={setHomeBase} />
            <ClientImporter onImport={setCustomers} />
            <RouteOptimizer customers={customers} homeBase={homeBase} onOptimize={setCustomers} />
          </div>
          
          {/* Map View */}
          <div>
            <MapView customers={customers} homeBase={homeBase} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
