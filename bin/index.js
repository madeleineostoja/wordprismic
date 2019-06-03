const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const {
  getAllWp,
  getSingleWp,
  mapCategories,
  htmlParser
} = require('../lib/utils');
const { config, output } = require('../lib/config');

(async () => {
  const { schema } = config;

  console.log(chalk.yellow('Downloading content'));

  const posts = await getAllWp('posts');
  const users = await getAllWp('users');
  const topics = await mapCategories();

  console.log(chalk.yellow('Parsing content'));

  Promise.all(
    posts.map(async post => {
      let featuredMedia;

      if (post.featured_media) {
        try {
          featuredMedia = await getSingleWp('media', post.featured_media);
        } catch (e) {
          console.warn(chalk.red(e));
        }
      }

      Object.assign(post, {
        featured_media: featuredMedia ? featuredMedia.guid.rendered : '',
        author: users.find(user => user.id === post.author),
        categories: post.categories.map(category =>
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
