import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewAlertDialogComponent } from './view-alert-dialog.component';

describe('ViewAlertDialogComponent', () => {
  let component: ViewAlertDialogComponent;
  let fixture: ComponentFixture<ViewAlertDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewAlertDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewAlertDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
