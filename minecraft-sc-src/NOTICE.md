# Minecraft SC

`Minecraft SC` 是一套像素风格的中文字体：只包含 **简体中文、英文、数字**（以及中文标点）。
它不是 Mojang / Microsoft 的官方字体，只是一个同人字体，与 Minecraft、Mojang 没有任何关联。

## 来源

字形来自 [GNU Unifont](https://unifoundry.com/unifont/) 18.0.01 的 16×16 点阵字形。
Minecraft 游戏内显示中文时用的正是这套字形，所以中文看起来像「失真/点阵化的宋体」。
Unifont 采用 **SIL OFL 1.1**（也可选用 GPL-2.0+）许可证。

## 相对上游的修改

- 只保留可打印 ASCII（英文、数字、标点）和 GB2312 中的简体汉字与中文标点；
  不含假名、希腊字母、西里尔字母等。另外补充了 GB2312 未收录的 `·`（间隔号）
  与 `—`（破折号，中文通常连写为 `——`）。
- 将原有的 CFF 轮廓转为 TrueType 轮廓，并把 UPM 从 64 放大到 1024（1 像素 = 64 单位）。
- **字距修正**：Unifont 的汉字都占 16px 宽，但很多字的墨迹明显更窄（例如「自」只有 9px），
  直接排版时窄字后面会出现很大的空隙。这里把每个汉字的步进改为「墨迹宽度 + 1 像素」
  并左对齐，使任意两个字之间的可见空隙都是 1 像素。
- **标点对齐**：按系统字体（PingFang / 宋体 / 冬青黑体）的做法，收尾标点（，。、！？）》」）
  墨迹靠左、起首标点（（《「【）墨迹靠右，省略号与间隔号居中；全角引号与省略号补足为 1em 宽。
- **英文比例字距**：Unifont 的 ASCII 原本是 8px 等宽，会在 `[`、`.` 等字符两侧留下过大空白。
  这里改为按墨迹宽度排版（左右各 1 像素），并把空格宽度收到 0.25em，接近系统西文字体。
- 字体家族名改为 `Minecraft SC`，PostScript 名为 `MinecraftSC-Regular`。
- 去掉 hinting、字形名与 OpenType 布局表，以减小体积。

## 版权声明

```
Copyright © 1998-2026 Roman Czyborra, Paul Hardy, Qianqian Fang, Andrew Miller,
Johnnie Weaver, David Corbett, Ælla Chiana Moskopp, Rebecca Bettencourt,
Ho-Seok Ee, et al. (GNU Unifont)
```

完整许可证见同目录的 [`LICENSE.txt`](./LICENSE.txt)（SIL Open Font License 1.1）。
