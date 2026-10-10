# QUN Core from an Android phone

This repository can be edited and inspected in the GitHub mobile browser. For a full build, open the repository on GitHub and use **Code → Codespaces → Create codespace on main** if Codespaces is available to your account.

In the Codespaces terminal run:

```bash
npm install
npm run compile
npm test
```

To run the AI service locally, a computer or server with Docker is recommended; running a language model directly on a phone may be slow and memory-limited.

The GitHub Actions workflow also runs the Solidity compile and contract tests after pushes. Open the **Actions** tab and inspect the latest run; a green check is evidence of success, not a security audit.

**Safety:** this is a local development prototype. Do not send real funds to it, do not publish private keys, and do not treat the temporary token parameters as final tokenomics.
