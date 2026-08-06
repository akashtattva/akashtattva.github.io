---
title: "Continual Harness - Notes"
pubDate: 2026-08-06
---

# What This Paper Is About

This paper is about giving AI agents the ability to improve themselves while they work, without ever being stopped and restarted. The authors study agents that play Pokémon video games, and they build a system called Continual Harness. This system lets an AI agent gradually build up its own set of tools, instructions, helper sub-agents, and memories as it plays. Over time the agent gets better and better at the game, and all of this improvement happens inside a single continuous play session. The same idea is then extended to actually training an open-source AI model using data collected from its own improving play, which closes the loop completely: the agent improves its harness, and its own behavior is then used to train it further.

![Figure 1: Continual Harness overview](/assets/img/ch_fig1_overview.webp)

*Figure 1 shows the three ways harness refinement happens: with a human in the loop, by the model refining its own harness, and by jointly training the model and the harness together. It captures the whole arc of the paper in one diagram.*

# The Background Problem

The paper starts with an observation about how AI coding assistants work. Tools like Claude Code and OpenHands wrap a large language model with extra scaffolding: they give the model access to tools like running commands, a memory to carry state across long interactions, and planning structures. This scaffolding is called an agentic harness. This kind of harness has become standard for coding agents, and it works very well for writing software.

But no equivalent exists for embodied agents. An embodied agent is one that perceives a real or simulated world through images and acts on it through discrete actions, like moving around and pressing buttons. Playing a video game is a classic example. The PokeAgent Challenge, an earlier benchmark, showed that if you give frontier vision-language models just the raw screen and buttons with no extra help, they make almost no progress on role-playing games. The models simply cannot figure out long-term goals, navigation, and battle strategy from pixels alone.

So the central problem the paper tackles is this: coding agents have harnesses that make them effective, but game-playing or embodied agents do not. Building a good harness for a game requires a lot of hand-crafted domain knowledge, which is expensive and does not transfer to new games or new tasks. The authors want to remove that hand-crafting and let the agent build its own harness automatically.

# The Setup and the Minimal Environment Interface

The authors work with three classic Pokémon games: Pokémon Red, Pokémon Crystal, and Pokémon Emerald. These are long, turn-based role-playing games. They require navigating large overworld maps, talking to non-player characters, fighting turn-based battles, managing an inventory and a party of creatures, and completing gated objectives like winning badges and progressing the plot. Each game run is extremely long, stretching over many hours of gameplay and thousands or even hundreds of thousands of button presses.

The agent is given a deliberately minimal interface. At every step it receives two things. First, a rendered image of the current game screen, upscaled for the vision-language model. Second, a text map, which is an ASCII drawing of the visible tiles around the player. This text map shows walkable tiles, walls, interactable objects, non-player characters, ledges, and the player's own position and direction. The text map exists because vision-language models are known to be bad at fine-grained spatial reasoning over pixel grids; converting the nearby world into text compensates for that weakness.

Crucially, the text map contains no walkthrough, no list of objectives, and no pathfinding hints. It only describes what is currently visible plus a small margin just off screen. The agent chooses actions from a fixed set of eight buttons: up, down, left, right, A, B, start, and select. Every action advances the emulator by a fixed number of frames so that animations and text can resolve before the next decision. The environment is partially observable, meaning the agent cannot access internal game state like what a non-player character intends or the exact mechanics of a battle beyond what the screen and map reveal.

The main cost metric in the paper is the cumulative number of button presses needed to reach milestones. A milestone is a canonical event in the game, like defeating a gym leader or obtaining an item. The paper counts button presses rather than tool calls because a single tool call that presses several buttons at once is counted as several presses. This rewards compression in the action channel and makes a minimal agent that presses one button per step directly comparable to a sophisticated harness that batches many button presses into one call.

# What an Agentic Harness Is

An agentic harness is the scaffolding layer that sits between the foundation model and the environment. Following an earlier decomposition, the paper describes a harness as having four components.

