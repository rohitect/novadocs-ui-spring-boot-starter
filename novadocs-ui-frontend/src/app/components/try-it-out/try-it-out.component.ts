import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParameterInputComponent } from '../parameter-input/parameter-input.component';
import { RequestBodyComponent } from '../request-body/request-body.component';
import { ResponseDisplayComponent } from '../response-display/response-display.component';
import { AuthenticationComponent } from '../authentication/authentication.component';
import { AuthenticationService } from '../../services/authentication.service';
import { SecurityScheme } from '../../models/security-scheme.model';

@Component({
  selector: 'app-try-it-out',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ParameterInputComponent,
    RequestBodyComponent,
    ResponseDisplayComponent,
    AuthenticationComponent
  ],
  templateUrl: './try-it-out.component.html',
  styleUrls: ['./try-it-out.component.scss']
})
export class TryItOutComponent implements OnChanges {
  @Input() path: string = '';
  @Input() method: string = '';
  @Input() operation: any = null;
  @Input() apiDocs: any = null;

  showTryItOut = false;
  parameters: any[] = [];
  paramValues: { [key: string]: any } = {};
  requestBody: any = {
    contentType: '',
    content: '',
    isValid: true
  };

  isLoading = false;
  response: any = null;
  error: string | null = null;
  showValidation = false;

  curlCommand: string = '';
  curlCopied = false;

  get hasRequestBody(): boolean {
    return !!this.operation?.requestBody;
  }

  securitySchemes: Record<string, SecurityScheme> = {};
  security: any[] = [];

