import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AnnotateComponent } from './annotate/annotate.component';
import { SelectImageComponent } from './select-image/select-image.component';

const routes: Routes = [
  { path: '', component: SelectImageComponent },
  { path: 'annotate/:id', component: AnnotateComponent },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