The first component is the system prompt. This is the text of instructions and strategic guidance given to the model at each reasoning step. It tells the model what its goal is and how it should behave. The second component is sub-agents. These are specialized modules that can be invoked for specific tasks, like battle strategy, puzzle solving, or self-reflection. The main agent can hand off a focused problem to a sub-agent rather than doing everything itself. The third component is skills. These are reusable routines available to the model. Some skills are text-level behaviors, like heuristics that the model cites in its reasoning, and some are executable programs, like a pathfinding algorithm or a wrapper that presses a sequence of buttons. A few skills ship with the harness, and new ones can be created during play. The fourth component is memory. This is a persistent knowledge store that accumulates facts, strategies, and observations across the agent's entire trajectory, so the agent can remember what it learned earlier in the run.

The harness also exposes a fixed set of meta-tools through which the model edits these four components in place. The main meta-tools are define_agent, which creates a new sub-agent, run_code, which runs and repairs executable code, and process_memory, which reads from and writes to the memory store. There are similar primitives for the other components.

The paper defines several reference harnesses. A minimalist harness provides only the environment interface with a generic system prompt and no sub-agents, memory, or authored skills. A hand-engineered expert harness populates all four components through careful manual engineering, including things like A star pathfinding, a type chart, a damage calculator, and curated objectives. A meta-harness gives the model the meta-tools so it can construct its own sub-agents, skills, and memory entries during play. Continual Harness starts from the minimal harness and adds an automated refiner that rewrites all four components in place based on the trajectory so far.

# The Gemini Plays Pokémon Project

The paper reports on a real-world project called Gemini Plays Pokémon, or GPP. In this project, human researchers ran Gemini models live through several complete Pokémon games. A human sat in the loop and read the model's trajectory, then rewrote the harness between runs to fix problems. This human-in-the-loop refinement turned a bare screenshot-and-buttons interface into a full multi-agent system over time.

The results are significant. The GPP system beat Pokémon Blue in May 2025, defeated the Elite Four in Pokémon Yellow Legacy on hard mode in August 2025, and completed Pokémon Crystal in November 2025. This made GPP the first AI system to complete multiple Pokémon role-playing games.

In the later phases of the project, the human authors were largely removed. The model was handed the meta-tools, define_agent, run_code, notepad edits, and custom tool creation, and was told to construct its own sub-agents and reusable scripts during play. The model then built its own pathfinders, battle strategists, and reusable scripts without being asked to. In the hardest stages of Yellow Legacy and Crystal, the model began iterating on its own strategy through long-context memory on its own. This emergent behavior is exactly the seed of what the paper formalizes and automates as Continual Harness.

The paper documents some striking emergent behaviors. The model wrapped an autopress_buttons sandbox loophole into a general press_sequence primitive, turning a hack into a reusable tool. It developed named multi-stage battle strategies, including one called Operation Zombie Phoenix used on Crystal's final Red fight. It even authored an explicit truth-table representation of a switch puzzle in the game's Goldenrod Underground in its notepad, which is a remarkably structured way of encoding a logical puzzle.

The paper also shows quantitative evidence of harness growth during these runs. It counted create, update, and delete operations on skills and sub-agents across the Yellow Legacy run. The harness was updated throughout the run rather than converging to a fixed scaffold, and the updates concentrated on a small subset of navigation and battle components. It tracked the battle strategist sub-agent's prompt across successive revisions during the Elite Four phase, showing that the prompt cycled between growth and simplification, and at one point underwent a structural rewrite in which per-decision logic was absorbed into a master battle agent that dispatches to named sub-checks.

![Figure 3: Yellow Legacy harness refinement is concentrated and recurrent](/assets/img/ch_fig3_harness_refinement.webp)

*Figure 3 shows how the harness was edited throughout the run rather than settling into a fixed scaffold, with a small set of navigation and battle components absorbing most of the update activity.*

# The Failure Modes That Motivated Automation

The GPP project also exposed recurring failure modes that a human refiner had to repair between runs. These are the exact failure types that Continual Harness targets. One failure mode was assumptions made without verification. A notable example is the Goldenrod puzzle, which stalled for days because the agent skipped a post-battle conversation with a non-player character that contained the missing hint. Another failure mode was brittle tool calls with missing parameters. A third was limited parallel goal pursuit, where the agent could not juggle multiple objectives at once.

