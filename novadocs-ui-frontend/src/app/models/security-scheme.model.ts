/**
 * Models for OpenAPI security schemes
 */

export type SecuritySchemeType = 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';

export interface SecurityScheme {
  type: SecuritySchemeType;
  description?: string;
}

export interface ApiKeySecurityScheme extends SecurityScheme {
  type: 'apiKey';
  name: string;
  in: 'query' | 'header' | 'cookie';
}

export interface HttpSecurityScheme extends SecurityScheme {
  type: 'http';
  scheme: string; // 'basic', 'bearer', etc.
  bearerFormat?: string;
}

export interface OAuth2SecurityScheme extends SecurityScheme {
  type: 'oauth2';
  flows: {
    implicit?: OAuth2ImplicitFlow;
    password?: OAuth2PasswordFlow;
    clientCredentials?: OAuth2ClientCredentialsFlow;
    authorizationCode?: OAuth2AuthorizationCodeFlow;
  };
}

export interface OpenIdConnectSecurityScheme extends SecurityScheme {
  type: 'openIdConnect';
  openIdConnectUrl: string;
}

export interface OAuth2Flow {
  scopes: Record<string, string>;
}

export interface OAuth2ImplicitFlow extends OAuth2Flow {
  authorizationUrl: string;
  refreshUrl?: string;
}

export interface OAuth2PasswordFlow extends OAuth2Flow {
  tokenUrl: string;
  refreshUrl?: string;
}

export interface OAuth2ClientCredentialsFlow extends OAuth2Flow {
  tokenUrl: string;
  refreshUrl?: string;
}

export interface OAuth2AuthorizationCodeFlow extends OAuth2Flow {
  authorizationUrl: string;
  tokenUrl: string;
  refreshUrl?: string;
}

export interface AuthCredentials {
  type: SecuritySchemeType;
  scheme?: string;
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiKeyName?: string;
  apiKeyIn?: 'query' | 'header' | 'cookie';
  oauthToken?: string;
  oauthTokenType?: string;
  scopes?: string[];
}