  constructor(private authService: AuthenticationService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['operation'] || changes['apiDocs']) && this.operation) {
      this.initializeParameters();
      this.initializeSecurity();
    }
  }

  initializeParameters(): void {
    this.parameters = [];
    this.paramValues = {};

    // Path parameters
    if (this.operation.parameters) {
      this.parameters = [...this.operation.parameters];
    }

    // Sort parameters by required first, then by name
    this.parameters.sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  toggleTryItOut(event?: Event): void {
    // Prevent default action if event is provided
    // if (event) {
    //   event.preventDefault();
    //   event.stopPropagation();
    // }

    // this.showTryItOut = !this.showTryItOut;
    // if (!this.showTryItOut) {
    //   this.resetState();
    // }

    // // Log for debugging
    // console.log('Try it out toggled:', this.showTryItOut);
  }

  resetState(): void {
    this.paramValues = {};
    this.requestBody = {
      contentType: '',
      content: '',
      isValid: true
    };
    this.response = null;
    this.error = null;
    this.showValidation = false;
    this.curlCommand = '';
    this.curlCopied = false;
  }

  /**
   * Initialize security schemes and requirements
   */
  initializeSecurity(): void {
    // Get security schemes from OpenAPI spec
    if (this.apiDocs?.components?.securitySchemes) {
      this.securitySchemes = this.apiDocs.components.securitySchemes;
    } else {
      this.securitySchemes = {};
    }

    // Get security requirements for this operation
    if (this.operation.security) {
      this.security = this.operation.security;
    } else if (this.apiDocs.security) {
      // If operation doesn't have security, use global security
      this.security = this.apiDocs.security;
    } else {
      this.security = [];
    }
  }

  onParameterChange(event: any): void {
    this.paramValues[event.name] = {
      value: event.value,
      in: event.in
    };
  }

  onBodyChange(event: any): void {
    this.requestBody = event;
  }

  isRequestValid(): boolean {
    // Check required parameters
    const missingRequired = this.parameters
      .filter(param => param.required)
      .some(param => !this.paramValues[param.name] || this.paramValues[param.name].value === undefined || this.paramValues[param.name].value === '');

    if (missingRequired) {
      return false;
    }

    // Check request body if required
    if (this.hasRequestBody && this.operation.requestBody.required) {
      if (!this.requestBody.content || !this.requestBody.isValid) {
        return false;
      }
    }

    return true;
  }

  async executeRequest(event?: Event): Promise<void> {
    // Prevent default action if event is provided
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.showValidation = true;

    if (!this.isRequestValid()) {
      return;
    }

    this.isLoading = true;
    this.response = null;
    this.error = null;

    // Check if we're using sample data
    const isUsingSampleData = this.apiDocs?.servers?.[0]?.url === '/api';

    try {
      // Build the URL with path parameters
      let url = this.path;
      const queryParams: string[] = [];

      // Process parameters
      Object.keys(this.paramValues).forEach(paramName => {
        const param = this.paramValues[paramName];

        if (param.value === undefined || param.value === '') {
          return;
        }

        switch (param.in) {
          case 'path':
            url = url.replace(`{${paramName}}`, encodeURIComponent(param.value));
            break;
          case 'query':
            queryParams.push(`${paramName}=${encodeURIComponent(param.value)}`);
            break;
        }
      });

      // Add query parameters to URL
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }

      // Ensure URL is absolute
      if (!url.startsWith('http')) {
        // Get the server URL from the OpenAPI spec
        const serverUrl = this.apiDocs.servers && this.apiDocs.servers.length > 0
          ? this.apiDocs.servers[0].url
          : '';

        if (serverUrl) {
          // Remove trailing slash from server URL and leading slash from path
          const baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
          const pathUrl = url.startsWith('/') ? url : `/${url}`;
          url = `${baseUrl}${pathUrl}`;
        } else {
          // If no server URL is defined, use the current origin
          url = `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
        }
      }

      // Prepare headers
      const headers: HeadersInit = {};

      // Add header parameters
      Object.keys(this.paramValues).forEach(paramName => {
        const param = this.paramValues[paramName];
        if (param.in === 'header' && param.value) {
          headers[paramName] = param.value;
        }
      });

      // Apply authentication
      if (this.security && this.security.length > 0) {
        // Try each security requirement (OR relationship)
        for (const requirement of this.security) {
          let allRequirementsMet = true;
          let updatedUrl = url;
          const updatedHeaders = { ...headers };

          // Check each scheme in the requirement (AND relationship)
          for (const [schemeName, scopes] of Object.entries(requirement)) {
            const scheme = this.securitySchemes[schemeName];
            if (!scheme) {
              allRequirementsMet = false;
              break;
            }

            // Apply authentication for this scheme
            const result = this.authService.applyAuthentication(updatedHeaders, updatedUrl, scheme, schemeName);
            Object.assign(updatedHeaders, result.headers);
            updatedUrl = result.url;
          }

          if (allRequirementsMet) {
            // We found a security requirement that works
            url = updatedUrl;
            Object.keys(updatedHeaders).forEach(key => {
              headers[key] = updatedHeaders[key];
            });
            break;
          }
        }
      }

      // Add content type header for request body
      if (this.hasRequestBody && this.requestBody.content) {
        headers['Content-Type'] = this.requestBody.contentType;
      }

      // Prepare request options
      const options: RequestInit = {
        method: this.method,
        headers,
        credentials: 'same-origin'
      };

      // Add request body if needed
      if (this.hasRequestBody && this.requestBody.content) {
        if (this.requestBody.contentType.includes('json')) {
          options.body = this.requestBody.content;
        } else {
          options.body = this.requestBody.content;
        }
      }

      // Generate cURL command
      this.generateCurlCommandWithMasking(url, options);

      // If using sample data, simulate a response instead of making an actual request
      let response: Response;
      let responseBody: any;

      if (isUsingSampleData) {
        // Simulate a response based on the path and method
        const simulatedResponse = this.simulateResponse(this.path, this.method);

        // Create a mock Response object
        response = new Response(
          JSON.stringify(simulatedResponse.body),
          {
            status: simulatedResponse.status,
            statusText: simulatedResponse.statusText,
            headers: new Headers({
              'Content-Type': 'application/json'
            })
          }
        );

        responseBody = simulatedResponse.body;
      } else {
        // Execute the actual request
        response = await fetch(url, options);

        // Process response
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('json')) {
          responseBody = await response.json();
        } else if (contentType.includes('text')) {
          responseBody = await response.text();
        } else {
          // For binary responses, just indicate the size
          const blob = await response.blob();
          responseBody = `Binary data: ${blob.size} bytes`;
        }
      }

      this.response = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: responseBody
      };
    } catch (err) {
      console.error('Error executing request:', err);
      this.error = `Error executing request: ${(err as Error).message}`;
    } finally {
      this.isLoading = false;
    }
  }

  generateCurlCommand(url: string, options: RequestInit): void {
    let curl = `curl -X ${this.method} "${url}"`;

    // Add headers
    if (options.headers) {
      Object.entries(options.headers as Record<string, string>).forEach(([key, value]) => {
        curl += ` \\\n  -H "${key}: ${value}"`;
      });
    }

    // Add body
    if (options.body) {
      curl += ` \\\n  -d '${options.body}'`;
    }

    this.curlCommand = curl;
  }

  copyCurl(event?: Event): void {
    // Prevent default action if event is provided
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (navigator.clipboard && this.curlCommand) {
      navigator.clipboard.writeText(this.curlCommand)
        .then(() => {
          this.curlCopied = true;
          setTimeout(() => {
            this.curlCopied = false;
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy cURL command:', err);
        });
    }
  }

  // This method replaces the original generateCurlCommand
  private generateCurlCommandWithMasking(url: string, options: RequestInit): void {
    let curl = `curl -X ${this.method} "${url}"`;

    // Add headers
    if (options.headers) {
      Object.entries(options.headers as Record<string, string>).forEach(([key, value]) => {
        // Mask sensitive authentication information in the displayed cURL command
        let displayValue = value;
        if (key.toLowerCase() === 'authorization') {
          const parts = value.split(' ');
          if (parts.length > 1) {
            // For Bearer, Basic, etc. tokens, mask the actual token
            displayValue = `${parts[0]} ********`;
          } else {
            displayValue = '********';
          }
        } else if (key.toLowerCase() === 'cookie' && value.includes('=')) {
          // Mask cookie values
          displayValue = value.replace(/=([^;]+)/g, '=********');
        }

        curl += ` \
  -H "${key}: ${displayValue}"`;
      });
    }

    // Add body
    if (options.body) {
      curl += ` \
  -d '${options.body}'`;
    }

    this.curlCommand = curl;
  }

  /**
   * Simulate a response for sample API data
   */
  private simulateResponse(path: string, method: string): { status: number; statusText: string; body: any } {
    // Default success response
    const successResponse = {
      status: 200,
      statusText: 'OK',
      body: { message: 'Operation successful', timestamp: new Date().toISOString() }
    };

    // Default created response
    const createdResponse = {
      status: 201,
      statusText: 'Created',
      body: { id: crypto.randomUUID(), created: true, timestamp: new Date().toISOString() }
    };

    // Check the path and method to determine the response
    if (path.includes('/users')) {
      if (method === 'GET') {
        if (path.includes('/{userId}')) {
          // GET /users/{userId}
          return {
            status: 200,
            statusText: 'OK',
            body: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              email: 'john.doe@example.com',
              name: 'John Doe',
              age: 30,
              status: 'active',
              createdAt: '2023-01-15T08:30:00Z'
            }
          };
        } else {
          // GET /users
          return {
            status: 200,
            statusText: 'OK',
            body: [
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'john.doe@example.com',
                name: 'John Doe',
                status: 'active'
              },
              {
                id: '223e4567-e89b-12d3-a456-426614174000',
                email: 'jane.smith@example.com',
                name: 'Jane Smith',
                status: 'inactive'
              }
            ]
          };
        }
      } else if (method === 'POST') {
        // POST /users
        return createdResponse;
      }
    } else if (path.includes('/products')) {
      if (method === 'GET') {
        // GET /products
        return {
          status: 200,
          statusText: 'OK',
          body: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              name: 'Smartphone',
              description: 'Latest model smartphone with advanced features',
              price: 999.99,
              category: 'Electronics',
              inStock: true
            },
            {
              id: '223e4567-e89b-12d3-a456-426614174000',
              name: 'Laptop',
              description: 'High-performance laptop for professionals',
              price: 1499.99,
              category: 'Electronics',
              inStock: false
            }
          ]
        };
      }
    }

    // Default response for other paths/methods
    return successResponse;
  }
}
