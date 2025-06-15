
import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string | null;
}

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, address }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState(() => localStorage.getItem('mapboxToken') || '');
  const [tokenInput, setTokenInput] = useState(mapboxToken);
  const { toast } = useToast();

  const handleSaveToken = () => {
    localStorage.setItem('mapboxToken', tokenInput);
    setMapboxToken(tokenInput);
    toast({
        title: "Token Saved",
        description: "Your Mapbox token has been saved in your browser's local storage.",
    });
  };

  useEffect(() => {
    if (!isOpen || !mapboxToken || !address || !mapContainer.current) return;

    mapboxgl.accessToken = mapboxToken;

    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}`;

    fetch(geocodeUrl)
      .then(response => response.json())
      .then(data => {
        if (data.features && data.features.length > 0) {
          const [longitude, latitude] = data.features[0].center;

          if (map.current) {
            map.current.setCenter([longitude, latitude]);
            map.current.setZoom(15);
            new mapboxgl.Marker().setLngLat([longitude, latitude]).addTo(map.current);
          } else {
            map.current = new mapboxgl.Map({
              container: mapContainer.current!,
              style: 'mapbox://styles/mapbox/satellite-v9',
              center: [longitude, latitude],
              zoom: 15,
            });
            new mapboxgl.Marker().setLngLat([longitude, latitude]).addTo(map.current);
          }
        } else {
            toast({
                title: "Error",
                description: "Could not find location for the address.",
                variant: "destructive",
            });
        }
      })
      .catch(error => {
        console.error('Error fetching geocoding data:', error);
        toast({
            title: "Geocoding Error",
            description: "An error occurred while fetching location data.",
            variant: "destructive",
        });
      });
      
      return () => {
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
      };

  }, [isOpen, mapboxToken, address]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80vw] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Client Location</DialogTitle>
          <DialogDescription>
            Map view for: {address}
          </DialogDescription>
        </DialogHeader>
        {!mapboxToken ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-center">Please provide a Mapbox public token to view the map.</p>
            <div className="w-full max-w-sm space-y-2">
                <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
                <Input
                    id="mapbox-token"
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="pk.ey..."
                />
            </div>
            <Button onClick={handleSaveToken}>Save Token</Button>
            <p className="text-xs text-muted-foreground">You can get a token from your <a href="https://account.mapbox.com/access-tokens" target="_blank" rel="noopener noreferrer" className="underline">Mapbox account</a>.</p>
          </div>
        ) : (
          <div ref={mapContainer} className="w-full h-full rounded-lg" />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MapModal;
