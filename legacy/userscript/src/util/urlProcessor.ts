/**
 * Comprehensive URL processing utility for handling Stash and Whisparr URLs
 * Addresses issues #63 and #71 by providing consistent URL parsing with path preservation
 */

export interface ProcessedUrl {
  protocol: 'http' | 'https';
  hostname: string;
  port?: number;
  path: string;
  fullBaseUrl: string;
  isValid: boolean;
  errors: string[];
}

export interface UrlValidationResult {
  isValid: boolean;
  processedUrl?: ProcessedUrl;
  suggestions: string[];
  warnings: string[];
  errors: string[];
}

export class UrlProcessor {
  private static readonly DEFAULT_PORTS = {
    http: 80,
    https: 443,
  };

  private static readonly COMMON_STASH_PORTS = [9999, 9998, 8080];
  private static readonly COMMON_WHISPARR_PORTS = [6969, 7878, 8989];

  // Common reverse proxy domains and TLDs
  private static readonly REVERSE_PROXY_DOMAINS = [
    '.lan',
    '.local',
    '.home',
    '.internal',
    '.corp',
    '.intranet',
  ];

  /**
   * Check if a hostname appears to be behind a reverse proxy
   */
  private static isLikelyReverseProxy(hostname: string): boolean {
    // Check for common reverse proxy TLDs
    const hasProxyTLD = this.REVERSE_PROXY_DOMAINS.some((domain) =>
      hostname.toLowerCase().endsWith(domain),
    );

    // Check for custom domains (contains dots but not IP addresses)
    const isCustomDomain =
      hostname.includes('.') &&
      !hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/) && // Not IPv4
      !hostname.match(/^localhost$/i); // Not localhost

