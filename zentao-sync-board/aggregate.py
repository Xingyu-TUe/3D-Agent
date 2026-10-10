"""Turn ZenTao tasks into per-person status and hour totals."""

STATUS_LABELS = {
    "wait": "未开始",
    "doing": "进行中",
    "pause": "已暂停",
    "done": "已完成",
    "closed": "已关闭",
    "cancel": "已取消",
}

# pause stays with in-progress work; closed counts as finished.
BUCKETS = {
    "wait": "wait",
    "doing": "doing",
    "pause": "doing",
    "done": "done",
    "closed": "done",
    "cancel": "other",
}

BUCKET_ORDER = ("wait", "doing", "done")


def _num(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def person(value):
    if value is None or value == "":
        return None
    if isinstance(value, str):
        account = value.strip()
        if not account:
            return None
        return {"account": account, "name": account}
    if isinstance(value, dict):
        account = str(value.get("account") or "").strip()
        if not account:
            return None
        name = value.get("realname") or value.get("realName") or account
        return {"account": account, "name": str(name)}
    return None


def owner_of(task):
    assigned = person(task.get("assignedTo"))
    realname = str(task.get("assignedToRealName") or "").strip()
    if assigned and assigned["account"] != "closed":
        if realname and assigned["name"] == assigned["account"]:
            assigned["name"] = realname
        return assigned
    for key in ("finishedBy", "closedBy"):
        found = person(task.get(key))
        if found and found["account"] != "closed":
            return found
    return {"account": "__unassigned__", "name": "未指派"}


def _is_parent(task):
    parent = _int(task.get("parent"), 0)
    children = task.get("children") or []
    return parent == -1 or (isinstance(children, list) and len(children) > 0)


def flatten_tasks(raw_tasks):
    """Keep leaf tasks only so parent rows are not double-counted."""
    by_id = {}
    nested = []
    for task in raw_tasks or []:
        if not isinstance(task, dict):
            continue
        task_id = task.get("id")
        if task_id is not None:
            by_id[str(task_id)] = task
        for child in task.get("children") or []:
            if isinstance(child, dict) and child.get("id") is not None:
                nested.append(child)
    for child in nested:
        by_id.setdefault(str(child["id"]), child)

    leaves = []
    for task in by_id.values():
        if task.get("deleted") in (True, 1, "1"):
            continue
        if _is_parent(task):
            continue
        leaves.append(task)
    return leaves


def _empty_metrics():
    return {"count": 0, "estimate": 0.0, "consumed": 0.0, "left": 0.0}


def _round_metrics(metrics):
    return {
        "count": metrics["count"],
        "estimate": round(metrics["estimate"], 1),
        "consumed": round(metrics["consumed"], 1),
        "left": round(metrics["left"], 1),
    }


def _add(metrics, task):
    metrics["count"] += 1
    metrics["estimate"] += task["estimate"]
    metrics["consumed"] += task["consumed"]
    metrics["left"] += task["left"]


def normalize_task(raw):
    status = str(raw.get("status") or "").strip().lower()
    bucket = BUCKETS.get(status, "other")
    owner = owner_of(raw)
    pri = raw.get("pri")
    return {
        "id": str(raw.get("id")),
        "name": str(raw.get("name") or "未命名任务"),
        "status": status,
        "statusLabel": STATUS_LABELS.get(status, status or "未知"),
        "bucket": bucket,
        "ownerAccount": owner["account"],
        "ownerName": owner["name"],
        "estimate": _num(raw.get("estimate")),
        "consumed": _num(raw.get("consumed")),
        "left": _num(raw.get("left")),
        "pri": _int(pri, 0) if pri not in (None, "") else None,
        "type": str(raw.get("type") or ""),
    }


def aggregate_people(raw_tasks):
    people = {}
    tasks = []
    for raw in flatten_tasks(raw_tasks):
        task = normalize_task(raw)
        tasks.append(task)
        person_row = people.get(task["ownerAccount"])
        if person_row is None:
            person_row = {
                "account": task["ownerAccount"],
                "name": task["ownerName"],
                "wait": _empty_metrics(),
                "doing": _empty_metrics(),
                "done": _empty_metrics(),
                "other": _empty_metrics(),
            }
            people[task["ownerAccount"]] = person_row
        elif person_row["name"] == person_row["account"] and task["ownerName"] != task["ownerAccount"]:
            person_row["name"] = task["ownerName"]
        _add(person_row[task["bucket"]], task)

    rows = []
    for row in people.values():
        total = _empty_metrics()
        for bucket in BUCKET_ORDER:
            _add_metrics(total, row[bucket])
        counted = total["count"]
        row["total"] = _round_metrics(total)
        row["rate"] = round(row["done"]["count"] / counted * 100) if counted else 0
        for bucket in ("wait", "doing", "done", "other"):
            row[bucket] = _round_metrics(row[bucket])
        rows.append(row)

    rows.sort(key=lambda item: (-item["total"]["count"], -item["total"]["estimate"], item["name"]))
    tasks.sort(key=lambda item: (item["ownerName"], item["bucket"], item["id"]))
    return rows, tasks


def _add_metrics(target, source):
    target["count"] += source["count"]
    target["estimate"] += source["estimate"]
    target["consumed"] += source["consumed"]
    target["left"] += source["left"]


def summarize(people):
    totals = {bucket: _empty_metrics() for bucket in ("wait", "doing", "done", "other")}
    total = _empty_metrics()
    for person_row in people:
        for bucket in totals:
            _add_metrics(totals[bucket], person_row[bucket])
        _add_metrics(total, person_row["total"])
    counted = total["count"]
    return {
        "wait": _round_metrics(totals["wait"]),
        "doing": _round_metrics(totals["doing"]),
        "done": _round_metrics(totals["done"]),
        "other": _round_metrics(totals["other"]),
        "total": _round_metrics(total),
        "rate": round(totals["done"]["count"] / counted * 100) if counted else 0,
        "people": len(people),
    }


def normalize_execution(raw, fallback_id=None):
    if not isinstance(raw, dict):
        execution_id = str(fallback_id or "")
        return {
            "id": execution_id,
            "name": f"执行 {execution_id}" if execution_id else "执行",
            "begin": "",
            "end": "",
            "status": "",
            "project": "",
        }
    execution_id = str(raw.get("id") or fallback_id or "")
    begin = str(raw.get("begin") or "")[:10]
    end = str(raw.get("end") or "")[:10]
    project = raw.get("project") or raw.get("parent") or ""
    return {
        "id": execution_id,
        "name": str(raw.get("name") or f"执行 {execution_id}"),
        "begin": begin if begin != "0000-00-00" else "",
        "end": end if end != "0000-00-00" else "",
        "status": str(raw.get("status") or ""),
        "project": "" if project in (None, "") else str(project),
    }