The paper includes a detailed case study of the Power Plant route loop from the Yellow Legacy run. The agent wanted to travel to the Power Plant and decided to use the Fly ability through the menu. After overshooting in the menu repeatedly, it used its tool-generation capability to write a new tool called fly_menu_navigator and deleted an existing tool to make room for it. The problem was that the generated tool call did not match the execution schema. To execute a tool with the autopress flag enabled, the agent's JSON output needed the buttons array explicitly set to the value tool. Instead the agent reasoned that it needed to scroll down the list of cities, so it filled the array with the down button. The system simply pressed down on the emulator and returned control. The agent failed to detect the schema mismatch and recorded in its internal reasoning that the custom tool was working and returning down as the optimal path. It repeated this exact payload 842 times over a span of about three and a half hours, roughly a thousand turns, while its internal thoughts showed it actively evaluating its progress against a static environment. The loop only ended when the agent had scrolled through every city in the menu and realized the Power Plant was not a valid Fly destination at all, at which point it backed out and walked north instead.

The paper draws three lessons from this incident. First, context horizon limits: the agent's tool generation mostly happened within the first fifty to two hundred turns of encountering a bottleneck, and beyond five hundred turns in a stall it stopped creating tools and reverted to repeated execution. Second, schema fragility: even when the agent enforced new rules through persistent memory, it remained vulnerable to schema mismatch and executed actions that did not match its intended tool design. Third, feedback blindness: the assumption that the new tool was working caused the agent to ignore standard environmental feedback and anomaly detection for a long time. These are the kinds of deep-episode failures that a reset-free system is specifically designed to catch and repair.

# The Main Idea of Continual Harness

Continual Harness is a reset-free framework that automates the manual harness refinement that humans did in GPP. Reset-free means the agent never restarts the game from the beginning to apply what it has learned. Instead, improvement happens online, in the middle of a single continuous episode, while the agent is still playing.

From the minimal environment interface described earlier, the agent alternates between two kinds of activity. In the acting phase, it observes the world and chooses button presses. In the refining phase, it reads the recent trajectory, looks for failures, and edits its own system prompt, sub-agents, skills, and memory using the meta-tools. Every F steps, a refiner reads the recent trajectory window, identifies failure signatures, and runs four passes over the harness, one per component, applying create, read, update, and delete operations. The system prompt is replaced with a rewritten version, and the sub-agents, skills, and memory receive CRUD-style operations. The updated harness enters the agent's context on the next step, so the improvement takes effect immediately.

The refiner and the agent use the same model and the same meta-tool API. They differ only in when they are invoked and what trajectory context they look at. In the GPP runs, the refiner role was performed manually by humans watching the livestream; Continual Harness automates it completely.

This is contrasted with prompt-optimization methods like GEPA. Those methods run complete episodes and then reset the environment between updates, rewriting only the system prompt. Continual Harness generalizes this by rewriting the full harness state from the partial trajectory so far, without ever resetting.

# Why Refinement Accumulates Without Resets

There are several deep reasons why the reset-free design is powerful. First, refinement information accumulates monotonically over the episode. Failure signatures observed earlier in the trajectory remain available to all subsequent refinement passes. So refinement quality compounds with episode length. Reset-based methods destroy this accumulation every time they restart.

Second, reset-free refinement can target failure modes that only appear deep in an episode. Late-game battles, multi-step puzzles, and dialogue chains only show up after hours of play. Reset-based approaches cannot reach these by construction, because every iteration resets to the initial state and never gets deep into the game.

Third, reset-free is the practically dominant regime for real long-running systems. Coding agents, embodied agents, and operations tasks often run for long periods where free environment resets are costly or simply unavailable. A system that can improve without restarting is more realistic.

The paper also argues that the failure record and the repair sit inside the same trajectory in reset-free operation. When a skill fails, the refiner diagnoses the failure and repairs the skill before it is used again, all within the same episode. In reset-based approaches, the failure happens in one episode and the repair can only take effect in the next one, after a restart. This closes the improvement loop much faster.

