---
name: '🐛 Bug Report'
about: Report a problem with path resolution in tsc-alias
title: '[Bug] Short description of the path resolution issue'
labels: bug
assignees: ''
---

## 📝 Description

A clear and concise description of what the bug is. What path is failing to resolve or what file extension is missing?

## ⚙️ Minimum Reproduction Repository

> **Crucial:** Please provide a link to a small public GitHub repository replicating the issue. It dramatically speeds up the resolution process.

- **Link:**

## 🛠️ Configuration Files

Please share your configuration details below.

### `tsconfig.json`

```json
// Paste your full tsconfig.json here
```

## 📋 Debug Logs

Before submitting, please run your build script with the `--debug` flag (e.g., `tsc-alias --debug`). Paste the full output here:

```text
// Paste your terminal outputs with --debug activated here
```

## 💻 Environment

- **tsc-alias version:** (ex: v1.8.x)
- **TypeScript version:** (ex: v5.x)
- **Node.js version:** (ex: v20.x)

## 🔄 Expected Behavior vs Actual Behavior

- **Expected:** (ex: `import { foo } from '@/utils'` should become `import { foo } from '../utils/index.js'`)
- **Actual:** (ex: The import path remains unchanged or throws a Module Not Found error)

## 💡 Additional Context

Add any other context about the problem here (e.g., if you are using specific replacers, monorepos).

### 🎯 Project Sustainability Notice

This project is maintained entirely on personal time and resources.

- **Standard Support:** Active core issues are triaged for free as time allows.
- **Priority Support / Urgent Fix:** If your organization relies on this tool in production and needs this issue resolved urgently, please consider funding it via our Bug Bounty Tier on GitHub Sponsors. Funded issues are picked up immediately.

[➡️ Fund this Issue / Support the Maintainer](https://github.com/sponsors/justkey007?frequency=one-time&sponsor=justkey007)
