import {Environment} from './environment';
import {Compile} from './commands/compile';

const {fork} = require('child_process');
const path = require('path');
const fs = require('fs');
const {createCommand} = require('commander');
const program = createCommand();
const environment = new Environment();
const chalk = require('chalk');


if (process.env.PWD) {
  const functionsPath = `functions${path.sep}node_modules${path.sep}yalento-fullstack`;
  if (process.env.PWD.substr(-1 * functionsPath.length) === functionsPath) {
    process.exit(0);
  }
}

program
  .version('0.0.1');
program
  .command('compile')
  .option('--watch', 'Compile in live-relad mode.')
  .option('--test', 'Compile in testing mode.')
  .option('--no-progress', 'Disable progress log.')
  .action(async (env: any) => {

    let forked: any = null;
    const config = await environment.getConfig(!!env.test);

    const compiler = new Compile(config);
    console.clear();
    console.log(chalk.white('Compiling..'));

    compiler.start().then(() => {
      if (!env.watch && !env.progress) {
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
      let isRunning = false;
      const files = [config.__firebasePath, config.__firebaseRcPath, config.__swaggerPath];
      for (const file of files) {
        fs.watchFile(file, (curr, prev) => {

          console.clear();
          console.log(chalk.yellow(path.basename(file + ' changed, re-compiling..')));
          compiler.stop();
          if (forked) {
            forked.kill('SIGHUP');
          }
          setTimeout(() => {
            if (!isRunning) {
              forked = fork('node_modules/yalento-fullstack/lib/compiler/yalento-fullstack', ['compile', 'no-progress']);
              isRunning = true;
              forked.on('close', () => {
                isRunning = false;
                console.clear();
                console.log(chalk.yellow('Idle'));
              });
            }
          }, 500);
        });
      }
    }


  }).on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('');
  console.log('  $ compile --watch');
  console.log('  $ compile');
});

program.parse(process.argv);
