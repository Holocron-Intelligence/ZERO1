# Contributing to ZERO1

Thanks for your interest in contributing. Here's how to get started.

## Setup

```bash
git clone https://github.com/holocron-tech/zeroone.git && cd zeroone
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Running Tests

```bash
pytest tests/ -v
```

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Keep changes focused — one feature or fix per PR
3. Make sure `pytest` passes before submitting
4. Describe what you changed and why in the PR description

## Code Style

- Follow existing patterns in the codebase
- Type hints on all public functions
- No secrets, keys, or personal data in commits

## Reporting Bugs

Open an issue with:
- Python version and OS
- Steps to reproduce
- Full traceback if available

For security issues, see [SECURITY.md](SECURITY.md).
