import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, ArrowRightLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SearchResult {
  id: string;
  name: string;
  service: string;
  status: string;
  contact: string;
  facility_id: string;
  account_id: string;
  facility_name: string;
  lasraa_id: string | null;
  nin_id: string | null;
  system_id: string | null;
}

const ClientSearch = () => {
  const { toast } = useToast();
  const { accountId, facilityId } = useAuth();
  const queryClient = useQueryClient();
  const [searchId, setSearchId] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [transferClient, setTransferClient] = useState<SearchResult | null>(null);
  const [transferNotes, setTransferNotes] = useState("");

  const handleSearch = async () => {
    if (!searchId.trim() || searchId.trim().length < 3) {
      toast({ title: "Error", description: "Please enter at least 3 characters to search.", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("search-client", {
        body: { searchId: searchId.trim() },
      });

      if (response.error) throw new Error(response.error.message);
      setResults(response.data.clients || []);
      
      if ((response.data.clients || []).length === 0) {
        toast({ title: "No Results", description: "No clients found with that ID." });
      }
    } catch (error: any) {
      toast({ title: "Search Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const createTransferMutation = useMutation({
    mutationFn: async (client: SearchResult) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Not authenticated");
      const { data: transferData, error } = await supabase.from("transfer_requests").insert({
        client_id: client.id,
        source_facility_id: client.facility_id,
        source_account_id: client.account_id,
        target_facility_id: facilityId!,
        target_account_id: accountId!,
        requested_by: userId,
        notes: transferNotes || null,
      }).select("id").single();
      if (error) throw error;
      await supabase.functions.invoke("notify-transfer", {
        body: { transferId: transferData.id, event: "created" },
      });
    },
    onSuccess: () => {
      toast({ title: "Transfer Requested", description: "A transfer request has been submitted for approval." });
      setTransferClient(null);
      setTransferNotes("");
      queryClient.invalidateQueries({ queryKey: ["transfer-requests"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isOwnFacility = (client: SearchResult) => client.facility_id === facilityId;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cross-Facility Client Search</h1>
        <p className="text-muted-foreground">
          Search for clients across all facilities by name, LASRAA ID, NIN, or System ID.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search by Unique ID</CardTitle>
          <CardDescription>
            Enter a client name, LASRAA ID, NIN, System ID, or Client ID to find a client across facilities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter client name, LASRAA ID, NIN, System ID, or Client ID..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Results ({results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>IDs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.service}</TableCell>
                    <TableCell>{client.facility_name}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        {client.lasraa_id && <div><span className="text-muted-foreground">LASRAA:</span> {client.lasraa_id}</div>}
                        {client.nin_id && <div><span className="text-muted-foreground">NIN:</span> {client.nin_id}</div>}
                        {client.system_id && <div><span className="text-muted-foreground">SYS:</span> {client.system_id}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.status === "On Track" ? "default" : client.status === "Defaulting" ? "destructive" : "secondary"}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isOwnFacility(client) ? (
                        <Badge variant="outline">Own Facility</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setTransferClient(client)}>
                          <ArrowRightLeft className="h-3 w-3 mr-1" />
                          Transfer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!transferClient} onOpenChange={(open) => !open && setTransferClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Client Transfer</DialogTitle>
            <DialogDescription>
              Request to transfer <strong>{transferClient?.name}</strong> from{" "}
              <strong>{transferClient?.facility_name}</strong> to your facility for service continuation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Client:</span>
              <span>{transferClient?.name}</span>
              <span className="text-muted-foreground">Service:</span>
              <span>{transferClient?.service}</span>
              <span className="text-muted-foreground">Current Facility:</span>
              <span>{transferClient?.facility_name}</span>
            </div>
            <Textarea
              placeholder="Reason for transfer (optional)"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferClient(null)}>Cancel</Button>
            <Button
              onClick={() => transferClient && createTransferMutation.mutate(transferClient)}
              disabled={createTransferMutation.isPending}
            >
              {createTransferMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientSearch;
