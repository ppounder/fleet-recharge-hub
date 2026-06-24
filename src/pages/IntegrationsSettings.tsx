import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plug, ExternalLink, Car } from "lucide-react";

interface IntegrationDef {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  secretName: string;
  signupUrl: string;
  status: "not-configured" | "configured";
  docs: string;
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "dvla-ves",
    name: "DVLA Vehicle Enquiry Service",
    description:
      "Look up a UK vehicle by registration to auto-fill Make, Model, year, fuel type and colour when creating an asset.",
    icon: Car,
    secretName: "DVLA_VES_API_KEY",
    signupUrl: "https://developer-portal.driver-vehicle-licensing.api.gov.uk/",
    status: "not-configured",
    docs: "Request access to the Vehicle Enquiry Service (VES) API. DVLA will email you an API key, which can then be saved here.",
  },
];

export default function IntegrationsSettings() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plug className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Connect third-party services to extend the app
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {INTEGRATIONS.map((integration) => {
            const Icon = integration.icon;
            return (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {integration.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant={integration.status === "configured" ? "default" : "secondary"}
                    >
                      {integration.status === "configured" ? "Connected" : "Not configured"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <p className="font-medium mb-1">How to set up</p>
                    <p className="text-muted-foreground">{integration.docs}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" asChild>
                      <a
                        href={integration.signupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Get API key <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                    <Button
                      onClick={() => {
                        // Placeholder: the API key is stored as a backend secret.
                        // Ask the Lovable agent to add `DVLA_VES_API_KEY` when you have it.
                        window.alert(
                          `Once you have your API key, ask the assistant to add it as the secret "${integration.secretName}".`,
                        );
                      }}
                    >
                      Configure API key
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
