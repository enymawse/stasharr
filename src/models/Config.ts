import {
  BasicConfigValidation,
  ConfigValidation,
  StashConfigValidation,
} from './ConfigValidation';

export class Config {
  protocol: boolean = false;
  domain: string = 'localhost:6969';
  whisparrApiKey: string = '';
  qualityProfile: number = 1;
  rootFolderPath: string = '';
  searchForNewMovie: boolean = true;
  tags: number[] = [];
  stashDomain: string = 'http://localhost:9999';
  stashApiKey: string = '';

  constructor(
    protocol?: boolean,
    domain?: string,
    whisparrApiKey?: string,
    stashDomain?: string,
    stashApiKey?: string,
  ) {
    if (protocol) this.protocol = protocol;
    if (domain) this.domain = domain;
    if (whisparrApiKey) this.whisparrApiKey = whisparrApiKey;
    if (stashDomain) this.stashDomain = stashDomain;
    if (stashApiKey) this.stashApiKey = stashApiKey;
  }

  stashValid(): boolean {
    try {
      StashConfigValidation.parse(this);
      return true;
    } catch (e) {
      console.error('Validation of Stash configuration failed: ', e);
      return false;
    }
  }

  stashGqlEndpoint(): string {
    let parts = this.stashDomain.split('/');
    let protocol = parts[0];
    let domain = parts[2];
    return `${protocol}//${domain}/graphql`;
  }

  whisparrUrl(): string {
    return `${this.protocol ? 'https' : 'http'}://${this.domain}`;
  }

  whisparrApiUrl(): string {
    return `${this.protocol ? 'https' : 'http'}://${this.domain}/api/v3/`;
  }

  load() {
    console.log('Loading configuration');
    // eslint-disable-next-line no-undef
    const savedConfig = GM_getValue<string>('stasharr-config');
    if (savedConfig) {
      Object.assign(this, JSON.parse(savedConfig));
    }
    return this;
  }

  save() {
    console.log('Saving configuration');
    // eslint-disable-next-line no-undef
    GM_setValue('stasharr-config', JSON.stringify(this));
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

  basicValidation(): boolean {
    try {
      BasicConfigValidation.parse(this);
      return true;
    } catch (e) {
      console.error('Basic Validation failed: ', e);
      return false;
    }
  }
}
