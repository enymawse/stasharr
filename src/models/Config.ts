import { ConfigValidation } from './ConfigValidation';

export class Config {
  protocol: boolean = false;
  domain: string = 'localhost:6969';
  whisparrApiKey: string = '';
  qualityProfile: number = 1;
  rootFolderPath: string = '';
  searchForNewMovie: boolean = true;
  stashDomain: string = 'http://localhost:9999';
  tags: number[] = [];

  constructor(protocol?: boolean, domain?: string, whisparrApiKey?: string) {
    if (protocol) this.protocol = protocol;
    if (domain) this.domain = domain;
    if (whisparrApiKey) this.whisparrApiKey = whisparrApiKey;
  }

  whisparrUrl(): string {
    return `${this.protocol ? 'https' : 'http'}://${this.domain}`;
  }

  whisparrApiUrl(): string {
    return `${this.protocol ? 'https' : 'http'}://${this.domain}/api/v3/`;
  }

  load() {
    console.log('Loading configuration');
    const savedConfig = localStorage.getItem('stasharr-config');
    if (savedConfig) {
      Object.assign(this, JSON.parse(savedConfig));
    }
    return this;
  }

  save() {
    console.log('Saving configuration');
    localStorage.setItem('stasharr-config', JSON.stringify(this));
  }

  valid(): boolean {
    console.log('Validating configuration');
    try {
      ConfigValidation.parse(this);
      return true;
    } catch (error) {
      console.error('Validation failed:', error);
      return false;
    }
  }
}
