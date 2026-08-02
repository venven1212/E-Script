# E-script (Easy Script)

A small language that transpiles to JavaScript, designed to trim away the
punctuation and ceremony while keeping everything JS can do underneath.

## Install

### Option A — standalone binary (no Node required)

Like installing Node, Deno, or Bun itself: this downloads a single
self-contained `escript` executable with Node baked in, so people who don't
have Node/npm can still run it.

macOS / Linux:
```
curl -fsSL https://raw.githubusercontent.com/venven1212/E-Script/main/install.sh | sh
```

Windows (PowerShell):
```
irm https://raw.githubusercontent.com/venven1212/E-Script/main/install.ps1 | iex
```

Then:
```
escript run yourfile.es
```

(These point at https://github.com/venven1212/E-Script — see "Publishing"
below for how the binaries get built.)

### Option B — npm (if you already use Node)

```
npm install -g escript-lang
escript run yourfile.es
```

### Option C — from source

```
git clone <this repo>
cd E-script
node cli.js run demo.es      # compile + execute
node cli.js build demo.es    # compile to demo.js (plain Node, no E-script needed)
npm link                     # optional: get a global `escript` command
```

## Website

`docs/index.html` is a self-contained landing page with OS-aware download
buttons and install instructions. Enable it at Settings → Pages → Deploy
from a branch → `/docs`, and it's live at `https://venven1212.github.io/E-Script/`
(or wherever you point Render's Static Site at the `docs` folder).
Already wired to https://github.com/venven1212/E-Script.

## Publishing (maintainer notes)

- **npm**: bump the version in `package.json`, then `npm publish`.
- **Standalone binaries**: `npm run build:binary` uses Node's built-in
  Single Executable Application (SEA) support to produce a self-contained
  executable for the current platform (output in `dist/`). Pushing a tag
  like `v0.2.0` runs `.github/workflows/release.yml`, which builds binaries
  for Linux, macOS (Intel + Apple Silicon), and Windows, attaches them to a
  GitHub Release, and publishes to npm — that's what `install.sh` /
  `install.ps1` download from.

## Language tour

```
# comments start with # or //

let name = "Venny"          # let = mutable, const = constant
const pi = 3.14159

print("Hello, {name}!")     # double-quoted strings interpolate with {expr}
                             # single-quoted strings are literal, no interpolation

func square(x) => x * x     # single-expression function, implicit return
func greet(name) {          # multi-statement function, needs explicit return
  return "Hi, {name}"
}

let double = x => x * 2     # arrow functions work like JS

if score > 90 {             # no parens needed around the condition
  print("A")
} else if score > 80 {
  print("B")
} else {
  print("C")
}

let i = 0
while i < 3 {
  print(i)
  i = i + 1
}

repeat 5 as i {              # runs the block 5 times, i = 0..4
  print(i)
}

for item in [1, 2, 3] {      # for-of over any iterable
  print(item)
}

let ready = true and not false   # 'and' / 'or' / 'not' as readable aliases
                                   # for && / || / !  ('&&' etc. still work too)

let arr = [1, 2, 3]
let obj = { name: "Ada", age: 30 }
print("{obj.name} is {obj.age}")

async func loadData(url) {         # async func / async arrow both work
  let { ok, data } = await fetch(url)
  return data
}
```

## What it compiles to

`escript build` emits plain, readable JavaScript — nothing exotic, no runtime
dependency. `repeat N as i { }` becomes a `for` loop, `for x in list { }`
becomes `for...of`, `and`/`or`/`not` become `&&`/`||`/`!`, and string
interpolation becomes a template literal. You can hand the output `.js` file
to anyone and they never need to know E-script exists.

## Current feature set (v0.1)

- `let` / `const`
- `func name(args) { }` and `func name(args) => expr`
- Arrow functions: `(a, b) => a + b`
- `if` / `else if` / `else` (no parens required)
- `while`, `repeat N [as i]`, `for x in iterable`
- `return`, `break`, `continue`
- Arrays, objects, numbers, booleans, `null`
- String interpolation in double-quoted strings
- `and` / `or` / `not` as aliases for `&&` / `||` / `!`
- `print(...)` → `console.log(...)`
- `async func` / `async (a,b) => {}` and `await expr`
- Simple object destructuring: `let { a, b } = expr` (no renaming/defaults/nesting yet)

## Not yet implemented

- Classes / `this`
- Destructuring beyond simple `{ a, b }` (no array destructuring, renaming, or defaults yet)
- Template-string-style triple-quoted multiline strings
- Modules / imports (right now everything is one file, like a `<script>` tag)
- A proper error-recovery parser (right now the first syntax error stops compilation)

Good next steps if you want to keep building this out — happy to add any of
these next.
