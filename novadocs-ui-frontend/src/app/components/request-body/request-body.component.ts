import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-request-body',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './request-body.component.html',
  styleUrls: ['./request-body.component.scss']
})
export class RequestBodyComponent implements OnChanges {
  @Input() requestBody: any;
  @Output() bodyChanged = new EventEmitter<any>();

  contentTypes: string[] = [];
  selectedContentType: string = 'application/json';
  bodyContent: string = '';
  schema: any = null;
  validationError: string | null = null;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['requestBody'] && this.requestBody) {
      this.initializeRequestBody();
    }
  }

  initializeRequestBody(): void {
    if (this.requestBody && this.requestBody.content) {
      this.contentTypes = Object.keys(this.requestBody.content);

      if (this.contentTypes.length > 0) {
        // Prefer JSON if available
        if (this.contentTypes.includes('application/json')) {
          this.selectedContentType = 'application/json';
        } else {
          this.selectedContentType = this.contentTypes[0];
        }

        this.updateSchema();
      }
    }
  }

  updateSchema(): void {
    if (this.requestBody?.content?.[this.selectedContentType]?.schema) {
      this.schema = this.requestBody.content[this.selectedContentType].schema;

      // If there's an example, use it
      const example = this.requestBody.content[this.selectedContentType].example;
      if (example) {
        this.bodyContent = typeof example === 'object'
          ? JSON.stringify(example, null, 2)
          : String(example);
      } else {
        this.bodyContent = '';
      }
    } else {
      this.schema = null;
      this.bodyContent = '';
    }

    this.emitBodyChange();
  }

  onContentTypeChange(): void {
    this.updateSchema();
  }

  onBodyChange(): void {
    this.validateBody();
    this.emitBodyChange();
  }

  /**
   * Format JSON content
   */
  formatJson(): void {
    if (this.selectedContentType.includes('json') && this.bodyContent.trim()) {
      try {
        const parsed = JSON.parse(this.bodyContent);
        this.bodyContent = JSON.stringify(parsed, null, 2);
        this.validationError = null;
        this.emitBodyChange();
      } catch (e) {
        this.validationError = 'Cannot format invalid JSON: ' + (e as Error).message;
      }
    }
  }

  validateBody(): void {
    this.validationError = null;

    if (this.selectedContentType.includes('json') && this.bodyContent.trim()) {
      try {
        JSON.parse(this.bodyContent);
      } catch (e) {
        this.validationError = 'Invalid JSON: ' + (e as Error).message;
      }
    }
  }

  emitBodyChange(): void {
    this.bodyChanged.emit({
      contentType: this.selectedContentType,
      content: this.bodyContent,
      isValid: !this.validationError
    });
  }

  generateSampleJson(): void {
    if (!this.schema) return;

    const sample = this.generateSampleFromSchema(this.schema);
    this.bodyContent = JSON.stringify(sample, null, 2);
    this.onBodyChange();
  }

  generateSampleFromSchema(schema: any): any {
    if (!schema) return null;

    // Handle references
    if (schema.$ref) {
      // This is a simplified approach - in a real app, you'd resolve the reference
      return { "reference": schema.$ref };
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
}
