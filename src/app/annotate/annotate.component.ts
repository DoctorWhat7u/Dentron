import { Component, ViewChild, OnInit, AfterViewInit, ElementRef } from '@angular/core';
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
    //old habbits sure do die hard:
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.onMouseOverVertex = this.onMouseOverVertex.bind(this);
    this.onMouseOutVertex = this.onMouseOutVertex.bind(this);
  }

  //some reasonable defaults to prevent a reflow when we resize
  //the canvas (#koStage) around the selected image to annotate
  public width: number = 1280;
  public height: number = 520;


  /****
   * It turned out, that in angular 12 the ability to subscribe to
   * observable updates without corrupting internal references to the canvas
   * is botched for the main Stage object. Though its an of here, we later
   * have to set width and height directly.
   */
  public configStage: Observable<any> = of<any>({
    width: this.width,
    height: this.height
  });


  /**
   * Gets the data to initialize view children pending their own initialization
   */
  ngOnInit(): void {
    this.selectedImage = this.imagesService.images.find(image => image.id === this.route.snapshot.params['id']) as IImageSource;
    this.currentLineShape = this.createLineShape(this.currentShapePoints, this.isFinished);
  }


  /**
   * Load the image the user selected and scale the image and stage accordingly.
   * Then set up event handlers.
   *
   * @TODO: Refactor sizing around a window resize/breakpoint change event handler.
   */
  ngAfterViewInit(): void {
    this.rawImage = new Image();

    const width = this.containerInner.nativeElement.offsetWidth;
    const height = this.containerInner.nativeElement.offsetHeight - 24;


    let stage = this.koStage.getStage();
    stage.width(width);
    stage.height(height);

    /***
     * Konva does not have the same API as the Angular ng2-konva adapters.
     */
    this.koBackgroundLayer = new Konva.Layer();
    this.koMasksLayer = new Konva.Layer();

    stage.add(this.koMasksLayer);
    stage.add(this.koBackgroundLayer);
    this.koBackgroundLayer.moveToBottom();

    Konva.Image.fromURL(
      this.selectedImage.url,
      (img) => {
        //We can't know the image's width and height intil we've loaded it.
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



        // testing - some brute-force low level Konva api calls
        // to verify that the shape types are even actually a thing that exists.

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


  /**
   * Becomes true when the shape is closed but we havent started another one.
   */
  private isFinished: boolean = false;


  /**
   * Used to mofify behavior of click events when mouse is over a control ("anchor") point.
   */
  private isMouseOverStartPoint: boolean = false;


  /**
   * Odd positions in this array are X, even are Y coords.
   */
  private currentShapePoints: number[] = [];//23, 20, 23, 160, 70, 93, 150, 109, 290, 139, 270, 93];


  /**
   * Self-explanatory, hence this explanation.
   */
  private currentMousePos: number[] = [0, 0];



  public currentLineShape: Observable<any>;


  /**
   * Reduces an array of {x,y} Point object to a flat array of numbers.
   */
  get flattenedPoints(): number[] {
    if (this.currentShapePoints.length === 0) {
      return [];
    }
    return this.currentShapePoints.concat(this.isFinished ? [] : this.currentMousePos)
      .reduce((a, b) => a.concat(b), []);
  }


  /**
   * Self explanatory, however a note on why you see me sending params to class functions
   * that are part of the class state: Its because as applications grow, it becomes
   * unreasonable to expect to intuitively know everywhere a side effect has produced
   * a mutation. Threading inputs to outputs and outputs to inputs saves us all in the
   * end. In truth, this class should have hardly any proper class variables.
   *
   */
  getMousePos(stage): Point {
    return [stage.getPointerPosition().x, stage.getPointerPosition().y];
  };

  onMouseOverVertex = (event: any) => {
    //We can only close 2-dimensional shapes, not one-dimensional lines
    //TODO: remove isFinished check so we can drag control points to modify
    //polygon shape
    if (this.isFinished || this.currentShapePoints.length < 3) {
      return;
    }
    //You can directly operate on Konva objects created via the API without
    //mutating an observable. In fact (surprise!) its often the only way.
    event.target.scale({ x: 2, y: 2 });
    //preserving until i remember the uncompleted thought this represents:
    //const pos: Point = [event.target.attrs.x, event.target.attrs.y];
    this.isMouseOverStartPoint = true;

  }

  /**
   * Once you hover over an anchor point, we enbiggen it and toggle a flag
   * to modify the behavior of subsequent clicks.
   *
   * TODO: Also maybe change the color and give the scale a nice tween.
   *
   * @param event - has to be <any>, there aren't actually very good union
   *            types for the various Shape types.
   */
  onMouseOutVertex = (event: any) => {
    event.target.scale({ x: 1, y: 1 });
    this.isMouseOverStartPoint = false;
  }

  /**
   * Self explanatory.
   * @TODO: live preview of a line that continues the shape to the
   * current mouse position.
   *
   * @param event
   */
  handleMouseMove = (event) => {
    this.currentMousePos = this.getMousePos(this.koStage.getStage());
  }


  /**
   * By clicking on the ko-stage, we start the polygon drawing process.
   * @param event
   */
  handleClick = (event) => {
    //stage should never just be a class variable because if we were to create
    //a zoom function, recent experience indicates we have to re-create the entire
    //stage and its children
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
      this.generateAnchorPoint(mousePos);
    }

  }

  /*****
   * An observable options object for the in-progress polygon drawing
   */
  currentDrawingBehavior: BehaviorSubject<any>;


  /**
   * Creates the initial observable that the polygon can subscribe to. This
   * is the first anchorpoint of a new shape.
   * @param pointsArray
   * @param isFinished
   * @returns {Observable<any>}
   */
  createLineShape(pointsArray: number[], isFinished) {
    const points = [...pointsArray];
    this.currentDrawingBehavior = new BehaviorSubject<any>({
      points: [...this.flattenedPoints],
      fill: isFinished ? '#8bc34a' : null,
      closed: isFinished,
      stroke: '#4caf50',
      strokeWidth: 4
    });


    //TODO: Send out the point to some OpenCV service to calculate the
    //center of image countour we are suggesting, then let additional
    //anchor points fill in and let the user cycle through suggested shapes.
    // I'm just a web 2.0 guy for now.
    return this.currentDrawingBehavior;
  }

  /**
   * Called when we've added a segment.
   * @param observableConfig - should always be this.currentDrawingBehavior
   * @param pointsArray - not actually needed because of the call to flattenedPoints
   * @param isFinished
   */
  updateLineShape(observableConfig: BehaviorSubject<any>, pointsArray: number[], isFinished) {
    observableConfig.next({
      closed: isFinished,
      fill: '#8bc34a',
      stroke: '#4caf50',
      strokeWidth: 4,
      points: [...this.flattenedPoints],
    });
  }


  /**
   * We're done drawing this polygon (for now) so its time to tear it down
   * and draw another one just like it somewhere else instead.
   *
   * TODO: clicking the generated mask polygon should restore it to the
   * annotation layer so that its anchor points can be dragged.
   */
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


  /**
   * Data represention of the tiny green hexagons used as anchor points.
   */
  public anchorProps: Array<RegularPolygonConfig> = [];

  generateAnchorPoint(point: Array<number>) {
    const anchorProps: RegularPolygonConfig = {
      x: point[0],
      y: point[1],
      radius: 6,
      fill: '#8bc34a77',
      stroke: '#4caf50',
      strokeWidth: 1,
      sides: 6,
      //TODO: draggable: true, need a mechanism to correlate the x, y props to the currentShapePoints array.
    };

    this.anchorProps.push(anchorProps);
    const anchorPoint: Shape = new Konva.RegularPolygon(anchorProps);
    anchorPoint.on('mouseover', this.onMouseOverVertex);
    anchorPoint.on('mouseout', this.onMouseOutVertex);

    let stage = this.koAnnotateLayer.getStage();
    stage.add(anchorPoint);
  }


}
