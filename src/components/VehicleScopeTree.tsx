import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScopeValue = {
  applicable_asset_types: string[];
  applicable_makes: string[];
  applicable_models: string[];
  applicable_derivatives: string[];
};

type VTree = Record<string, Record<string, Record<string, Set<string>>>>;

function buildVehicleTree(vehicles: any[]): VTree {
  const t: VTree = {};
  for (const v of vehicles) {
    const at = String(v.asset_type ?? "").trim();
    const mk = String(v.make ?? "").trim();
    const md = String(v.model ?? "").trim();
    const dv = String(v.derivative ?? "").trim();
    if (!at) continue;
    (t[at] ??= {});
    if (!mk) continue;
    (t[at][mk] ??= {});
    if (!md) continue;
    (t[at][mk][md] ??= new Set());
    if (dv) t[at][mk][md].add(dv);
  }
  return t;
}

const leafKey = (at: string, mk: string, md: string, dv: string) =>
  `${at}\u0001${mk}\u0001${md}\u0001${dv}`;

function collectLeaves(tree: VTree): string[] {
  const out: string[] = [];
  for (const at of Object.keys(tree)) {
    for (const mk of Object.keys(tree[at])) {
      for (const md of Object.keys(tree[at][mk])) {
        const derivs = tree[at][mk][md];
        if (derivs.size === 0) out.push(leafKey(at, mk, md, ""));
        else for (const dv of derivs) out.push(leafKey(at, mk, md, dv));
      }
    }
  }
  return out;
}

