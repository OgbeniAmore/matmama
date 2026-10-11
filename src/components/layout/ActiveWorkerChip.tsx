import { UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveWorker } from "@/contexts/ActiveWorkerContext";

export function ActiveWorkerChip() {
  const { worker, changeWorker } = useActiveWorker();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1 sm:gap-2 min-w-0 h-11 max-w-[120px] sm:max-w-[180px]"
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
