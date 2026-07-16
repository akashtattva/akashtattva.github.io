---
title: "Self-Distillation Enables Continual Learning"
pubDate: 2026-06-25
tags: ["continual-learning", "self-distillation", "paper-notes"]
---

# Self-Distillation Enables Continual Learning — Detailed Notes

## The Problem: Catastrophic Forgetting

When you teach a neural network something new, it tends to erase what it already knew. This is called catastrophic forgetting. If you train a language model to be good at answering medical questions, it might suddenly become bad at writing code or answering science questions. Humans do not work this way — we can learn new skills without forgetting old ones. This paper tries to bridge that gap.

The standard way to teach a model from examples is called Supervised Fine-Tuning or SFT. You gather a bunch of question-answer pairs and train the model to produce those exact answers. The trouble is that SFT is what the paper calls off-policy. Off-policy means the model is learning from data that was produced by someone else, not by the model itself. This creates a mismatch. The model sees examples of perfect expert behavior during training, but when it has to generate its own answers at test time, it makes small mistakes, drifts into unfamiliar territory, and those errors compound. In a continual learning setting where you train on one task after another, this mismatch causes the model to overwrite its old knowledge with the new task's patterns.

On-policy learning is the alternative. Here, the model learns from its own generated outputs. This works much better for continual learning because the model trains on the kinds of trajectories it actually produces, so there is no mismatch. The catch is that on-policy learning traditionally needs a reward function to tell the model whether its outputs are good or bad. In many real-world situations, you do not have a reward function. You only have a collection of expert demonstrations — someone showed the model how to do the task correctly, but you cannot assign a numeric score to every possible output.

## The Core Idea: Self-Distillation Fine-Tuning (SDFT)

The paper introduces a method called Self-Distillation Fine-Tuning. The idea is to get the benefits of on-policy learning without needing a reward function, using only expert demonstrations. The method relies on a clever observation about how large language models work.

Large language models have a property called in-context learning. If you give them an example in the prompt, they can follow that example to produce a similar kind of output. You have seen this yourself if you have ever used ChatGPT — you give it an example of what you want, and it figures out the pattern. Crucially, the model can do this without any parameter updates. It just uses the example as context.

SDFT exploits this by using the same model in two different roles. In the teacher role, the model is given both the question and an expert demonstration in its prompt. In the student role, the model is given only the question, without the demonstration. The teacher, having seen the example, produces a better, more informed output distribution. The student produces whatever the base model would naturally output.

The training process works like this. For each question, the student generates a response on its own. Then the teacher (which is the same model with the demonstration added to the prompt) computes what probabilities it would assign to each token in that response. The student is then trained to make its own probabilities match the teacher's probabilities. This is called distillation — you are distilling the knowledge from the teacher into the student.

The key detail is that the student trains on its own self-generated responses, not on the demonstration data directly. This makes the training on-policy. The student learns from trajectories it actually produces, avoiding the mismatch problem that plagues SFT.

## Why This Works: The In-Context Learning Assumption

The method depends on a specific assumption. The paper calls it the In-Context Learning Assumption. It says that when you condition the model on an expert demonstration, the model's output distribution approximates what the optimal policy for that task would look like. In other words, seeing the example nudges the model toward correct behavior without distorting its overall distribution too much.

This assumption has two parts. First, the teacher must actually produce good outputs. The paper validates this empirically — on the ToolAlpaca benchmark, the base model scores 42 percent, but the demonstration-conditioned teacher scores 100 percent. The teacher is not just copying the example verbatim; it is genuinely understanding the intent and producing correct responses.

Second, the teacher must stay close to the base model's distribution. If the teacher diverges too much, the student will be trained to match a distribution very different from its own, and you lose the benefits of on-policy learning. The paper measures this too. The KL divergence (a measure of distribution difference) from the base model is 0.68 nats for the demonstration-conditioned teacher, compared to 1.26 nats for a model trained with standard SFT. So the teacher is nearly twice as close to the base model as an SFT model would be.