# The Two-Loop Architecture

The paper describes the system in terms of two nested loops. The inner loop is the standard agent step. The model, wrapped by the current harness, produces an action from the current observation and the trajectory so far. This is just normal gameplay. The outer loop is harness refinement. Every F steps after a warm-up period of W steps, the refiner reads the recent trajectory window, looks for failure signatures, and emits per-component edits. The harness is updated and the agent continues playing with the new harness in its context.

The failure signatures the refiner looks for include navigation loops, where the agent keeps walking in circles, tool-call failures, stalled objectives, and missed exploration opportunities. Then it runs the four passes. In the first pass it rewrites the prompt conditioned on the identified failures and the trajectory window. In the second pass it works on sub-agents: it creates new sub-agent entries for repeated multi-step patterns, edits existing entries to address detected failures, and deletes entries that have not been invoked productively. In the third pass it works on skills: it codifies skills from successful sequences and repairs executable code that raised exceptions. In the fourth pass it works on memory: it adds memory entries to fill gaps, updates stale entries, and demotes the importance of areas the agent has moved past.

This full-state refinement matters because all four components work together. For example, a navigation problem might be best fixed by creating a pathfinding skill, or by adding a memory note, or by rewriting the prompt to mention the goal. The refiner can use whichever mechanism is most appropriate, and it updates the whole harness rather than just one piece.

![Figure 2: Methodology overview of the two-loop architecture](/assets/img/ch_fig2_methodology.webp)

*Figure 2 lays out the core mechanism: the agent acts inside the environment while a refiner periodically reads the recent trajectory and edits the harness in place, and the same loop extends to training the model's weights across iterations.*

# The Continual Model-Harness Co-Learning Loop

The paper then closes the loop with the model itself. The harness refinement described so far improves the harness state, but the model weights stay frozen. The co-learning loop extends the idea to actually training an open-source model.

The setup is this. An open-source model, from the Gemma-4 family, first goes through two warm-up stages. The first is supervised fine-tuning on trajectories produced by frontier Continual Harness gameplay. The second is an offline GRPO stage using a per-step process reward. The paper shows that neither warm-up stage produces meaningful milestone advancement on its own; the real gains begin only at the online co-learning stage.

Each training iteration is a DAgger-style rollout of 256 steps through the full Continual Harness. This means the model plays while memory, skills, sub-agents, and prompt are all evolving via the refinement loop. Then a process reward model scores each transition over a sliding window. The process reward is a weighted combination of trajectory progress, action correctness, reasoning quality, and format compliance. Low-reward windows are then relabeled by a frontier teacher model, specifically Gemini 3.1 Pro, which rewrites them with better behavior. Finally a soft supervised fine-tuning update on the relabeled shard produces the next iteration's model weights.

The key design property is that this loop is reset-free too. The saved emulator state at the end of iteration k is loaded as the start of iteration k plus one. So the model's in-game position accumulates across training iterations rather than restarting at the beginning of the game every time. Each curve in the results is therefore a single agent's in-game trajectory traversed across its own training, not an aggregate over independent rollouts.

The two loops operate on the same trajectory data and reinforce each other. The model's actions produce the trajectory. The refiner reads the trajectory and updates the harness. The harness shapes the next observation distribution and the next set of trajectories. At the same time, the relabeled trajectories update the model weights. So both the model and the harness evolve together, which is why the authors call it continual model-harness co-learning. The trajectory distribution the model learns from co-adapts with its own policy.

# The Experimental Setup

The experiments use two games, Pokémon Red and Pokémon Emerald. These are in the same genre but differ in map layout, mechanics, and difficulty. The evaluation uses the standardized milestone system from the PokeAgent Challenge, and the primary metric is cumulative button presses to milestone.

There are several harness conditions compared. Hmin is the minimalist baseline with frames, local text map, buttons, and a generic system prompt but no sub-agents, memory, or skills. Hexpert is the hand-designed expert harness with built sub-agents, A star pathfinding, a type chart, a damage calculator, and curated objectives. Continual Harness has three variants. From-scratch starts from Hmin and refines during gameplay. Bootstrap frozen loads a successful from-scratch run's harness but disables further refinement. Bootstrap updating loads the same harness but keeps refinement on.

