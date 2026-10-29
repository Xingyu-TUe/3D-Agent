"""Minimal ZenTao REST v1 client (token auth, paged task/execution reads)."""

import hashlib
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
        last_error = None
        for password in _password_candidates(self.password):
            try:
                payload = self._request(
                    "POST",
                    "/api.php/v1/tokens",
                    {"account": self.account, "password": password},
                    auth=False,
                )
            except ZenTaoError as exc:
                last_error = exc
                # Wrong password is definitive; other formats unlikely to help.
                if exc.status == 400 or "登录失败" in str(exc):
                    raise
                continue
            token = extract_token(payload)
            if token:
                self.token = token
                return token
            last_error = ZenTaoError(
                "禅道未返回 Token。响应："
                + _short_payload(payload)
                + "。请确认账号密码正确，且后台已开启 REST API（api.php）。"
            )
        if last_error:
            raise last_error
        raise ZenTaoError("禅道未返回 Token，请确认账号密码以及 REST API 已开启")

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

    def list_users(self):
        """Inside-user browse includes role; the default list often omits it."""
        items = []
        seen = set()
        page = 1
        while page <= 20:
            query = urllib.parse.urlencode({"page": page, "limit": 100, "browse": "inside"})
            try:
                payload = self._request("GET", f"/api.php/v1/users?{query}")
            except ZenTaoError:
                break
            batch = []
            if isinstance(payload, dict):
                batch = payload.get("users") or payload.get("user") or []
            elif isinstance(payload, list):
                batch = payload
            if not isinstance(batch, list) or not batch:
                break
            fresh = 0
            for item in batch:
                if not isinstance(item, dict):
                    continue
                item_id = str(item.get("id") or item.get("account") or "")
                if item_id in seen:
                    continue
                seen.add(item_id)
                items.append(item)
                fresh += 1
            if not fresh:
                break
            page += 1
        return items

    def list_departments(self):
        try:
            payload = self._request("GET", "/api.php/v1/departments")
        except ZenTaoError:
            return []
        rows = []
        if isinstance(payload, dict):
            rows = payload.get("departments") or payload.get("depts") or []
        elif isinstance(payload, list):
            rows = payload
        flat = []

        def walk(nodes):
            for node in nodes or []:
                if not isinstance(node, dict):
                    continue
                flat.append(node)
                children = node.get("children") or node.get("child") or []
                if isinstance(children, dict):
                    children = list(children.values())
                walk(children)

        walk(rows if isinstance(rows, list) else [])
        return flat

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
                content_type = response.headers.get("Content-Type", "")
        except urllib.error.HTTPError as exc:
            raw = exc.read()
            payload = _parse_json(raw)
            raise ZenTaoError(_error_message(payload) or f"禅道请求失败（{exc.code}）", status=exc.code)
        except urllib.error.URLError as exc:
            raise ZenTaoError(f"无法连接禅道：{exc.reason}")
        payload = _parse_json(raw)
        if not payload and raw:
            snippet = raw[:120].decode("utf-8", errors="replace")
            raise ZenTaoError(f"禅道返回了非 JSON 内容（{content_type}）：{snippet}")
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


def extract_token(payload):
    if isinstance(payload, str) and payload.strip():
        return payload.strip()
    if not isinstance(payload, dict):
        return ""
    for key in ("token", "Token", "accessToken", "access_token"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if isinstance(value, dict):
            nested = extract_token(value)
            if nested:
                return nested
    data = payload.get("data")
    if isinstance(data, (dict, str)):
        nested = extract_token(data)
        if nested:
            return nested
    result = payload.get("result")
    if isinstance(result, (dict, str)):
        nested = extract_token(result)
        if nested:
            return nested
    return ""


def _password_candidates(password):
    plain = password or ""
    candidates = [plain]
    # Some ZenTao installs expect an MD5 password for the REST token API.
    if plain and not _looks_like_md5(plain):
        candidates.append(hashlib.md5(plain.encode("utf-8")).hexdigest())
    return candidates


def _looks_like_md5(value):
    if len(value) != 32:
        return False
    return all(ch in "0123456789abcdefABCDEF" for ch in value)


def _parse_json(raw):
    if not raw:
        return {}
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        return {}
    text = text.strip()
    if not text:
        return {}
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Some ZenTao installs wrap JSON in HTML comments or prepend junk.
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                return {}
        return {}


def _error_message(payload):
    if not isinstance(payload, dict):
        return ""
    for key in ("error", "message", "msg"):
        value = payload.get(key)
        if value:
            return str(value)
    return ""


def _short_payload(payload):
    try:
        text = json.dumps(payload, ensure_ascii=False)
    except TypeError:
        text = str(payload)
    return text[:180]
