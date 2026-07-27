---
title: "Reinforcement Learning via Self-Distillation Paper Notes"
pubDate: 2026-07-02
tags: ["reinforcement-learning", "self-distillation", "paper-notes"]
---

Reinforcement Learning via Self-Distillation: Detailed Paper Notes

Reinforcement Learning via Self-Distillation

This paper introduces a new method called Self-Distillation Policy Optimization (SDPO) for training large language models (LLMs) using reinforcement learning. The central problem the paper addresses is that current reinforcement learning methods for LLMs, particularly those used in domains like code generation and math where answers can be verified, suffer from a severe credit assignment bottleneck. In these settings, the model receives only a scalar reward at the end of an attempt, usually just a number indicating success or failure, and this single number tells the model almost nothing about which specific parts of its reasoning or code were correct or wrong. The paper proposes that many environments actually provide much richer feedback, such as runtime error messages, failing test cases, or evaluations from an LLM judge, and that this feedback can be used to dramatically improve learning efficiency. The core insight is that the same model can serve as both the student attempting a problem and a teacher that evaluates its own attempt after seeing the feedback. By conditioning the model on the feedback it received, the model can look back at its original response and identify which tokens were mistakes and which were correct, producing a dense, per-token learning signal instead of just a single scalar number for the entire sequence. This is fundamentally different from traditional reinforcement learning approaches that can only say the whole answer was right or wrong without pinpointing where things went wrong.

Reinforcement Learning with Verifiable Rewards versus Reinforcement Learning with Rich Feedback

The paper distinguishes between two settings. The first is Reinforcement Learning with Verifiable Rewards, abbreviated as RLVR, which is the dominant approach used today. In RLVR, the model generates an answer, the environment evaluates it, and the model receives a scalar reward such as zero or one indicating correctness. This is like a teacher handing back a test with just a checkmark or X, without any comments explaining the reasoning. The second setting is what the authors call Reinforcement Learning with Rich Feedback, or RLRF. In RLRF, the environment provides tokenized feedback, meaning text-based information about what went wrong. For example, instead of just getting a zero for a wrong answer, the model might see a runtime error message like "ZeroDivisionError: division by zero at line 73" or a detailed explanation of which test cases failed and why. The paper argues that RLVR creates an information bottleneck because the scalar reward masks the underlying state of the environment. When all attempts in a group receive the same reward, typically zero, the learning signal collapses to nothing and training stalls. RLRF removes this bottleneck by providing the model with detailed, interpretable information about each attempt, enabling the model to learn not just that it was wrong, but specifically what was wrong and how to fix it.

![Figure 2: Comparison of RLVR and RLRF settings](/assets/img/fig2_rlvr_vs_rlrf_and_fig3_feedback.webp)

*Figure 2 illustrates the difference between RLVR (scalar reward bottleneck) and RLRF (rich feedback). The same page also shows Figure 3 with an example of LeetCode-style code execution feedback (runtime errors, failed test cases).*

The Self-Teacher Mechanism

The key innovation of SDPO is the self-teacher mechanism. When the model generates a response to a question, it first acts as the student. After receiving feedback from the environment, the model is re-prompted with both the original question and the feedback, and it now acts as the teacher. The teacher sees the feedback in its context, which transforms its next-token probability distribution. Because the teacher has this extra information, it can agree or disagree with the student's original choices at specific token positions. For instance, if the student produced code that caused a division by zero error, the teacher, seeing that error message, might assign a very different probability to the token that caused the error compared to the student. The teacher then compares its own predictions to the student's predictions at every token position. If the teacher thinks a particular token should have been different, that token gets a negative advantage, meaning the model should stop doing that. If the teacher agrees with the student's token, that token gets a positive advantage, meaning the model should continue doing that. This produces a dense, per-token credit assignment signal that tells the model exactly where and how its response was wrong. Crucially, this mechanism has no sampling overhead because the system simply re-computes the log-probabilities of the original attempt under the teacher's feedback-augmented context.

![Figure 4: Example of self-teaching with Qwen3-8B](/assets/img/fig4_self_teaching.webp)

