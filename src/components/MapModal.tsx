
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string | null;
}

// TODO: Replace with your Mapbox public token
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZ3B0ZW5naW5lZXIiLCJhIjoiY2x1OHp2eG5wMWR6dTJqbndxM254c3R3cSJ9.Qesg18x12Q3cEAbJbM_YtA';

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, address }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen || !address || !mapContainer.current || MAPBOX_TOKEN.startsWith('YOUR')) {
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}`;

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

  }, [isOpen, address, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80vw] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Client Location</DialogTitle>
          <DialogDescription>
            Map view for: {address}
          </DialogDescription>
        </DialogHeader>
        {MAPBOX_TOKEN.startsWith('YOUR') ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-center font-semibold">Mapbox Token Required</p>
            <p className="text-center text-sm">
              To display the map, please add your Mapbox public token to the source code.
            </p>
            <div className="bg-muted p-4 rounded-md text-sm w-full max-w-md">
              <p>
                1. Open the file: <code className="font-mono bg-background p-1 rounded">src/components/MapModal.tsx</code>
              </p>
              <p className="mt-2">
                2. Replace the placeholder token with your own.
              </p>
            </div>
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
