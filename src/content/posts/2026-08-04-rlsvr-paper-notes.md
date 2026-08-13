---
title: "From RLVR to RLSVR: Task Transformation Induces Self-Verifiable Rewards for Open-Ended LLM Self-Improvement"
pubDate: 2026-08-04
---

The paper is about a new way to train models to get better at tasks that have no single correct answer, like creative writing and summarization, without needing a human, an external judge, or a reward model to tell the model whether its output is good, by turning the open-ended task into a small game in which the model can score itself with a fully verifiable rule.



In recent years, Reinforcement Learning with Verifiable Rewards became extremely popular and successful. It is the engine behind famous reasoning models like OpenAI o1 and DeepSeek-R1. The idea of RLVR is simple: let the model produce many candidate answers, then check each answer against a known correct answer using a computer program, and give a reward if the answer matches and no reward if it does not. Because the checking is done by a deterministic rule, the training signal is unbiased, unlimited, essentially free, and can be generated automatically. This lets you train models at a very large scale without any human labeling.

RLVR only works when a correct answer actually exists and can be checked by a program. That is true for mathematics, where you can compare against the right number or a proof, and for coding, where you can run unit tests. But it is completely untrue for open-ended tasks.

If you ask a model to write a story, summarize a report, or answer a vague research question, there is no single right answer. Quality is a subjective matter. This is sometimes described as the task lacking a verifier. So RLVR, despite its power, is trapped in the narrow world of math and code and cannot be used for the much larger universe of open-ended language tasks.

## How people previously tried to solve this problem, and why those attempts were unsatisfying

Since open-ended tasks have no verifiable correct answer, earlier work replaced the verifier with something that approximates human judgment.

One family of methods uses human preference signals, such as RLHF and DPO, where people rank model outputs and the model learns to match those preferences.

Another family uses a big language model as a judge, where an LLM is asked to decide which output is better, often called LLM-as-a-Judge. There are also self-rewarding models, where the model grades its own output. These methods all broaden the reach of reinforcement learning, but they bring real problems. A learned reward model or an LLM judge can have systematic bias and can never be better at judging than the judge model itself, so the model's final capability is capped by the competence of its evaluator. Judges also cost extra compute for every single evaluation during training. All of these approaches try to directly approximate the unverifiable quality function, which is fundamentally hard. The paper argues that this is the root cause of the failure: you should not approximate the missing label at all, you should change the task so the label exists.

## The idea borrowed from self-supervised learning

To escape this trap, the authors look to a much older and very successful idea in machine learning called self-supervised learning.

In self-supervised learning, you do not need human annotations. Instead, you invent a so-called pretext task whose labels are generated automatically from the data itself. For example, masked language modeling hides some words in a sentence and asks the model to predict them, and the missing words themselves are the labels. Contrastive learning shows the model two related views of the same data and two unrelated views, and the labels are just whether the two views belong together. Jigsaw puzzles ask a model to reassemble shuffled image patches. In every case, the pretext task is not the ultimate task the model cares about, yet solving it teaches representations and capabilities that transfer to real tasks. The deep lesson the paper takes from this is that you do not need the final task to be directly verifiable. You can build a proxy objective that produces its own supervision automatically, as long as that proxy objective shares enough capability with the real task.

## The main proposal: RLSVR

The paper takes this self-supervised philosophy and transplants it into reinforcement learning. The result is called RLSVR, which stands for Reinforcement Learning with Self-Verifiable Rewards. You can think of RLSVR as self-supervised learning applied to RLVR. Instead of trying to approximate an unverifiable quality score, RLSVR transforms the original open-ended task into a proxy environment, and the internal rules of that environment automatically generate verifiable reward signals.

![Figure 1: RLSVR combines RLVR with self-supervised learning](/assets/img/rlsvr_fig1_rlsvr_overview.webp)

*Figure 1 contrasts the three paradigms in a single picture: (a) RLVR grades outputs against a known correct answer, which only exists in domains like math; (b) SSL builds a pretext task whose labels are generated automatically from the data itself; (c) RLSVR combines the two by transforming an open-ended task into a proxy environment that pre-assigns a latent variable as the verifiable answer, so rewards can be checked exactly against the environment's own record.*

