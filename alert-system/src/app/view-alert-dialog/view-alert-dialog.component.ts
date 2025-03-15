import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-view-alert-dialog',
  templateUrl: './view-alert-dialog.component.html',
  styleUrls: ['./view-alert-dialog.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ViewAlertDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { 
      recipients: string;  
      subject: string;
      content: string;
      priority: string;
      status: string;
  }) {}
}
