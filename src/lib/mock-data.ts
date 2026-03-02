import { UserRole } from "./navigation";

// Mock data for the platform

export interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  mileage: number;
  nextService: string;
  motDue: string;
  status: "active" | "in-service" | "off-road";
  customer: string;
}

export interface Job {
  id: string;
  vehicleReg: string;
  vehicleMakeModel: string;
  type: "service" | "repair" | "mot" | "tyres" | "bodywork";
  status: "booked" | "estimated" | "approved" | "in-progress" | "complete" | "invoiced" | "closed";
  provider: string;
  customer: string;
  createdAt: string;
  estimateTotal: number;
  invoiceTotal?: number;
  hasRecharge: boolean;
  rechargeAmount?: number;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
}

export interface RechargeItem {
  id: string;
  jobId: string;
  vehicleReg: string;
  customer: string;
  reasonCode: string;
  description: string;
  cost: number;
  status: "pending-review" | "approved" | "declined" | "disputed" | "settled";
  evidence: string[];
  createdAt: string;
}

export interface EstimateItem {
  id: string;
  description: string;
  type: "labour" | "parts" | "sundries";
  quantity: number;
  unitPrice: number;
  total: number;
  rechargeable: boolean;
  rechargeReason?: string;
}

export const mockVehicles: Vehicle[] = [
  { id: "v1", registration: "AB21 XYZ", make: "BMW", model: "3 Series", year: 2021, vin: "WBA8E9C50JA123456", mileage: 45230, nextService: "2026-04-15", motDue: "2026-03-20", status: "active", customer: "Acme Logistics" },
  { id: "v2", registration: "CD22 ABC", make: "Ford", model: "Transit", year: 2022, vin: "WF0XXXGCD123456", mileage: 68450, nextService: "2026-03-01", motDue: "2026-05-10", status: "in-service", customer: "Quick Deliveries Ltd" },
  { id: "v3", registration: "EF20 DEF", make: "Mercedes", model: "Sprinter", year: 2020, vin: "WDB9066331S123456", mileage: 92100, nextService: "2026-02-28", motDue: "2026-04-05", status: "active", customer: "City Express" },
  { id: "v4", registration: "GH23 GHI", make: "Volkswagen", model: "Caddy", year: 2023, vin: "WV2ZZZ2KZPX123456", mileage: 22300, nextService: "2026-06-10", motDue: "2026-08-15", status: "active", customer: "Acme Logistics" },
  { id: "v5", registration: "IJ19 JKL", make: "Vauxhall", model: "Vivaro", year: 2019, vin: "W0LJ7B08XK123456", mileage: 115600, nextService: "2026-03-05", motDue: "2026-02-28", status: "off-road", customer: "Quick Deliveries Ltd" },
];

export const mockJobs: Job[] = [
  { id: "J-2401", vehicleReg: "AB21 XYZ", vehicleMakeModel: "BMW 3 Series", type: "service", status: "approved", provider: "AutoCare Plus", customer: "Acme Logistics", createdAt: "2026-02-25", estimateTotal: 485.00, hasRecharge: false, description: "Annual service - 45,000 mile", priority: "medium" },
  { id: "J-2402", vehicleReg: "CD22 ABC", vehicleMakeModel: "Ford Transit", type: "repair", status: "estimated", provider: "FleetFix Workshop", customer: "Quick Deliveries Ltd", createdAt: "2026-02-26", estimateTotal: 1250.00, hasRecharge: true, rechargeAmount: 420.00, description: "Front bumper damage repair + brake pads", priority: "high" },
  { id: "J-2403", vehicleReg: "EF20 DEF", vehicleMakeModel: "Mercedes Sprinter", type: "tyres", status: "in-progress", provider: "TyrePro National", customer: "City Express", createdAt: "2026-02-24", estimateTotal: 680.00, hasRecharge: true, rechargeAmount: 680.00, description: "4x tyres below legal limit - replacement", priority: "urgent" },
  { id: "J-2404", vehicleReg: "GH23 GHI", vehicleMakeModel: "VW Caddy", type: "mot", status: "booked", provider: "AutoCare Plus", customer: "Acme Logistics", createdAt: "2026-02-27", estimateTotal: 0, hasRecharge: false, description: "MOT inspection", priority: "low" },
  { id: "J-2405", vehicleReg: "IJ19 JKL", vehicleMakeModel: "Vauxhall Vivaro", type: "bodywork", status: "complete", provider: "BodyRepair Specialists", customer: "Quick Deliveries Ltd", createdAt: "2026-02-20", estimateTotal: 2100.00, invoiceTotal: 2150.00, hasRecharge: true, rechargeAmount: 1800.00, description: "Side panel damage - driver impact", priority: "high" },
  { id: "J-2406", vehicleReg: "AB21 XYZ", vehicleMakeModel: "BMW 3 Series", type: "repair", status: "invoiced", provider: "AutoCare Plus", customer: "Acme Logistics", createdAt: "2026-02-18", estimateTotal: 320.00, invoiceTotal: 320.00, hasRecharge: false, description: "Windscreen wiper motor replacement", priority: "medium" },
];

