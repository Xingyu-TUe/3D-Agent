#!/usr/bin/env python3
"""校验功能清单文档覆盖需求池快照。"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "docs/功能清单/requirements-snapshot.json"
MODULES_DIR = ROOT / "docs/功能清单/modules"
OVERVIEW = ROOT / "docs/功能清单/README.md"
GENERATOR = ROOT / "scripts/generate_feature_inventory.py"


def test_snapshot_shape() -> None:
    rows = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    assert isinstance(rows, list)
    assert len(rows) == 149
    required = {"标题", "模块", "完成定义DOD", "优先级", "需求/任务"}
    assert required.issubset(rows[0].keys())
    titled = [r for r in rows if (r.get("标题") or "").strip()]
    assert len(titled) == 142


def test_generator_and_coverage() -> None:
    proc = subprocess.run(
        [sys.executable, str(GENERATOR)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr or proc.stdout
    overview = OVERVIEW.read_text(encoding="utf-8")
    assert "3D 产品各模块功能清单" in overview
    assert "归并后功能点|83|" in overview.replace(" ", "")
    rows = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    for row in rows:
        title = (row.get("标题") or "").strip()
        module = (row.get("模块") or "").strip()
        if not title or not module:
            continue
        text = (MODULES_DIR / f"{module}.md").read_text(encoding="utf-8")
        assert title in text, f"{module} missing {title}"
        assert f"[{module}]" in overview


def main() -> None:
    test_snapshot_shape()
    test_generator_and_coverage()
    print("feature inventory tests passed")


if __name__ == "__main__":
    main()
