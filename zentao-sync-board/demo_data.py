"""Sample iterations used when ZenTao credentials are not configured."""

DEMO_EXECUTIONS = [
    {
        "id": "588",
        "name": "迭代 588 · 订单中台联调",
        "begin": "2026-09-22",
        "end": "2026-10-10",
        "status": "doing",
        "project": "80",
    },
    {
        "id": "601",
        "name": "迭代 601 · 履约可视化",
        "begin": "2026-10-06",
        "end": "2026-10-20",
        "status": "doing",
        "project": "80",
    },
    {
        "id": "572",
        "name": "迭代 572 · 报价引擎优化",
        "begin": "2026-09-01",
        "end": "2026-09-18",
        "status": "closed",
        "project": "80",
    },
]

# title, account, realname, status, estimate, consumed, left
_ROWS = {
    "588": [
        ("订单列表筛选重构", "chen", "陈宇", "done", 6, 6, 0),
        ("看板状态色板", "chen", "陈宇", "doing", 4, 1.5, 2.5),
        ("移动端适配", "chen", "陈宇", "wait", 8, 0, 8),
        ("任务同步接口", "li", "李娜", "done", 10, 11, 0),
        ("工时聚合查询", "li", "李娜", "doing", 6, 2, 4),
        ("Webhook 签名校验", "li", "李娜", "wait", 5, 0, 5),
        ("执行切换缓存", "wang", "王凯", "closed", 4, 4, 0),
        ("实时推送联调", "wang", "王凯", "doing", 8, 3, 5),
        ("失败重试策略", "wang", "王凯", "pause", 3, 1, 2),
        ("人员筛选组件", "zhao", "赵敏", "done", 3, 3, 0),
        ("明细卡片交互", "zhao", "赵敏", "doing", 5, 2, 3),
        ("空状态文案", "zhao", "赵敏", "wait", 2, 0, 2),
        ("权限中间层", "sun", "孙浩", "done", 7, 8, 0),
        ("审计日志落库", "sun", "孙浩", "doing", 6, 1, 5),
        ("导出 CSV", "sun", "孙浩", "cancel", 4, 0, 4),
    ],
    "601": [
        ("履约地图底图", "chen", "陈宇", "doing", 8, 2, 6),
        ("节点动画", "chen", "陈宇", "wait", 5, 0, 5),
        ("轨迹回放 API", "li", "李娜", "doing", 9, 4, 5),
        ("异常告警规则", "li", "李娜", "wait", 6, 0, 6),
        ("大屏布局", "wang", "王凯", "done", 7, 7, 0),
        ("指标卡片", "wang", "王凯", "doing", 4, 1, 3),
        ("图例组件", "zhao", "赵敏", "wait", 3, 0, 3),
        ("状态筛选", "zhao", "赵敏", "doing", 4, 2, 2),
        ("消息队列消费", "sun", "孙浩", "done", 8, 9, 0),
        ("延迟补偿任务", "sun", "孙浩", "wait", 5, 0, 5),
    ],
    "572": [
        ("报价公式校验", "li", "李娜", "done", 8, 8, 0),
        ("缓存击穿修复", "li", "李娜", "closed", 5, 6, 0),
        ("对比面板", "chen", "陈宇", "done", 6, 6, 0),
        ("历史版本 diff", "chen", "陈宇", "done", 4, 4, 0),
        ("批量重算", "wang", "王凯", "done", 10, 12, 0),
        ("灰度开关", "wang", "王凯", "done", 3, 3, 0),
        ("表单校验提示", "zhao", "赵敏", "done", 3, 2, 0),
        ("单元测试补齐", "sun", "孙浩", "done", 7, 7, 0),
    ],
}


def demo_executions():
    return [dict(item) for item in DEMO_EXECUTIONS]


def demo_tasks(execution_id):
    rows = _ROWS.get(str(execution_id), [])
    tasks = []
    for index, (title, account, realname, status, estimate, consumed, left) in enumerate(rows):
        assigned = account
        finished = None
        if status == "closed":
            assigned = "closed"
            finished = {"account": account, "realname": realname}
        tasks.append(
            {
                "id": f"{execution_id}-{index}",
                "name": title,
                "status": status,
                "estimate": estimate,
                "consumed": consumed,
                "left": left,
                "pri": (index % 3) + 1,
                "type": "devel",
                "parent": 0,
                "assignedTo": {"account": assigned, "realname": realname if assigned != "closed" else "Closed"},
                "assignedToRealName": realname if assigned != "closed" else "",
                "finishedBy": finished,
                "project": 80,
                "execution": int(execution_id) if str(execution_id).isdigit() else execution_id,
            }
        )
    if str(execution_id) == "588":
        # Team members without realname — should resolve via other tasks' Chinese names.
        tasks.append(
            {
                "id": f"{execution_id}-team",
                "name": "跨人联调",
                "status": "doing",
                "estimate": 8,
                "consumed": 1,
                "left": 7,
                "pri": 2,
                "type": "devel",
                "parent": 0,
                "assignedTo": "",
                "assignedToRealName": "",
                "mode": "multi",
                "team": [
                    {"account": "chen", "estimate": 4, "consumed": 0.5, "left": 3.5},
                    {"account": "li", "estimate": 4, "consumed": 0.5, "left": 3.5},
                ],
                "project": 80,
                "execution": 588,
            }
        )
    return tasks