The transformation works through four steps. First, latent-variable injection: the environment samples a task input and also samples a hidden latent variable, and records this latent variable as the ground truth of the episode. The latent variable could be many things, such as which part of the input was withheld, which input was perturbed, or under which hidden condition each output was produced. Crucially, the policy never sees this hidden variable. Second, conditioned task execution: the environment builds observations from the input and the hidden variable, and the policy performs the original target task on each observation, producing its normal outputs. This step guarantees that the abilities being exercised are exactly the abilities of the target task. Third, verifiable interaction: the environment's rules now ask a question about the hidden variable, a question that can only be answered correctly by looking at the task outputs, for example asking which output was produced under the hidden condition. The design is such that answering this question correctly depends on the quality of the outputs from the previous step. Fourth, rule-based reward: the environment checks the interaction outcomes against the recorded hidden variable and computes a reward with a simple rule.

The reward that comes out of this is called self-verifiable. It is a deterministic function of the environment-assigned hidden variable and the observed interaction outcomes. It needs no human annotation, no learned reward model, and no external judge. The crucial property is that ground truth exists by construction, because the environment itself sampled the hidden variable, so any prediction about it can be checked exactly, just like a math verifier checks a final answer. In this framing, the transformation plays the role of the pretext task, the hidden latent variable plays the role of the automatically generated label, and ordinary RLVR machinery applies directly to the transformed environment.

## SpyRL

The authors turn the abstract RLSVR idea into a practical method called SpyRL, short for Self-PlaY Reinforcement Learning. It is inspired by the social deduction party game "Who Is the Spy?". If you have ever played the game, you know the setup: several players are told a secret word, except one player, the spy, who is given a very similar but different word. Everyone describes their word, and the group votes on who they think the spy is. The spy tries to blend in, and the civilians try to detect the odd one out.

SpyRL turns an open-ended generation task into exactly this kind of game. There are n players. In each round, one player is secretly designated as the spy, and the identity is assigned by the environment, which is what makes everything verifiable. The other n minus one players are civilians. The civilians each receive the complete task input. The spy receives a degraded version of the input, obtained by applying an information-degradation operator, such as masking out a chunk of the text or compressing away key information. The degradation is designed to take away the information that is essential for doing the task well, while preserving style, length, and overall theme, so that the detector cannot find the spy through superficial tricks. This information asymmetry guarantees that the spy will generally perform worse, which becomes the seed of a verifiable reward signal.

The game has two stages that are coupled into a closed loop. In the performing stage, every player does the actual target task on their own private observation. If the task is summarization, they write a summary. If it is creative writing, they write a story. If it is mathematics, they construct and solve a math problem. In the detection stage, all outputs are revealed publicly, and every player inspects all the outputs and votes on who they believe the spy is. Because the spy identity was fixed by the environment, the correctness of every vote can be checked exactly. A player who voted for the true spy is rewarded, and one who did not is not. This gives a clean, verifiable training signal for the detection part.

The genius of the design is the coupling between the two stages. The votes from the detection stage define the reward for the performing stage. The spy wants to avoid being voted out, and the civilians want to avoid being wrongly suspected. The only way to do that is to produce outputs of genuinely high quality, because an output that reveals missing information is what betrays either the spy or an incompetent civilian. So output quality, which is otherwise impossible to evaluate directly, gets converted into a verifiable identity-recognition problem. Being a good performer and being convincing are exactly the same thing in this game.

![Figure 2: Overview of the SpyRL framework](/assets/img/rlsvr_fig2_spyrl_framework.webp)

*Figure 2 shows the closed-loop game structure. In the performing stage, civilian players observe full information while the spy receives a degraded version, and all players produce public task outputs. In the detection stage, players vote on who they believe the spy is; the performing reward is inversely proportional to suspicion votes received, while the detection reward is deterministically verifiable against the environment-assigned spy identity.*

## The reward functions in detail

