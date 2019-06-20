# Wordprismic

[![npm](https://img.shields.io/npm/v/wordprismic.svg)](https://npmjs.com/package/wordprismic)

Wordprismic is a small and fully configurable Node utility for importing existing Wordpress blogs into the [Prismic.io](https://prismic.io) content platform.


## Requirements

Make sure you meet the following requirements before using the importer:

- Wordpress's REST API enabled (included and auto-enabled in core from WP 4.4+)
- Both Node 7.6+ and Ruby installed
- Any Wordpress plugins that add or change content models (eg: Advanced Custom Fields, YOAST, etc) hooked up to the REST API, via plugins or otherwise

## Configuration

Create a JavaScript configuration file with the following properties

Property                            | Description
------------------------------------|----------------------------------------------------------------------------------------------------------------------------------
`wordpress.url`                     | The full URL of your wordpress blog
`prismic.repo`                      | The name of your Prismic repository
`prismic.locale`                    | The locale of language locale of your imported documents in Prismic (see Settings -> Translations & locales)
`prismic.categoriesType` (optional) | The content type of post categories in prismic, if available
`optimizeMediaRequests` (optional)  | Whether to attempt to only fetch required media assets. Shortens import time, but can cause 503 errors on some Wordpress servers.
`schema`                            | A function to transform Wordpress data to your Prismic content model, see documentation below

```js
module.exports = {
  wordpress: {
    url: 'https://myblog.com'
  },
  prismic: {
    repo: 'myNewBlog',
    locale: 'en-au',
    categoriesType: 'category'
  },
  optimizeMediaRequests: false,
  schema: async function(post, html) {
    return {
      type: 'post',
      uid: post.slug,
      category: {
        id: post.categories[0].prismic.id,
        mask: 'category'
      },
      author: post.author.name,
      title: html.decode(post.title.rendered),
      featured_image: {
        origin: {
          url: post.featured_media.guid.rendered
        },
        alt: post.featured_media.alt_text
      },
      excerpt: await html.parse(post.excerpt.rendered),
      content: await html.parse(post.content.rendered)
    };
  }
};
```

### Defining your schema

The config schema describes how your Wordpress posts map to your Prismic content model. It's written as a function that is given two paramaters:
  1. The imported post from Wordpress
  2. Helper functions `html.parse()`, which creates Prismic RichText objects out of HTML strings, and `html.decode()`, which decodes HTML strings with entities

See the Wordpress [Posts API Reference](https://developer.wordpress.org/rest-api/reference/posts/#schema) for all properties available on the `post` object provided. However, the following properties on `post` have been **changed by Wordprismic**:
- `author` is the full [user object](https://developer.wordpress.org/rest-api/reference/users/#schema), rather than just the ID
- `featured_media` is the [media object](https://developer.wordpress.org/rest-api/reference/media/#schema) object of the asset, rather than just the ID
- Each item in `categories` has been populated with a matching Prismic category if it's available (from `prismicCategories` type in config) as follows: `{ wordpress: [category], prismic: [document] }`

The `html.parse()` function is **asynchronous**, so make sure you `await` it and flag your schema as `async`.

## Importing

You can now run the importer directly from NPM, with the following arguments

Argument          | Description
------------------|-------------------------------------------------------------------------
`--config` (`-c`) | Path to your config file
`--dest` (`-d`)   | Location to save zip archive for imorting, defaults to current directory

```sh
npx wordprismic -c ./path/to/config.js
```

Or if you'd prefer, install the module globally first

```sh
npm i -g wordprismic

wordprismic -c ./path/to/config.js
```

Your new Prismic posts will be saved to in a folder called `wordprismic-import`. Compress the **contents** (not the folder itself) to a `.zip` archive, then import it to Prismic.

---

© MIT [Tomorrow](https://www.tomorrowstudio.co)