export function VehicleScopeTree({
  vehicles, value, onChange,
}: {
  vehicles: any[];
  value: ScopeValue;
  onChange: (v: ScopeValue) => void;
}) {
  const tree = useMemo(() => buildVehicleTree(vehicles), [vehicles]);
  const allLeaves = useMemo(() => collectLeaves(tree), [tree]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!allLeaves.length || seeded) return;
    const at = new Set(value.applicable_asset_types);
    const mk = new Set(value.applicable_makes);
    const md = new Set(value.applicable_models);
    const dv = new Set(value.applicable_derivatives);
    if (at.size || mk.size || md.size || dv.size) {
      const s = new Set<string>();
      for (const key of allLeaves) {
        const [a, m, mo, d] = key.split("\u0001");
        if ((at.size === 0 || at.has(a)) &&
            (mk.size === 0 || mk.has(m)) &&
            (md.size === 0 || md.has(mo)) &&
            (dv.size === 0 || !d || dv.has(d))) s.add(key);
      }
      setSelected(s);
    }
    setSeeded(true);
  }, [allLeaves, seeded, value]);

  useEffect(() => {
    if (!seeded) return;
    const at = new Set<string>();
    const mk = new Set<string>();
    const md = new Set<string>();
    const dv = new Set<string>();
    for (const key of selected) {
      const [a, m, mo, d] = key.split("\u0001");
      at.add(a); mk.add(m); md.add(mo); if (d) dv.add(d);
    }
    onChange({
      applicable_asset_types: Array.from(at).sort(),
      applicable_makes: Array.from(mk).sort(),
      applicable_models: Array.from(md).sort(),
      applicable_derivatives: Array.from(dv).sort(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExp = (k: string) => setExpanded((s) => {
    const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n;
  });
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const matches = (s: string) => !q || s.toLowerCase().includes(q);

  const selectLeaves = (leaves: string[], on: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      for (const k of leaves) on ? n.add(k) : n.delete(k);
      return n;
    });
  };
  const leavesUnder = (at?: string, mk?: string, md?: string): string[] => {
    const out: string[] = [];
    for (const k of allLeaves) {
      const [a, m, mo] = k.split("\u0001");
      if (at && a !== at) continue;
      if (mk && m !== mk) continue;
      if (md && mo !== md) continue;
      out.push(k);
    }
    return out;
  };
  const stateOf = (leaves: string[]): "checked" | "unchecked" | "indeterminate" => {
    if (!leaves.length) return "unchecked";
    let c = 0;
    for (const k of leaves) if (selected.has(k)) c++;
    if (c === 0) return "unchecked";
    if (c === leaves.length) return "checked";
    return "indeterminate";
  };
  const TreeCheckbox = ({ state, onChange }: { state: "checked" | "unchecked" | "indeterminate"; onChange: (v: boolean) => void }) => (
    <Checkbox
      checked={state === "checked" ? true : state === "indeterminate" ? "indeterminate" : false}
      onCheckedChange={(v) => onChange(!!v)}
      className="h-4 w-4"
    />
  );
  const Chevron = ({ open, onClick, hidden }: { open: boolean; onClick: () => void; hidden?: boolean }) => (
    <button type="button" onClick={onClick}
      className={cn("inline-flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground", hidden && "invisible")}
      tabIndex={hidden ? -1 : 0}>
      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} />
    </button>
  );

  const rootLeaves = leavesUnder();
  const rootState = stateOf(rootLeaves);
  const assetTypes = Object.keys(tree).sort();

  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center justify-between gap-2 border-b p-2">
        <div className="flex items-center gap-2">
          <TreeCheckbox state={rootState} onChange={(v) => selectLeaves(rootLeaves, v)} />
          <span className="text-sm font-semibold">All vehicles</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{selected.size}/{allLeaves.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="h-7 pl-7 w-48 text-xs" />
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
            onClick={() => setExpanded(new Set(assetTypes.flatMap((at) => [at, ...Object.keys(tree[at]).map((mk) => `${at}\u0001${mk}`), ...Object.keys(tree[at]).flatMap((mk) => Object.keys(tree[at][mk]).map((md) => `${at}\u0001${mk}\u0001${md}`))])))}>
            Expand all
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded(new Set())}>Collapse all</Button>
        </div>
      </div>
      <div className="max-h-[320px] overflow-auto p-1 text-sm">
        {assetTypes.length === 0 && <div className="p-3 text-xs text-muted-foreground">No vehicles available.</div>}
        {assetTypes.map((at) => {
          const atLeaves = leavesUnder(at);
          const atState = stateOf(atLeaves);
          const atOpen = expanded.has(at);
          const makes = Object.keys(tree[at]).sort();
          const atMatch = matches(at);
          const anyMakeMatches = makes.some((mk) => matches(mk) || Object.keys(tree[at][mk]).some((md) => matches(md) || Array.from(tree[at][mk][md]).some(matches)));
          if (q && !atMatch && !anyMakeMatches) return null;
          const open = atOpen || !!(q && anyMakeMatches);
          return (
            <div key={at}>
              <div className="flex items-center gap-1.5 rounded px-1 py-1 hover:bg-muted/50">
                <Chevron open={open} onClick={() => toggleExp(at)} />
                <TreeCheckbox state={atState} onChange={(v) => selectLeaves(atLeaves, v)} />
                <span className="text-sm font-medium">{at}</span>
              </div>
              {open && makes.map((mk) => {
                const mkKey = `${at}\u0001${mk}`;
                const mkLeaves = leavesUnder(at, mk);
                const mkState = stateOf(mkLeaves);
                const mkOpen = expanded.has(mkKey);
                const models = Object.keys(tree[at][mk]).sort();
                const mkMatch = matches(mk);
                const anyChildMatch = models.some((md) => matches(md) || Array.from(tree[at][mk][md]).some(matches));
                if (q && !atMatch && !mkMatch && !anyChildMatch) return null;
                const mkOpenFinal = mkOpen || !!(q && (anyChildMatch || (atMatch && !mkMatch)));
                return (
                  <div key={mkKey}>
                    <div className="flex items-center gap-1.5 rounded px-1 py-1 hover:bg-muted/50" style={{ paddingLeft: 20 }}>
                      <Chevron open={mkOpenFinal} onClick={() => toggleExp(mkKey)} />
                      <TreeCheckbox state={mkState} onChange={(v) => selectLeaves(mkLeaves, v)} />
                      <span>{mk}</span>
                    </div>
                    {mkOpenFinal && models.map((md) => {
                      const mdKey = `${at}\u0001${mk}\u0001${md}`;
                      const mdLeaves = leavesUnder(at, mk, md);
                      const mdState = stateOf(mdLeaves);
                      const mdOpen = expanded.has(mdKey);
                      const derivs = Array.from(tree[at][mk][md]).sort();
                      const mdMatch = matches(md);
                      const anyDvMatch = derivs.some(matches);
                      if (q && !atMatch && !mkMatch && !mdMatch && !anyDvMatch) return null;
                      const mdOpenFinal = mdOpen || !!(q && anyDvMatch);
                      const hasDerivs = derivs.length > 0;
                      return (
                        <div key={mdKey}>
                          <div className="flex items-center gap-1.5 rounded px-1 py-1 hover:bg-muted/50" style={{ paddingLeft: 40 }}>
                            <Chevron open={mdOpenFinal} onClick={() => toggleExp(mdKey)} hidden={!hasDerivs} />
                            <TreeCheckbox state={mdState} onChange={(v) => selectLeaves(mdLeaves, v)} />
                            <span>{md}</span>
                          </div>
                          {mdOpenFinal && derivs.map((dv) => {
                            if (q && !atMatch && !mkMatch && !mdMatch && !matches(dv)) return null;
                            const dvKey = leafKey(at, mk, md, dv);
                            const dvChecked = selected.has(dvKey);
                            return (
                              <div key={dvKey} className="flex items-center gap-1.5 rounded px-1 py-1 hover:bg-muted/50" style={{ paddingLeft: 60 }}>
                                <span className="inline-block h-4 w-4" />
                                <TreeCheckbox state={dvChecked ? "checked" : "unchecked"} onChange={(v) => selectLeaves([dvKey], v)} />
                                <span className="text-muted-foreground">{dv}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
