
import { Injectable } from '@angular/core';

import { fabric } from 'fabric';
import { Point, ControlPoint, MaskPolygon } from '../libs/fabric.types';
import * as COLORS from '../libs/drawing.constants';

const Hexagon = fabric.util.createClass(fabric.Polygon, {
  type: 'controlPoint',
  superType: 'polygon',
  editable: false,
  initialize(points: fabric.Point, option: fabric.Polygon) {
    this.callSuper('initialize', points, option);
  },
  _render(ctx: CanvasRenderingContext2D) {
    this.callSuper('_render', ctx);
  },
});

const Mask = fabric.util.createClass(fabric.Polygon, {
  type: 'polygon',
  superType: 'shape',
  editable: false,
  initialize(points: fabric.Point, option: fabric.Polygon) {
    this.callSuper('initialize', points, option);
  },
  _render(ctx: CanvasRenderingContext2D) {
    this.callSuper('_render', ctx);
  },
});

const LINE_INDEX: number = 0;
const CONTROL_POINT_INDEX: number = 1;

@Injectable({ providedIn: 'root' })
export class FabricService {

  public strokeWidth: number;
  public strokeColor: string;
  public controlPointRadius: number;
  public circleFill: string;

  protected _canvas?: fabric.Canvas;

  protected _points: Array<ControlPoint> = [];

  protected _polylines: Record<string, fabric.Polyline> = {};

  protected _masks: Record<string, MaskPolygon>

  protected _lastPoint: Point;
  protected _activeLine: fabric.Line;

  private _hexPoints: Array<Point>;

  constructor() {
    this.strokeWidth = 2;
    this.controlPointRadius = 6;

    this._points = new Array<ControlPoint>();
    this._polylines = {};
    this._masks = {};
    this._hexPoints = this._generatePolygonPoints(6, this.controlPointRadius);
  }



  public set canvas(surface: fabric.Canvas) {
    if (surface !== undefined && surface != null && surface instanceof fabric.Canvas) {
      this._canvas = surface;
    }
  }

  public clear(): void {
    this.clearActiveControlPoints();
    this.clearActivePolyLines();
    this.clearMasks();
  }

  public initNewActivePolyline(): void {
    this.clearActiveControlPoints();
    this.clearActivePolyLines();
    this._points = new Array<ControlPoint>();
    this._polylines = {};
  }

  public clearActiveControlPoints(): void {
    if (this._canvas) {

      this._points.forEach((ctrlPoint): void => {
        this._canvas.remove(ctrlPoint);
      });

      this._points.length = 0;
    }
  }


  public clearActivePolyLines(): void {
    if (this._canvas) {

      Object.keys(this._polylines).forEach((name: string): void => {
        this._canvas.remove(this._polylines[name]);
      });

      if (this._activeLine) {
        this._canvas.remove(this._activeLine);
        this._activeLine = null;
      }
      this._lastPoint = null;
      this._polylines = {};

      this._canvas.renderAll();
    }
  }

  protected clearMasks(): void {
    for (let key in this._masks) {
      let mask: MaskPolygon = this._masks[key];
      if (this._canvas) {
        this._canvas.remove(mask);
        delete this._masks[key];
      }
    }
  }


  public addControlPoint(p: Point): void {

    const index = this._points.length;
    const controlPoint: ControlPoint = new Hexagon(
      this._generatePolygonPoints(6, 6),
      {
        left: p.x - this.controlPointRadius,

        top: p.y - this.controlPointRadius,
        fill: COLORS.CONTROL_POINT_FILL,
        stroke: COLORS.CONTROL_POINT_STROKE,
        radius: this.controlPointRadius,
        selectable: true,
        editable: true,
        id: `ctrl_${index}`,
        point: p,
        index

      });

    this._lastPoint = p;
    if (this._activeLine) {
      this._activeLine.set({ x1: p.x, y1: p.y });
    }
    this._points.push(controlPoint);

    this._canvas.add(controlPoint);
    this._canvas.renderAll();

  }


  public commitPolygonMask(): void {
    const index = Object.keys(this._masks).length;
    const id = `mask_${index}`;
    const mask: MaskPolygon = new Mask(this._points.map((point: ControlPoint): Point => { return point.point }),
      {
        strokeWidth: this.strokeWidth,
        stroke: COLORS.MASK_FILL,
        fill: COLORS.MASK_FILL,
        selectable: false,
        id, index

      });
    this.clearActivePolyLines();
    this._masks[id] = mask;
    this._canvas.add(mask);
  }


  /**
   * Creates regular polygons (Hexagon, etc)
   * @param sideCount
   * @param radius
   * @returns
   */
  private _generatePolygonPoints(sideCount: number, radius: number): Array<Point> {

    const sweep = Math.PI * 2 / sideCount;
    const cx = radius;
    const cy = radius;

    const points: Array<Point> = [];
    for (var i = 0; i < sideCount; i++) {
      var x = cx + radius * Math.cos(i * sweep);
      var y = cy + radius * Math.sin(i * sweep);
      points.push({ x, y });
    }
    return points;

  }


  public addPolyline(name: string, points: Array<Point>, clear: boolean = true): void {
    const polyLine: fabric.Polyline = new fabric.Polyline(points,
      {
        strokeWidth: this.strokeWidth,
        stroke: COLORS.LINE,
        fill: 'transparent',
        selectable: false,
      });

    if (this._canvas) {
      if (clear && this._polylines[name] !== undefined) {
        this._canvas.remove(this._polylines[name]);
      }

      this._canvas.insertAt(polyLine, 0, false);
      //this._canvas.renderAll();
    }

    this._polylines[name] = polyLine;
  }


  public updateActiveLine({ x, y }: Point): void {
    if (this._activeLine) {

      this._activeLine.set({ x2: x, y2: y });
      if (this._canvas) {
        this._canvas.renderAll();
      }
    } else if (this._lastPoint) {

      this._activeLine = new fabric.Line(
        [this._lastPoint.x, this._lastPoint.y, x, y],
        {
          selectable: false,
          strokeWidth: 2,
          stroke: COLORS.CONTROL_POINT_STROKE_HOVER
        });
      this._canvas.add(this._activeLine);
    }
  }



}
