import "@violentmonkey/types";

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
    ratings: Record<string, any>;
    credits: any[];
    itemType: string;
  };

  type WhisparrScene = {
    foreignId: string;
    movie: Movie;
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

  type FormatItem = {};

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
}
