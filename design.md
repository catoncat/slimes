好的，这份攻略非常详尽，包含了大量可以用来复现游戏的核心信息。我已经为你提取并整理了制作游戏所需的关键数据和机制，并以对开发者友好的结构化形式呈现。

### **1. 游戏核心机制 (Core Game Mechanics)**

这是游戏的基本规则和框架。

*   **游戏类型**: 回合制策略RPG (Turn-based Strategy RPG)。
*   **胜利条件**: 占据（Claim）或消灭（Eliminate）所有敌人单位。
*   **失败条件**: 我方所有史莱姆单位被消灭。攻略中提到“失败没有惩罚”，这很重要。
*   **游戏流程**:
    1.  玩家在地图上选择一个关卡（Scenario）或挑战（Challenge）。
    2.  进入单位选择界面，根据关卡限制部署史莱姆。
    3.  进入战场，玩家回合和敌人回合交替进行。
    4.  玩家控制史莱姆移动、使用技能或对敌人进行“占据”。
    5.  占据成功后，玩家可以控制前敌人单位进行战斗。
    6.  战斗胜利后获得经验值，并有可能吸引新的史莱姆加入。
*   **核心战斗规则**:
    *   **元素克制系统 (Elemental Affinity)**:
        *   **关系**: 水 > 火 > 草 > 水。太阳（Sun）元素克制所有其他元素。
        *   **伤害加成**:
            *   攻击克制的敌人：伤害提升约 50%。
            *   攻击被克制的敌人：伤害降低约 50%。
    *   **高低差系统 (Elevation)**:
        *   从高处攻击低处：伤害增加（攻略提到至少 10% 或更多）。
        *   从低处攻击高处：伤害显著降低。
        *   远程单位（如法师）的魔法攻击无视高低差限制。
    *   **伤害计算**:
        *   存在一个伤害浮动范围，攻略描述为平均值的 `+/- 25%`。
        *   **反击 (Counterstrike)**: 近战单位受到攻击后会反击，反击伤害约为正常攻击的 50%。远程单位在射程外攻击可以避免反击。
    *   **单位堆叠**: 一个格子只能站一个单位。

### **2. 单位数据：史莱姆 (Unit Data: Slimes)**

你需要为每种史莱姆创建一个数据结构，至少包含以下属性：

```javascript
// 示例史莱姆对象结构
const slime = {
    name: "Little Slime", // 名称
    rarity: "C",         // 稀有度 (C, B, A, S)
    element: "Water",    // 元素
    speed: 2,            // 移动力
    ability: {           // 特殊能力
        name: "Slow",
        description: "使单个敌人移动力降为1，持续3回合，被占据概率 x5。",
        uses: 1
    },
    levelUpBonus: {      // 等级提升奖励
        level: 10,
        description: "Slow能力使用次数从1次变为2次。"
    }
};
```

**关键史莱姆信息提取**:

| 史莱姆名称 (Name) | 稀有度 (Rarity) | 元素 (Element) | 核心能力 (Core Ability) | 等级奖励 (Level-up Bonus) |
| :--- | :--- | :--- | :--- | :--- |
| **Little Slime** | C | Water | **Slow**: 敌人移动力变为1 (3回合), 占据成功率x5 | Lv.10左右，使用次数+1 |
| **Carrot** | C | Fire | **Agile**: 对抗性敌人占据成功率x5 | Lv.15左右，移动力+1 |
| **Metal Slime** | A | Grass | **High Defense**: 极高的防御力，吸引敌人攻击 | Lv.15左右，移动力+1 |
| **Speed Slime** | C | Grass | **Speed**: 友军移动力+1 (3回合) | Lv.10左右，使用次数+1 |
| **Winged Slime** | C | Water | **Fly**: 无视地形移动 | Lv.15左右，移动力+1 |
| **Sticky** | A | Grass | **Sticky**: 敌人无法移动 (3回合), 将0%占据率变为1%，其他变为100% | Lv.20左右，使用次数+1 |
| **Warp Slime** | B | Grass | **Warp**: 传送到地图任意空位（仅自身） | Lv.16，HP额外增加50 |
| **Teleport Slime** | B | Water | **Teleport**: 传送任意单位到任意空位 | Lv.20左右，使用次数+1 |
| **Neo Teleporter** | S | Grass | **Teleport**: 同上，但初始3次使用 | Lv.25左右，使用次数+1 |
| **Melty** | B | Grass | **Melt**: 融化敌人装备 (3回合)，使其防御大减，100%可占据 | Lv.20左右，使用次数+1 |
| **Super Melty** | A | Fire | **Super Melt**: 同上，但可融化高级护甲，持续5回合 | Lv.25左右，使用次数+1 |
| **Divide Slime** | B | Water | **Split**: 被攻击后分裂成2个，HP平分 | Lv.15左右，移动力+1 |
| **Goddess' Hand** | S | Fire | **Split**: 可连续分裂两次，最终变为4个 | Lv.20左右，移动力+1 |
| **Invalidation** | A | Fire | **Invalidation**: 使宿主完全免疫魔法伤害 | Lv.25左右，移动力+1 |
| **Rider** | S | Fire | **Rider**: 占据成功率 x100 | Lv.20左右，移动力+1 |
| **Irregular** | S | Fire | **Double Action**: 占据敌人后可立即行动 | Lv.20左右，移动力+1 |

### **3. 单位数据：敌人 (Unit Data: Enemies)**

