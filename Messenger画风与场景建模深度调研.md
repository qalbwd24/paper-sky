# Messenger 画风与场景建模深度调研

## 结论与推荐

**现有 Three.js 游戏可以沿着 Messenger 的美术方向改善，无须先更换游戏引擎。真正需要升级的是场景资产、空间组织和材质导入方式。** 目前最值得采用的组合是：用完整街区模型建立质量样板，用统一的模块化模型包扩建，用成熟开源渲染代码处理植被、配色与轮廓。

没有核实到 Abeto 官方公开发布、附带开放许可证的 Messenger 完整源码和原版场景模型。能找到网页静态镜像，但这与原作者授权所有人复用是两回事。另一方面，确实存在可用的替代品：Littlest Tokyo 提供完成度很高的日式街区；Bruno Simon 的项目提供场景工程、GLB 和渲染实现；Quaternius 提供适合继续搭建的开放模型包。[^1][^3][^4][^8]

推荐优先级：

| 优先级 | 资源 | 最值得取用的部分 | 用于现有游戏的判断 |
|---|---|---|---|
| 第一 | Littlest Tokyo / Glen Fox | 已搭好的日式建筑群、店面细节和动画 | 最快证明“精细模型确实能改善画面”；适合一个主题街区 |
| 第一 | Quaternius Ultimate Stylized Nature | 树、石、植被及配套纹理 | 替换目前过于方块化的自然景物，适合逐区采用 |
| 第一 | Bruno Simon folio-2025 | 完整场景工程、植被组织、颜色与阴影代码 | 学习和拆取价值最高；整套迁移成本较高 |
| 第二 | Quaternius Medieval Village MegaKit | 墙、屋顶、窗、楼梯、内外结构 | 适合扩建可穿行村落；免费版与完整工程版要分清 |
| 第二 | Bruno Simon folio-2019 | Matcap 材质、地面阴影和区域模型 | 轻量画面处理的方法更容易接到现有 WebGL 游戏 |
| 第二 | cortiz2894/stylized-components | 风动草地、树叶、水岸效果 | 取所需组件；无需把整套 React 网站搬进来 |

这些推荐中的“适合程度”属于对本项目的技术和美术判断，不是原作者对飞行游戏性能的承诺。

## Messenger 的制作方法

Abeto 在 2026 年 1 月的制作文章中说明：场景先按展开的立方体布局建模，再变成球面；环境经过手工搭建；全局颜色使用一张 16×16 的色板纹理；轮廓线采用可控制粗细、颜色和透明度的自定义系统；植被和远近模型有专门优化。[^1]

创作者的另一篇访谈确认，建模使用 Blender 与 Houdini，前端使用 Three.js，着色器等大量部分由团队定制。**因此，“导入低模，再套 Three.js 默认卡通材质”不能被当作原作的已证实技术方案。**[^2]

![Messenger 的球形世界与整体配色](E:/个人兴趣研究/纸飞机游戏/references/messenger-research/messenger-start.png)

*图 1：Messenger 实际网页的启动画面。画面与作品版权属于 Abeto；截图用于分析，不是可复用的游戏素材。*

### 画面的可观察特征

现场画面呈现出青绿、灰绿、米白等大色块，边缘有细线，亮暗关系相对简洁。树冠保持破碎的叶丛轮廓；路缘、栏杆、立柱、楼梯与建筑高差带来可辨认的尺度。近看仍有小细节，但主要物体轮廓不会被密集纹理淹没。[^18]

这种方向更接近“有线稿的三维插画”。它与像素化、全屏纸张噪声或纯黑白水墨可以共享一些处理手段，但最终需要不同的模型和材质设计。对黑色飞鸟而言，偏浅的彩色或灰墨环境通常比全场景浓黑更利于辨认姿态；这是针对飞行视角的配色建议。

### 模型质量应体现在什么地方

场景物体不必追求写实的细分数量，但应有三层尺度：远处能辨认屋顶和树冠，飞近后看见阳台、雨棚与窗框，低空掠过时再看见门前台阶、管线和花盆。第一层靠外轮廓，第二层主要靠真实几何，第三层可以混用几何和贴图。

