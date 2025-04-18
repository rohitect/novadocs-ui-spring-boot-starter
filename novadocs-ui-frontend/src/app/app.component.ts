import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ConfigService } from './services/config.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HttpClientModule, CommonModule],
  template: `
    <div class="app-container">
      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }

    .content {
      flex: 1;
      overflow-y: auto;
      width: 100%;
    }
  `]
})
export class AppComponent implements OnInit {
  constructor(
    private configService: ConfigService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    const config = this.configService.getConfig();

    // Apply custom colors from configuration
    document.documentElement.style.setProperty('--primary-color-dark', config.theme.primaryColor);
    document.documentElement.style.setProperty('--secondary-color-dark', config.theme.secondaryColor);

    // Create light theme colors (inverted from dark theme)
    document.documentElement.style.setProperty('--primary-color-light', config.theme.secondaryColor);
    document.documentElement.style.setProperty('--secondary-color-light', config.theme.primaryColor);

    // Set font family
    if (config.theme.fontFamily) {
      document.documentElement.style.setProperty('font-family', config.theme.fontFamily);
    }

    // Apply initial theme
    this.applyThemeColors(this.themeService.getCurrentTheme());

    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.applyThemeColors(theme);
    });
  }


  private applyThemeColors(theme: 'dark' | 'light'): void {
    if (theme === 'dark') {
      document.documentElement.style.setProperty('--primary-color', 'var(--primary-color-dark)');
      document.documentElement.style.setProperty('--secondary-color', 'var(--secondary-color-dark)');
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.documentElement.style.setProperty('--primary-color', 'var(--primary-color-light)');
      document.documentElement.style.setProperty('--secondary-color', 'var(--secondary-color-light)');
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }
}
