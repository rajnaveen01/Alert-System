import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { ViewAlertDialogComponent } from '../view-alert-dialog/view-alert-dialog.component';
import { CreateAlertComponent } from '../create-alert/create-alert.component';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface AlertData {
  _id?: string;
  alertType: string;
  recipients: string[];
  subject: string;
  content: string;
  sent: string;
  received: string;
  priority: string;
  status: string;
  isEditMode?: boolean;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})

@Injectable({
  providedIn: 'root'
})

export class DashboardComponent implements OnInit {

  displayedColumns: string[] = ['alertType', 'recipients', 'subject', 'sent', 'received', 'priority', 'status', 'action'];
  dataSource = new MatTableDataSource<AlertData>([]);
  alertTypes = ['MS Teams', 'Email', 'SMS'];
  priorities = ['High', 'Medium', 'Low'];
  statuses = ['Sent', 'Unsent'];
  selectedAlertType: string | null = null;
  selectedPriority: string | null = null;
  selectedStatus: string | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;
  selectedTimeRange: 'All' | '1hour' | '5hours' | '1day' | '1week' | '1month' = 'All';
  searchValue: string = '';
  searchValueSubject = new Subject<string>();
  token = localStorage.getItem('authToken');

  alertCounts: { [key: string]: number } = {
    'MS Teams': 0,
    'Email': 0,
    'SMS': 0
  };

  page = 1;
  limit = 5;
  totalAlerts = 0;
  totalPages = 1;

  timeRanges: { [key in 'All' | '1hour' | '5hours' | '1day' | '1week' | '1month']: number } = {
    'All': 0,
    '1hour': 60 * 60 * 1000,
    '5hours': 5 * 60 * 60 * 1000,
    '1day': 24 * 60 * 60 * 1000,
    '1week': 7 * 24 * 60 * 60 * 1000,
    '1month': 30 * 24 * 60 * 60 * 1000,
  };

  private intervalId: any;
  private apiUrl = 'http://127.0.0.1:59270/alerts';

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private router: Router,
    private http: HttpClient,
    public dialog: MatDialog
  ) {}

  goToCreateAlert() {
    this.router.navigate(['/create-alert']);
  }

  goToAlertManagement() {
    this.router.navigate(['/alert-management']);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  handleNavigation(action: string) {
    switch (action) {
      case 'create':
        this.goToCreateAlert();
        break;
      case 'management':
        this.goToAlertManagement();
        break;
    }
  }

  onTimeRangeChange(selectedRange: 'All' | '1hour' | '5hours' | '1day' | '1week' | '1month') {
    this.selectedTimeRange = selectedRange;
    this.fetchAlerts(); 
  }

  ngOnInit() {
    this.dataSource = new MatTableDataSource<AlertData>();
    this.dataSource.sort = this.sort;
    this.fetchAlerts();

    this.searchValueSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchValue => {
      this.searchValue = searchValue;
      this.fetchAlerts();
    });

    this.intervalId = setInterval(() => {
      this.fetchAlerts();
    }, 10000);
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  filterAlertsByType(type: string) {
    this.selectedAlertType = type;
    this.fetchAlerts(); 
  }

  fetchAlerts() {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No token found in local storage');
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const params = {
      page: this.page.toString(),
      limit: this.limit.toString(),
      alertType: this.selectedAlertType || '',
      priority: this.selectedPriority || '',
      status: this.selectedStatus || '',
      start_date: this.startDate ? this.startDate.toISOString() : '',
      end_date: this.endDate ? this.endDate.toISOString() : '',
      search: this.searchValue
    };

    this.http.get<{ alerts: AlertData[], total: number }>('http://127.0.0.1:59270/alerts', { headers, params }).subscribe(
      (response) => {
        this.dataSource.data = response.alerts.map(alert => ({
          ...alert,
          recipients: Array.isArray(alert.recipients) ? alert.recipients : [alert.recipients],
          sent: new Date(alert.sent).toISOString(),
          received: new Date(alert.received).toISOString(),
        }));

        this.totalAlerts = response.total;
        this.totalPages = Math.ceil(this.totalAlerts / this.limit);
        this.applyTimeFilter(response.alerts);
        this.refreshAlertCounts();
      },
      (error) => {
        console.error('Error fetching alerts:', error);
      }
    );
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.fetchAlerts();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.fetchAlerts();
    }
  }

  refreshAlertCounts() {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No token found in local storage');
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get<{ alert_counts: { [key: string]: number } }>('http://127.0.0.1:59270/alert-counts', { headers }).subscribe(
      (response) => {
        this.alertCounts = response.alert_counts;
        console.log('Alert counts:', this.alertCounts);
      },
      (error) => {
        console.error('Error fetching alert counts:', error);
      }
    );
  }

  applyFilter(event: Event) {
    const searchValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.searchValueSubject.next(searchValue);
  }

  applyAlertTypeFilter(selectedType: string) {
    this.selectedAlertType = selectedType;
    this.fetchAlerts();
  }

  applyPriorityFilter(selectedPriority: string) {
    this.selectedPriority = selectedPriority;
    this.fetchAlerts();
  }

  applyStatusFilter(selectedStatus: string) {
    this.selectedStatus = selectedStatus;
    this.fetchAlerts();
  }

  applyDateRangeFilter() {
    if (this.startDate && this.endDate) {
      this.fetchAlerts();
    }
  }

  applyTimeFilter(alerts: AlertData[]) {
    if (this.selectedTimeRange === 'All') {
      this.dataSource.data = alerts;
      return;
    }

    const now = new Date().getTime();
    const selectedRangeMillis = this.timeRanges[this.selectedTimeRange];
    const filteredAlerts = alerts.filter(alert => {
      const receivedTime = new Date(alert.received).getTime();
      return now - receivedTime <= selectedRangeMillis;
    });

    this.dataSource.data = filteredAlerts;
  }

  clearFilters() {
    this.startDate = null;
    this.endDate = null;
    this.selectedAlertType = null;
    this.selectedPriority = null;
    this.selectedStatus = null;
    this.searchValue = '';
    this.fetchAlerts();
  }

  viewAlert(element: any) {
    console.log('View alert:', element);
    this.dialog.open(ViewAlertDialogComponent, {
      data: {
        recipients: element.recipients,
        subject: element.subject,
        content: element.content,
        priority: element.priority,
        status: element.status
      }
    });
  }

  editAlert(element: any) {
    element.isEditMode = true;
  }

  submitEdit(element: AlertData) {
    element.isEditMode = false;
    if (element._id) {
      const updatedData = {
        status: element.status,
      };

      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No token found in local storage');
        return;
      }

      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      this.http.put('http://127.0.0.1:59270/alerts/${element._id}', updatedData, { headers }).subscribe(
        (response) => {
          console.log('Update successful:', response);
          this.fetchAlerts();
        },
        (error) => {
          console.error('Error updating alert:', error);
        }
      );
    }
  }

  cancelEdit(element: AlertData) {
    element.isEditMode = false;
  }

  openCreateAlertDialog() {
    const dialogRef = this.dialog.open(CreateAlertComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.fetchAlerts();
      }
    });
  }

  addNewAlertToDashboard(newAlert: AlertData) {
    this.dataSource.data = [...this.dataSource.data, newAlert];
    this.fetchAlerts();
  }
}