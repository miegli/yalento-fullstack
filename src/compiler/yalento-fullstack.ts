import {Environment} from "./environment";
import {Compile} from "./commands/compile";

const {fork} = require('child_process');
const path = require('path');
const fs = require('fs');
const {createCommand} = require('commander');
const program = createCommand();
const environment = new Environment();
const chalk = require('chalk');

program
  .version('0.0.1')
program
  .command('compile')
  .option("--watch", "Compile in live-relad mode.")
  .option("--test", "Compile in testing mode.")
  .option("--no-progress", "Disable progress log.")
  .action(async (env) => {

    let forked: any = null;
    let config = await environment.getConfig(!!env.test);

    let compiler = new Compile(config);
    console.clear();
    console.log(chalk.white('Compiling..'));

    compiler.start().then(() => {
      if (!env.watch && !env['progress']) {
        console.clear();
        console.log(chalk.green('Complete'));
        process.exit(0);
      }
      if (env.watch) {
        console.clear();
        console.log(chalk.yellow('Idle'));
      }
    });


    if (env.watch) {
      const files = [config.__firebasePath, config.__firebaseRcPath, config.__swaggerPath];
      for (let i = 0; i < files.length; i++) {
        fs.watchFile(files[i], (curr, prev) => {
          console.clear();
          console.log(chalk.yellow(path.basename(files[i] + ' changed, re-compiling..')));
          setTimeout(() => {
            compiler.stop();
            if (forked) {
              forked.kill('SIGHUP');
            }
            forked = fork('./lib/compiler/yalento-fullstack', ['compile', 'no-progress']);
            forked.on('close', () => {
              console.clear();
              console.log(chalk.yellow('Idle'));
            })
          }, 1000);

        });
      }
    }


  }).on('--help', function () {
  console.log('');
  console.log('Examples:');
  console.log('');
  console.log('  $ compile --watch');
  console.log('  $ compile');
});

program.parse(process.argv);
