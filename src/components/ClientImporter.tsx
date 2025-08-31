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
      const parts = line.split(',').map(part => part.trim());
      console.log("Parts after splitting:", parts);
      
      if (parts.length >= 2) {
        const customer: Customer = {
          id: `imported-${index + 1}`,
          name: parts[0] || `Customer ${index + 1}`,
          address: parts[1] || 'Address not provided',
          status: 'pending',
          estimatedTime: parts[2] ? parseInt(parts[2]) || 45 : 45,
          lat: parts[3] ? parseFloat(parts[3]) || 40.7128 : 40.7128 + (Math.random() - 0.5) * 0.1,
          lng: parts[4] ? parseFloat(parts[4]) || -74.0060 : -74.0060 + (Math.random() - 0.5) * 0.1
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
            placeholder="Paste your client list here. Format: Name, Address, Time (optional), Lat (optional), Lng (optional)&#10;&#10;Example:&#10;Johnson Family, 123 Oak Street, 45&#10;Smith Residence, 456 Maple Avenue, 60&#10;Brown Property, 789 Pine Road, 30"
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
                <li>• CSV format: Name, Address, Time, Latitude, Longitude</li>
                <li>• Minimum required: Name, Address</li>
                <li>• Time in minutes (default: 45 min if not provided)</li>
                <li>• Coordinates optional (random nearby if not provided)</li>
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