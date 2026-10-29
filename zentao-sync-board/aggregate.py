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


def _remember_name(directory, account, name):
    """Prefer Chinese / non-account display names over login accounts."""
    account = str(account or "").strip()
    name = str(name or "").strip()
    if not account or account.lower() in EMPTY_ACCOUNTS or account in EMPTY_ACCOUNTS:
        return
    if not name or name in EMPTY_ACCOUNTS:
        return
    current = directory.get(account)
    if current is None or current == account or (name != account and current == account):
        directory[account] = name
    elif name != account and _looks_like_account(current) and not _looks_like_account(name):
        directory[account] = name


def _looks_like_account(value):
    text = str(value or "")
    if not text or text == "__unassigned__":
        return True
    if "." in text and all(part.replace("_", "").isalnum() for part in text.split(".")):
        return True
    # ASCII login-style tokens without CJK.
    return bool(text.isascii() and any(ch.isalpha() for ch in text) and " " not in text)


def display_name(account, fallback=""):
    account = str(account or "").strip()
    fallback = str(fallback or "").strip()
    if account == "__unassigned__":
        return "未指派"
    if fallback and not _looks_like_account(fallback):
        return fallback
    if fallback and fallback != account:
        return fallback
    return fallback or account


def pri_label(pri):
    """Match common ZenTao UI habit: priority number N is shown as PN (P1/P2/…)."""
    if pri is None:
        return ""
    try:
        number = int(pri)
    except (TypeError, ValueError):
        return str(pri)
    return f"P{number}"


def is_p1_p2(pri):
    """P1+P2 filter: ZenTao has no P0; pri=1 → P1, pri=2 → P2."""
    try:
        number = int(pri)
    except (TypeError, ValueError):
        return False
    return number in (1, 2)


# ZenTao user.role codes. Product and QA stay off the developer board.
ROLE_LABELS = {
    "dev": "研发",
    "qa": "测试",
    "pm": "项目经理",
    "po": "产品经理",
    "td": "研发主管",
    "pd": "产品主管",
    "qd": "测试主管",
    "top": "高层管理",
    "others": "其他",
}
EXCLUDED_ROLE_CODES = {"po", "pd", "qa", "qd"}
EXCLUDED_ROLE_LABELS = {"产品经理", "产品主管", "测试", "测试主管", "测试人员"}
# Named example when ZenTao does not return a role code on the task itself.
EXPLICIT_EXCLUDED_ACCOUNTS = {"xingyu.fu"}
EXPLICIT_EXCLUDED_NAMES = {"付星宇"}


def role_label(role):
    text = str(role or "").strip()
    if not text:
        return ""
    return ROLE_LABELS.get(text.lower(), text)


def is_excluded_role(role):
    """Hide 产品经理 / 测试 (and their 主管) from the developer board."""
    text = str(role or "").strip()
    if not text:
        return False
    if text.lower() in EXCLUDED_ROLE_CODES:
        return True
    label = role_label(text)
    return text in EXCLUDED_ROLE_LABELS or label in EXCLUDED_ROLE_LABELS


def dept_is_non_dev(name):
    text = str(name or "").strip()
    if not text:
        return False
    if any(word in text for word in ("研发", "开发", "前端", "后端", "算法")):
        return False
    return ("产品" in text) or ("测试" in text)


def is_excluded_person(account, name, role, dept=""):
    if str(account or "").strip() in EXPLICIT_EXCLUDED_ACCOUNTS:
        return True
    if str(name or "").strip() in EXPLICIT_EXCLUDED_NAMES:
        return True
    if is_excluded_role(role):
        return True
    return dept_is_non_dev(dept)


def roles_from_users(users, dept_names=None):
    """account -> {role, name, dept} from ZenTao user or team rows."""
    dept_names = {str(key): value for key, value in (dept_names or {}).items()}
    directory = {}
    for user in users or []:
        if not isinstance(user, dict):
            continue
        account = str(user.get("account") or "").strip()
        if not account or account.lower() in EMPTY_ACCOUNTS:
            continue
        role = str(user.get("role") or user.get("roleName") or "").strip()
        name = str(user.get("realname") or user.get("realName") or user.get("name") or "").strip()
        dept = user.get("dept") if user.get("dept") not in (None, "") else user.get("deptID")
        if isinstance(dept, dict):
            dept_name = str(dept.get("name") or "").strip()
        else:
            dept_name = str(dept_names.get(str(dept or ""), "") or "").strip()
        current = directory.get(account) or {"role": "", "name": "", "dept": ""}
        if role:
            current["role"] = role
        if name:
            current["name"] = name
        if dept_name:
            current["dept"] = dept_name
        directory[account] = current
    return directory


# Back-compat alias for older imports/tests.
is_p0_p1 = is_p1_p2


def build_name_directory(raw_tasks):
    """Collect account → realname from assignees / finishers / team rows across the iteration."""
    directory = {}
    for raw in flatten_tasks(raw_tasks):
        real = str(raw.get("assignedToRealName") or "").strip()
        assigned = person(raw.get("assignedTo"))
        if assigned:
            _remember_name(directory, assigned["account"], assigned["name"])
            if real:
                _remember_name(directory, assigned["account"], real)
        elif real:
            # Rare: realname present but assignedTo empty/invalid.
            pass
        for key in ("finishedBy", "closedBy", "openedBy", "lastEditedBy"):
            found = person(raw.get(key))
            if found:
                _remember_name(directory, found["account"], found["name"])
        for row in raw.get("team") or []:
            if not isinstance(row, dict):
                continue
            found = person(row) or person(
                {"account": row.get("account"), "realname": row.get("realname") or row.get("realName")}
            )
            if found:
                _remember_name(directory, found["account"], found["name"])
    return directory


