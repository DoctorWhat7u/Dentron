import { Component, ViewChild, OnInit, AfterViewInit, QueryList, ContentChildren, ElementRef } from '@angular/core';
import {
  Observable,
  BehaviorSubject,
  of,
  fromEvent,
  combineLatest
} from "rxjs";
import { map, startWith, pairwise, scan, tap } from "rxjs/operators";

import { ActivatedRoute } from '@angular/router';
import { IImageSource, ImagesService } from '../../service/images.service';
import { CoreShapeComponent, KonvaComponent } from 'ng2-konva';
import Konva from 'konva';
import { Layer } from 'konva/lib/Layer';
import { ThrowStmt } from '@angular/compiler';
import { Line } from 'konva/lib/shapes/Line';
import { Shape, ShapeConfig } from 'konva/lib/Shape';
import { RegularPolygonConfig } from 'konva/lib/shapes/RegularPolygon';

export type Point = [number, number];



@Component({
  selector: 'app-annotate',
  templateUrl: './annotate.component.html',
  styleUrls: ['./annotate.component.scss'],
  providers: [ImagesService]
})
export class AnnotateComponent implements OnInit, AfterViewInit {

  @ViewChild('containerInner') containerInner: ElementRef;



  /**
   * Main Konva stage object
   * @see https://konvajs.org/api/Konva.Stage.html
   */
  @ViewChild('koStage') koStage: KonvaComponent;


  /**
   * The layer into which the selected image will be rendered and the koStage
   * will be resized to fit.
   * @see https://konvajs.org/api/Konva.Layer.html
   */
  //@ViewChild('koBackgroundLayer') koBackgroundLayer: Layer;
  private koBackgroundLayer: Layer;



  /**
   * Konva layer where user in-progress drawings will be rendered
   */
  @ViewChild('koAnnotateLayer') koAnnotateLayer: CoreShapeComponent;
  //sometimes we have to treat layers programmatically via Konva API:
  //private koAnnotateLayer: Layer;

  /******
   * Completed closed drawings
   */
  private koMasksLayer: Layer;


  private masks: Array<Line> = [];


  /***
   * ko-line tag as a contentChild of #koAnnotateLayer. Some Konva
   * shape directives still work properly in angular 12....
   */
  @ViewChild('currentDrawing') currentDrawing: Line;


  /**
   * Full IImageSource object the user selected, represented by the url param :id
   */
  selectedImage: IImageSource | null = null;

  /********
   * Used to load and measure the image
   */
  rawImage: HTMLImageElement;



  /******
   * Overall scale factor for the canvas to fit the image in the container
   */
  scaleFactor: number;

  constructor(private imagesService: ImagesService,
    private route: ActivatedRoute,
  ) {

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.onMouseOverVertex = this.onMouseOverVertex.bind(this);
    this.onMouseOutVertex = this.onMouseOutVertex.bind(this);

  }

  public width: number = 1280;
  public height: number = 520;


  public configStage: Observable<any> = of<any>({
    width: this.width,
    height: this.height
  });


  ngOnInit(): void {
    this.selectedImage = this.imagesService.images.find(image => image.id === this.route.snapshot.params['id']) as IImageSource;
    this.currentLineShape = this.createLineShape(this.currentShapePoints, this.isFinished);
  }


  /**
   * Load the image the user selected and scale the image and stage accordingly.
   * Then set up event handlers.
   */
  ngAfterViewInit(): void {
    this.rawImage = new Image();
    let oldStage = this.koStage.getStage();

    const width = this.containerInner.nativeElement.offsetWidth;
    const height = this.containerInner.nativeElement.offsetHeight - 24;


    let stage = this.koStage.getStage();
    stage.width(width);
    stage.height(height);

    /***
     * Konva does not have the same API as the Angular ng2-konva adapters.
     * So tragically sad.
     */
    this.koBackgroundLayer = new Konva.Layer();
    this.koMasksLayer = new Konva.Layer();

    stage.add(this.koMasksLayer);
    stage.add(this.koBackgroundLayer);
    this.koBackgroundLayer.moveToBottom();

    Konva.Image.fromURL(
      this.selectedImage.url,
      (img) => {

        const aspectRatio = width / height;

        let newWidth;
        let newHeight;
        const imgWidth = img.width();
        const imgHeight = img.height();
        const imageRatio = imgWidth / imgHeight;


        if (aspectRatio >= imageRatio) {
          newWidth = imgWidth;
          newHeight = imgWidth / aspectRatio;
        } else {
          newWidth = imgHeight * aspectRatio;
          newHeight = imgHeight;
        }
        img.setAttrs({
          width: newWidth,
          height: newHeight,
          x: 0,
          y: 0,
          name: 'background',
          draggable: false,
        });
        this.koBackgroundLayer.add(img);



        ///testing'
        /*
        let poly = new Konva.Line({
          points: [0, 0],
          fill: '#8bc34a',
          stroke: '#4caf50',
          strokeWidth: 4,
          closed: true
        });
        this.koMasksLayer.add(poly);*/
        /******
         * Listeners are set up here because resizing the stage *seems* like it
         * is resetting the angular component's internal Konva.Stage references
         */
        stage.addEventListener('mousedown', this.handleClick);
        stage.addEventListener('mousemove', this.handleMouseMove);
      });
  }


