import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthenticationService } from '../../services/authentication.service';
import { SecurityScheme, AuthCredentials } from '../../models/security-scheme.model';

interface SecuritySchemeInfo {
  name: string;
  scheme: any;
}

@Component({
  selector: 'app-global-authentication',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './global-authentication.component.html',
  styleUrl: './global-authentication.component.scss'
})
export class GlobalAuthenticationComponent implements OnInit {
  @Input() securitySchemes: SecuritySchemeInfo[] = [];

  isExpanded = false;
  selectedAuthType: 'basic' | 'bearer' | 'apiKey' = 'basic';
  updateSuccess = false;

  // Global auth credentials
  globalApiKey: string = '';
  globalBearerToken: string = '';
  globalBasicAuth: { username: string, password: string } = { username: '', password: '' };

  // Local storage keys
  private readonly AUTH_TYPE_KEY = 'novadocs_auth_type';
  private readonly API_KEY_AUTH_KEY = 'novadocs_api_key';
  private readonly BEARER_AUTH_KEY = 'novadocs_bearer_token';
  private readonly BASIC_AUTH_USERNAME_KEY = 'novadocs_basic_auth_username';
  private readonly BASIC_AUTH_PASSWORD_KEY = 'novadocs_basic_auth_password';

  constructor(private authService: AuthenticationService) {}

  ngOnInit(): void {
    // Load saved authentication from local storage
    this.loadAuthFromLocalStorage();

    // Set default auth type based on available schemes if not loaded from storage
    if (!this.selectedAuthType) {
      this.initializeDefaultAuthType();
    }

    // Apply the loaded authentication
    this.applyAuthentication();
  }

  /**
   * Initialize the default auth type based on available schemes
   */
  initializeDefaultAuthType(): void {
    if (this.securitySchemes.length > 0) {
      const hasBasic = this.securitySchemes.some(scheme => this.isBasicAuth(scheme.scheme));
      const hasBearer = this.securitySchemes.some(scheme => this.isBearerAuth(scheme.scheme));
      const hasApiKey = this.securitySchemes.some(scheme => this.isApiKeyAuth(scheme.scheme));

      if (hasBasic) {
        this.selectedAuthType = 'basic';
      } else if (hasBearer) {
        this.selectedAuthType = 'bearer';
      } else if (hasApiKey) {
        this.selectedAuthType = 'apiKey';
      }
    }
  }

  /**
   * Select an authentication type
   */
  selectAuthType(type: 'basic' | 'bearer' | 'apiKey'): void {
    this.selectedAuthType = type;
  }

  /**
   * Load authentication from local storage
   */
  loadAuthFromLocalStorage(): void {
    // Load auth type
    const savedAuthType = localStorage.getItem(this.AUTH_TYPE_KEY) as 'basic' | 'bearer' | 'apiKey' | null;
    if (savedAuthType && ['basic', 'bearer', 'apiKey'].includes(savedAuthType)) {
      this.selectedAuthType = savedAuthType;
    }

    // Load API key
    const savedApiKey = localStorage.getItem(this.API_KEY_AUTH_KEY);
    if (savedApiKey) {
      this.globalApiKey = savedApiKey;
    }

    // Load bearer token
    const savedBearerToken = localStorage.getItem(this.BEARER_AUTH_KEY);
    if (savedBearerToken) {
      this.globalBearerToken = savedBearerToken;
    }

    // Load basic auth credentials
    const savedUsername = localStorage.getItem(this.BASIC_AUTH_USERNAME_KEY);
    const savedPassword = localStorage.getItem(this.BASIC_AUTH_PASSWORD_KEY);
    if (savedUsername) {
      this.globalBasicAuth.username = savedUsername;
    }
    if (savedPassword) {
      this.globalBasicAuth.password = savedPassword;
    }
  }

