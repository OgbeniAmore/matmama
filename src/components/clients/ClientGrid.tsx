
import { Client } from "@/types";
import { ClientCard } from "@/components/ClientCard";
import { ClientCardSkeleton } from "@/components/ClientCardSkeleton";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import type { LastActor } from "@/queries/auditActors";

interface ClientGridProps {
    clients: Client[];
    isLoading: boolean;
    lastActors?: Record<string, LastActor>;
    onView: (client: Client) => void;
    onEdit: (client: Client) => void;
    onDelete: (clientId: string) => void;
    onAddClient: () => void;
}

export const ClientGrid = ({ clients, isLoading, lastActors = {}, onView, onEdit, onDelete, onAddClient }: ClientGridProps) => {

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <ClientCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (clients.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
                <h2 className="text-2xl font-bold tracking-tight">No clients yet</h2>
                <p className="text-muted-foreground mt-2 max-w-sm">
                    You can start managing clients by clicking the button below to add your first one.
                </p>
                <Button onClick={onAddClient} className="mt-6">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Client
                </Button>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
                <ClientCard
                    key={client.id}
                    client={client}
                    lastActor={lastActors[client.id]}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />

            ))}
        </div>
    );
};
