import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, FileText, AlertCircle, File, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Mapbox geocoding function for accurate coordinates
const geocodeAddress = async (address: string) => {
  try {
    const mapboxToken = 'pk.eyJ1IjoiZHJydWxlIiwiYSI6ImNtZjBoa2MxdjBvczAycG80cTBzc2NwYzQifQ.pZUX8D7-S-pdu_irVChgvQ';
    const encodedAddress = encodeURIComponent(address);
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&country=US&types=address,poi&proximity=-93.297256,37.210388`;
    
    console.log("Geocoding client address:", address);
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      console.log("Mapbox geocoded client coordinates:", { lat, lng });
      return { lat, lng };
    } else {
      console.log("No Mapbox results for client, using fallback");
      // Fallback to Springfield, MO area with slight randomization
      return { 
        lat: 37.210388 + (Math.random() - 0.5) * 0.01, 
        lng: -93.297256 + (Math.random() - 0.5) * 0.01 
      };
    }
  } catch (error) {
    console.error('Mapbox geocoding error for client:', error);
    // Fallback to Springfield, MO area
    return { 
      lat: 37.210388 + (Math.random() - 0.5) * 0.01, 
      lng: -93.297256 + (Math.random() - 0.5) * 0.01 
    };
  }
};

interface Customer {
  id: string;
  name: string;
  address: string;
  status: 'pending' | 'in-progress' | 'completed';
  estimatedTime: number;
  lat: number;
  lng: number;
}

interface ClientImporterProps {
  onImport: (customers: Customer[]) => void;
}

const ClientImporter = ({ onImport }: ClientImporterProps) => {
  const [rawData, setRawData] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseClientData = async (data: string): Promise<Customer[]> => {
    console.log("Raw data received:", data);
    const lines = data.trim().split('\n').filter(line => line.trim());
    console.log("Lines after splitting:", lines);
    const customers: Customer[] = [];

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      console.log(`Processing line ${index + 1}:`, line);
      
      // Detect separator - check if line contains tabs first, then fall back to commas
      const separator = line.includes('\t') ? '\t' : ',';
      const parts = line.split(separator).map(part => part.trim());
      console.log("Parts after splitting:", parts);
      
      if (parts.length >= 2) {
        // Handle your specific format: Name, Type, Price, Letter, Address, City, State
        const name = parts[0] || `Customer ${index + 1}`;
        const businessType = parts[1] || '';
        const price = parts[2] || '';
        const frequency = parts[3] || '';
        const address = parts[4] || '';
        const city = parts[5] || '';
        const state = parts[6] || '';
        
        // Combine address components
        const fullAddress = [address, city, state].filter(Boolean).join(', ');
        
        // Extract time estimate from price (default 45 min, or estimate based on price)
        const priceNum = parseFloat(price.replace(/[$,]/g, '')) || 45;
        const estimatedTime = Math.max(30, Math.min(120, priceNum)); // 30-120 min based on price
        
        // Get accurate coordinates using Mapbox geocoding
        const coords = await geocodeAddress(fullAddress);
        
        const customer: Customer = {
          id: `imported-${index + 1}`,
          name: `${name}${businessType && businessType !== 'Residential' ? ` (${businessType})` : ''}`,
          address: fullAddress || 'Address not provided',
          status: 'pending',
          estimatedTime: estimatedTime,
          lat: coords.lat,
          lng: coords.lng
        };
        console.log("Created customer:", customer);
        customers.push(customer);
      } else {
        console.log(`Skipping line ${index + 1} - not enough parts:`, parts);
      }
    }

    console.log("Final customers array:", customers);
    return customers;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setRawData(content);
    };
    reader.onerror = () => {
      setError("Error reading file. Please try again.");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    try {
      setIsLoading(true);
      setError("");
      setSuccessMessage("");
      
      if (!rawData.trim()) {
        setError("Please enter client data to import");
        setIsLoading(false);
        return;
      }

      console.log("Starting import process...");
      const customers = await parseClientData(rawData);
      
      if (customers.length === 0) {
        setError("No valid client data found. Please check your format.");
        setIsLoading(false);
        return;
      }

      console.log(`Importing ${customers.length} customers...`);
      onImport(customers);
      setSuccessMessage(`Successfully imported ${customers.length} clients!`);
      setRawData("");
      setFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Import error:", err);
      setError("Error parsing client data. Please check your format.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-[var(--shadow-medium)] bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Import Client List
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div className="space-y-2">
          <Label htmlFor="file-upload">Upload client file</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <File className="h-4 w-4 mr-2" />
              {fileName ? fileName : "Choose CSV or TXT file"}
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-muted" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        {/* Manual Input Section */}
        <div className="space-y-2">
          <Label htmlFor="client-data">Paste your client data</Label>
          <Textarea
            id="client-data"
            placeholder="Paste your client data here...&#10;&#10;Example: Anna Boyce, Residential, $55, B, 4399 S Farm Rd 125, Springfield, MO"
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            className="min-h-[100px] font-mono text-sm resize-none"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="border-success bg-success/10 text-success">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <div className="bg-muted/20 p-4 rounded-md border">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Supported formats:</p>
              <div className="space-y-1">
                <p><strong>📋 Spreadsheet paste:</strong> Copy directly from Google Sheets or Excel</p>
                <p><strong>📄 CSV format:</strong> Name, Address, Time, Latitude, Longitude</p>
                <p><strong>🏠 Your format:</strong> Name, Type, Price, Frequency, Address, City, State</p>
              </div>
              <p className="text-xs pt-2 border-t border-muted">
                💡 Service time estimated from price • Coordinates auto-generated for Springfield, MO area
              </p>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleImport}
          className="w-full"
          disabled={!rawData.trim() || isLoading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isLoading ? "Importing..." : "Import Clients"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ClientImporter;