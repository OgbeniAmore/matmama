
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface AssignedToSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  facility: string | null;
}

const fetchChps = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, facility")
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error fetching CHPs:", error);
    throw new Error(error.message);
  }

  return data;
};

export function AssignedToSelect({ value, onValueChange, disabled }: AssignedToSelectProps) {
  const { data: chps = [], isLoading, error } = useQuery({
    queryKey: ["chps"],
    queryFn: fetchChps,
  });

  const getDisplayName = (chp: Profile) => {
    const name = [chp.first_name, chp.last_name].filter(Boolean).join(" ");
    return name || "Unknown User";
  };

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (error) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Error loading CHPs" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select CHP to assign" />
      </SelectTrigger>
      <SelectContent>
        {chps.map((chp) => (
          <SelectItem key={chp.id} value={chp.id}>
            <div className="flex flex-col">
              <span>{getDisplayName(chp)}</span>
              {chp.facility && (
                <span className="text-xs text-muted-foreground">{chp.facility}</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