  private isFinished: boolean = false;
  isMouseOverStartPoint: boolean = false;
  private currentShapePoints: number[] = [];//23, 20, 23, 160, 70, 93, 150, 109, 290, 139, 270, 93];
  private currentMousePos: number[] = [0, 0];


  public currentLineShape: Observable<any>;

  get flattenedPoints(): number[] {
    if (this.currentShapePoints.length === 0) {
      return [];
    }
    return this.currentShapePoints.concat(this.isFinished ? [] : this.currentMousePos)
      .reduce((a, b) => a.concat(b), []);
  }


  getMousePos(stage): Point {
    return [stage.getPointerPosition().x, stage.getPointerPosition().y];
  };

  onMouseOverVertex = (event: any) => {
    if (this.isFinished || this.currentShapePoints.length < 3) {
      return;
    }
    event.target.scale({ x: 2, y: 2 });
    const pos: Point = [event.target.attrs.x, event.target.attrs.y];
    this.isMouseOverStartPoint = true;

  }

  onMouseOutVertex = (event: any) => {
    event.target.scale({ x: 1, y: 1 });
    this.isMouseOverStartPoint = false;
  }


  handleMouseMove(event) {
    this.currentMousePos = this.getMousePos(this.koStage.getStage());
  }


  /**
   * By clicking on the ko-stage, we start the polygon drawing process.
   * @param event
   */
  handleClick = (event) => {
    const stage = this.koStage.getStage();
    const mousePos: number[] = this.getMousePos(stage);
    if (this.isMouseOverStartPoint && this.currentShapePoints.length >= 3) {
      this.isFinished = true;
      this.currentShapePoints = [...this.currentShapePoints, this.currentShapePoints[0], this.currentShapePoints[1]];
      this.updateLineShape(this.currentDrawingBehavior, this.currentShapePoints, this.isFinished);
      this.commitLineShape();
    } else {
      this.currentShapePoints = [...this.currentShapePoints, ...mousePos];
      this.updateLineShape(this.currentDrawingBehavior, this.currentShapePoints, this.isFinished);
      this.generateAnchorProps(mousePos);
    }

  }

  /*****
   * An observable options object for the in-progress polygon drawing
   */
  currentDrawingBehavior: BehaviorSubject<any>;


  /**
   * Creates the initial observable that the polygon can subscribe to
   * @param pointsArray
   * @param isFinished
   * @returns {Observable<any>}
   */
  createLineShape(pointsArray: number[], isFinished) {
    const points = [...pointsArray];
    this.currentDrawingBehavior = new BehaviorSubject<any>({
      points: [...this.flattenedPoints],
      fill: isFinished ? '#8bc34a' : null,
      closed: isFinished ? true : false,
      stroke: '#4caf50',
      strokeWidth: 4

    });
    return this.currentDrawingBehavior;
  }

  updateLineShape(observableConfig: BehaviorSubject<any>, pointsArray: number[], isFinished) {
    observableConfig.next({
      closed: isFinished,
      fill: '#8bc34a',
      stroke: '#4caf50',
      strokeWidth: 4,
      points: [...this.flattenedPoints],
    });
  }

  commitLineShape() {
    const poly = new Konva.Line({
      points: [...this.flattenedPoints],
      fill: '#4caf5088',
      stroke: '#4caf50',
      strokeWidth: 4,
      closed: true
    });
    this.koMasksLayer.add(poly);
    this.masks.push(poly);

    this.currentShapePoints = [];
    this.isFinished = false;

  }


  //public anchorProps: Array<Observable<Partial<RegularPolygonConfig>>> = [];
  public anchorProps: Array<RegularPolygonConfig> = [];

  generateAnchorProps(point: Array<number>) {
    const anchorProps: RegularPolygonConfig = {
      x: point[0],
      y: point[1],
      radius: 6,
      fill: '#8bc34a77',
      stroke: '#4caf50',
      strokeWidth: 1,
      sides: 6
    };

    this.anchorProps.push(anchorProps);

    const anchorPoint: Shape = new Konva.RegularPolygon(anchorProps);

    anchorPoint.on('mouseover', this.onMouseOverVertex);
    anchorPoint.on('mouseout', this.onMouseOutVertex);

    let stage = this.koAnnotateLayer.getStage();
    stage.add(anchorPoint);

    console.info('stage', stage)

    console.info('anchorprops', this.anchorProps)
  }

}