*Figure 4 shows the self-teacher mechanism in action: the model first generates an answer, then re-evaluates log-probs of the original attempt after seeing feedback. Blue tokens receive positive advantage (teacher agrees), red tokens receive negative advantage (teacher disagrees).*

The SDPO Algorithm and Its Gradient

SDPO works through a simple iterative process. First, the model samples a batch of questions from the dataset. For each question, it generates multiple responses. These responses are evaluated by the environment to obtain feedback. Then, for each response, the system computes two sets of log-probabilities: the student's log-probabilities (without feedback in context) and the teacher's log-probabilities (with feedback in context). The loss function minimizes the KL divergence between these two distributions at each token position. The gradient of this loss can be expressed as a policy gradient where the advantages are estimated using the self-teacher. Specifically, the advantage for each token is the log ratio of the teacher's probability to the student's probability of that token. This means tokens that are more likely under the teacher receive positive advantages, while tokens that are less likely under the teacher receive negative advantages. The paper shows that SDPO can be implemented with minimal changes to standard RLVR pipelines by simply swapping out the advantage estimates used in methods like GRPO.

Comparison to GRPO and Other Methods

Group Relative Policy Optimization, or GRPO, is the main baseline that SDPO is compared against. GRPO works by sampling a group of responses for each question, computing advantages based on which responses in the group were better, and then updating the policy accordingly. However, GRPO has two major limitations that SDPO addresses. First, GRPO uses Monte Carlo estimates of advantages, which are constant across all tokens in a response. This means every token in a wrong response gets the same negative advantage, even though some tokens might be perfectly fine and only specific tokens are causing the error. SDPO, by contrast, assigns individual advantages to each possible next token at each position, providing much more fine-grained learning signal. Second, GRPO relies on scalar rewards that create an information bottleneck. SDPO leverages rich feedback to provide the model with detailed information about what went wrong. The paper also compares SDPO to distillation methods, where a strong teacher model provides dense token-level supervision. The key difference is that traditional distillation requires an external teacher model that is typically much larger and more capable than the student. SDPO does not require any external teacher because it uses the current model itself as the teacher, conditioned on the rich feedback it receives. This makes SDPO applicable in online learning settings where the goal is to improve the model beyond the capabilities of any existing teacher.

Compute Time and Memory Overhead

The paper addresses practical concerns about the computational cost of SDPO. The only additional computation compared to GRPO is computing the log-probabilities from the self-teacher, which can be parallelized and is substantially faster than generating new responses. The paper shows that SDPO adds only about 5.8 percent to 17.1 percent compute overhead compared to GRPO, depending on whether a code execution environment is involved. To handle memory concerns, SDPO uses top-K distillation, where it only computes the top-K most likely tokens under the student and the corresponding probabilities under the teacher, along with a tail probability term capturing the remaining tokens. With a reasonable choice of K, such as K=100, this avoids virtually any memory overhead while capturing most of the information.

![Figure 5: Time per step comparison](/assets/img/fig5_compute_overhead.webp)

*Figure 5 shows the wall-clock time per training step for SDPO vs GRPO. SDPO adds only ~5.8–17.1% overhead, with the majority of time spent on response generation (Gen) rather than the self-teacher log-prob computation.*

Stability Improvements

Two practical modifications are found to significantly improve SDPO training stability. The first is using a regularized self-teacher, implemented either through an exponential moving average of the student parameters or by interpolating the current teacher with the initial teacher. This prevents the teacher from diverging too quickly from the initial model. The second is using the symmetric Jensen-Shannon divergence for the distillation loss instead of the standard KL divergence. This formulation has been shown to improve stability in on-policy distillation from external teachers. The paper demonstrates that these modifications are important because a non-regularized teacher significantly underperforms regularized teachers. However, SDPO performs well even with a frozen teacher, showing that the core mechanism is robust.

Learning without Rich Environment Feedback