export const mockRecharges: RechargeItem[] = [
  { id: "R-001", jobId: "J-2402", vehicleReg: "CD22 ABC", customer: "Quick Deliveries Ltd", reasonCode: "driver-damage", description: "Front bumper damage - driver impact", cost: 420.00, status: "pending-review", evidence: ["bumper-photo-1.jpg", "bumper-photo-2.jpg"], createdAt: "2026-02-26" },
  { id: "R-002", jobId: "J-2403", vehicleReg: "EF20 DEF", customer: "City Express", reasonCode: "tyre-neglect", description: "4x tyres below 1.6mm legal limit - driver neglect", cost: 680.00, status: "approved", evidence: ["tyre-depth-report.pdf"], createdAt: "2026-02-24" },
  { id: "R-003", jobId: "J-2405", vehicleReg: "IJ19 JKL", customer: "Quick Deliveries Ltd", reasonCode: "driver-damage", description: "Side panel impact damage", cost: 1800.00, status: "disputed", evidence: ["panel-photo-1.jpg", "panel-photo-2.jpg", "incident-report.pdf"], createdAt: "2026-02-20" },
  { id: "R-004", jobId: "J-2399", vehicleReg: "AB21 XYZ", customer: "Acme Logistics", reasonCode: "lost-key", description: "Replacement key fob - lost by driver", cost: 350.00, status: "settled", evidence: ["key-order.pdf"], createdAt: "2026-02-15" },
];

export const mockEstimateItems: EstimateItem[] = [
  { id: "e1", description: "Labour - Bumper removal & refit", type: "labour", quantity: 3, unitPrice: 65.00, total: 195.00, rechargeable: true, rechargeReason: "driver-damage" },
  { id: "e2", description: "Front bumper assembly", type: "parts", quantity: 1, unitPrice: 480.00, total: 480.00, rechargeable: true, rechargeReason: "driver-damage" },
  { id: "e3", description: "Paint & blend", type: "sundries", quantity: 1, unitPrice: 155.00, total: 155.00, rechargeable: true, rechargeReason: "driver-damage" },
  { id: "e4", description: "Brake pad set (front)", type: "parts", quantity: 1, unitPrice: 85.00, total: 85.00, rechargeable: false },
  { id: "e5", description: "Labour - Brake pad replacement", type: "labour", quantity: 1, unitPrice: 65.00, total: 65.00, rechargeable: false },
  { id: "e6", description: "Disposal & environmental", type: "sundries", quantity: 1, unitPrice: 15.00, total: 15.00, rechargeable: false },
];

export const rechargeReasonCodes: Record<string, string> = {
  "driver-damage": "Driver Damage",
  "driver-neglect": "Driver Neglect",
  "lost-key": "Lost Key",
  "glass-damage": "Glass Damage",
  "tyre-neglect": "Tyres Below Legal Limit",
  "late-service": "Late Service (Additional Damage)",
  "interior-damage": "Interior Damage",
  "fuel-contamination": "Fuel Contamination",
};

export const jobStatusSteps = [
  "booked",
  "confirmed",
  "estimated",
  "approved",
  "in-progress",
  "complete",
  "invoiced",
  "closed",
] as const;

export const statusColors: Record<string, string> = {
  "booked": "bg-info/10 text-info",
  "confirmed": "bg-primary/10 text-primary",
  "estimated": "bg-warning/10 text-warning",
  "approved": "bg-success/10 text-success",
  "in-progress": "bg-accent/10 text-accent-foreground",
  "complete": "bg-success/10 text-success",
  "invoiced": "bg-info/10 text-info",
  "closed": "bg-muted text-muted-foreground",
  "pending-review": "bg-warning/10 text-warning",
  "declined": "bg-destructive/10 text-destructive",
  "disputed": "bg-destructive/10 text-destructive",
  "settled": "bg-success/10 text-success",
  "active": "bg-success/10 text-success",
  "in-service": "bg-warning/10 text-warning",
  "off-road": "bg-destructive/10 text-destructive",
};
