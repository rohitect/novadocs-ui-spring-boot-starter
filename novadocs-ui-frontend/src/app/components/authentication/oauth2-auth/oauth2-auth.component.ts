import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OAuth2SecurityScheme } from '../../../models/security-scheme.model';
import { AuthenticationService } from '../../../services/authentication.service';

@Component({
  selector: 'app-oauth2-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './oauth2-auth.component.html',
  styleUrls: ['./oauth2-auth.component.scss']
})
export class OAuth2AuthComponent implements OnInit {
  // Make Object available to the template
  protected readonly Object = Object;
  @Input() securitySchemeName: string = '';
  @Input() securityScheme: any;
  @Input() scopes: string[] = [];

  availableFlows: string[] = [];
  selectedFlow: string = '';
  accessToken: string = '';
  clientId: string = '';
  clientSecret: string = '';
  username: string = '';
  password: string = '';

  authorizationUrl: string = '';
  tokenUrl: string = '';
  availableScopes: Record<string, string> = {};
  selectedScopes: string[] = [];

  constructor(private authService: AuthenticationService) {}

  ngOnInit(): void {
    this.initializeFlows();
  }

  /**
   * Initialize available OAuth2 flows
   */
  private initializeFlows(): void {
    this.availableFlows = [];

    if (this.securityScheme.flows.implicit) {
      this.availableFlows.push('implicit');
    }

    if (this.securityScheme.flows.password) {
      this.availableFlows.push('password');
    }

    if (this.securityScheme.flows.clientCredentials) {
      this.availableFlows.push('clientCredentials');
    }

    if (this.securityScheme.flows.authorizationCode) {
      this.availableFlows.push('authorizationCode');
    }

    if (this.availableFlows.length > 0) {
      this.selectFlow(this.availableFlows[0]);
    }
  }

  /**
   * Select an OAuth2 flow
   */
  selectFlow(flow: string): void {
    this.selectedFlow = flow;

    switch (flow) {
      case 'implicit':
        const implicitFlow = this.securityScheme.flows.implicit!;
        this.authorizationUrl = implicitFlow.authorizationUrl;
        this.tokenUrl = '';
        this.availableScopes = implicitFlow.scopes;
        break;

      case 'password':
        const passwordFlow = this.securityScheme.flows.password!;
        this.authorizationUrl = '';
        this.tokenUrl = passwordFlow.tokenUrl;
        this.availableScopes = passwordFlow.scopes;
        break;

      case 'clientCredentials':
        const clientCredentialsFlow = this.securityScheme.flows.clientCredentials!;
        this.authorizationUrl = '';
        this.tokenUrl = clientCredentialsFlow.tokenUrl;
        this.availableScopes = clientCredentialsFlow.scopes;
        break;

      case 'authorizationCode':
        const authorizationCodeFlow = this.securityScheme.flows.authorizationCode!;
        this.authorizationUrl = authorizationCodeFlow.authorizationUrl;
        this.tokenUrl = authorizationCodeFlow.tokenUrl;
        this.availableScopes = authorizationCodeFlow.scopes;
        break;
    }

    // Initialize selected scopes based on required scopes
    this.selectedScopes = this.scopes.filter(scope =>
      Object.keys(this.availableScopes).includes(scope)
    );
  }

  /**
   * Toggle a scope selection
   */
  toggleScope(scope: string): void {
    const index = this.selectedScopes.indexOf(scope);
    if (index === -1) {
      this.selectedScopes.push(scope);
    } else {
      this.selectedScopes.splice(index, 1);
    }
  }

  /**
   * Check if a scope is selected
   */
  isScopeSelected(scope: string): boolean {
    return this.selectedScopes.includes(scope);
  }

  /**
   * Check if a scope is required
   */
  isScopeRequired(scope: string): boolean {
    return this.scopes.includes(scope);
  }

  /**
   * Update the access token
   */
  onAccessTokenChange(): void {
    this.authService.setAuthCredential(this.securitySchemeName, {
      type: 'oauth2',
      oauthToken: this.accessToken,
      oauthTokenType: 'Bearer',
      scopes: this.selectedScopes
    });
  }

  /**
   * Authorize using the OAuth2 flow
   */
  authorize(): void {
    switch (this.selectedFlow) {
      case 'implicit':
        this.authorizeImplicit();
        break;

      case 'password':
        this.authorizePassword();
        break;

      case 'clientCredentials':
        this.authorizeClientCredentials();
        break;

      case 'authorizationCode':
        this.authorizeAuthorizationCode();
        break;
    }
  }

  /**
   * Authorize using the implicit flow
   */
  private authorizeImplicit(): void {
    if (!this.authorizationUrl || !this.clientId) {
      return;
    }

    const scopes = this.selectedScopes.join(' ');
    const redirectUri = window.location.origin + window.location.pathname;

    const url = new URL(this.authorizationUrl);
    url.searchParams.append('client_id', this.clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('response_type', 'token');
    url.searchParams.append('scope', scopes);

    // Open the authorization URL in a new window
    window.open(url.toString(), '_blank', 'width=800,height=600');
  }

  /**
   * Authorize using the password flow
   */
  private authorizePassword(): void {
    // In a real implementation, this would make a token request to the token URL
    // For now, we'll just show a message
    console.log('Password flow authorization not implemented in the UI');
    alert('Password flow requires server-side implementation. Please enter your access token manually.');
  }

  /**
   * Authorize using the client credentials flow
   */
  private authorizeClientCredentials(): void {
    // In a real implementation, this would make a token request to the token URL
    // For now, we'll just show a message
    console.log('Client credentials flow authorization not implemented in the UI');
    alert('Client credentials flow requires server-side implementation. Please enter your access token manually.');
  }

  /**
   * Authorize using the authorization code flow
   */
  private authorizeAuthorizationCode(): void {
    if (!this.authorizationUrl || !this.clientId) {
      return;
    }

    const scopes = this.selectedScopes.join(' ');
    const redirectUri = window.location.origin + window.location.pathname;

    const url = new URL(this.authorizationUrl);
    url.searchParams.append('client_id', this.clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', scopes);

    // Open the authorization URL in a new window
    window.open(url.toString(), '_blank', 'width=800,height=600');
  }
}