An important contribution of the paper is showing that SDPO works even in standard RLVR environments that do not provide any feedback beyond scalar rewards. In this setting, SDPO treats successful attempts sampled in the current batch as implicit feedback for failed attempts on the same question. When a group of responses is generated for a question, and one or more of them are correct, those correct responses serve as sample solutions. The self-teacher can then compare the student's failed attempt with the successful attempt and identify where the student went wrong. This is evaluated on science questions covering chemistry, physics, biology, and materials science, as well as tool use tasks where the model must map a tool API specification to the correct tool call. The results show that SDPO substantially outperforms GRPO across most tasks, often achieving the accuracy of five hours of GRPO training after only one hour of SDPO training. For example, on chemistry tasks with Olmo3-7B-Instruct, SDPO achieves more than ten percentage points higher final accuracy than GRPO.

![Figure 6: Training progression of Olmo3-7B-Instruct on Chemistry](/assets/img/fig6_training_progression.webp)

*Figure 6 (left) shows SDPO achieving higher accuracy faster than GRPO on Chemistry tasks. (Right) Response lengths over training — SDPO maintains significantly shorter generations.*

Reasoning Conciseness

A particularly interesting finding is that SDPO produces substantially shorter responses than GRPO while achieving higher accuracy. On average, SDPO responses are more than three times shorter than GRPO responses. The paper observes that GRPO's longer responses often stem from superficial reasoning patterns such as filler phrases like "Hmm" and "Wait," or circular logical loops that repeat previous steps verbatim. The paper provides a concrete example where GRPO generates a response with over five thousand tokens that includes the phrase "Wait I'm going in circles," while SDPO produces a correct answer in under eight hundred tokens with no such circular reasoning. The paper argues that SDPO's dense credit assignment, which assigns individual advantages to each token, leads to sparse advantages that help the model avoid these superficial patterns. This demonstrates that effective reasoning need not always be verbose and that reasoning performance can be improved by refining how the model reasons, not just how long it reasons.

![Figure 7: Example responses from GRPO and SDPO](/assets/img/fig7_response_comparison.webp)

*Figure 7 shows a concrete chemistry question where GRPO produces 5000+ tokens with circular reasoning ("Wait I'm going in circles"), while SDPO answers correctly in under 800 tokens with no filler.*

Learning with Rich Environment Feedback on Coding Tasks

The paper evaluates SDPO on competitive programming problems from LiveCodeBench v6, which contains contest-style coding problems ranging from simple to competition-level. These problems provide rich feedback in the form of runtime errors and failed unit tests, making them a natural fit for the RLRF setting. The results show that SDPO achieves substantially higher final accuracy than GRPO, reaching 48.8 percent versus 41.2 percent, and also outperforms the strongest instruct models on the public leaderboard, including Claude Sonnet 4 at 40.5 percent and Claude Opus 4 at 39.7 percent. The paper finds that SDPO particularly improves over GRPO on medium and hard questions, highlighting the importance of rich feedback for challenging tasks.

![Figure 1: SDPO substantially outperforms GRPO on LiveCodeBench v6](/assets/img/fig1_main_results.webp)

*Figure 1 shows the learning curves: SDPO (blue) achieves 48.8% final accuracy vs GRPO (orange) at 41.2% with Qwen3-8B, outperforming even Claude Sonnet 4 (40.5%) and Opus 4 (39.7%).*

Self-Distillation Benefits from Stronger Models

A central question for the paper is whether SDPO is sensitive to the in-context learning ability of the base model. The paper performs a scaling study with different model sizes from the Qwen3 family and finds that SDPO significantly outperforms GRPO on larger models while only slightly improving over GRPO on smaller models. The ability of the teacher to perform accurate retrospection appears to be an emergent phenomenon with scale, meaning that as models become larger and better at in-context learning, the self-teacher becomes more effective at identifying mistakes and providing useful feedback. This suggests that SDPO's benefits will continue to grow as language models improve.

![Figure 8: SDPO improves with model size](/assets/img/fig8_scaling.webp)

*Figure 8 compares final LCBv6 accuracy across Qwen3 model sizes. SDPO's advantage over GRPO grows with scale — the self-teacher's retrospection ability is an emergent phenomenon.*

Dense Credit Assignment in SDPO

