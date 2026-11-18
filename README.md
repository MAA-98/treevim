<p align="center">
  <img src="assets/treevim-cropped.jpg" alt="treevim" width="1000">
</p>

A standalone, Vim-inspired TUI for navigating and live editing of
[tree data structures](<https://en.wikipedia.org/wiki/Tree_(abstract_data_type)>).
Build extensions in TypeScript/JS to work with different kinds of trees.

Provides a similar extensible editing environment as Vim/Neovim, but for trees
instead of text buffers. Similar to [`neo-tree`](https://github.com/nvim-neo-tree/neo-tree.nvim.git),
but `treevim` is a standalone Node.js app that supports both ordered and unordered
trees with an API in TypeScript. Easily write commands and plugins with the API documentation.

> Current Status:
> In beta, designing and implementing new commands and key mappings. Some breaking API changes planned.

## Goals

- Modal editing adapted from Vim for any abstract trees, ordered and unordered.
- Focused: **Be really good at one thing: interacting with trees.**
- Extensible: `init.mjs` **config file runs on startup, allowing you to use any JS/TS package for
  commands/apps/themes/control, etc.** Basic security: initialization is fixed after startup.
- Good clean code. Good documentation for users and plugin authors.
- Two examples of `treevim` apps: file system editor and XML editor.

## Installation

Install `treevim` globally with npm:

```sh
npm install -g @mak-98/treevim@latest
```

Requirements:

- Node.js 22 or later
- npm

## Usage

Start treevim with:

```sh
treevim
```

If no `init.mjs` is found, treevim starts the file system app.

Use `:q` to quit. See [Controls](#controls) for more commands.

To customize treevim and use other apps, add an `init.mjs` at:

- `~/.config/treevim/init.mjs` by default, or
- `$XDG_CONFIG_HOME/treevim/init.mjs` if `XDG_CONFIG_HOME` is set.

`XDG_CONFIG_HOME` must be an absolute path. See `examples/` for starting points.

For command-line options:

```sh
treevim --help
```

## Controls

`treevim` has two modes:

- **Normal mode** is used for navigating and interacting with the directory tree.
- **Command-line mode** is used to enter commands beginning with `:`.

The current mode and pending input are shown in the status bar at the bottom of the terminal.

### Normal mode

Normal mode is the default mode when `treevim` starts.

#### Single Key

| Key   | Action                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------- |
| Down  | Move to the next navigable entry                                                                  |
| Up    | Move to the previous navigable entry                                                              |
| Left  | Move to the parent directory                                                                      |
| Right | Open or close a directory                                                                         |
| `0`   | Move to the first navigable sibling                                                               |
| `$`   | Move to the last navigable sibling                                                                |
| `{`   | Move to the start of the current root section, or to the previous section if already at its start |
| `}`   | Move to the next root section                                                                     |
| `:`   | Enter command-line mode                                                                           |
| `Esc` | Clear a pending command                                                                           |

In ordered trees, navigable inline fold markers count as siblings and, at the
root level, as section boundaries.

#### Multi-key

| Key sequence | Action                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `zf`         | Add the current entry to the default fold tree at index 0                                           |
| `zd`         | Remove the current entry from the default fold tree at index 0                                      |
| `zc`         | Enable the default fold tree at index 0, hiding its entries                                         |
| `zo`         | Disable the default fold tree at index 0, revealing entries not hidden by another enabled fold tree |
| `za`         | Toggle whether the default fold tree at index 0 is enabled                                          |
| `<index>zf`  | Add the current entry to the fold tree at `index`                                                   |
| `<index>zd`  | Remove the current entry from the fold tree at `index`                                              |
| `<index>zc`  | Enable the fold tree at `index`, hiding its entries                                                 |
| `<index>zo`  | Disable the fold tree at `index`, revealing entries not hidden by another enabled fold tree         |
| `<index>za`  | Toggle whether the fold tree at `index` is enabled                                                  |

Here `<index>` means a positive index entered without angle brackets, such as `2zf`. Index `0` is targeted by the
unprefixed commands.

### Command-line mode

Press `:` in Normal mode to enter command-line mode.
The status bar displays the command line at the bottom left.

| Key         | Action                                       |
| ----------- | -------------------------------------------- |
| Characters  | Append characters to the command line        |
| `Backspace` | Remove the last character                    |
| `Enter`     | Execute the command                          |
| `Esc`       | Cancel the command and return to Normal mode |

Currently supported commands:

| Command                | Action                                            |
| ---------------------- | ------------------------------------------------- |
| `:q`                   | Quit `treevim`                                    |
| `:app list`            | List available apps                               |
| `:app <appId> [input]` | Switch apps, optionally passing startup input     |
| `:fold list`           | List fold trees in the current view               |
| `:fold create <name>`  | Create a named fold tree                          |
| `:fold delete <name>`  | Delete a named fold tree                          |
| `:fold enable [name]`  | Enable a fold tree so its entries are hidden      |
| `:fold disable [name]` | Disable a fold tree so it no longer hides entries |
| `:fold close [name]`   | Alias for `:fold enable`                          |
| `:fold open [name]`    | Alias for `:fold disable`                         |
| `:fold toggle [name]`  | Toggle whether a fold tree is enabled             |

When a fold command omits `name`, it targets the fold tree named `default`.

An unknown command returns to Normal mode without changing the directory tree.

## Loading/Unloading Parents

Loading and unloading affect the materialized tree in the TUI:

- Loading a parent creates its child entries in the buffer.
- Unloading a parent removes its descendants from the buffer.
- Loading a parent does not automatically load its child descendants.

> WARNING: Folding is a separate mechanism. It controls the visibility of entries while
> they are loaded. Unloading does not automatically fold or unfold the descendants.

## Folding

Folding is separate from (un)loading directories. A active app has a collection of
named **fold trees**. A fold tree contains entries that it should hide if active,
and each fold tree can be independently made active or inactive.

An entry is hidden when it belongs to at least one active fold tree. Disabling
one fold tree reveals its entries only when no other enabled fold tree also
contains them.

For unordered trees, folded children are represented on their parent branch,
conserving vertical space. A branch with folded children shows a folded-entry
count, for example:

```text
directory/ … 1
  file0
  file1
```

For ordered trees, folded children are displayed inline in a contiguous block,
closer to how Vim/Neovim displays folded lines.

```text
directory/
  file0
  … 2
  file3
```

### Default fold tree

A fresh view contains an empty fold tree:

- Its name is `default`.
- Its index is `0`.
- Normal-mode fold commands without an index target it.
- Command-line fold commands without a name target it.

Indexes identify fold trees within the current view. If a fold tree is deleted,
its index may later be reused. Names are the durable, user-facing way to refer
to fold trees from command-line commands.

### Managing fold membership

Use `[index]zf` to add the entry under the cursor to a fold tree and
`[index]zd` to remove it. These commands change the definition of a fold tree;
they do not enable or disable it.

Use `[index]zc`, `[index]zo`, and `[index]za` to enable, disable, or toggle a
fold tree. These commands change whether the fold tree contributes to entry
visibility; they do not alter its membership.

### Relationship to directory opening

Folding a parent with loaded children does not unload it. Its descendants
retain their own load and fold state.

Fold state is independent of the materialized directory buffer:

- Unloading a node does not remove fold-tree membership.
- Reloading a parent reloads its children and reapplies active fold trees.

## FAQ

- What is the use case?

I use the directory app for navigating project files, with tree folds now becoming
the indispensable way for me to quickly view files relevant to a specific part
of a project. I use the XML editor for editing LLM context.

- How is it different from Neovim's `neo-tree` plugin?

`neo-tree` only really supports unordered tree semantics (like directories)
but not ordered trees, whereas `treevim` supports both with slightly different UI
but common controls. This allows using `treevim` for things like XML, ASTs, s-expressions,
etc. In addition, `treevim` has new concepts like fold trees which add to developer
ergonomics.

- Why make it a separate app instead of a Vim/Neovim plugin?

1. `neo-tree` already exists, if you only want a directory editor and it works for you,
   then keep it.
2. I like to keep my tools independent of each other, keeping Neovim as a focused
   text editor.
3. Making the init script and APIs in TypeScript has increased the ease with which
   I make and use extensions.

By making it standalone, I do believe it's a better tool in the end than a plugin.

- Why write it using TypeScript/React/Ink?

It was the easiest way for me to get started, given I'm not familiar with Lua. It has
the consequence of making plugins and scripting very approachable. I plan to make future
incremental rewrites in Rust.

- What is your AI use policy?

LLMs are used to assist writing function implementations given a natural language
specification. It is never used to design the overall architecture, although suggestions
from LLMs may be taken into account. Unit tests may be written by LLMs without exposure
to implementations, property tests are usually handmade with LLM assistance. Contributions
are expected to use a similar workflow.

## License

treevim is licensed under the GNU General Public License, version 3 or, at your
option, any later version (`GPL-3.0-or-later`). See [LICENSE](LICENSE).

Third-party dependencies retain their respective licenses.