The models used include the Gemini 3 variants Pro, Flash, and Flash-Lite for the harness experiments, and Gemma-4 variants at several sizes for the open-source training experiments. At least three seeds are used across all experiments, and results are reported as seed medians.

# The Main Results on Red and Emerald

The headline result is that Continual Harness substantially reduces the button-press cost of every monitored milestone compared to the minimalist baseline, and it recovers a majority of the gap to the hand-engineered expert harness. This happens without access to the game decompilation, without the milestone schedule, and without any of the hand-built sub-agents that constitute the expert harness. The residual gap to the expert harness concentrates in dialogue-heavy gym interiors and multi-turn battle strategy, which are the components Continual Harness does not yet synthesize reliably.

An interesting finding is that the bootstrap-updating variant is more efficient than from-scratch at every milestone on Red. This indicates that refinement signal compounds within the episode: a harness refined in a prior run accelerates the next run even when the game state itself resets. The transferable unit is the harness across runs, not a single episode.

![Figure 5: Milestones reached versus cumulative button presses](/assets/img/ch_fig5_milestones.webp)

*Figure 5 shows the main quantitative result: Continual Harness reaches each milestone with far fewer button presses than the minimalist baseline and closes most of the gap to the hand-engineered expert harness.*

# Results Depend on Model Capability

The paper analyzes the cost-versus-completion tradeoff on a Pareto plane. On the powerful Pro model, Continual Harness is strictly Pareto-dominant over the minimalist baseline. From-scratch Continual Harness reaches one hundred percent of milestones at a median cost of about one hundred and thirty dollars, versus the baseline at ninety-eight percent for about two hundred and fifteen dollars. That is roughly a forty percent cost reduction with no completion loss. The two bootstrap variants on Pro reach ninety-six to one hundred percent of milestones at a hundred and ten to a hundred and forty dollars.

On the mid-range Flash model, the harness benefit is high variance. Bootstrap-updating reaches eighty percent at about forty-two dollars, marginally above the baseline at seventy-seven percent for thirty dollars, while the other variants have higher variance.

On the small Flash-Lite model, the picture flips completely. Flash-Lite with the minimalist baseline reaches twenty percent at eleven dollars. Every Continual Harness variant on Flash-Lite falls to three to thirteen percent at comparable or higher cost. This means there is a capability floor below which the refinement loop cannot bootstrap. The harness gains require a model that is capable enough to actually use the harness components properly. A weak model does not benefit from the added complexity; it is worse off because it cannot handle the extra structure.

![Figure 6: Cost-completion Pareto plane on Emerald](/assets/img/ch_fig6_pareto_fig7_training.webp)

*Figure 6 shows cost versus completion across models and harness conditions. On the strong Pro model Continual Harness strictly dominates the baseline, while on the weak Flash-Lite model it falls below it, making the capability floor visible.*

# Skills Measurably Improve Toward an Oracle

To show that skills genuinely improve and not just that the end task gets easier, the paper measures the navigation skills directly. It scores refined navigation skills by their path cost relative to a Dijkstra oracle, which computes the mathematically optimal path on the known map. This gives a direct measure of skill self-improvement that is independent of end-task efficiency.

The minimalist baseline never invokes a navigation skill at all. Every Continual Harness condition accumulates hundreds of navigation skill invocations over a twenty-four-hour run. On from-scratch runs, the path-cost deficit falls from a near half-cost penalty at the start to single digits early on and stays there. This improvement is in-loop and reset-free: failures from earlier invocations are diagnosed by the refiner and the affected skills are repaired before later invocations within the same episode.

Bootstrap-updating inherits a refined skill set and matches or outperforms bootstrap-frozen throughout. This shows that continued refinement still adds value on top of an inherited set, while bootstrap-frozen's flat trajectory bounds what pure inheritance can achieve without further refinement.

The refined library is heavily biased toward BFS and A star wrappers, because saved button presses on navigation translate directly into faster milestones, which is the strongest local signal the refinement loop sees. Most of the gap between the minimal baseline and Continual Harness is absorbed by the skill library alone.

