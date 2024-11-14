import { Whisparr } from "../types/whisparr";

export class ExclusionPayloadBuilder {
  payload: Whisparr.ExclusionPayload;
  constructor() {
    this.payload = {
      foreignId: "",
      movieTitle: "MovieTitle",
      movieYear: 1,
    };
  }

  setForeignId(foreignId: string) {
    this.payload.foreignId = foreignId;
    return this;
  }

  setMovieTitle(movieTitle: string) {
    this.payload.movieTitle = movieTitle;
    return this;
  }

  setMovieYear(movieYear: number) {
    this.payload.movieYear = movieYear;
    return this;
  }

  build() {
    return this.payload;
  }
}
