import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { MatToolbarModule } from '@angular/material/toolbar'
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SelectImageComponent } from './select-image/select-image.component';
import { AnnotateComponent } from './annotate/annotate.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { StoreModule } from '@ngrx/store';
import { KonvaModule } from 'ng2-konva';
import { FabricAnnotate } from './fabric-annotate/fabric-annotate';

@NgModule({
  declarations: [
    AppComponent,
    SelectImageComponent,
    AnnotateComponent,
    FabricAnnotate,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    KonvaModule,
    MatToolbarModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    StoreModule.forRoot({}, {})
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
