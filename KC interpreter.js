// Copyright © 2026 Nakano

const VALID_TOKENS = new Set([
  "K", "a", "z",
  "Ka", "Kz", "aK", "az", "zK", "za",
  "Kaz", "Kza", "aKz", "azK", "zKa", "zaK",
]);

function encodeUtf8(str) {
  if (typeof TextEncoder !== "undefined") {
    return Array.from(new TextEncoder().encode(str));
  }
  const bytes = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) {
      bytes.push(cp);
    } else if (cp < 0x800) {
      bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    }
  }
  return bytes;
}

function decodeUtf8(bytes) {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder("utf-8").decode(Uint8Array.from(bytes));
  }
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i];
    let cp, len;
    if (b0 < 0x80) { cp = b0; len = 1; }
    else if ((b0 & 0xe0) === 0xc0) { cp = b0 & 0x1f; len = 2; }
    else if ((b0 & 0xf0) === 0xe0) { cp = b0 & 0x0f; len = 3; }
    else if ((b0 & 0xf8) === 0xf0) { cp = b0 & 0x07; len = 4; }
    else { out += "\uFFFD"; i++; continue; }

    let valid = i + len <= bytes.length;
    for (let k = 1; valid && k < len; k++) {
      const b = bytes[i + k];
      if ((b & 0xc0) !== 0x80) { valid = false; break; }
      cp = (cp << 6) | (b & 0x3f);
    }
    if (valid) {
      if (
        (len === 2 && cp < 0x80) ||
        (len === 3 && cp < 0x800) ||
        (len === 4 && cp < 0x10000) ||
        cp > 0x10ffff ||
        (cp >= 0xd800 && cp <= 0xdfff)
      ) {
        valid = false;
      }
    }
    if (!valid) { out += "\uFFFD"; i++; continue; }
    out += String.fromCodePoint(cp);
    i += len;
  }
  return out;
}

function runKazCode(source, options = {}) {
  const {
    input = "",
    lenient = false,
    maxSteps = 1e7,
    returnBytes = false,
  } = options;

  const program = [];
  const rawTokens = String(source).split(/\s+/).filter((t) => t.length > 0);

  for (let i = 0; i < rawTokens.length; i++) {
    const tok = rawTokens[i];
    if (!VALID_TOKENS.has(tok)) {
      if (!lenient) throw new SyntaxError(`Invalid Kaz token "${tok}" at ${i}`);
      continue;
    }
    program.push(tok);
  }

  const match = new Array(program.length).fill(-1);
  const bracketStack = [];

  for (let i = 0; i < program.length; i++) {
    const op = program[i];
    if (op === "az") {
      bracketStack.push(i);
    } else if (op === "zK") {
      if (bracketStack.length === 0) {
        if (!lenient) throw new SyntaxError(`Unmatched zK at ${i}`);
      } else {
        const open = bracketStack.pop();
        match[open] = i;
        match[i] = open;
      }
    }
  }

  if (bracketStack.length > 0) {
    if (!lenient) {
      throw new SyntaxError(
        `Unmatched az at ${bracketStack[bracketStack.length - 1]}`
      );
    }
    for (const open of bracketStack) match[open] = program.length - 1;
  }

  const tape = new Map();
  let ptr = 0;

  const dataStack = [];
  const callStack = [];
  const output = [];

  const inputBytes = encodeUtf8(input);
  let inputPos = 0;

  const getCell = () => tape.get(ptr) ?? 0;
  const setCell = (v) => tape.set(ptr, ((v % 256) + 256) % 256);

  let pc = 0;
  let steps = 0;

  while (pc < program.length) {
    if (++steps > maxSteps) throw new Error("Step limit exceeded");

    const op = program[pc++];

    switch (op) {
      case "K": ptr++; break;
      case "a": ptr--; break;
      case "z": setCell(getCell() + 1); break;
      case "Ka": setCell(getCell() - 1); break;
      case "Kz": output.push(getCell()); break;
      case "aK":
        setCell(inputPos < inputBytes.length ? inputBytes[inputPos++] : 0);
        break;
      case "az":
        if (getCell() === 0) pc = match[pc - 1] + 1;
        break;
      case "zK":
        if (match[pc - 1] !== -1 && getCell() !== 0) pc = match[pc - 1];
        break;

      case "za":
        dataStack.push(getCell());
        break;

      case "Kaz":
        if (dataStack.length === 0) {
          if (!lenient) throw new Error("Data stack underflow");
          setCell(0);
        } else {
          setCell(dataStack.pop());
        }
        break;

      case "Kza":
        if (dataStack.length === 0) {
          if (!lenient) throw new Error("Data stack underflow");
          dataStack.push(0);
        } else {
          dataStack.push(dataStack[dataStack.length - 1]);
        }
        break;

      case "aKz": {
        if (dataStack.length < 2) {
          if (!lenient) throw new Error("Data stack underflow");
          while (dataStack.length < 2) dataStack.unshift(0);
        }
        const i = dataStack.length - 1;
        const tmp = dataStack[i];
        dataStack[i] = dataStack[i - 1];
        dataStack[i - 1] = tmp;
        break;
      }

      case "azK":
        if (dataStack.length === 0) {
          if (!lenient) throw new Error("Data stack underflow");
        } else {
          dataStack.pop();
        }
        break;

      case "zKa":
        callStack.push(pc);
        pc = program.length ? getCell() % program.length : 0;
        break;

      case "zaK":
        if (callStack.length === 0) pc = program.length;
        else pc = callStack.pop();
        break;

      default:
        throw new SyntaxError(`Unknown op: "${op}"`);
    }
  }

  if (returnBytes) return output;
  return decodeUtf8(output);
}