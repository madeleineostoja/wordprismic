#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const {
  getAllWp,
  getSomeWp,
  mapCategories,
  htmlParser
} = require('../lib/utils');
const { config, dest } = require('../lib/config');

const OUTPUT_FOLDER = 'wordprismic-import',
  OUTPUT_PATH = path.join(process.cwd(), `${dest}${OUTPUT_FOLDER}`);

(async () => {
  const { schema } = config;

  console.log(chalk.yellow('Downloading content'));

  const users = await getAllWp('users'),
    posts = await getAllWp('posts'),
    topics = await mapCategories(),
    featuredMedias = await getSomeWp(
      'media',
      posts.map(post => post.featured_media)
    ),
    parsePost = async post => {
      const { featured_media, author, categories } = post;

      console.log(featuredMedias.length);

      Object.assign(post, {
        featured_media: featuredMedias.find(
          media => media.id === featured_media
        ),
        author: users.find(user => user.id === author),
        categories: categories.map(category =>
          topics.find(topic => topic.wordpress.id === category)
        )
      });

      return await schema(post, htmlParser);
    },
    writePost = post =>
      new Promise((resolve, reject) => {
        fs.writeFile(
          `${OUTPUT_PATH}/${post.uid}.json`,
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
      console.log(chalk.yello('Writing files'));
      !fs.existsSync(OUTPUT_PATH) && fs.mkdirSync(OUTPUT_PATH);
      return Promise.all(posts.map(writePost));
    })
    .then(() =>
      console.log(
        chalk.green(
          `Finished! Zip the folder at ${dest}${OUTPUT_FOLDER} and import to Prismic`
        )
      )
    )
    .catch(err => console.log(chalk.red(err)));
})();
