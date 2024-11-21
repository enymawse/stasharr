import '@violentmonkey/types';

/** eslint-disable @typescript-eslint/no-unused-vars */
export namespace Whisparr {
  type OriginalLanguage = {
    id: number;
    name: string;
  };

  type Image = {
    coverType: string;
    url: string;
    remoteUrl: string;
  };

  type Movie = {
    title: string;
    originalLanguage: OriginalLanguage;
    sortTitle: string;
    status: string;
    overview: string;
    releaseDate: string;
    images: Image[];
    year: number;
    studioTitle: string;
    studioForeignId: string;
    qualityProfileId: number;
    monitored: boolean;
    isAvailable: boolean;
    folderName: string;
    runtime: number;
    cleanTitle: string;
    tmdbId: number;
    foreignId: string;
    stashId: string;
    titleSlug: string;
    folder: string;
    genres: string[];
    tags: string[];
    added: string;
    ratings: Record<string, unknown>;
    credits: unknown[];
    itemType: string;
  };

  type LookupSceneResponse = {
    foreignId: string;
    movie: WhisparrScene;
    id: number;
  };

  type WhisparrScene = {
    title: string;
    sortTitle: string;
    status: string;
    overview: string;
    releaseDate: string;
    year: number;
    studioTitle: string;
    studioForeignId: string;
    path: string;
    qualityProfileId: number;
    hasFile: boolean;
    monitored: boolean;
    isAvailable: true;
    folderName: string;
    runtime: number;
    stashId: string;
    titleSlug: string;
    rootFolderPath: string;
    genres: string[];
    tags: string[];
    added: string;
    foreignId: string;
    movie: Movie;
    id: number;
  };

  type WhisparrCommandResponse = {
    name: string;
    commandName: string;
    message: string;
    body: {
      movieIds: number[];
      sendUpdatesToClient: boolean;
      updateScheduledTask: boolean;
      completionMessage: string;
      requiresDiskAccess: boolean;
      isExclusive: boolean;
      isTypeExclusive: boolean;
      isLongRunning: boolean;
      name: string;
      trigger: string;
      suppressMessages: boolean;
    };
    priority: string;
    status: string;
    result: string;
    queued: string;
    started: string;
    trigger: string;
    stateChangeTime: string;
    sendUpdatesToClient: boolean;
    updateScheduledTask: boolean;
    id: number;
  };

  type MoviePayload = {
    title: string;
    studio: string;
    foreignId: string;
    monitored: boolean;
    rootFolderPath: string;
    addOptions: {
      searchForMovie: boolean;
    };
    qualityProfileId: number;
  };

  type PerformerPayload = {
    tags: string[];
    foreignId: string;
    searchOnAdd: boolean;
    qualityProfileId: number;
    rootFolderPath: string;
    monitored: boolean;
  };

  type StudioPayload = {
    foreignId: string;
    searchOnAdd: boolean;
    qualityProfileId: number;
    rootFolderPath: string;
    monitored: boolean;
    tags: string[];
  };

  type ExclusionPayload = {
    foreignId: string;
    movieTitle: string;
    movieYear: number;
  };

  type CommandPayload = {
    name: string;
    movieIds: number[];
  };

  type Quality = {
    id: number;
    name: string;
    source: string;
    resolution: number;
  };

  type QualityItem = {
    quality?: Quality;
    items: QualityItem[];
    allowed: boolean;
    name?: string;
    id?: number;
  };

  type Language = {
    id: number;
    name: string;
  };

  type FormatItem = unknown;

  type QualityProfile = {
    name: string;
    upgradeAllowed: boolean;
    cutoff: number;
    items: QualityItem[];
    minFormatScore: number;
    cutoffFormatScore: number;
    formatItems: FormatItem[];
    language: Language;
    id: number;
  };

  type RootFolder = {
    path: string;
    accessible: boolean;
    freeSpace: number;
    unmappedFolders: UnmappedFolder[];
    id: number;
  };

  type UnmappedFolder = {
    name: string;
    path: string;
    relativePath: string;
  };

  type WhisparrPerformer = {
    fullName: string;
    gender: string;
    hairColor: string;
    ethnicity: string;
    status: string;
    careerStart: number;
    foreignId: string;
    images: [
      {
        coverType: string;
        url: string;
        remoteUrl: string;
      },
    ];
    monitored: boolean;
    rootFolderPath: string;
    qualityProfile: string;
    searchOnAdd: boolean;
    tags: string[];
    added: string;
    id: number;
  };

  type WhisparrStudio = {
    foreignId: string;
    id: number;
    monitored: boolean;
    network: string;
    qualityProfileId: number;
    rootFolderPath: string;
    searchOnAdd: boolean;
    title: string;
  };

  type ExclusionList = Exclusion[];

  type Exclusion = {
    foreignId: string;
    movieTitle: string;
    movieYear: number;
    id: number;
  };

  type SystemStatus = {
    appName: string;
    instanceName: string;
    version: string;
    buildTime: string;
    isDebug: boolean;
    isProduction: boolean;
    isAdmin: boolean;
    isUserInteractive: boolean;
    startupPath: string;
    appData: string;
    osName: string;
    osVersion: string;
    isNetCore: boolean;
    isLinux: boolean;
    isOsx: boolean;
    isWindows: boolean;
    isDocker: boolean;
    mode: string;
    branch: string;
    databaseType: string;
    databaseVersion: string;
    authentication: string;
    migrationVersion: number;
    urlBase: string;
    runtimeVersion: string;
    runtimeName: string;
    startTime: string;
    packageVersion: string;
    packageAuthor: string;
    packageUpdateMechanism: string;
  };
}
