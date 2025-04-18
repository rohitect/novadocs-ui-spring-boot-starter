/**
 * Models for the Try-It-Out component
 */

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: any;
  value?: string;
}

export interface RequestBodyContent {
  contentType: string;
  content: string;
  isValid: boolean;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Headers;
  body: any;
}

export interface TryItOutState {
  isExpanded: boolean;
  isLoading: boolean;
  showValidation: boolean;
  parameters: Parameter[];
  paramValues: Record<string, { value: string; in: string }>;
  requestBody: RequestBodyContent;
  response: ApiResponse | null;
  error: string | null;
  curlCommand: string;
  curlCopied: boolean;
}
