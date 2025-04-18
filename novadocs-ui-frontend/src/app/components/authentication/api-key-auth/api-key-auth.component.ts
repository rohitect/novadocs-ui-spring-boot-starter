import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiKeySecurityScheme } from '../../../models/security-scheme.model';
import { AuthenticationService } from '../../../services/authentication.service';

@Component({
  selector: 'app-api-key-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './api-key-auth.component.html',
  styleUrls: ['./api-key-auth.component.scss']
})
export class ApiKeyAuthComponent {
  @Input() securitySchemeName: string = '';
  @Input() securityScheme: any;

  apiKey: string = '';

  constructor(private authService: AuthenticationService) {}

  onApiKeyChange(): void {
    this.authService.setAuthCredential(this.securitySchemeName, {
      type: 'apiKey',
      apiKey: this.apiKey,
      apiKeyName: this.securityScheme.name,
      apiKeyIn: this.securityScheme.in
    });
  }
}
