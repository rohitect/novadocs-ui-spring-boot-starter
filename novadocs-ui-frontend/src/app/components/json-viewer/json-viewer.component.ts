import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface JsonNode {
  key: string;
  value: any;
  type: string;
  expanded: boolean;
  children?: JsonNode[];
  isArrayItem: boolean;
}

@Component({
  selector: 'app-json-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './json-viewer.component.html',
  styleUrls: ['./json-viewer.component.scss']
})
export class JsonViewerComponent implements OnChanges {
  @Input() json: any;
  @Input() expanded = true;
  @Input() depth = 0;
  @Input() showKeys = false;
  @Input() isRoot = true;

  jsonNodes: JsonNode[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['json']) {
      this.jsonNodes = this.parseJson(this.json);
    }

    if (changes['expanded'] && !changes['expanded'].firstChange) {
      this.setExpanded(this.expanded);
    }
  }

  private parseJson(json: any): JsonNode[] {
    if (!json) {
      return [];
    }

    const nodes: JsonNode[] = [];

    if (Array.isArray(json)) {
      for (let i = 0; i < json.length; i++) {
        const value = json[i];
        const node: JsonNode = {
          key: i.toString(),
          value: value,
          type: this.getType(value),
          expanded: this.expanded,
          isArrayItem: true,
          children: this.isObject(value) ? this.parseJson(value) : undefined
        };
        nodes.push(node);
      }
    } else if (this.isObject(json)) {
      for (const key in json) {
        if (json.hasOwnProperty(key)) {
          const value = json[key];
          const node: JsonNode = {
            key: key,
            value: value,
            type: this.getType(value),
            expanded: this.expanded,
            isArrayItem: false,
            children: this.isObject(value) ? this.parseJson(value) : undefined
          };
          nodes.push(node);
        }
      }
    }

    return nodes;
  }

  private getType(value: any): string {
    if (value === null) {
      return 'null';
    }
    if (Array.isArray(value)) {
      return 'array';
    }
    return typeof value;
  }

  private isObject(value: any): boolean {
    return value !== null && (typeof value === 'object' || Array.isArray(value));
  }

  toggleExpand(node: JsonNode): void {
    node.expanded = !node.expanded;
  }

  expandAll(): void {
    this.setExpanded(true);
  }

  collapseAll(): void {
    this.setExpanded(false);
  }

  private setExpanded(expanded: boolean): void {
    const setNodeExpanded = (nodes: JsonNode[]) => {
      for (const node of nodes) {
        node.expanded = expanded;
        if (node.children) {
          setNodeExpanded(node.children);
        }
      }
    };

    setNodeExpanded(this.jsonNodes);
  }

  getValuePreview(value: any, type: string): string {
    if (type === 'null') {
      return 'null';
    }
    if (type === 'undefined') {
      return 'undefined';
    }
    if (type === 'object') {
      return '{...}';
    }
    if (type === 'array') {
      return '[...]';
    }
    if (type === 'string') {
      return `"${value}"`;
    }
    return value.toString();
  }

  getObjectLength(node: JsonNode): number {
    if (node.type === 'array' || node.type === 'object') {
      return node.children?.length || 0;
    }
    return 0;
  }

  getNodeClass(node: JsonNode): string {
    return `json-${node.type}`;
  }

  /**
   * Determines if a node is an item in an array (has numeric key)
   */
  isArrayItem(node: JsonNode): boolean {
    return !isNaN(Number(node.key));
  }

  shouldShowKey(node: JsonNode): boolean {
    // Don't show keys for top-level array items
    if (this.isRoot && node.isArrayItem && this.depth === 0) {
      return false;
    }

    // Always show keys for non-array items or nested array items
    return !node.isArrayItem || this.depth > 0 || this.showKeys;
  }
}
