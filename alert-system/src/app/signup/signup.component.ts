import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  username: string = '';
  email: string = '';
  password: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  Login() {
    this.router.navigate(['/login']);
  }

  onSubmit() {
    const signupData = {
      username: this.username,
      email: this.email,
      password: this.password
    };

    this.http.post('http://127.0.0.1:59243/signup', signupData)
      .subscribe({
        next: (response: any) => {
          
          alert('Signup successful');
        
          this.router.navigate(['/login']);
  
        },

        error: (err) => {
          alert('Error signing up. Try again.');
        }
      });
  }
}
