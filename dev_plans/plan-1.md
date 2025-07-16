好的，收到你的请求。我们来对你当前的项目进行一次全面的代码审查（Code Review），然后基于此制定一个详尽的、分阶段的开发计划。

首先，恭喜你！你已经搭建了一个非常坚实的基础。项目结构清晰，核心系统（地图、单位、回合）都已经有了雏形，并且使用了像`PlayerInputState`这样的状态机来管理玩家输入，这是一个非常专业和可扩展的做法。

接下来，我们将分两部分进行：
1.  **现有实现分析与修正建议**
2.  **下一步的完整开发计划**

---

### **第一部分：现有实现分析与修正建议**

你的代码库已经实现了一个功能性的回合制战斗框架。但在我们继续开发新功能之前，有几个关键点需要修正和优化，以确保项目能顺利地扩展。

#### **做得好的地方 (Strengths):**

*   **清晰的项目结构:** `core`, `entities`, `scenes`, `systems` 的划分非常合理，易于维护。
*   **TypeScript的良好运用:** 类型定义清晰，如`UnitStats`, `TurnPhase`等，为项目打下了坚实基础。
*   **状态机管理输入:** 在`GameScene`中使用`PlayerInputState`来管理复杂的玩家交互逻辑，这是非常棒的设计，可以有效避免逻辑混乱。
*   **核心循环已通:** 游戏已经可以进行“选择单位 -> 移动/攻击 -> 结束回合 -> 简单AI行动 -> 新回合”的完整循环。
*   **模块化系统:** `MapSystem`和`TurnManager`职责分明，易于独立测试和扩展。

#### **待改进和修正的问题 (Areas for Improvement & Errors):**

1.  **【严重】元素系统不匹配:**
    *   **问题:** `src/core/GameConfig.ts` 中定义的 `ELEMENTS` 是 `earth`, `wind`, `light`, `dark` 等，这与 `game-design.md` 中核心的 **水(water)、火(fire)、草(grass)、太阳(sun)** 克制体系完全不符。
    *   **影响:** 这是最需要立即修正的问题，因为它会影响到后续几乎所有的战斗计算、单位设计和策略深度。`src/entities/Unit.ts` 中的 `getColor()` 方法也因此使用了错误的颜色逻辑。
    *   **建议:** **立即**将`GameConfig.ts`中的`ELEMENTS`修改为与GDD一致的体系。

2.  **【代码异味】`TurnManager.ts`中的类型定义冗余:**
    *   **问题:** `TurnManager.ts` 文件末尾定义了一个本地的 `Unit` 接口。而项目中已经有了 `src/entities/Unit.ts` 这个完整的`Unit`类。
    *   **影响:** 这造成了类型信息的分裂和潜在的不一致。`TurnManager`应该直接依赖于`Unit`类，而不是一个本地接口。
    *   **建议:** 删除`TurnManager.ts`中的`Unit`接口定义，并在文件顶部通过 `import { Unit } from '../entities/Unit';` 来导入真正的`Unit`类。

3.  **【逻辑错误】`TurnManager.ts`回合计数器初始化:**
    *   **问题:** 在`TurnManager`的`constructor`中直接调用了`startNewRound()`，这会导致`turnCount`在游戏开始时就从`1`变成`2`。第一回合实际上是“Round 2”。
    *   **建议:** 将`startNewRound()`中的`this.turnCount++;`移动到`endEnemyTurn()`方法的末尾，或者在`constructor`中只执行`startNewRound`的初始化部分逻辑，而不是完整调用。

---

### **第二部分：下一步的完整开发计划**

现在，我们来制定一个详细的、分阶段的开发计划。这个计划将严格按照你的GDD文档，每次专注于一个核心任务。

#### **阶段一：核心机制修正与完善 (Phase 1: Core Mechanics Correction & Enhancement)**

**目标:** 修正现有问题，并实现GDD中最核心的战斗计算规则。