This proximity matters because prior research has shown that distributions close to the pretrained distribution suffer less catastrophic forgetting. The teacher gives you the best of both worlds — it is highly accurate on the task but stays anchored to the base model's natural behavior.

## The Mathematical Perspective: Connection to Inverse Reinforcement Learning

The paper also shows that SDFT can be understood through the lens of Inverse Reinforcement Learning or IRL. In IRL, you try to infer the reward function that the expert was optimizing, and then you use that reward to do on-policy reinforcement learning. This is theoretically elegant but practically difficult because inferring rewards from demonstrations is hard and requires strong assumptions about the structure of the reward.

SDFT sidesteps this by deriving an implicit reward function directly from the model's own in-context learning behavior. The reward for a particular output is defined as the log-probability ratio between the teacher and the student. If the teacher assigns much higher probability to a token than the student does, that token gets a positive reward — the teacher is saying this is a good choice. If the teacher assigns lower probability, the reward is negative.

The paper proves mathematically that optimizing the policy with respect to this implicit reward is equivalent to minimizing the reverse KL divergence between the student and teacher distributions. So SDFT is essentially doing on-policy RL with a reward that emerges naturally from the model's ability to learn from examples in its context.

## The Experiments: What They Tested

The paper tests SDFT in two main settings. The first is skill learning, where the model already has some general capability and needs to improve on a specific task. The three tasks are Science Q&A (undergraduate chemistry questions), Tool Use (mapping API specifications to correct tool calls), and Medical (clinical reasoning questions).

The second setting is knowledge acquisition. Here the goal is not to improve an existing skill but to inject genuinely new factual information into the model. The paper uses Wikipedia articles about natural disasters that happened in 2025 — after the model's training cutoff, so the model has zero knowledge of them. The model must learn facts about events like the 2025 Myanmar earthquake and answer questions about them.

For each setting, the paper measures two things. First, how well does the model perform on the new task? Second, how much does it forget about its prior capabilities? Prior capabilities are measured using a suite of standard benchmarks covering reasoning, world knowledge, instruction following, and code generation.

The results consistently show SDFT outperforming SFT. On new task accuracy, SDFT achieves higher scores across all three skill learning tasks. On retaining prior capabilities, SDFT shows dramatically less forgetting. For example, after learning Tool Use, the average prior-task performance drops only from 65.5 to 65.4 with SDFT, while SFT drops from 65.5 to 56.0. The difference is stark.

In the knowledge acquisition setting, SDFT achieves 89 percent strict accuracy compared to 80 percent for SFT, and 98 percent on out-of-distribution questions compared to 80 percent for SFT. The out-of-distribution result is particularly telling. It means SDFT is not just memorizing answers; it is actually integrating the new information into the model's knowledge base so the model can answer indirect questions that require reasoning about the learned facts.

## The Sequential Learning Experiment

The most impressive result in the paper is the sequential learning experiment. A single model is trained on all three skills one after the other — first Tool Use, then Science Q&A, then Medical. With SDFT, the model steadily improves on each new task while maintaining performance on the previously learned ones. The normalized performance curves stay flat or rising across all three tasks throughout training.

With SFT, the picture is completely different. Performance on each task spikes during its training phase and then collapses when the next task begins. The curves oscillate wildly. By the end, the model has not accumulated all three skills; it has mostly learned the last task and forgotten the earlier ones.

This experiment demonstrates true continual learning. The model can acquire skills incrementally over time, exactly what foundation models need to do in real-world deployment.

## Training Reasoning Models Without Reasoning Data

One of the most practical findings in the paper concerns reasoning models. Modern reasoning models like OpenAI's o1 or the Olmo-3-7B-Think model used in the paper produce long chains of thought before arriving at an answer. They are trained on data that includes these intermediate reasoning traces.

But what if you only have the final answers, without the reasoning traces? Most real-world datasets are like this. If you naively apply SFT on answer-only data, you actively penalize the model for producing long reasoning chains, because the training loss wants the output to match the short answer. The model's reasoning depth collapses.

