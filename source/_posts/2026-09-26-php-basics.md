---
title: PHP语言基础
date: 2026-09-26
categories: 学习日志
abbrlink: php-basics
description: PHP 语言基础整理（安全视角）——弱类型比较、超级全局变量、常用函数与陷阱、正则与过滤、编码与哈希、数据库相关，以及过滤绕过的通用原理
---
# PHP语言基础

[PHP: 语言参考 - Manual](https://www.php.net/manual/zh/langref.php)

---

## 一、基础语法

PHP 代码以 **`<?php`** 开始，以 **`?>`** 结束（如果整个文件都是 PHP，结尾的 `?>` 可以省略）：

```php
<?php
//这是PHP单行注释
/*这是PHP多行注释*/
?>
```

### 1.1 输出

PHP 有两个基本输出方式：

* `echo`：可以输出一个或多个字符串，**没有返回值**。
* `print`：只允许输出一个字符串，**返回值固定是 1**（所以它其实是个"有返回值的表达式"）。

> 安全上，`echo` 是最常见的"回显"手段。
> SQL 注入时页面会把查询结果打出来，靠的就是 `echo`；反序列化利用时想看到执行结果，也常靠它。

### 1.2 变量

#### 变量规则

* 以 `$` 符号开始，后面跟变量名
* 变量名必须以**字母或下划线**开头
* 变量名只能包含**字母、数字、下划线**（`A-z`、`0-9`、`_`）
* 变量名不能包含空格
* 变量名**区分大小写**

PHP 是**弱类型语言**，定义变量时不需要声明类型，类型由赋的值决定。

```php
<?php
$a = 1;          // 现在 $a 是整数
$a = "hello";    // 同一个变量，现在变成了字符串
?>
```

> **变量名规则在命令注入里的应用（`$IFS` 代替空格）**
> 
> `$IFS` 是 shell 的内置变量，值默认是"空格、Tab、换行"。
> 所以把 `$IFS` 写进命令里，shell 会把它展开成空格 —— **当空格被过滤时，这就是替代方案**：
> 
> ```
> cat$IFSflag.php    →  shell 展开后  →  cat flag.php
> ```
> 
> 但实际上，shell 遇到 `$` 之后，会**尽可能多地把「字母、数字、下划线」读成变量名**，一直读到"不能当变量名的字符"才停下。
> 
> 于是：shell 会认为变量名叫 "IFSfla" → "IFSfla" 这个变量不存在 → 展开成空字符串→ 结果变成  cat.php 
> 
> **所以需要"明确告诉 shell 变量名在哪结束"。两种写法：**
> 
> | 写法       | 原理                                                         |
> | -------- | ---------------------------------------------------------- |
> | `${IFS}` | **花括号明确划出边界**，变量名就是 `IFS`                                  |
> | `$IFS$1` | `$1` 是"位置参数"（值为空），但它信号明确 —— shell 读到 `$1` 就知道该结束了，不会再往后读字母 |
> 
> `$1` 能"断开"的原因：因为它长得像变量（以 `$` 开头），但紧跟着的是**数字**——而变量名不能以数字开头，所以 shell 到这里自然停住，把 `$1` 当成一个独立的参数来处理（虽然它的值是空的）。

#### 变量赋值

```php
$flag = "flag{weak_type_1}";               // 把字符串存进变量 $flag
$flag = file_get_contents('/flag');        // 从文件读
$flag = getenv('FLAG');                    // 从环境变量读
include 'flag.php';                        // 从另一个文件引入
```

**补充：`??`（空合并运算符，PHP 7 新增）**

```php
$action = $_GET['action'] ?? '';
```

**含义**："左边**存在且不为 null** 就用左边，否则用右边。"

```php
$arr = [];
$arr['x'] ?? 'default'          // "default"  ← 键不存在，用右边
$arr2 = ['x' => 'real'];
$arr2['x'] ?? 'default'         // "real"     ← 键存在，用左边

// 等价于：
isset($arr['x']) ? $arr['x'] : 'default'
```

**常见用途**：给可能没传的参数设默认值（不用先写 `isset` 判断）。

> **审计时注意**：`??` 只判断"**存不存在**"，**不判断值是否为空**。
> `?a=0` 时 `$_GET['a'] ?? 'x'` 返回的是 `0`（不是 `'x'`），因为 `0` 是存在的值。
> 如果要连"空值"一起兜住，得用 `?:`（`$_GET['a'] ?: 'x'`，`0`、`''`、`'0'` 都会走右边）。
> **这两个运算符的差别，经常是逻辑漏洞的来源。**



### 1.3 弱类型比较

PHP 比较两个值是否相等，有两个运算符：

| 运算符   | 含义        | 类型处理               |
| ----- | --------- | ------------------ |
| `==`  | 松散比较（弱比较） | **会自动做类型转换**，只比"值" |
| `===` | 严格比较      | **类型和值都要相同**       |

**规则一：字符串和数字比较时，PHP 会把字符串转成数字**

转换规则是：**从字符串开头读数字，读到不能当数字的字符就停，后面全部丢弃。**

| 表达式             | 结果     | 原因                      |
| --------------- | ------ | ----------------------- |
| `'123' == 123`  | `true` | `'123'` → `123`         |
| `'123a' == 123` | `true` | 读到 `a` 停下，前半是 `123`     |
| `'abc' == 0`    | `true` | 开头不是数字 → 转成 `0`         |
| `'1abc' == 1`   | `true` | 同上逻辑                    |
| `'abc1' == 0`   | `true` | 注意是从字符串开头读数字，读到不能当数字的字符 |

**规则二：`''`、`0`、`false`、`NULL` 之间弱比较是"相等"的**

```php
'' == 0        // true
'' == false    // true
'' == NULL     // true
0 == false     // true
0 == NULL      // true
```

**规则三：`0e` 开头的字符串会被当作科学计数法**

```php
'0e123456789' == '0e987654321'    // true！
```

原因：两个字符串都以 `0e` 开头，PHP 认为它们是"科学计数法数字"，`0e123456789` = 0 × 10^123456789 = **0**。两个都等于 0，所以相等。

**规则四：数组之间的弱比较**

```php
[false] == [0] == [NULL] == ['']     // true
```

因为数组比较时，元素也走弱比较，而 `false` / `0` / `NULL` / `''` 之间弱比较都是相等的。

**规则五：`true == 1`，`false == 0`**

**规则六：认识带空格的数字 `" 123" == 123`**

> 弱类型是所有 PHP 逻辑漏洞的**共同根源**。它出现在这些典型场景：
> 
> | 场景                  | 怎么利用                                     |
> | ------------------- | ---------------------------------------- |
> | 密码用 `==` 判断         | `'404abc' == 404` → 传个"数字开头 + 字母结尾"的值就过了 |
> | `md5` 之后用 `==` 比较   | 找两个 md5 以 `0e` 开头的字符串，两者弱比较相等            |
> | 用 `==` 判断是否为空       | `'' == 0` 为真 → 传 `0` 可能被当成"空"            |
> | 用 `==` 比 token / 哈希 | 可能因为类型转换提前匹配上                            |

### 1.4 超级全局变量

这些是 PHP 预定义的**全局数组变量**，在任何作用域都能直接访问，所以叫"超级全局变量"。

| 变量          | 包含什么                                             | 应用                                                                                    |
| ----------- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `$GLOBALS`  | 一个包含全部全局变量的数组，变量名就是数组的键                          | 变量覆盖相关                                                                                |
| `$_SERVER`  | 头信息、路径、脚本位置等（由 Web 服务器创建）                        | **`HTTP_HOST`**（Host 头注入）、**`REQUEST_URI`**、**`REMOTE_ADDR`**（IP 判断绕过）、`QUERY_STRING` |
| `$_REQUEST` | **默认包含 `$_GET` + `$_POST` + `$_COOKIE`**         | 范围最大，三种方式都能传，所以常被用来"试探"参数从哪进，而且**这个"同名不同来源"的歧义也是一类绕过来源。**                             |
| `$_GET`     | URL 查询串里的数据                                      | 最常见的注入入口                                                                              |
| `$_POST`    | POST 请求体里的数据                                     | **注意：只有 `Content-Type` 是表单格式时才会被填充**                                                  |
| `$_FILES`   | 上传的文件信息（`name`、`type`、`tmp_name`、`size`、`error`） | 文件上传题的入口                                                                              |
| `$_COOKIE`  | 客户端带来的 Cookie                                    | 身份伪造的常见位置                                                                             |
| `$_SESSION` | 服务器端会话数据                                         | 身份的真正来源                                                                               |
| `$_ENV`     | 环境变量                                             | 偶尔能读到配置信息                                                                             |

---

## 二、函数

### 2.1 常规

#### `in_array()`

```php
bool in_array ( mixed $needle , array $haystack [, bool $strict = false ] )
```

**作用：判断"某个值在不在数组里"**

注：不传第三个参数（`$strict`）时，`in_array` 用的是弱比较（`==`），当`in_array($_page, $whitelist, true)`时，类型也要相同才匹配。

示例：

```php
$whitelist = ["source.php", "hint.php"];

in_array("source.php", $whitelist)        // true
in_array("hint.php", $whitelist)          // true
in_array("flag.php", $whitelist)          // false
in_array("source.php?/../x", $whitelist)  // false  
```

#### `die(message)`

输出消息并终止脚本（等价于 `exit`）。

> die之后代码不再执行

#### `rand(min,max)`

生成随机整数

> rand()生成的随机数**可预测** → 如果用它生成 token / 验证码，就能被猜出来

#### `sleep(seconds)`

延迟执行若干秒

> `sleep()` 是**时间盲注**的基础 —— 页面不回显时，用"响应时间"当判断依据

#### `file_get_contents($path)`

把文件内容当字符串读出来并返回。它是读文件函数，不是执行。

> 如果它的路径参数可控，就是"任意文件读取"漏洞

```php
echo file_get_contents("/var/www/files/" . $path);  
//先把/var/www/files/和$path两段字符串拼起来（比如$path = "../../etc/passwd"的话，拼出来就是/var/www/files/../../etc/passwd），用拼好的路径去读文件，把内容输出到页面
```

注：PHP 里 **`.` 是字符串连接运算符，就是"拼接"的意思**

#### `move_uploaded_file($from, $to)`

把上传的临时文件**移动到目标路径**。

```php
move_uploaded_file($_FILES['file']['tmp_name'], "/var/www/upload/xxx.jpg");
//                    ↑ 临时文件                   ↑ 最终位置
```

**它会顺带做一个安全检查**：确认 `$from` 确实是"通过 HTTP 上传上来的临时文件"， 防止你传一个系统路径（比如 `/etc/passwd`）让它去移动。

#### `require_once ""`

```php
require_once "config.php"
```

**引入另一个文件**，和 `include` 类似，区别是找不到`include`只警告，继续执行，require找不到就**致命错误，停止**。

而**带 `_once` 的（`include_once` / `require_once`）会检查"是不是已经引入过了"，避免重复**

#### `readfile($path)`

**读文件并直接输出**。

```php
readfile($path);              
// 等价于
echo file_get_contents($path);
```

#### `system($cmd)`

**执行系统命令并输出结果**。等价于在命令行里敲那句话。

```php
system("ping -c 1 127.0.0.1");
// 相当于在服务器上执行 shell 命令
```

---

### 2.2 类型判断与转换

对于字符串（`$code`）来说，只有字符串为 "" 或 "0" 时，为"假"(符合`!$code`)

#### `is_numeric()`

```php
bool is_numeric ( mixed $var )
```

**作用**：检测变量是否为"数字或数字字符串"。

**注**：它认得**十六进制**（如 `'0x1A'`）和科学计数法（如 `'1e9'`）

> `is_numeric` 经常被用来做"必须传数字"的校验，而**绕过它最常见的办法是"数字开头 + 非数字结尾"**：
> 
> ```php
> is_numeric('404abc')    // false  ← 不是纯数字，校验放行
> '404abc' == 404         // true   ← 弱比较又认为它等于 404
> ```

#### `intval()` / `floatval()`

```php
int   intval   ( mixed $var [, int $base = 10 ] )
float floatval ( mixed $var )
```

**作用**：

* `intval()`：把值转成**整数**
* `floatval()`：把值转成**浮点数**（小数）

**核心规则（两个一样）**：**从左往右读，"能读多少数字就读多少"，读到不能再读的地方停下。**

```
"123abc"  →  读到 'a' 停下        →  123
"abc123"  →  开头就读不到          →  0
"12.9"    →  读到 '.' 停下         →  12      （intval）
"12.9"    →  保留小数              →  12.9    （floatval）
"-12abc"  →  '-' 是合法符号        →  -12
"  12"    →  前导空格会被跳过       →  12
""        →  什么都没有            →  0
```

**`intval` 的"砍掉"是向零截断，不是四舍五入**：

```php
intval(1.9)     //  1     ← 不是 2
intval(-1.9)    // -1     ← 不是 -2
```

**第二个参数 `$base`：指定按几进制解释**

```php
intval("1A", 16)      // 26    按十六进制读
intval("0x1A", 16)    // 26    '0x' 前缀会被自动忽略
intval("11", 2)       // 3     按二进制读
intval("0123", 8)     // 83    按八进制读
intval("0123")        // 123   不指定时按十进制，前导 0 被忽略（不是 83！）
```

#### `isset()` / `empty()`

```php
bool isset ( mixed $var [, mixed $... ] )
bool empty ( mixed $var )
```

**作用**：

* `isset()`：变量**已声明且不为 `NULL`** → `true`
* `empty()`：变量为 **`''`、`0`、`'0'`、`NULL`、`false`、`[]`** → `true`（注意 `'0'` 也算空！）

> `isset` 和 `empty` 的判定范围不同，用错会导致"校验被绕过"。

### 2.3 字符串：查询、截取与替换

#### `strpos()` 家族（返回值陷阱）

```php
int|false strpos ( string $haystack , mixed $needle [, int $offset = 0 ] )
```

**作用**：查找字符串在另一个字符串中**第一次出现的位置**。返回的是**下标（从 0 开始）**，**找不到返回 `false`**。

**家族成员**：

| 函数           | 方向     | 大小写     |
| ------------ | ------ | ------- |
| `strpos()`   | 第一次出现  | 区分      |
| `strrpos()`  | 最后一次出现 | 区分      |
| `stripos()`  | 第一次出现  | **不区分** |
| `strripos()` | 最后一次出现 | **不区分** |

**`mb_` 前缀版本**：`mb_strpos()` 等，按"字符"算位置，**汉字占 1 个位置**；
不带 `mb_` 的按"字节"算，**汉字占 3 个字节**（UTF-8）。

> `strpos()` 的返回值有**三个状态**，而它们的真假完全不同：
> 
> | 情况              | 返回值      | 作为布尔值 |
> | --------------- | -------- | ----- |
> | 关键字出现在**第 0 位** | `0`      | **假** |
> | **找不到**关键字      | `false`  | **假** |
> | 关键字出现在第 1 位及以后  | 大于 0 的整数 | 真     |
> 
> 示例：
> 
> ```php
> if (strpos($file, "woofers") == false) {
>     die("Access Denied");
> }
> //要想绕过，file里要有woofers且不能出现在开头
> 
> $pos = mb_strpos($file . "?", "?")
> //第三个参数的作用是在 $file 末尾强拼一个 ?
> //因为 mb_strpos 找不到时返回 false。如果 $file 里本来没有 ?，那 mb_strpos 返回 false，之后执行 mb_substr($file, 0, $pos) 就会出问题（false 被当成 0，截出来是空串）。
> ```

#### `substr()` / `mb_substr()`

```php
string substr ( string $string , int $offset [, int $length = NULL ] )
string mb_substr ( string $str , int $start [, int $length = NULL [, string $encoding = mb_internal_encoding() ]] )
//没有第三个参数，默认截到末尾
```

**作用**：截取字符串的一部分。

* `substr()` 按**字节**截取（截中文会乱码）
* `mb_substr()` 按**字符**截取（能正确处理中文）

> "截取"是**白名单绕过**的经典工具。如果代码是"取 `?` 之前的部分去做白名单比对"，那 `合法文件名?任意内容` 就能通过校验，而真正使用（比如 `include`）的是**整个原字符串**。**校验用一份数据、使用用另一份数据 —— 这是所有"截断类绕过"的共同结构。**
> 
> 示例：
> 
> ```php
> <?php
> $whitelist = ["source.php", "hint.php"];   // 白名单：只允许这两个
> 
> $file = $_REQUEST['file'];                 // 用户输入
> 
> // ---------- 第 1 步：校验 ----------
> $pos     = mb_strpos($file . "?", "?");    // 找第一个 ? 的位置
> $checked = mb_substr($file, 0, $pos);      // 取 ? 之前的【那一段】
> 
> if (!in_array($checked, $whitelist)) {     // 拿【那一段】去比对白名单
>     die("you can't see it");               
> }
> 
> // ---------- 第 2 步：使用 ----------
> include $file;                             // ★ 注意：用的是【原始 $file】！
> ?>
> 用户输入:     source.php?/../../../../ffffllllaaaagggg
> 拿去校验的:   source.php                                
> 在白名单里: true                                      
> 实际使用的:   source.php?/../../../../ffffllllaaaagggg   
> ```

#### `str_replace()`

```php
mixed str_replace ( mixed $search , mixed $replace , mixed $subject [, int &$count ] )
```

**作用**：把字符串里的某些字符**替换成别的**（区分大小写）。

示例：

```php
$path = str_replace("flag", "", $_GET['path']);
//以GET方式传入path，并检查，用空替换flag


//语法结构foreach：
$blacklist = ["or", "and", "union", "select"];
foreach ($blacklist as $word) {
    $id = str_replace($word, "", $id);
}
//把 $blacklist 这个数组逐个取出来，每次赋给 $word，然后执行 {} 里的代码。
//等价于：
$word = "or";      $id = str_replace("or", "", $id);
$word = "and";     $id = str_replace("and", "", $id);
$word = "union";   $id = str_replace("union", "", $id);
$word = "select";  $id = str_replace("select", "", $id);
//关键：每一次替换的结果，是下一次替换的输入。它们是串行的（or 先处理，处理完的结果给 and 处理，再给 union……）这种顺序有时候会影响结果
//例：
//黑名单 [or, for]   输入 "for"  =>  "f"
//黑名单 [for, or]   输入 "for"  =>  "" 
```

> **判断用的是"拦截"还是"替换为空"**：
> 
> - 拦截 → 报错/空白页
> - 替换为空（str_replace） → **页面正常返回，但输入的词消失了**，这种最容易双写绕过

### 2.4 字符串：正则与过滤

**正则表达式（Regular Expression）= 用一种"模式语言"来描述"什么样的字符串算匹配"。**

它描述的是**模式**，不是**具体内容**。比如：

| 想匹配        | 正则                 |
| ---------- | ------------------ |
| 恰好 11 个数字  | `^\d{11}$`         |
| 一个或多个字母    | `[a-zA-Z]+`        |
| 某个词（不管大小写） | `select` + `i` 修饰符 |
| 数字-数字 的形式  | `\d+-\d+`          |

最常用的符号：

| 符号       | 含义                     |
| -------- | ---------------------- |
| `/.../`  | 正则的分隔符（包裹表达式用的，也可以用 #） |
| `.`      | 任意**一个**字符             |
| `\d`     | 一个数字（等价 `[0-9]`）       |
| `\w`     | 一个字母/数字/下划线            |
| `\s`     | 一个空白（空格/Tab/换行）        |
| `*`      | 前面那个东西出现 **0 次或多次**    |
| `+`      | 前面那个东西出现 **1 次或多次**    |
| `?`      | 前面那个东西出现 **0 次或 1 次**  |
| `{11}`   | 前面那个东西**恰好 11 次**      |
| `[abc]`  | 括号里**任意一个**字符          |
| `[^abc]` | **除了**括号里这些字符之外的任意字符   |
| `\|`     | **或**                  |
| `^`      | 字符串**开头**              |
| `$`      | 字符串**结尾**              |
| `()`     | **分组**（也用来"捕获"匹配到的内容）  |

**修饰符写在结尾的分隔符后面**：

| 修饰符 | 含义                   |
| --- | -------------------- |
| `i` | 不区分大小写               |
| `m` | 多行模式（`^` `$` 匹配每行首尾） |
| `s` | 让 `.` 能匹配换行          |

#### `preg_match()` / `preg_match_all()`

```php
int|false preg_match ( string $pattern , string $subject [, array &$matches ] )
```

**作用**：用正则匹配字符串。**匹配到返回 1，没匹配到返回 0，出错返回 false。**

示例：

```php
$phone = "/^\d{11}$/";

preg_match($phone, "13800138000")   // 1   恰好 11 位数字
preg_match($phone, "1380013800")    // 0   只有 10 位
preg_match($phone, "abc12345678")   // 0   含字母
preg_match($phone, "138001380001")  // 0   12 位（$ 卡住了）


//如果不加^和$，只要子串匹配就算成功
preg_match("/\d{11}/", "abc13800138000xyz")   // 1  ← 中间有 11 位数字就算匹配
```

**关于第三个参数**：把匹配到的东西存下来

```php
preg_match("/\d+-\d+/", "订单 2024-1234 已发货")
// 返回 1  ← 只知道"匹配成功了"
preg_match("/\d+-\d+/", "订单 2024-1234 已发货", $m);
// 传一个变量$m，结果会装进去，$m = ["2024-1234"] （ 一个数组，第 0 项就是匹配到的整段）

//正则里每加一对括号，就多一个"分组"，每组捕获的内容会单独存进数组
preg_match("/(\d+)-(\d+)/", "订单 2024-1234 已发货", $m);
//             ↑      ↑
//           第1组  第2组
//此时，$m[0] = ["2024-1234"] (整体匹配)，$m[1] = ["2024"]，$m[2] = ["1234"]
```

`preg_match` **找到第一个就停**。要找全部用 `preg_match_all`：

```php
preg_match_all("/\d+/", "a1b22c333", $m);
// $m[0] => ["1", "22", "333"]
```

**关于修饰符 `i`**：

```php
preg_match("/select/",  "SELECT")    // 0   ← 没有 i，大写不匹配
preg_match("/select/i", "SELECT")    // 1   ← 有 i，大小写都匹配
```

> `preg_match()` 是黑名单过滤最常用的函数，而它的绕过思路是通用的：
> **大小写（看有没有 i）、双写、等价替换、编码、位置规避**。

#### `preg_replace()` / `preg_filter()`

```php
mixed preg_replace ( mixed $pattern , mixed $replacement , mixed $subject )
```

**作用**：用正则做搜索替换。

示例：

```php
preg_replace("/\d+/", "X", "a1b22c333")      // "aXbXcX"   把数字段换成 X
preg_replace("/[aeiou]/", "", "hello world") // "hll wrld" 删掉所有元音
```

|                                   | 匹配方式                    |
| --------------------------------- | ----------------------- |
| `str_replace("flag", "", $s)`     | 匹配**固定字符串** `flag`      |
| `preg_replace("/fla\w/", "", $s)` | 匹配**模式**（fla 后面跟任意一个字母） |

> 老版本 PHP（<7） 支持 **`/e` 修饰符**，会把替换结果**当作 PHP 代码执行** → 直接 RCE。
> 现代版本里，`preg_replace` 本身不执行代码，但如果替换内容能被用户控制且参与后续流程，仍可能有问题。

#### `htmlspecialchars()`

**作用**：把 HTML 特殊字符转成 HTML 实体，让浏览器**不把**你的输入当标签解析，而是**当纯文本显示**。

| 原字符 | 转成            |
| --- | ------------- |
| `&` | `&amp;`       |
| `"` | `&quot;`      |
| `'` | `&#039;`（看参数） |
| `<` | `&lt;`        |
| `>` | `&gt;`        |

```php
$evil = '<script>alert(1)</script>';

echo $evil;                          // 浏览器把它当标签解析 → 执行脚本 → XSS
echo htmlspecialchars($evil);        // 输出 <script>alert(1)</script>
                                     // 浏览器显示成文本 "<script>alert(1)</script>"，不执行
```

> htmlspecialchars()防的就是**输入被当成标签或属性解析**
> 
> **"用单引号绕过"**：(老PHP版本)
> 
> 用户输入常常被放进 HTML 的"属性"里，而属性值可以用单引号包。
> 
> ```php
> // 常见写法
> echo "<input type='text' value='" . $userinput . "'>";
> //如果 htmlspecialchars 没有转义单引号,就可以输入：' onfocus='alert(1) 形成：
> <input type='text' value='' onfocus='alert(1)'>
> //输入的单引号把 value 提前闭合了,多出了一个 onfocus 属性 → 浏览器会执行 alert(1) → XSS 成功            
> ```

#### `strip_tags()` / `addslashes()`

* `strip_tags()`：**剥掉** HTML / XML / PHP 标签
* `addslashes()`：在预定义字符前加反斜杠 —— `'`、`"`、`\`、`NUL`

```php
strip_tags("<b>粗体</b>和<script>alert(1)</script>")
// "粗体和alert(1)"        ← 标签被删了，但【标签之间的内容还在】

strip_tags("<b>粗体</b>和<i>斜体</i>", "<b>")
// "<b>粗体</b>和斜体"      ← 第二个参数是"允许保留的标签白名单"
```

> - `strip_tags` 剥标签时，如果**没剥干净**（比如畸形标签、注释里的标签）就还能触发 XSS
> 
> - `addslashes`能防一些SQL注入，因为在 SQL 里，`\` 是转义符
>   
>   ```
>   原始 SQL 拼接：  
>   SELECT * FROM users WHERE name = 'it's a test'
>                                       ↑
>                        这个引号提前闭合了字符串 → 注入
>   
>   加了反斜杠后：   
>   SELECT * FROM users WHERE name = 'it\'s a test'
>                                        ↑
>                                  \' 被当成"一个普通的引号字符"
>                                   字符串没有提前结束 → 防住了
>   ```
> 
> - `addslashes` **只转义那 4 个字符**，对数字型注入毫无作用（payload `1 and 1=1#` 里一个都没有）
> 
> - `addslashes` 和字符集有关，**字符集设置不当可以被宽字节注入绕过**

### 2.5 编码与哈希

#### `base64_encode()` / `base64_decode()`

```php
string base64_encode ( string $string )
string base64_decode ( string $string [, bool $strict = false ] )
```

**作用**：Base64 编解码。常用于把二进制数据变成可打印文本。

> 读源码时最常用的手段——`php://filter/convert.base64-encode` 就是把文件内容以 Base64 输出，避免被 PHP 执行。

#### `md5()` / `sha1()`

```php
string md5 ( string $string [, bool $raw_output = false ] )
string sha1 ( string $string [, bool $raw_output = false ] )
```

**作用**：计算哈希值（MD5 是 32 位十六进制字符串）。

**关于 `0e` 魔术哈希**：

以下字符串的 **MD5 值以 `0e` 开头**：

```
QNKCDZO
240610708
s878926199a
s155964671a
s214587387a
```

> 这些字符串**本身互不相同**，但它们的 **MD5 结果都以 `0e` 开头**，后面全是数字。
> 而`0e` 开头的字符串在弱比较里会被当成**科学计数法**，值都是 **0**。
> 
> 所以：
> 
> ```php
> md5('QNKCDZO') == md5('240610708')    // true！
> ```
> 
> **两个不同的输入，md5 之后弱比较相等** —— 这就是"MD5 弱比较绕过"。

#### `strcmp()`

```php
int strcmp ( string $str1 , string $str2 )
```

**作用**：比较两个字符串，返回一个整数：

| 返回值       | 含义          |
| --------- | ----------- |
| `0`       | 两个字符串**相等** |
| `< 0`（负数） | `a` 小于 `b`  |
| `> 0`（正数） | `a` 大于 `b   |

> `strcmp()` 的参数要求是字符串。**如果传入数组**：
> 
> - **PHP 8 之前**：返回 `NULL` 并抛 Warning，而 `NULL` 在 `if` 里是假 → 校验被绕过
> - **PHP 8 起**：抛出 `TypeError`
> 
> 示例：
> 
> ```php
> if (strcmp($password, "super_secret_123") == 0) {
>     echo $flag;
> }//如果传进去一个数组（password[]=x），在 PHP 8 之前它会返回 NULL + 抛个警告， 而 NULL == 0 为真 → 条件成立 → 输出 flag。
> ```
> 
> 同类行为还有 `base64_encode()`、`sha1()` 等**要求字符串参数的函数**。
> **这是"数组绕过类型检查"这一类手法的通用原理。**

### 2.6 数据库相关

#### mysqli 系列

```php
mysqli_connect ( host , username , password , dbname , port , socket )      // 建立连接
mysqli_error ( connection )                                                  // 返回最后一次错误描述
mysqli_query ( connection , query , resultmode )                             // 执行查询
mysqli_fetch_assoc ( result )                                                // 取一行，返回关联数组
mysqli_fetch_row ( result )                                                  // 取一行，返回索引数组
mysqli_num_rows ( result )                                                   // 返回结果集行数
mysqli_close ( connection )                                                  // 关闭连接
```

> - `mysqli_error()` 把错误**输出到页面**时，就有了**报错注入**的条件
> - `mysqli_query()` **只执行第一条 SQL**（遇到 `;` 就停）；而 `mysqli_multi_query()` 能执行多条
>   → **堆叠注入能不能成立，取决于后端用的是哪个函数**

#### `mysqli_real_escape_string()`

```php
string mysqli_real_escape_string ( mysqli $link , string $escapestring )
```

**作用**：转义 SQL 语句里的特殊字符。**被转义的字符是**：

```
NUL（ASCII 0）、\n、\r、\、'、"、Control-Z
```

> **① 只防字符型注入，数字型注入不受影响**
> 如果 payload 是 `1 and 1=1#`，里面**一个特殊字符都没有**，这个函数什么都不会做，注入照样成立。
> 
> **② 字符集设置不当会被宽字节注入绕过**
> 官方手册明确要求：**调用这个函数之前必须先设置字符集**（用 `mysqli_set_charset()` 或在服务端设）。
> 如果字符集是 GBK 这类多字节编码，攻击者可以构造特殊字节（如 `%df`）**"吃掉"转义用的反斜杠**，让 `\'` 变成"一个汉字 + `'`"，于是引号又逃出来了 —— 这就是**宽字节注入**。

#### PDO

```php
public PDOStatement PDO::prepare ( string $statement [, array $driver_options = array() ] )
public bool PDOStatement::execute ( array $input_parameters = null )
```

PDO 是 PHP 访问数据库的**统一接口**，可以用同一套方法操作不同数据库。

`prepare()` 的作用是**预处理**：SQL 语句里用**占位符**（`:name` 或 `?`）代替真实数据，然后 `execute()` 再把参数填进去。可以有效的`addslashes` 等等防不住的东西。

> **"SQL 结构"和"数据"是分开发给数据库的**：
> 
> - 先用 `prepare()` 把 **SQL 语句的结构**编译好
> - 再用 `execute()` 把 **参数值**单独传过去
> 
> 因为结构已经定死了，**参数里的内容不会被当成 SQL 语法解析**，所以没法破坏语句结构。
> 
> **但有两种情况**，照样能注入：
> 
> 1. **不能用拼接**：
>    
>    ```php
>    // 假的预处理 —— 参数拼进了 SQL 字符串
>    $sql = "select * from t where id = $id";
>    $stmt = $pdo->prepare($sql);
>    $stmt->execute();
>    ```
>    
>    在 `prepare()` 被调用之前，`$id` 已经被拼进去了。 发给数据库的仍然是一句完整的、已经被污染的话。
>    **判断方法**：看 `prepare()` 的括号里，**有没有 `$` 变量**。
> 
> 2. **不能拼接表名/字段名**：
>    
>    ```php
>    $stmt = $pdo->prepare("select * from t order by ?");   // 不生效
>    $stmt->execute([$_GET['col']]);
>    ```
>    
>    **占位符只能代表"一个值"，不能代表"结构的一部分"**，`order by ?` 这类不生效。
>    **审计时如果看到"表名/字段名来自用户输入"，那不管有没有用 PDO，都是注入点。** 因为 PDO 保护不了那个位置。

---

## 三、过滤绕过的一个通用原理

先看一段"检查了但没防住"的代码：

```php
$user = $_GET['user'];

$lower = strtolower($user);              // 转小写后再检查
if (strpos($lower, "select") !== false) {
    die("检测到关键字！");
}

$sql = "SELECT * FROM users WHERE name = '$user'";   // ★ 但用的是原串
```

**攻击**：传 `?user=sel/**/ect`

```php
// 检查阶段
strtolower("sel/**/ect")  →  "sel/**/ect"
strpos("sel/**/ect", "select")  →  false      // 字符串里没有连续的 select → 放行 

// 使用阶段
SELECT * FROM users WHERE name = 'sel/**/ect'
// SQL 里 /**/ 是注释 → 实际等价于 'select' 
```

**结果**：检查没看出问题，SQL 却把 `/**/` 当注释了，关键词照样生效。

> **核心原理：同一段字符串，在"检查方"和"使用方"眼里可以是两个东西。**
> 
> 这里体现的是 **"字符串包含判断" 和 "SQL 语法解析" 的规则不同**：
> 
> - `strpos` 只看**字符是否连续出现**
> - SQL 解析器会**把注释当成空白**

**这就是"过滤绕过"的通用思路** —— 不要只想"怎么把关键词写成别的样子"（大小写、编码），
而要想"**怎么让检查和解码/解析对同一段数据得出不同结论**"。

**这个原理在别处的几种表现**：

| 表现                           | 检查方看到的          | 使用方看到的             |
| ---------------------------- | --------------- | ------------------ |
| **截断**（取 `?` 前的内容校验）         | 截断后的短串          | 完整原串               |
| **加工后检查**（先 `strtolower` 再查） | 加工后的副本          | 原始输入               |
| **注释打断**（`sel/**/ect`）       | 字符串里没有 `select` | SQL 解析后等于 `select` |
| **双重解码**                     | 编码后的样子          | 解码一次/两次后的样子        |
| **`str_replace` 替换为空**       | 替换后的结果          | （看后续是否再检查）         |

> **审计时**：
> 
> 1. **过滤的是什么？**（哪个变量、什么范围）
> 2. **是"拦截"还是"替换/转义"？**（改不改数据）
> 3. **检查的数据 和 使用的数据 是同一份吗？**
> 
> 第 3 问最关键 —— **只要不是同一份，过滤就可能白做**。
> 
> 另外注意**大小写混写这条**：只有在正则**没有 `i` 修饰符**、
> 或者代码**没有先转小写**的时候才有效。**如果代码先 `strtolower` 了，大小写这条路就是堵死的**，
> 那时要换"打断关键词"这类思路。

常见可用的"打断/等价"手法：

```
/**/        SQL 注释，解析时等于空白
%0a %09 %0b 换行 / Tab / 垂直制表符（也是空白）
--          SQL 行注释（注意后面要跟空格）
```


