import json
import tempfile
import threading
import unittest
import urllib.request
from pathlib import Path

import aggregate
import demo_data
import server
import service
import zentao_client


class AggregateTests(unittest.TestCase):
    def test_demo_588_buckets_hours_and_closed_owner(self):
        people, tasks = aggregate.aggregate_people(demo_data.demo_tasks("588"))
        by_name = {row["name"]: row for row in people}

        self.assertEqual(by_name["陈宇"]["wait"]["count"], 1)
        self.assertEqual(by_name["陈宇"]["doing"]["count"], 1)
        self.assertEqual(by_name["陈宇"]["done"]["count"], 1)
        self.assertEqual(by_name["陈宇"]["wait"]["estimate"], 8)
        self.assertEqual(by_name["陈宇"]["total"]["count"], 3)

        # pause counts as doing; closed task stays with the finisher, not "closed".
        self.assertEqual(by_name["王凯"]["doing"]["count"], 2)
        self.assertEqual(by_name["王凯"]["done"]["count"], 1)
        self.assertEqual(by_name["王凯"]["doing"]["estimate"], 11)
        self.assertNotIn("closed", by_name)

        # cancelled work is excluded from the main total.
        self.assertEqual(by_name["孙浩"]["other"]["count"], 1)
        self.assertEqual(by_name["孙浩"]["total"]["count"], 2)

        closed = next(task for task in tasks if task["name"] == "执行切换缓存")
        self.assertEqual(closed["bucket"], "done")
        self.assertEqual(closed["ownerName"], "王凯")

    def test_parent_task_is_not_double_counted(self):
        raw = [
            {
                "id": 1,
                "name": "父任务",
                "status": "doing",
                "estimate": 10,
                "parent": -1,
                "assignedTo": {"account": "chen", "realname": "陈宇"},
                "children": [
                    {
                        "id": 2,
                        "name": "子任务",
                        "status": "wait",
                        "estimate": 4,
                        "parent": 1,
                        "assignedTo": {"account": "chen", "realname": "陈宇"},
                    }
                ],
            }
        ]
        people, tasks = aggregate.aggregate_people(raw)
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["name"], "子任务")
        self.assertEqual(people[0]["wait"]["count"], 1)
        self.assertEqual(people[0]["total"]["estimate"], 4)

    def test_chart_series_sorted_by_task_count(self):
        people, _tasks = aggregate.aggregate_people(demo_data.demo_tasks("601"))
        counts = [row["total"]["count"] for row in people]
        self.assertEqual(counts, sorted(counts, reverse=True))
        self.assertGreater(people[0]["total"]["count"], 0)


class ClientTests(unittest.TestCase):
    def test_login_and_paged_tasks(self):
        calls = []

        def request_fn(method, path, body, token):
            calls.append((method, path, body, token))
            if path.startswith("/api.php/v1/tokens"):
                return {"token": "abc"}
            if "page=1" in path:
                return {
                    "page": 1,
                    "total": 3,
                    "limit": 100,
                    "tasks": [{"id": 1, "name": "a"}, {"id": 2, "name": "b"}],
                }
            if "page=2" in path:
                return {"page": 2, "total": 3, "limit": 100, "tasks": [{"id": 3, "name": "c"}]}
            return {"tasks": []}

        client = zentao_client.ZenTaoClient(
            "https://zentao.example/zentao",
            "dev",
            "secret",
            request_fn=request_fn,
        )
        tasks = client.list_tasks(588)
        self.assertEqual([task["id"] for task in tasks], [1, 2, 3])
        self.assertEqual(calls[0][0], "POST")
        self.assertEqual(calls[0][2]["account"], "dev")
        self.assertEqual(calls[1][3], "abc")
        self.assertNotIn("secret", json.dumps(calls[1]))

class RetryTests(unittest.TestCase):
    def test_401_refreshes_token(self):
        seen = []

        def request_fn(method, path, body, token):
            seen.append(token)
            if path.startswith("/api.php/v1/tokens"):
                return {"token": "fresh"}
            if token != "fresh":
                raise zentao_client.ZenTaoError("no", status=401)
            return {"id": 7, "name": "迭代 7", "project": 1}

        client = zentao_client.ZenTaoClient("https://zentao.example", "dev", "pw", token="stale", request_fn=request_fn)
        payload = client.get_execution(7)
        self.assertEqual(payload["name"], "迭代 7")
        self.assertEqual(client.token, "fresh")
        self.assertIn("stale", seen)


class BoardHttpTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.old = service.CONFIG_PATH
        service.CONFIG_PATH = Path(self.tmp.name) / ".zentao.local.json"
        self.app = service.BoardApp(client_factory=FakeClient)
        self.httpd = server.create_server("127.0.0.1", 0, app=self.app)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.httpd.server_address[1]}"

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        service.CONFIG_PATH = self.old
        self.tmp.cleanup()

    def test_cached_poll_stays_responsive(self):
        first = json.load(urllib.request.urlopen(self.base + "/api/board?executionId=588", timeout=3))
        second = json.load(urllib.request.urlopen(self.base + "/api/board?executionId=588", timeout=3))
        status = json.load(urllib.request.urlopen(self.base + "/api/status", timeout=3))
        self.assertEqual(second["totals"]["total"]["count"], first["totals"]["total"]["count"])
        self.assertEqual(status["mode"], "demo")

    def test_demo_board_and_page(self):
        page = urllib.request.urlopen(self.base + "/").read().decode("utf-8")
        self.assertIn('id="chart"', page)
        self.assertIn('id="iterationChips"', page)
        self.assertIn("各开发任务量", page)

        payload = json.load(urllib.request.urlopen(self.base + "/api/board?executionId=588"))
        self.assertEqual(payload["mode"], "demo")
        self.assertEqual(payload["totals"]["wait"]["count"], 3)
        self.assertEqual(payload["totals"]["doing"]["count"], 6)
        self.assertEqual(payload["totals"]["done"]["count"], 5)
        self.assertTrue(payload["people"])
        self.assertEqual(payload["people"][0]["total"]["count"], max(row["total"]["count"] for row in payload["people"]))

    def test_connect_switches_to_live_counts(self):
        body = json.dumps({"baseUrl": "https://zentao.example", "account": "dev", "password": "pw"}).encode()
        request = urllib.request.Request(self.base + "/api/connect", data=body, headers={"Content-Type": "application/json"})
        status = json.load(urllib.request.urlopen(request))
        self.assertTrue(status["connected"])
        self.assertNotIn("password", status)

        payload = json.load(urllib.request.urlopen(self.base + "/api/board?executionId=588&force=1"))
        self.assertEqual(payload["mode"], "live")
        self.assertEqual(payload["execution"]["name"], "真实迭代 588")
        self.assertEqual(payload["people"][0]["name"], "周宁")
        self.assertEqual(payload["people"][0]["wait"]["count"], 2)
        self.assertEqual(payload["totals"]["total"]["estimate"], 9)

        again = json.load(urllib.request.urlopen(self.base + "/api/board?executionId=588&force=1"))
        texts = [item["text"] for item in again["changes"]]
        self.assertTrue(any("未开始 → 进行中" in text for text in texts))


class FakeClient:
    def __init__(self, base_url, account, password, token="", insecure_ssl=False, request_fn=None):
        self.base_url = base_url
        self.account = account
        self.password = password
        self.token = token
        self.reads = 0

    def login(self):
        if self.password != "pw":
            raise zentao_client.ZenTaoError("账号或密码错误")
        self.token = "tok"

    def list_tasks(self, execution_id):
        self.reads += 1
        status = "wait" if self.reads == 1 else "doing"
        return [
            {
                "id": 11,
                "name": "接口联调",
                "status": status,
                "estimate": 5,
                "consumed": 1,
                "left": 4,
                "parent": 0,
                "assignedTo": {"account": "zhou", "realname": "周宁"},
                "project": 3,
            },
            {
                "id": 12,
                "name": "字段补齐",
                "status": "wait",
                "estimate": 4,
                "consumed": 0,
                "left": 4,
                "parent": 0,
                "assignedTo": "zhou",
                "assignedToRealName": "周宁",
                "project": 3,
            },
        ]

    def get_execution(self, execution_id):
        return {"id": int(execution_id), "name": f"真实迭代 {execution_id}", "project": 3, "begin": "2026-10-01", "end": "2026-10-14", "status": "doing"}

    def list_executions(self, project_id):
        return [
            {"id": 588, "name": "真实迭代 588", "project": project_id, "begin": "2026-10-01", "end": "2026-10-14", "status": "doing"},
            {"id": 590, "name": "真实迭代 590", "project": project_id, "begin": "2026-10-15", "end": "2026-10-28", "status": "wait"},
        ]


class BoardAppChangeTests(unittest.TestCase):
    def test_second_fetch_records_status_change(self):
        tmp = tempfile.TemporaryDirectory()
        old = service.CONFIG_PATH
        service.CONFIG_PATH = Path(tmp.name) / "none.json"
        try:
            app = service.BoardApp(client_factory=FakeClient)
            app.connect("https://zentao.example", "dev", "pw")
            first = app.board("588", force=True)
            self.assertEqual(first["changes"], [])
            second = app.board("588", force=True)
            self.assertIn("未开始 → 进行中", second["changes"][0]["text"])
        finally:
            service.CONFIG_PATH = old
            tmp.cleanup()


if __name__ == "__main__":
    unittest.main()
