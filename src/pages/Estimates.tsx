import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function Estimates() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Estimates</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Estimate Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Estimate management coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
