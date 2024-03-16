import Handlebars from "handlebars";

class User {
  constructor(name) {
    this.name = name;
  }
}

const user = new User("Jane");
const templateFn = Handlebars.compile(`Hello, {{name}}!`);
const result = templateFn(user);
console.log(result);