敌人的数据结构应该包含：

```javascript
// 示例敌人对象结构
const enemy = {
    name: "Farmer",             // 名称
    type: "Direct Fighter",     // 类型
    claimability: "100%",       // 被占据概率
    move: 2,                    // 移动力
    range: 1,                   // 射程
    vulnerabilities: ["Slow", "Sticky", "Melt", ...], // 弱点
    immunities: []              // 免疫
};
```

**关键敌人信息提取**:

*   **分类**:
    *   **近战 (Direct Fighters)**: Farmer, Swordsman, Knight, Heavy Infantry, Panzer, Valoi Guard 等。射程为1。
    *   **远程 (Ranged Fighters)**: Archer, Gunman, Sniper, Spearman 等。射程>1，可在反击范围外攻击。
    *   **法师 (Magicians)**: Sorceress, Sage, Witch 等。范围攻击，无视高度。
    *   **治疗者 (Healers)**: Priest, Priestess。
    *   **怪物 (Monsters)**: Golem, Asmodian, Dragon Knight 等。通常免疫很多状态，占据率低。
*   **占据率 (Claimability)**: 这是核心。
    *   `100%`: 普通单位。
    *   `20%`: 如 Martial Artist, Knight。
    *   `1%`: 如 Ninja, Heavy Infantry。
    *   `0%`: 如 Panzer, Valoi Guard。需要特殊能力才能占据。
    *   `x`: 如 Sage, Dragon Knight。无法被史莱姆占据。
*   **特殊敌人规则**:
    *   **Sage (贤者)**: 无法被占据(x)，血量固定为10，魔法免疫，物理防御极高。只能通过元素克制攻击造成伤害（克制3点，同属性2点，被克制1点）。
    *   **Panzer / Valoi Guard**: 无法被普通`Melt`，需要`Super Melt`。正常占据率为0%，需要`Sticky`能力变为1%。
    *   **Asmodian / Hollow Slime (寄生单位)**: 它们也会占据人类单位，并提供强大的属性加成（30%-40%）。你必须先击败宿主，然后才能攻击寄生体本身。Hollow Slime甚至可以“抢走”你已经占据的单位。

### **4. 核心系统 (Core Systems)**

这些是驱动游戏玩法的后台系统。

*   **经验与升级系统 (Experience & Leveling)**:
    *   **经验获取**: 战斗胜利后，出战的史莱姆获得经验。
    *   **难度影响**: 简单(0.5x), 普通(1x), 困难(1.5x)。
    *   **升级效果**: HP+5，ATK/DEF微量提升。达到特定等级后解锁**等级奖励 (Level Up Bonus)**，通常是强化其核心能力。
*   **状态效果系统 (Status Effects)**:
    *   **Melted (融化状态)**: 持续3或5回合。防御大减，100%可被占据。被`Peavy`系史莱姆占据后，女性单位有额外的攻防加成（“内衣加成”）。
    *   **Sticky (黏着状态)**: 持续3回合。无法移动。占据率变为1%或100%。
    *   **Slow (减速状态)**: 持续3回合。移动力变为1。
    *   **Betrayal (背叛状态)**: 由`Bribe` (贿赂), `Honeytrap` (美人计), `Charm` (魅力), `Order` (命令)等技能触发，使敌人攻击敌方单位，持续1-3回合。
*   **关卡与奖励系统 (Stage & Reward System)**:
    *   每个关卡（包括不同难度和挑战等级）都有一个清晰的**掉落列表**。
    *   例如 `Nameless Hill (Normal) Scenario clears: Little Slime 095%, Attack Slime 005%`。这意味着你需要一个基于概率的战利品系统。
*   **携带单位系统 (Carryover System)**:
    *   `Hermes` 和 `Super Hermes` 史莱姆可以将被占据的单位带到下一场战斗。
    *   携带单位的等级会自动调整以匹配新关卡的敌人等级。
    *   这是一个重要的后期游戏或高难度挑战策略。

### **5. 游戏内容与数据 (Game Content & Data)**

*   **地图 (Maps)**: 攻略中描述了各种地形，如山丘、堡垒、河流、熔岩洞穴等。你需要设计这些地图的网格、地形类型（可通过/不可通过、水域、高低差）和恢复旗帜（Flags）的位置。
*   **关卡配置 (Stage Configuration)**: 攻略为每个关卡的每个难度都描述了敌人的构成。你需要将这些信息数据化，以便在不同模式下生成正确的敌人。
    *   例如 `Baleares Castle (Hard)` 相比普通难度增加了一个`Archer`。你需要记录这些差异。

### **总结与建议**

1.  **从数据开始**: 最好的起点是创建一个`database`或一系列JSON文件，用来存储所有史莱姆、敌人、技能和关卡的数据。攻略已经为你提供了绝佳的原始数据。
2.  **核心循环优先**: 先实现核心战斗循环：回合制、移动、攻击、反击、元素克制和高低差计算。这是游戏的基础。
3.  **实现核心机制**: 接下来实现游戏最具特色的“占据”系统，以及与之相关的各种状态效果（Melt, Sticky等）。
4.  **逐步添加单位**: 有了核心框架后，可以开始逐步添加攻略中描述的各种史莱姆和敌人，以及它们独特的能力。
5.  **构建关卡**: 最后，根据攻略中的关卡信息，配置每个关卡的敌人、地图和胜利奖励。
