#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const uuid = require('uuid/v4');
const { getAllWp, mapCategories, html } = require('../lib/utils');
const { config, dest } = require('../lib/config');

const OUTPUT_FOLDER = 'wordprismic-import',
  OUTPUT_PATH = path.join(process.cwd(), `${dest}${OUTPUT_FOLDER}`);

(async () => {
  const { schema, optimizeMediaRequests } = config;

  console.log(chalk.yellow('Downloading content'));

  const users = await getAllWp('users'),
    posts = await getAllWp('posts'),
    topics = await mapCategories(),
    featuredMedias = optimizeMediaRequests
      ? await getAllWp(
          'media',
          `include=${posts.map(post => post.featured_media).join(',')}`
        )
      : await getAllWp('media'),
    parsePost = async post => {
      const { featured_media, author, categories } = post;

      Object.assign(post, {
        featured_media: featuredMedias.find(
          media => media.id === featured_media
        ),
        author: users.find(user => user.id === author),
        categories: categories.map(category =>
          topics.find(topic => topic.wordpress.id === category)
        )
      });

      return await schema(post, html);
    },
    writePost = post =>
      new Promise((resolve, reject) => {
        fs.writeFile(
          `${OUTPUT_PATH}/new_${uuid()}_${config.prismic.locale}.json`,
          JSON.stringify(post, null, 2),
          err => {
            err && reject(err);
            resolve();
          }
        );
      });

  console.log(chalk.yellow('Parsing content'));

  Promise.all(posts.map(parsePost))
    .then(posts => {
      console.log(chalk.yellow('Writing files'));
      !fs.existsSync(OUTPUT_PATH) && mkdirp.sync(OUTPUT_PATH);
      return Promise.all(posts.map(writePost));
    })
    .then(() =>
      console.log(
        chalk.green(
          `Finished! Compress the folder at ${dest}${OUTPUT_FOLDER} into a zip and import to Prismic`
        )
      )
    )
    .catch(err => console.log(chalk.red(err)));
})();
