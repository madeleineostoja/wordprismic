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
          `include=${posts.map((post) => post.featured_media).join(',')}`
        )
      : await getAllWp('media'),
    parsePost = async (post) => {
      const { featured_media, author, categories } = post;

      Object.assign(post, {
        featured_media: featuredMedias.find(
          (media) => media.id === featured_media
        ),
        author: users.find((user) => user.id === author),
        categories: categories.map((category) =>
          topics.find((topic) => topic.wordpress.id === category)
        ),
      });

      return await schema(post, html);
    },
    writePost = (post) =>
      new Promise((resolve, reject) => {
        fs.writeFile(
          `${OUTPUT_PATH}/new_${uuid()}_${config.prismic.locale}.json`,
          JSON.stringify(post, null, 2),
          (err) => {
            err && reject(err);
            resolve();
          }
        );
      });

  console.log(chalk.yellow('Parsing content'));

  async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }
  console.log(chalk.yellow('Writing files'));
  !fs.existsSync(OUTPUT_PATH) && mkdirp.sync(OUTPUT_PATH);
  asyncForEach(posts, async (post) => {
    try {
      const aParsedPost = await parsePost(post);
      await writePost(aParsedPost);
    } catch (error) {
      console.log(chalk.red(error));
    }
  });

  console.log(
    chalk.green(
      `Finished! Compress the folder at ${dest}${OUTPUT_FOLDER} into a zip and import to Prismic`
    )
  );
})();