SDFT avoids this because the student is trained to match the teacher, not the raw data. The teacher, conditioned on the answer-only demonstration, still produces a full reasoning trace because that is how the base model naturally behaves. The student learns to mimic the teacher's reasoning distribution, not the short answer. The results confirm this. Standard SFT drops accuracy from 31.2 to 23.5 percent and reduces average response length from 4612 tokens to 3273 tokens, indicating reasoning collapse. SDFT improves accuracy to 43.7 percent while keeping response length at 4180 tokens.

## The Importance of On-Policy Learning

The paper runs an ablation study to confirm that on-policy learning is actually necessary. They compare SDFT against two offline alternatives that use the same teacher. In the first, the student is trained via SFT on samples generated by the teacher. In the second, the student minimizes KL divergence on a fixed dataset of teacher outputs. Both alternatives underperform SDFT significantly.

This proves that the benefits of SDFT come from the combination of a good teacher and on-policy training, not from the teacher quality alone. The teacher gives a good target distribution, but the student needs to train on its own trajectories to fully internalize that distribution without creating the mismatch that causes forgetting.

## Relationship to On-Policy Reinforcement Learning

SDFT is not an alternative to on-policy reinforcement learning. It addresses a complementary regime. On-policy RL assumes a reward signal and optimizes expected return through exploration. SDFT works when you have expert demonstrations but no reward function. The two approaches can be combined naturally. Because SDFT improves the diversity and quality of high-probability generations across a wide range of k values in pass@k, it can serve as an effective initialization for subsequent RL fine-tuning. You use SDFT first to get a strong starting policy from demonstrations, then apply on-policy RL with rewards to refine it further.

SDFT also has practical efficiency advantages over typical on-policy RL methods. It requires only a single on-policy generation per prompt, whereas methods like GRPO rely on group-based sampling where multiple generations are produced per prompt to estimate relative advantages. This substantially increases the generation cost for GRPO. Additionally, SDFT provides supervision at the token level or even the logit level, which gives denser credit assignment than the trajectory-level advantage estimates used in GRPO. Every token receives immediate feedback rather than waiting for the full trajectory to finish.

## How the KL Gradient Is Estimated

A technical detail worth understanding is how SDFT actually computes the gradient of the KL divergence between the student and teacher. This is nontrivial because the student's parameters appear both in the sampling distribution and inside the logarithm. The paper considers three estimators.

The token-level partial estimator decomposes the KL into individual token terms and differentiates each independently. It ignores how early token choices affect future token distributions, making it biased. The full analytic per-token estimator computes the KL analytically at each timestep by marginalizing over the entire vocabulary. This has lower variance than the sample-based token estimator but remains biased at the sequence level because it still does not account for how the choice of a token influences future states. Despite this theoretical bias, it leverages quantities already produced during the forward pass, making it computationally attractive. The Rao-Blackwellized estimator is unbiased and has provably lower variance by analytically integrating over next-token distributions while keeping Monte-Carlo sampling over prefixes. However, it is more expensive.

The paper empirically ablates all three. The full analytic per-token estimator consistently yields the most stable optimization and best downstream performance despite its bias. The token-level estimator shows higher variance and weaker KL control. The Rao-Blackwellized estimator did not provide measurable gains relative to its additional complexity. The paper also experimented with drawing multiple trajectories per prompt to reduce variance, but this produced negligible improvements while substantially increasing compute. So the final setup uses a single on-policy rollout per prompt with the analytic per-token KL estimator.

## How the Teacher Model Is Maintained

The teacher is always conditioned on demonstrations, but its weights can be defined in several ways. Using the frozen base model as the teacher yields stable training but consistently underperforms because the teacher never reflects the student's improvements during learning. At the other extreme, using the current student itself as the teacher leads to severe instabilities. Small stochastic fluctuations in token-level probabilities get rapidly amplified through the on-policy feedback loop, causing training to diverge. The paper finds that an exponential moving average or EMA of the student parameters provides an effective compromise. The EMA teacher tracks the student's progress while smoothing high-variance updates, resulting in both stable training and superior final performance.

