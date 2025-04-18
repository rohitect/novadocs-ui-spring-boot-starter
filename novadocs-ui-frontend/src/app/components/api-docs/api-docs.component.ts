import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiDocsService } from '../../services/api-docs.service';
import { ConfigService } from '../../services/config.service';
import { ThemeService } from '../../services/theme.service';
import { TryItOutComponent } from '../try-it-out-new/try-it-out.component';
import { GlobalAuthenticationComponent } from '../global-authentication/global-authentication.component';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
  selector: 'app-api-docs',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TryItOutComponent,
    GlobalAuthenticationComponent,
    MarkdownPipe
  ],
  templateUrl: './api-docs.component.html',
  styleUrls: ['./api-docs.component.scss']
})
export class ApiDocsComponent implements OnInit {
  apiDocs: any = null;
  loading = true;
  error: string | null = null;
  title = 'API Documentation';

  // Store paths and methods
  paths: Array<{
    path: string,
    pathItem: any,
    methods: Array<{
      type: string,
      operation: any,
      isExpanded: boolean,
      autoExpand: boolean,
      showDropdown?: boolean
    }>,
    isExpanded: boolean,
    showDropdown?: boolean,
    showExportDropdown?: boolean
  }> = [];

  // Dropdown and popup states
  showCurlModal = false;
  curlCommand = '';
  curlCopied = false;
  showMainDropdown = false;
  showExportMainDropdown = false;

  // Security schemes for global authentication
  securitySchemes: { [key: string]: any } = {};
  securitySchemesArray: Array<{name: string, scheme: any}> = [];

  // Theme state
  isDarkTheme = true;

