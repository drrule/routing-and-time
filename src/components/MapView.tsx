import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const mapLoaded = useRef(false);

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
    if (!mapContainer.current) return;

    // Initialize map centered on Springfield, MO
    mapboxgl.accessToken = 'pk.eyJ1IjoibG92YWJsZS1haSIsImEiOiJjbTVjaHo4NGgxMGU3MmxyeTU1a3BtZzBhIn0.WR6nLdQzBMgdYr5YG4wbCw';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-93.2923, 37.2153], // Springfield, MO
      zoom: 11,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl(),
      'top-right'
    );

    // Wait for map to load before allowing marker/source operations
    map.current.on('load', () => {
      mapLoaded.current = true;
    });

    return () => {
      // Clear existing markers
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded.current) return;

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
      if (mapLoaded.current) {
      
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
  }, [customers, homeBase, mapLoaded.current]);

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
        <div className="relative w-full h-[500px] rounded-b-lg" style={{ minHeight: '400px' }}>
          <div 
            ref={mapContainer} 
            className="absolute inset-0 rounded-b-lg"
          />
          {customers.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/95 rounded-b-lg">
              <div className="text-center space-y-2">
                <Map className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Import clients to see route map</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MapView;