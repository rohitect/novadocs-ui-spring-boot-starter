import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SecurityScheme,
  ApiKeySecurityScheme,
  HttpSecurityScheme,
  OAuth2SecurityScheme,
  OpenIdConnectSecurityScheme,
  AuthCredentials
} from '../../models/security-scheme.model';
import { AuthenticationService } from '../../services/authentication.service';
import { BasicAuthComponent } from './basic-auth/basic-auth.component';
import { ApiKeyAuthComponent } from './api-key-auth/api-key-auth.component';
import { OAuth2AuthComponent } from './oauth2-auth/oauth2-auth.component';

@Component({
  selector: 'app-authentication',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BasicAuthComponent,
    ApiKeyAuthComponent,
    OAuth2AuthComponent
  ],
  templateUrl: './authentication.component.html',
  styleUrls: ['./authentication.component.scss']
})
export class AuthenticationComponent implements OnChanges {
  @Input() securitySchemes: Record<string, SecurityScheme> = {};
  @Input() security: any[] = [];

  activeSchemes: { name: string; scheme: any }[] = [];

  constructor(public authService: AuthenticationService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['securitySchemes'] || changes['security']) {
      this.processSecuritySchemes();
    }
  }

  /**
   * Process security schemes and determine which ones are active
   */
  private processSecuritySchemes(): void {
    this.activeSchemes = [];

    // If no security is defined, all security schemes are optional
    if (!this.security || this.security.length === 0) {
      Object.entries(this.securitySchemes).forEach(([name, scheme]) => {
        this.activeSchemes.push({ name, scheme });
      });
      return;
    }

    // Process security requirements
    this.security.forEach(requirement => {
      Object.keys(requirement).forEach(schemeName => {
        const scheme = this.securitySchemes[schemeName];
        if (scheme) {
          this.activeSchemes.push({ name: schemeName, scheme });
        }
      });
    });
  }

  /**
   * Get the display name for a security scheme
   */
  getSchemeDisplayName(name: string, scheme: SecurityScheme): string {
    if (scheme.description) {
      return scheme.description;
    }

    switch (scheme.type) {
      case 'http':
        const httpScheme = scheme as HttpSecurityScheme;
        return `${httpScheme.scheme.charAt(0).toUpperCase() + httpScheme.scheme.slice(1)} Authentication`;
      case 'apiKey':
        const apiKeyScheme = scheme as ApiKeySecurityScheme;
        return `API Key (${apiKeyScheme.in}): ${apiKeyScheme.name}`;
      case 'oauth2':
        return 'OAuth 2.0';
      case 'openIdConnect':
        return 'OpenID Connect';
      default:
        return name;
    }
  }

  /**
   * Get the security scheme type
   */
  getSchemeType(scheme: SecurityScheme): string {
    if (scheme.type === 'http') {
      const httpScheme = scheme as HttpSecurityScheme;
      return httpScheme.scheme.toLowerCase();
    }
    return scheme.type;
  }

  /**
   * Check if a security scheme is HTTP Basic
   */
  isBasicAuth(scheme: any): boolean {
    return scheme.type === 'http' && scheme.scheme && scheme.scheme.toLowerCase() === 'basic';
  }

  /**
   * Check if a security scheme is HTTP Bearer
   */
  isBearerAuth(scheme: any): boolean {
    return scheme.type === 'http' && scheme.scheme && scheme.scheme.toLowerCase() === 'bearer';
  }

  /**
   * Check if a security scheme is API Key
   */
  isApiKeyAuth(scheme: any): boolean {
    return scheme.type === 'apiKey';
  }

  /**
   * Check if a security scheme is OAuth 2.0
   */
  isOAuth2Auth(scheme: any): boolean {
    return scheme.type === 'oauth2';
  }

  /**
   * Check if a security scheme is OpenID Connect
   */
  isOpenIdConnectAuth(scheme: any): boolean {
    return scheme.type === 'openIdConnect';
  }

  /**
   * Get OpenID Connect URL
   */
  getOpenIdConnectUrl(scheme: any): string {
    return scheme && scheme.openIdConnectUrl ? scheme.openIdConnectUrl : '';
  }

  /**
   * Get scopes for a security scheme
   */
  getScopes(schemeName: string): string[] {
    const requirement = this.security.find(s => s[schemeName]);
    return requirement ? requirement[schemeName] : [];
  }
}
