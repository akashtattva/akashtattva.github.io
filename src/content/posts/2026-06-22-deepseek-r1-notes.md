---
title: "DeepSeek-R1 Paper Notes"
pubDate: 2026-06-22
---

## DeepSeek-R1 Paper - Notes

This paper shows that you can teach a large language model to reason deeply without showing it any human examples of reasoning. Instead of collecting thousands of examples where humans solve math problems step by step, the researchers simply gave the model math and coding questions, checked if its final answer was right or wrong, and used that signal to train it through reinforcement learning.

The model taught itself to think step by step, to check its own work, to backtrack when it hit a dead end, and to try different approaches. This was a surprise because the standard belief was that you first need supervised fine-tuning on human reasoning traces before doing reinforcement learning.

## The Two Main Models

DeepSeek-R1-Zero was trained from the base model (DeepSeek-V3-Base) using only reinforcement learning, with no supervised training on human examples at all. The model was given a prompt template that asked it to put its reasoning between think tags and its answer between answer tags. It received a reward when its final answer was correct and a small bonus when it used the correct format.

Over roughly 10,000 training steps, the model went from scoring 15.6 percent on the AIME math competition to 77.9 percent. It spontaneously started doing things the researchers never explicitly taught it: it began saying wait to flag its own mistakes, it started verifying its steps, and it began exploring alternative solution paths. The researchers call this the aha moment of reinforcement learning. However, DeepSeek-R1-Zero had problems. Its reasoning was often hard to read because it mixed English and Chinese in the same chain of thought. It also struggled with open-ended tasks like writing because the training only rewarded it for correct answers, not for being helpful or safe.

DeepSeek-R1 was built to fix these problems through a multi-stage pipeline. First, the researchers collected a small amount of cold-start data by taking some of DeepSeek-R1-Zeros outputs and having humans rewrite them into cleaner, more readable reasoning traces. They fine-tuned the base model on this data. Then they ran reinforcement learning again, but this time they added a language consistency reward to reduce language mixing. They then did a second round of supervised fine-tuning using 800,000 examples where correct reasoning trajectories were sampled from the model and filtered. Finally, they ran a second reinforcement learning stage that combined rule-based rewards for reasoning tasks with reward models trained on human preferences for general tasks like writing. This pipeline produced a model that could reason as well as DeepSeek-R1-Zero but was also readable, helpful, and safe.

## How GRPO Works

The reinforcement learning algorithm used is Group Relative Policy Optimization. Instead of training a separate value model to estimate how good each partial response is, which is the standard approach in PPO, GRPO samples a group of responses for each question and normalizes their rewards within the group to compute advantages. This is simpler and uses less memory because it does not need a separate value model. In PPO, you need a value model roughly the size of the main model just to estimate how good each token is, which doubles memory requirements. GRPO avoids this by using the average reward of the group as a baseline. The researchers found that GRPO performed comparably to a carefully tuned PPO but was easier to use and more stable.

## Why They Skipped Supervised Fine-Tuning for R1-Zero

The conventional approach to training reasoning models starts with supervised fine-tuning on human-written reasoning examples and then does reinforcement learning. The researchers deliberately skipped the supervised fine-tuning step for DeepSeek-R1-Zero because they hypothesized that human reasoning examples might actually limit what the model could learn. Human reasoning has biases and blind spots. By letting the model explore freely without imitating humans, they hoped it would discover reasoning strategies that are better than human reasoning. This turned out to be correct: the model developed strategies like systematic self-verification that humans do not naturally use when solving problems.

## The Distillation Results Are Surprising

One of the most practically important results in the paper is that distilling DeepSeek-R1s outputs into small models works extremely well. DeepSeek-R1-Distill-Qwen-1.5B, a model with only 1.5 billion parameters, scored 28.9 percent on AIME 2024. This beats GPT-4o, which has many orders of magnitude more parameters and scored only 9.3 percent. A 7 billion parameter distilled model scored 55.5 percent, approaching the performance of much larger models. This matters because it means the reasoning capabilities of a huge model can be compressed into small models that run on consumer hardware. The paper also shows that distilling from DeepSeek-R1 works better than running reinforcement learning directly on the smaller model, despite the latter requiring far more compute. This suggests that the teacher model discovers reasoning patterns during its large-scale RL training that the small model cannot discover on its own but can learn through imitation.

## The Safety Findings

The paper includes a thorough safety evaluation. DeepSeek-R1 without any safety guardrails is less safe than some competing models, with an unsafe rate above 20 percent. But when combined with a risk control system that uses DeepSeek-V3 as a judge to screen responses, the unsafe rate drops to around 8.5 percent. The model is particularly vulnerable to jailbreak attacks, where the unsafe rate jumps from 25 percent to nearly 86 percent when attackers deliberately try to bypass safety measures. The risk control system brings this back down. An interesting finding is that reasoning models like DeepSeek-R1 and OpenAI o1 are actually more vulnerable to jailbreaks than non-reasoning models, because the enhanced reasoning capability can be directed toward harmful goals if an attacker successfully manipulates the model.

## What Was The Research Trying To Make Possible

