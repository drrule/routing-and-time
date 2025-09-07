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
      // Use Mapbox Geocoding API for accurate coordinates
      const mapboxToken = 'pk.eyJ1IjoiZHJydWxlIiwiYSI6ImNtZjBoa2MxdjBvczAycG80cTBzc2NwYzQifQ.pZUX8D7-S-pdu_irVChgvQ';
      const encodedAddress = encodeURIComponent(address);
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&country=US&types=address,poi&proximity=-93.297256,37.210388`;
      
      console.log("Geocoding address with Mapbox:", address);
      
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        console.log("Mapbox geocoded coordinates:", { lat, lng });
        return { lat, lng };
      } else {
        console.log("No Mapbox results, using fallback");
        // Fallback to Springfield, MO
        return { lat: 37.210388, lng: -93.297256 };
      }
    } catch (error) {
      console.error('Mapbox geocoding error:', error);
      // Fallback to Springfield, MO
      return { lat: 37.210388, lng: -93.297256 };
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
      console.log("Geocoded coordinates for", address.trim(), ":", coordinates);
      
      const newHomeBase: HomeBase = {
        name: name.trim(),
        address: address.trim(),
        lat: coordinates.lat,
        lng: coordinates.lng
      };

      console.log("Saving new home base:", newHomeBase);
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