
export interface IImageSource {
  url: string;
  title: string;
  id: string;
  annotations: Array<any>;
};


export class ImagesService {
  public images: Array<IImageSource> = [
    { url: '/assets/image-1.png', title: 'Scattered remote buildings', id: 'img0001', annotations: [] },
    { url: '/assets/image-2.png', title: 'Suburban development', id: 'img002', annotations: [] },
    { url: '/assets/image-3.png', title: 'Urban grid', id: 'img003', annotations: [] }
  ]


  addAnnotation(imgId: string, annotation: any): void {
    this.images.find(img => img.id === imgId)?.annotations.push(annotation);

  }

}
