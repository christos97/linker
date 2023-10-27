# Linker 

### A script for developing packages locally using `yarn` when working with polyrepos

#### *currently only works for linux machines*


#### Example Repo includes the below configuration.

- Projects A and B are `apps` (with react-dom)
- Projects C and D are `libraries` (no react-dom)

---

- `project-a` is the main host app 

- `project-b` is linked to the host app, and has two symlinks inside its node_modules looking at libraries `project-c` and `project-d`

- `project-c` is a library that imports library  `project-d` 

- `project-d` is listed as a symlink in both `project-b` and `project-c`, but has no symlinks itself (null). This typically indicates that project-d is just a library 

---

- Changes in `project-d` will be reflected in both library `project-c` and app `project-b` in watch/dev mode

----- 

`run`
```sh
node linker
```
Example `config`

```json
{
  "options": {
    "removeLockfile": false,
    "unlink": true
  },
  "packages": [
    {
      "name": "@org/project-a",
      "dir": "project-a"
    },
    {
      "name": "@org/project-b",
      "dir": "project-b"
    },
    {
      "name": "@org/project-c",
      "dir": "project-c"
    },
    {
      "name": "@org/project-d",
      "dir": "project-d"
    }
  ],
  "dependencies": {
    "@org/project-a": ["@org/project-b"],
    "@org/project-b": ["@org/project-c", "@org/project-d"],
    "@org/project-c": ["@org/project-d"],
    "@org/project-d": null
  }
}
```