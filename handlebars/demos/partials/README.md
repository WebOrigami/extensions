The simple templates in this folder show how the Handlebars handler will resolve [partials](https://handlebarsjs.com/guide/partials.html): templates that can be called by other templates.

Example: invoking the greet.hbs Handlebars template will in turn invoke the bold.hbs partial template:

```console
$ ori greet.hbs/Carol
Hello, <b>Carol</b>!
```
