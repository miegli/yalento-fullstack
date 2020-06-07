import {Config} from "../environment";

export interface CommandInterface {

  readonly config: Config;

  start(): void;

  stop(): void;

}