例如，“方盒子加斜屋顶”可以辨认成房屋，却很难形成值得绕飞的对象。给它增加错层屋檐、退入墙面的窗、外廊与小庭院，增加的面数可以很有限，空间信息却会明显改善。应优先购买或复用已经包含这些关系的资产，而不是用更多随机方盒子填满地图。

建模中的轻微不规则也应固定在物体上：屋檐可以略有曲折，石块可以不对称，树冠可以分成大小不同的簇。不能用每帧随机晃动几何来模拟手绘，尤其在高速飞行里，那会直接变成抖动和视觉噪声。

### 场景组织比“随机物体数量”更重要

适合探索的布景，需要道路、建筑和地形互相解释。建筑正面朝向街道，桥连接真实岸线，阶梯连接两个平台，围墙留下合理入口；一段狭窄巷道结束后，应能看到广场、河面或另一个地标。随机化主要用于花草、破损、摆件和同类建筑的变化。

飞行关卡还需要考虑地面游戏不一定照顾到的视角：屋顶应有内容，建筑背面应能观看，桥洞上方不能被隐形碰撞体封死，远处应出现可辨认的穿行目标。完整“展示模型”也不自动等于完整“飞行关卡”，这正是素材接入后的主要设计工作。

## 可直接下载的完整场景与建筑

### 1. Littlest Tokyo：最适合先验证的日式街区

