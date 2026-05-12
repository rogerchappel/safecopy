# Security policy

`safecopy` is a local-first safety tool. Please report vulnerabilities or leak-prone behavior privately when possible.

## Supported versions

The current `0.x` line receives best-effort fixes until a stable release policy exists.

## What to report

- Source files modified unexpectedly
- Built-in denies failing for high-risk paths
- Redaction rules exposing matched secrets in output
- Archive or manifest behavior that makes bundles misleading

## What not to include

Do not send real secrets. Use synthetic fixtures or redacted manifests.

## Disclosure

Open a private security advisory on GitHub, or contact the maintainer through the repository profile if advisories are unavailable.
