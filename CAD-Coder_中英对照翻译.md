# CAD-Coder: Text-to-CAD Generation with Chain-of-Thought and Geometric Reward

**中英对照翻译 / Bilingual Translation**

> arXiv:2505.19713v3 [cs.GR] 21 Oct 2025  
> Preprint. Under review.

---

## 作者 / Authors

| 姓名 | 单位 | 邮箱 |
|------|------|------|
| Yandong Guan（关延东） | 北京航空航天大学 软件学院 | yd_guan@buaa.edu.cn |
| Xilin Wang（王锡林） | 北京航空航天大学 软件学院 | wang_xilin@buaa.edu.cn |
| Ximing Xing（邢希明） | 北京航空航天大学 软件学院 | ximingxing@buaa.edu.cn |
| Jing Zhang（张婧） | 北京航空航天大学 软件学院 | zhang_jing@buaa.edu.cn |
| Dong Xu（徐东） | 香港大学 | dongxu@cs.hku.hk |
| Qian Yu*（于倩，通讯作者） | 北京航空航天大学 软件学院 | qianyu@buaa.edu.cn |

---

## Abstract / 摘要

| English | 中文 |
|---------|------|
| In this work, we introduce CAD-Coder, a novel framework that reformulates text-to-CAD as the generation of CadQuery scripts—a Python-based, parametric CAD language. | 本文提出 **CAD-Coder**，一种新颖框架，将文本到 CAD（text-to-CAD）重新表述为生成 CadQuery 脚本——一种基于 Python 的参数化 CAD 语言。 |
| This representation enables direct geometric validation, a richer modeling vocabulary, and seamless integration with existing LLMs. | 该表示支持直接几何验证、更丰富的建模词汇，以及与现有大语言模型（LLM）的无缝集成。 |
| To further enhance code validity and geometric fidelity, we propose a two-stage learning pipeline: (1) supervised fine-tuning on paired text–CadQuery data, and (2) reinforcement learning with Group Reward Policy Optimization (GRPO), guided by a CAD-specific reward comprising both a geometric reward (Chamfer Distance) and a format reward. | 为进一步提升代码有效性与几何保真度，我们提出两阶段学习流水线：（1）在成对的文本–CadQuery 数据上进行监督微调（SFT）；（2）使用组相对策略优化（GRPO）进行强化学习，并由 CAD 专用奖励引导——该奖励同时包含几何奖励（倒角距离 Chamfer Distance）与格式奖励。 |
| We also introduce a chain-of-thought (CoT) planning process to improve model reasoning, and construct a large-scale, high-quality dataset of 110K text–CadQuery–3D model triplets and 1.5K CoT samples via an automated pipeline. | 我们还引入思维链（CoT）规划过程以增强模型推理能力，并通过自动化流水线构建大规模高质量数据集：包含 11 万条文本–CadQuery–三维模型三元组以及 1.5K 条 CoT 样本。 |
| Extensive experiments demonstrate that CAD-Coder enables LLMs to generate diverse, valid, and complex CAD models directly from natural language, advancing the state of the art of text-to-CAD generation and geometric reasoning. | 大量实验表明，CAD-Coder 使 LLM 能够直接从自然语言生成多样、有效且复杂的 CAD 模型，推动了文本到 CAD 生成与几何推理的前沿水平。 |

---

## 1 Introduction / 引言

| English | 中文 |
|---------|------|
| Computer-Aided Design (CAD) systems are fundamental tools in engineering and manufacturing, enabling the creation of precise 3D models. | 计算机辅助设计（CAD）系统是工程与制造中的基础工具，用于创建精确的三维模型。 |
| However, traditional CAD workflows often demand significant expertise and are time-consuming, which limits broader accessibility and hampers rapid iteration. | 然而，传统 CAD 工作流通常需要大量专业知识且耗时，限制了更广泛的可及性，并阻碍了快速迭代。 |
| Recent advancements in Large Language Models (LLMs), particularly their proficiency in natural language understanding and code generation, present a promising opportunity to streamline CAD processes based on natural language descriptions. | 大语言模型（LLM）的近期进展——尤其是在自然语言理解与代码生成方面的能力——为基于自然语言描述简化 CAD 流程提供了有前景的机遇。 |
| The ability to generate or modify CAD models via textual instructions could lower the entry barrier for novices and enhance the efficiency of experienced users. | 通过文本指令生成或修改 CAD 模型，有望降低新手入门门槛，并提升资深用户的效率。 |

| English | 中文 |
|---------|------|
| However, generating CAD from textual descriptions remains a nontrivial challenge. | 然而，从文本描述生成 CAD 仍是一项非平凡的挑战。 |
| To leverage progress in natural language processing, researchers have proposed representing CAD models using pre-defined command sequences and formulating text-to-CAD as a machine translation problem—i.e., autoregressively predicting CAD command tokens conditioned on input text. | 为利用自然语言处理的进展，研究者提出用预定义命令序列表示 CAD 模型，并将文本到 CAD 表述为机器翻译问题——即在输入文本条件下自回归预测 CAD 命令 token。 |

### 现有方法的局限 / Limitations of Existing Approaches

| English | 中文 |
|---------|------|
| Despite their utility, these approaches face several limitations. | 尽管有用，这些方法仍面临若干局限。 |
| First, verifying the validity of a CAD model represented by command sequences is challenging. | 第一，验证由命令序列表示的 CAD 模型是否有效较为困难。 |
| Second, most existing methods support only a limited set of operations, such as sketch and extrusion, restricting the diversity of generated CAD models. | 第二，多数现有方法仅支持有限操作集（如草图与拉伸），限制了生成 CAD 模型的多样性。 |
| Third, CAD command sequences are often difficult to interpret and edit, complicating both understanding and debugging. | 第三，CAD 命令序列通常难以解释与编辑，使理解与调试更复杂。 |

### 为何选择 CadQuery / Why CadQuery

| English | 中文 |
|---------|------|
| To address these issues, we advocate for a new proxy representation of CAD models. In this paper, we utilize CadQuery, a Python-based parametric CAD scripting language, as the target representation. | 为解决上述问题，我们主张采用新的 CAD 模型代理表示。本文使用 **CadQuery**——一种基于 Python 的参数化 CAD 脚本语言——作为目标表示。 |
| CadQuery is particularly suitable for the following reasons: | CadQuery 特别合适，原因如下： |
| (1) It provides inherent geometric validation, as CadQuery scripts can be directly executed to verify the validity of the resulting CAD model. | （1）提供固有几何验证：CadQuery 脚本可直接执行，以验证所得 CAD 模型的有效性。 |
| (2) It offers a rich vocabulary for CAD modeling, enabling the representation of diverse and complex geometries. | （2）提供丰富的 CAD 建模词汇，能表示多样且复杂的几何体。 |
| (3) CadQuery scripts are composed of semantic, function-based constructs, making them more interpretable than low-level command sequences. | （3）CadQuery 脚本由语义化、基于函数的构造组成，比低级命令序列更易解释。 |
| (4) Importantly, as CadQuery is implemented in Python, it allows us to leverage the code generation capabilities of modern LLMs that are already proficient in programming tasks. | （4）重要的是，CadQuery 用 Python 实现，使我们能充分利用已擅长编程任务的现代 LLM 的代码生成能力。 |

### 核心挑战与方法 / Core Challenge and Method

