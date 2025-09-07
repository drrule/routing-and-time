import { useState } from "react";
import Header from "@/components/Header";
import RouteOptimizer, { Customer } from "@/components/RouteOptimizer";
import MapView from "@/components/MapView";
import ClientImporter from "@/components/ClientImporter";
import HomeBaseSetup from "@/components/HomeBaseSetup";
import MultiDayPlanner from "@/components/MultiDayPlanner";

interface HomeBase {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

const Index = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [homeBase, setHomeBase] = useState<HomeBase | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'multi'>('single');
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* View Mode Toggle */}
        <div className="mb-6">
          <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
            <button
              onClick={() => setViewMode('single')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'single' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Single Day
            </button>
            <button
              onClick={() => setViewMode('multi')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'multi' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Multi-Day Planning
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Planning Panel */}
          <div className="space-y-6">
            <HomeBaseSetup homeBase={homeBase} onSave={setHomeBase} />
            <ClientImporter onImport={setCustomers} />
            
            {viewMode === 'single' ? (
              <RouteOptimizer customers={customers} homeBase={homeBase} onOptimize={setCustomers} />
            ) : (
              <MultiDayPlanner customers={customers} homeBase={homeBase} onUpdateCustomers={setCustomers} />
            )}
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
