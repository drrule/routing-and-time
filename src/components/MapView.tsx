import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Map } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  address: string;
  status: 'pending' | 'in-progress' | 'completed';
  estimatedTime: number;
  lat: number;
  lng: number;
}

interface HomeBase {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface MapViewProps {
  customers: Customer[];
  homeBase: HomeBase | null;
}

const MapView = ({ customers, homeBase }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981'; // green
      case 'in-progress':
        return '#f59e0b'; // yellow
      default:
        return '#6b7280'; // gray
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    console.log("Initializing Mapbox map...");
    
    // Initialize map centered on Springfield, MO
    mapboxgl.accessToken = mapboxToken;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-93.2923, 37.2153], // Springfield, MO
        zoom: 11,
      });

      console.log("Map created successfully");

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl(),
        'top-right'
      );

      // Wait for map to load before allowing marker/source operations
      map.current.on('load', () => {
        console.log("Map loaded successfully");
        setMapLoaded(true);
      });

      // Additional events to ensure style is ready in all cases
      map.current.on('style.load', () => {
        console.log('Map style loaded');
        setMapLoaded(true);
      });

      map.current.on('styledata', () => {
        if (map.current?.isStyleLoaded()) {
          console.log('Map styledata -> isStyleLoaded true');
          setMapLoaded(true);
        }
      });

      map.current.once('idle', () => {
        console.log('Map idle (all tiles/sources loaded)');
        setMapLoaded(true);
      });

      // Safety fallback in case events are missed
      setTimeout(() => {
        if (map.current && map.current.isStyleLoaded()) {
          console.log('Fallback timeout: marking map as loaded');
          setMapLoaded(true);
        }
      }, 4000);

      map.current.on('error', (e) => {
        console.error("Mapbox error:", e);
        setMapError((e as any)?.error?.message || 'Map failed to load');
      });
    } catch (error) {
      console.error("Error creating map:", error);
    }

    return () => {
      // Clear existing markers
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, [mapboxToken]);

  useEffect(() => {
    console.log("Customer effect triggered:", { 
      hasMap: !!map.current, 
      mapLoaded, 
      customerCount: customers.length,
      hasHomeBase: !!homeBase 
    });
    
    if (!map.current || !mapLoaded) {
      console.log("Map not ready yet, skipping marker update");
      return;
    }

    console.log("Adding markers for", customers.length, "customers");

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add home base marker if set
    if (homeBase) {
      const homeMarkerEl = document.createElement('div');
      homeMarkerEl.className = 'home-marker';
      homeMarkerEl.style.cssText = `
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-color: #dc2626;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
        cursor: pointer;
      `;
      homeMarkerEl.innerHTML = '🏠';

      const homePopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 4px 0; font-weight: bold; color: #dc2626;">🏠 ${homeBase.name}</h3>
          <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${homeBase.address}</p>
          <p style="margin: 0; font-size: 12px; color: #dc2626; font-weight: bold;">
            HOME BASE - Route Start/End Point
          </p>
        </div>
      `);

      const homeMarker = new mapboxgl.Marker(homeMarkerEl)
        .setLngLat([homeBase.lng, homeBase.lat])
        .setPopup(homePopup)
        .addTo(map.current!);

      markers.current.push(homeMarker);
    }

    // Add markers for each customer
    customers.forEach((customer, index) => {
      // Create custom marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'route-marker';
      markerEl.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: ${getStatusColor(customer.status)};
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        cursor: pointer;
      `;
      markerEl.textContent = (index + 1).toString();

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 4px 0; font-weight: bold;">${customer.name}</h3>
          <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${customer.address}</p>
          <p style="margin: 0; font-size: 12px;">
            <span style="color: ${getStatusColor(customer.status)}; font-weight: bold;">
              ${customer.status.replace('-', ' ').toUpperCase()}
            </span> • ${customer.estimatedTime} min
          </p>
        </div>
      `);

      // Create marker
      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([customer.lng, customer.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);
    });

    // Fit map to show all markers with padding
    const allPoints = [...customers];
    if (homeBase) allPoints.unshift(homeBase as any);
    
    if (allPoints.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      allPoints.forEach(point => {
        bounds.extend([point.lng, point.lat]);
      });
      map.current.fitBounds(bounds, { padding: 60 });
    } else if (allPoints.length === 1) {
      map.current.setCenter([allPoints[0].lng, allPoints[0].lat]);
      map.current.setZoom(14);
    }

    // Add route line connecting home base to all stops and back
    if (customers.length > 0) {
      let coordinates = customers.map(customer => [customer.lng, customer.lat]);
      
      // Add home base at start and end if set
      if (homeBase) {
        coordinates = [[homeBase.lng, homeBase.lat], ...coordinates, [homeBase.lng, homeBase.lat]];
      }
      
      // Only add source if map style is loaded
      if (mapLoaded) {
      
        if (map.current.getSource('route')) {
          (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            }
          });
        } else {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coordinates
              }
            }
          });

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 3,
              'line-opacity': 0.7
            }
          });
        }
      }
    }
  }, [customers, homeBase, mapLoaded]);

  return (
    <Card className="h-full shadow-[var(--shadow-medium)]">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          Route Map
          {customers.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({customers.length} stops)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!mapboxToken ? (
          <div className="p-6">
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Map className="h-8 w-8 text-muted-foreground mx-auto" />
                <h3 className="font-semibold">Mapbox Token Required</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your Mapbox public token to display the route map
                </p>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Enter your Mapbox public token (pk.)"
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get your free token at{' '}
                  <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    mapbox.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        ) : (
        <div className="relative w-full h-[500px] rounded-b-lg bg-muted/10" style={{ minHeight: '400px' }}>
          <div 
            ref={mapContainer} 
            className="absolute inset-0 rounded-b-lg"
            style={{ background: '#f0f0f0' }}
          />
          {mapError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/95 rounded-b-lg">
              <div className="text-center space-y-2">
                <Map className="h-8 w-8 text-destructive mx-auto" />
                <p className="text-destructive">{mapError}</p>
              </div>
            </div>
          )}
          {(!mapLoaded && customers.length === 0 && !mapError) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/95 rounded-b-lg">
              <div className="text-center space-y-2">
                <Map className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Import clients to see route map</p>
              </div>
            </div>
          )}
          {(!mapLoaded && customers.length > 0 && !mapError) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/95 rounded-b-lg">
              <div className="text-center space-y-2">
                <Map className="h-8 w-8 text-primary mx-auto animate-pulse" />
                <p className="text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}
        </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MapView;