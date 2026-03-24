# Security Policy

## Private Key Safety

**Never commit `id.json` or any file containing your private key.**
The `.gitignore` is already configured to block this, but always double-check before pushing.

If you accidentally expose a private key:
1. Transfer all funds to a new wallet immediately
2. Revoke/rotate the compromised key
3. Rotate any API credentials

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please **do not open a public issue**.

Contact us privately:
- Telegram: [t.me/holocrontechnologies](https://t.me/holocrontechnologies)
- Discord: [discord.gg/PF4vpgcP](https://discord.gg/PF4vpgcP)

We'll respond within 48 hours and coordinate a fix before any public disclosure.

## Supported Versions

| Version | Supported |
| :--- | :---: |
| Latest `main` | ✅ |
| Older releases | ❌ |
