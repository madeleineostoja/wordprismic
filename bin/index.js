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
const { config, output } = require('../lib/config');

(async () => {
  const { schema } = config;

  console.log(chalk.yellow('Downloading content'));

  const users = await getAllWp('users'),
    posts = await getAllWp('posts'),
    topics = await mapCategories(),
    featuredMedias = await getSomeWp(
      'media',
      posts.map(post => post.featured_media)
    );

  console.log(chalk.yellow('Parsing content'));

  Promise.all(
    posts.map(async post => {
      const { featured_media, author, categories } = post,
        featuredMedia = featuredMedias.find(media => {
          return media.id === featured_media;
        });

      Object.assign(post, {
        featured_media: !!featuredMedia ? featuredMedia : null,
        author: users.find(user => user.id === author),
        categories: categories.map(category =>
          topics.find(topic => topic.wordpress.id === category)
        )
      });

      return await schema(post, htmlParser);
    })
  )
    .then(posts => {
      fs.writeFile(
        path.join(process.cwd(), output),
        JSON.stringify(posts, null, 2),
        'utf8',
        () => {
          console.log(chalk.green(`Finished! Saved to ${output}`));
        }
      );
    })
    .catch(err => console.log(chalk.red(err)));
})();
