import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, FileText, AlertCircle, File, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  const parseClientData = (data: string): Customer[] => {
    console.log("Raw data received:", data);
    const lines = data.trim().split('\n').filter(line => line.trim());
    console.log("Lines after splitting:", lines);
    const customers: Customer[] = [];

    lines.forEach((line, index) => {
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
        
        const customer: Customer = {
          id: `imported-${index + 1}`,
          name: `${name}${businessType && businessType !== 'Residential' ? ` (${businessType})` : ''}`,
          address: fullAddress || 'Address not provided',
          status: 'pending',
          estimatedTime: estimatedTime,
          lat: 40.7128 + (Math.random() - 0.5) * 0.1, // Random coords near Springfield, MO area
          lng: -93.2923 + (Math.random() - 0.5) * 0.1  // Springfield, MO coordinates
        };
        console.log("Created customer:", customer);
        customers.push(customer);
      } else {
        console.log(`Skipping line ${index + 1} - not enough parts:`, parts);
      }
    });

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

  const handleImport = () => {
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
      const customers = parseClientData(rawData);
      
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
    <Card className="shadow-[var(--shadow-medium)]">
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
            placeholder="Paste your client list here. Supports both comma-separated (CSV) and tab-separated (from spreadsheets) formats.&#10;&#10;Your format will work perfectly - just paste directly from Google Sheets!&#10;&#10;Example formats:&#10;• From spreadsheets: Name[TAB]Type[TAB]Price[TAB]Frequency[TAB]Address[TAB]City[TAB]State&#10;• CSV: Name, Address, Time, Lat, Lng"
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            className="min-h-[120px] font-mono text-sm"
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

        <div className="bg-muted/30 p-3 rounded-md">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Supported formats:</p>
              <ul className="text-xs space-y-1">
                <li>• <strong>Spreadsheet paste:</strong> Copy directly from Google Sheets, Excel</li>
                <li>• <strong>CSV format:</strong> Name, Address, Time, Latitude, Longitude</li>
                <li>• <strong>Your format:</strong> Name, Type, Price, Frequency, Address, City, State</li>
                <li>• Time is estimated from price ($45 = ~45 min service)</li>
                <li>• Coordinates auto-generated for Springfield, MO area</li>
              </ul>
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