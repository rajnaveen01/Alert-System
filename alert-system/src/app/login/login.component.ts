import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent {
  username: string = '';
  password: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  Createaccount() {
    this.router.navigate(['/signup']);
  }

  onSubmit() {
    const loginData = {
      username: this.username,
      password: this.password
    };

    this.http.post('http://127.0.0.1:59243/login', loginData)
      .subscribe({
        next: (response: any) => {
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('refresh_token', response.refresh_token);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          alert('Invalid credentials!');
        }
      });
  }
}

