const fetch = require('node-fetch');
const Prismic = require('prismic-javascript');
const chalk = require('chalk');
const cheerio = require('cheerio');
const he = require('he');
const { exec } = require('child_process');
const { wordpress, prismic } = require('./config').config;

const WP_API = `${wordpress.url}/wp-json/wp/v2`,
  HTML_PARSER = `${__dirname}/htmlParser.rb`;

/**
 * Helper function to fetch paginated WP data
 * @param {string} resource REST resource to get
 * @param {number} page Current page, called recursively
 */
async function getAllWp(resource, queryParams) {
  let page = 1;

  const baseQuery = `${WP_API}/${resource}?per_page=100&${queryParams}`,
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
        if (!response.ok) {
          throw new Error(
            `Fetching ${resource} failed with code ${response.status}`
          );
        }
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

function htmlDecoder(html) {
  return he.decode(html);
}

async function htmlParser(html) {
  const $ = cheerio.load(html, { decodeEntities: true });
  let fixedHtml;

  $('blockquote')
    .children('h1, h2, h3, h4, h5, h6')
    .each((i, el) => {
      return $(el).replaceWith($(el).text());
    });

  $('span').each((i, el) => {
    return $(el).replaceWith($(el).text());
  });

  fixedHtml = $.html('body').replace(/<body>|<\/body>/g, '');

  return await new Promise((resolve, reject) => {
    exec(
      `ruby ${HTML_PARSER} ${JSON.stringify(
        fixedHtml.replace(/\r?\n|\r/g, '')
      )}`,
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
  const prismicApi = await Prismic.getApi(
      `https://${prismic.repo}.prismic.io/api/v2`
    ),
    prismicTopics = await prismicApi.query(
      Prismic.Predicates.at('document.type', prismic.categoriesType),
      { pageSize: 100 }
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
  html: {
    parse: htmlParser,
    decode: htmlDecoder
  },
  mapCategories
};
