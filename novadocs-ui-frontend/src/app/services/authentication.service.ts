import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  SecurityScheme, 
  ApiKeySecurityScheme, 
  HttpSecurityScheme, 
  OAuth2SecurityScheme, 
  OpenIdConnectSecurityScheme,
  AuthCredentials
} from '../models/security-scheme.model';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private authCredentialsMap = new Map<string, AuthCredentials>();
  private authCredentialsSubject = new BehaviorSubject<Map<string, AuthCredentials>>(this.authCredentialsMap);
  
  constructor() {}

  /**
   * Get all authentication credentials
   */
  getAuthCredentials(): Observable<Map<string, AuthCredentials>> {
    return this.authCredentialsSubject.asObservable();
  }

  /**
   * Get authentication credentials for a specific security scheme
   */
  getAuthCredential(securitySchemeName: string): AuthCredentials | undefined {
    return this.authCredentialsMap.get(securitySchemeName);
  }

  /**
   * Set authentication credentials for a security scheme
   */
  setAuthCredential(securitySchemeName: string, credentials: AuthCredentials): void {
    this.authCredentialsMap.set(securitySchemeName, credentials);
    this.authCredentialsSubject.next(this.authCredentialsMap);
  }

  /**
   * Clear authentication credentials for a security scheme
   */
  clearAuthCredential(securitySchemeName: string): void {
    this.authCredentialsMap.delete(securitySchemeName);
    this.authCredentialsSubject.next(this.authCredentialsMap);
  }

  /**
   * Clear all authentication credentials
   */
  clearAllAuthCredentials(): void {
    this.authCredentialsMap.clear();
    this.authCredentialsSubject.next(this.authCredentialsMap);
  }

  /**
   * Apply authentication to request headers and URL
   */
  applyAuthentication(
    headers: Record<string, string>,
    url: string,
    securityScheme: SecurityScheme,
    securitySchemeName: string
  ): { headers: Record<string, string>; url: string } {
    const credentials = this.getAuthCredential(securitySchemeName);
    if (!credentials) {
      return { headers, url };
    }

    switch (securityScheme.type) {
      case 'http':
        return this.applyHttpAuth(headers, url, securityScheme as HttpSecurityScheme, credentials);
      case 'apiKey':
        return this.applyApiKeyAuth(headers, url, securityScheme as ApiKeySecurityScheme, credentials);
      case 'oauth2':
        return this.applyOAuth2Auth(headers, url, securityScheme as OAuth2SecurityScheme, credentials);
      case 'openIdConnect':
        return this.applyOpenIdConnectAuth(headers, url, securityScheme as OpenIdConnectSecurityScheme, credentials);
      default:
        return { headers, url };
    }
  }

  /**
   * Apply HTTP authentication (Basic, Bearer, etc.)
   */
  private applyHttpAuth(
    headers: Record<string, string>,
    url: string,
    securityScheme: HttpSecurityScheme,
    credentials: AuthCredentials
  ): { headers: Record<string, string>; url: string } {
    const scheme = securityScheme.scheme.toLowerCase();
    
    if (scheme === 'basic' && credentials.username && credentials.password) {
      const base64Credentials = btoa(`${credentials.username}:${credentials.password}`);
      headers['Authorization'] = `Basic ${base64Credentials}`;
    } else if (scheme === 'bearer' && credentials.token) {
      headers['Authorization'] = `Bearer ${credentials.token}`;
    } else if (credentials.token) {
      // For other HTTP schemes
      headers['Authorization'] = `${scheme.charAt(0).toUpperCase() + scheme.slice(1)} ${credentials.token}`;
    }
    
    return { headers, url };
  }

  /**
   * Apply API key authentication
   */
  private applyApiKeyAuth(
    headers: Record<string, string>,
    url: string,
    securityScheme: ApiKeySecurityScheme,
    credentials: AuthCredentials
  ): { headers: Record<string, string>; url: string } {
    if (!credentials.apiKey) {
      return { headers, url };
    }

    const apiKeyName = securityScheme.name;
    const apiKeyIn = securityScheme.in;

    if (apiKeyIn === 'header') {
      headers[apiKeyName] = credentials.apiKey;
    } else if (apiKeyIn === 'query') {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}${apiKeyName}=${encodeURIComponent(credentials.apiKey)}`;
    } else if (apiKeyIn === 'cookie') {
      // For cookie auth, we need to set the cookie in the browser
      // This is typically handled by the browser after receiving a Set-Cookie header
      // For the purpose of the request, we'll add it to the headers as Cookie
      headers['Cookie'] = `${apiKeyName}=${credentials.apiKey}`;
    }

    return { headers, url };
  }

  /**
   * Apply OAuth 2.0 authentication
   */
  private applyOAuth2Auth(
    headers: Record<string, string>,
    url: string,
    securityScheme: OAuth2SecurityScheme,
    credentials: AuthCredentials
  ): { headers: Record<string, string>; url: string } {
    if (credentials.oauthToken) {
      const tokenType = credentials.oauthTokenType || 'Bearer';
      headers['Authorization'] = `${tokenType} ${credentials.oauthToken}`;
    }
    
    return { headers, url };
  }

  /**
   * Apply OpenID Connect authentication
   */
  private applyOpenIdConnectAuth(
    headers: Record<string, string>,
    url: string,
    securityScheme: OpenIdConnectSecurityScheme,
    credentials: AuthCredentials
  ): { headers: Record<string, string>; url: string } {
    // OpenID Connect uses OAuth 2.0 under the hood
    if (credentials.oauthToken) {
      const tokenType = credentials.oauthTokenType || 'Bearer';
      headers['Authorization'] = `${tokenType} ${credentials.oauthToken}`;
    }
    
    return { headers, url };
  }
}
