import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-parameter-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parameter-input.component.html',
  styleUrls: ['./parameter-input.component.scss']
})
export class ParameterInputComponent {
  @Input() parameter: any;
  @Input() showValidation = false;
  @Output() valueChanged = new EventEmitter<any>();
  
  value: any;
  
  constructor() {}
  
  getInputType(): string {
    if (!this.parameter.schema) {
      return 'text';
    }
    
    if (this.parameter.schema.enum && this.parameter.schema.enum.length > 0) {
      return 'enum';
    }
    
    switch (this.parameter.schema.type) {
      case 'integer':
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      default:
        return 'text';
    }
  }
  
  onValueChange(): void {
    this.valueChanged.emit({
      name: this.parameter.name,
      value: this.value,
      in: this.parameter.in
    });
  }
}
