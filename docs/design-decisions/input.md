# Design Choices: Vim-like Commands, Feedback and Messages

This is a record of design decisions and their justifications. Previous design choices influence the next, so this is
to be interpreted chronologically.

### Navigation

**Requirement:**

1. Provide fast navigation reminiscent of Neo/Vim, adapted to tree structures rather than text.
2. Navigation must work consistently across different tree structures.

**Implications:**

While the arrow keys for directional navigation work as a conventional starting point, naive mapping of `h, j, k, l` to
the directional navigation may be actually counter-intuitive once we want to add more of the standard motions for
navigation.

For example, if we want to add `0` and `$` in a way analogous to Vim, the most intuitive meaning would be to move to the
first and last child of the current entries' parent, i.e. the siblings of the node. This then implies a metaphor: a
line in Vim is a parent's children in `dirvi`. But, that disagrees with `j` going to next entry down rather than
going to next parent's children.

**_Decision:_**

Keep arrow keys as conventional directional navigation, leave `h`, `j`, `k`, `l` for setting later.
Add `0` and `$` for moving to the beginning and end of the siblings of the current cursor's node.
Add most obvious controls first over time, and then fil in the gaps in a way that makes most consistent sense.

### Feedback

**Requirement:**

1. Displaying feedback or error messages from commands or internals.

**_Decision:_**

Have a section above the status bar for displaying messages. We'll call it the _feedback bar_. It should take a
section of the UI, meaning it is not overlaying the tree but taking a portion of the screen, as the status bar.

A new message clears previous one. We will add more functionality and configs later on.

### Navigation 2

`{` and `}`.