*   **任务1.1：修正元素系统 (Fix Element System)**
    1.  修改 `src/core/GameConfig.ts`，将 `ELEMENTS` 常量更新为：
        ```typescript
        export const ELEMENTS = {
          WATER: 'water',
          FIRE: 'fire',
          GRASS: 'grass',
          SUN: 'sun' // 特殊元素
        } as const;
        ```
    2.  更新 `src/entities/Unit.ts` 中 `getColor()` 方法，使其能正确反映水、火、草的颜色。
    3.  检查并更新所有使用到旧元素类型的地方。

*   **任务1.2：完善战斗伤害计算 (Refine Combat Damage Calculation)**
    1.  **实现元素克制:** 在`GameScene.ts`的`attackUnit`方法中，加入元素克制逻辑。
        *   创建一个工具函数 `getElementalAdvantage(attackerElement: Element, defenderElement: Element): number`，返回伤害修正系数（例如：1.5 表示克制, 0.5 表示被克制, 1.0 表示正常）。
        *   在计算伤害时乘以这个系数。
    2.  **实现高低差系统:**
        *   在`src/systems/MapSystem.ts`的`Tile`接口中增加 `elevation: number` 属性。
        *   在`GameScene.ts`的`attackUnit`方法中，根据攻击者和防御者所在格子的`elevation`差值，再次修正伤害（如GDD所述，高打低+10%，低打高-10%）。

*   **任务1.3：实现核心夺取机制 (Implement Core Claiming Mechanism)**
    1.  在 `src/scenes/GameScene.ts` 的 `claimUnit` 方法中：
        *   实现夺取后史莱姆单位的**消耗**（即`removeUnit(slime)`）。
        *   实现夺取后敌方单位的**阵营转换**（从`enemyUnits`移到`playerUnits`）。
        *   实现GDD中提到的**元素同亲属性加成**：检查史莱姆和目标的元素，如果相同，则永久提升被夺取单位25%的攻防。你可能需要在`Unit`类中添加 `baseStats` 和 `currentStats` 来处理这种动态变化。

*   **任务1.4：代码重构与清理 (Code Refactoring & Cleanup)**
    1.  修正 `src/core/TurnManager.ts` 中的冗余`Unit`接口和回合计数器bug。

---

#### **阶段二：策略深度扩展 - 状态与能力 (Phase 2: Strategy Depth Expansion - Status & Abilities)**

**目标:** 引入游戏策略的核心——状态效果和史莱姆的特殊能力。

*   **任务2.1：状态效果系统 (Status Effect System)**
    1.  在 `src/entities/Unit.ts` 中扩展 `statusEffects`。它不应只是一个字符串集合，而是一个`Map<string, { duration: number }>`，用于追踪效果和剩余回合数。
    2.  在 `TurnManager.ts` 的 `endEnemyTurn` 方法中，添加一个`updateStatusEffects`的逻辑，让所有单位身上的效果持续时间`-1`，如果为0则移除。
    3.  **优先实现以下三个效果:**
        *   `Slow`: 在 `Unit.ts` 中添加逻辑，如果`hasStatusEffect('slow')`，则移动力变为1。
        *   `Sticky`: 在 `Unit.ts` 中添加逻辑，如果`hasStatusEffect('sticky')`，则移动力为0。
        *   `Melt`: 在 `Unit.ts` 中添加逻辑，如果`hasStatusEffect('melt')`，则防御力大幅降低。

*   **任务2.2：实现首批史莱姆特殊能力 (Implement First Slime Abilities)**
    1.  为 `Unit` 类添加一个 `useAbility(target?: Unit)` 方法。
    2.  为`GameScene.ts`的行动菜单添加“Ability”按钮。
    3.  **优先实现以下史莱姆的能力:**
        *   **Little Slime:** `useAbility` 方法可以对敌人施加`slow`状态效果。
        *   **Sticky Slime:** `useAbility` 方法可以对敌人施加`sticky`状态效果。
        *   **Melty Slime:** `useAbility` 方法可以对敌人施加`melt`状态效果。
    4.  更新 `Unit.ts` 的 `getClaimSuccessRate` 方法，使其能正确处理`slow`和`sticky`状态对夺取率的加成。

