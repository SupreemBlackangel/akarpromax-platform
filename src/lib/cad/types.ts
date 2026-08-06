export type CadUnit = "mm" | "cm" | "m" | "inch" | "foot";

export type CadPoint = {
  x: number;
  y: number;
  z?: number;
};

export type CadColor = number | string;

export type CadLayer = {
  name: string;
  color: CadColor;
  lineType?: string;
  lineWeight?: number;
  visible?: boolean;
  locked?: boolean;
};

export type CadTextAlignment = "left" | "center" | "right";

export type CadLine = {
  type: "LINE";
  layer: string;
  start: CadPoint;
  end: CadPoint;
};

export type CadPolyline = {
  type: "LWPOLYLINE";
  layer: string;
  points: CadPoint[];
  closed: boolean;
};

export type CadCircle = {
  type: "CIRCLE";
  layer: string;
  center: CadPoint;
  radius: number;
};

export type CadArc = {
  type: "ARC";
  layer: string;
  center: CadPoint;
  radius: number;
  startAngleDeg: number;
  endAngleDeg: number;
};

export type CadText = {
  type: "TEXT";
  layer: string;
  position: CadPoint;
  height: number;
  text: string;
  alignment?: CadTextAlignment;
  rotationDeg?: number;
};

export type CadMText = {
  type: "MTEXT";
  layer: string;
  position: CadPoint;
  height: number;
  text: string;
  width?: number;
  alignment?: CadTextAlignment;
};

export type CadHatch = {
  type: "HATCH";
  layer: string;
  boundary: CadPoint[];
  pattern?: string;
  scale?: number;
};

export type CadDimension = {
  type: "DIMENSION";
  layer: string;
  start: CadPoint;
  end: CadPoint;
  offset: number;
  text?: string;
};

export type CadPointMarker = {
  type: "POINT";
  layer: string;
  position: CadPoint;
};

export type CadEntity =
  | CadLine
  | CadPolyline
  | CadCircle
  | CadArc
  | CadText
  | CadMText
  | CadHatch
  | CadDimension
  | CadPointMarker;

export type CadDocumentModel = {
  version: string;
  units: CadUnit;
  drawingName: string;
  coordinateSystem?: string;
  layers: CadLayer[];
  entities: CadEntity[];
  metadata?: {
    author?: string;
    description?: string;
    createdAt?: string;
  };
};

export type CadExportFormat = "dxf" | "svg" | "png" | "pdf";

export type CadExportStatus =
  | "idle"
  | "validating"
  | "preparing"
  | "generating"
  | "converting"
  | "completed"
  | "failed";

export type CadValidationIssue = {
  level: "error" | "warning";
  message: string;
  entityIndex?: number;
};
