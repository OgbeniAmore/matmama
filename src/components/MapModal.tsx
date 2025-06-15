
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

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, address }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen || !address || !mapContainer.current || !MAPBOX_TOKEN) {
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}`;

    fetch(geocodeUrl)
      .then(response => response.json())
      .then(data => {
        if (data.features && data.features.length > 0) {
          const [longitude, latitude] = data.features[0].center;

          if (marker.current) {
            marker.current.remove();
          }

          if (map.current) {
            map.current.setCenter([longitude, latitude]);
            map.current.setZoom(15);
            marker.current = new mapboxgl.Marker().setLngLat([longitude, latitude]).addTo(map.current);
          } else {
            map.current = new mapboxgl.Map({
              container: mapContainer.current!,
              style: 'mapbox://styles/mapbox/streets-v12',
              center: [longitude, latitude],
              zoom: 15,
            });
            marker.current = new mapboxgl.Marker().setLngLat([longitude, latitude]).addTo(map.current);
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
          marker.current = null;
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
        {!MAPBOX_TOKEN ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-center font-semibold">Mapbox Token Required</p>
            <p className="text-center text-sm">
              To display the map, please add your Mapbox public token as an environment variable.
            </p>
            <div className="bg-muted p-4 rounded-md text-sm w-full max-w-md">
              <p>
                1. Create a file named <code className="font-mono bg-background p-1 rounded">.env.local</code> in the root of your project.
              </p>
              <p className="mt-2">
                2. Add the following line to the file, replacing the placeholder with your own token:
                <br />
                <code className="font-mono bg-background p-1 rounded">VITE_MAPBOX_TOKEN=your_mapbox_public_token_here</code>
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