![Figure 8: Pathfinding skill mechanism](/assets/img/ch_fig8_pathfinding.webp)

*Figure 8 shows navigation skills measurably improving toward a Dijkstra optimal-path oracle: the path-cost deficit drops from a near half-cost penalty to single digits early in the run and stays there.*

# The Create-and-Forget Funnel

The paper analyzes what happens to all the skills the agent creates, and the picture is surprisingly wasteful, in a useful way. A create-and-forget funnel emerges. Most authored skills are never invoked at all. Of the ones invoked, a small working set absorbs the bulk of calls. And of those, even fewer ever succeed. But the refinement loop treats this as acceptable and even desirable. It repairs the skills the agent actually depends on, tolerates regressions on unused ones, and accepts a long create-and-forget tail.

The key point is that repairs happen dramatically on the skills the agent relies on, and the repair happens in the same episode where the failure occurred. This is the argument for reset-free operation over reset-based baselines: the failure record and the repair sit inside the same trajectory, so the loop closes within a run rather than across resets.

![Figure 16: The create-and-forget funnel](/assets/img/ch_fig16_create_forget_funnel.webp)

*Figure 16 shows that most authored skills are never used, while a small working set absorbs nearly all invocations; the refinement loop concentrates its repairs on exactly those skills.*

# Sub-Agent Handoffs and Memory Reuse

The paper also studies how sub-agents and memory are actually used. Sub-agent handoffs serve two roles. They keep per-step cost low by giving the sub-agent a narrow specialized context, and they let the orchestrator resume its prior objective after the sub-agent returns. The sub-agent token curve sits about an order of magnitude below the orchestrator curve throughout the run, which is the per-step saving the harness buys by partitioning context. Clean-return and on-task-recovery rates are high for navigation, dialogue, and menu tasks. The paper concludes that the harness rather than the raw model carries most of the long-horizon performance: once the orchestrator can delegate to cheap specialized contexts and trust the return, long tasks become tractable with far fewer tokens than the raw context would imply.

Memory reuse is more modest. The agent sees the full catalog of stored memories at every step, and the question is whether it pulls the full content of entries, invokes memorized skills, or cites entry IDs. Memory is leveraged once the library is both mature and inherited. Bootstrap runs, which load a from-scratch memory store at the start, consult it actively inside gym and cave segments. From-scratch runs write many entries but rarely reach back for them. The reference rate remains low in absolute terms, which the paper reports honestly: most authored entries sit unused. This reinforces the conclusion that the transferable unit of the framework is the harness across runs, not a single episode, and it suggests an explicit reuse prior as a natural next step.

![Figure 17: Sub-agent handoffs](/assets/img/ch_fig17_handoffs.webp)

*Figure 17 shows how sub-agent handoffs keep cost low by running specialized tasks in a narrow context about an order of magnitude cheaper than the orchestrator, while still letting the orchestrator resume its original objective afterward.*

# The Red Bootstrap-Updating Regression

An interesting failure analysis comes from the bootstrap-updating regression on Red. Around step two hundred and thirteen, newly authored sub-agents overtake the inherited ones. These new sub-agents have not gone through the repair cycle observed for from-scratch skills, so their per-invocation success rate sits below what the bootstrap sub-agents reached before they were cached. The milestone staircase regresses in lockstep with the collapse of sub-agent use. The harness-as-transferable-unit claim holds when the agent continues to exercise the inherited components and breaks when it abandons them. A reuse prior on sub-agent selection, or a deletion rule that deprecates newly authored sub-agents whose task signature is covered by inherited ones, would be natural follow-ups.

# The Open-Source Co-Learning Results

The co-learning experiments train Gemma-4 models on Pokémon Red. The results show that the model's live in-game position advances across training iterations on every plotted run, both from the beginning of the game and from mid-game checkpoints. Mid-game starting points advance from their loaded indices, which shows the training procedure is not tied to the early-game distribution. The advance is bursty: cumulative milestone gain accumulates across multi-iteration improvement bands rather than within single iterations.

