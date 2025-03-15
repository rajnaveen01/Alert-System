import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';  
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { FormBuilder, FormGroup } from '@angular/forms';

export interface AlertData {
  alertId: string;
  alertType: string;
  recipient: string;
  subject: string;
  content: string;
  dateTime: string;
  priority: string;
}

const ALERT_DATA: AlertData[] = [
  {alertId: '101', alertType: 'MS Teams', recipient: 'Abcdef', subject: 'Alert 1', content: 'Content for alert 1', dateTime: '2024-09-1 10:00 AM', priority: 'High'},
  {alertId: '102', alertType: 'Outlook', recipient: 'abcd@gmail.com', subject: 'Alert 2', content: 'Content for alert 2', dateTime: '2024-09-3 12:00 PM', priority: 'Medium'},
  {alertId: '103', alertType: 'SMS', recipient: 'Abyz', subject: 'Alert 3', content: 'Content for alert 3', dateTime: '2024-09-5 09:00 AM', priority: 'Low'},
  {alertId: '104', alertType: 'Outlook', recipient: 'xyz@gmail.com', subject: 'Alert 4', content: 'Content for alert 4', dateTime: '2024-09-6 02:00 PM', priority: 'Medium'},
  {alertId: '105', alertType: 'SMS', recipient: 'Cdvw', subject: 'Alert 5', content: 'Content for alert 5', dateTime: '2024-09-7 10:00 AM', priority: 'Low'},
  {alertId: '106', alertType: 'Outlook', recipient: 'mnop@gmail.com', subject: 'Alert 6', content: 'Content for alert 6', dateTime: '2024-09-10 03:30 PM', priority: 'Medium'},
  {alertId: '107', alertType: 'MS Teams', recipient: 'Ghiljkl', subject: 'Alert 7', content: 'Content for alert 7', dateTime: '2024-09-12 11:00 AM', priority: 'High'},
  {alertId: '108', alertType: 'SMS', recipient: 'Efkl', subject: 'Alert 8', content: 'Content for alert 8', dateTime: '2024-09-15 05:40 PM', priority: 'Low'},
  {alertId: '109', alertType: 'MS Teams', recipient: 'Mnopqrs', subject: 'Alert 9', content: 'Content for alert 9', dateTime: '2024-09-20 04:00 PM', priority: 'High'},
  {alertId: '110', alertType: 'Outlook', recipient: 'ghij@gmail.com', subject: 'Alert 10', content: 'Content for alert 10', dateTime: '2024-09-23 07:00 PM', priority: 'Medium'}
];

@Component({
  selector: 'app-alert-management',
  templateUrl: './alert-management.component.html',
  styleUrls: ['./alert-management.component.css']
})

export class AlertManagementComponent {

  displayedColumns: string[] = ['alertId', 'alertType', 'recipient', 'subject', 'content', 'dateTime', 'priority', 'edit', 'delete'];
  dataSource = new MatTableDataSource(ALERT_DATA);
  alertTypes = ['MS Teams', 'Outlook', 'SMS']; 
  priorities = ['High', 'Medium', 'Low']; 
  selectedAlertType: string | null = null; 
  selectedPriority: string | null = null; 
  startDate: Date | null = null; 
  endDate: Date | null = null; 

  @ViewChild(MatSort) sort!: MatSort;

  constructor(private router: Router) { }

  goTodashboard() {
    this.router.navigate(['/dashboard']);
  }
  
  goToCreateAlert() {
    this.router.navigate(['/create-alert']);  
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);  
  }

  handleNavigation(action: string) {
    switch (action) {
      case 'dashboard':
        this.goTodashboard();
        break;
      case 'create':
        this.goToCreateAlert();
        break;
    }
  }

  ngOnInit() {
    this.dataSource.sort = this.sort;
  }
  
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  applyAlertTypeFilter(selectedType: string) {
    this.selectedAlertType = selectedType; 
    this.dataSource.filterPredicate = (data: AlertData, filter: string) => data.alertType.toLowerCase() === filter.toLowerCase();
    this.dataSource.filter = selectedType;
  }

  applyPriorityFilter(selectedPriority: string) {
    this.selectedPriority = selectedPriority; 
    this.dataSource.filterPredicate = (data: AlertData, filter: string) => data.priority.toLowerCase() === filter.toLowerCase();
    this.dataSource.filter = selectedPriority;
  }

  applyDateRangeFilter() {
    const startDate = this.startDate ? new Date(this.startDate).getTime() : 0;
    const endDate = this.endDate ? new Date(this.endDate).getTime() : Date.now();

    this.dataSource.filterPredicate = (data: AlertData) => {
      const dateTime = new Date(data.dateTime).getTime();
      return dateTime >= startDate && dateTime <= endDate;
    };

    this.dataSource.filter = '' + Math.random(); 
  }

  clearFilters() {
    this.startDate = null;
    this.endDate = null;
    this.selectedAlertType = null; 
    this.selectedPriority = null; 
    this.dataSource.filter = ''; 
    this.dataSource.filterPredicate = () => true; 
  }

  editAlert(alert: AlertData) {
    console.log('Editing alert:', alert);
  }

  deleteAlert(alert: AlertData) {
    const index = this.dataSource.data.indexOf(alert);
    if (index >= 0) {
      this.dataSource.data.splice(index, 1);
      this.dataSource._updateChangeSubscription(); 
      console.log('Deleted alert:', alert);
    }
  }

}