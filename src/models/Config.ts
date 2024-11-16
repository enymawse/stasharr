import { z } from 'zod';

export const ConfigSchema = z.object({
  protocol: z.boolean(),
  domain: z.string().min(1, 'Domain is required'),
  whisparrApiKey: z.string().min(1, 'API Key is required'),
  qualityProfile: z
    .number()
    .min(0, 'Quality profile must be a non-negative number'),
  rootFolderPath: z.string().min(1, 'Root folder path is required'),
  rootFolderPathId: z.number().min(0),
  searchForNewMovie: z.boolean(),
});

export class Config {
  protocol: boolean = false;
  domain: string = 'localhost:6969';
  whisparrApiKey: string = '';
  qualityProfile: number = 1;
  rootFolderPath: string = '';
  rootFolderPathId: number = 1;
  searchForNewMovie: boolean = true;

  constructor(data?: {
    protocol: boolean;
    domain: string;
    whisparrApiKey: string;
    qualityProfile?: number;
    rootFolderPath?: string;
    rootFolderPathId?: number;
    searchForNewMovie?: boolean;
  }) {
    if (data) {
      this.protocol = data.protocol;
      this.domain = data.domain;
      this.whisparrApiKey = data.whisparrApiKey;
      this.qualityProfile = data.qualityProfile || 1;
      this.rootFolderPath = data.rootFolderPath || '';
      this.rootFolderPathId = data.rootFolderPathId || 1;
      this.searchForNewMovie = data.searchForNewMovie || true;
    }
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
  }

  save() {
    console.log('Saving configuration');
    localStorage.setItem('stasharr-config', JSON.stringify(this));
  }

  valid(): boolean {
    console.log('Validating configuration');
    try {
      ConfigSchema.parse(this);
      return true;
    } catch (error) {
      console.error('Validation failed:', error);
      return false;
    }
  }
}