![Figure 7: Reset-free DAgger+PRM training drives sustained milestone progress](/assets/img/ch_fig6_pareto_fig7_training.webp)

*Figure 7 plots milestone progress against training iteration for the co-learning runs, showing that an open-source model's in-game position advances across training without ever resetting the environment.*

The per-iteration process reward is non-monotonic across all runs. Reward sustains of multiple consecutive iterations near or above the value zero point four zero precede the largest milestone gains, with regression iterations interleaved. The bursty advance pattern aggregates these reward-sustained windows.

There is one artifact noted. The first iteration after a checkpoint resume regresses relative to the pre-resume iteration and recovers within two to three iterations. The paper treats this as an artifact of the resume protocol and computes the aggregate signal over resume-spanning windows. Milestone advances occur in post-resume iterations, indicating that the regression is reward-specific and does not propagate to the trajectory-completion signal the judge uses.

A negative control rules out a rollout-protocol artifact. A cross-family model, Qwen3.5 at 27 and 35 billion parameters, without the supervised warm-up stage produces parseable tool calls but cannot leave the starting area in a live rollout. So the co-learning result is not an artifact of the harness or the rollout protocol.

The warm-up stages themselves are shown to be insufficient. Supervised fine-tuning lifts format compliance from near zero. Offline GRPO with a heuristic four-component reward and offline GRPO with a Gemini-oracle reward both maintain format and shift action quality. But neither produces meaningful milestone advancement on its own. Smaller Gemma-4 sizes converge to low training loss but collapse to zero tool-format success on the real harness prompt, consistent with an interaction between the fine-tuning signal strength and the large context needed to hold the full state plus reasoning. The gains begin only at the online co-learning stage, where the model plays through its own refining harness and learns from relabeled windows of its own behavior.

# Training Details

The training details are worth summarizing in simple terms. The supervised fine-tuning stage uses LoRA with a rank of two hundred and fifty-six, bf16 precision, and an eight-thousand-token context on H200 GPUs. Each example is a tuple of a screenshot, the harness prompt, and a teacher response extracted from Gemini 3.1 Pro Continual Harness gameplay. The learning rate is two times ten to the minus five with linear warmup over three percent of training and cosine decay. Each model is trained for one pass over the teacher-trajectory set.

The offline GRPO stage generates four candidate completions per state from the fine-tuned policy. Each is scored by a Gemini 3 Flash Preview per-step oracle on a composite of action correctness with weight zero point six and format compliance with weight zero point four. Advantages are group-normalized within the four samples per state, and the policy is updated via standard GRPO with a learning rate of one times ten to the minus six, a KL coefficient of zero point zero four against the fine-tuned reference, and a batch size of eight states per optimizer step over five hundred and ninety total steps.

The online co-learning loop runs each iteration as a two-hundred-and-fifty-six-step rollout through the full Continual Harness on Pokémon Red. A pairwise process reward model scores each transition over a sliding window, with reward as a weighted combination of trajectory progress at zero point four, action correctness at zero point three, reasoning quality at zero point two, and format compliance at zero point one. Low-reward windows are relabeled by the Gemini 3.1 Pro teacher, and a soft supervised fine-tuning update on the relabeled shard produces the next iteration's checkpoint. The soft fine-tuning runs three epochs at a learning rate of five times ten to the minus six, and the process reward model uses a stride of eight.

# Related Ideas in the Literature

The paper positions itself against several bodies of work. Agentic harnesses for coding and assistant tasks exist, but they stall on embodied role-playing games without domain scaffolding. Concurrent prompt-optimization methods and reflective self-improvement methods optimize harness components or reflect on trajectories between episodes. Continual Harness differs by editing the full harness state in place mid-episode from partial trajectory windows, without resets.

For autonomous agents in games, existing approaches either build their own tooling during play or pair the language model with a hand-designed planner. The PokeAgent Challenge provides the canonical benchmark and expert harness. The GPP runs across Blue, Yellow Legacy, and Crystal show that human-supervised harness refinement completes multiple full role-playing games, and Continual Harness automates this process.

