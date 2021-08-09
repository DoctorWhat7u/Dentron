import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AnnotateComponent } from './annotate/annotate.component';
import { SelectImageComponent } from './select-image/select-image.component';
import { FabricAnnotate } from './fabric-annotate/fabric-annotate';

const routes: Routes = [
  { path: '', component: SelectImageComponent },
  { path: 'annotate/:id', component: AnnotateComponent },
  { path: 'annotate/fabric/:id', component: FabricAnnotate },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
