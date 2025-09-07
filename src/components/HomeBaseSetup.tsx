import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, MapPin, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface HomeBase {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface HomeBaseSetupProps {
  homeBase: HomeBase | null;
  onSave: (homeBase: HomeBase) => void;
}

const HomeBaseSetup = ({ homeBase, onSave }: HomeBaseSetupProps) => {
  const [name, setName] = useState(homeBase?.name || "");
  const [address, setAddress] = useState(homeBase?.address || "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const geocodeAddress = async (address: string) => {
    try {
      // For now, use a basic geocoding approach with major cities
      // In production, you'd use Mapbox Geocoding API
      const cityCoordinates: { [key: string]: { lat: number; lng: number } } = {
        'springfield': { lat: 37.2153, lng: -93.2923 },
        'kansas city': { lat: 39.0997, lng: -94.5786 },
        'st. louis': { lat: 38.6270, lng: -90.1994 },
        'columbia': { lat: 38.9517, lng: -92.3341 },
        'independence': { lat: 39.0911, lng: -94.4155 },
        'lee\'s summit': { lat: 38.9108, lng: -94.3822 },
        'o\'fallon': { lat: 38.8106, lng: -90.6998 },
        'st. charles': { lat: 38.7881, lng: -90.4974 },
        'st. peters': { lat: 38.7875, lng: -90.6298 },
        'florissant': { lat: 38.7892, lng: -90.3226 }
      };

      const normalizedAddress = address.toLowerCase();
      
      // Check if address contains any known city
      for (const [city, coords] of Object.entries(cityCoordinates)) {
        if (normalizedAddress.includes(city)) {
          return coords;
        }
      }

      // Default to Springfield, MO if no match found
      return cityCoordinates['springfield'];
    } catch (error) {
      console.error('Geocoding error:', error);
      // Fallback to Springfield, MO
      return { lat: 37.2153, lng: -93.2923 };
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      setMessage("Please enter both business name and address");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const coordinates = await geocodeAddress(address.trim());
      
      const newHomeBase: HomeBase = {
        name: name.trim(),
        address: address.trim(),
        lat: coordinates.lat,
        lng: coordinates.lng
      };

      onSave(newHomeBase);
      setMessage("Home base saved successfully!");
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error saving home base. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="shadow-[var(--shadow-medium)]">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          Home Base Setup
          {homeBase && (
            <div className="flex items-center gap-1 text-sm font-normal text-success">
              <MapPin className="h-3 w-3" />
              Set
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name</Label>
            <Input
              id="business-name"
              placeholder="Your Lawn Care Business"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="home-address">Starting Address</Label>
            <Input
              id="home-address"
              placeholder="123 Main St, Springfield, MO"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        {message && (
          <Alert className={message.includes("successfully") ? "border-success bg-success/10 text-success" : "border-destructive bg-destructive/10 text-destructive"}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleSave}
          disabled={!name.trim() || !address.trim() || isSaving}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : homeBase ? "Update Home Base" : "Set Home Base"}
        </Button>

        {homeBase && (
          <div className="bg-muted/20 p-3 rounded-md border">
            <div className="flex items-start gap-2">
              <Home className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">{homeBase.name}</p>
                <p className="text-muted-foreground">{homeBase.address}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Routes will be optimized starting and ending here
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HomeBaseSetup;