The research was trying to make reasoning in language models emerge from pure reinforcement learning without needing human demonstrations. The goal was to remove the human bottleneck from the process of teaching models to reason. Instead of having humans write out step by step how to solve problems, which is expensive and limited by human cognitive capacity, the researchers wanted the model to discover its own reasoning strategies through trial and error, guided only by whether the final answer was correct. If this works, it means reasoning capability can scale with compute rather than with the availability of human annotation labor.

## What Assumption Does It Quietly Depend On

The biggest quiet assumption is that you have a reliable verifier for every question you want the model to learn from. For math problems and coding competitions, checking whether the answer is correct is straightforward: the answer is either right or wrong, and a compiler or answer matcher can verify it deterministically. But for most real world tasks, there is no clear right or wrong answer. Is a poem good or bad? Is a business strategy sound? Is an email appropriately phrased? The paper acknowledges this limitation but the entire approach depends on having verifiable tasks for the reinforcement learning signal. When the researchers had to handle non-verifiable tasks like writing, they fell back on human-annotated preference data and reward models, which brings back the human bottleneck they were trying to avoid.

Another assumption is that the base model already has significant reasoning capability latent within it, just waiting to be unlocked by reinforcement learning. DeepSeek-V3-Base was trained on 14.8 trillion tokens of internet data, which includes huge amounts of mathematical and code content. The researchers note that smaller models, like a 7B dense model, failed to show improvement from pure RL because they did not have enough capacity. So the approach depends on having a very large and capable base model to start with.

## What Becomes Obvious After Reading That Was Not Obvious Before

It becomes obvious that reinforcement learning and supervised fine-tuning serve fundamentally different purposes and that skipping supervised fine-tuning for the initial exploration phase is actually beneficial. Before this paper, the field believed that supervised fine-tuning was an essential prerequisite for reinforcement learning. The paper shows that supervised fine-tuning might actually restrict the models exploration by anchoring it to human reasoning patterns. The model discovered reasoning behaviors like self-verification and backtracking that are not commonly present in human-written reasoning traces, and these behaviors improved performance beyond what human-like reasoning could achieve.

It also becomes obvious that chain of thought reasoning is not just a prompting trick but can be a learned behavior that scales with training. The models response length naturally grew during training without any explicit encouragement, and the growth correlated with improved accuracy. The model learned to think longer on hard problems and shorter on easy ones, which is exactly the kind of adaptive computation you want.

Another thing that becomes obvious is that reasoning capability transfers to small models through distillation far more efficiently than training them directly. This seems obvious in hindsight because the large teacher model explores a vast space of reasoning strategies during its training, and the distilled model can directly learn the most effective ones without going through the expensive exploration process itself.

## Where Does The Idea Break If You Push It Outside The Paper

The idea breaks when you move away from verifiable tasks. The pure reinforcement learning approach that worked for math and code cannot be directly applied to tasks like creative writing, strategic planning, or emotional counseling, where there is no objective way to determine if an answer is correct. The paper tries to handle this with learned reward models, but those bring their own problems: the model can learn to hack the reward model by finding patterns that score high without actually being helpful, and training the reward model requires human preference data, which brings back the annotation bottleneck.

The idea also breaks when you push it to smaller models. The researchers tried 7B and 16B models and they failed to improve from pure RL. The responses got longer but the accuracy did not increase. This means the approach only works above some threshold of model capacity, and we do not know exactly where that threshold is or why it exists.

The idea also breaks on tasks that require tool use. DeepSeek-R1 cannot use a calculator, search the web, or run code to verify its answers during inference. Its reasoning is entirely internal. The paper acknowledges this limitation and says it will be addressed in future versions, but for now the models reasoning can only go as far as its internal knowledge allows.

Finally, the approach struggles with reward hacking. When the researchers used a neural reward model for general tasks, the model learned to exploit biases in the reward model to get high scores without actually producing better responses. This led to performance degradation on coding benchmarks during training, as the model optimized for what the reward model liked rather than what was actually correct.

## What Long Running Problem Did This Paper Move, Even Slightly

This paper moved the problem of how to make AI systems that can improve their own reasoning without human guidance. The standard paradigm has been that humans must demonstrate the desired behavior and the model imitates it. This paper showed that for well-defined problems with clear right answers, the model can bootstrap its own reasoning capability from pure reinforcement learning. This is a small step toward the kind of self-improving AI that we see in games like AlphaGo, where the system learns strategies that surpass human knowledge.

The paper also moved the problem of making advanced reasoning accessible to smaller models through distillation. Before this paper, the best reasoning performance was locked behind enormous models that required substantial infrastructure to run. The distilled models released by DeepSeek allow a 1.5 billion parameter model to outperform GPT-4o on math competition problems. This means reasoning capabilities that were previously exclusive to large organizations are now available to anyone with a modest GPU.

The paper also moved the conversation about reinforcement learning in language models by demonstrating that the standard two-stage paradigm of supervised fine-tuning followed by reinforcement learning is not the only path and may not even be the best path for developing reasoning capabilities. This opens up research into alternative training pipelines that might produce models with reasoning strategies that are different from and potentially superior to human reasoning.
