from pathlib import Path

from app.models import Reachability
from app.scanners.base import Dependency, ScanContext
from app.scanners.reachability import ImportIndex
from app.scanners.secrets import find_secrets, redact


def _repo(tmp_path: Path, files: dict[str, str]) -> ScanContext:
    for rel, content in files.items():
        (tmp_path / rel).parent.mkdir(parents=True, exist_ok=True)
        (tmp_path / rel).write_text(content)
    return ScanContext(root=tmp_path)


def test_reachability_tiers_javascript(tmp_path):
    ctx = _repo(tmp_path, {
        "app.js": 'const _ = require("lodash");\nconst jwt = require("jsonwebtoken");\n_.merge({}, {});\n',
    })
    index = ImportIndex.build(ctx)
    assert index.classify(Dependency("lodash", "4", "npm", "")) == Reachability.REACHABLE
    assert index.classify(Dependency("jsonwebtoken", "8", "npm", "")) == Reachability.IMPORTED_NOT_CALLED
    assert index.classify(Dependency("minimist", "1", "npm", "")) == Reachability.DECLARED_ONLY


def test_reachability_python_aliases(tmp_path):
    ctx = _repo(tmp_path, {
        "jobs.py": "import yaml\nimport fitz\nfrom requests import get\n\nyaml.safe_load('a: 1')\nfitz.open()\n",
    })
    index = ImportIndex.build(ctx)
    assert index.classify(Dependency("PyYAML", "5", "PyPI", "")) == Reachability.REACHABLE
    assert index.classify(Dependency("PyMuPDF", "1", "PyPI", "")) == Reachability.REACHABLE
    assert index.classify(Dependency("requests", "2", "PyPI", "")) == Reachability.IMPORTED_NOT_CALLED
    assert index.classify(Dependency("flask", "0", "PyPI", "")) == Reachability.DECLARED_ONLY


def test_secret_rules_and_entropy_gate():
    aws = "AKIA" + "IOSFODNN7EXAMPLE"
    hits = find_secrets(f'key = "{aws}"\npassword = "aaaaaaaaaaaaaaaa"\n')
    assert [(rule.id, line) for rule, _, line in hits] == [("aws-access-key", 1)]


def test_secret_is_never_shown_in_full():
    value = "AKIA" + "IOSFODNN7EXAMPLE"
    assert value not in redact(value)
