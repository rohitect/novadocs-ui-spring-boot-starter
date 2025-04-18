import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class ApiDocsService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

  private usingSampleData = false;

  /**
   * Fetches the OpenAPI documentation from the server
   * Falls back to sample data if the server request fails
   */
  getApiDocs(): Observable<any> {
    const apiDocsPath = this.configService.getConfig().apiDocsPath || '/v3/api-docs';
    console.log('Fetching API docs from:', apiDocsPath);

    return this.http.get(apiDocsPath).pipe(
      catchError(error => {
        console.error('Error fetching API docs:', error);
        this.usingSampleData = true;
        return this.getSampleApiDocs();
      })
    );
  }

  /**
   * Loads sample OpenAPI documentation
   * Tries multiple locations for better compatibility
   */
  getSampleApiDocs(): Observable<any> {
    console.log('Loading sample API docs');
    return this.http.get('sample-openapi.json').pipe(
      catchError(error => {
        console.log('Trying alternative location for sample API docs');
        return this.http.get('assets/sample-openapi.json');
      })
    );
  }

  /**
   * Checks if the app is using sample data
   */
  isUsingSampleData(): boolean {
    return this.usingSampleData;
  }
}
