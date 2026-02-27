import React, { createContext, useContext, useState, ReactNode } from "react";
import { UserRole } from "@/lib/navigation";

interface AppContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>("fleet-manager");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <AppContext.Provider value={{ currentRole, setCurrentRole, sidebarOpen, setSidebarOpen }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
}
