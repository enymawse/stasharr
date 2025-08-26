import {
  BasicConfigValidation,
  ConfigValidation,
  StashConfigValidation,
} from './ConfigValidation';
import { UrlProcessor } from '../util/urlProcessor';

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
    if (!this.stashDomain) {
      return '';
    }

    const processedUrl = UrlProcessor.parseStashUrl(this.stashDomain);
    if (!processedUrl.isValid) {
      console.warn('Invalid Stash URL:', processedUrl.errors);
      // Fallback to old behavior for backward compatibility
      let domain = this.stashDomain.trim().replace(/\/+$/, '');
      if (!/^https?:\/\//i.test(domain)) {
        domain = `https://${domain}`;
      }
      return `${domain}/graphql`;
    }

    return UrlProcessor.buildStashGraphqlUrl(processedUrl.fullBaseUrl);
  }

  whisparrUrl(): string {
    const processedUrl = UrlProcessor.parseWhisparrUrl(
      this.domain,
      this.protocol,
    );
    if (!processedUrl.isValid) {
      console.warn('Invalid Whisparr URL:', processedUrl.errors);
      // Fallback to old behavior for backward compatibility
      return `${this.protocol ? 'https' : 'http'}://${this.domain}`;
    }

    return processedUrl.fullBaseUrl;
  }

  whisparrApiUrl(): string {
    const baseUrl = this.whisparrUrl();
    return UrlProcessor.buildWhisparrApiUrl(baseUrl);
  }

  stashSceneUrl(sceneId: string): string {
    if (!this.stashDomain) {
      return '';
    }

    const processedUrl = UrlProcessor.parseStashUrl(this.stashDomain);
    if (!processedUrl.isValid) {
      console.warn('Invalid Stash URL:', processedUrl.errors);
      // Fallback to old behavior for backward compatibility
      return `${this.stashDomain}/scenes/${sceneId}`;
    }

    return UrlProcessor.buildStashSceneUrl(processedUrl.fullBaseUrl, sceneId);
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