def team_members(task, name_directory=None):
    members = []
    seen = set()
    name_directory = name_directory or {}
    for row in task.get("team") or []:
        if not isinstance(row, dict):
            continue
        found = person(row) or person({"account": row.get("account"), "realname": row.get("realname") or row.get("realName")})
        if not found:
            continue
        if found["account"] in seen:
            continue
        seen.add(found["account"])
        resolved = name_directory.get(found["account"]) or found["name"]
        members.append(
            {
                "account": found["account"],
                "name": display_name(found["account"], resolved),
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


def resolve_owners(task, name_directory=None):
    """
    Return (owners, reason).
    owners: list of {account, name, estimate?, consumed?, left?}
    Multi-person team tasks without assignedTo are attributed to team members,
    not lumped into 未指派.
    """
    name_directory = name_directory or {}
    assigned = person(task.get("assignedTo"))
    realname = str(task.get("assignedToRealName") or "").strip()
    if assigned:
        if realname and (assigned["name"] == assigned["account"] or _looks_like_account(assigned["name"])):
            assigned["name"] = realname
        mapped = name_directory.get(assigned["account"])
        if mapped:
            assigned["name"] = display_name(assigned["account"], mapped)
        else:
            assigned["name"] = display_name(assigned["account"], assigned["name"])
        return [assigned], "assignedTo"

    members = team_members(task, name_directory=name_directory)
    if members:
        return members, "team"

    for key in ("finishedBy", "closedBy", "openedBy", "lastEditedBy"):
        found = person(task.get(key))
        if found:
            mapped = name_directory.get(found["account"])
            found["name"] = display_name(found["account"], mapped or found["name"])
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


def normalize_task_rows(raw, name_directory=None):
    """One ZenTao task may expand into multiple rows (multi-person team)."""
    name_directory = name_directory or {}
    status = str(raw.get("status") or "").strip().lower()
    bucket = BUCKETS.get(status, "other")
    owners, reason = resolve_owners(raw, name_directory=name_directory)
    pri_raw = raw.get("pri")
    pri = _int(pri_raw, 0) if pri_raw not in (None, "") else None
    base = {
        "id": str(raw.get("id")),
        "name": str(raw.get("name") or "未命名任务"),
        "status": status,
        "statusLabel": STATUS_LABELS.get(status, status or "未知"),
        "bucket": bucket,
        "assignReason": reason,
        "assignedToRaw": describe_assignee(raw.get("assignedTo")),
        "assignedToRealName": str(raw.get("assignedToRealName") or ""),
        "teamAccounts": [member["account"] for member in team_members(raw, name_directory=name_directory)],
        "pri": pri,
        "priLabel": pri_label(pri),
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


def roles_from_tasks(raw_tasks):
    found = []
    for raw in raw_tasks or []:
        if not isinstance(raw, dict):
            continue
        for key in ("assignedTo", "finishedBy", "closedBy", "openedBy", "lastEditedBy"):
            value = raw.get(key)
            if isinstance(value, dict):
                found.append(value)
        for member in raw.get("team") or []:
            if isinstance(member, dict):
                found.append(member)
    return roles_from_users(found)


def aggregate_people(raw_tasks, roles=None):
    people = {}
    tasks = []
    role_directory = roles_from_tasks(raw_tasks)
    extra = roles if isinstance(roles, dict) else roles_from_users(roles)
    for account, info in (extra or {}).items():
        current = role_directory.get(account) or {"role": "", "name": ""}
        if isinstance(info, dict):
            if info.get("role"):
                current["role"] = info["role"]
            if info.get("name"):
                current["name"] = info["name"]
            if info.get("dept"):
                current["dept"] = info["dept"]
        elif info:
            current["role"] = str(info)
        role_directory[account] = current
    name_directory = build_name_directory(raw_tasks)
    for account, info in (role_directory or {}).items():
        if isinstance(info, dict):
            _remember_name(name_directory, account, info.get("name"))
    for raw in flatten_tasks(raw_tasks):
        for task in normalize_task_rows(raw, name_directory=name_directory):
            # Final pass: team-only accounts often lack realname on the row itself.
            mapped = name_directory.get(task["ownerAccount"])
            if mapped:
                task["ownerName"] = display_name(task["ownerAccount"], mapped)
            info = (role_directory or {}).get(task["ownerAccount"]) or {}
            role = info.get("role") if isinstance(info, dict) else str(info or "")
            dept = info.get("dept") if isinstance(info, dict) else ""
            task["ownerRole"] = str(role or "")
            task["ownerDept"] = str(dept or "")
            task["ownerRoleLabel"] = role_label(task["ownerRole"]) or task["ownerDept"]
            # Everyone with tasks stays in the totals. Dropping product/QA
            # removed real iteration hours and made the summary wrong.
            task["excluded"] = False
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
            elif _looks_like_account(person_row["name"]) and not _looks_like_account(task["ownerName"]):
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
        row["hourRate"] = (
            round(row["done"]["estimate"] / row["total"]["estimate"] * 1000) / 10
            if row["total"]["estimate"]
            else 0
        )
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