**入口：**[Three.js 在线示例](https://threejs.org/examples/webgl_animation_keyframes.html) · [模型文件页面](https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/LittlestTokyo.glb) · [作者作品页](https://glenatron.artstation.com/projects/AJGbV)。[^3]

![Littlest Tokyo 日式街区模型](E:/个人兴趣研究/纸飞机游戏/references/messenger-research/littlest-tokyo.png)

*图 2：Three.js 官方示例中的 Littlest Tokyo，Glen Fox，CC BY 4.0。截图保留原示例署名。*

对实际 GLB 文件的结构检查得到以下结果。计数描述文件内容，不等于单帧渲染统计；材质数量也不等于 draw call 数量。

| 项目 | 检查结果 |
|---|---:|
| 文件大小 | 4,133,072 字节，约 4.13 MB |
| 存储的三角面数 | 141,802 |
| Mesh 定义 / Node | 71 / 214 |
| 材质 / 图像 | 15 / 4 |
| 动画片段 | 1 |
| 几何压缩 | Draco |
| 内嵌许可 | CC-BY-4.0 |

内嵌元数据记录作者为 glenatron，标题为 Littlest Tokyo，并提供原始 Sketchfab 来源。材质列表中确实包含 `outline`。这比只看转载页面的“免费下载”更有依据。原作者作品页所说的约 8 万三角面明确排除了描边；不能把这个数字当成当前下载 GLB 的总面数。[^3]

**建议用途：**先作为一个独立、尺度合理的小街区，让鸟绕着屋顶、街角和店面飞行。先保留原始材质与动画，确认效果，再做克制的统一配色。它的细节密度和完成度适合做基准，但整体仍是一个紧凑的展示模型，不应在未经拆解的情况下重复几十份铺成大城。

**接入工作：**现有加载器补接匹配版本的 Draco 解码器；保留材质与节点层级；用动画系统播放片段；把装饰、描边和真实碰撞表面分开。室内是否完整、每个开口能否穿行、哪些运动节点需要动态碰撞，仍要逐项验证。[^14]

### 2. Bruno Simon folio-2025：完整制作工程最有参考价值

**入口：**[在线作品](https://bruno-simon.com/) · [源码仓库](https://github.com/brunosimon/folio-2025) · [许可证](https://github.com/brunosimon/folio-2025/blob/main/license.md)。仓库根许可证为 MIT；音乐目录另有 CC0 文件。`package.json` 的许可证字段仍写着 ISC，与根文件不同，使用时应一并保留记录，以实际许可文件为核对依据。[^4]

仓库实际包含 `resources/folio-2025.blend`、区域场景、地形和大量 GLB 资源，因此它不是仅有渲染器的空架子。检查时 Blender 主工程约 16.1 MB，`static/areas/areas.glb` 约 3.29 MB；这只是两个文件，**不代表整套下载或运行内存**。[^4]

最值得阅读的源码入口：

| 文件 | 对场景美术的用途 |
|---|---|
| `sources/Game/Materials/MeshDefaultMaterial.js` | 统一亮暗、阴影颜色、地面反射色近似、水线和雾 |
| `sources/Game/World/Foliage.js` | 用少量叶片面片、整理过的法线和实例绘制组织树冠 |
| `sources/Game/World/Grass.js` | 草地实例与风动 |
| `sources/Game/World/Scenery.js` | 从场景资源组织对象、处理道路 |
| `sources/Game/Rendering.js` | 质量档、泛光和景深的开关方式 |

这里能看到两项很实用的方法。首先，树叶既需要破碎外形，也需要整体连贯的明暗，不能只给每张小面片照同一盏灯。其次，材质可以主动设计阴影颜色和地面的返色，不必通过昂贵的真实全局光照获得全部艺术效果。以上判断来自实际材质与植被代码，不是对 Messenger 内部实现的推断。[^5]

**适用限制：**当前依赖为 Three.js `^0.183.2`，代码使用 `three/webgpu`、TSL 与节点材质；现有游戏是 r160 WebGL。GLB 几何可单独研究和取用，但自定义材质不会随 GLB 自动恢复。建议优先借用其场景组织和材质方法，整套场景若要保留原貌，应先在独立分支或独立示例中运行新版渲染器。[^5]

### 3. Bruno Simon folio-2019：较容易采用的轻量场景处理

**入口：**[源码](https://github.com/brunosimon/folio-2019) · [MIT 许可证](https://github.com/brunosimon/folio-2019/blob/master/license.md)。仓库包含 `resources/3d/model.blend`、`render.blend`、区域 GLB、分开的碰撞模型及地面阴影贴图。当前依赖里的 Three.js 是 `^0.164.1`，与现有游戏更接近。[^6]

`src/javascript/World/Materials.js` 使用 Matcap 材质组织不同颜色，`World/Shadows.js` 与各区的 `floorShadow.png` 展示了低成本阴影方法。Matcap 可以理解为用一张“已画好光照的球面色图”给表面上色，适合稳定的插画感，但不能直接解决所有方向的真实光照。[^6]

**建议用途：**采用其接地阴影、模型分区、视觉模型与碰撞模型分离的方法。其玩具式美术与 Messenger 仍有区别，整套照搬不会变成日式手绘街区。球面世界还需要把阴影和材质使用的平面坐标改成局部坐标。

### 4. Dayonel / nestor.gg：现成精细建筑的补充

**入口：**[在线作品](https://www.nestor.gg/) · [源码](https://github.com/Dayonel/nestor.gg) · [作者发布说明](https://discourse.threejs.org/t/3d-amsterdam-portfolio/60802)。根目录是 MIT 许可证，包含四个 `amsterdam*.glb` 建筑文件；依赖 Three.js `^0.156.1`。[^7]

实际检查的 `amsterdam1.glb` 为 288,476 字节、约 3.25 万存储三角面、10 个 mesh、4 个材质，使用 Draco。它说明几百 KB 的下载也可以包含较细的窗框和立面形状，但压缩体积小并不等于面数少。

**建议用途：**作为另一种街区的建筑基础。在线作品的紫红灯光不必保留，可统一改成灰白墙面和柔和光照。它没有完整城市规划，也没有建筑室内质量保证。仓库未看到独立模型授权说明，应随所取资产保留根许可证和作者信息；正式扩展前再逐个检查模型来源及立面完整性。[^7]

### 5. Sketchbook：完整世界可用，重点不在美术

**入口：**[swift502/Sketchbook](https://github.com/swift502/Sketchbook)。MIT 项目，提供 `src/blend/world.blend`、`build/assets/world.glb` 及载具。作者已在 2023 年宣布停止开发并归档。[^12]

它更适合参考“如何从 Blender 场景组织地图与碰撞”，不是本轮追求画风的首选。已有飞行控制无需为了这张地图替换成它的整套旧架构；若挑选场景元素，仍应独立适配材质和球面位置。

## 开放模型包与可复用画风代码

### 模型包

| 资源 | 开放情况与内容 | 最合适的用途 | 需要注意 |
|---|---|---|---|
| [Quaternius Ultimate Stylized Nature](https://quaternius.com/packs/ultimatestylizednature.html) | CC0，63 个模型，含 glTF、FBX、OBJ、Blend，带纹理 | 自然区的主力植被与岩石 | 与现有块状树混用时，需逐区更换并统一尺度 |
| [Quaternius Medieval Village MegaKit](https://quaternius.com/packs/medievalvillagemegakit.html) | CC0；完整系列 304 模型，免费 Standard 是子集 | 有内外墙、屋顶、窗、楼梯的模块化街区 | Pro 与 Source 收费，不能把全部 304 件及引擎工程都算作免费下载 |
| [KayKit Medieval Builder Pack](https://kaylousberg.itch.io/kaykit-medieval-builder-pack) | CC0，200+ 建筑、道路、水域和地形部件，含 GLTF | 远景村落、风格明确的卡通区域 | 旧版已标 Legacy；六边形内容有新版，整体更偏微缩玩具 |

以上许可与格式来自作者页面。Quaternius 的 Source 版本包含引擎工程、额外配置和 Blender 源文件；“资产许可开放”与“每个版本都免费获取”是不同问题。[^8][^9]

对于主体美术，建议先选一个模型家族，而不是同时混用大量风格不同的免费素材。每个主题区可以变化，但最好共享地面明度、阴影色、轮廓规则和细节密度。否则颜色统一后，比例、倒角、树形和屋顶语言仍会互相冲突。

### 渲染代码

| 项目 | 能复用什么 | 许可证核对 | 现有游戏的采用方式 |
|---|---|---|---|
| [cortiz2894/stylized-components](https://github.com/cortiz2894/stylized-components) | 动漫草地、花、树叶、水面、岸边交界 | 原仓库含标准 MIT 文件，README 另强调署名 | 抽取 GLSL 与生成逻辑；非完整城镇 |
| [spite/sketch](https://github.com/spite/sketch) | 素描、排线、版画、漫画类非写实渲染实验 | 代码 MIT，演示纸张纹理等另有来源 | 适合水墨/素描主题的效果样板；避免全套高开销后处理 |
| [craftzdog/ghibli-style-shader](https://github.com/craftzdog/ghibli-style-shader) | 插画式树冠演示和教学实现 | README 标 MIT，未取得独立 LICENSE 文件 | 次选学习资源；采用前补齐所取代码及模型的许可记录 |

`stylized-components` 的原作者仓库是 **cortiz2894**；检索中还会出现 **craftedbygc** 的 fork。应优先从原仓库取代码。它使用 R3F 和较新的 Three.js；其中草地和水面逻辑可以移植，但组件 API 不能原样放进当前原生 JavaScript 场景。[^10]

尤其值得借鉴的是“地面泥土分布同时控制草的密度与颜色”：这样草丛与裸土能自然衔接，而不是把草模型直接插到颜色完全不同的地面上。水面组件则包括多遍波浪计算；飞鸟主要从空中掠过时，可以先采用颜色、水岸和少量涟漪，把完整交互波浪作为可选项。[^10]

`spite/sketch` 作者明确表示实验没有以性能为首要目标。适合学习其线条与明暗表达，不适合据此承诺轻薄本在大场景里流畅运行。其历史 Safari 说明也不应当作今天浏览器支持情况的结论。craftzdog 的树冠示例则更接近一个教学切片，不能当作完整森林资产包。[^11][^17]

## 现有游戏为什么仍显得单调

以下是对本地球形场景源码和已有预览截图的判断，不是 Messenger 的内部实现说明。

### 空间布局仍偏规则

`planet-scenery.js` 中，集镇建筑围绕圆环放置；遗迹由一组环状拱门组成；峡谷重复岩门；自然物主要通过位置散布补充。区域的主题已经分开，但每区内部的路线、结构和物体关系仍偏简单。

可以把随机化从“选择坐标”升级为“选择有关系的组合”：街角组合包含两栋相邻建筑、雨棚、转角小路与花盆；河岸组合包含码头、台阶、挡土墙和桥；树林组合包含大小树簇、草地过渡及可穿行间隙。固定主路线，再随机挑选这些组合，既有变化，也能保持街区成立。

### 导入时主动丢失了一部分模型效果

在 `planet-world.js` 的 `styleMaterial` 中，所有导入材质都替换为 `MeshLambertMaterial`，并统一设置 `flatShading: true` 和 `DoubleSide`。只复制了基础贴图、颜色以及部分透明参数，还统一降低了饱和度。原材质的 AO、法线贴图、发光与专门的描边配置等没有完整保留。

后续遍历又把 mesh 转成静态实例，没有建立原 GLB 动画的播放流程。这适合已知、简单、静态的 Kenney 零件；对 Littlest Tokyo 这样的完整带动画场景并不合适。加载成功也不能证明原作外观被保留。

建议增加两种导入路径。**完整场景默认保留原材质、节点、法线和动画；经过确认的静态零件再进入实例绘制与统一改色流程。** 需要手绘风格时，只对选中的墙、屋顶和地面修改材质，不应让玻璃、树叶、描边、发光窗户都经过同一个转换器。

### 阴影和线条需要表达结构

目前建筑边线使用 45° 的几何边提取，并以约 0.22 透明度绘制；这能增强部分棱线，但不是完整的屏幕轮廓系统。地面上的接触暗部也不能表达所有屋檐、凹窗与层间遮挡关系。

下一步最有价值的是先恢复模型原有的面部明暗和凹处遮蔽，再对重要结构补线。单纯把现有边线调黑，可能只会把低模块状外形强调得更明显。

## 建议采用的场景建模流程

### 先完成一块能绕飞的街区

建议首个质量样板约 150–250 米尺度，包含两条高度不同的路线、一处桥或连廊、一个明确地标和一片开敞空地。这个范围是设计起点，可以按模型尺度调整；不是引擎限制。

按“从湖面接近—钻过桥洞—沿街道上升—经过屋檐—转入庭院—飞回河面”的顺序布置空间。先验证能否飞得顺，再补花草和摆件。路径宽度不只按鸟的翼展决定，还要容纳转弯半径、速度和跟随相机。

样板完成后，把它扩展为三种区域：日式生活街区以店面和巷道为主；林间遗迹以树冠、石阶和残墙为主；水边坡城以挡土墙、桥、露台和塔楼为主。区域之间用稀疏山林或水面连接，避免处处同样密集。

### 半径 2 公里可以保留，但不必铺满同等级细节

半径 2 公里的球面面积约 **50.3 平方公里**，由 `4πR²` 得出。这个尺度允许长距离滑翔，却意味着“整球每平方米都有精细街区”会带来很大的制作负担。丰富的体验可以集中在数个经过设计的可飞区域，远方保留低细节山体、树冠色块和地标剪影。

无需把整座 GLB 直接弯成球。推荐每个小建筑保持刚性，沿球面法线朝外放置；道路、河岸和长桥按短段贴合地表。以半径 2 公里为例，相对切平面，距中心水平 100 米处的球面落差约 2.5 米，所以长街区若仅作为一个平板摆上去，地基和道路会明显悬空或穿地。

跨区接缝应安排在河道、山脊、林带或桥梁附近。这里既方便处理不同模型的边缘，也能让场景转换看起来有地理原因。远近层级应保留区域轮廓：远处仍能看见塔、树林和桥，近处才加载窗框、护栏与小摆件。

### 不会建模也能采用的工作方式

可以直接使用 GLB，并用现有 Three.js 场景配置记录位置、旋转和尺度。要调整整条街、楼梯连接或地形高差时，Blender 的任务主要是“摆放和检查已完成模型”，不必先学习雕刻或手绘贴图。

Blender 工程、GLB 和运行画面是三个不同层次。工程里的复杂节点材质不一定能完整输出到 glTF；浏览器效果也可能由额外代码生成。优先选择已经提供 GLB 与浏览器演示的资源，可以减少这类不一致。

## 材质、描边与性能方案

### 推荐画面组合

推荐先采用柔和的三维插画：浅灰或米白墙面，少量红褐屋顶，灰绿树冠，蓝绿水面；保留窗洞与屋檐暗部；轮廓线用深灰绿而非全黑；黑鸟作为画面的高对比主体。水墨感可以体现在颜色、留白、树冠边缘和远山，而不是对每一帧做强烈模糊。

这套方案的先后顺序是：**保留好模型 → 修好材质 → 做出接地与遮挡 → 补轮廓 → 最后加纸感。** 任一步都能单独对比，避免把结构问题藏在后处理里。

### 三类描边方法的选择

| 方法 | 优势 | 局限 | 建议 |
|---|---|---|---|
| 几何结构边，例如 EdgesGeometry | 容易控制屋檐、墙角等固定边 | 不自动等于随视角变化的外轮廓；细线远处可能闪烁 | 保留用于建筑关键结构，做距离淡出 |
| 背面外扩轮廓，例如 OutlineEffect | 适合物体外轮廓，颜色与粗细可调 | 增加绘制；薄片、硬法线和实例需要检查 | 先在少量主体上试用 |
| 深度/法线屏幕边缘检测 | 能统一处理多类物体的轮廓与折面 | 额外渲染目标、边缘采样及抗锯齿成本 | 作为中高画质选项，不先对整球开启 |

Three.js 的 EdgesGeometry 根据相邻面的法线夹角筛选边；OutlineEffect 是已有 WebGL 附加组件。它们是可复用基础，不是 Abeto 自定义描边系统的已确认替代品。[^13]

### 光照与阴影

对于静态建筑，优先保留或制作 AO、烘焙明暗和接触阴影；对飞鸟与附近少量重要物体，按需求增加局部实时阴影。光照跟随球面位置时，阴影方向、局部向上方向和材质坐标也应一起检查。

不建议为了接近这种画风先加入实时光追。画面缺少窗框、层次和构图时，真实反射不会补出这些内容。Bruno 的材质代码也给出了可直接学习的艺术化明暗方法。烘焙可以采用离线光线追踪计算，但结果输出成纹理后，运行游戏不需要逐帧光追。[^5][^6]

### 轻薄本的验收重点

地图半径不是主要性能指标。更需要关注同时可见物体、绘制批次、屏幕分辨率、透明树叶覆盖面积、实时阴影和后处理遍数。复制完整 Littlest Tokyo 多次，即使几何与贴图共享，仍会增加绘制和屏幕工作量。

建议保留三档开关，而不是用“是否手绘”决定性能：

| 档位 | 画面内容 |
|---|---|
| 清晰顺滑 | 原始模型材质或轻量替代、静态遮蔽、少量结构线，近处才显示草 |
| 柔和插画 | 在上档基础上增加选择性轮廓、少量近场阴影和风动植被 |
| 观景 | 适度提高草密度、阴影质量或后处理；以实测决定能否开启 |

以 60 FPS 为目标时，每帧预算约 16.7 ms。验收应固定分辨率与路线，对比原场景和新场景的帧时间、卡顿峰值、加载停顿及持续运行表现。本文的网页观察和 GLB 检查不等于接入后的性能测试，也不据此保证特定帧率。

## 最小改进范围与代码复用入口

建议下一次实现按以下顺序推进，各步都形成可观察结果：

1. **完整模型预览。** 单独载入 Littlest Tokyo，保留原始材质，确认 Draco、动画、透明和描边显示正确。
2. **飞行接入。** 采用本项目飞行器和相机，调整建筑尺度与可穿行通道；排除描边及小装饰的碰撞。
3. **材质对比。** 提供“原作材质 / 柔和插画”两种模式，避免先破坏原效果再猜测修复。
4. **自然景物更新。** 选 Quaternius 的同一套树石，借鉴开源草地的颜色与地表过渡方法。
5. **扩成主题区域。** 只有样板的画面、飞行和帧时间达标后，才扩建道路和新的街区。

模型处理优先采用现成的 [glTF Transform](https://gltf-transform.dev/cli)：检查、去重、纹理处理、合并和简化都有对应功能。压缩下载与减少渲染成本应分开处理；Draco 主要解决传输与存储，不能据此假设 GPU 面数下降。合并也应按小区域进行，否则可能破坏局部剔除。[^15]

| 本地位置 | 需要调整的职责 |
|---|---|
| `planet-world.js` 的 `scenery()` | 区分完整场景与静态零件，接入解码器，保留材质、动画与层级 |
| `planet-world.js` 的 `styleMaterial()` | 按材质类别转换，保留透明、法线、AO、发光及专门轮廓 |
| `planet-scenery.js` | 用街区组合、道路与地标组织布局，随机化放在次要细节上 |
| 模型准备流程 | 记录许可、尺寸、节点分类、碰撞代理与远景版本 |

这些是明确的改进方案，本报告没有修改上述游戏文件。

## 证据范围与未采用资源

资源页面、仓库许可与模型文件以 2026 年 9 月 11 日核查内容为准。Bruno folio-2025 的检查快照为 `41046b57eeed8d156d9c3fd7fa259900baef7816`；folio-2019 为 `540f13573a6da282eae942a4c67335b97cd18970`。本地保留了相关文件清单和两份 GLB 的结构检查记录。

Messenger 的画面与制作访谈可作为美术参照。`Kilganon725/messenger.abeto` 是静态镜像，根目录没有开放许可证，README 还将使用限制在使用者自行取得的授权范围内。因此不将它列为可以自由复制的原版项目。[^16]

`FuLong97/threejs-nature-scene` 虽含模型文件，未发现项目级开放许可；依赖目录里的 MIT 文件不等于场景和作品获 MIT 授权。Wayfinder 具有相关视觉价值，但没有核实到可直接采用的官方完整开放源码，因此不作为本轮的复用方案。没有为了增加清单数量而把这些条目并入推荐。

已直接检查 Littlest Tokyo 与一份 Amsterdam GLB；Bruno 的模型以仓库文件清单和源代码为依据，未完整下载、安装并运行整个源码工程。Quaternius 与 KayKit 的许可和格式以作者页面为依据，未逐个检查全部压缩包。这些边界不影响优先级判断，但正式导入时仍应保留各资产的来源和许可文件。

## Sources

[^1]: Abeto. [Messenger — Case Study](https://www.awwwards.com/messenger.html). Awwwards, 2026-01-15. 作者对球形建模、色板、描边和环境优化的说明。

[^2]: Vicente Lucendo / Abeto. [Messenger](https://www.commarts.com/webpicks/messenger). Communication Arts，页面未显示明确发布日期。创作者访谈，技术栈与美术取向。

[^3]: Glen Fox. [Littlest Tokyo](https://glenatron.artstation.com/projects/AJGbV)，作者作品页；Three.js [在线示例](https://threejs.org/examples/webgl_animation_keyframes.html)、[示例源码](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_animation_keyframes.html)、[实际 GLB 文件](https://threejs.org/examples/models/gltf/LittlestTokyo.glb)。许可和文件计数同时核对了 GLB 的 `asset.extras` 与 glTF JSON。

[^4]: Bruno Simon. [folio-2025 仓库](https://github.com/brunosimon/folio-2025)、[MIT 许可](https://github.com/brunosimon/folio-2025/blob/main/license.md)、[资源工程](https://github.com/brunosimon/folio-2025/tree/main/resources)、[区域模型](https://github.com/brunosimon/folio-2025/tree/main/static/areas)、[音乐许可](https://github.com/brunosimon/folio-2025/blob/main/static/sounds/musics/license.md)。

[^5]: Bruno Simon. folio-2025 [Rendering.js](https://github.com/brunosimon/folio-2025/blob/main/sources/Game/Rendering.js)、[MeshDefaultMaterial.js](https://github.com/brunosimon/folio-2025/blob/main/sources/Game/Materials/MeshDefaultMaterial.js)、[Foliage.js](https://github.com/brunosimon/folio-2025/blob/main/sources/Game/World/Foliage.js)、[package.json](https://github.com/brunosimon/folio-2025/blob/main/package.json)。实际源码，用于版本、植被、阴影和渲染分析。

[^6]: Bruno Simon. [folio-2019](https://github.com/brunosimon/folio-2019)、[license.md](https://github.com/brunosimon/folio-2019/blob/master/license.md)、[Materials.js](https://github.com/brunosimon/folio-2019/blob/master/src/javascript/World/Materials.js)、[Shadows.js](https://github.com/brunosimon/folio-2019/blob/master/src/javascript/World/Shadows.js)、[package.json](https://github.com/brunosimon/folio-2019/blob/master/package.json)。

[^7]: Nestor Orest Plysyuk Hladunko / Dayonel. [nestor.gg](https://github.com/Dayonel/nestor.gg)、[LICENSE](https://github.com/Dayonel/nestor.gg/blob/main/LICENSE)、[模型目录](https://github.com/Dayonel/nestor.gg/tree/main/static/models)、[Scene1.svelte](https://github.com/Dayonel/nestor.gg/blob/main/src/components/scenes/Scene1.svelte)。另见作者的 [Three.js forum 发布帖](https://discourse.threejs.org/t/3d-amsterdam-portfolio/60802)，2024-01-27。

[^8]: Quaternius. [Ultimate Stylized Nature Pack](https://quaternius.com/packs/ultimatestylizednature.html)，2022-05；[Medieval Village MegaKit](https://quaternius.com/packs/medievalvillagemegakit.html)，2025-01；[该套件下载版本](https://quaternius.itch.io/medieval-village-megakit)。作者发布页，CC0、文件格式与版本差异。

[^9]: Kay Lousberg. [(Legacy) KayKit — Medieval Builder Pack](https://kaylousberg.itch.io/kaykit-medieval-builder-pack)。作者页面，CC0、GLTF、内容与 Legacy 状态。

[^10]: Christian Ortiz. [stylized-components 原仓库](https://github.com/cortiz2894/stylized-components)、[LICENSE](https://github.com/cortiz2894/stylized-components/blob/main/LICENSE)、[package.json](https://github.com/cortiz2894/stylized-components/blob/main/package.json)、[草地组件](https://github.com/cortiz2894/stylized-components/tree/main/src/components/grassField)、[水面组件](https://github.com/cortiz2894/stylized-components/tree/main/src/components/waterFloor)。

[^11]: Jaume Sánchez / spite. [sketch](https://github.com/spite/sketch)、[MIT 许可](https://github.com/spite/sketch/blob/master/LICENSE)、[在线演示](https://spite.github.io/sketch/)。README 对性能目标和外部素材的说明。

[^12]: swift502. [Sketchbook](https://github.com/swift502/Sketchbook)、[LICENSE](https://github.com/swift502/Sketchbook/blob/master/LICENSE)、[Blender 场景文件](https://github.com/swift502/Sketchbook/tree/master/src/blend)。停止开发说明日期 2023-02-20。

[^13]: Three.js. [EdgesGeometry](https://threejs.org/docs/pages/EdgesGeometry.html)、[OutlineEffect](https://threejs.org/docs/pages/OutlineEffect.html)。官方接口文档；实际接入应使用与运行库匹配的版本。

[^14]: Three.js. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)。官方文档，Draco 解码器、动画及加载结果结构。

[^15]: Don McCurdy 等. [glTF Transform CLI](https://gltf-transform.dev/cli)。检查、去重、简化、压缩和模型处理命令。

[^16]: Kilganon725. [messenger.abeto](https://github.com/Kilganon725/messenger.abeto)。README 中的静态镜像与授权范围说明；文件清单未列出项目级 LICENSE。

[^17]: Takuya Matsuyama / craftzdog. [ghibli-style-shader](https://github.com/craftzdog/ghibli-style-shader)、[package.json](https://github.com/craftzdog/ghibli-style-shader/blob/main/package.json)。README 声明 MIT；未找到独立 LICENSE 文件。

[^18]: Abeto. [Messenger 实际网页](https://messenger.abeto.co/)。本文启动页和近景截图来自实际渲染，属于视觉观察；不据此推断未公开的着色器算法。
