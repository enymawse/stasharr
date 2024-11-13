import { Whisparr } from "../types/whisparr";

export class CommandPayloadBuilder {
  payload: Whisparr.CommandPayload;
  constructor() {
    this.payload = {
      name: "",
      movieIds: [],
    };
  }

  setName(name: string) {
    this.payload.name = name;
    return this;
  }

  setMovieIds(movieIds: number[]) {
    this.payload.movieIds = movieIds;
    return this;
  }

  build() {
    return this.payload;
  }
}
