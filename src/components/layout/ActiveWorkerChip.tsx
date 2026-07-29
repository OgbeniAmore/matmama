import { UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveWorker } from "@/contexts/ActiveWorkerContext";

export function ActiveWorkerChip() {
  const { worker, changeWorker } = useActiveWorker();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2 max-w-[180px]"
      onClick={() => changeWorker()}
      title="Change the health worker recording actions"
    >
      <UserCog className="h-4 w-4 shrink-0" />
      <span className="truncate text-xs">
        {worker ? worker.name : "Set health worker"}
      </span>
    </Button>
  );
}