    return hasProxyTLD || isCustomDomain;
  }

  /**
   * Parse and validate a Stash URL with full path preservation
   */
  static parseStashUrl(input: string): ProcessedUrl {
    const result: ProcessedUrl = {
      protocol: 'https',
      hostname: '',
      port: undefined,
      path: '',
      fullBaseUrl: '',
      isValid: false,
      errors: [],
    };

    if (!input || input.trim() === '') {
      result.errors.push('URL cannot be empty');
      return result;
    }

    const trimmed = input.trim();

    try {
      let urlString = trimmed;

      // Add protocol if missing
      if (!/^https?:\/\//i.test(urlString)) {
        // Smart protocol detection
        const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])/i.test(
          urlString,
        );
        const isPrivateIp =
          /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/i.test(
            urlString,
          );
        const isReverseProxy = this.isLikelyReverseProxy(urlString);

        // Use HTTPS for reverse proxy domains (they usually have SSL termination)
        // Use HTTP for localhost and private IPs (usually direct connections)
        if (isReverseProxy) {
          result.protocol = 'https';
        } else if (isLocalhost || isPrivateIp) {
          result.protocol = 'http';
        } else {
          // Default to HTTPS for unknown external domains
          result.protocol = 'https';
        }

        urlString = `${result.protocol}://${urlString}`;
      }

      const url = new URL(urlString);

      result.protocol = url.protocol.slice(0, -1) as 'http' | 'https';
      result.hostname = url.hostname;
      result.path = url.pathname === '/' ? '' : url.pathname;

      // Handle port
      if (url.port) {
        result.port = parseInt(url.port, 10);
      } else if (result.protocol === 'http' && this.DEFAULT_PORTS.http !== 80) {
        // Only set port if it's not the default
      } else if (
        result.protocol === 'https' &&
        this.DEFAULT_PORTS.https !== 443
      ) {
        // Only set port if it's not the default
      }

      // Build full base URL
      result.fullBaseUrl = `${result.protocol}://${result.hostname}`;
      if (result.port && result.port !== this.DEFAULT_PORTS[result.protocol]) {
        result.fullBaseUrl += `:${result.port}`;
      }
      result.fullBaseUrl += result.path;

      result.isValid = true;

      // Validation checks
      if (result.path === '/graphql') {
        result.errors.push(
          "Don't include /graphql in the URL - it will be added automatically",
        );
        result.isValid = false;
      }

      if (result.path.endsWith('/graphql')) {
        result.errors.push('Path should not end with /graphql');
        result.isValid = false;
      }
    } catch (error) {
      result.errors.push(
        `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      result.isValid = false;
    }

    return result;
  }

  /**
   * Parse and validate a Whisparr URL (domain:port format)
   */
  static parseWhisparrUrl(
    input: string,
    useHttps: boolean = false,
  ): ProcessedUrl {
    const result: ProcessedUrl = {
      protocol: useHttps ? 'https' : 'http',
      hostname: '',
      port: undefined,
      path: '',
      fullBaseUrl: '',
      isValid: false,
      errors: [],
    };

    if (!input || input.trim() === '') {
      result.errors.push('Domain cannot be empty');
      return result;
    }

    const trimmed = input.trim();

    try {
      // Remove any protocol if user accidentally included it
      let cleanInput = trimmed.replace(/^https?:\/\//i, '');

      // Parse hostname and port
      const portMatch = cleanInput.match(/^(.+?):(\d+)$/);
      if (portMatch) {
        result.hostname = portMatch[1];
        result.port = parseInt(portMatch[2], 10);
      } else {
        result.hostname = cleanInput;
        // No port specified - this might be okay for some setups
      }

      // Validate hostname
      if (!result.hostname) {
        result.errors.push('Hostname cannot be empty');
        return result;
      }

      // Build full base URL
      result.fullBaseUrl = `${result.protocol}://${result.hostname}`;
      if (result.port) {
        result.fullBaseUrl += `:${result.port}`;
      }

      result.isValid = true;

      // Port validation - more lenient for reverse proxy setups
      if (!result.port) {
        const isReverseProxy = this.isLikelyReverseProxy(result.hostname);
        if (isReverseProxy) {
          // Reverse proxy setup - no port required, but add informational note
          result.isValid = true;
        } else {
          // Direct connection - port usually required
          result.errors.push(
            'Port number is recommended for direct connections (e.g., localhost:6969)',
          );
          result.isValid = false;
        }
      }

      if (result.port && result.port === 443 && result.protocol === 'http') {
        result.errors.push(
          'Port 443 is typically used with HTTPS, consider enabling HTTPS',
        );
      }

      if (result.port && result.port === 80 && result.protocol === 'https') {
        result.errors.push(
          'Port 80 is typically used with HTTP, consider disabling HTTPS',
        );
      }
    } catch (error) {
      result.errors.push(
        `Invalid format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      result.isValid = false;
    }

    return result;
  }

  /**
   * Build GraphQL endpoint URL with proper path preservation
   */
  static buildStashGraphqlUrl(baseUrl: string): string {
    // Ensure baseUrl doesn't end with slash, then add /graphql
    const cleanBase = baseUrl.replace(/\/+$/, '');
    return `${cleanBase}/graphql`;
  }

  /**
   * Build Stash scene URL with proper path preservation
   */
  static buildStashSceneUrl(baseUrl: string, sceneId: string): string {
    // Ensure baseUrl doesn't end with slash, then add /scenes/{id}
    const cleanBase = baseUrl.replace(/\/+$/, '');
    return `${cleanBase}/scenes/${sceneId}`;
  }

  /**
   * Build Whisparr movie URL
   */
  static buildWhisparrMovieUrl(baseUrl: string, stashId: string): string {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    return `${cleanBase}/movie/${stashId}`;
  }

  /**
   * Build Whisparr API URL
   */
  static buildWhisparrApiUrl(baseUrl: string): string {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    return `${cleanBase}/api/v3/`;
  }

  /**
   * Comprehensive URL validation with suggestions
   */
  static validateUrl(
    input: string,
    serviceType: 'stash' | 'whisparr',
    useHttps: boolean = false,
  ): UrlValidationResult {
    const result: UrlValidationResult = {
      isValid: false,
      suggestions: [],
      warnings: [],
      errors: [],
    };

    if (serviceType === 'stash') {
      result.processedUrl = this.parseStashUrl(input);
    } else {
      result.processedUrl = this.parseWhisparrUrl(input, useHttps);
    }

    result.isValid = result.processedUrl.isValid;
    result.errors = result.processedUrl.errors;

    // Generate suggestions for common mistakes
    if (!result.isValid && input) {
      this.generateSuggestions(input, serviceType, useHttps, result);
    }

    // Generate warnings for valid but potentially problematic URLs
    if (result.isValid && result.processedUrl) {
      this.generateWarnings(result.processedUrl, serviceType, result);
    }

    return result;
  }

  private static generateSuggestions(
    input: string,
    serviceType: 'stash' | 'whisparr',
    _useHttps: boolean,
    result: UrlValidationResult,
  ): void {
    const trimmed = input.trim().toLowerCase();

    if (serviceType === 'stash') {
      // Stash suggestions
      if (!trimmed.includes('://')) {
        result.suggestions.push(`Try: http://${input}`);
        result.suggestions.push(`Try: https://${input}`);
      }

      if (!trimmed.includes(':') && !trimmed.includes('/')) {
        result.suggestions.push(`Try: http://${input}:9999`);
        result.suggestions.push(`Try: http://${input}/stash`);
      }

      if (trimmed === 'localhost' || trimmed === '127.0.0.1') {
        result.suggestions.push('Try: http://localhost:9999');
      }

      if (trimmed.includes('.lan') || trimmed.includes('.local')) {
        result.suggestions.push(`Try: https://${input}`);
        if (!input.includes(':')) {
          result.suggestions.push(`Try: https://${input}/stash`);
        }
      }
    } else {
      // Whisparr suggestions
      if (trimmed.includes('://')) {
        const cleanInput = input.replace(/^https?:\/\//i, '');
        result.suggestions.push(`Try: ${cleanInput}`);
      }

      if (!trimmed.includes(':')) {
        result.suggestions.push(`Try: ${input}:6969`);
        result.suggestions.push(`Try: ${input}:7878`);
      }

      if (trimmed === 'localhost' || trimmed === '127.0.0.1') {
        result.suggestions.push('Try: localhost:6969');
      }

      if (trimmed.includes('.lan') || trimmed.includes('.local')) {
        result.suggestions.push(`Try: ${input} (reverse proxy detected)`);
        if (!input.includes(':')) {
          result.suggestions.push(`Try: ${input}:80`);
          result.suggestions.push(`Try: ${input}:443`);
        }
      }
    }
  }

  private static generateWarnings(
    processedUrl: ProcessedUrl,
    serviceType: 'stash' | 'whisparr',
    result: UrlValidationResult,
  ): void {
    // Check for unusual ports
    if (
      serviceType === 'stash' &&
      processedUrl.port &&
      !this.COMMON_STASH_PORTS.includes(processedUrl.port)
    ) {
      result.warnings.push(
        `Port ${processedUrl.port} is unusual for Stash (common: ${this.COMMON_STASH_PORTS.join(', ')})`,
      );
    }

    if (
      serviceType === 'whisparr' &&
      processedUrl.port &&
      !this.COMMON_WHISPARR_PORTS.includes(processedUrl.port)
    ) {
      result.warnings.push(
        `Port ${processedUrl.port} is unusual for Whisparr (common: ${this.COMMON_WHISPARR_PORTS.join(', ')})`,
      );
    }

    // Check for HTTP in production-like setups
    if (processedUrl.protocol === 'http') {
      const isLocalhost = /^(localhost|127\.0\.0\.1)$/i.test(
        processedUrl.hostname,
      );
      const isPrivateIp = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
        processedUrl.hostname,
      );
      const isReverseProxy = this.isLikelyReverseProxy(processedUrl.hostname);

      if (isReverseProxy) {
        result.warnings.push(
          'Reverse proxy detected - consider enabling HTTPS if your proxy supports SSL termination',
        );
      } else if (!isLocalhost && !isPrivateIp) {
        result.warnings.push('Consider using HTTPS for external domains');
      }
    }

    // Path-specific warnings for Stash
    if (
      serviceType === 'stash' &&
      processedUrl.path &&
      processedUrl.path.length > 1
    ) {
      result.warnings.push(`Using custom path: ${processedUrl.path}`);
    }
  }

  /**
   * Get example URLs for a service type
   */
  static getExamples(serviceType: 'stash' | 'whisparr'): string[] {
    if (serviceType === 'stash') {
      return [
        'http://localhost:9999',
        'https://stash.lan',
        'https://stash.local',
        'http://192.168.1.100:9999',
        'http://server/stash',
        'https://stash.home/custom',
        'https://stash.example.com',
      ];
    } else {
      return [
        'localhost:6969',
        'whisparr.lan',
        'whisparr.local',
        'whisparr.home:6969',
        '192.168.1.100:7878',
        'server.internal:6969',
      ];
    }
  }
}
