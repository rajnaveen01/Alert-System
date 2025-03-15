import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-create-alert',
  templateUrl: './create-alert.component.html',
  styleUrls: ['./create-alert.component.css']
})

export class CreateAlertComponent {

  uploadedFileName: string = '';
  alertType: string = '';
  subject: string = '';
  content: string = '';
  newRecipient: string = ''; 
  recipients: string[] = []; 
  dateTime: string = '';  
  priority: string = '';
  alertData: any[] = [];

  constructor(private router: Router, private http: HttpClient, private dialogRef: MatDialogRef<CreateAlertComponent>) {}

  addRecipient() {
    if (this.newRecipient) {
      this.recipients.push(this.newRecipient.trim());
      this.newRecipient = ''; 
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file && file.name.endsWith('.xlsx')) {
      this.uploadedFileName = file.name;
  
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const binaryData = e.target.result;
        const workbook = XLSX.read(binaryData, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
  
        this.alertData = jsonData.map((row: any) => {
          const receiveTime = row['Receive Time'] ? new Date(row['Receive Time']) : null;
          let recipientsArray: string[] = [];
  
          if (typeof row['Recipients'] === 'string') {
            recipientsArray = row['Recipients'].split(',').map((recipient: string) => recipient.trim());
          } else if (typeof row['Recipients'] === 'number') {
            recipientsArray = [row['Recipients'].toString()];
          }
  
          return {
            alertType: row['Alert Type'] || '',
            recipients: recipientsArray,
            subject: row['Subject'] || '',
            content: row['Content'] || '',
            sent: new Date().toISOString(),
            received: receiveTime ? receiveTime.toISOString() : '',
            priority: row['Priority'] || '',
            status: 'Unsent'
          };
        });
      };
      reader.readAsBinaryString(file);
    } else {
      console.error('Invalid file format. Please upload an Excel file.');
    }
  }
  
  downloadTemplate() {
    this.http.get('http://127.0.0.1:59255/download-excel-template', { responseType: 'blob' }).subscribe((blob) => {
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'alert_template.xlsx';
      link.click();
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }
  
  onFileDrop(event: DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.uploadedFileName = file.name;
    }
  }

  createAlert() {
    const isoSentTime = new Date().toISOString(); 
  
    if (this.alertData.length > 0) {
      this.alertData = this.alertData.map((alert) => ({
        ...alert,
        sent: isoSentTime,   
        received: alert.received ? new Date(alert.received).toISOString() : '' 
      }));
  
      this.http.post('http://127.0.0.1:59255/create-alert', { alerts: this.alertData }).subscribe({
        next: (response: any) => {
          alert('Alerts created successfully');
          this.dialogRef.close();
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          alert('Error creating alerts: ' + err.message);
        }
      });
    } else {

      const isoReceivedTime = new Date(this.dateTime).toISOString();  
  
      const alertData = {
        alertType: this.alertType || '',  
        recipients: this.recipients, 
        subject: this.subject || '',  
        content: this.content || '',  
        sent: isoSentTime,
        received: isoReceivedTime,
        priority: this.priority || '',  
        status: "Unsent"
      };
  
      if (!alertData.alertType || !alertData.recipients.length || !alertData.subject || !alertData.priority) {
        alert('Please fill all the required fields and add at least one recipient.');
        return;
      }
  
      this.http.post('http://127.0.0.1:59255/create-alert', { alert: alertData }).subscribe({
        next: () => {
          alert('Alert created successfully');
          this.dialogRef.close();
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          alert('Error creating alert: ' + err.message);
        }
      });
    }
  }
  
  Close(){
    this.dialogRef.close();
  }
}