  /**
   * Save authentication to local storage
   */
  saveAuthToLocalStorage(): void {
    // Save auth type
    localStorage.setItem(this.AUTH_TYPE_KEY, this.selectedAuthType);

    // Save credentials based on auth type
    switch (this.selectedAuthType) {
      case 'apiKey':
        localStorage.setItem(this.API_KEY_AUTH_KEY, this.globalApiKey);
        break;
      case 'bearer':
        localStorage.setItem(this.BEARER_AUTH_KEY, this.globalBearerToken);
        break;
      case 'basic':
        localStorage.setItem(this.BASIC_AUTH_USERNAME_KEY, this.globalBasicAuth.username);
        localStorage.setItem(this.BASIC_AUTH_PASSWORD_KEY, this.globalBasicAuth.password);
        break;
    }
  }

  /**
   * Update authentication and save to local storage
   */
  updateAuthentication(): void {
    // Save to local storage
    this.saveAuthToLocalStorage();

    // Apply authentication
    this.applyAuthentication();

    // Show success message
    this.updateSuccess = true;
    setTimeout(() => {
      this.updateSuccess = false;
    }, 3000);
  }

  /**
   * Apply the current authentication to all matching schemes
   */
  applyAuthentication(): void {
    switch (this.selectedAuthType) {
      case 'apiKey':
        this.onGlobalApiKeyChange();
        break;
      case 'bearer':
        this.onGlobalBearerTokenChange();
        break;
      case 'basic':
        this.onGlobalBasicAuthChange();
        break;
    }
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  getSchemeDisplayName(name: string, scheme: any): string {
    if (scheme.type === 'http' && scheme.scheme === 'basic') {
      return 'Basic Authentication';
    } else if (scheme.type === 'http' && scheme.scheme === 'bearer') {
      return 'Bearer Authentication';
    } else if (scheme.type === 'apiKey') {
      return `API Key (${name})`;
    } else if (scheme.type === 'oauth2') {
      return 'OAuth 2.0';
    } else if (scheme.type === 'openIdConnect') {
      return 'OpenID Connect';
    }
    return name;
  }

  getSchemeType(scheme: any): string {
    if (scheme.type === 'http' && scheme.scheme === 'basic') {
      return 'BASIC';
    } else if (scheme.type === 'http' && scheme.scheme === 'bearer') {
      return 'BEARER';
    } else if (scheme.type === 'apiKey') {
      return 'API KEY';
    } else if (scheme.type === 'oauth2') {
      return 'OAUTH2';
    } else if (scheme.type === 'openIdConnect') {
      return 'OPENID';
    }
    return scheme.type?.toUpperCase() || 'UNKNOWN';
  }

  isApiKeyAuth(scheme: any): boolean {
    return scheme.type === 'apiKey';
  }

  isBearerAuth(scheme: any): boolean {
    return scheme.type === 'http' && scheme.scheme === 'bearer';
  }

  isBasicAuth(scheme: any): boolean {
    return scheme.type === 'http' && scheme.scheme === 'basic';
  }

  isOpenIdConnectAuth(scheme: any): boolean {
    return scheme.type === 'openIdConnect';
  }

  getOpenIdConnectUrl(scheme: any): string {
    return scheme.openIdConnectUrl || 'Not specified';
  }

  onGlobalApiKeyChange(): void {
    // Apply this API key to all API key schemes
    this.securitySchemes.forEach(scheme => {
      if (this.isApiKeyAuth(scheme.scheme)) {
        this.authService.setAuthCredential(scheme.name, {
          type: 'apiKey',
          apiKey: this.globalApiKey,
          apiKeyName: scheme.scheme.name,
          apiKeyIn: scheme.scheme.in
        });
      }
    });
  }

  onGlobalBearerTokenChange(): void {
    // Apply this bearer token to all bearer schemes
    this.securitySchemes.forEach(scheme => {
      if (this.isBearerAuth(scheme.scheme)) {
        this.authService.setAuthCredential(scheme.name, {
          type: 'http',
          scheme: 'bearer',
          token: this.globalBearerToken
        });
      }
    });
  }

  onGlobalBasicAuthChange(): void {
    // Apply these credentials to all basic auth schemes
    this.securitySchemes.forEach(scheme => {
      if (this.isBasicAuth(scheme.scheme)) {
        this.authService.setAuthCredential(scheme.name, {
          type: 'http',
          scheme: 'basic',
          username: this.globalBasicAuth.username,
          password: this.globalBasicAuth.password
        });
      }
    });
  }
}
