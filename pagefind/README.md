This [Origami](https://weborigami.org) extension lets static sites offer a full-text search feature via [Pagefind](https://pagefind.app). Pagefind indexes your site’s content at build time to generate a folder containing search index files along with elements that can be used to provide a search user interface using those search indexes.

The [Cherokee Myths](https://github.com/WebOrigami/cherokee-myths) sample site demonstrates using this extension to provide full-text search for a collection of text stories.

## Usage

1. Add this `@weborigami/pagefine` extension to your Origami project's dependencies and `npm install`.
2. Add a link to your site's definition to invoke Pagefind. Pass in the tree of content you would like it to index; see below for how to do this.
3. Add a search page like `search.html` to your site. This page will need to reference the Pagefind CSS and JavaScript files. It will also need to define a search box element, add an event handler to upgrade that element on page load to a useable search box.

```html
<!DOCTYPE html>
<html>
  <body>
    <link href="/pagefind/pagefind-ui.css" rel="stylesheet" />
    <script src="/pagefind/pagefind-ui.js"></script>
    <div id="search"></div>
    <script>
      window.addEventListener("DOMContentLoaded", (event) => {
        new PagefindUI({
          element: "#search",
          pageSize: 10,
          showImages: false,
          showSubResults: true,
        });
      });
    </script>
  </body>
</html>
```

The Pagefind site has more details on the [customizing the search UI](https://pagefind.app/docs/ui-usage/).

## Defining the tree of content you want to index

You will need to pass a single parameter to the `pagefind` extension to indicate the tree of content you want it to index.

- Your site may have index pages and other areas that would add unnecessary noise to search results.
- Because the resulting `pagefind/` folder will be part of your final site, you will want to avoid attempting to recursively index that folder.

The `pagefind` extension determines the path for each indexable page as it traverses the tree you give it.

It's not necessary to filter images and other resources out before passing them to `pagefind`; only HTML resources will be indexed.

### Passing specific areas to Pagefind

In simple cases like the Cherokee Myths sample, all the interesting searchable content is in the `stories` area, so we can include just that area in the call to the `pagefind` extension.

For the Cherokee Myths example linked above, the bare-bones version looks like:

```
{
  stories/ = <definitions of the stories area>
  pagefind/ = package:@weborigami/pagefind({ stories })
}
```

This tells Pagefind to index the `stories` area, since that's the only area of that site with content a user will want to search for.

The curly braces in `{ stories }` creates a small tree with one branch named "stories" containing all the content we want to index. This ensures that all the indexed content will begin with the path `stories/`, so that links in search results will go to the correct path.

If you were to omit the curly braces above and call `pagefind(stories)`, Pagefind would still index all the content, but the `stories/` segment would not be included in the path, so search result links wouldn’t work.

If you have multiple areas, you can pass them together:

```
  pagefind/ = package:@weborigami/pagefind({ blog, about })
```

During local development of your site, the above definition will regenerate the `pagefind` area each time you visit it. To avoid that, you can wrap the `pagefind/` definition in a call to the [once](https://weborigami.org/builtins/origami/once) builtin. This will only call Pagefind the first time any resource in the `pagefind/` area is requested.

```
  pagefind/ = once(() => package:@weborigami/pagefind({ stories }))
```

### Identifying the indexable parts of your site

If you have many things you'd like to include, it may be helpful to name all the indexable parts of your site as a [non-enumerable property](https://weborigami.org/language/syntax.html#non-enumerable-properties) of the site.

```
{
  // Everything a user might want to search for
  (indexable): {
    products: <definition of the products area>
    blog: <definition of the blog area>
    about: <definition of the about area>
  }
  
  // Merge all that indexable content into the site
  ...indexable
  
  // And also index all that content
  pagefind/ = once(() => package:@weborigami/pagefind(indexable))
}
```
