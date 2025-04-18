import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpSecurityScheme } from '../../../models/security-scheme.model';
import { AuthenticationService } from '../../../services/authentication.service';

@Component({
  selector: 'app-basic-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './basic-auth.component.html',
  styleUrls: ['./basic-auth.component.scss']
})
export class BasicAuthComponent {
  @Input() securitySchemeName: string = '';
  @Input() securityScheme: any;

  username: string = '';
  password: string = '';

  constructor(private authService: AuthenticationService) {}

  onCredentialsChange(): void {
    this.authService.setAuthCredential(this.securitySchemeName, {
      type: 'http',
      scheme: 'basic',
      username: this.username,
      password: this.password
    });
  }
}
