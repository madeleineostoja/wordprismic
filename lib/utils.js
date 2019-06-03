const fetch = require('node-fetch');
const Prismic = require('prismic-javascript');
const chalk = require('chalk');
const { exec } = require('child_process');
const {
  wordpressUrl,
  prismicRepo,
  prismicCategories
} = require('./config').config;

const WP_API = `${wordpressUrl}/wp-json/wp/v2`,
  HTML_PARSER = `${__dirname}/htmlParser.rb`;

/**
 * Helper function to fetch paginated WP data
 * @param {string} resource REST resource to get
 * @param {number} page Current page, called recursively
 */
async function getAllWp(resource, page = 1) {
  const baseQuery = `${WP_API}/${resource}?per_page=100`,
    totalPages = await fetch(baseQuery, { mode: 'headers' }).then(response =>
      response.headers.get('x-wp-totalpages')
    ),
    getPage = async page => {
      console.log(
        chalk.gray(
          `Fetching ${page > 1 ? `page ${page} of ` : ``}${resource}...`
        )
      );
      return await fetch(`${baseQuery}&page=${page}`).then(response => {
        return response.json();
      });
    },
    resources = await getPage(page);

  while (page < totalPages) {
    page++;
    Array.prototype.push.apply(resources, await getPage(page));
  }

  return resources;
}

async function getSingleWp(resource, id) {
  return await fetch(`${WP_API}/${resource}/${id}`).then(response => {
    if (!response.ok) {
      throw new Error(
        `Fetching ${resource} ${id} failed with code ${response.status}`
      );
    }
    response.json();
  });
}

async function htmlParser(html) {
  return await new Promise((resolve, reject) => {
    exec(
      `ruby ${HTML_PARSER} ${JSON.stringify(html.replace(/\r?\n|\r/g, ''))}`,
      (err, stdout) => {
        err && reject(err);
        resolve(JSON.parse(stdout));
      }
    );
  });
}

/**
 * Map Wordpress categories to Prismic topic documents
 */
async function mapCategories() {
  const prismic = await Prismic.getApi(
      `https://${prismicRepo}.prismic.io/api/v2`
    ),
    prismicTopics = await prismic.query(
      Prismic.Predicates.at('document.type', prismicCategories)
    ),
    wpCategories = await getAllWp('categories');

  return wpCategories.map(wpCategory => {
    const prismicTopic = prismicTopics.results.find(
      topic => wpCategory.slug === topic.uid
    );

    return {
      wordpress: wpCategory,
      ...(prismicTopic && { prismic: prismicTopic })
    };
  });
}

module.exports = {
  getAllWp,
  getSingleWp,
  htmlParser,
  mapCategories
};