  constructor(
    public apiDocsService: ApiDocsService,
    private configService: ConfigService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.title = this.configService.getConfig().title;
    this.loadApiDocs();

    // Get the current theme from the theme service
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';

    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });
  }

  /**
   * Toggle between light and dark theme
   */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  loadApiDocs(): void {
    this.loading = true;
    this.error = null;
    this.paths = [];

    this.apiDocsService.getApiDocs().subscribe({
      next: (data) => {
        this.apiDocs = data;
        this.loading = false;

        // Process paths and methods
        this.processPaths();

        // Check if we're using sample data but don't set an error
        // Just log it for debugging purposes
        if (this.apiDocsService.isUsingSampleData()) {
          console.log('Using sample API data for demonstration purposes.');
        }
      },
      error: (err) => {
        console.error('Error loading API docs:', err);
        this.error = 'Failed to load API documentation. Please check the server connection.';
        this.loading = false;
      }
    });
  }

  /**
   * Toggle path expanded state
   */
  togglePathExpanded(path: any): void {
    path.isExpanded = !path.isExpanded;
  }

  /**
   * Toggle method expanded state
   */
  toggleMethodExpanded(method: any): void {
    method.isExpanded = !method.isExpanded;
    // Reset autoExpand when toggling manually
    method.autoExpand = false;

    // If expanding, enable try-it-out by default
    if (method.isExpanded) {
      method.autoExpand = true;
    }
  }

  /**
   * Toggle method accordion (expand/collapse)
   */
  toggleMethodAccordion(method: any): void {
    if (method.isExpanded) {
      // If already expanded, collapse it
      method.isExpanded = false;
      method.autoExpand = false;
    } else {
      // If collapsed, expand it and enable try-it-out
      method.isExpanded = true;
      method.autoExpand = true;
    }
  }

  /**
   * Start try-it-out directly from the header button
   */
  startTryItOut(method: any, _path: string): void {
    method.isExpanded = true;
    method.autoExpand = true;
  }

  /**
   * Close method accordion when cancel is clicked
   */
  closeMethodAccordion(method: any): void {
    method.isExpanded = false;
    method.autoExpand = false;
  }

  /**
   * Toggle dropdown menu
   */
  toggleDropdown(event: Event, item: any): void {
    event.stopPropagation();

    // Close main dropdown
    this.showMainDropdown = false;
    this.showExportMainDropdown = false;

    // Close all other dropdowns first
    this.paths.forEach(path => {
      // Close path dropdowns
      if (path !== item) {
        path.showDropdown = false;
        path.showExportDropdown = false;
      }

      // Close method dropdowns
      path.methods.forEach(method => {
        if (method !== item) {
          method.showDropdown = false;
        }
      });
    });

    // Toggle the dropdown
    item.showDropdown = !item.showDropdown;
  }

  /**
   * Handle document click to close dropdowns
   */
  @HostListener('document:click')
  onDocumentClick(): void {
    // Close all dropdowns
    this.showMainDropdown = false;
    this.showExportMainDropdown = false;

    this.paths.forEach(path => {
      path.showDropdown = false;
      path.showExportDropdown = false;

      path.methods.forEach(method => {
        method.showDropdown = false;
      });
    });
  }

  /**
   * Toggle main dropdown menu
   */
  toggleMainDropdown(event: Event): void {
    event.stopPropagation();

    // Close all other dropdowns first
    this.paths.forEach(path => {
      path.showDropdown = false;
      path.showExportDropdown = false;

      // Close method dropdowns
      path.methods.forEach(method => {
        method.showDropdown = false;
      });
    });

    // Toggle the main dropdown
    this.showMainDropdown = !this.showMainDropdown;

    // If we're closing the dropdown, also close the export dropdown
    if (!this.showMainDropdown) {
      this.showExportMainDropdown = false;
    }
  }

  /**
   * Toggle export dropdown
   */
  toggleExportDropdown(event: Event, path: any): void {
    event.stopPropagation();
    path.showExportDropdown = !path.showExportDropdown;
  }

  /**
   * Toggle main export dropdown
   */
  toggleExportMainDropdown(event: Event): void {
    event.stopPropagation();
    this.showExportMainDropdown = !this.showExportMainDropdown;
  }

  /**
   * Show curl popup
   */
  showCurlPopup(event: Event, pathUrl: string, method: any): void {
    event.stopPropagation();

    // Close all dropdowns
    this.paths.forEach(path => {
      path.showDropdown = false;
      path.showExportDropdown = false;

      // Close method dropdowns
      path.methods.forEach(m => {
        m.showDropdown = false;
      });
    });

    // Generate curl command
    this.curlCommand = this.generateCurlCommand(pathUrl, method.type, method.operation);
    this.showCurlModal = true;
    this.curlCopied = false;
  }

  /**
   * Close curl popup
   */
  closeCurlPopup(): void {
    this.showCurlModal = false;
  }

  /**
   * Copy curl command to clipboard
   */
  copyCurlCommand(): void {
    if (navigator.clipboard && this.curlCommand) {
      navigator.clipboard.writeText(this.curlCommand)
        .then(() => {
          this.curlCopied = true;
          setTimeout(() => {
            this.curlCopied = false;
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy curl command:', err);
        });
    }
  }

  /**
   * Export as Postman collection
   */
  exportAsPostman(): void {
    // Close all dropdowns
    this.showMainDropdown = false;
    this.showExportMainDropdown = false;

    // Generate Postman collection
    const postmanCollection = this.generatePostmanCollection();

    // Create a blob and download it
    const blob = new Blob([JSON.stringify(postmanCollection, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.apiDocs.info?.title || 'api'}-postman-collection.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate a Postman collection from the OpenAPI spec
   */
  private generatePostmanCollection(): any {
    const collection: any = {
      info: {
        name: this.apiDocs.info?.title || 'API Collection',
        description: this.apiDocs.info?.description || '',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: []
    };

    // Get the server URL from the OpenAPI spec
    const serverUrl = this.apiDocs.servers && this.apiDocs.servers.length > 0
      ? this.apiDocs.servers[0].url
      : window.location.origin;

    // Group items by path
    this.paths.forEach(path => {
      const folderItem: any = {
        name: path.path,
        item: []
      };

      // Add each method as an item
      path.methods.forEach(method => {
        const item: any = {
          name: `${method.type} ${method.operation.summary || path.path}`,
          request: {
            method: method.type,
            header: [
              {
                key: 'Content-Type',
                value: 'application/json'
              }
            ],
            url: {
              raw: `${serverUrl}${path.path}`,
              host: [serverUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')],
              path: path.path.split('/').filter(p => p)
            },
            description: method.operation.description || ''
          },
          response: []
        };

        // Add request body if needed
        if (method.type !== 'GET' && method.type !== 'DELETE' && method.operation.requestBody) {
          if (method.operation.requestBody.content && method.operation.requestBody.content['application/json']) {
            const schema = method.operation.requestBody.content['application/json'].schema;
            if (schema) {
              item.request.body = {
                mode: 'raw',
                raw: this.generateSampleFromSchema(schema),
                options: {
                  raw: {
                    language: 'json'
                  }
                }
              };
            }
          }
        }

        // Add parameters if any
        if (method.operation.parameters && method.operation.parameters.length > 0) {
          const queryParams = method.operation.parameters.filter((p: any) => p.in === 'query');
          const pathParams = method.operation.parameters.filter((p: any) => p.in === 'path');

          if (queryParams.length > 0) {
            item.request.url.query = queryParams.map((p: any) => ({
              key: p.name,
              value: '',
              description: p.description || '',
              disabled: !p.required
            }));
          }

          if (pathParams.length > 0) {
            // Replace path parameters in the URL
            pathParams.forEach((p: any) => {
              const placeholder = `:${p.name}`;
              item.request.url.raw = item.request.url.raw.replace(`{${p.name}}`, placeholder);
              item.request.url.path = item.request.url.path.map((segment: string) =>
                segment.includes(`{${p.name}}`) ? segment.replace(`{${p.name}}`, placeholder) : segment
              );
            });
          }
        }

        folderItem.item.push(item);
      });

      collection.item.push(folderItem);
    });

    return collection;
  }

  /**
   * Generate a curl command for the given path and method
   */
  private generateCurlCommand(pathUrl: string, methodType: string, operation: any): string {
    // Get the server URL from the OpenAPI spec
    const serverUrl = this.apiDocs.servers && this.apiDocs.servers.length > 0
      ? this.apiDocs.servers[0].url
      : window.location.origin;

    // Build the full URL
    const baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    const path = pathUrl.startsWith('/') ? pathUrl : `/${pathUrl}`;
    const url = `${baseUrl}${path}`;

    // Start building the curl command
    let curl = `curl -X ${methodType} "${url}"`;

    // Add headers
    curl += ` \
  -H "Content-Type: application/json"`;

    // Add authorization header placeholder if security is required
    if (operation.security && operation.security.length > 0) {
      curl += ` \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"`;
    }

    // Add request body if needed
    if (methodType !== 'GET' && methodType !== 'DELETE' && operation.requestBody) {
      // Try to get a sample from the request body schema
      let sample = '{}';

      if (operation.requestBody.content && operation.requestBody.content['application/json']) {
        const schema = operation.requestBody.content['application/json'].schema;
        if (schema) {
          sample = this.generateSampleFromSchema(schema);
        }
      }

      curl += ` \
  -d '${sample}'`;
    }

    return curl;
  }

  /**
   * Generate a sample JSON object from a schema
   */
  private generateSampleFromSchema(schema: any): string {
    if (!schema) return '{}';

    // Handle reference
    if (schema.$ref) {
      const ref = schema.$ref.split('/').pop();
      const refSchema = this.apiDocs.components?.schemas?.[ref];
      if (refSchema) {
        return this.generateSampleFromSchema(refSchema);
      }
      return `{ "${ref}": "..." }`;
    }

    // Handle different types
    switch (schema.type) {
      case 'object':
        if (schema.properties) {
          const props = Object.entries(schema.properties).map(([key, prop]: [string, any]) => {
            return `"${key}": ${this.generateSampleValue(prop)}`;
          }).join(', ');
          return `{ ${props} }`;
        }
        return '{}';

      case 'array':
        if (schema.items) {
          return `[ ${this.generateSampleValue(schema.items)} ]`;
        }
        return '[]';

      default:
        return this.generateSampleValue(schema);
    }
  }

  /**
   * Generate a sample value for a schema property
   */
  private generateSampleValue(schema: any): string {
    if (!schema) return '""';

    // Handle reference
    if (schema.$ref) {
      const ref = schema.$ref.split('/').pop();
      return `{ "${ref}": "..." }`;
    }

    // Handle different types
    switch (schema.type) {
      case 'string':
        if (schema.enum && schema.enum.length > 0) {
          return `"${schema.enum[0]}"`;
        }
        if (schema.format === 'date-time') {
          return '"2023-01-01T00:00:00Z"';
        }
        if (schema.format === 'date') {
          return '"2023-01-01"';
        }
        if (schema.format === 'email') {
          return '"user@example.com"';
        }
        return '"string"';

      case 'integer':
      case 'number':
        return '0';

      case 'boolean':
        return 'false';

      case 'object':
        return '{}';

      case 'array':
        return '[]';

      default:
        return '""';
    }
  }

  /**
   * Process the API paths and methods
   */
  private processPaths(): void {
    if (!this.apiDocs || !this.apiDocs.paths) {
      this.paths = [];
      return;
    }

    // Process security schemes for global authentication
    this.processSecuritySchemes();

    // Get all paths
    this.paths = Object.entries(this.apiDocs.paths).map(([path, pathItem]) => {
      // Get methods for this path
      const methods = this.getMethodsArray(pathItem);

      return {
        path,
        pathItem,
        methods,
        isExpanded: false // Initially collapsed
      };
    });
  }

  /**
   * Get methods for a path item
   */
  private getMethodsArray(pathItem: any): Array<{type: string, operation: any, isExpanded: boolean, autoExpand: boolean}> {
    if (!pathItem) {
      return [];
    }

    const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
    return methods
      .filter(method => pathItem[method])
      .map(method => ({
        type: method.toUpperCase(),
        operation: pathItem[method],
        isExpanded: false, // Initially collapsed
        autoExpand: false // Initially not auto-expanded
      }));
  }

  /**
   * Process security schemes for global authentication
   */
  private processSecuritySchemes(): void {
    if (!this.apiDocs || !this.apiDocs.components || !this.apiDocs.components.securitySchemes) {
      this.securitySchemes = {};
      this.securitySchemesArray = [];
      return;
    }

    this.securitySchemes = this.apiDocs.components.securitySchemes;
    this.securitySchemesArray = Object.entries(this.securitySchemes).map(([name, scheme]) => ({
      name,
      scheme
    }));
  }
}
