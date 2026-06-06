---
title: "CaMeLs Can Use Computers Too"
pubDate: 2026-06-06
---

- Paper title: CaMeLs Can Use Computers Too: System-level Security for Computer Use Agents.

- Main topic: the paper studies how to make Computer Use Agents safer from prompt injection and related attacks while still keeping them useful.

- Computer Use Agents, or CUAs, are AI agents that operate software by looking at screens and taking actions such as clicking, typing, scrolling, navigating, and interacting with apps.

- CUAs are harder to secure than normal text-tool agents because their actions are context-dependent; a tool call like send_email has clear meaning, but click(x, y) only has meaning after knowing what is present at those screen coordinates.

- The same click can be harmless or dangerous depending on the UI state; it could press a normal button, delete data, submit a payment, log in, or open a malicious page.

- CUAs are vulnerable because they use visible and structured environment content as decision-making input; malicious webpages, emails, ads, images, popups, forum posts, or hidden page content can influence the agent.

- Prompt injection or instruction injection happens when malicious content tells the agent to ignore its real task and follow attacker instructions.

- In CUAs, prompt injection can appear through visible text, fake UI elements, hidden DOM content, adversarial image patches, fine print, popups, ads, or pixel-level perturbations.

- The paper argues that prompt-based defenses are fragile because the agent is still exposed to malicious content during planning.

- The paper focuses on system-level security rather than only improving model prompts.

- The central security goal is control flow integrity, or CFI.

- Control flow integrity means the agent only executes the actions and branches that were already allowed by a trusted plan.

- CFI protects the structure of execution: which functions run, in what order, and under what conditional logic.

- CFI does not automatically protect data flow, which means it does not fully stop malicious observations from affecting coordinates, arguments, or branch decisions.

- The paper separates control-flow security from data-flow security; control-flow security prevents unauthorized new steps, while data-flow security prevents attacker-controlled data from corrupting values inside authorized steps.

- The main architecture is a Dual-LLM system, which splits the agent into a trusted planner and an untrusted perception model.

- The trusted planner is called the Privileged Planner, or P-LLM.

- The P-LLM creates the execution plan but does not see live screen content, DOM content, or other untrusted environment observations.

- The perception model is called the Quarantined Perception model, or Q-VLM.

- The Q-VLM can see screenshots, DOM content, UI state, and page elements, but it cannot rewrite the plan.

- The Q-VLM is treated as untrusted because malicious content in the environment can influence what it reports.

- The core security idea is that the P-LLM writes the plan before seeing the environment, and the Q-VLM only supplies observations or coordinates during execution.

- A normal CUA repeatedly observes the screen, reasons about the next step, and acts; this creates many chances for malicious content to influence planning.

- The proposed system uses single-shot planning, where the P-LLM writes a complete plan upfront before any untrusted observation is processed.

- The single-shot plan includes branches, fallback paths, loops, checks, and possible recovery steps for different UI states.

- After the plan is written, an interpreter executes it and calls the Q-VLM only when the plan requests environment information.

- This architecture blocks malicious content from adding arbitrary new instructions to the agent's plan.

- The paper builds on earlier Dual-LLM systems such as CaMeL and Fides, which were mainly studied in text-tool environments with typed APIs.

- Typed APIs are easier to secure because actions like get_calendar, send_email, or read_file have clearer semantics than GUI clicks.

- CUAs are harder because their state space is effectively unbounded across application state, UI layout, browser state, operating system state, pixel changes, popups, and website behavior.

- The paper calls this the plan-complexity gap between typed-API agents and CUAs.

- In typed-tool settings, plans can be shorter and more linear; in CUA settings, plans need many more branches and fallback paths.

- The paper introduces CaMeL-NOVA as its main CUA security architecture.

- CaMeL-NOVA adapts CaMeL-style Dual-LLM planning to computer-use tasks.

- NOVA stands for Navigating via Observation, Verification, and Action.

- The main planning pattern in NOVA is Observe-Verify-Act.

- Observe means the plan gathers information from the screen, DOM, page text, or accessibility tree through quarantined perception tools.