| English | 中文 |
|---------|------|
| Consequently, we reformulate the text-to-CAD task as generating CadQuery code from natural language input. | 因此，我们将文本到 CAD 任务重新表述为：从自然语言输入生成 CadQuery 代码。 |
| While this representation enables the use of LLMs for CAD generation, adapting LLMs to reliably produce high-quality CAD models remains challenging. | 虽该表示使 LLM 可用于 CAD 生成，但使 LLM 可靠地产出高质量 CAD 模型仍具挑战。 |
| The core difficulty arises from the dual requirements of CadQuery code: syntactic correctness (from a programming perspective) and geometric plausibility (from a 3D modeling perspective). | 核心困难来自 CadQuery 代码的双重要求：语法正确性（编程视角）与几何合理性（三维建模视角）。 |
| While supervised fine-tuning (SFT) on paired text and CadQuery code can teach the model syntactic patterns, it is insufficient to guarantee both code validity and geometric correctness, as it lacks explicit 3D knowledge and reasoning capabilities. | 虽在成对文本与 CadQuery 代码上做监督微调（SFT）可教会模型语法模式，但不足以同时保证代码有效性与几何正确性，因其缺乏显式三维知识与推理能力。 |

| English | 中文 |
|---------|------|
| To overcome these challenges, we draw inspiration from recent advances where reinforcement learning (RL) has improved LLM reasoning and planning across various domains. | 为克服这些挑战，我们从近期进展中汲取灵感：强化学习（RL）已在多领域提升了 LLM 的推理与规划能力。 |
| In particular, we integrate Group Reward Policy Optimization (GRPO), an efficient RL algorithm, into the text-to-CAD code generation pipeline. | 具体地，我们将高效 RL 算法 **组相对策略优化（GRPO）** 集成到文本到 CAD 代码生成流水线中。 |
| Our approach consists of two stages: (1) We begin by supervised fine-tuning an LLM with paired natural language descriptions and CadQuery code to establish basic syntax and mapping. (2) We then enhance the model's planning and reasoning ability via RL, introducing a novel CAD-Specific reward function. | 方法包含两阶段：（1）先用成对自然语言描述与 CadQuery 代码对 LLM 做监督微调，建立基本语法与映射；（2）再通过 RL 增强模型的规划与推理能力，并引入新颖的 CAD 专用奖励函数。 |

| English | 中文 |
|---------|------|
| Specifically, since multiple distinct CadQuery scripts can produce geometrically equivalent CAD models—a challenge for SFT to capture—we introduce a chain-of-thought (CoT) process that encourages the model to plan before code generation. | 具体而言，由于多段不同的 CadQuery 脚本可产生几何等价的 CAD 模型——这对 SFT 难以捕捉——我们引入思维链（CoT）过程，鼓励模型在生成代码前先规划。 |
| Our CAD-Specific reward comprises two components: a geometric reward, which uses the Chamfer Distance (CD) between generated and target 3D geometries to ensure geometric accuracy, and a format reward, which enforces the reasoning process and syntactic correctness of the generated code. | 我们的 CAD 专用奖励包含两部分：**几何奖励**——用生成与目标三维几何之间的倒角距离（CD）保证几何精度；**格式奖励**——约束推理过程与生成代码的语法正确性。 |

### 贡献 / Contributions

| English | 中文 |
|---------|------|
| To facilitate research in this area, we construct a large-scale, geometrically verified dataset comprising 110K text–CadQuery-3D model triplets and 1.5K high-quality CoT samples. | 为促进该领域研究，我们构建大规模、经几何验证的数据集，包含 11 万条文本–CadQuery–三维模型三元组与 1.5K 条高质量 CoT 样本。 |
| We also propose an automatic data construction pipeline to accelerate dataset creation and ensure high quality. | 我们还提出自动数据构建流水线，以加速数据集创建并保证高质量。 |
| Extensive experiments demonstrate that our method unlocks new capabilities for LLMs, enabling the generation of complex, functional CAD models directly from high-level textual intent. | 大量实验表明，本方法为 LLM 解锁新能力，使其能直接从高层文本意图生成复杂、可用的 CAD 模型。 |
| In summary, our contributions include the following: | 总结而言，贡献如下： |
| • We propose a novel approach CAD-Coder that reformulates the text-to-CAD task as generating CadQuery code from natural language descriptions. Leveraging the Python-based CadQuery enables more interpretable, diverse, and valid CAD model generation, while fully utilizing the code generation capabilities of existing large language models. | • 提出新颖方法 **CAD-Coder**，将文本到 CAD 任务重新表述为从自然语言描述生成 CadQuery 代码。借助基于 Python 的 CadQuery，可实现更可解释、更多样且更有效的 CAD 模型生成，并充分利用现有大语言模型的代码生成能力。 |
| • We introduce a two-stage pipeline that combines supervised fine-tuning with reinforcement learning using GRPO. Our method incorporates a chain-of-thought (CoT) planning process and a novel CAD-Specific reward, which jointly enforce both syntactic correctness and geometric plausibility in the generated CAD models. | • 提出结合监督微调与基于 GRPO 的强化学习的两阶段流水线。方法融入思维链（CoT）规划过程与新颖的 CAD 专用奖励，共同约束生成 CAD 模型的语法正确性与几何合理性。 |
| • We construct a high-quality, large-scale dataset consisting of 110K verified text–CadQuery-3D model triplets and 1.5K CoT samples via an automated pipeline, facilitating further research in text-to-CAD generation and geometric reasoning. | • 通过自动化流水线构建高质量大规模数据集，含 11 万条已验证的文本–CadQuery–三维模型三元组与 1.5K 条 CoT 样本，以促进文本到 CAD 生成与几何推理的进一步研究。 |

---

## 2 Related Work / 相关工作

### 2.1 Large Language Model for Code Generation / 用于代码生成的大语言模型

| English | 中文 |
|---------|------|
| Large language models (LLMs) have revolutionized code generation, with models like GPT-4 and specialized code-focused LLMs such as CodeLlama showcasing impressive capabilities in translating natural language into various programming languages. | 大语言模型已革新代码生成：GPT-4 等模型以及 CodeLlama 等专注代码的 LLM，在将自然语言翻译为多种编程语言方面展现出色能力。 |
| Standard training typically involves supervised fine-tuning (SFT) on extensive code corpora and instruction datasets. | 标准训练通常包括在大规模代码语料与指令数据集上的监督微调（SFT）。 |
| To better align LLM behavior with specific goals or complex tasks, reinforcement learning (RL) techniques have been increasingly employed. | 为更好使 LLM 行为对齐特定目标或复杂任务，强化学习（RL）技术被越来越多地采用。 |
| Reinforcement learning with human feedback (RLHF) is widely used for general alignment. | 基于人类反馈的强化学习（RLHF）广泛用于通用对齐。 |
| For more task-specific optimization, policy gradient algorithms like Proximal Policy Optimization (PPO) are commonly utilized, though these often require training a separate critic network, which adds computational overhead. | 对更任务特定的优化，常用近端策略优化（PPO）等策略梯度算法，但往往需要训练独立的评论家网络，增加计算开销。 |

| English | 中文 |
|---------|------|
| Our approach leverages Group Reward Policy Optimization (GRPO), a more recent and efficient RL algorithm that estimates baselines through relative rewards within a sample batch, removing the need for a critic and making RL fine-tuning more feasible for complex tasks like ours. | 本方法采用组相对策略优化（GRPO）——一种更新且更高效的 RL 算法：通过样本批次内的相对奖励估计基线，无需评论家网络，使复杂任务上的 RL 微调更可行。 |
| Generating structured and logically coherent code, especially for multi-step procedures common in CAD modeling, requires advanced reasoning. | 生成结构化、逻辑连贯的代码——尤其是 CAD 建模中常见的多步流程——需要高级推理。 |
| Chain-of-Thought (CoT) prompting has proven effective in improving the reasoning and planning capabilities of LLMs by prompting them to generate intermediate steps. | 思维链（CoT）提示已被证明有效：通过促使 LLM 生成中间步骤，提升其推理与规划能力。 |
| We leverage CoT to enhance the model's ability to decompose complex natural language instructions into coherent CadQuery code sequences. | 我们利用 CoT 增强模型能力，将复杂自然语言指令分解为连贯的 CadQuery 代码序列。 |

