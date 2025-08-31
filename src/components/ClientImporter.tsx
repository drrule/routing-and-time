import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle } from "lucide-react";
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

  const parseClientData = (data: string): Customer[] => {
    const lines = data.trim().split('\n').filter(line => line.trim());
    const customers: Customer[] = [];

    lines.forEach((line, index) => {
      const parts = line.split(',').map(part => part.trim());
      
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
        customers.push(customer);
      }
    });

    return customers;
  };

  const handleImport = () => {
    try {
      setError("");
      
      if (!rawData.trim()) {
        setError("Please enter client data to import");
        return;
      }

      const customers = parseClientData(rawData);
      
      if (customers.length === 0) {
        setError("No valid client data found. Please check your format.");
        return;
      }

      onImport(customers);
      setRawData("");
    } catch (err) {
      setError("Error parsing client data. Please check your format.");
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
      <CardContent className="space-y-4">
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
          className="w-full bg-[var(--gradient-primary)] hover:opacity-90 transition-[var(--transition-smooth)]"
          disabled={!rawData.trim()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Import Clients
        </Button>
      </CardContent>
    </Card>
  );
};

export default ClientImporter;