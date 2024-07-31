import { ApiModel } from "@microsoft/api-extractor-model";

const apiModel = new ApiModel();
const apiPackage = apiModel.loadPackage("temp/tsapi.api.json");

function listMembers(thing, depth = 0) {
  for (const member of thing.members) {
    console.log("  ".repeat(depth) + member.displayName);
    listMembers(member, depth + 1);
  }
}

listMembers(apiPackage);
