"""Board snapshot assembly, demo fallback, and ZenTao polling cache."""

import json
import os
import threading
import time
from pathlib import Path

from aggregate import aggregate_people, normalize_execution, roles_from_users, summarize, unassigned_report
from demo_data import demo_executions, demo_roles, demo_tasks
from zentao_client import ZenTaoClient, ZenTaoError

CONFIG_PATH = Path(__file__).with_name(".zentao.local.json")
DEFAULT_BASE_URL = "https://zentao.designorder.cn"
DEFAULT_EXECUTION_ID = "588"
CACHE_TTL_SECONDS = 8


def _excluded_people(tasks):
    seen = set()
    rows = []
    for task in tasks or []:
        if not task.get("excluded"):
            continue
        account = task.get("ownerAccount")
        if account in seen:
            continue
        seen.add(account)
        rows.append(
            {
                "account": account,
                "name": task.get("ownerName") or account,
                "role": task.get("ownerRole") or "",
                "roleLabel": task.get("ownerRoleLabel") or "",
            }
        )
    rows.sort(key=lambda item: item["name"])
    return rows


def _is_serverless():
    return bool(os.environ.get("VERCEL")) or bool(os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))


class BoardApp:
    def __init__(self, client_factory=ZenTaoClient, now=None):
        self.client_factory = client_factory
        self.now = now or time.time
        self.lock = threading.RLock()
        self.client = None
        self.base_url = DEFAULT_BASE_URL
        self.account = ""
        self.password = ""
        self.cache = {}
        self.feeds = {}
        self.previous = {}
        self.last_error = ""
        self._load_saved_config()

    def status(self):
        with self.lock:
            return {
                "connected": self.client is not None,
                "mode": "live" if self.client is not None else "demo",
                "baseUrl": self.base_url,
                "account": self.account,
                "defaultExecutionId": os.environ.get("ZENTAO_EXECUTION_ID", DEFAULT_EXECUTION_ID),
                "pollSeconds": CACHE_TTL_SECONDS,
                "error": self.last_error,
                "hosting": "vercel" if os.environ.get("VERCEL") else "local",
                "envConfigured": bool(
                    os.environ.get("ZENTAO_ACCOUNT") or os.environ.get("ZENTAO_TOKEN")
                ),
            }

    def connect(self, base_url, account, password, token=""):
        client = self._make_client(base_url, account, password, token)
        with self.lock:
            self.client = client
            self.base_url = client.base_url
            self.account = client.account
            self.password = client.password
            self.cache.clear()
            self.previous.clear()
            self.last_error = ""
        if not _is_serverless():
            self._save_config(client.base_url, client.account, client.password, client.token)
        status = self.status()
        # Return token so browser / serverless clients can reuse it on later requests.
        status["token"] = client.token
        return status

    def ensure_credentials(self, base_url="", account="", password="", token=""):
        """Attach ZenTao credentials for this request (needed on Vercel serverless)."""
        base_url = (base_url or "").strip().rstrip("/")
        account = (account or "").strip()
        password = password or ""
        token = (token or "").strip()
        if not (token or (account and password)):
            return False
        with self.lock:
            same = (
                self.client is not None
                and (not base_url or self.client.base_url == base_url)
                and (not account or self.client.account == account)
                and ((token and self.client.token == token) or (password and self.client.password == password))
            )
            if same:
                return True
        client = self._make_client(base_url or self.base_url or DEFAULT_BASE_URL, account, password, token)
        with self.lock:
            self.client = client
            self.base_url = client.base_url
            self.account = client.account
            self.password = client.password
            self.last_error = ""
        return True

    def _make_client(self, base_url, account, password, token=""):
        base_url = (base_url or DEFAULT_BASE_URL).strip().rstrip("/")
        account = (account or "").strip()
        password = password or ""
        token = (token or "").strip()
        if not base_url:
            raise ZenTaoError("请填写禅道地址")
        if not token and (not account or not password):
            raise ZenTaoError("请填写禅道账号和密码")
        insecure = os.environ.get("ZENTAO_INSECURE_SSL", "").strip() in ("1", "true", "yes")
        client = self.client_factory(base_url, account, password, token=token, insecure_ssl=insecure)
        if token:
            client.token = token
        else:
            client.login()
        return client

    def disconnect(self):
        with self.lock:
            self.client = None
            self.account = ""
            self.password = ""
            self.cache.clear()
            self.previous.clear()
            self.feeds.clear()
            self.last_error = ""
        if not _is_serverless() and CONFIG_PATH.exists():
            CONFIG_PATH.unlink()
        return self.status()

    def board(self, execution_id, force=False):
        execution_id = str(execution_id or DEFAULT_EXECUTION_ID)
        with self.lock:
            client = self.client
            cached = self.cache.get(execution_id)
            fresh = cached and not force and (self.now() - cached["at"] < CACHE_TTL_SECONDS)
        if fresh:
            return self._payload_from_cache(execution_id, cached, stale=False)

        if client is None:
            snapshot = self._demo_snapshot(execution_id)
            error = ""
        else:
            try:
                snapshot = self._live_snapshot(client, execution_id)
                error = ""
            except ZenTaoError as exc:
                error = str(exc)
                with self.lock:
                    self.last_error = error
                    cached = self.cache.get(execution_id)
                if cached:
                    payload = self._payload_from_cache(execution_id, cached, stale=True)
                    payload["error"] = error
                    return payload
                snapshot = {
                    "execution": normalize_execution({}, execution_id),
                    "executions": [normalize_execution({}, execution_id)],
                    "raw_tasks": [],
                }

        people, tasks = aggregate_people(snapshot["raw_tasks"], roles=snapshot.get("roles") or {})
        excluded = _excluded_people(tasks)
        visible = [task for task in tasks if not task.get("excluded")]
        changes = self._record_changes(execution_id, visible)
        cached = {
            "at": self.now(),
            "execution": snapshot["execution"],
            "executions": snapshot["executions"],
            "people": people,
            "tasks": visible,
            "excludedPeople": excluded,
            "unassignedTasks": unassigned_report(visible),
            "totals": summarize(people),
            "mode": "demo" if client is None else "live",
        }
        with self.lock:
            self.cache[execution_id] = cached
            if error:
                self.last_error = error
            elif client is not None:
                self.last_error = ""
            feed = list(self.feeds.get(execution_id, []))
        return self._assemble(cached, feed, error, stale=bool(error and not snapshot["raw_tasks"]))

    def _demo_snapshot(self, execution_id):
        executions = demo_executions()
        execution = next((item for item in executions if item["id"] == execution_id), None)
        if execution is None:
            execution = normalize_execution({}, execution_id)
        return {
            "execution": execution,
            "executions": executions,
            "raw_tasks": demo_tasks(execution_id),
            "roles": demo_roles(execution_id),
        }

    def _live_snapshot(self, client, execution_id):
        raw_tasks = client.list_tasks(execution_id)
        project = ""
        detail = None
        try:
            detail = client.get_execution(execution_id)
            project = str(detail.get("project") or detail.get("parent") or "")
        except ZenTaoError:
            detail = None
        if not project and raw_tasks:
            project = str(raw_tasks[0].get("project") or "")
        executions = []
        if project and project not in ("0", "None"):
            try:
                executions = [normalize_execution(item) for item in client.list_executions(project)]
            except ZenTaoError:
                executions = []
        execution = normalize_execution(detail, execution_id) if detail else normalize_execution(
            {"id": execution_id, "project": project, "name": f"执行 {execution_id}"},
            execution_id,
        )
        if not any(item["id"] == execution["id"] for item in executions):
            executions.append(execution)
        executions.sort(key=lambda item: item["begin"] or item["id"], reverse=True)
        users = []
        departments = []
        if hasattr(client, "list_users"):
            try:
                users = client.list_users() or []
            except ZenTaoError:
                users = []
        if hasattr(client, "list_departments"):
            try:
                departments = client.list_departments() or []
            except ZenTaoError:
                departments = []
        if isinstance(detail, dict):
            for key in ("team", "members", "users"):
                rows = detail.get(key) or []
                if isinstance(rows, dict):
                    rows = list(rows.values())
                if isinstance(rows, list):
                    users.extend(row for row in rows if isinstance(row, dict))
        dept_names = {
            str(item.get("id")): str(item.get("name") or "")
            for item in departments
            if isinstance(item, dict) and item.get("id") not in (None, "")
        }
        return {
            "execution": execution,
            "executions": executions,
            "raw_tasks": raw_tasks,
            "roles": roles_from_users(users, dept_names),
        }

    def _record_changes(self, execution_id, tasks):
        current = {task["id"]: task for task in tasks}
        with self.lock:
            previous = self.previous.get(execution_id, {})
            changes = []
            if previous:
                for task in tasks:
                    old = previous.get(task["id"])
                    if old is None:
                        changes.append(f"新任务：{task['ownerName']}「{task['name']}」")
                    elif old["status"] != task["status"]:
                        changes.append(
                            f"{task['ownerName']}「{task['name']}」{old['statusLabel']} → {task['statusLabel']}"
                        )
                for task_id, old in previous.items():
                    if task_id not in current:
                        changes.append(f"任务移出本迭代：{old['ownerName']}「{old['name']}」")
            self.previous[execution_id] = {
                task_id: {"status": task["status"], "statusLabel": task["statusLabel"], "name": task["name"], "ownerName": task["ownerName"]}
                for task_id, task in current.items()
            }
            if changes:
                stamp = time.strftime("%H:%M:%S", time.localtime(self.now()))
                feed = self.feeds.setdefault(execution_id, [])
                for text in changes[:20]:
                    feed.insert(0, {"time": stamp, "text": text})
                del feed[12:]
            return list(self.feeds.get(execution_id, []))

    def _payload_from_cache(self, execution_id, cached, stale):
        with self.lock:
            feed = list(self.feeds.get(execution_id, []))
            error = self.last_error if stale else ""
        return self._assemble(cached, feed, error, stale)

    def _assemble(self, cached, feed, error, stale):
        return {
            "mode": cached["mode"],
            "syncedAt": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(cached["at"])),
            "stale": stale,
            "error": error,
            "execution": cached["execution"],
            "executions": cached["executions"],
            "people": cached["people"],
            "tasks": cached["tasks"],
            "excludedPeople": cached.get("excludedPeople") or [],
            "unassignedTasks": cached.get("unassignedTasks") or unassigned_report(cached["tasks"]),
            "totals": cached["totals"],
            "changes": feed,
        }

    def _load_saved_config(self):
        base_url = os.environ.get("ZENTAO_BASE_URL", "").strip() or DEFAULT_BASE_URL
        account = os.environ.get("ZENTAO_ACCOUNT", "").strip()
        password = os.environ.get("ZENTAO_PASSWORD", "")
        token = os.environ.get("ZENTAO_TOKEN", "").strip()
        file_cfg = {}
        if not _is_serverless() and CONFIG_PATH.exists():
            try:
                file_cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                file_cfg = {}
        if not account and not token:
            account = str(file_cfg.get("account") or "")
            password = str(file_cfg.get("password") or "")
            token = str(file_cfg.get("token") or "")
            if file_cfg.get("baseUrl"):
                base_url = str(file_cfg["baseUrl"])
        self.base_url = base_url.rstrip("/")
        self.account = account
        self.password = password
        if account or token:
            try:
                self.connect(self.base_url, account, password, token=token)
            except ZenTaoError as exc:
                self.last_error = str(exc)
                self.client = None

    def _save_config(self, base_url, account, password, token):
        if _is_serverless():
            return
        payload = {"baseUrl": base_url, "account": account, "password": password, "token": token}
        CONFIG_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        try:
            os.chmod(CONFIG_PATH, 0o600)
        except OSError:
            pass