The paper performs an important ablation study to understand whether the performance gains come from leveraging rich feedback or from dense credit assignment. It compares three variants: logit-level SDPO with credit assignment over the top 100 tokens, token-level SDPO with credit assignment over only the most likely token, and sequence-level SDPO that averages advantages across all tokens to produce a single scalar advantage per sequence. The results show that logit-level SDPO significantly outperforms token-level and sequence-level SDPO, demonstrating that dense credit assignment is important. However, even sequence-level SDPO outperforms GRPO, indicating that leveraging rich feedback can lead to gains even without dense credit assignment. This means that the benefits of SDPO come from both using rich feedback and from the per-token credit assignment.

![Figure 9: Dense credit assignment in SDPO](/assets/img/fig9_credit_assignment.webp)

*Figure 9 visualizes the per-token advantages assigned by the self-teacher for the example from Figure 4. Blue tokens receive positive advantage, red tokens negative — the model learns exactly which tokens caused the error.*

The Self-Teacher Improves During Training

Unlike standard distillation where the teacher is fixed, the self-teacher in SDPO improves throughout training. The paper shows that the self-teacher's accuracy increases significantly during training and eventually surpasses the initial teacher's accuracy. This demonstrates that SDPO enables true bootstrapping of a weak model to a strong model, without the initial self-teacher's performance limiting the final student. The paper also shows that regularized teachers, whether trust-region or EMA, outperform the teacher frozen at the initial parameters, confirming that the teacher improves through parameter sharing with the student.

Avoiding Catastrophic Forgetting

The paper evaluates whether SDPO avoids the catastrophic forgetting that can occur when training on new tasks. It tests the final checkpoints on diverse holdout tasks including IFEval for instruction following, ArenaHard-v2 for real-world prompts, and MMLU-Pro for broad knowledge. The results show that SDPO learns the new task while mitigating degradation of initial capabilities, achieving a better performance-forgetting tradeoff than GRPO. The paper also compares against a baseline of supervised fine-tuning on successful generations from the self-teacher, which significantly underperforms SDPO on the training task and leads to worse forgetting, confirming that on-policy learning is essential.

Combining GRPO and SDPO

The paper explores whether GRPO and SDPO can be combined by taking a weighted average of their advantages. It finds that the combined method appears more robust to weaker models than SDPO alone, because on weaker models the SDPO advantages are less reliable and the GRPO signal helps stabilize training. However, on stronger models like Qwen3-8B, the combined method slightly underperforms pure SDPO, suggesting that the scalar reward signal from GRPO can be actively harmful with strong initial models. This highlights a fundamental tension between Monte Carlo rewards and feedback-based advantages.

Test-Time Self-Distillation

The paper introduces a novel application of SDPO called test-time self-distillation, where the model is given only a single hard question and must discover a solution as quickly as possible. The key metric is discovery-k, which measures the probability of discovering at least one solution within k attempts. This contrasts with standard RLVR methods, which only begin learning after the first solution has been found because they receive no signal until then. SDPO can learn from failed attempts because it receives rich feedback even when the answer is wrong. At test time, SDPO repeatedly attempts a hard question, receives feedback, and updates its weights through self-distillation. This compresses the interaction history directly into the model parameters rather than relying on the context window, which is limited by the transformer's maximum sequence length.

![Figure 12: Compressing context into model weights via self-distillation](/assets/img/fig12_testtime.webp)

*Figure 12 illustrates the test-time self-distillation process: the model repeatedly attempts a fixed hard question, receives feedback, and updates its weights through self-distillation, compressing interaction history directly into parameters.*

The results show that SDPO achieves higher discovery rates than both best-of-k sampling and multi-turn conversation baselines on both hard and very hard questions. For very hard questions where the base model's pass-64 is below 3 percent, SDPO discovers a solution in 53.2 percent of cases compared to 35.6 percent for multi-turn and 41.5 percent for best-of-k. Most remarkably, on one very hard question that neither best-of-k nor multi-turn sampling could solve within 2750 attempts, SDPO discovered a solution after only 321 attempts.

