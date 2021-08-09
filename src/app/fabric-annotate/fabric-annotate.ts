/**
 * @fileoverview this class was bootstrapped from https://github.com/theAlgorithmist/FabricJS-Starter
 */


import { Component, ViewChild, OnInit, AfterViewInit, ElementRef, NgZone } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { fabric } from 'fabric';
import { ControlPoint, Point } from 'src/libs/fabric.types';
import { FabricService } from 'src/service/fabric.service';
import { IImageSource, ImagesService } from 'src/service/images.service';

@Component({
  selector: 'app-fabric-annotate',
  templateUrl: './fabric-annotate.html',
  styleUrls: ['./fabric-annotate.scss'],
  providers: [ImagesService, FabricService]

})
export class FabricAnnotate implements OnInit, AfterViewInit {
  @ViewChild('containerInner', { read: ElementRef, static: false }) containerInner: ElementRef;
  protected _canvas?: fabric.Canvas;


  public width: number;
  public height: number;

  /**
   * Full IImageSource object the user selected, represented by the url param :id
   */
  protected selectedImage?: IImageSource;

  protected _activeControlPoint: ControlPoint;


  protected _points: Array<Point>;
  protected _mouseDown: (evt: fabric.IEvent) => void;
  protected _mouseUp: (evt: fabric.IEvent) => void;
  protected _mouseMove: (evt: fabric.IEvent) => void;

  protected _mouseOver: (evt: fabric.IEvent) => void;
  protected _mouseOut: (evt: fabric.IEvent) => void;

  private _drawMode: boolean = false;


  constructor(private _imagesService: ImagesService,
    private _fabricService: FabricService,
    private _route: ActivatedRoute,
    protected _zone: NgZone
  ) {

    this._points = new Array<Point>();
    this._mouseUp = (evt: fabric.IEvent) => this.__onMouseUp(evt);
    this._mouseMove = (evt: fabric.IEvent) => this.__onMouseMove(evt);
    this._mouseDown = (evt: fabric.IEvent) => this.__onMouseDown(evt);
    this._mouseOver = (evt: fabric.IEvent) => this.__onMouseOver(evt);
    this._mouseOut = (evt: fabric.IEvent) => this.__onMouseOut(evt);
  }



  ngOnInit(): void {
    this.selectedImage = this._imagesService.images.find(image => image.id === this._route.snapshot.params['id']) as IImageSource;

  }


  ngAfterViewInit(): void {
    const rawImage = new Image();
    const width = this.containerInner.nativeElement.offsetWidth - 64;
    const height = this.containerInner.nativeElement.offsetHeight - 64;

    console.info('ngAfterViewInit', width, height);

    rawImage.onload = () => {
      let ratio;
      let newWidth;
      let newHeight;
      const imgWidth = rawImage.width;
      const imgHeight = rawImage.height;

      if (imgWidth >= width) {
        ratio = width / imgWidth;
        newWidth = imgWidth * ratio;
        newHeight = imgHeight * ratio;
        if (newHeight > height) {
          ratio = height / newHeight;
          newWidth = ratio * newWidth;
          newHeight = ratio * newHeight;
        }
      } else if (imgHeight > height) {
        ratio = height / imgHeight;
        newWidth = ratio * imgWidth;
        newHeight = ratio * imgHeight;
      }

      this._initFabricCanvas(Math.round(newWidth), Math.round(newHeight));

      const bgImage = new fabric.Image(rawImage, {
        left: 0,
        top: 0,
        width: newWidth,
        height: newHeight,
        selectable: false
      });
      this._canvas.backgroundImage = bgImage;
    }
    rawImage.src = this.selectedImage.url;
  }



  private _initFabricCanvas(width, height) {

    this._zone.runOutsideAngular(() => {
      this._canvas = new fabric.Canvas('fabricSurface', {
        backgroundColor: '#ebebef',
        selection: true,
        preserveObjectStacking: true,
        width: width,
        height: height

      });
      this._fabricService.canvas = this._canvas;
      this._canvas.on('mouse:down', this._mouseDown);
      this._canvas.on('mouse:over', this._mouseOver);
      this._canvas.on('mouse:out', this._mouseOut);

    });
  }


  public onClear(): void {
    this._points.length = 0;
    this._fabricService.clear();
  }

  protected __onMouseDown(evt: fabric.IEvent): void {
    console.info('__onMouseDown', evt)
    if (!this._drawMode) {
      this._drawMode = true;
      this._fabricService.initNewActivePolyline();
      this._canvas.on('mouse:up', this._mouseUp);
      this._canvas.on('mouse:move', this._mouseMove);
      this._canvas.off('mouse:down', this._mouseDown);

    }

  }

  protected __onMouseUp(evt: fabric.IEvent): void {
    if (this._drawMode && evt.pointer) {
      if (this._activeControlPoint !== null && this._points.length > 2) {

        this._fabricService.commitPolygonMask();
        this._activeControlPoint = null;
        this._points.length = 0;
        this._drawMode = false;
        this._canvas.off('mouse:up', this._mouseUp);
        this._canvas.off('mouse:move', this._mouseMove);
        this._canvas.on('mouse:down', this._mouseDown);
      } else {

        const p: Point = { x: evt.pointer.x, y: evt.pointer.y };
        this._points.push(p);

        //this._canvas.renderOnAddRemove = false;
        if (this._points.length > 1) {
          this._fabricService.addPolyline('polyline', this._points);
        }
        //this._canvas.renderOnAddRemove = true;
        this._fabricService.addControlPoint(p);
      }
    }
  }




  protected __onMouseMove(evt: fabric.IEvent): void {

    if (this._drawMode) {
      console.log('mouseMove')
      this._fabricService.updateActiveLine(evt.pointer);
    }
  }

  protected __onMouseOver(evt: fabric.IEvent): void {
    if (evt.target !== null && this._drawMode) {
      console.info("MOUSE_OVER", evt.target.type);
      if (evt.target.type === 'controlPoint') {
        this._activeControlPoint = evt.target as ControlPoint;

        console.info("MOUSE_OVER", this._activeControlPoint);
      }
    }
  }

  protected __onMouseOut(evt: fabric.IEvent): void {
    if (evt.target !== null && this._drawMode && evt.target.type === 'controlPoint') {
      this._activeControlPoint = null;
      console.info("MOUSE_OUT", this._activeControlPoint);
    }
  }
}
