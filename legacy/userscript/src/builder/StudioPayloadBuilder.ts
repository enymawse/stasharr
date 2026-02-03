import { Whisparr } from '../types/whisparr';

export class StudioPayloadBuilder {
  payload: Whisparr.StudioPayload;
  constructor() {
    this.payload = {
      tags: [],
      foreignId: '',
      searchOnAdd: false,
      qualityProfileId: 0,
      rootFolderPath: '',
      monitored: false,
    };
  }

  setTags(tags: number[]) {
    this.payload.tags = tags;
    return this;
  }

  setForeignId(foreignId: string) {
    this.payload.foreignId = foreignId;
    return this;
  }

  setSearchOnAdd(searchOnAdd: boolean) {
    this.payload.searchOnAdd = searchOnAdd;
    return this;
  }

  setQualityProfileId(qualityProfileId: number) {
    this.payload.qualityProfileId = qualityProfileId;
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

  build() {
    return this.payload;
  }
}
