const path = require('path');
const app = require('commander');
const chalk = require('chalk');
const { version } = require('../package.json');

app
  .version(version)
  .option('-c, --config <file path>', 'path to your import config file')
  .option(
    '-o, --output <file path>',
    'where to save the converted Prismic data'
  )
  .parse(process.argv);

const config = app.config
  ? require(path.join(process.cwd(), app.config))
  : null;

try {
  if (!app.config || !app.output) {
    throw new Error('Please provide both a config file and output location');
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
  output: app.output
};
