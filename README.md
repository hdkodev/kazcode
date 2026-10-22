# KazCode

KazCode is a small esoteric programming language. It is based on Brainfuck and works in a similar way. A program moves a pointer along a tape of memory cells, changes the values in those cells, and reads or writes data.

KazCode adds a few extra features that Brainfuck does not have, such as a data stack and a call stack.

## Tokens

Every token is a short group of the letters K, a and z. Tokens are separated by spaces.

## Tape and Pointer

| Token | Meaning |
| --- | ---|
| K | Move the pointer one cell to the right |
| a | Move the pointer one cell to the left |
| z | Add 1 to the current cell |
| Ka | Subtract 1 from the current cell |
| Kz | Write the current cell to the output |

## Input

| Token | Meaning |
| --- | ---|
| aK | Read one byte of input into the current cell. Reads 0 when input is finished |

## Loops

| Token | Meaning |
| --- | ---|
| az | If the current cell is 0, jump forward to the matching zK |
| zK | If the current cell is not 0, jump back to the matching az |

## Data Stack

| Token | Meaning |
| --- | ---|
| za | Push the current cell onto the data stack |
| Kaz | Pop a value from the data stack into the current cell |
| Kza | Copy the top value of the data stack and push the copy |
| azK | Swap the top two values of the data stack |
| aZk | Pop a value from the data stack and throw it away |

## Calls

| Token | Meaning |
| --- | ---|
| zKa | Call. Save the current position and jump to the cell value modulo program length |
| zaK | Return. Jump back to the saved position, or end the program if there is none |

## Usage (Javascript)

```
js
const { runKazCode } = require("./KC interpreter.js");

const code = "z z z z Kz";
const text = runKazCode(code);
console.log(text); // prints a character
```

The function runKazCode(source, options) takes the program as a string and returns the output as text. If returnBytes is true, it returns the raw output bytes instead.

Input is read as UTF-8 bytes.

### License and Copyright

Copyright (C) 2026 Nakano

This program is free software: you can redistribute it and or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, version 3 of the License.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY, without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see https://www.gnu.org/licenses/