- Verify means the plan checks whether a predicted condition is true before deciding which branch to follow.

- Act means the plan performs GUI actions such as clicking, typing, or scrolling only after verification.

- The key verification tool is verify_hypothesis, which compares an observation with a predicted state and returns a result such as OK, FAIL, or UNKNOWN.

- Example verify_hypothesis use: compare the observation of the page with the hypothesis that a cookie consent popup is visible.

- The P-LLM writes all possible branches in advance, and the interpreter chooses among those branches using verification results.

- This gives the agent some ability to react to the environment without letting the trusted planner directly read malicious environment content.

- The attacker may influence which existing branch is selected, but cannot create a new branch or add a new action sequence.

- NOVA treats common UI routines as reusable planning patterns, such as checking whether the browser is open, handling cookie banners, closing popups, finding a search bar, and recovering from failed clicks.

- These reusable routines are encoded into the planner's prompt and framework so the planner can focus more on task-specific reasoning.

- Task-specific reasoning includes deciding which website to visit, which app workflow matters, what information to find, and how to complete the user request.

- A key claim of the paper is that many computer-use workflows are more structurally predictable than they appear.

- The paper shows that strict planner isolation does not destroy all utility if the planner anticipates likely states and writes enough fallback branches.

- The evaluation uses OSWorld, a benchmark of realistic computer-use tasks across apps such as Chrome, LibreOffice, GIMP, Thunderbird, VLC, VS Code, and OS-level workflows.

- The paper reports pass@k metrics, where pass@1 means one attempt succeeds and pass@k means at least one of k independent attempts succeeds.

- pass@k is especially relevant because CaMeL-NOVA can generate multiple independent plans in parallel.

- The paper compares unprotected CUAs, an unoptimized CaMeL-CUA setup, CaMeL-NOVA, and a Fides-NOVA adaptation.

- The unoptimized CaMeL-CUA setup performs poorly because it lacks the Observe-Verify-Act structure and does not use verify_hypothesis effectively.

- NOVA improves performance because its plans are more fault-tolerant, with more branches and recovery paths when UI states differ from expectations.

- The paper reports that AgentDojo-style CaMeL plans averaged about 4.9 tool calls and 3.7 branches, unoptimized CaMeL-CUA plans averaged about 19.8 tool calls and 11.3 branches, and CaMeL-CUA-NOVA plans averaged about 41.1 tool calls and 39.7 branches.

- This shows that secure CUA planning needs much richer branching than typed-tool planning.

- On a 60-task UITars task set, unoptimized CaMeL-CUA achieved 18.3 percent pass@3, while UITars with CaMeL-NOVA achieved 58.3 percent pass@3 and 65.0 percent pass@5.

- On the same 60-task set, OpenCUA with CaMeL-NOVA achieved 66.7 percent pass@5 and Claude Sonnet 4.5 as the CUA backend achieved 68.3 percent pass@5.

- The close results across different CUA backends suggest that planner quality matters more than the perception backend in this architecture.

- Stronger planners write better fallback branches and better multi-step strategies, while weaker planners often miss important UI states or produce overconfident plans.

- In the paper's planner comparison subset, GPT-5 performed best and Grok-4 came second, but this should be treated as benchmark-specific rather than a universal model ranking.

- The paper also adapts Fides to CUAs as Fides-NOVA, but this requires relaxing some redaction rules so the planner can use boolean verification outputs.

- Fides-NOVA reaches comparable utility but at much higher token cost because it repeatedly invokes the planner instead of generating one complete plan upfront.

- CaMeL-NOVA adds about 1.88 times the token cost over the undefended agent, Fides-NOVA adds about 29.6 times, and CaMeL-NOVA with Multi-Modal Consensus adds about 6.57 times.

- The strongest security result is that arbitrary prompt-injection control-flow attacks are structurally blocked.

- If a malicious webpage says to ignore the task and send private data to an attacker, that instruction cannot directly add new plan steps because the P-LLM never sees it.

- The main remaining weakness is Branch Steering.

- Branch Steering is a data-flow attack where the attacker manipulates what the Q-VLM perceives so the interpreter chooses an attacker-preferred branch that already exists in the plan.