### 2.2 CAD Generation / CAD 生成

| English | 中文 |
|---------|------|
| Generative modeling for CAD systems commonly employs two main representations: boundary representation (B-rep) and command sequence representations. | CAD 系统的生成式建模通常采用两类主要表示：**边界表示（B-rep）** 与 **命令序列表示**。 |
| B-rep models combine geometry and topology to offer high precision and accuracy; however, their complexity presents significant challenges for generative modeling. | B-rep 模型结合几何与拓扑，精度高；但其复杂性对生成建模构成重大挑战。 |
| To address this, various models use separate latent spaces and decoders for geometry and topology. Notably, HoLa introduces a unified latent space for B-rep generation. | 为此，多种模型对几何与拓扑使用分离的潜空间与解码器。值得注意的是，HoLa 为 B-rep 生成引入统一潜空间。 |
| Despite their advantages, direct generation of B-rep models from text remains computationally intensive, as it involves capturing intricate geometric features and interrelationships. | 尽管有优势，从文本直接生成 B-rep 仍计算密集，因其需捕捉复杂几何特征与相互关系。 |

| English | 中文 |
|---------|------|
| Alternatively, command sequence representations, such as those proposed by DeepCAD, model the procedural nature of CAD design by encoding the design process as a series of commands, e.g., sketch creation or extrusion. | 另一路径是命令序列表示（如 DeepCAD）：通过将设计过程编码为一系列命令（如草图创建或拉伸），建模 CAD 设计的过程性本质。 |
| Several approaches have demonstrated the ability to generate command sequences from point clouds or images. CAD-MLLM leverages multimodal large language model (MLLM) to enhance the performance of this generation process. | 若干方法已展示从点云或图像生成命令序列的能力。CAD-MLLM 利用多模态大语言模型（MLLM）提升该生成过程的性能。 |
| In the context of text-to-CAD generation, methods like Text2CAD and CAD-Translator use encoder-decoder architectures to translate textual descriptions into command sequences. | 在文本到 CAD 情境中，Text2CAD、CAD-Translator 等方法用编码器–解码器架构将文本描述翻译为命令序列。 |
| Additionally, CAD-Llama and CADFusion employ LLMs to further address the complexity of this task. | 此外，CAD-Llama 与 CADFusion 使用 LLM 进一步应对该任务复杂度。 |
| While command sequence representations simplify CAD model generation, they often lack direct connections to the geometric accuracy of the resulting models. | 虽命令序列表示简化了 CAD 模型生成，但往往与所得模型的几何精度缺乏直接联系。 |

| English | 中文 |
|---------|------|
| In contrast, our approach leverages CadQuery, a Python-based parametric library that facilitates programmatic CAD model generation. | 相比之下，本方法采用 CadQuery——基于 Python 的参数化库，便于以程序方式生成 CAD 模型。 |
| This representation offers significant advantages, including enhanced editability, better interpretability, and compatibility with LLMs. | 该表示具有显著优势：更强可编辑性、更好可解释性，以及与 LLM 的兼容性。 |
| CAD-Recode generates CadQuery scripts from point clouds, while Query2CAD and CAD-Assistant directly prompt LLMs to generate CadQuery scripts from input text or images. | CAD-Recode 从点云生成 CadQuery 脚本；Query2CAD 与 CAD-Assistant 则直接提示 LLM，从输入文本或图像生成 CadQuery 脚本。 |
| The characteristics of CadQuery make it particularly well-suited as an intermediate modality for generating CAD models from text. | CadQuery 的特性使其特别适合作为从文本生成 CAD 模型的中间模态。 |

---

## 3 Methodology / 方法

### 3.1 CadQuery: CAD Representation as Python Code / CadQuery：以 Python 代码表示 CAD

| English | 中文 |
|---------|------|
| We adopt CadQuery, a Python-based parametric CAD scripting language, as the core representation for 3D modeling in our framework. | 我们采用 CadQuery（基于 Python 的参数化 CAD 脚本语言）作为框架中三维建模的核心表示。 |
| CadQuery can be executed directly without any external software dependencies. | CadQuery 可直接执行，无需任何外部软件依赖。 |
| CadQuery allows models to be constructed using chainable geometric operations (e.g., `box()`, `circle()`, `extrude()`), encoded as modular and readable Python code. | CadQuery 允许用可链式调用的几何操作（如 `box()`、`circle()`、`extrude()`）构建模型，编码为模块化、可读的 Python 代码。 |
| Each script corresponds to a complete, executable modeling procedure that can be rendered directly via the OpenCascade kernel into high-fidelity 3D geometry. | 每段脚本对应完整、可执行的建模过程，可通过 OpenCascade 内核直接渲染为高保真三维几何。 |

| English | 中文 |
|---------|------|
| Traditional methods such as DeepCAD represent model structures using sketch-extrude command sequences. | 传统方法如 DeepCAD 用草图–拉伸命令序列表示模型结构。 |
| As illustrated in Fig. 1, these representations are typically linearized and low-level, lack modularity, and cannot be directly executed. | 如图 1 所示，这些表示通常是线性化的、低级的，缺乏模块性，且不能直接执行。 |
| They often require additional post-processing to produce 3D shapes. This not only increases modeling complexity but also hinders the model's ability to learn structured modeling semantics. | 它们常需额外后处理才能得到三维形状。这不仅增加建模复杂度，也阻碍模型学习结构化建模语义。 |
| In contrast, CadQuery is interpretable and executable. CadQuery provides expressive and flexible geometric operations, ranging from basic primitives to complex modeling procedures. | 相比之下，CadQuery 可解释且可执行，提供从基本图元到复杂建模流程的富表达、灵活几何操作。 |
| Meanwhile, CadQuery scripts can be directly executed for validation. The provided high-level API can also better align with the input textual description. | 同时，CadQuery 脚本可直接执行以进行验证；其高层 API 也能更好对齐输入文本描述。 |

| English | 中文 |
|---------|------|
| Considering the Python nature, CadQuery is well-suited for generative modeling with language models. | 鉴于其 Python 本质，CadQuery 非常适合与语言模型结合做生成式建模。 |
| Nevertheless, a crucial challenge lies in generating code that is both syntactically correct and produces geometrically accurate and valid 3D designs. | 然而，关键挑战在于：生成既语法正确、又能产出几何准确且有效三维设计的代码。 |
| To address this, our approach employs a two-stage training strategy. First, an initial Supervised fine-tuning (SFT) phase teaches the model the specific CadQuery syntax. Then, a reinforcement learning (RL) phase is introduced to further enhance the geometric accuracy and validity of the generated 3D output. | 为此，本方法采用两阶段训练策略。首先，初始监督微调（SFT）阶段教会模型特定 CadQuery 语法；随后引入强化学习（RL）阶段，进一步提升生成三维输出的几何精度与有效性。 |

> **图 1 说明**：左侧为 CAD 模型的文本描述；中间为 DeepCAD 所用草图–拉伸命令序列；右侧为本方法所用 CadQuery 代码。底行展示三个顺序操作各自得到的三维模型（多孔切割、拉伸凸台等）。

### 3.2 CAD-Coder

#### Overview / 总览

| English | 中文 |
|---------|------|
| We adopt Qwen2.5-7B-Instruct, a strong open-source language model pre-trained on a mixture of web text and code, as the base model for CadQuery code generation. | 我们采用 **Qwen2.5-7B-Instruct**（在网页文本与代码混合数据上预训练的强开源语言模型）作为 CadQuery 代码生成的基座模型。 |
| The input to the model is a natural language description \(L\) of the 3D design intent. The output is an executable CadQuery script \(C\) which is executed to produce a 3D geometry \(M = \mathrm{Execute}(C)\). | 模型输入为三维设计意图的自然语言描述 \(L\)；输出为可执行 CadQuery 脚本 \(C\)，执行后得到三维几何 \(M = \mathrm{Execute}(C)\)。 |
| The model is fine-tuned and optimized in an autoregressive decoding setup, where CadQuery tokens are generated sequentially, conditioned on the input and previous tokens. | 模型在自回归解码设定下微调与优化：在输入与已生成 token 条件下，依次生成 CadQuery token。 |

