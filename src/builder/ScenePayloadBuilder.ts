import { Whisparr } from '../types/whisparr';

export class ScenePayloadBuilder {
  payload: Whisparr.MoviePayload;
  constructor() {
    this.payload = {
      title: '',
      studio: '',
      foreignId: '',
      rootFolderPath: '',
      monitored: true,
      addOptions: { searchForMovie: true },
      qualityProfileId: 0,
    };
  }

  setTitle(title: string) {
    this.payload.title = title;
    return this;
  }

  setStudio(studio: string) {
    this.payload.studio = studio;
    return this;
  }

  setForeignId(foreignId: string) {
    this.payload.foreignId = foreignId;
    return this;
  }

  setRootFolderPath(rootFolderPath: string) {
    this.payload.rootFolderPath = rootFolderPath;
    return this;
  }

  setMonitored(monitored: boolean) {
    this.payload.monitored = monitored;
    return this;
  }

  setSearchForMovie(searchForMovie: boolean) {
    this.payload.addOptions.searchForMovie = searchForMovie;
    return this;
  }

  setQualityProfileId(qualityProfileId: number) {
    this.payload.qualityProfileId = qualityProfileId;
    return this;
  }

  build() {
    return this.payload;
  }
}