- Branch Steering does not invent new actions; it steers the agent through valid but dangerous or unintended branches.

- A simple Branch Steering example is a fake cookie popup inside an ad banner that causes the agent's normal cookie-handling routine to click the attacker's element.

- The paper gives two main Branch Steering attacks: the Cookie Popup attack and the Pixel Attack.

- The Cookie Popup attack embeds fake cookie popups inside advertisements so find calls looking for cookie consent elements return attacker-controlled coordinates.

- The Cookie Popup attack can be one-step, multi-step through a benign hop site, or long-range where the malicious popup appears later in the task.

- The long-range version is stealthier because the harmful effect is delayed until deeper in execution.

- The Pixel Attack uses optimized pixel perturbations in an image region, such as an ad banner, to make the Q-VLM return attacker-chosen coordinates and plausible reasoning.

- The Pixel Attack is dangerous because the Q-VLM output can look consistent with the task, making it harder for verification systems to flag.

- The paper tests two redundancy-based defenses against Branch Steering: DOM Consistency and Multi-Modal Consensus.

- DOM Consistency checks whether Q-VLM outputs match DOM or accessibility-tree information, which can catch some fake visual elements or ad-region clicks.

- DOM Consistency is limited because attackers can sometimes control HTML5 content and shape the DOM so the fake element appears legitimate.

- Multi-Modal Consensus uses an independent verifier model to check the screenshot, DOM, Q-VLM output, and original instruction.

- Multi-Modal Consensus relies on the idea that an attack optimized for one model may not transfer perfectly to another model.

- The paper finds that redundancy defenses are useful but probabilistic; they do not provide formal data-flow guarantees.

- Both DOM Consistency and Multi-Modal Consensus can be bypassed by stronger or better-positioned attacks.

- The paper identifies a coverage-utility tradeoff in data-flow defenses.

- If a verifier is narrow, it misses new attack types; if it is broad and suspicious, it creates many false positives and hurts utility.

- The paper's key conceptual lesson is that Dual-LLM isolation strongly protects control flow but does not fully solve data-flow security.

- CFI still matters because it limits attacker freedom; attackers must work within the actions and branches already present in the plan.

- Explicit plans also make inspection, approval, logging, and policy checking easier than in continuously reactive agents.

- Future security work may need to translate low-level coordinate actions into semantic actions, because semantic actions are easier to audit and restrict.

- Example semantic action: click the Accept cookies button on example.com.

- Example low-level action: click coordinate 816, 423.

- The architecture may also help privacy because a cloud or proprietary planner can generate plans without seeing sensitive screen content, while a local Q-VLM handles perception.

- The paper critiques current CUA benchmarks because some OSWorld tasks are underspecified, hard to verify automatically, or depend heavily on knowing website structure.

- The conclusion is that secure single-shot planning for CUAs is more practical than expected, but it requires long plans, many branches, verification steps, and careful handling of residual data-flow attacks.

- CaMeL-NOVA should be understood as a strong baseline, not a complete solution.

- The biggest strength of CaMeL-NOVA is preventing arbitrary instruction injection by design.

- The biggest weakness of CaMeL-NOVA is Branch Steering through manipulated perception outputs.

- The practical takeaway is that secure CUAs should not let the same model both read untrusted content and freely decide the next action.

- Another practical takeaway is that perception outputs from screenshots and DOM should always be treated as untrusted data.

- Another practical takeaway is that redundancy checks can help but should not be treated as complete security.

- Another practical takeaway is that better planner reasoning may improve secure CUA utility without weakening architectural isolation.

- A simple mental model for the paper is that the planner writes the allowed map before seeing the terrain, and the perception model only reports where the agent seems to be on that map.

- A simple mental model for the remaining attack is that the attacker cannot draw a new road on the map, but may trick the perception model into saying the agent is on the wrong road.

- The most important terms to remember are Computer Use Agent, Dual-LLM, Privileged Planner, Quarantined Perception, single-shot planning, Observe-Verify-Act, verify_hypothesis, control flow integrity, data-flow security, and Branch Steering.