| English | 中文 |
|---------|------|
| To better generate CAD models, our method leverages a two-stage training strategy. | 为更好生成 CAD 模型，本方法采用两阶段训练策略。 |
| In the first stage, we SFT the LLM with paired data, which enables the model to learn CadQuery's fundamental syntax and common programming patterns. | 第一阶段：用成对数据对 LLM 做 SFT，使模型学习 CadQuery 的基本语法与常见编程模式。 |
| To further enhance the geometric reasoning ability of the model, which improves the accuracy of the final 3D model, we introduce the second RL stage with a reward specifically designed for CAD. | 为进一步增强模型的几何推理能力（从而提升最终三维模型精度），我们引入第二阶段 RL，并使用专为 CAD 设计的奖励。 |

> **图 2**：CAD-Coder 训练流水线——文本经 SFT LLM 与 GRPO，产出含 `<think>...</think>` 推理块与 Python 代码的输出。

#### Stage 1: Supervised Fine-Tuning for CAD Code Generation / 阶段 1：CAD 代码生成的监督微调

| English | 中文 |
|---------|------|
| We begin by performing SFT to equip the model with the basic capability to translate natural language descriptions into executable CadQuery code. | 我们首先进行 SFT，使模型具备将自然语言描述翻译为可执行 CadQuery 代码的基本能力。 |
| Unlike generic code generation, CAD code must follow strict syntactic and geometric constraints. | 与通用代码生成不同，CAD 代码必须遵循严格的语法与几何约束。 |
| This phase serves as a foundation that enables the model to understand the CadQuery's syntax and learn the basic mapping between high-level descriptions to low-level modeling operations in a structured format. | 该阶段作为基础，使模型理解 CadQuery 语法，并以结构化格式学习高层描述到低层建模操作的基本映射。 |

| English | 中文 |
|---------|------|
| We train on a synthetic high-quality dataset containing 8k examples generated through our data annotation pipeline (see Section 4). | 我们在经数据标注流水线生成的含 8k 样本的合成高质量数据集上训练（见第 4 节）。 |
| Each training sample is a pair \((L, C_{gt})\), where \(L\) is a natural language prompt and \(C_{gt}\) is the corresponding ground-truth CadQuery code that has been verified for executability and filtered by geometric correctness. | 每个训练样本为对 \((L, C_{gt})\)，其中 \(L\) 为自然语言提示，\(C_{gt}\) 为对应真值 CadQuery 代码（已验证可执行性并经几何正确性过滤）。 |

**损失函数 / Loss Function：**

\[
\mathcal{L}_{\mathrm{SFT}}(\theta) = -\mathbb{E}_{(L,C_{gt})\sim\mathcal{D}_{\mathrm{SFT}}}\left[\sum_{t=1}^{|C_{gt}|}\log\pi_{\theta}(c_t \mid c_{<t}, L)\right] \tag{1}
\]

| English | 中文 |
|---------|------|
| where \(L\) denotes the input prompt, \(C_{gt}=\{c_t\}_{t=1}^{|C_{gt}|}\) represents the ground-truth code sequence, \(c_{<t}\) refers to the preceding tokens before step \(t\), \(\pi_{\theta}\) denotes the model policy with parameters \(\theta\), and \(|C_{gt}|\) is the length of the code sequence. | 其中 \(L\) 为输入提示，\(C_{gt}=\{c_t\}_{t=1}^{|C_{gt}|}\) 为真值代码序列，\(c_{<t}\) 为第 \(t\) 步之前的 token，\(\pi_{\theta}\) 为参数 \(\theta\) 的模型策略，\(|C_{gt}|\) 为代码序列长度。 |
| This allows the model to follow the syntax of CadQuery and establish preliminary mappings between common shape-related language patterns and CAD primitives (e.g. “create a hole” → `.hole()`, “draw a circle” → `.circle()`). | 这使模型能遵循 CadQuery 语法，并在常见形状相关语言模式与 CAD 图元之间建立初步映射（如“打孔”→`.hole()`，“画圆”→`.circle()`）。 |
| After this stage, the model shows promising capabilities in generating valid CadQuery code for standard and relatively simple modeling cases. | 该阶段后，模型在标准、相对简单的建模情形中展现出生成有效 CadQuery 代码的良好能力。 |
| However, we observe two major limitations: The generated code sometimes lacks geometric accuracy compared to the target shape, and the model struggles with complex structures that require multi-step or spatial reasoning. | 然而我们观察到两大局限：生成代码有时相对目标形状几何精度不足；且模型在需要多步或空间推理的复杂结构上表现吃力。 |

#### Stage 2: Reinforcement Learning with CAD-Specific Rewards / 阶段 2：带 CAD 专用奖励的强化学习

| English | 中文 |
|---------|------|
| To address these challenges, we introduce a CAD-Specific RL stage using Group Reward Policy Optimization (GRPO) to improve the geometric reasoning capability, enhanced with chain-of-thought (CoT) prompting to guide structured reasoning. | 为应对这些挑战，我们引入基于 GRPO 的 CAD 专用 RL 阶段以提升几何推理能力，并用思维链（CoT）提示引导结构化推理。 |
| We first cold-starting the model with designed CoT samples to enhance basic reasoning ability. | 我们首先用设计好的 CoT 样本对模型做冷启动，以增强基本推理能力。 |
| Then, during RL phase, we specifically introduce Chamfer Distance (CD), a common geometric metric, into the reward signal to directly optimize the model based on the 3D output quality instead of token-level loss. | 随后在 RL 阶段，我们将常用几何度量倒角距离（CD）引入奖励信号，基于三维输出质量直接优化模型，而非仅依赖 token 级损失。 |

#### CoT Design / 思维链设计

| English | 中文 |
|---------|------|
| Unlike direct prompt-to-code pairs used in standard SFT, CoT samples are formatted as \((L_{\mathrm{cot}}, C)\), where \(L_{\mathrm{cot}}\) includes a step-wise plan embedded in natural language before the final modeling instruction. | 与标准 SFT 中直接的提示–代码对不同，CoT 样本格式为 \((L_{\mathrm{cot}}, C)\)，其中 \(L_{\mathrm{cot}}\) 在最终建模指令前嵌入分步自然语言计划。 |
| Considering the hierarchical and compositional nature of CAD modeling, we design \(L_{\mathrm{cot}}\) to simulate an engineer's planning process, including component decomposition, coordinate system assignment, sketch design, and extrusion operations each outlined succinctly within `<think>...</think>` tags. | 鉴于 CAD 建模的层次性与组合性，我们设计 \(L_{\mathrm{cot}}\) 以模拟工程师的规划过程：部件分解、坐标系分配、草图设计与拉伸操作等，均在 `<think>...</think>` 标签内简洁列出。 |
| This structured reasoning format helps the model map textual descriptions to executable geometry. | 该结构化推理格式帮助模型将文本描述映射到可执行几何。 |
| These intermediate reasoning steps guide the LLM to break down complex shapes into simpler components aligned with textual description. | 这些中间推理步骤引导 LLM 将复杂形状分解为与文本描述对齐的更简单部件。 |

#### Reward Design / 奖励设计

