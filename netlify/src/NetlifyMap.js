import { SiteMap } from "@weborigami/async-tree";

export default class NetlifyMap extends SiteMap {
  /**
   *
   * @param {{ projectId: string, projectName: string, token: string|Uint8Array }} options
   */
  constructor(options) {
    const href = `https://${options.projectName}.netlify.app`;
    super(href);
    this.projectId = options.projectId;
    this.projectName = options.projectName;
    this.token = options.token;
  }
}