The performing stage uses a zero-sum reward design with two principles. First, a player who receives more suspicion votes should get a lower reward. Second, the total reward across all players should sum to zero, so the spy's gain is exactly the civilians' loss and vice versa. If we let m with a subscript be the number of votes each player received, then the spy's reward is proportional to the negative gap between the spy's votes and the average civilian votes. Each civilian's reward has two parts: a term that rewards civilians collectively when the spy is found, and a penalty if that particular civilian receives more votes than the average civilian. This second term enforces competition within the civilian group as well, so the learning signal is fundamentally relative. The model is not being asked to optimize some abstract notion of quality, it is being asked to produce outputs that are better than the other players under the same information conditions.

Because the spy and the civilians face structurally different difficulty, the spy starting from degraded information and the civilians from full information, their raw rewards are not directly comparable. Using them directly in optimization would confuse the spy's information disadvantage with genuine poor performance. To fix this, SpyRL uses a technique called Role-Advantage Estimation, which maintains a separate moving average baseline for each role. The spy's reward is compared against the spy baseline, and each civilian's reward is compared against the civilian baseline. This recenters the reward for each role on its own typical outcome, so a player gets a positive signal whenever it beats its own role's expectation. The ablations show this matters enormously, removing it drops average math accuracy from about fifty point four to thirty seven point five, and actually makes training hurt the model.

![Table 9: Ablation on Role-Advantage Estimation](/assets/img/rlsvr_table9_rae_table10_degradation.webp)

*Table 9 (top) shows the effect of Role-Advantage Estimation. With RAE, SpyRL lifts the seven-benchmark average from 41.4 to 50.4; without it, the raw rewards conflate the spy's information disadvantage with poor policy quality, and the average drops to 37.5 — below the untrained backbone on several benchmarks. RAE is what turns training from harmful into helpful.*

## The training procedure and the alternating schedule

Training uses a standard policy gradient algorithm called GRPO with a clipped objective and a KL penalty that keeps the model close to its reference version. The interesting design choice is that the two stages are not trained jointly. Jointly updating the performer and the detector at the same time fails badly, because early on the detector cannot tell the spy from the civilians, so its votes are noisy and the rewards it hands to the performer are misleading, which then degrades the performer, which then gives the detector even worse examples. This is a vicious feedback loop.

Instead, SpyRL alternates. In each training epoch, only one stage is updated while the other stays frozen. The paper tracks the detector's real-time performance, namely its accuracy at identifying the spy and its rate of abstaining, using smoothed estimates, and switches phases according to hysteresis thresholds. If the detector becomes very good at catching the spy, it is time to train the performers, because the spy needs to learn to blend in better. If the detector starts failing or abstaining a lot, it is time to train the detector again. A minimum dwell time is enforced to stop the phases from flapping back and forth. This alternating schedule keeps a stable learning pressure on both sides and prevents the classic problem of self-play where one side over-optimizes and the whole system stagnates. Intuitively, this is the same kind of dynamic arms race you see in GANs or in AlphaGo-style self-play, but with language tasks.

## The three task settings used in the experiments

SpyRL is tested on three very different domains. In text summarization, the input is a long government report and the task is to produce a summary. The spy receives the report with a continuous twenty percent span masked out, so it must infer the missing content. In creative writing, the input is a writing prompt and the task is to write a story. Again the spy gets the prompt with twenty percent masked out, creating uncertainty about part of the narrative premise. In mathematical reasoning, the input is a passage of math-heavy text and the players must formulate and solve a math problem based on it. Here the masking ratio is higher, forty percent, because mathematical text has more redundancy and structure. In every case, the civilians get the full unmodified input and the spy gets the corrupted version.

![Figure 3: Task-specific instantiations of SpyRL across three domains](/assets/img/rlsvr_fig3_task_instantiations.webp)

*Figure 3 shows how the game is instantiated per domain. Top row: civilians see the complete input while the spy sees a masked version (shown as xxx). Middle row (performing stage): all players generate task outputs — summaries, stories, or a math problem with solution. Bottom row (detection stage): players evaluate outputs against domain-specific criteria to identify the spy. The degradation operator is a continuous span mask for summarization and writing, and partial context removal for math.*

The training backbone is Qwen3, in the four billion and eight billion parameter sizes. All models are trained for one hundred epochs with a batch size of about a thousand samples, and the game always has five players. The method uses the verl training framework with GRPO on a single node with eight GPUs.