## Limitations and Failure Modes

SDFT is not a silver bullet. The paper discusses several limitations. First, it costs more than SFT — roughly 2.5 times the FLOPs and 4 times the wall-clock time because the model has to generate on-policy rollouts during training. However, the paper argues that this is competitive with methods that require multiple training stages (like SFT followed by a restoration phase).

Second, SDFT depends heavily on the model's in-context learning ability. Small models with weak ICL do not benefit. The paper shows this explicitly in a scaling experiment. At 3 billion parameters, SDFT actually underperforms SFT. At 7 billion, it pulls ahead by 4 points. At 14 billion, the gap widens to 7 points. As models grow larger and their ICL capabilities improve, SDFT becomes more advantageous.

Third, the student can learn spurious linguistic patterns from the teacher. Because the teacher is conditioned on demonstrations, it might preface responses with phrases like Based on the text or Following the example. The student, even though it receives no demonstration, sometimes reproduces these phrases. The paper handles this by masking the loss over the first few tokens, but calls this a heuristic fix.

Fourth, SDFT cannot handle fundamental behavioral shifts. If you want to transform a non-reasoning model into one that produces explicit chain-of-thought traces, SDFT struggles because the teacher is derived from the base model and cannot produce behaviors the base model does not already have.

## Chase Questions

### What was the research trying to make possible?

The research was trying to make it possible for AI models to keep learning new things over time without forgetting what they already know, using only the kinds of data that are available in real-world settings — expert demonstrations without reward functions. Foundation models today are static after deployment. They cannot update their parameters to acquire new skills or internalize new facts. This paper attempts to unlock continual learning from demonstrations, which is the most practical data format available.

### What assumption does it quietly depend on?

The entire method depends on the assumption that a model conditioned on an expert demonstration produces an output distribution that approximates the optimal policy for that task while staying close to the base model's distribution. This is the In-Context Learning Assumption from Section 3.2. The paper validates it empirically but does not prove it theoretically. If this assumption fails — for example, if the model cannot understand the demonstration, or if the demonstration causes the model to output something completely different from its natural distribution — SDFT would not work. The method also quietly assumes that the base model already has strong enough in-context learning abilities to act as a useful teacher, which is not true for smaller models.

### What becomes obvious after reading it that was not obvious before?

What becomes obvious is that the model's own in-context learning ability is a latent resource that can be repurposed for training without any external supervision. The paper reveals that a model can serve as its own teacher by simply looking at an example in its prompt. This means the gap between off-policy and on-policy learning can be bridged without reward engineering or inverse reinforcement learning. The other thing that becomes obvious is that on-policy learning is not just about preventing forgetting — it also produces better generalization and higher accuracy on the task itself. The paper shows this consistently across multiple settings.

### Where does the idea break if you push it outside the paper?

The idea breaks in several places. If you apply it to a small model, it does not just degrade gracefully — it actively underperforms SFT. If you try to change the model's fundamental behavior (like turning a non-reasoning model into a chain-of-thought model), it fails because the teacher cannot demonstrate behavior the base model does not already produce. If you have noisy or suboptimal demonstrations, the teacher would inherit that noise, and the student would learn bad patterns. The paper explicitly does not test this scenario. If you need to learn hundreds or thousands of tasks sequentially, it is unclear whether the small residual forgetting observed in the paper would accumulate and eventually become catastrophic. The paper only tests three tasks.

### What long-running problem did this paper move, even slightly?

The paper moved the problem of continual learning from demonstrations. Before this work, the evidence for on-policy learning reducing forgetting came mostly from reinforcement learning settings where reward functions were available. This paper showed that the same benefits can be obtained from demonstrations alone, using a simple and practical method. It also connected on-policy distillation to inverse reinforcement learning in a theoretically grounded way, showing that an implicit reward can be derived from in-context learning. While SDFT is not the final solution to continual learning, it established that on-policy distillation from demonstrations is a viable path, which opens the door to combining it with other techniques like experience replay or regularization-based methods to further reduce the remaining forgetting.
