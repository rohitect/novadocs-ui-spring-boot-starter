import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ParameterInputComponent } from '../parameter-input/parameter-input.component';
import { RequestBodyComponent } from '../request-body/request-body.component';
import { ResponseDisplayComponent } from '../response-display/response-display.component';
import { AuthenticationService } from '../../services/authentication.service';
import { SecurityScheme } from '../../models/security-scheme.model';
import { TryItOutState, Parameter, RequestBodyContent, ApiResponse } from '../../models/try-it-out.model';

@Component({
  selector: 'app-try-it-out',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ParameterInputComponent,
    RequestBodyComponent,
    ResponseDisplayComponent
  ],
  templateUrl: './try-it-out.component.html',
  styleUrls: ['./try-it-out.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TryItOutComponent implements OnChanges {
  @Input() path: string = '';
  @Input() method: string = '';
  @Input() operation: any = null;
  @Input() apiDocs: any = null;
  @Input() securitySchemes: Record<string, SecurityScheme> = {};
  @Input() security: any[] = [];
  @Input() autoExpand: boolean = false;

  @Output() onCancel = new EventEmitter<void>();

  // Direct state properties instead of using a BehaviorSubject
  isExpanded = false;
  isLoading = false;
  showValidation = false;
  parameters: Parameter[] = [];
  paramValues: Record<string, { value: string; in: string }> = {};
  requestBody: RequestBodyContent = {
    contentType: '',
    content: '',
    isValid: true
  };
  response: ApiResponse | null = null;
  error: string | null = null;
  curlCommand = '';
  curlCopied = false;

  constructor(
    private authService: AuthenticationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['operation'] || changes['apiDocs']) && this.operation) {
      this.initializeParameters();
      this.initializeSecurity();
      this.initializeRequestBody();
      this.updateState({ isExpanded: this.autoExpand });
    }

    // Handle autoExpand changes
    if (changes['autoExpand'] && !changes['autoExpand'].firstChange) {
      this.updateState({ isExpanded: this.autoExpand });
    }
  }

  /**
   * Initialize request body with sample data for POST, PUT, DELETE methods
   */
  private initializeRequestBody(): void {
    // Only generate sample for POST, PUT, DELETE methods
    const methodsWithBody = ['POST', 'PUT', 'DELETE', 'PATCH'];

    if (methodsWithBody.includes(this.method.toUpperCase()) && this.hasRequestBody) {
      // Check if the request body has application/json content type
      const requestBody = this.operation.requestBody;
      if (requestBody?.content?.['application/json']?.schema) {
        // Generate sample JSON from schema
        const schema = requestBody.content['application/json'].schema;
        const sample = this.generateSampleFromSchema(schema);

        // Set the request body content
        this.requestBody = {
          contentType: 'application/json',
          content: JSON.stringify(sample, null, 2),
          isValid: true
        };
      }
    }
  }

  /**
   * Update the component state
   */
  private updateState(partialState: Partial<TryItOutState>): void {
    // Apply each property directly
    Object.keys(partialState).forEach(key => {
      (this as any)[key] = (partialState as any)[key];
    });

    // Mark for check to ensure change detection
    this.cdr.markForCheck();
  }

  /**
   * Initialize parameters from the operation
   */
  private initializeParameters(): void {
    let parameters: Parameter[] = [];

    // Get parameters from the operation
    if (this.operation.parameters) {
      parameters = [...this.operation.parameters];
    }

    // Sort parameters by required first, then by name
    parameters.sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return a.name.localeCompare(b.name);
    });

    this.updateState({
      parameters,
      paramValues: {}
    });
  }

  /**
   * Initialize security schemes and requirements
   */
  private initializeSecurity(): void {
    // If securitySchemes and security are provided as inputs, use them
    // Otherwise, get them from the OpenAPI spec
    if (!this.securitySchemes || Object.keys(this.securitySchemes).length === 0) {
      // Get security schemes from OpenAPI spec
      if (this.apiDocs?.components?.securitySchemes) {
        this.securitySchemes = this.apiDocs.components.securitySchemes;
      } else {
        this.securitySchemes = {};
      }
    }

    if (!this.security || this.security.length === 0) {
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
  }

  /**
   * Toggle the Try-It-Out panel
   */
  toggleTryItOut(_event: Event): void {
    // Prevent default action
    // event.preventDefault();
    // event.stopPropagation();

    // Toggle the expanded state
    this.isExpanded = !this.isExpanded;

    // If closing, reset the state
    if (!this.isExpanded) {
      this.resetState();
    }

    // Force change detection
    this.cdr.detectChanges();

    console.log('Try it out toggled:', this.isExpanded);
  }

  /**
   * Reset the component state
   */
  private resetState(): void {
    this.isExpanded = false;
    this.isLoading = false;
    this.showValidation = false;
    this.paramValues = {};
    this.requestBody = {
      contentType: '',
      content: '',
      isValid: true
    };
    this.response = null;
    this.error = null;
    this.curlCommand = '';
    this.curlCopied = false;

    // Force change detection
    this.cdr.detectChanges();
  }

  /**
   * Reset the form without closing the panel
   */
  resetForm(): void {
    this.isLoading = false;
    this.showValidation = false;
    this.paramValues = {};
    this.requestBody = {
      contentType: '',
      content: '',
      isValid: true
    };
    this.response = null;
    this.error = null;
    this.curlCommand = '';
    this.curlCopied = false;

    // Force change detection
    this.cdr.detectChanges();
  }

  /**
   * Cancel the try-it-out and emit the onCancel event
   */
  cancel(): void {
    this.resetForm();
    this.onCancel.emit();
  }

  /**
   * Handle parameter value changes
   */
  onParameterChange(event: any): void {
    const paramValues = { ...this.paramValues };
    paramValues[event.name] = {
      value: event.value,
      in: event.in
    };

    this.paramValues = paramValues;
    this.cdr.markForCheck();
  }

  /**
   * Handle request body changes
   */
  onBodyChange(event: RequestBodyContent): void {
    this.requestBody = event;
    this.cdr.markForCheck();
  }

  /**
   * Check if the request is valid
   */
  isRequestValid(): boolean {
    // Check required parameters
    const missingRequired = this.parameters
      .filter(param => param.required)
      .some(param => {
        const paramValue = this.paramValues[param.name];
        return !paramValue || paramValue.value === undefined || paramValue.value === '';
      });

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

  /**
   * Check if the operation has a request body
   */
  get hasRequestBody(): boolean {
    return !!this.operation?.requestBody;
  }

  /**
   * Execute the API request
   */
  async executeRequest(event: Event): Promise<void> {
    // Prevent default action
    event.preventDefault();
    event.stopPropagation();

    this.showValidation = true;
    this.cdr.markForCheck();

    if (!this.isRequestValid()) {
      return;
    }

    this.isLoading = true;
    this.response = null;
    this.error = null;
    this.cdr.markForCheck();

    // Check if we're using sample data
    const isUsingSampleData = !this.apiDocs || !this.apiDocs.servers || this.apiDocs?.servers?.[0]?.url === '/api';

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
        let serverUrl = '';

        // Check if apiDocs and servers exist
        if (this.apiDocs && this.apiDocs.servers && this.apiDocs.servers.length > 0) {
          serverUrl = this.apiDocs.servers[0].url;
        }

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
          for (const [schemeName, _scopes] of Object.entries(requirement)) {
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
        options.body = this.requestBody.content;
      }

      // Generate cURL command
      this.curlCommand = this.generateCurlCommand(url, options);
      this.cdr.markForCheck();

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

      // Update state with response
      this.response = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: responseBody
      };
      this.isLoading = false;
      this.cdr.markForCheck();
    } catch (err) {
      console.error('Error executing request:', err);
      this.error = `Error executing request: ${(err as Error).message}`;
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Generate a cURL command for the request
   */
  private generateCurlCommand(url: string, options: RequestInit): string {
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

        curl += ` \\\n  -H "${key}: ${displayValue}"`;
      });
    }

    // Add body
    if (options.body) {
      curl += ` \\\n  -d '${options.body}'`;
    }

    return curl;
  }

  /**
   * Copy the cURL command to clipboard
   */
  copyCurl(event: Event): void {
    // Prevent default action
    event.preventDefault();
    event.stopPropagation();

    if (navigator.clipboard && this.curlCommand) {
      navigator.clipboard.writeText(this.curlCommand)
        .then(() => {
          this.curlCopied = true;
          this.cdr.markForCheck();
          setTimeout(() => {
            this.curlCopied = false;
            this.cdr.markForCheck();
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy cURL command:', err);
        });
    }
  }

  /**
   * Generate a sample object from a JSON schema
   */
  private generateSampleFromSchema(schema: any): any {
    if (!schema) return null;

    // Handle references
    if (schema.$ref) {
      // Extract the reference name and try to resolve it
      const refParts = schema.$ref.split('/');
      const refName = refParts.pop();

      // Try to resolve from components/schemas
      if (this.apiDocs?.components?.schemas?.[refName]) {
        const refSchema = this.apiDocs.components.schemas[refName];

        // Check if the schema has an example
        if (refSchema.example) {
          return refSchema.example;
        }

        // Otherwise, generate a sample from the schema
        return this.generateSampleFromSchema(refSchema);
      }

      // If we can't resolve, return a placeholder
      return { "reference": schema.$ref };
    }

    // Check if the schema has an example
    if (schema.example) {
      return schema.example;
    }

    // Handle different types
    switch (schema.type) {
      case 'object':
        const obj: any = {};
        if (schema.properties) {
          Object.keys(schema.properties).forEach(propName => {
            obj[propName] = this.generateSampleFromSchema(schema.properties[propName]);
          });
        }
        return obj;

      case 'array':
        if (schema.items) {
          return [this.generateSampleFromSchema(schema.items)];
        }
        return [];

      case 'string':
        if (schema.enum && schema.enum.length > 0) {
          return schema.enum[0];
        }
        if (schema.example) return schema.example;
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'date') return new Date().toISOString().split('T')[0];
        if (schema.format === 'email') return 'user@example.com';
        if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
        return 'string';

      case 'number':
      case 'integer':
        if (schema.enum && schema.enum.length > 0) {
          return schema.enum[0];
        }
        if (schema.example !== undefined) return schema.example;
        return 0;

      case 'boolean':
        if (schema.example !== undefined) return schema.example;
        return false;

      default:
        return null;
    }
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
