
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface GoogleMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string | null;
}

const GoogleMapModal: React.FC<GoogleMapModalProps> = ({ isOpen, onClose, address }) => {
  const encodedAddress = address ? encodeURIComponent(address) : '';
  // t=k enables satellite view, z=15 sets zoom level
  const mapUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=k&z=15&output=embed`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80vw] h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Client Location</DialogTitle>
          <DialogDescription>
            Satellite view for: {address}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 px-6 pb-6">
          {address ? (
            <iframe
              src={mapUrl}
              className="w-full h-full rounded-lg border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map showing ${address}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No address provided
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleMapModal;
