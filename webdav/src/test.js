import VirtualAdapter from "@nephele/adapter-virtual";
// import ExampleAuthenticator from "@nephele/authenticator-example";
import ExampleAuthenticator from "@nephele/authenticator-none";
import express from "express";
import nepheleServer from "nephele";

const app = express();
const port = 8080;

app.use(
  "/",
  nepheleServer({
    adapter: new VirtualAdapter({
      files: {
        properties: {
          creationdate: new Date(),
          getlastmodified: new Date(),
          owner: "root",
        },
        locks: {},
        children: [
          {
            name: "someuser's stuff",
            properties: {
              creationdate: new Date(),
              getlastmodified: new Date(),
              owner: "someuser",
            },
            locks: {},
            children: [
              {
                name: "example.txt",
                properties: {
                  creationdate: new Date(),
                  getlastmodified: new Date(),
                  owner: "someuser",
                },
                locks: {},
                content: Buffer.from("Hello, world."),
              },
            ],
          },
        ],
      },
    }),
    authenticator: new ExampleAuthenticator(),
  })
);

app.listen(port, () => {
  console.log(`Nephele WebDAV server listening on port ${port}`);
});
