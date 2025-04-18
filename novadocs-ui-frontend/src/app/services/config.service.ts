import { Injectable } from '@angular/core';

interface NovaDocsConfig {
  basePath: string;
  apiDocsPath: string;
  title: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  layout: {
    type: string;
  };
}

declare global {
  interface Window {
    __NOVADOCS_CONFIG__?: NovaDocsConfig;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private defaultConfig: NovaDocsConfig = {
    basePath: '/novadocs',
    apiDocsPath: '/v3/api-docs',
    title: 'API Documentation',
    theme: {
      primaryColor: '#1976d2',
      secondaryColor: '#424242',
      fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif'
    },
    layout: {
      type: 'three-pane'
    }
  };

  /**
   * Gets the configuration from the window object or returns default values
   */
  getConfig(): NovaDocsConfig {
    return window.__NOVADOCS_CONFIG__ || this.defaultConfig;
  }
}
