"""Minimal ZenTao REST v1 client (token auth, paged task/execution reads)."""

import json
import ssl
import urllib.error
import urllib.parse
import urllib.request


class ZenTaoError(Exception):
    def __init__(self, message, status=None):
        super().__init__(message)
        self.status = status


class ZenTaoClient:
    def __init__(self, base_url, account="", password="", token="", timeout=20, insecure_ssl=False, request_fn=None):
        self.base_url = (base_url or "").rstrip("/")
        self.account = account or ""
        self.password = password or ""
        self.token = token or ""
        self.timeout = timeout
        self.request_fn = request_fn
        self.ssl_context = ssl._create_unverified_context() if insecure_ssl else None

    def login(self):
        if not self.account or not self.password:
            raise ZenTaoError("缺少禅道账号或密码")
        payload = self._request(
            "POST",
            "/api.php/v1/tokens",
            {"account": self.account, "password": self.password},
            auth=False,
        )
        token = payload.get("token") if isinstance(payload, dict) else None
        if not token:
            raise ZenTaoError("禅道未返回 Token，请确认账号密码以及 REST API 已开启")
        self.token = token
        return token

    def get_execution(self, execution_id):
        payload = self._request("GET", f"/api.php/v1/executions/{execution_id}")
        if isinstance(payload, dict) and "id" in payload:
            return payload
        if isinstance(payload, dict):
            for key in ("execution", "data"):
                if isinstance(payload.get(key), dict):
                    return payload[key]
        raise ZenTaoError(f"无法读取执行 {execution_id}")

    def list_executions(self, project_id):
        return self._collect(f"/api.php/v1/projects/{project_id}/executions", "executions")

    def list_tasks(self, execution_id):
        return self._collect(f"/api.php/v1/executions/{execution_id}/tasks", "tasks")

    def _collect(self, path, key):
        items = []
        seen = set()
        page = 1
        total = None
        while page <= 50:
            query = urllib.parse.urlencode({"page": page, "limit": 100})
            payload = self._request("GET", f"{path}?{query}")
            batch = []
            if isinstance(payload, dict):
                batch = payload.get(key) or []
                if total is None:
                    try:
                        total = int(payload.get("total"))
                    except (TypeError, ValueError):
                        total = None
            if not isinstance(batch, list) or not batch:
                break
            fresh = []
            for item in batch:
                if not isinstance(item, dict):
                    continue
                item_id = str(item.get("id"))
                if item_id in seen:
                    continue
                seen.add(item_id)
                fresh.append(item)
            if not fresh:
                break
            items.extend(fresh)
            if total is not None and len(items) >= total:
                break
            page += 1
        return items

    def _request(self, method, path, body=None, auth=True, _retry=True):
        if auth and not self.token and not path.startswith("/api.php/v1/tokens"):
            self.login()
        try:
            if self.request_fn:
                return self.request_fn(method, path, body, self.token if auth else None)
            return self._send(method, self._url(path), body, auth)
        except ZenTaoError as exc:
            if _retry and exc.status == 401 and auth and not path.startswith("/api.php/v1/tokens"):
                self.token = ""
                self.login()
                return self._request(method, path, body, True, _retry=False)
            raise

    def _send(self, method, url, body, auth):
        data = None
        headers = {"Accept": "application/json"}
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if auth and self.token:
            headers["Token"] = self.token
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout, context=self.ssl_context) as response:
                raw = response.read()
        except urllib.error.HTTPError as exc:
            raw = exc.read()
            payload = _parse_json(raw)
            raise ZenTaoError(_error_message(payload) or f"禅道请求失败（{exc.code}）", status=exc.code)
        except urllib.error.URLError as exc:
            raise ZenTaoError(f"无法连接禅道：{exc.reason}")
        payload = _parse_json(raw)
        if isinstance(payload, dict) and payload.get("error"):
            raise ZenTaoError(str(payload.get("error")))
        return payload

    def _url(self, path):
        if not self.base_url:
            raise ZenTaoError("缺少禅道地址")
        base = self.base_url
        if base.endswith("/api.php") and path.startswith("/api.php"):
            return base + path[len("/api.php") :]
        return base + path


def _parse_json(raw):
    if not raw:
        return {}
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return {}


def _error_message(payload):
    if not isinstance(payload, dict):
        return ""
    for key in ("error", "message", "msg"):
        value = payload.get(key)
        if value:
            return str(value)
    return ""