## The results on non-verifiable tasks

On summarization, SpyRL achieves the best ROUGE score on every benchmark for both backbone sizes. For example, on the GovReport dataset with the four billion model, the score improves from about thirty three point two to thirty six point seven compared to the strongest baseline, and the pairwise GPT-4o evaluations show SpyRL wins the majority of comparisons in essentially every cell. On creative writing, SpyRL is preferred over the untrained backbone and over both baselines in every fine-grained dimension, with the largest margins in novelty and emotion, which are the most subjective aspects. This matters because it shows the gains are not just about fluency or structure, they are about the deep, subjective qualities of good writing.

![Table 1: Results on summarization benchmarks](/assets/img/rlsvr_fig4_vote_quality.webp)

![Table 2: Results on creative writing benchmarks](/assets/img/rlsvr_table2_writing_table3_math.webp)

*Tables 1 and 2 report the main non-verifiable results. On summarization (top of the first page), SpyRL achieves the highest ROUGE-L on every benchmark for both Qwen3-4B and Qwen3-8B, and wins the majority of pairwise GPT-4o A/B comparisons in essentially every cell. On creative writing, SpyRL is preferred in every fine-grained dimension (novelty, emotion, coherence, consistency, overall) against the backbone and both self-evolution baselines.*

The paper also validates the central claim directly. They run one hundred games on both summarization and writing, record how many suspicion votes each player received, and separately ask GPT-4o to rank the outputs by quality. There is a clear positive correlation between the number of votes a player receives and its quality rank, meaning worse outputs get more suspicion votes and therefore smaller rewards. This confirms that the vote-based reward really is aligned with true task quality, without any external verifier.

![Figure 4: Correlation between suspicion votes and output quality](/assets/img/rlsvr_fig4_vote_quality.webp)

*Figure 4 plots the average GPT-4o quality rank (1 = best, 5 = worst) against the number of suspicion votes received over 100 games on WritingPrompts (left) and GovReport (right). Players receiving more votes consistently produce lower-quality outputs, confirming that the vote-based reward is well-aligned with actual task performance without requiring an external verifier.*

A blinded human evaluation on creative writing reinforces the result. Ten PhD students ranked responses across several dimensions, and SpyRL won roughly eighty percent of pairwise comparisons against the base model and the two baselines on the main writing benchmark. The paper also checks that GPT-4o agrees well with these human judgments, with high precision and recall, which supports using it as a reliable automatic evaluator.

![Table 4: Human evaluation results on creative writing](/assets/img/rlsvr_table4_human_table5_rubric.webp)

*Table 4 shows the human evaluation win rates of SpyRL against Qwen3-4B, R-Zero, and Absolute Zero across five writing dimensions. SpyRL consistently wins the majority of pairwise comparisons, with the largest margins on novelty and emotion — the most subjective qualities — confirming the automatic-metric gains are recognized by human readers.*

## The results on verifiable tasks, and why that is interesting

Even though SpyRL was designed for non-verifiable tasks, it also improves performance on math, where verifiable rewards already exist. It beats both baselines on all five math benchmarks and on two broader reasoning benchmarks. The improvements are especially large on the hardest problems, such as AIME 2024 and AIME 2025, and the method is the only one that improves on every benchmark, including very hard competition-style datasets like AMC, Olympiad-Bench, and SuperGPQA. This is a notable finding, because it suggests the advantage of SpyRL is not simply that it creates a verifier where none existed. Even where a verifier already exists, the group-based, relative, multi-player learning signal is finer-grained and more stable than a single proposer-solver loop, and it encourages more rigorous and complete reasoning because incomplete derivations and unsupported assumptions are exactly what would expose the spy.

![Table 3: Results on mathematical and general reasoning benchmarks](/assets/img/rlsvr_table2_writing_table3_math.webp)

*Table 3 reports accuracy on five math benchmarks (GSM8K, Math500, AIME 24, AIME 25, Minerva) and two broader reasoning benchmarks (MMLU-Pro, GPQA-D). SpyRL achieves the best results across all seven for both Qwen3-4B and Qwen3-8B, with the largest gains on the hardest AIME problems — even though verifiable rewards already exist in this domain.*

