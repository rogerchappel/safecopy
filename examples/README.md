# Examples

Copy the sample config into a project root and adapt the deny globs:

```sh
cp examples/safecopy.config.json ./my-project/safecopy.config.json
safecopy plan --root ./my-project
safecopy pack --root ./my-project --out ./my-project.safe.tgz --force
safecopy inspect --bundle ./my-project.safe.tgz
```

For a directory bundle instead of a `.tgz` archive:

```sh
safecopy pack --root ./my-project --out ./safe-context --directory --force
```
