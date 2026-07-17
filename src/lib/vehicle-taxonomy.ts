// Example cascading vehicle taxonomy: Asset type -> Make -> Model -> Derivatives[]
// Used by the vehicle details form and the SMR "applicable vehicles" tree.

export type VehicleTaxonomy = Record<string, Record<string, Record<string, string[]>>>;

export const VEHICLE_TAXONOMY: VehicleTaxonomy = {
  Car: {
    Abarth: {
      "124 Spider Roadster": ["1.4 T Multiair 2dr", "1.4 T Multiair 2dr Auto"],
      "595 Hatchback": ["1.4 T-Jet 70th", "1.4 T-Jet Competizione", "1.4 T-Jet Turismo"],
      "695 Hatchback": ["1.4 T-Jet Biposto", "1.4 T-Jet Esseesse"],
    },
    BMW: {
      "1 Series": ["116d SE", "118i M Sport", "120d xDrive M Sport"],
      "3 Series": ["320d M Sport", "330e M Sport", "M340i xDrive"],
      "X5": ["xDrive30d M Sport", "xDrive40i M Sport", "M50d"],
    },
    Ford: {
      "Fiesta": ["1.0 EcoBoost Titanium", "1.0 EcoBoost ST-Line", "1.5 EcoBoost ST"],
      "Focus": ["1.0 EcoBoost Zetec", "1.5 EcoBlue Titanium", "2.3 EcoBoost ST"],
      "Mondeo": ["2.0 TDCi Titanium", "2.0 EcoBlue ST-Line", "2.0 Hybrid Vignale"],
    },
    Tesla: {
      "Model 3": ["Standard Range Plus", "Long Range AWD", "Performance"],
      "Model Y": ["Long Range AWD", "Performance"],
    },
    Volkswagen: {
      "Golf": ["1.5 TSI Life", "2.0 TDI Style", "2.0 TSI GTI", "2.0 TSI R"],
      "Passat": ["1.5 TSI SE", "2.0 TDI Elegance", "2.0 TSI R-Line"],
    },
  },
  Van: {
    Ford: {
      "Transit Custom": ["280 L1 Trend", "300 L2 Limited", "320 L2 Sport"],
      "Transit": ["350 L3H2 Leader", "350 L4H3 Trend", "460 L4H3 Limited"],
    },
    Mercedes: {
      "Sprinter": ["314 CDI L2H2", "316 CDI L3H2", "319 CDI L3H2 4x4"],
      "Vito": ["110 CDI Pure", "116 CDI Progressive", "119 CDI Select"],
    },
    Volkswagen: {
      "Transporter": ["T30 SWB Startline", "T32 LWB Highline", "T32 LWB Sportline"],
      "Crafter": ["CR30 MWB Startline", "CR35 LWB Trendline", "CR50 LWB Highline"],
    },
  },
  HGV: {
    DAF: {
      "XF": ["480 FT 4x2", "530 FTG 6x2", "480 FTP 6x4"],
      "CF": ["370 FA 4x2", "450 FAN 6x2", "530 FAT 8x4"],
    },
    Scania: {
      "R Series": ["R450 4x2", "R500 6x2", "R660 6x4"],
      "S Series": ["S500 4x2", "S650 6x2", "S770 6x4"],
    },
    Volvo: {
      "FH": ["FH 460 4x2", "FH 500 6x2", "FH 540 6x4"],
      "FM": ["FM 380 4x2", "FM 460 6x2", "FM 500 8x4"],
    },
    MAN: {
      "TGX": ["18.470 4x2", "26.510 6x2", "33.640 8x4"],
      "TGS": ["18.360 4x2", "26.440 6x2", "35.470 8x4"],
    },
  },
  Trailer: {
    "Schmitz Cargobull": {
      "S.KO Cool": ["Standard 13.6m", "Multi-Temp 13.6m"],
      "S.CS Curtainsider": ["Universal 13.6m", "Mega 13.6m"],
    },
    "Krone": {
      "Profi Liner": ["Standard 13.6m", "Mega 13.6m"],
      "Cool Liner": ["Standard 13.6m", "Duoplex 13.6m"],
    },
    "Cartwright": {
      "Curtainsider": ["Standard 13.6m", "Double Deck 13.6m"],
      "Box Van": ["Standard 13.6m", "Urban 10.0m"],
    },
  },
  Plant: {
    JCB: {
      "3CX": ["Sitemaster", "Contractor", "Eco"],
      "8025 ZTS": ["Standard", "Long Arm"],
    },
    Caterpillar: {
      "320 Excavator": ["Standard", "Long Reach"],
      "950M Loader": ["Standard", "High Lift"],
    },
    Komatsu: {
      "PC210": ["LC-11", "LCi-11"],
      "WA320": ["-8", "-8 High Lift"],
    },
  },
  "Tail Lift": {
    Dhollandia: {
      "DH-LM": ["500kg", "750kg", "1000kg"],
      "DH-SM": ["1500kg", "2000kg"],
    },
    Anteo: {
      "F3 Series": ["750kg", "1000kg"],
      "F5 Series": ["1500kg", "2000kg"],
    },
    Ratcliff: {
      "RC Column": ["500kg", "750kg"],
      "RS Tuckaway": ["1000kg", "1500kg"],
    },
  },
};

export const ASSET_TYPES = Object.keys(VEHICLE_TAXONOMY);

export const getMakesFor = (assetType?: string): string[] =>
  assetType && VEHICLE_TAXONOMY[assetType] ? Object.keys(VEHICLE_TAXONOMY[assetType]) : [];

export const getModelsFor = (assetType?: string, make?: string): string[] =>
  assetType && make && VEHICLE_TAXONOMY[assetType]?.[make]
    ? Object.keys(VEHICLE_TAXONOMY[assetType][make])
    : [];

export const getDerivativesFor = (assetType?: string, make?: string, model?: string): string[] =>
  assetType && make && model && VEHICLE_TAXONOMY[assetType]?.[make]?.[model]
    ? VEHICLE_TAXONOMY[assetType][make][model]
    : [];

// Flatten taxonomy into vehicle-shaped rows so the SMR tree has options
// even before any vehicles are added to the fleet.
export const taxonomyAsVehicles = () => {
  const rows: { asset_type: string; make: string; model: string; derivative: string }[] = [];
  for (const at of Object.keys(VEHICLE_TAXONOMY)) {
    for (const mk of Object.keys(VEHICLE_TAXONOMY[at])) {
      for (const md of Object.keys(VEHICLE_TAXONOMY[at][mk])) {
        for (const dv of VEHICLE_TAXONOMY[at][mk][md]) {
          rows.push({ asset_type: at, make: mk, model: md, derivative: dv });
        }
      }
    }
  }
  return rows;
};
