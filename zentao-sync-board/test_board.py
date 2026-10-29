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
        # +1 doing from demo multi-person team task (account-only team rows).
        self.assertEqual(by_name["陈宇"]["doing"]["count"], 2)
        self.assertEqual(by_name["陈宇"]["done"]["count"], 1)
        self.assertEqual(by_name["陈宇"]["wait"]["estimate"], 8)
        self.assertEqual(by_name["陈宇"]["total"]["count"], 4)

        # pause counts as doing; closed task stays with the finisher, not "closed".
        self.assertEqual(by_name["王凯"]["doing"]["count"], 2)
        self.assertEqual(by_name["王凯"]["done"]["count"], 1)
        self.assertEqual(by_name["王凯"]["doing"]["estimate"], 11)
        self.assertNotIn("closed", by_name)
        team_names = {task["ownerName"] for task in tasks if task["id"] == "588-team"}
        self.assertEqual(team_names, {"陈宇", "李娜"})

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

    def test_team_task_without_assignee_is_not_unassigned(self):
        raw = [
            {
                "id": 9,
                "name": "多人联调",
                "status": "doing",
                "estimate": 10,
                "parent": 0,
                "assignedTo": "",
                "mode": "multi",
                "team": [
                    {"account": "chen", "realname": "陈宇", "estimate": 6, "consumed": 1, "left": 5},
                    {"account": "li", "realname": "李娜", "estimate": 4, "consumed": 0, "left": 4},
                ],
            }
        ]
        people, tasks = aggregate.aggregate_people(raw)
        by_name = {row["name"]: row for row in people}
        self.assertNotIn("未指派", by_name)
        self.assertEqual(by_name["陈宇"]["doing"]["count"], 1)
        self.assertEqual(by_name["陈宇"]["doing"]["estimate"], 6)
        self.assertEqual(by_name["李娜"]["doing"]["estimate"], 4)
        self.assertEqual(aggregate.unassigned_report(tasks), [])

    def test_team_account_only_resolves_chinese_name_from_other_tasks(self):
        raw = [
            {
                "id": 1,
                "name": "多人任务",
                "status": "doing",
                "estimate": 4,
                "parent": 0,
                "assignedTo": "",
                "team": [
                    {"account": "liping.liu", "estimate": 2},
                    {"account": "kaiyuan.hu", "estimate": 2},
                ],
            },
            {
                "id": 2,
                "name": "单人任务",
                "status": "wait",
                "estimate": 3,
                "parent": 0,
                "assignedTo": {"account": "liping.liu", "realname": "刘利平"},
            },
            {
                "id": 3,
                "name": "另一单人",
                "status": "wait",
                "estimate": 1,
                "parent": 0,
                "assignedTo": {"account": "kaiyuan.hu", "realname": "胡恺元"},
            },
        ]
        people, tasks = aggregate.aggregate_people(raw)
        by_account = {row["account"]: row for row in people}
        self.assertEqual(by_account["liping.liu"]["name"], "刘利平")
        self.assertEqual(by_account["kaiyuan.hu"]["name"], "胡恺元")
        team_rows = [task for task in tasks if task["id"] == "1"]
        self.assertEqual({row["ownerName"] for row in team_rows}, {"刘利平", "胡恺元"})

    def test_product_and_qa_are_left_off_the_board(self):
        raw = [
            {
                "id": 1,
                "name": "开发任务",
                "status": "done",
                "estimate": 3,
                "parent": 0,
                "assignedTo": {"account": "zhao.huang", "realname": "黄钊", "role": "dev"},
            },
            {
                "id": 2,
                "name": "未完成开发",
                "status": "wait",
                "estimate": 2,
                "parent": 0,
                "assignedTo": {"account": "zhao.huang", "realname": "黄钊", "role": "dev"},
            },
            {
                "id": 3,
                "name": "需求澄清",
                "status": "doing",
                "estimate": 6,
                "parent": 0,
                "assignedTo": {"account": "xingyu.fu", "realname": "付星宇", "role": "po"},
            },
            {
                "id": 4,
                "name": "回归用例",
                "status": "wait",
                "estimate": 4,
                "parent": 0,
                "assignedTo": {"account": "qa.li", "realname": "李测", "role": "qa"},
            },
        ]
        people, tasks = aggregate.aggregate_people(raw)
        names = {row["name"] for row in people}
        self.assertEqual(names, {"黄钊"})
        self.assertEqual(people[0]["hourRate"], 60)
        self.assertEqual(people[0]["done"]["estimate"], 3)
        self.assertEqual(people[0]["total"]["estimate"], 5)
        excluded = {task["ownerName"] for task in tasks if task.get("excluded")}
        self.assertEqual(excluded, {"付星宇", "李测"})
        self.assertTrue(aggregate.is_excluded_role("产品经理"))
        self.assertTrue(aggregate.is_excluded_role("测试主管"))
        self.assertFalse(aggregate.is_excluded_role("dev"))
        self.assertFalse(aggregate.is_excluded_role("pm"))

    def test_named_product_manager_hidden_without_role_code(self):
        raw = [
            {
                "id": 1,
                "name": "开发任务",
                "status": "doing",
                "estimate": 2,
                "parent": 0,
                "assignedTo": {"account": "zhao.huang", "realname": "黄钊"},
            },
            {
                "id": 2,
                "name": "需求",
                "status": "wait",
                "estimate": 4,
                "parent": 0,
                "assignedTo": {"account": "xingyu.fu", "realname": "付星宇"},
            },
        ]
        people, tasks = aggregate.aggregate_people(
            raw,
            roles={"qa.wang": {"role": "", "name": "王测", "dept": "测试组"}},
        )
        # Dept exclusion applies when that account owns a task.
        raw.append(
            {
                "id": 3,
                "name": "用例",
                "status": "wait",
                "estimate": 1,
                "parent": 0,
                "assignedTo": {"account": "qa.wang", "realname": "王测"},
            }
        )
        people, tasks = aggregate.aggregate_people(
            raw,
            roles={"qa.wang": {"role": "", "name": "王测", "dept": "测试组"}},
        )
        self.assertEqual({row["name"] for row in people}, {"黄钊"})
        self.assertEqual({task["ownerName"] for task in tasks if task.get("excluded")}, {"付星宇", "王测"})

    def test_p1_p2_includes_pri_1_and_2(self):
        self.assertTrue(aggregate.is_p1_p2(1))
        self.assertTrue(aggregate.is_p1_p2(2))
        self.assertFalse(aggregate.is_p1_p2(0))
        self.assertFalse(aggregate.is_p1_p2(3))
        self.assertEqual(aggregate.pri_label(2), "P2")
        self.assertEqual(aggregate.pri_label(1), "P1")

    def test_literal_wu_assignee_falls_back_to_finished_by(self):
        raw = [
            {
                "id": 3,
                "name": "已关单",
                "status": "closed",
                "estimate": 5,
                "parent": 0,
                "assignedTo": "无",
                "finishedBy": {"account": "wang", "realname": "王凯"},
            }
        ]
        people, tasks = aggregate.aggregate_people(raw)
        self.assertEqual(people[0]["name"], "王凯")
        self.assertEqual(tasks[0]["assignReason"], "finishedBy")
        self.assertEqual(aggregate.unassigned_report(tasks), [])


