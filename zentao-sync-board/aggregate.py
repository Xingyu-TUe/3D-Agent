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

# ZenTao uses these for "nobody" / system placeholders.
EMPTY_ACCOUNTS = {"", "0", "closed", "无", "none", "null"}


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
        if account.lower() in EMPTY_ACCOUNTS or account in EMPTY_ACCOUNTS:
            return None
        return {"account": account, "name": account}
    if isinstance(value, dict):
        account = str(value.get("account") or "").strip()
        if not account or account.lower() in EMPTY_ACCOUNTS or account in EMPTY_ACCOUNTS:
            return None
        name = value.get("realname") or value.get("realName") or account
        name = str(name).strip() or account
        if name in EMPTY_ACCOUNTS:
            name = account
        return {"account": account, "name": name}
    return None


def team_members(task):
    members = []
    seen = set()
    for row in task.get("team") or []:
        if not isinstance(row, dict):
            continue
        found = person(row) or person({"account": row.get("account"), "realname": row.get("realname") or row.get("realName")})
        if not found:
            continue
        if found["account"] in seen:
            continue
        seen.add(found["account"])
        members.append(
            {
                "account": found["account"],
                "name": found["name"],
                "estimate": _num(row.get("estimate")),
                "consumed": _num(row.get("consumed")),
                "left": _num(row.get("left")),
            }
        )
    return members


def describe_assignee(value):
    if value is None or value == "":
        return "空"
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        account = value.get("account")
        name = value.get("realname") or value.get("realName")
        return f"{account or ''}({name or ''})".strip() or str(value)
    return str(value)


def resolve_owners(task):
    """
    Return (owners, reason).
    owners: list of {account, name, estimate?, consumed?, left?}
    Multi-person team tasks without assignedTo are attributed to team members,
    not lumped into 未指派.
    """
    assigned = person(task.get("assignedTo"))
    realname = str(task.get("assignedToRealName") or "").strip()
    if assigned:
        if realname and assigned["name"] == assigned["account"]:
            assigned["name"] = realname
        return [assigned], "assignedTo"

    members = team_members(task)
    if members:
        return members, "team"

    for key in ("finishedBy", "closedBy", "openedBy", "lastEditedBy"):
        found = person(task.get(key))
        if found:
            return [found], key

    return [{"account": "__unassigned__", "name": "未指派"}], "unassigned"


def _is_parent(task):
    parent = _int(task.get("parent"), 0)
    children = task.get("children") or []
    # parent == -1 is ZenTao's parent-task marker; also skip if children are present.
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


def normalize_task_rows(raw):
    """One ZenTao task may expand into multiple rows (multi-person team)."""
    status = str(raw.get("status") or "").strip().lower()
    bucket = BUCKETS.get(status, "other")
    owners, reason = resolve_owners(raw)
    pri = raw.get("pri")
    base = {
        "id": str(raw.get("id")),
        "name": str(raw.get("name") or "未命名任务"),
        "status": status,
        "statusLabel": STATUS_LABELS.get(status, status or "未知"),
        "bucket": bucket,
        "assignReason": reason,
        "assignedToRaw": describe_assignee(raw.get("assignedTo")),
        "assignedToRealName": str(raw.get("assignedToRealName") or ""),
        "teamAccounts": [member["account"] for member in team_members(raw)],
        "pri": _int(pri, 0) if pri not in (None, "") else None,
        "type": str(raw.get("type") or ""),
        "mode": str(raw.get("mode") or ""),
    }
    total_estimate = _num(raw.get("estimate"))
    total_consumed = _num(raw.get("consumed"))
    total_left = _num(raw.get("left"))

    rows = []
    if reason == "team" and len(owners) > 1:
        # Prefer per-member hours when ZenTao provides them; otherwise split evenly.
        member_estimate_sum = sum(owner.get("estimate", 0) for owner in owners)
        for owner in owners:
            if member_estimate_sum > 0:
                estimate = owner.get("estimate", 0)
                consumed = owner.get("consumed", 0)
                left = owner.get("left", 0)
            else:
                estimate = round(total_estimate / len(owners), 2)
                consumed = round(total_consumed / len(owners), 2)
                left = round(total_left / len(owners), 2)
            rows.append(
                {
                    **base,
                    "ownerAccount": owner["account"],
                    "ownerName": owner["name"],
                    "estimate": estimate,
                    "consumed": consumed,
                    "left": left,
                    "sharedTask": True,
                }
            )
        return rows

    owner = owners[0]
    rows.append(
        {
            **base,
            "ownerAccount": owner["account"],
            "ownerName": owner["name"],
            "estimate": total_estimate,
            "consumed": total_consumed,
            "left": total_left,
            "sharedTask": False,
        }
    )
    return rows


def aggregate_people(raw_tasks):
    people = {}
    tasks = []
    for raw in flatten_tasks(raw_tasks):
        for task in normalize_task_rows(raw):
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


def unassigned_report(tasks):
    """Unique ZenTao tasks currently classified as 未指派."""
    seen = set()
    report = []
    for task in tasks:
        if task.get("ownerAccount") != "__unassigned__":
            continue
        if task["id"] in seen:
            continue
        seen.add(task["id"])
        report.append(
            {
                "id": task["id"],
                "name": task["name"],
                "status": task["status"],
                "statusLabel": task["statusLabel"],
                "bucket": task["bucket"],
                "estimate": task["estimate"],
                "assignReason": task.get("assignReason"),
                "assignedToRaw": task.get("assignedToRaw"),
                "assignedToRealName": task.get("assignedToRealName"),
                "teamAccounts": task.get("teamAccounts") or [],
                "mode": task.get("mode") or "",
            }
        )
    report.sort(key=lambda item: (item["bucket"], item["id"]))
    return report


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


# Back-compat for older imports/tests.
def owner_of(task):
    owners, _reason = resolve_owners(task)
    return owners[0]


def normalize_task(raw):
    return normalize_task_rows(raw)[0]
