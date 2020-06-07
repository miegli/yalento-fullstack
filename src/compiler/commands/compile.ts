import {CommandInterface} from "./command-interface";
import {Config} from "../environment";

const {fork} = require('child_process');

export class Compile implements CommandInterface {

  readonly config: Config;
  private forks: any[] = [];

  constructor(config: Config) {
    this.config = config;
  }

  start(): Promise<void> {
    return this.generateApi();
  }

  stop(): void {
    this.forks.forEach((ps: any) => ps.kill('SIGHUP'));
    this.forks = [];
  }

  private generateApi(): Promise<void> {
    return new Promise((resolve) => {
      const forked = fork(this.config.__codeGenForkPath, [], {
        execArgv: ['--expose-gc'],
        stdio: 'inherit'
      });
      this.forks.push(forked);
      forked.on('close', () => {
        resolve();
      })
    })

  }

}
