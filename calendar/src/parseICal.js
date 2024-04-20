import { toString } from "@weborigami/origami";
import ICAL from "ical.js";

export default function parseICal(input) {
  const text = toString(input);
  const jcal = ICAL.parse(text);
  return jcal;
}
