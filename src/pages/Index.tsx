import { AppLayout } from "@/components/AppLayout";
import { useAppContext } from "@/contexts/AppContext";
import { FleetManagerDashboard } from "@/components/dashboards/FleetManagerDashboard";
import { SupplierDashboard } from "@/components/dashboards/SupplierDashboard";
import { CustomerDashboard } from "@/components/dashboards/CustomerDashboard";

const Index = () => {
  const { currentRole } = useAppContext();

  return (
    <AppLayout>
      {currentRole === "fleet-manager" && <FleetManagerDashboard />}
      {currentRole === "supplier" && <SupplierDashboard />}
      {currentRole === "customer" && <CustomerDashboard />}
    </AppLayout>
  );
};

export default Index;
