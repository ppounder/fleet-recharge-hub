import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function Approvals() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Approvals</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" /> Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Approval management coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
