import { Component, OnInit } from '@angular/core';
import { IImageSource, ImagesService } from '../../service/images.service';


@Component({
  selector: 'app-select-image',
  templateUrl: './select-image.component.html',
  styleUrls: ['./select-image.component.scss'],

  providers: [ImagesService]
})
export class SelectImageComponent implements OnInit {
  images: Array<IImageSource> = [];

  constructor(private imagesService: ImagesService) { }

  ngOnInit(): void {
    this.images = this.imagesService.images;
  }
}
