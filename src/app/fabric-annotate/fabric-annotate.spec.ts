import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FabricAnnotate } from './fabric-annotate';

describe('FabricAnnotate', () => {
  let component: FabricAnnotate;
  let fixture: ComponentFixture<FabricAnnotate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FabricAnnotate ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FabricAnnotate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
