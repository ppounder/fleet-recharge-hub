import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Props {
  vehicleId: string;
  vehicleStatus?: string | null;
  fleetId?: string | null;
  changedBy?: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentMessage: string;
  onCurrentMessageChange: (v: string) => void;
}

export function MaintenanceMessageDialog({ vehicleId, vehicleStatus, fleetId, changedBy, open, onOpenChange, currentMessage, onCurrentMessageChange }: Props) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(currentMessage);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    if (open) setDraft(currentMessage);
  }, [open, currentMessage]);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["vehicle-maintenance-messages", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_status_history")
        .select("id, changed_at, maintenance_message, status, changed_by")
        .eq("vehicle_id", vehicleId)
        .not("maintenance_message", "is", null)
        .neq("maintenance_message", "")
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["vehicle-maintenance-messages", vehicleId] });
    qc.invalidateQueries({ queryKey: ["vehicle-status-history", vehicleId] });
  };

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditingText(text);
  };

  const saveEdit = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase
      .from("vehicle_status_history")
      .update({ maintenance_message: editingText || null })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setEditingId(null);
    invalidate();
    toast({ title: "Message updated" });
  };

  const deleteMessage = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase
      .from("vehicle_status_history")
      .update({ maintenance_message: null })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    invalidate();
    toast({ title: "Message deleted" });
  };

  const applyDraft = async () => {
    const text = draft.trim();
    if (!text) {
      onCurrentMessageChange("");
      onOpenChange(false);
      return;
    }
    setSavingDraft(true);
    const { error } = await supabase.from("vehicle_status_history").insert({
      vehicle_id: vehicleId,
      fleet_id: fleetId ?? null,
      status: vehicleStatus ?? "on-road",
      changed_at: new Date().toISOString(),
      changed_by: changedBy ?? null,
      maintenance_message: text,
      sorn_returned: false,
    });
    setSavingDraft(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    onCurrentMessageChange(text);
    invalidate();
    toast({ title: "Message saved" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Maintenance message</DialogTitle>
          <DialogDescription>
            Add a new maintenance message, or edit and delete previous ones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="new-msg">New message</Label>
          <Textarea
            id="new-msg"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Describe the maintenance required..."
          />
          <p className="text-xs text-muted-foreground">
            This will be attached to the status update when you save.
          </p>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="px-3 py-2 border-b bg-muted/40 text-sm font-medium">Message history</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Date / Time</TableHead>
                <TableHead className="w-40">Name</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
              ) : history.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No previous messages</TableCell></TableRow>
              ) : history.map((h: any) => {
                const isEditing = editingId === h.id;
                const isBusy = busyId === h.id;
                return (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs text-muted-foreground align-middle whitespace-nowrap">
                      {format(new Date(h.changed_at), "dd MMM yyyy - HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm align-middle whitespace-nowrap">
                      {h.changed_by || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="align-middle">
                      {isEditing ? (
                        <Textarea
                          rows={2}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="text-sm"
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{h.maintenance_message}</p>
                      )}
                    </TableCell>
                    <TableCell className="align-middle">
                      <div className="flex justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => saveEdit(h.id)} disabled={isBusy}>
                              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} disabled={isBusy}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => startEdit(h.id, h.maintenance_message)} disabled={isBusy}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteMessage(h.id)} disabled={isBusy} className={cn("text-destructive hover:text-destructive")}>
                              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={applyDraft} disabled={savingDraft}>
            {savingDraft && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {savingDraft ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
