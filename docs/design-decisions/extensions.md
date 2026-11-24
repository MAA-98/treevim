# Design Choices: Config and Plugins

This is a record of design decisions and their justifications. Previous design
choices influence the next, so this is to be interpreted chronologically.

## Extensible configurations

**Requirement:**

1. Like Neovim, Treevim configuration should be scriptable to allow increasing
   customization.
2. Even though JS is used instead of Lua, setup and behavior should resemble
   Neovim closely enough to be easy for its users to pick up.

**Implications:**

Instead of saving and loading a static JSON configuration file, `treevim` needs
to load and evaluate an initialization script with a narrow API for changing
configuration.

**_Decision:_**

`treevim` evaluates an ECMAScript module named `init.mjs` during startup. The
script is evaluated before the terminal UI is entered.

While evaluating the module, `treevim` temporarily exposes a narrow
configuration facade at:

```js
globalThis.treevim;
```

and can also be accessed with:

```js
treevim;
```

For example, an initialization script may set the initial app ID:

```js
treevim.app.initial('fs');
```

The facade exposing configuration operations is available only while `init.mjs` is being evaluated.

The startup lifecycle is:

- treevim starts
- evaluates `init.mjs`
- exposes `globalThis.treevim`/`treevim` temporarily
- `init.mjs` changes configuration through the exposed API
- host consumes the resolved configuration
- host enters the terminal UI

## Custom Apps

**Requirement:**

1. Support applications for different tree structures, such as filesystems,
   XML, ASTs, and s-expressions. This includes when children order is semantic
   or not, which changes the fold UI.
2. Allow each application to define its own node values, data loading, and
   entry presentation.
3. Keep the tree runtime and interaction behavior within treevim, rather than
   requiring each application to implement them.
4. Allow the host Treevim to run applications without knowing their concrete
   identifier and value types.

**Implications:**

An app definition needs to connect an application-specific data source to
treevim's tree model.

For example, a filesystem app definition defines the node types, how to
read and edit directories and files. An XML app knows how to read and edit
XML nodes. Neither should need to implement its own cursor, fold-state
management, navigation runtime, or terminal UI.

The app therefore supplies an application definition, rather than
a replacement tree runtime. Treevim uses that definition to construct
the application's runtime API.

Applications can use different identifier and value types. These types
must remain consistent within an application, but the host should not
need to name them when selecting or running an app.

**_Decision:_**

An app exposes its definition which supplies at least:

- A function for creating (the inputs for) the initial root.
- A function for loading (the inputs for) a branch's direct children.
- Whether the children have semantic order.
- A synchronous, side-effect-free function for describing a tree node's
  presentation.
- A subscription through which the app can request resynchronization.

The "(the inputs for)" is to make sure the app definition is not dependent
on the treevim app constructions. Treevim constructs the concrete tree and
application APIs from this definition.

The app describes entry content, while treevim owns its surrounding
presentation: indentation, cursor, selection, fold styling, etc.
Similarly, the app signals when resynchronization is needed, while
treevim performs it through the shared runtime.

### Modal Editing

**Requirement:**

1. Commands reminiscent of Neo/Vim, and easy for users of it to pick up and use.
2. It must be general enough to be the same for various tree structures: file directories, ASTs, git trees, etc.

**_Decision:_**

A normal mode for shortcuts and command mode for Ex-style commands will be expected and natural for Vim users. Insert
mode only makes sense in the context of text buffers, so it's not implemented.

To display Ex command buffer, modes, normal modes command buffer, and additional status parts, there is a status bar at
the bottom as in Neo/Vim.

## Custom Commands

**Requirement:**

1. Custom Ex commands that control treevim.
2. Custom normal commands that control treevim.

**Implications:**

Need a TreevimApi object with methods for controlling treevim, and a rule for
conflicts.

**_Decision:_**

- TreevimApi is made with ShellApi and AppApi for control of the shell outside
  current app and control of the app.
- Custom commands override builtins, later custom commands override earlier ones.

## Theme

**Requirement:**

1. A theme per app, for defining UI components.
2. Design close enough to easily copy themes from Neovim or, less importantly, VSCode.

**_Decision:_**

- The app registrations have a highlight resolver, which maps "highlight tokens" to
  styling. This was necessary because for the filesystem app to include nerd fonts for file
  types we needed to include both the font and the styling. So it was done separately
  by presentNode defining the content presented, and the styling through highlight
  resolvers. Content and styling are handled at different layers, so this was natural.
- Since the highlight tokens and resolvers are already there, instead of having a separate
  config for UI colors, the UI is also styled by highlight resolvers. Treevim exposes
  `uiHighlightTokens` for the status bar, tree, and feedback bar; applications
  resolve these alongside their content tokens.

## Custom Commands 2

**Requirement:**

1. Given a function/command/tool that does something in an app, we should have a standard 
   and easy way to write inputs for it in the command line, combine results and compose 
   such functions/comands/tools.
2. In the near future we will look to allow coding agents, in particular Pi's, to be 
   able to call registered functions/commands/tools as tools in code mode. This will 
   allow Pi to make use of all the same functions available to a user as a command. 
   The current design of the commandline interpreter should be easily compatible with 
   that future direction.

**Discussion:**

Currently, a normal command is written as `:commandName [inputString]` where 
`inputString` is treated as a whole string to be given and parsed/interpreted by each 
command function.

This has notable disadvantages: each command could have its own parsing rules, and
there is no standard for validation, providing hints to the user or extensions for the
commandline editor.

**_Decision:_**

- Register commands in the same way as tools are registered in Pi. This will allow easy 
integration later on. 
- Then custom commands are run in JS mode:
```js
!tool.toolName(inputObject0, inputObject1, ...)
```
where the string after the first `!` is treated as pure JS, to run in a sandbox like
in Pi's code mode.