| English | 中文 |
|---------|------|
| During GRPO training, for each input \(L_{\mathrm{cot}}\), the current policy \(\pi_{\theta}\) generates \(k\) diverse CadQuery candidates \(\{C_1,\ldots,C_k\}\). | 在 GRPO 训练中，对每个输入 \(L_{\mathrm{cot}}\)，当前策略 \(\pi_{\theta}\) 生成 \(k\) 个多样的 CadQuery 候选 \(\{C_1,\ldots,C_k\}\)。 |
| The final CAD-Specific reward \(R_i\) includes two components: geometric reward \(R_i^{\mathrm{geo}}\), and format reward \(R_i^{\mathrm{fmt}}\). | 最终 CAD 专用奖励 \(R_i\) 包含两部分：几何奖励 \(R_i^{\mathrm{geo}}\) 与格式奖励 \(R_i^{\mathrm{fmt}}\)。 |
| In contrast to program synthesis tasks where GRPO uses exact match-based rewards, CAD modeling lacks a unique ground-truth code. Multiple solutions can yield identical geometry. | 与程序合成任务中 GRPO 使用精确匹配奖励不同，CAD 建模不存在唯一真值代码；多种解可得到相同几何。 |
| To address this, we design a geometric reward based on CD between the rendered 3D model and the target geometry \(M_{gt}\). | 为此，我们基于渲染三维模型与目标几何 \(M_{gt}\) 之间的 CD 设计几何奖励。 |
| For each generated code candidate \(C_i\), we first attempt execution using the CadQuery engine. If successful, the resulting mesh \(M_i\) is uniformly sampled into a dense point cloud. Similarly, \(M_{gt}\) is also sampled. | 对每个生成代码候选 \(C_i\)，先尝试用 CadQuery 引擎执行；若成功，将所得网格 \(M_i\) 均匀采样为稠密点云；对 \(M_{gt}\) 同样采样。 |

**倒角距离 / Chamfer Distance：**

\[
\mathrm{CD}(P,Q)=\frac{1}{|P|}\sum_{x\in P}\min_{y\in Q}\|x-y\|_2^{2}+\frac{1}{|Q|}\sum_{y\in Q}\min_{x\in P}\|x-y\|_2^{2} \tag{2}
\]

| English | 中文 |
|---------|------|
| where \(P\) and \(x\) are sampled from the predicted shape, and \(Q\) and \(y\) from the ground-truth shape; \(|P|\) and \(|Q|\) denote the number of points in each set. | 其中 \(P\) 与 \(x\) 来自预测形状采样，\(Q\) 与 \(y\) 来自真值形状；\(|P|\)、\(|Q|\) 为各点集点数。 |
| This metric quantifies the geometric discrepancy between the generated shape and the ground-truth model. Smaller CD values indicate closer geometric alignment. | 该度量量化生成形状与真值模型的几何差异；CD 越小，几何对齐越近。 |

**分段几何奖励 / Piecewise Geometric Reward：**

| English | 中文 |
|---------|------|
| To convert CD values into reward signals, we define a piecewise geometric reward \(R_i^{\mathrm{geo}}\). | 为将 CD 值转为奖励信号，我们定义分段几何奖励 \(R_i^{\mathrm{geo}}\)。 |
| Specifically, if the CD is smaller than \(1\times 10^{-5}\), the candidate is assigned the maximum reward of 1.0. | 具体地，若 CD 小于 \(1\times 10^{-5}\)，候选获得最大奖励 1.0。 |
| When the CD is greater than 0.5, or if the code fails to execute, the reward is set to 0. | 当 CD 大于 0.5，或代码执行失败时，奖励设为 0。 |
| For CD values between these thresholds, the reward decreases linearly: a CD of 0.5 corresponds to a minimum non-zero reward of 0.01, and smaller CD values yield proportionally higher rewards. | 介于两阈值之间时，奖励线性递减：CD=0.5 对应最小非零奖励 0.01，更小 CD 对应成比例更高奖励。 |
| This design ensures that the model receives continuous geometric feedback, encouraging approximate yet geometrically close solutions even when exact reconstruction is difficult. | 该设计保证模型获得连续几何反馈，即便精确重建困难，也鼓励近似但几何接近的解。 |

**格式奖励 / Format Reward：**

