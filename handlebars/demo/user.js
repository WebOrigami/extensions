class User {
  constructor(name) {
    this.name = name;
  }
}

export default (name) => new User(name);
