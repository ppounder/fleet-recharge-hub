import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Check, X, Loader2, Search } from "lucide-react";
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setDraft("");
      setEditingId(null);
      setSearch("");
    }
  }, [open]);

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
    qc.invalidateQueries({ queryKey: ["vehicle-recent-maintenance-messages", vehicleId] });
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
    toast({ title: "Note updated" });
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
    toast({ title: "Note deleted" });
  };

  const applyDraft = async () => {
    const text = draft.trim();
    if (editingId) {
      setSavingDraft(true);
      const { error } = await supabase
        .from("vehicle_status_history")
        .update({ maintenance_message: text || null })
        .eq("id", editingId);
      setSavingDraft(false);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
        return;
      }
      setEditingId(null);
      invalidate();
      toast({ title: "Note updated" });
      onOpenChange(false);
      return;
    }
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
    toast({ title: "Note saved" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Notes</DialogTitle>
          <DialogDescription>
            Add a new note, or edit and delete previous ones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="new-msg">{editingId ? "Edit note" : "New note"}</Label>
            {editingId && (
              <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setDraft(currentMessage); }}>
                Cancel edit
              </Button>
            )}
          </div>
          <Textarea
            id="new-msg"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note about this vehicle..."
          />
          <p className="text-xs text-muted-foreground">
            {editingId ? "Editing an existing note. Save to update it." : "Your note will be added to the notes history."}
          </p>
        </div>

        <div className="rounded-lg border overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="px-3 py-2 border-b bg-muted/40 flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Notes history</span>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="h-8 pl-8"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">

          {(() => {
            const q = search.trim().toLowerCase();
            const filtered = q
              ? history.filter((h: any) =>
                  (h.maintenance_message ?? "").toLowerCase().includes(q) ||
                  (h.changed_by ?? "").toLowerCase().includes(q),
                )
              : history;
            return (
          <Table>

            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-36">Date / Time</TableHead>
                <TableHead className="w-32">Name</TableHead>
                <TableHead className="w-[55%]">Notes</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">{q ? "No notes match your search" : "No previous notes"}</TableCell></TableRow>
              ) : filtered.map((h: any) => {
                const isBusy = busyId === h.id;
                const isRowEditing = editingId === h.id;
                return (
                  <TableRow key={h.id} className={cn(isRowEditing && "bg-muted/40")}>
                    <TableCell className="text-xs text-muted-foreground align-middle whitespace-nowrap">
                      {format(new Date(h.changed_at), "dd MMM yyyy - HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm align-middle whitespace-nowrap">
                      {h.changed_by || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="align-middle">
                      <p className="text-sm whitespace-pre-wrap">{h.maintenance_message}</p>
                    </TableCell>
                    <TableCell className="align-middle">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setEditingId(h.id); setDraft(h.maintenance_message ?? ""); }}
                          disabled={isBusy}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmDeleteId(h.id)} disabled={isBusy} className={cn("text-destructive hover:bg-destructive hover:text-white")}>
                          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
            );
          })()}
          </div>
        </div>
        </div>


        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={applyDraft} disabled={savingDraft}>
            {savingDraft && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {savingDraft ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>

        <AlertDialog open={confirmDeleteId !== null} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete note?</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete this note?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  const id = confirmDeleteId;
                  setConfirmDeleteId(null);
                  if (id) await deleteMessage(id);
                }}
              >
                Yes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
