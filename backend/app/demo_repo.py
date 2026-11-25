"""Builds a deliberately risky sample repository so AEGIS can be demonstrated offline-first.

The repo has a real two-commit git history: the first commit leaks API keys in `.env`,
the second deletes the file. The keys are gone from HEAD but still in history — exactly
the case that HEAD-only scanners miss.

Fake secrets are assembled at runtime so this source file itself never contains a
pattern that real secret scanners would flag.
"""

import json
import subprocess
from pathlib import Path

DEMO_SOURCE = "demo"

_FAKE_OPENAI_KEY = "sk-" + "proj-" + "Demo7Kq2Xv9Lm4Pz8Rt1Wy6Nb3Hc5Jf0Ga"
_FAKE_STRIPE_KEY = "sk_" + "live_" + "51DemoAegisFakeKey0000000000"
_AWS_DOCS_EXAMPLE_KEY = "AKIA" + "IOSFODNN7EXAMPLE"  # AWS's own documentation example

FILES: dict[str, str] = {
    "package.json": json.dumps(
        {
            "name": "demo-shop",
            "version": "1.0.0",
            "private": True,
            "dependencies": {
                "express": "4.17.1",
                "lodash": "4.17.15",
                "axios": "0.21.0",
                "jsonwebtoken": "8.5.1",
                "minimist": "1.2.0",
            },
        },
        indent=2,
    ),
    "Dockerfile": "FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci\nCMD [\"node\", \"src/server.js\"]\n",
    "src/server.js": """const express = require("express");
const _ = require("lodash");
const axios = require("axios");
const jwt = require("jsonwebtoken"); // imported but never called

const app = express();
app.use(express.json());

app.post("/preferences", (req, res) => {
  const prefs = _.merge({}, req.body); // prototype-pollution sink
  res.json(prefs);
});

app.get("/preview", async (req, res) => {
  const page = await axios.get(req.query.url); // user-controlled URL
  res.send(page.data);
});

app.listen(3000);
""",
    "worker/.python-version": "3.9.18\n",
    "worker/requirements.txt": "requests==2.19.1\npyyaml==5.3\nflask==0.12.2\nPyQt5==5.15.9\n",
    "worker/jobs.py": """import requests
import yaml


def load_job(raw: str):
    return yaml.load(raw)  # unsafe loader


def notify(url: str, payload: dict):
    return requests.post(url, json=payload, timeout=5)
""",
    "worker/llm.py": """import anthropic

client = anthropic.Anthropic()

SUMMARY_MODEL = "claude-3-opus-20240229"
FALLBACK_MODEL = "gpt-4-32k"


def summarize(text: str) -> str:
    reply = client.messages.create(model=SUMMARY_MODEL, max_tokens=300, messages=[{"role": "user", "content": text}])
    return reply.content[0].text
""",
    "config/settings.py": f'AWS_REGION = "eu-west-1"\nAWS_ACCESS_KEY_ID = "{_AWS_DOCS_EXAMPLE_KEY}"\n',
    ".env.example": "PAYMENTS_API=https://api.stripe.com\nSTATUS_PAGE=https://www.githubstatus.com\n",
}

LEAKED_ENV = f"OPENAI_API_KEY={_FAKE_OPENAI_KEY}\nSTRIPE_SECRET_KEY={_FAKE_STRIPE_KEY}\n"


def build_demo_repo(target: Path) -> Path:
    if target.exists():
        return target

    target.mkdir(parents=True)
    git = ["git", "-C", str(target), "-c", "user.name=AEGIS Demo", "-c", "user.email=demo@aegis.local"]
    subprocess.run([*git, "init", "--quiet"], check=True)

    for rel, content in FILES.items():
        path = target / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    (target / ".env").write_text(LEAKED_ENV, encoding="utf-8")
    subprocess.run([*git, "add", "-A"], check=True)
    subprocess.run([*git, "commit", "--quiet", "-m", "Initial commit"], check=True)

    (target / ".env").unlink()
    (target / ".gitignore").write_text(".env\nnode_modules/\n", encoding="utf-8")
    subprocess.run([*git, "add", "-A"], check=True)
    subprocess.run([*git, "commit", "--quiet", "-m", "Remove .env from repo"], check=True)
    return target
