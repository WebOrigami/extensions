import exifParser from "exif-parser";

// Given a Buffer containing image data, return the Exif metadata.
export default async function exif(buffer) {
  const parser = exifParser.create(buffer);
  parser.enableTagNames(true);
  parser.enableSimpleValues(true);
  const parsed = await parser.parse();
  // Convert an exif-parser result to a plain object.
  const plain = Object.assign({}, parsed);
  if (typeof parsed.tags?.ModifyDate === "number") {
    // exif-parser says it tries to convert dates to JavaScript Date objects,
    // but it looks like that doesn't always work. If the date's a number,
    // convert it to a Date object.
    plain.tags.ModifyDate = new Date(parsed.tags.ModifyDate * 1000);
  }
  return plain;
}
