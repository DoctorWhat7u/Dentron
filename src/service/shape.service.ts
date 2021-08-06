import { Injectable } from '@angular/core';
import Konva from 'konva';
import { Point } from 'src/app/annotate/annotate.component';
@Injectable({
  providedIn: 'root'
})
export class ShapeService {
  constructor() { }
  circle() {
    return new Konva.Circle({
      x: 100,
      y: 100,
      radius: 70,
      fill: 'red',
      stroke: 'black',
      strokeWidth: 4,
      draggable: true
    });
  }
  line(pos: Point, mode: string = 'brush') {
    return new Konva.Line({
      stroke: '#4caf50',
      strokeWidth: 3,
      globalCompositeOperation:
        mode === 'brush' ? 'source-over' : 'destination-out',
      points: [...pos],
      draggable: mode == 'brush'
    });
  }
  rectangle() {
    return new Konva.Rect({
      x: 20,
      y: 20,
      width: 100,
      height: 50,
      fill: '#4caf50;',
      stroke: '#4caf50',
      strokeWidth: 4,
      draggable: true
    });
  }
}
