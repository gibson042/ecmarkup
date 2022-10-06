import { LineBuilder } from './line-builder';
const entities = require('../../entities-processed.json');

function isBadNumericReference(codePoint: number) {
  // https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
  if (
    // NULL character
    !codePoint ||
    // out of range
    codePoint > 0x10ffff ||
    // surrogate
    (0xd800 <= codePoint && codePoint <= 0xdfff) ||
    // noncharacter
    (0xfdd0 <= codePoint && codePoint <= 0xfdef) ||
    (codePoint & 0xfffe) === 0xfffe ||
    // control character (but without exceptions for tab/line feed/form feed/space)
    (0 <= codePoint && codePoint <= 0x1f) ||
    (0x7f <= codePoint && codePoint <= 0x9f)
  ) {
    return true;
  }
  return false;
}

export function printText(text: string, indent: number): LineBuilder {
  const output: LineBuilder = new LineBuilder(indent);
  if (text === '') {
    return output;
  }
  text = text.replace(/&(?:[a-zA-Z0-9]+|#[Xx]([0-9a-fA-F]+)|#([0-9]+));?/g, (m, hex, decimal) => {
    if (hex || decimal) {
      // pass through bad references,
      // normalize '&' and '<' into named references,
      // and transform everything else
      const codePoint = parseInt(hex || decimal, hex ? 16 : 10);
      if (isBadNumericReference(codePoint)) {
        return m;
      }
      const ch = String.fromCodePoint(codePoint);
      if (ch === '&') {
        return '&amp;';
      } else if (ch === '<') {
        return '&lt;';
      }
      return ch;
    }

    // entities[m] is null if the entity expands to '&', '<', or a string which has blank/control/etc characters
    if ({}.hasOwnProperty.call(entities, m) && entities[m] !== null) {
      return entities[m];
    }
    const lower = m.toLowerCase();
    if (lower === '&lt;' || lower === '&amp;') {
      return lower;
    } else if (lower === '&lt' || lower === '&amp') {
      return lower + ';';
    }
    return m;
  });

  const leadingSpace = text[0] === ' ' || text[0] === '\t';
  const trailingSpace = text[text.length - 1] === ' ' || text[text.length - 1] === '\t';

  const lines = text.split('\n').map(l => l.trim());

  if (leadingSpace) {
    output.appendText(' ');
  }
  if (lines.length === 1) {
    if (lines[0] !== '') {
      output.appendText(lines[0]);
      if (trailingSpace) {
        output.appendText(' ');
      }
    }
    return output;
  }
  for (let i = 0; i < lines.length - 1; ++i) {
    output.appendText(lines[i]);
    output.linebreak();
  }
  output.appendText(lines[lines.length - 1]);
  if (trailingSpace && output.last !== '') {
    output.appendText(' ');
  }

  return output;
}