For the training loop, the paper draws on reset-free reinforcement learning for environments without resets, in-context reinforcement learning and recursive language model methods for implicit improvement and structured multi-call reasoning, and process reward models, group-relative policy gradient, and STaR-style self-training for finer-grained signals than sparse episode reward. The co-learning pipeline warms up via supervised fine-tuning and offline GRPO, then runs an online loop where a frontier teacher relabels low-reward windows of the model's own rollouts inside a live-refining harness for soft fine-tuning updates.

# Discussion and Limitations

The paper closes with an honest discussion of limitations. A capability floor exists below which the refinement loop cannot bootstrap. Flash-Lite stalls below twenty percent on Emerald, and every Continual Harness variant on Flash-Lite underperforms the minimalist baseline. A model that is too weak cannot handle the added complexity of a self-modifying harness.

The co-learning experiments couple a frontier-model teacher to an open-source student. The framework could in principle extend to the same model serving both roles, but the open-source models evaluated, Gemma-4 up to thirty-one billion parameters, are not yet capable enough to act as both teacher and trainee.

The co-learning loop is not saturated by the experiments. The paper reports sustained milestone progress over the training horizon it ran but did not establish a convergence point. The paper also restricts attention to reset-free training, where the emulator state at the end of one iteration is loaded as the start of the next. The same loop applies to traditional batch accumulation with resets, and a head-to-head comparison between the two regimes on the same task remains an open question.

# What the Research Was Trying to Make Possible

The research was trying to make possible a world where AI agents that operate in the physical world, or in simulated worlds, can build up their own expertise automatically, the same way coding agents have been given scaffolding and tooling. Specifically, it wanted to show that a game-playing agent could start from nothing but a raw screen and a set of buttons, and over the course of a single continuous play session, assemble its own instructions, helper sub-agents, reusable skills, and memory, improving itself as it went. And it wanted to extend that idea one step further: to make the same self-improvement loop train the model's own weights, so that an open-source model fed on its own improving play would keep getting better without ever needing the environment to be reset or restarted. In short, it tried to make fully autonomous, reset-free, self-improving embodied agents possible, removing the human from the loop entirely.

# What Becomes Obvious After Reading It That Was Not Obvious Before

Several things become obvious after reading the paper. First, the bulk of an AI agent's long-horizon performance can live in the harness rather than in the raw model. The orchestrator delegates to cheap specialized sub-agents, and this partitioning of context produces an order of magnitude savings in tokens and makes long tasks tractable. Second, harness refinement is concentrated and recurrent rather than uniform: a small set of components gets repeatedly updated and periodically rewritten, and the harness never really converges to a fixed scaffold. Third, most skills an agent creates are never used, and that is fine; the system triages by repairing only the skills the agent actually depends on. Fourth, a weak model is genuinely hurt by a sophisticated harness, so there is a capability floor below which self-improvement cannot start. Fifth, the transferable unit of experience is the harness across runs, not a single episode, and the most valuable artifact of a run is the accumulated harness state, not the game progress. Sixth, reset-free operation is not just a technical nicety; it is what makes deep-episode failures reachable at all, because failures that only appear after hours of play simply cannot be encountered by methods that restart the episode every time.

# What Long-Running Problem This Paper Moved, Even Slightly

The long-running problem this paper moved is the problem of agents that must operate for a very long time in an environment they do not fully understand, where restarts are expensive or impossible, and where the skills needed are not known in advance. For decades, the standard answer to improvement in artificial intelligence has been to run many episodes, collect data, train, and then run again. The paper moves the needle on the reset-free alternative: improvement that happens in place, mid-episode, without a restart, by treating the agent's own scaffolding as something that can be edited while the agent is working. It shows that this approach can capture a majority of the benefit of a hand-engineered system, that it can measurably improve concrete skills toward an optimal oracle, and that it can even drive genuine training progress in an open-source model. It also clarifies where the limits are: the capability floor below which this fails, and the residual difficulty of dialogue-heavy and multi-turn strategic reasoning. That is a meaningful step toward the long-term goal of agents that live in the world and get better at it over time, in a single unbroken life.