![Figure 13: Self-distillation at test-time solves hard questions](/assets/img/fig13_testtime_results.webp)

*Figure 13 compares discovery@k for SDPO, multi-turn sampling, and best-of-k on very hard (left) and hard (right) LCBv6 questions. SDPO achieves substantially higher discovery rates at almost all generation budgets.*

Connection to Maximum Entropy RL

The paper shows that the SDPO objective is mathematically equivalent to maximum entropy reinforcement learning with an implicit reward function defined by the self-teacher. This means SDPO can be understood as optimizing a policy to maximize both expected reward and entropy, where the reward at each token is implicitly defined by how the teacher's distribution differs from the student's. This connection also links SDPO to inverse reinforcement learning, where the goal is to recover an unknown reward function from behavior. In SDPO, the student learns an implicit reward function defined by the retrospective teacher.

Limitations of SDPO

The paper acknowledges several limitations. First, SDPO's performance depends on the model's in-context learning ability, meaning it is primarily applicable for training stronger base models and can underperform GRPO on weaker models. Second, performance depends on the quality of environment feedback. If the environment provides uninformative or misleading feedback, the model may not learn effectively from it. Third, SDPO adds a small computational overhead for computing the teacher's log-probabilities, which may be larger for smaller models with shorter generation lengths. Finally, the paper notes that SDPO was evaluated primarily on verifiable domains, and its effectiveness in open-ended text generation or continuous-reward tasks remains an open question.

What the Research Was Trying to Make Possible

The research was trying to make it possible for language models to learn effectively from detailed, tokenized feedback during reinforcement learning, rather than being limited to a single scalar number indicating success or failure. The goal was to remove the information bottleneck that prevents current RL methods from providing dense learning signals, enabling models to identify exactly which parts of their reasoning were wrong and how to fix them, all without requiring access to a stronger external teacher model.

What Assumption Does It Quietly Depend On

The paper quietly depends on the assumption that language models have strong enough in-context learning abilities to perform accurate retrospection. This means the model must be capable of reading feedback about its own mistakes and correctly identifying where it went wrong. The paper shows this ability scales with model size, but it means SDPO fundamentally will not work well on smaller or weaker models that lack this capability. It also assumes that the environment feedback is informative and accurate enough for the model to learn from.

What Becomes Obvious After Reading It That Was Not Obvious Before

After reading the paper, it becomes obvious that the same language model can simultaneously serve as both the student learning from mistakes and the teacher providing dense supervision, just by changing what information is included in its context. It also becomes obvious that much of the verbosity in RL-trained models, the filler words and circular reasoning, is not a sign of deeper thinking but rather a symptom of sparse credit assignment that does not distinguish between good and bad tokens within a response. Additionally, it becomes clear that test-time training through self-distillation can compress unlimited interaction history directly into model weights, bypassing the context window limitation that limits multi-turn conversation approaches.

Where Does the Idea Break If You Push It Outside the Paper

The idea breaks down in settings where the environment does not provide informative feedback or where the feedback is too noisy for the model to learn from. In open-ended creative writing, for example, there is no clear feedback about what is wrong, so the self-teacher would have nothing meaningful to condition on. The idea also breaks down for very small models that cannot perform accurate in-context learning, as the self-teacher would provide unreliable credit assignment. Furthermore, the approach assumes that the model can improve by conditioning on feedback about a single attempt, but in long-horizon agentic settings with many steps, the feedback may not be sufficient to assign credit across a long sequence of actions.

What Long-Running Problem Did This Paper Move

This paper moved the long-running problem of credit assignment in reinforcement learning for language models, specifically the limitation that models can only learn from sparse, scalar outcome rewards. For decades, reinforcement learning has struggled with the question of how to attribute success or failure to specific actions within a sequence, and this paper provides a practical solution for language models by leveraging their in-context learning abilities and rich environment feedback. It also made progress on the problem of how to train models without access to stronger external teachers, showing that models can bootstrap themselves into stronger versions through self-distillation. Finally, it addressed the practical challenge of discovering solutions to very difficult problems where standard RL methods cannot even begin learning because they have never found a correct solution.
