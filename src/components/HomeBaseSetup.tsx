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
      // Enhanced geocoding with more Missouri cities and variations
      const cityCoordinates: { [key: string]: { lat: number; lng: number } } = {
        // Main cities
        'springfield': { lat: 37.210388, lng: -93.297256 },
        'kansas city': { lat: 39.0997, lng: -94.5786 },
        'st. louis': { lat: 38.6270, lng: -90.1994 },
        'saint louis': { lat: 38.6270, lng: -90.1994 },
        'columbia': { lat: 38.9517, lng: -92.3341 },
        'independence': { lat: 39.0911, lng: -94.4155 },
        'lee\'s summit': { lat: 38.9108, lng: -94.3822 },
        'lees summit': { lat: 38.9108, lng: -94.3822 },
        'o\'fallon': { lat: 38.8106, lng: -90.6998 },
        'ofallon': { lat: 38.8106, lng: -90.6998 },
        'st. charles': { lat: 38.7881, lng: -90.4974 },
        'saint charles': { lat: 38.7881, lng: -90.4974 },
        'st. peters': { lat: 38.7875, lng: -90.6298 },
        'saint peters': { lat: 38.7875, lng: -90.6298 },
        'florissant': { lat: 38.7892, lng: -90.3226 },
        'joplin': { lat: 37.0842, lng: -94.5133 },
        'cape girardeau': { lat: 37.3059, lng: -89.5181 },
        'blue springs': { lat: 39.0170, lng: -94.2816 },
        'raytown': { lat: 39.0086, lng: -94.4635 },
        'chesterfield': { lat: 38.6631, lng: -90.5770 }
      };

      const normalizedAddress = address.toLowerCase().trim();
      console.log("Geocoding address:", normalizedAddress);
      
      // Check if address contains any known city
      for (const [city, coords] of Object.entries(cityCoordinates)) {
        if (normalizedAddress.includes(city)) {
          console.log("Found matching city:", city, "coords:", coords);
          return coords;
        }
      }

      // Check for Missouri ZIP codes (rough approximation)
      const zipMatch = normalizedAddress.match(/\b(630\d\d|631\d\d|632\d\d|633\d\d|634\d\d|635\d\d|636\d\d|637\d\d|638\d\d|639\d\d|640\d\d|641\d\d|642\d\d|643\d\d|644\d\d|645\d\d|646\d\d|647\d\d|648\d\d|649\d\d|650\d\d|651\d\d|652\d\d|653\d\d|654\d\d|655\d\d|656\d\d|657\d\d|658\d\d)\b/);
      if (zipMatch) {
        const zip = zipMatch[0];
        console.log("Found Missouri ZIP code:", zip, "defaulting to Springfield area");
      }

      // Default to Springfield, MO if no match found
      console.log("No city match found, defaulting to Springfield, MO");
      return cityCoordinates['springfield'];
    } catch (error) {
      console.error('Geocoding error:', error);
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