---

#### **阶段三：游戏内容填充与AI增强 (Phase 3: Content Population & AI Enhancement)**

**目标:** 让游戏世界变得丰富，AI行为更加智能和可预测。

*   **任务3.1：数据驱动的单位系统 (Data-Driven Unit System)**
    1.  创建 `src/data/slimes.ts` 和 `src/data/enemies.ts` 文件。
    2.  在这些文件中，用对象或Map的形式定义GDD中所有史莱姆和敌人的基础属性、能力、可夺取率等。
    3.  修改 `GameScene.ts` 的 `createInitialUnits` 方法，使其从这些数据文件中读取信息来生成单位，而不是硬编码。

*   **任务3.2：实现进阶AI行为模式 (Advanced AI Behavior)**
    1.  在`GameScene.ts`的`findBestTargetFor`方法中，实现GDD中提到的AI目标选择优先级。
    2.  **最高优先级:** 如果地图上有`Metal Slime`，并且在攻击范围内，AI应无条件攻击它。
    3.  **次高优先级:** 实现高低差判断，让AI优先攻击低处的单位。
    4.  **阵地行为:** 为AI单位添加一个状态，如`isStationary`。如果为`true`，则AI不会主动移动，除非被玩家从其攻击范围外攻击。

*   **任务3.3：实现分裂与复活机制 (Implement Splitting & Reviving)**
    1.  **分裂:**
        *   在`Unit.ts`中为`Divide Slime`和`Goddess' Hand`添加一个`split()`方法。
        *   当它们受到攻击时，在`attackUnit`中调用此方法。
        *   `split()`方法会创建1个或3个新的史莱姆实例，并平分HP。这需要在`GameScene`中动态添加新单位。
    2.  **复活:**
        *   在`Unit.ts`中为`Guts Slime`和`Phoenix`添加一个`revive()`方法。
        *   当它们占据的单位被击败时，在`removeUnit`逻辑中检查。如果是由复活系史莱姆占据的，则不移除史莱姆，而是调用`revive()`，让其变回可行动的史莱姆单位。

---

#### **阶段四：游戏体验与外围系统 (Phase 4: Player Experience & Peripheral Systems)**

**目标:** 完善UI，实现游戏进程，让游戏成为一个完整的体验。

*   **任务4.1：UI/UX 完善 (UI/UX Refinement)**
    1.  **战斗预测UI:** 当玩家悬停在攻击或夺取目标上时，显示一个小的UI提示，内容包括预期伤害和成功率。
    2.  **单位信息面板:** 点击任何单位时，在屏幕角落显示其详细信息（HP、ATK、DEF、状态效果等）。
    3.  **行动路径可视化:** 移动时，显示单位将要行走的路径。

*   **任务4.2：游戏进程系统 (Progression System)**
    1.  实现史莱姆的**经验值和升级**。战斗结束后，根据表现和难度给予存活的史莱姆经验。
    2.  实现**等级奖励 (Level Up Bonus)**。当史莱姆达到成熟等级时，永久增强其能力。
    3.  实现战后**吸引野生史莱姆**的机制。

*   **任务4.3：关卡系统与存档 (Level System & Save/Load)**
    1.  创建`src/data/levels.ts`，用数据定义多个关卡（地图布局、敌人配置）。
    2.  创建一个简单的关卡选择界面。
    3.  使用浏览器的`localStorage`实现一个基础的存档系统，保存玩家拥有的史莱姆、等级和已解锁的关卡。

这个计划将引导你从一个功能原型，逐步构建出一个内容丰富、策略深度十足的完整游戏。祝你开发顺利！
