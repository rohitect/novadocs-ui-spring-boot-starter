import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-response-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './response-display.component.html',
  styleUrls: ['./response-display.component.scss']
})
export class ResponseDisplayComponent implements OnChanges {
  @Input() response: any;
  
  headers: { name: string, value: string }[] = [];
  formattedBody: string | null = null;
  
  get isSuccess(): boolean {
    return this.response && this.response.status >= 200 && this.response.status < 300;
  }
  
  get isError(): boolean {
    return this.response && this.response.status >= 400;
  }
  
  get isRedirect(): boolean {
    return this.response && this.response.status >= 300 && this.response.status < 400;
  }
  
  constructor() {}
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['response'] && this.response) {
      this.processResponse();
    }
  }
  
  processResponse(): void {
    // Process headers
    this.headers = [];
    if (this.response.headers) {
      this.response.headers.forEach((value: string, name: string) => {
        this.headers.push({ name, value });
      });
    }
    
    // Process body
    if (this.response.body !== undefined && this.response.body !== null) {
      const contentType = this.getContentType();
      
      if (contentType.includes('json')) {
        try {
          const jsonBody = typeof this.response.body === 'string' 
            ? JSON.parse(this.response.body) 
            : this.response.body;
          this.formattedBody = JSON.stringify(jsonBody, null, 2);
        } catch (e) {
          this.formattedBody = String(this.response.body);
        }
      } else if (contentType.includes('xml')) {
        // Simple XML formatting - in a real app, you'd use a proper XML formatter
        this.formattedBody = String(this.response.body)
          .replace(/></g, '>\n<')
          .replace(/><\/(\w+)>/g, '>\n</$1>');
      } else {
        this.formattedBody = String(this.response.body);
      }
    } else {
      this.formattedBody = null;
    }
  }
  
  getContentType(): string {
    if (!this.response || !this.response.headers) {
      return 'text/plain';
    }
    
    return this.response.headers.get('content-type') || 'text/plain';
  }
  
  getStatusText(): string {
    if (!this.response) return '';
    
    const statusCodes: { [key: number]: string } = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error'
    };
    
    return statusCodes[this.response.status] || '';
  }
}
