export type Point = { x: number, y: number };
export interface ControlPoint extends fabric.Polygon {
  pointIndex: number;
  id: string;
  point: Point;
}

export interface MaskPolygon extends fabric.Polygon {
  maskIndex: number;
  id: string;
}