## Cost comparison against judge-based methods

The paper also compares against rubric-as-reward methods, which use a big model as an external evaluator to grade outputs against a rubric. SpyRL outperforms a Qwen3.5-27B rubric-based variant on every dimension, and remains competitive with a GPT-4o-based rubric variant while doing better on novelty and emotion. The kicker is cost: the two rubric methods spent roughly two hundred and nine hundred dollars respectively on external evaluator calls during the experiments, while SpyRL spends nothing because it needs no external verifier. This makes the practical trade-off very clear.

![Table 5: A/B test comparison with rubric-as-reward baselines](/assets/img/rlsvr_table4_human_table5_rubric.webp)

*Table 5 compares SpyRL against Qwen3.5-27B-RaR and GPT-4o-RaR, which use an external LLM as a rubric evaluator. SpyRL beats the smaller rubric variant across all dimensions and stays competitive with the GPT-4o variant (better on novelty and emotion) — while incurring roughly $0 in external verifier costs versus about $200 and $900 for the two rubric baselines.*

## Generalization tests

Two extra experiments check whether SpyRL depends on the specific data it was trained on. In the first, the model is trained on scientific abstracts from PubMed instead of government reports, and then evaluated on arXiv, PubMed, and BillSum. The method still improves summarization by almost five ROUGE points on average, showing it is not tied to one document distribution. In the second, models trained on one task are evaluated without any fine-tuning on a different task. Summarization and creative writing transfer positively in both directions, which makes sense because both rely on shared skills like organizing content, maintaining coherence, and long-range consistency. The math-trained model transfers negatively to writing tasks, which also makes sense because symbolic manipulation and multi-step reasoning have little overlap with stylistic writing.

![Table 6 & 7: Domain-specific summarization and cross-task transfer results](/assets/img/rlsvr_table6_sci_table7_transfer.webp)

*Tables 6 and 7 cover generalization. Table 6 shows SpyRL trained on PubMed scientific abstracts still improves ROUGE-L on arXiv, PubMed, and BillSum by an average of about five points. Table 7 shows cross-task transfer: summarization and creative writing transfer positively in both directions, while the math-trained model transfers negatively to both writing tasks.*

## What the ablations reveal about the design

The ablation studies systematically isolate each piece of the method. Removing the spy mechanism, so there is no information asymmetry, causes the model to stagnate quickly, because the detector has no adversarial pressure and stops giving useful rewards. Training only the performing stage with a frozen detector also plateaus and oscillates, because the static detector cannot keep up with increasingly sophisticated outputs and its rewards become distorted. Training only the detection stage gives negligible improvement in the target task. Only the full two-stage coupled optimization keeps improving steadily.

![Table 8: Ablation study on modules](/assets/img/rlsvr_fig5_group_size_table8_modules.webp)

*Table 8 (top) ablates the training modules on Math500 accuracy across epochs. "Only Performing" freezes the detector and plateaus; "Only Detection" freezes the performer and gives almost no gain; "Without spy" removes information asymmetry and stagnates; only the full two-stage SpyRL keeps climbing from 68.2 to 79.5.*

The group size matters too. Increasing the number of players from three to five gives the biggest jump in performance, roughly from a five point five point average gain to a nine point three point gain. Going to six or eight players gives diminishing returns, so five players is a sweet spot that provides enough game complexity without waste.

![Figure 5: Effect of group size on performance gain](/assets/img/rlsvr_fig5_group_size_table8_modules.webp)

*Figure 5 (bottom) shows the mean gain over the base model across five reasoning benchmarks as the player count grows. Increasing n from 3 to 5 produces the largest marginal improvement (mean gain 5.5 to 9.3), while scaling to 6 and 8 players yields diminishing returns — five players already provides sufficient game complexity.*

The degradation operator, which is the only component that must be specified per task, turns out to be remarkably insensitive to its exact settings. Masking twenty percent versus forty percent of the input produces nearly identical results. This is because the masking removes task-relevant content while keeping topic and surface form, and the role-advantage estimation recenters rewards on each role's own baseline anyway. So the operator needs very little task-specific engineering, as long as the asymmetry it creates is meaningful but not degenerate.

