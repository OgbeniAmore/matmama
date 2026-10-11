import { createContext } from "react";

export type ActiveWorker = {
  name: string;
  designation: string;
};

export type ActiveWorkerContextType = {
  worker: ActiveWorker | null;
  setWorker: (worker: ActiveWorker | null) => void;
  requireWorker: () => Promise<ActiveWorker | null>;
  changeWorker: () => Promise<ActiveWorker | null>;
  logAction: (
    action: string,
    tableName: string,
    recordId: string | null,
    details?: Record<string, unknown>,
  ) => Promise<void>;
};

// Keep context identity independent of provider/component hot updates.
export const ActiveWorkerContext = createContext<ActiveWorkerContextType | undefined>(undefined);