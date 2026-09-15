#!/usr/bin/env python3
"""从需求池快照生成各模块功能清单 Markdown。"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "docs/功能清单/requirements-snapshot.json"
OUT_DIR = ROOT / "docs/功能清单"
MODULES_DIR = OUT_DIR / "modules"

SOURCE_URL = (
    "https://designorder.yuque.com/bsy5gt/nvv4zv/pa410cmbrd0lvcu1"
    "?singleDoc# 《3D产品需求池》"
)

# 需求池「模块」字段的全量枚举（含当前无条目的模块）
ALL_MODULES = [
    "工作台与权限",
    "数据上传解析",
    "工艺解析识别",
    "零件库",
    "推荐检索",
    "智能装配",
    "几何生成与编辑",
    "画布编辑",
    "Agent对话窗口",
    "Agent架构",
    "二次开发",
    "运营需求",
    "AI Infra",
    "BOM",
    "下载导出",
]

MODULE_META = {
    "工作台与权限": {
        "定位": "覆盖工作台资源管理、权限与配置、标注平台，以及运营看板入口。",
        "用户价值": "让业务与标注同学在统一工作台完成资源管理、批量操作和数据洞察。",
    },
    "数据上传解析": {
        "定位": "把 CATIA / CGR / 焊枪 / 人机等数据送入云端资源库，并完成解析、校验与入库。",
        "用户价值": "上传即可用：格式正确、位置对齐、分类清晰，减少线下清洗。",
    },
    "工艺解析识别": {
        "定位": "从工艺文件与数模中识别工序、RPS 点与分组，为后续推荐和装配提供工艺输入。",
        "用户价值": "把工艺意图结构化，减少手工拆件和手工打点。",
    },
    "零件库": {
        "定位": "标准件与企业件的库建设、配置化展示，以及零件几何特征自动识别。",
        "用户价值": "按企业配置看到正确零件，并具备可检索、可装配的标准件基础。",
    },
    "推荐检索": {
        "定位": "按工艺点、属性、对手件和同义词，从公库/企业库召回并排序单元与零件。",
        "用户价值": "对话或选点后给出可装配的候选，推荐结果可解释、可回放。",
    },
    "智能装配": {
        "定位": "基于 RPS、约束、避干涉和历史装配 RAG，自动或半自动完成单元装配。",
        "用户价值": "标准件少标甚至不标也能装上，复杂场景可避干涉、可调坐标系。",
    },
    "几何生成与编辑": {
        "定位": "自然语言/模板生成参数化几何，支持 STP 赋参、拖拽改形和基准方向计算。",
        "用户价值": "生成的零件可在线改参数、可收藏复用，立柱/底板等焊装几何可快速落地。",
    },
    "画布编辑": {
        "定位": "3D 画布与模型树上的对象操作、性能与交互一致性。",
        "用户价值": "多选、复制、批量改属性和重命名流畅可用，大模型不卡顿。",
    },
    "Agent对话窗口": {
        "定位": "主 Agent 对话交互：路由、反问、推荐卡片、会话持久化。",
        "用户价值": "用户用自然语言推进设计，意图不清时被追问，刷新后对话不丢。",
    },
    "Agent架构": {
        "定位": "夹具/检索/装配 Agent 的运行时、记忆、快捷指令、渲染与第三代可插拔架构。",
        "用户价值": "能力可配置、可观测、可发版，焊装高频动作可一键触发。",
    },
    "二次开发": {
        "定位": "客户项目与行业插件能力，不进入标准产品主路径的定制功能。",
        "用户价值": "支撑凯尔博、中汽工程等项目交付，以及气路图、投图等专项产出。",
    },
    "运营需求": {
        "定位": "产品运营、反馈闭环与独立轻量化产品线。",
        "用户价值": "收集真实使用反馈，并探索 3D-Lite 等可独立上线的形态。",
    },
    "AI Infra": {
        "定位": "训练数据、模型与版本管理的平台能力，服务推荐/装配/几何等模型迭代。",
        "用户价值": "让算法实验可复现、模型可发布，而不是散落在个人环境。",
    },
    "BOM": {
        "定位": "方案 BOM 的生成、展示与同步（需求池已定义模块，当前无条目）。",
        "用户价值": "设计结果可输出为可交付的物料清单。",
    },
    "下载导出": {
        "定位": "方案/数模/图纸等导出下载（需求池已定义模块，当前无条目）。",
        "用户价值": "设计成果可带回客户环境和下游软件。",
    },
}

STATUS_ORDER = ["已上线", "待发版", "开发中", "规划中"]
PRIORITY_ORDER = ["P00", "P0", "P1", "P2", "P3", "-"]


def infer_status(row: dict) -> str:
    raw = (row.get("开发状态") or "").strip()
    note = (row.get("备注") or "")
    if raw == "生产已发版" or any(k in note for k in ("已上线", "测试通过已上线", "done")):
        return "已上线"
    if raw == "测试完成待发版" or "待发版" in note:
        return "待发版"
    if raw == "开发中":
        return "开发中"
    return "规划中"


# 同一产品能力下的多条需求，归并到一个功能点名称
CLUSTER_MERGE = {
    "避干涉装配": (
        "避干涉算法调整装配状态",
        "碰撞检测算法",
        "Agent集成",
    ),
    "装配坐标系与操作器": (
        "移动旋转操作器可以自定义调整",
        "移动装配坐标系优化",
    ),
    "RAG智能装配": (
        "RAG装配上线",
        "RAG装配应用",
        "基于装配RAG的新装配agent",
    ),
    "智能推荐系统": (
        "智能推荐系统总体设计",
        "智能推荐系统第一版",
        "智能推荐系统多阶段实现方案",
        "AI推荐",
    ),
    "工作台功能与批量操作": (
        "工作台批量操作优化",
        "工作台各tab下的数据类型与功能按钮整理",
    ),
    "自然语言生成参数化几何": (
        "中间层-前端属性面板的显示（参数显示和修改)",
        "自然语言+STP -> 中间层",
        "几何生成主干搭建，自然语言 ->AI生成中间层",
        "通过AI生成零件，并且通过参数面板修改几何",
    ),
    "STP赋参与编辑": (
        "STP与赋参编辑",
        "STP赋参设计链路优化",
    ),
    "立柱与底板连接": (
        "立柱高度自动调整至base平面（立柱高度是通过stp赋参的方式修改)",
        "立柱高度通过补高台连接（立柱替换）",
    ),
    "Agent记忆与可观测性": (
        "记忆系统",
        "分层记忆",
        "langgraph 记忆、埋点、checkpoint、日志",
    ),
    "检索与装配 Agent 命令重组": (
        "夹具agent",
        "检索agent",
    ),
    "主Agent路由与反问": (
        "实现反问机制，解决用户语义与所选内容冲突的问题",
        "主Agent路由与反问",
    ),
    "同义词与属性映射": (
        "自动维护一个prompt表",
        "同义词检索",
        "对于非常明确的属性维护一张映射表",
        "ai识别key和value",
    ),
}


def cluster_key(title: str) -> str:
    title = (title or "").strip()
    if not title:
        return ""
    m = re.match(r"^【([^】]+)】", title)
    if m:
        tag = m.group(1)
        rest = title[m.end() :].strip(" ：:-")
        weak_tags = {
            "dev design",
            "dev desgin",
            "devdesign",
            "生成式AI",
            "Dev desgin",
            "devDesign",
        }
        if tag.lower() in {t.lower() for t in weak_tags}:
            key = rest or title
        else:
            key = tag
    else:
        aliases = {
            "Rag装配上线": "RAG装配上线",
            "rag装配应用": "RAG装配应用",
            "后端渲染": "后端渲染",
            "第三代agent架构": "第三代Agent架构",
            "探索AI训练平台的建设方案": "AI训练平台",
            "dev design  后端数据库迁移": "后端数据库迁移",
            "dev design 基于CRG项目重构上传流程": "CRG上传流程重构",
            "优化主agent的路由能力，增加主agent的反问功能": "主Agent路由与反问",
            "工程落地优化": "几何生成工程落地路径",
            "base生成方向优化": "底板生成方向",
            "catia ->中间层数据AI编辑 -> catia 适配（二开任务)": "CATIA 中间层往返适配",
            "prompt优化：": "夹具生成 Prompt 优化",
            "推荐卡片支持浏览更多": "推荐卡片批量浏览",
            "方案对话保存": "方案对话持久化",
            "rps点优化": "RPS 点作为零件子节点",
            "对于多rps点单元": "多 RPS 点对齐策略",
        }
        key = title
        for src, dst in aliases.items():
            if title.startswith(src) or title == src:
                key = dst
                break
    for merged, sources in CLUSTER_MERGE.items():
        if key in sources or title in sources:
            return merged
    return key


def merge_rows(rows: list[dict]) -> list[dict]:
    grouped: dict[tuple[str, str], dict] = {}
    order: list[tuple[str, str]] = []
    for row in rows:
        title = (row.get("标题") or "").strip()
        module = (row.get("模块") or "").strip() or "未分类"
        if not title:
            continue
        key = (module, title)
        if key not in grouped:
            grouped[key] = {
                "标题": title,
                "模块": module,
                "完成定义DOD": row.get("完成定义DOD") or "",
                "优先级": row.get("优先级") or "-",
                "需求/任务": row.get("需求/任务") or "",
                "开发状态": infer_status(row),
                "迭代周期": row.get("迭代周期") or "",
                "产品/业务": row.get("产品/业务") or "",
                "PRD": row.get("PRD") or "",
                "备注": row.get("备注") or "",
                "任务": [],
                "_raw_status": row.get("开发状态") or "",
            }
            order.append(key)
        item = grouped[key]
        task = (row.get("任务") or "").strip()
        if task and task not in item["任务"]:
            item["任务"].append(task)
        dod = (row.get("完成定义DOD") or "").strip()
        if dod and len(dod) > len(item["完成定义DOD"]):
            item["完成定义DOD"] = dod
        # 状态取更靠前（更完成）的
        st = infer_status(row)
        if STATUS_ORDER.index(st) < STATUS_ORDER.index(item["开发状态"]):
            item["开发状态"] = st
        note = (row.get("备注") or "").strip()
        if note and note not in item["备注"]:
            item["备注"] = (item["备注"] + "；" + note).strip("；") if item["备注"] else note
        prd = (row.get("PRD") or "").strip()
        if prd and (not item["PRD"] or item["PRD"] in ("http://", "http://无需")):
            item["PRD"] = prd
    return [grouped[k] for k in order]


def build_clusters(items: list[dict]) -> list[dict]:
    buckets: dict[str, list[dict]] = defaultdict(list)
    keys: list[str] = []
    for item in items:
        ck = cluster_key(item["标题"])
        if ck not in buckets:
            keys.append(ck)
        buckets[ck].append(item)

    clusters = []
    for ck in keys:
        members = buckets[ck]
        # 产品需求优先作为功能名
        product = [m for m in members if m["需求/任务"] == "产品需求"]
        lead = product[0] if product else members[0]
        prios = sorted(
            {m["优先级"] for m in members},
            key=lambda x: PRIORITY_ORDER.index(x) if x in PRIORITY_ORDER else 99,
        )
        statuses = sorted(
            {m["开发状态"] for m in members},
            key=lambda x: STATUS_ORDER.index(x),
        )
        # 归并后的功能点取最不完整状态，避免部分上线被标成已完成
        cluster_status = statuses[-1] if statuses else "规划中"
        kind = "产品功能" if product else "支撑能力"
        dods: list[str] = []
        for pool in (product, members):
            for m in pool:
                dod = (m["完成定义DOD"] or "").strip()
                if dod and dod not in dods:
                    dods.append(dod)
        clusters.append(
            {
                "name": ck,
                "kind": kind,
                "lead": lead,
                "members": members,
                "priority": prios[0] if prios else "-",
                "status": cluster_status,
                "dod": "；".join(dods),
                "prd": next((m["PRD"] for m in members if m["PRD"] and m["PRD"] not in ("http://", "http://无需")), ""),
            }
        )
    return clusters


def md_escape(text: str) -> str:
    return (text or "").replace("|", "\\|").replace("\n", "<br>")


def linkify_prd(url: str) -> str:
    url = (url or "").strip()
    if not url or url in ("http://", "http://无需"):
        return "-"
    label = "PRD"
    return f"[{label}]({url})"


def write_overview(stats: dict, module_stats: list[dict]) -> None:
    lines = [
        "# 3D 产品各模块功能清单",
        "",
        "来源：[3D产品需求池](https://designorder.yuque.com/bsy5gt/nvv4zv/pa410cmbrd0lvcu1)  ",
        "快照日期：2026-09-15。  ",
        "范围：语雀《3D产品需求池》全量表格中的产品需求与研发任务，按「模块」归并成可执行的功能清单。  ",
        "说明：同一标题的多条研发拆分已合并；空标题行已忽略。BOM、下载导出在需求池中已建模块但尚无条目。",
        "",
        "## 统计",
        "",
        "| 指标 | 数量 |",
        "| --- | ---: |",
        f"| 需求池原始行 | {stats['raw']} |",
        f"| 有效条目（去空标题） | {stats['valid']} |",
        f"| 去重后需求/任务 | {stats['unique']} |",
        f"| 归并后功能点 | {stats['features']} |",
        f"| 有条目的模块 | {stats['modules_with_items']} |",
        f"| 预留空模块 | {stats['empty_modules']} |",
        "",
        "## 模块索引",
        "",
        "| 模块 | 功能点数 | 产品功能 | 支撑能力 | P00/P0 | 已上线 | 开发中 | 待发版 | 规划中 |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for ms in module_stats:
        name = ms["name"]
        link = f"[{name}](modules/{name}.md)"
        lines.append(
            f"| {link} | {ms['features']} | {ms['product']} | {ms['capability']} | "
            f"{ms['p0']} | {ms['已上线']} | {ms['开发中']} | {ms['待发版']} | {ms['规划中']} |"
        )
    lines += [
        "",
        "## 阅读方式",
        "",
        "- 每个模块文档先给**模块定位**，再给**功能总表**，随后按产品功能 / 支撑能力展开验收标准。",
        "- 状态口径：`已上线`（生产已发版或备注已上线） / `待发版` / `开发中` / `规划中`。归并后的功能点取最不完整状态。",
        "- 功能地图图例：✅ 已上线 · 📦 待发版 · 🚧 开发中 · ⬜ 规划中。",
        "- 优先级沿用需求池：`P00` > `P0` > `P1` > `P2`。",
        "- 原始字段快照见 [`requirements-snapshot.json`](requirements-snapshot.json)。",
        "- 重新生成：`python3 scripts/generate_feature_inventory.py`。",
        "",
        "## 产品主链路（跨模块）",
        "",
        "```",
        "工作台上传 → 数据解析入库 → 工艺点/分工件识别",
        "        → 推荐检索召回单元 → 智能装配落位",
        "        → 几何生成/赋参编辑 → 画布确认",
        "        → Agent 对话驱动上述步骤 → 导出/BOM（待建）",
        "```",
        "",
        "## 功能地图（按模块速览）",
        "",
    ]

    for ms in module_stats:
        name = ms["name"]
        # filled later from cluster names via extra field
        feats = ms.get("feature_names") or []
        lines.append(f"### [{name}](modules/{name}.md)")
        lines.append("")
        if not feats:
            lines.append("- （需求池暂无条目）")
        else:
            for f in feats:
                mark = {"已上线": "✅", "待发版": "📦", "开发中": "🚧", "规划中": "⬜"}.get(f["status"], "⬜")
                lines.append(f"- {mark} **{f['name']}**（{f['priority']} · {f['status']}）")
        lines.append("")

    (OUT_DIR / "README.md").write_text("\n".join(lines), encoding="utf-8")


def write_module(name: str, clusters: list[dict], unique_count: int) -> dict:
    meta = MODULE_META[name]
    product = [c for c in clusters if c["kind"] == "产品功能"]
    caps = [c for c in clusters if c["kind"] != "产品功能"]
    status_count = defaultdict(int)
    p0 = 0
    for c in clusters:
        status_count[c["status"]] += 1
        if c["priority"] in ("P00", "P0"):
            p0 += 1

    lines = [
        f"# {name}",
        "",
        f"**定位**：{meta['定位']}  ",
        f"**用户价值**：{meta['用户价值']}  ",
        f"**条目**：去重后 {unique_count} 条需求/任务，归并为 {len(clusters)} 个功能点。",
        "",
        "## 功能总表",
        "",
        "| # | 功能点 | 类型 | 优先级 | 状态 | 验收要点 |",
        "| ---: | --- | --- | --- | --- | --- |",
    ]
    for i, c in enumerate(clusters, 1):
        dod = md_escape(c["dod"]).split("；")[0][:90]
        if c["dod"] and (len(c["dod"].split("；")[0]) > 90 or "；" in c["dod"]):
            dod += "…"
        if not dod:
            dod = "需求池未填写 DOD"
        lines.append(
            f"| {i} | {md_escape(c['name'])} | {c['kind']} | {c['priority']} | {c['status']} | {dod} |"
        )
    if not clusters:
        lines.append("| — | （当前需求池无条目） | — | — | — | 模块已在需求池枚举，待补充需求 |")

    def render_cluster_section(title: str, items: list[dict]) -> None:
        nonlocal lines
        lines.append("")
        lines.append(f"## {title}")
        if not items:
            lines.append("")
            lines.append("暂无。")
            return
        for i, c in enumerate(items, 1):
            lead = c["lead"]
            lines += [
                "",
                f"### {i}. {c['name']}",
                "",
                f"- **优先级**：{c['priority']}　**状态**：{c['status']}　**类型**：{c['kind']}",
            ]
            if lead.get("迭代周期"):
                lines.append(f"- **迭代周期**：{lead['迭代周期']}")
            if lead.get("产品/业务"):
                lines.append(f"- **产品/业务**：{lead['产品/业务']}")
            lines.append(f"- **关联 PRD**：{linkify_prd(c['prd'])}")
            if c["dod"]:
                lines += ["", "**完成定义（DOD）**", "", c["dod"], ""]
            else:
                lines.append("")
            lines.append("**包含需求与任务**")
            lines.append("")
            for m in c["members"]:
                kind = m["需求/任务"] or "未标注"
                extra = f"（{m['开发状态']}）"
                lines.append(f"- [{kind}] {m['标题']} {extra}")
                if m["完成定义DOD"] and m["完成定义DOD"] != c["dod"] and m["完成定义DOD"] not in c["dod"]:
                    lines.append(f"  - DOD：{m['完成定义DOD']}")
                for t in m["任务"]:
                    lines.append(f"  - 任务：{t}")
                if m["备注"]:
                    lines.append(f"  - 备注：{m['备注']}")
            lines.append("")

    render_cluster_section("产品功能", product)
    render_cluster_section("支撑能力（研发任务）", caps)

    lines += [
        "",
        "---",
        "",
        f"[返回总览](../README.md) · 来源：[3D产品需求池]({SOURCE_URL.split('?')[0]})",
        "",
    ]
    (MODULES_DIR / f"{name}.md").write_text("\n".join(lines), encoding="utf-8")
    return {
        "name": name,
        "features": len(clusters),
        "product": len(product),
        "capability": len(caps),
        "p0": p0,
        "已上线": status_count["已上线"],
        "开发中": status_count["开发中"],
        "待发版": status_count["待发版"],
        "规划中": status_count["规划中"],
        "feature_names": [
            {"name": c["name"], "priority": c["priority"], "status": c["status"]}
            for c in clusters
        ],
    }


def main() -> None:
    raw = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    unique = merge_rows(raw)
    by_module: dict[str, list[dict]] = defaultdict(list)
    for item in unique:
        by_module[item["模块"]].append(item)

    MODULES_DIR.mkdir(parents=True, exist_ok=True)
    module_stats = []
    feature_total = 0
    for name in ALL_MODULES:
        items = by_module.get(name, [])
        clusters = build_clusters(items)
        feature_total += len(clusters)
        module_stats.append(write_module(name, clusters, len(items)))

    # 未分类
    if by_module.get("未分类"):
        leftover = [i for i in by_module["未分类"] if i["标题"]]
        if leftover:
            print("warning unclassified", len(leftover))

    empty = [m for m in module_stats if m["features"] == 0]
    write_overview(
        {
            "raw": len(raw),
            "valid": sum(1 for r in raw if (r.get("标题") or "").strip()),
            "unique": len(unique),
            "features": feature_total,
            "modules_with_items": sum(1 for m in module_stats if m["features"]),
            "empty_modules": len(empty),
        },
        module_stats,
    )

    # 覆盖校验：每个有效标题都应出现在对应模块文档中
    missing = []
    for item in unique:
        path = MODULES_DIR / f"{item['模块']}.md"
        if item["模块"] not in ALL_MODULES:
            missing.append(f"未知模块 {item['模块']}: {item['标题']}")
            continue
        text = path.read_text(encoding="utf-8")
        if item["标题"] not in text:
            missing.append(f"{item['模块']}: {item['标题']}")
    if missing:
        raise SystemExit("覆盖校验失败，以下标题未写入模块文档:\n" + "\n".join(missing))

    expected_files = [MODULES_DIR / f"{n}.md" for n in ALL_MODULES] + [OUT_DIR / "README.md"]
    absent = [str(p) for p in expected_files if not p.exists()]
    if absent:
        raise SystemExit("缺少输出文件:\n" + "\n".join(absent))

    print(
        json.dumps(
            {
                "unique": len(unique),
                "features": feature_total,
                "modules": {m["name"]: m["features"] for m in module_stats},
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