![Table 10: Sensitivity to the information-degradation operator](/assets/img/rlsvr_table9_rae_table10_degradation.webp)

*Table 10 (bottom) compares continuous span-masking ratios of 20% and 40% for summarization. The two settings are nearly indistinguishable across the five benchmarks, confirming that the degradation operator requires little task-specific engineering as long as it creates meaningful but non-degenerate information asymmetry.*

Finally, the paper directly demonstrates why the alternating optimization is essential. Joint training, where both stages update at the same time, actually degrades the base model, dropping GSM8K accuracy from eighty four and a half percent to seventy six point eight percent. Alternating training raises it to ninety three point four percent. The message is that mutually dependent stages must be updated one at a time to keep the intermediate signals reliable.

## The implementation and prompt design details

The training relies on two carefully engineered prompts. The performing stage prompt tells each player its role, explains that the spy saw a blank or degraded prompt, requires a private thinking process before answering, enforces high-quality writing criteria, and demands strict formatting. This lets one template serve both civilians and the spy. The detection stage prompt turns the model into a critical evaluator. It provides a multi-dimensional rubric for spotting anomalies, explicitly allows the answer N/A when the model is genuinely uncertain, imposes a strict token limit so the model cannot ramble, and wraps the final decision in special brackets so the answer can be extracted automatically. Allowing uncertainty is an important detail, because it lets the detector abstain when evidence is insufficient rather than making a forced guess, which keeps the training signal honest.

## The core takeaways

The paper's deepest claim is that verifiability is not an intrinsic property of a task. It is something that can be engineered. Any task, no matter how open-ended and subjective, can be wrapped in a proxy environment that creates its own ground truth, and then all the scalable machinery of RLVR applies. The spy game is one example of such an environment, but the underlying principle of task transformation is general. This reframes a long-standing bottleneck in language model training as a design problem rather than a fundamental limitation.

## What was the research trying to make possible

The research was trying to make scalable, self-improving training possible for open-ended language tasks. Historically, the most powerful training recipe for reasoning models, RLVR, only worked when a correct answer could be checked by a program, which limited it to math and code. Everything else either needed expensive human feedback, a biased and capability-capped external judge, or a learned reward model. This paper wants to make it possible for a model to get meaningfully better at creative writing, summarization, and other subjective tasks purely through self-play, with rewards that are cheap, automatic, unbiased, and fully verifiable, so that the same scaling recipe that built reasoning models can be pointed at the whole universe of open-ended tasks without needing human labels at all.

## What becomes obvious after reading it that was not obvious before

What becomes obvious is that the reason open-ended tasks seemed to resist reinforcement learning was never really about the tasks being unmeasurable. It was about the habit of trying to measure quality directly. Once you stop trying to score a story and instead ask a verifiable question that quality answers, such as "which player was working from incomplete information", the whole problem changes character. The same information that tells you an output is good is information that would out a spy, so quality evaluation can be smuggled into a rule-checkable game. A second thing that becomes obvious is how much of the method's power comes from the mundane engineering details: alternating the two stages instead of training them together is the difference between the method helping and actively hurting, and the role-advantage estimation is what stops the spy's inherent disadvantage from being misread as bad policy. These unglamorous choices matter as much as the clever game concept.

## What long-running problem did this paper move, even slightly

The long-running problem it moved is the problem of reward construction for unverifiable tasks, which has sat at the center of alignment and training research for years. Every previous answer to this problem involved finding a better approximator of human judgment, whether that was more preference data, a better reward model, or a stronger judge. This paper moves the needle by showing a genuinely different route: you do not need a better approximator, you need a better task transformation. It demonstrates on real benchmarks, with human evaluations and cost comparisons, that a self-contained game can produce training signals that are both fully verifiable and strongly aligned with what humans consider good output. It will not have solved the problem in one stroke, but it opens a new direction, one where future work can design richer proxy environments for even more complex open-ended capabilities, and it shows concretely that self-play does not have to be restricted to mathematics and code.
