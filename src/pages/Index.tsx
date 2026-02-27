import { AppLayout } from "@/components/AppLayout";
import { useAppContext } from "@/contexts/AppContext";
import { FleetManagerDashboard } from "@/components/dashboards/FleetManagerDashboard";
import { ServiceProviderDashboard } from "@/components/dashboards/ServiceProviderDashboard";
import { CustomerDashboard } from "@/components/dashboards/CustomerDashboard";

const Index = () => {
  const { currentRole } = useAppContext();

  return (
    <AppLayout>
      {currentRole === "fleet-manager" && <FleetManagerDashboard />}
      {currentRole === "service-provider" && <ServiceProviderDashboard />}
      {currentRole === "customer" && <CustomerDashboard />}
    </AppLayout>
  );
};

export default Index;
