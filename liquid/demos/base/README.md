The simple templates in this folder show how the Liquid handler will resolve [partials](https://liquidjs.com/tutorials/partials-and-layouts.html): templates that can be called by other templates.

Example: invoking the hello.liquid template will in turn invoke the bold.liquid partial template:

```console
$ ori hello.liquid/
<html>
  <body>
Hello
  </body>
</html>
```