class TokenExtractTests(unittest.TestCase):
    def test_nested_and_cased_tokens(self):
        self.assertEqual(zentao_client.extract_token({"token": "a"}), "a")
        self.assertEqual(zentao_client.extract_token({"Token": "b"}), "b")
        self.assertEqual(zentao_client.extract_token({"data": {"token": "c"}}), "c")
        self.assertEqual(zentao_client.extract_token({"result": {"Token": "d"}}), "d")
        self.assertEqual(zentao_client.extract_token("e"), "e")

    def test_login_accepts_nested_token_payload(self):
        def request_fn(method, path, body, token):
            if path.startswith("/api.php/v1/tokens"):
                return {"data": {"token": "nested-tok"}}
            return {}

        client = zentao_client.ZenTaoClient("https://zentao.example", "dev", "secret", request_fn=request_fn)
        self.assertEqual(client.login(), "nested-tok")


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
        self.assertEqual(payload["totals"]["doing"]["count"], 8)
        self.assertEqual(payload["totals"]["done"]["count"], 5)
        self.assertTrue(payload["people"])
        self.assertEqual(payload["people"][0]["total"]["count"], max(row["total"]["count"] for row in payload["people"]))
        names = {row["name"] for row in payload["people"]}
        self.assertNotIn("付星宇", names)
        self.assertNotIn("李测", names)
        hidden = {row["name"] for row in payload["excludedPeople"]}
        self.assertEqual(hidden, {"付星宇", "李测"})

    def test_connect_switches_to_live_counts(self):
        body = json.dumps({"baseUrl": "https://zentao.example", "account": "dev", "password": "pw"}).encode()
        request = urllib.request.Request(self.base + "/api/connect", data=body, headers={"Content-Type": "application/json"})
        status = json.load(urllib.request.urlopen(request))
        self.assertTrue(status["connected"])
        self.assertEqual(status["token"], "tok")
        self.assertNotIn("password", status)

    def test_board_accepts_token_header_without_prior_connect(self):
        # Fresh app instance: no in-memory client, credentials come from headers.
        request = urllib.request.Request(
            self.base + "/api/board?executionId=588&force=1",
            headers={
                "X-Zentao-Base-Url": "https://zentao.example",
                "X-Zentao-Account": "dev",
                "X-Zentao-Password": "pw",
            },
        )
        # Ensure disconnect first so memory client is cleared.
        urllib.request.urlopen(urllib.request.Request(self.base + "/api/disconnect", data=b"{}", method="POST", headers={"Content-Type": "application/json"}))
        payload = json.load(urllib.request.urlopen(request))
        self.assertEqual(payload["mode"], "live")
        self.assertEqual(payload["people"][0]["name"], "周宁")
        self.assertEqual(payload["people"][0]["wait"]["count"], 2)
        self.assertEqual(payload["unassignedTasks"], [])

        payload = json.load(urllib.request.urlopen(self.base + "/api/board?executionId=588&force=1"))
        self.assertEqual(payload["mode"], "live")
        self.assertEqual(payload["execution"]["name"], "真实迭代 588")
        self.assertEqual(payload["people"][0]["name"], "周宁")
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
