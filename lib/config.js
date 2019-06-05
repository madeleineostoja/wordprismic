const path = require('path');
const app = require('commander');
const chalk = require('chalk');
const { version } = require('../package.json');

app
  .version(version)
  .option('-c, --config <file path>', 'path to your import config file')
  .option(
    '-d, --dest <folder path>',
    'where to save the folder of new content, defaults to current directory'
  )
  .parse(process.argv);

const config = app.config
  ? require(path.join(process.cwd(), app.config))
  : null;

try {
  if (!app.config) {
    throw new Error('Please provide a config file');
  }

  if (app.config && !config) {
    throw new Error(
      `Couldn't find a valid config file at the location provided`
    );
  }
} catch (e) {
  console.log(chalk.red(e));
}

module.exports = {
  config,
  dest: app.dest || './'
};
