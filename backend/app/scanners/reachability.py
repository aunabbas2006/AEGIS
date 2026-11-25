"""Reachability analysis — "is the vulnerable package actually used?" (§6.2).

Tier 1 (all supported languages): does any first-party file import the package?
Tier 1.5: if it is imported, is the bound name ever referenced after the import?

    reachable            imported and the imported name is used
    imported_not_called  imported, but the bound name is never referenced
    declared_only        listed in the manifest, never imported anywhere

Tier 2 (function-level call graphs, e.g. OSV-Scanner call analysis) is a drop-in
upgrade: it would refine `reachable` down to the specific vulnerable symbol.
"""

import ast
import re
from collections import defaultdict
from dataclasses import dataclass, field

from app.models import Reachability
from app.scanners.base import Dependency, ScanContext

# PyPI distribution name -> import name, where they differ.
PYPI_IMPORT_ALIASES = {
    "pyyaml": "yaml",
    "pillow": "PIL",
    "beautifulsoup4": "bs4",
    "scikit-learn": "sklearn",
    "python-dateutil": "dateutil",
    "opencv-python": "cv2",
    "pyjwt": "jwt",
    "python-dotenv": "dotenv",
    "protobuf": "google.protobuf",
    "pymupdf": "fitz",
}

JS_SUFFIXES = (".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs")
_JS_IMPORT = re.compile(
    r"""(?:import\s+(?P<binding>[\w${},*\s]+?)\s+from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)"""
    r"""['"](?P<module>[^'"]+)['"]"""
)
_JS_ASSIGNED_REQUIRE = re.compile(
    r"""(?:const|let|var)\s+(?P<binding>[\w${},\s]+?)\s*=\s*require\s*\(\s*['"](?P<module>[^'"]+)['"]"""
)


@dataclass
class _Usage:
    imported: bool = False
    used: bool = False
    files: set[str] = field(default_factory=set)


class ImportIndex:
    """Which packages are imported, and whether their bindings are used, across a repo."""

    def __init__(self) -> None:
        self._usage: dict[str, _Usage] = defaultdict(_Usage)

    @classmethod
    def build(cls, ctx: ScanContext) -> "ImportIndex":
        index = cls()
        for path in ctx.iter_files((".py",)):
            index._index_python(ctx.read(path), ctx.rel(path))
        for path in ctx.iter_files(JS_SUFFIXES):
            index._index_javascript(ctx.read(path), ctx.rel(path))
        return index

    def classify(self, dep: Dependency) -> Reachability:
        usage = self._usage.get(self._module_key(dep))
        if usage is None or not usage.imported:
            return Reachability.DECLARED_ONLY
        return Reachability.REACHABLE if usage.used else Reachability.IMPORTED_NOT_CALLED

    def files_importing(self, dep: Dependency) -> list[str]:
        usage = self._usage.get(self._module_key(dep))
        return sorted(usage.files) if usage else []

    @staticmethod
    def _module_key(dep: Dependency) -> str:
        if dep.ecosystem == "PyPI":
            name = dep.name.lower()
            return "py:" + PYPI_IMPORT_ALIASES.get(name, name.replace("-", "_")).split(".")[0].lower()
        return "js:" + dep.name

    def _record(self, key: str, file: str, used: bool) -> None:
        usage = self._usage[key]
        usage.imported = True
        usage.used = usage.used or used
        usage.files.add(file)

    def _index_python(self, source: str, file: str) -> None:
        try:
            tree = ast.parse(source)
        except SyntaxError:
            return

        bindings: dict[str, str] = {}  # local name -> top-level module
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    top = alias.name.split(".")[0]
                    bindings[alias.asname or top] = top
            elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
                top = node.module.split(".")[0]
                for alias in node.names:
                    bindings[alias.asname or alias.name] = top

        referenced = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
        for local, module in bindings.items():
            self._record("py:" + module.lower(), file, used=local in referenced)

    def _index_javascript(self, source: str, file: str) -> None:
        claimed: list[range] = []  # spans already handled by the more specific pattern
        for pattern in (_JS_ASSIGNED_REQUIRE, _JS_IMPORT):
            for match in pattern.finditer(source):
                if any(match.start() in span for span in claimed):
                    continue
                claimed.append(range(match.start(), match.end()))
                module = match.group("module")
                if module.startswith((".", "/")):
                    continue
                package = "/".join(module.split("/")[:2]) if module.startswith("@") else module.split("/")[0]
                names = re.findall(r"[A-Za-z_$][\w$]*", match.group("binding") or "")
                names = [n for n in names if n not in {"as", "type"}]
                # Side-effect imports (`import "x"`) execute the module, so they count as used.
                rest = source[: match.start()] + source[match.end() :]
                used = not names or any(re.search(rf"(?<![\w$.]){re.escape(n)}(?![\w$])", rest) for n in names)
                self._record("js:" + package, file, used=used)