| English | 中文 |
|---------|------|
| To compute format reward \(R_i^{\mathrm{fmt}}\), we apply regular expression matching to detect whether the output \(C_i\) contains both a `<think>...</think>` reasoning block and a properly formatted Python code block (delimited by triple backticks \`\`\`python ...\`\`\`). | 计算格式奖励 \(R_i^{\mathrm{fmt}}\) 时，用正则匹配检测输出 \(C_i\) 是否同时包含 `<think>...</think>` 推理块与格式正确的 Python 代码块（由 \`\`\`python ...\`\`\` 界定）。 |
| If both are present, \(R_i^{\mathrm{fmt}}=1\); otherwise, \(R_i^{\mathrm{fmt}}=0\). | 若两者皆有，则 \(R_i^{\mathrm{fmt}}=1\)；否则为 0。 |

**最终奖励与 GRPO 损失 / Final Reward and GRPO Loss：**

\[
R_i=\lambda_{\mathrm{geo}}R_i^{\mathrm{geo}}+\lambda_{\mathrm{fmt}}R_i^{\mathrm{fmt}}
\]

\[
\begin{aligned}
\mathcal{L}_{\mathrm{GRPO}}(\theta)=\mathbb{E}_{L_{\mathrm{cot}}\sim\mathcal{D},\,\{C_i\}_{i=1}^{k}\sim\pi_{\theta_{\mathrm{old}}}(\cdot|L_{\mathrm{cot}})}
\Bigg[
\frac{1}{k}\sum_{i=1}^{k}\frac{1}{|C_i|}\sum_{t=1}^{|C_i|}
\min\Big(
r_{i,t}(\theta)\cdot\hat{A}_{i,t},\;
\mathrm{clip}(r_{i,t}(\theta),1-\varepsilon,1+\varepsilon)\cdot\hat{A}_{i,t}
\Big)
-\beta\,D_{\mathrm{KL}}(\pi_{\theta}\|\pi_{\mathrm{ref}})
\Bigg]
\end{aligned}
\tag{3}
\]

| English | 中文 |
|---------|------|
| where \(L_{\mathrm{cot}}\) is the input prompt, \(C_i\) is a sampled code sequence, \(k\) is the number of samples per prompt, \(t\) is the token index, \(\theta\) is the current policy parameter, \(\theta_{\mathrm{old}}\) is the old policy parameter, \(\hat{A}_{i,t}\) is the advantage estimate, \(\varepsilon\) is the clipping threshold, \(\beta\) is the KL penalty weight, \(\pi_{\theta}\), \(\pi_{\theta_{\mathrm{old}}}\), and \(\pi_{\mathrm{ref}}\) are the current, old, and reference policies. | 其中 \(L_{\mathrm{cot}}\) 为输入提示，\(C_i\) 为采样代码序列，\(k\) 为每个提示的样本数，\(t\) 为 token 索引，\(\theta\)、\(\theta_{\mathrm{old}}\) 为当前/旧策略参数，\(\hat{A}_{i,t}\) 为优势估计，\(\varepsilon\) 为裁剪阈值，\(\beta\) 为 KL 惩罚权重，\(\pi_{\theta}\)、\(\pi_{\theta_{\mathrm{old}}}\)、\(\pi_{\mathrm{ref}}\) 分别为当前、旧与参考策略。 |
| This training strategy allows the model to continuously refine its code generation towards executable, semantically meaningful, and geometrically accurate CAD outputs. | 该训练策略使模型持续精炼代码生成，朝向可执行、语义有意义且几何准确的 CAD 输出。 |

---

## 4 Dataset Construction / 数据集构建

| English | 中文 |
|---------|------|
| We build our dataset based on the Text2CAD dataset, which contains 178K natural language descriptions \(L\) paired with ground-truth 3D geometries \(M_{gt}\). | 我们基于 Text2CAD 数据集构建数据：该集含 17.8 万条自然语言描述 \(L\) 与真值三维几何 \(M_{gt}\) 的配对。 |
| However, Text2CAD dataset lacks executable CadQuery code aligned with \(M_{gt}\), which poses a major obstacle for training models that generate script-based CAD representations. | 然而 Text2CAD 缺少与 \(M_{gt}\) 对齐的可执行 CadQuery 代码，这对训练生成基于脚本的 CAD 表示的模型构成主要障碍。 |
| To address this, we design a CadQuery data annotation pipeline, as shown in Fig. 4. | 为此，我们设计 CadQuery 数据标注流水线（见图 4）。 |
| For each sample, we take the CAD command sequence \(S\) provided by Text2CAD (which is structurally aligned with \(M_{gt}\)) and prompt a code-generation LLM (Deepseek-V3) to generate multiple candidate CadQuery scripts. | 对每个样本，取 Text2CAD 提供的 CAD 命令序列 \(S\)（与 \(M_{gt}\) 结构对齐），提示代码生成 LLM（DeepSeek-V3）生成多个候选 CadQuery 脚本。 |
| We attempt to execute each candidate using the CadQuery engine and discard failures. | 用 CadQuery 引擎尝试执行各候选，并丢弃失败者。 |
| The successfully executed models \(M_{\mathrm{cand}}\) are compared against \(M_{gt}\) using CD, and we select the candidate with the lowest CD as the final \(C_{gt}\). | 将成功执行的模型 \(M_{\mathrm{cand}}\) 用 CD 与 \(M_{gt}\) 比较，选 CD 最低者作为最终 \(C_{gt}\)。 |
| This process ensures geometric fidelity and code executability. In total, this pipeline produces 110K valid triplets \((L, C_{gt}, M_{gt})\). | 该过程保证几何保真与代码可执行性。流水线共产出 11 万条有效三元组 \((L, C_{gt}, M_{gt})\)。 |

### 质量划分 / Quality Splits

| English | 中文 |
|---------|------|
| We further divide them into three subsets based on geometric quality: | 我们按几何质量进一步分为三个子集： |
| • 8k high-quality samples with \(\mathrm{CD}_{gt}<1\times 10^{-4}\); | • 8k 高质量样本：\(\mathrm{CD}_{gt}<1\times 10^{-4}\)； |
| • 70k medium-quality samples with \(\mathrm{CD}_{gt}<1\times 10^{-3}\); | • 70k 中等质量样本：\(\mathrm{CD}_{gt}<1\times 10^{-3}\)； |
| • and the rest 32k low-quality samples with \(\mathrm{CD}_{gt}>1\times 10^{-3}\) are regarded as hard cases. | • 其余 32k 低质量样本（\(\mathrm{CD}_{gt}>1\times 10^{-3}\)）视为困难样本。 |

### CoT 样本构建 / CoT Sample Construction

| English | 中文 |
|---------|------|
| To bootstrap reinforcement learning and enhance structured reasoning, we further construct a set of CoT formatted samples on complex shapes. | 为启动强化学习并增强结构化推理，我们进一步在复杂形状上构建一组 CoT 格式样本。 |
| Specifically, we select the hard cases from the dataset, use their description \(L\) to prompt Deepseek-V3 for CoT-style CadQuery code. | 具体地，选取数据集中的困难样本，用其描述 \(L\) 提示 DeepSeek-V3 生成 CoT 风格 CadQuery 代码。 |
| We leverage the same filtering strategy as Fig. 4, retaining samples that are executable and exhibit high geometric accuracy based on CD. | 采用与图 4 相同的过滤策略，保留可执行且基于 CD 几何精度高的样本。 |
| Each valid candidate is further manually refined for correctness. The final CoT dataset contains 1.5K high-quality CoT samples. | 每个有效候选再经人工精修以保证正确性。最终 CoT 数据集含 1.5K 条高质量 CoT 样本。 |

> **图 4**：标注流水线总览——给定 Text2CAD 的命令序列与自然语言描述，用 DeepSeek-V3 合成多个 CadQuery 候选；执行后用倒角距离（CD）与真值三维模型比较；保留执行成功且 CD 最低的脚本，最终构建文本–CadQuery–三维模型三元组数据集。

---

## 5 Experiments / 实验

### Metrics / 评价指标

| English | 中文 |
|---------|------|
| For the Text-to-CAD task, we use metrics adapted from prior 3D generation works: | 对文本到 CAD 任务，我们采用改编自先前三维生成工作的指标： |
| (1) **Mean CD** measures the average geometric discrepancy between the generated and ground-truth models over sampled point clouds. | （1）**平均 CD**：度量生成与真值模型在采样点云上的平均几何差异。 |
| (2) **Median CD** captures the typical geometric error and is more robust to outliers. | （2）**中位 CD**：刻画典型几何误差，对异常值更稳健。 |
| (3) **Invalidity Ratio (IR)** denotes the proportion of generated CadQuery programs that fail to be executed to yield valid 3D geometry. | （3）**无效率（IR）**：生成的 CadQuery 程序中无法执行得到有效三维几何的比例。 |
| These metrics together reflect both the geometric fidelity and executable correctness of the generated results. | 这些指标共同反映生成结果的几何保真与可执行正确性。 |

### Implementation Details / 实现细节

| English | 中文 |
|---------|------|
| We use Qwen2.5-7B-Instruct as the base model for all experiments, given its strong instruction-following and code generation capabilities. | 所有实验以 Qwen2.5-7B-Instruct 为基座，因其指令遵循与代码生成能力强。 |
| For the stage of SFT, we fine-tuned Qwen2.5-7B-Instruct for 3 epochs with a batch size of 64 and a learning rate of \(1\times 10^{-5}\), using the AdamW optimizer. | SFT 阶段：用 AdamW，对 Qwen2.5-7B-Instruct 微调 3 个 epoch，batch size=64，学习率 \(1\times 10^{-5}\)。 |
| Training was performed using full-parameter fine-tuning with DeepSpeed ZeRO Stage 2. | 训练采用全参数微调与 DeepSpeed ZeRO Stage 2。 |
| For the GRPO phase, we initialized the model with SFT weights and trained for 1 epoch with a batch size of 384. | GRPO 阶段：以 SFT 权重初始化，训练 1 个 epoch，batch size=384。 |
| To enable cold-starting of reasoning during SFT, we additionally fine-tuned the model on the 1.5K high-quality CoT-format samples for 2 epochs. | 为在 SFT 中冷启动推理，另在 1.5K 高质量 CoT 格式样本上微调 2 个 epoch。 |
| Each input prompt generated \(k=8\) candidate completions. The KL divergence coefficient was set to \(\beta=0.001\). | 每个输入提示生成 \(k=8\) 个候选完成；KL 散度系数 \(\beta=0.001\)。 |
| All geometric computations, including model execution via CadQuery, point cloud sampling, normalization, and CD calculation, following the Text2CAD implementation to ensure consistency. | 所有几何计算（含经 CadQuery 的模型执行、点云采样、归一化与 CD 计算）遵循 Text2CAD 实现以保证一致性。 |
| We utilized the Hugging Face Transformers library, GRPO implementation from Verl, and DeepSpeed for distributed training. All experiments were conducted on 8 NVIDIA A800 80GB GPUs. | 使用 Hugging Face Transformers、Verl 的 GRPO 实现与 DeepSpeed 分布式训练；实验在 8 块 NVIDIA A800 80GB GPU 上进行。 |

| English | 中文 |
|---------|------|
| For SFT, we use the 8K high-quality samples. For cold-starting, we use the 1.5K CoT-format samples. For GRPO, we use all 150K training descriptions and geometries from Text2CAD. | SFT 用 8K 高质量样本；冷启动用 1.5K CoT 样本；GRPO 用 Text2CAD 全部 15 万训练描述与几何。 |
| For evaluation, we apply the same synthesis pipeline on the official Text2CAD test set to obtain corresponding triplets. | 评估时，在官方 Text2CAD 测试集上应用相同合成流水线得到对应三元组。 |

### Baselines / 基线方法

| English | 中文 |
|---------|------|
| We compare our full method (SFT+CoT+GRPO) against several baseline methods for text-to-CAD generation. | 我们将完整方法（SFT+CoT+GRPO）与若干文本到 CAD 基线比较。 |
| Text2CAD directly generates CAD models from natural language descriptions. | Text2CAD 直接从自然语言描述生成 CAD 模型。 |
| We also evaluate several LLMs by prompting them directly with natural language descriptions to generate CadQuery code, without any fine-tuning. | 我们还直接用自然语言描述提示若干 LLM 生成 CadQuery 代码（无微调）进行评估。 |
| The baseline LLMs include open-source models Qwen2.5-72B, Qwen2.5-7B, DeepSeek-V3, as well as the proprietary models Claude-3.7-sonnet, GPT-4o. | 基线 LLM 包括开源模型 Qwen2.5-72B、Qwen2.5-7B、DeepSeek-V3，以及闭源模型 Claude-3.7-sonnet、GPT-4o。 |

### 5.1 Main Results / 主要结果

**表 1：测试集定量比较。CD 指标为 \(\times 10^3\)。IR.% 为代码无效率。CD 与 IR.% 越低越好。**

| Method | Mean CD ↓ | Median CD ↓ | IR.% ↓ |
|--------|-----------|-------------|--------|
| Claude-3.7-sonnet | 186.53 | 134.16 | 47.03 |
| GPT-4o | 133.52 | 45.91 | 93.00 |
| Deepseek-V3 | 186.69 | 107.57 | 51.96 |
| Qwen2.5-72B | 209.41 | 153.81 | 82.64 |
| Qwen2.5-7B | 202.35 | 169.86 | 98.83 |
| Text2CAD [13] | 29.29 | 0.37 | 3.75 |
| **CAD-Coder (Ours)** | **6.54** | **0.17** | **1.45** |

| English | 中文 |
|---------|------|
| Table 1 summarizes the quantitative performance on the test set. Our full method achieves the best results across all metrics, significantly outperforming prior works in terms of geometric accuracy. | 表 1 汇总测试集定量表现。完整方法在所有指标上最优，几何精度显著优于先前工作。 |
| Specifically, it reduces the Mean CD to 6.54 and the Median CD to 0.17, both by large margins compared to the strong baseline Text2CAD, surpassing all existing LLMs. | 具体地，平均 CD 降至 6.54、中位 CD 降至 0.17，相对强基线 Text2CAD 大幅领先，并超越所有现有 LLM。 |
| Fig. 3 exhibits the qualitative results. We can observe that LLMs frequently fail to generate valid code. Our method can better align with the target shape. | 图 3 展示定性结果：可见 LLM 常无法生成有效代码；本方法能更好对齐目标形状。 |
| These results highlight the effectiveness of our geometry-aware optimization and CoT-enhanced reasoning in generating precise and structurally valid 3D CAD models. | 这些结果凸显几何感知优化与 CoT 增强推理在生成精确、结构有效三维 CAD 模型上的有效性。 |
| Our method also maintains a lower code invalidity ratio, demonstrating that reinforcement-driven learning does not compromise executability. | 本方法亦保持更低代码无效率，表明强化驱动学习并未牺牲可执行性。 |

### 5.2 Ablation Study / 消融实验

**表 2：基于 Qwen2.5-7B-Instruct 的测试集消融。CD 为 \(\times 10^3\)。**

| Training Strategy | Mean CD↓ | Med CD↓ | IR %↓ |
|-------------------|----------|---------|-------|
| SFT | 74.55 | 0.33 | 5.33 |
| Ours w/o SFT | 76.20 | 0.95 | 5.33 |
| Ours w/o CoT | 17.34 | 0.20 | 4.95 |
| **Ours (Full)** | **6.54** | **0.17** | **1.45** |

**表 3：消融——SFT 训练数据质量的影响。**

| Dataset | Mean CD↓ | Med CD↓ | IR %↓ |
|---------|----------|---------|-------|
| Ours w/ 70K | 9.89 | 0.18 | 3.21 |
| **Ours w/ 8K** | **6.54** | **0.17** | **1.45** |

| English | 中文 |
|---------|------|
| Table 2 isolates the effect of each component in the training pipeline. Starting from a model trained solely with SFT, we observe limited geometric fidelity (Mean CD 74.55, Median CD 0.33). | 表 2 分离训练流水线各组件效果。仅 SFT 训练的模型几何保真有限（平均 CD 74.55，中位 CD 0.33）。 |
| This baseline demonstrates that SFT alone cannot adequately capture spatial reasoning for complex CAD structures. | 该基线表明：仅靠 SFT 不足以充分捕捉复杂 CAD 结构的空间推理。 |
| However, the model also performs poorly (Mean CD 76.20) without SFT, showing the necessity of using prior knowledge. | 而无 SFT 时模型同样较差（平均 CD 76.20），说明先验知识的必要性。 |
| Even without CoT, the GRPO alone dramatically boosts performance (Mean CD 17.34, Median CD 0.20), confirming that CAD-Specific reward supervision is essential for improving 3D accuracy. | 即便无 CoT，仅 GRPO 也大幅提升性能（平均 CD 17.34，中位 CD 0.20），证实 CAD 专用奖励监督对提升三维精度至关重要。 |
| Our full method, adding CoT prompting for cold-starting, further improves results (Mean CD 6.54, Median CD 0.17), indicating that structured multi-step reasoning enhances the model's ability to handle complex geometric prompts. | 完整方法加入 CoT 提示做冷启动后进一步提升（平均 CD 6.54，中位 CD 0.17），表明结构化多步推理增强模型处理复杂几何提示的能力。 |

| English | 中文 |
|---------|------|
| In Table 3, we explore how different SFT training data affect final model performance. | 表 3 探究不同 SFT 训练数据对最终性能的影响。 |
| Training with the full 70K medium-quality dataset during SFT leads to substantial improvement over existing methods (Mean CD 9.89). | SFT 阶段用全部 70K 中等质量数据相对现有方法已有大幅改进（平均 CD 9.89）。 |
| However, training with a smaller but high-quality 8K dataset yields the best result (Mean CD 6.54, Median CD 0.17), outperforming the larger dataset. | 但用更小却高质量的 8K 数据取得最佳结果（平均 CD 6.54，中位 CD 0.17），优于更大数据集。 |
| These results reveal a key insight: **quality outweighs quantity**. High-precision data offers better foundation for CAD-Specific RL, considering that small inconsistencies in code can lead to significant errors in CAD geometry. | 结果揭示关键洞见：**质量重于数量**。高精度数据为 CAD 专用 RL 提供更好基础——因代码中的微小不一致可导致 CAD 几何上的显著误差。 |

> **图 5**：(a) 不同训练策略下生成 CAD 的 CD 分布；(b) 三个 CD 区间的可视化。灰色为真值，棕色为生成。第一行 CD \(>1\times 10^{-1}\)（差异大）；第二行 \(1\times 10^{-4}<\mathrm{CD}\le 10^{-1}\)；第三行 CD \(\le 1\times 10^{-4}\)（几乎一致）。更有效的策略使分布偏向更小 CD、更少无效结果。

---

## 6 Conclusion / 结论

| English | 中文 |
|---------|------|
| In this paper, we have presented a novel approach to text-to-CAD generation by leveraging CadQuery as an intermediate representation. | 本文提出以 CadQuery 为中间表示的新颖文本到 CAD 生成方法。 |
| By combining the strengths of Python-based code generation and the inherent interpretability of CadQuery, our method overcomes key challenges associated with traditional command sequence-based approaches, including model validity and limited operation sets. | 通过结合基于 Python 的代码生成优势与 CadQuery 固有可解释性，本方法克服传统命令序列方法的关键挑战，包括模型有效性与有限操作集。 |
| We propose a two-stage training strategy combining supervised fine-tuning (SFT) with reinforcement learning (RL). | 我们提出结合监督微调（SFT）与强化学习（RL）的两阶段训练策略。 |
| The integration of Group Reward Policy Optimization (GRPO) and a CAD-Specific reward function ensures that the generated CAD models are both syntactically correct and geometrically plausible, while the Chain-of-Thought (CoT) process allows for improved reasoning and planning. | GRPO 与 CAD 专用奖励函数的结合保证生成 CAD 既语法正确又几何合理；思维链（CoT）过程则提升推理与规划。 |
| Our large-scale, geometrically verified dataset facilitates further research in this domain, and the experimental results show that our method significantly advances the capabilities of LLMs in generating complex CAD models from natural language descriptions. | 大规模、经几何验证的数据集促进该领域进一步研究；实验表明本方法显著提升 LLM 从自然语言描述生成复杂 CAD 模型的能力。 |
| This work opens the door to more accessible, efficient, and flexible CAD generation, making it easier for both novice and experienced users to create high-quality 3D models based on textual input. | 本工作为更易用、高效、灵活的 CAD 生成打开大门，使新手与资深用户都能更轻松地基于文本输入创建高质量三维模型。 |

---

## 补充材料要点 / Supplementary Highlights

### A. 额外实现细节 / Additional Implementation Details

| English | 中文 |
|---------|------|
| All experiments were executed on a cluster equipped with 8 NVIDIA A800 (80GB) GPUs. | 所有实验在配备 8 块 NVIDIA A800（80GB）GPU 的集群上执行。 |
| The SFT stage was trained for 7 hours, while the GRPO stage required 146 hours. | SFT 训练约 7 小时，GRPO 约 146 小时。 |
| For efficient model inference, we employed vLLM, and used CadQuery (version 2.3.1) for CAD script execution and validation. | 高效推理使用 vLLM；CAD 脚本执行与验证使用 CadQuery 2.3.1。 |
| CAD-Translator and CAD-LLaMA address similar tasks, but their implementations are not open-sourced and normalization details remain unclear, making direct CD comparison infeasible (values differ by an order of magnitude vs. Text2CAD). | CAD-Translator 与 CAD-LLaMA 任务相近，但未开源且归一化细节不明，导致无法直接比较 CD（相对 Text2CAD 量级相差约一个数量级）。 |

### B. 扩展消融：仅用 CD 作为奖励 / Extended Ablation: CD-only Reward

| English | 中文 |
|---------|------|
| Using only Chamfer Distance as reward during GRPO leads to training failure: after ~200 steps the model begins generating invalid CadQuery code. | GRPO 阶段仅用倒角距离作奖励会导致训练失败：约 200 步后模型开始生成无效 CadQuery 代码。 |
| Once invalid syntax occurs, CD cannot be computed and RL halts prematurely. | 一旦出现无效语法，无法计算 CD，强化学习提前中止。 |
| These results highlight the critical role of robust code supervision and reward shaping beyond pure geometry-based metrics. | 结果凸显：除纯几何度量外，稳健的代码监督与奖励塑形至关重要。 |

### C. CoT 推理六阶段 / Six CoT Reasoning Stages

模型在 `<think>` 中模拟工程师将文本转为 CAD 的思考，步骤为：

1. **Description Analysis（描述分析）**：拆分部件与关键参数，理解空间关系与装配顺序。  
2. **Coordinate System Planning（坐标系规划）**：确定各部件坐标系、欧拉角与平移，理解局部到全局变换。  
3. **Sketch Construction Strategy（草图构建策略）**：分析二维草图创建与缩放，规划到三维的变换。  
4. **Extrusion Operation Planning（拉伸操作规划）**：确定拉伸方向/距离，新建或合并实体，校验尺寸。  
5. **Code Implementation Strategy（代码实现策略）**：规划 CadQuery 操作顺序与函数组织。  
6. **When scaling in CadQuery（CadQuery 中的缩放）**：直接缩放尺寸，定义缩放因子并作用于坐标与尺寸；不要使用不存在的 Workplane `.scale()` 方法。

要求：每步思考草稿最多约 50 词；最终代码放在 \`\`\`python\`\`\` 中，最终模型用变量 `r` 表示。

### D–E. 定性比较与 CAD 编辑 / Qualitative Comparisons & CAD Editing

| English | 中文 |
|---------|------|
| Although not explicitly trained on CAD editing data, the model shows promising capabilities on simple editing tasks (resize, remove component, adjust translation/rotation) from natural language instructions. | 虽未在 CAD 编辑数据上显式训练，模型仍能对简单编辑任务（改尺寸、移除部件、调整平移/旋转）表现出有前景的能力。 |
| This suggests structural understanding of CadQuery and generalization beyond generation-from-scratch. | 这表明模型对 CadQuery 具有结构理解，并能泛化到“从零生成”之外的任务。 |

### F. 失败案例 / Failure Cases

| English | 中文 |
|---------|------|
| (a) Complex multi-component structures may suffer inaccurate spatial alignment (dislocations/offsets). | （a）多部件复杂结构可能出现空间对齐不准（错位/偏移）。 |
| (b) The model may misclassify extrusion vs. cutting operations. | （b）模型可能误判拉伸与切割等操作。 |
| (c) Very thin structures or internal cavities: sparse point sampling may induce reward hacking; overlapping features and tight tolerances remain challenging. | （c）极薄结构或内部空腔：稀疏点采样可能诱发奖励黑客；重叠特征与紧公差仍具挑战。 |

---

## 术语对照表 / Glossary

| English | 中文 | 缩写/备注 |
|---------|------|-----------|
| Computer-Aided Design | 计算机辅助设计 | CAD |
| Large Language Model | 大语言模型 | LLM |
| Multimodal Large Language Model | 多模态大语言模型 | MLLM |
| CadQuery | CadQuery（Python 参数化 CAD 库） | — |
| Supervised Fine-Tuning | 监督微调 | SFT |
| Reinforcement Learning | 强化学习 | RL |
| Group Reward Policy Optimization | 组相对策略优化 | GRPO |
| Chain-of-Thought | 思维链 | CoT |
| Chamfer Distance | 倒角距离 / 倒角距离度量 | CD |
| Invalidity Ratio | 无效率 | IR |
| Boundary Representation | 边界表示 | B-rep |
| Proximal Policy Optimization | 近端策略优化 | PPO |
| Reinforcement Learning from Human Feedback | 基于人类反馈的强化学习 | RLHF |
| OpenCascade | OpenCascade 几何内核 | — |
| Geometric Reward | 几何奖励 | \(R^{\mathrm{geo}}\) |
| Format Reward | 格式奖励 | \(R^{\mathrm{fmt}}\) |
| Cold-start | 冷启动 | 用 CoT 样本预热推理 |
| Sketch-Extrude | 草图–拉伸 | DeepCAD 等常用表示 |
| Point Cloud | 点云 | — |
| Workplane | 工作平面 | CadQuery API |

---

## 方法一句话总结 / One-Line Summary

**CAD-Coder** 将「自然语言 → CAD」转化为「自然语言 → CadQuery Python 代码」，先用高质量成对数据做 SFT，再用 CoT 冷启动 + 以倒角距离（几何）与格式检查（结构）组成的 CAD 专用奖励做 GRPO，从而在可执行性与几何保真上显著优于 Text2CAD 与直接提示的通用 LLM。

---

*对照翻译依据：arXiv:2505.19713v3（2025-10-21）。公式编号与原文一致；图示内容以文字说明概括。*
