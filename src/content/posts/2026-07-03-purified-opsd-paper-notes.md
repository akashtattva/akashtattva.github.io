---
title: "Purified OPSD Paper Notes"
pubDate: 2026-07-03
tags: ["self-distillation", "reasoning", "paper-notes"]
---

Purified OPSD Notes

This paper is about a very specific failure in training reasoning language models. The authors study on-policy self-distillation, called OPSD, for models that use long chain-of-thought reasoning. The main point is that ordinary OPSD looks promising because it lets a model learn from its own generated attempts while a stronger or privileged version of the model gives token-level feedback. But for long reasoning models, the paper finds that this setup can quietly damage the very behavior that makes these models good at reasoning. Instead of improving the model's ability to think through a problem, standard OPSD often teaches it to imitate reference-specific shortcuts.

# The Central Problem

Long chain-of-thought models do not just output short answers. They often spend many tokens exploring a problem, checking assumptions, changing direction, and correcting themselves. This reflective process matters because the model usually does not know the answer immediately. It has to search through possible paths. Standard OPSD gives the teacher access to the reference solution while the student does not have that reference at test time. That sounds helpful because the teacher can tell the student which next tokens are better. The problem is that the teacher has privileged information. Since the teacher already sees the reference solution, it may no longer behave like a model that needs to reason. It may push the student toward tokens that match the reference answer path, even when those tokens are not useful signals for independent problem solving.

The paper argues that this mismatch is especially harmful for long-CoT models. These models depend on reflective reasoning patterns, such as pausing, reconsidering, and checking their own work. If training pushes them too directly toward the reference, it can erase or distort those patterns. The model may become less able to explore. It may also overproduce shallow reflection words without doing real reflection. In both cases, the model loses the natural reasoning behavior it had before training.

What OPSD Is Supposed To Do

In on-policy self-distillation, the student model generates its own reasoning trajectory for a question. This is important because the student trains on the kinds of states it actually visits, rather than only copying traces produced by another model. After the student generates a partial answer, a teacher distribution gives token-level guidance. In this paper's setting, the teacher is privileged because it sees the question and the reference solution. The training objective then tries to make the student distribution closer to the teacher distribution at each token position, using a Jensen-Shannon divergence style loss.

The intended benefit is that the teacher can correct the student's own mistakes. Because the student generates the trajectory, the training is on-policy. Because the teacher has the reference, it can provide dense feedback even when the student's trajectory is imperfect. In principle, this should reduce the train-test mismatch that appears in ordinary supervised distillation, where the student learns from traces it did not produce itself. The paper accepts this motivation but shows that the privileged reference creates a new problem.

Why Standard OPSD Fails On Long-CoT Models

The authors test standard OPSD on four long-CoT models: Qwen3-8B, Qwen3-4B, DeepSeek-R1-Distill-Qwen-7B, and OLMo-7B-Thinking. They train using datasets with reference solutions and evaluate on hard math benchmarks such as AIME 2024, AIME 2025, and HMMT 2025. The first result is that standard OPSD gives little or no durable improvement. Sometimes it briefly improves a checkpoint, but then performance drops. In many settings it performs worse than the base model.

This matters because OPSD is not merely failing to add value. It is changing the model in a damaging way. The model is being trained, the loss is being optimized, and the teacher is providing dense token-level information, but the useful reasoning ability does not improve. The paper's claim is that this happens because most of the training signal is not actually about solving the question. It is about reproducing information that comes from the reference solution.

Epistemic Markers And Reflective Reasoning

To understand what is being damaged, the authors track epistemic markers. These are words or phrases such as "Wait", "Maybe", "Perhaps", and "Let me think". In long-CoT models, these markers often appear when the model externalizes uncertainty, checks a line of reasoning, or changes course. The authors do not claim that these tokens alone prove deep reasoning. Instead, they use them as a visible proxy for the model's reflective behavior.

The results show strange behavior under standard OPSD. For Qwen3-8B, epistemic markers collapse. The model uses far fewer of these reflective words as training progresses. For R1-Distill-Qwen-7B, the total count explodes, but the increase is concentrated mainly in the word "Wait". That suggests repetitive or degenerate behavior rather than healthy reflection. One model loses reflection signals, while another overproduces a narrow reflection token. Both patterns are bad because they show that training is disturbing the model's natural thinking style.

The paper connects these marker changes to performance degradation. If a model stops using reflective moves, it may stop checking itself. If it repeats one marker too much, it may imitate the surface form of thinking without doing useful reasoning. The key idea is that long-CoT performance depends not only on final answers but also on the structure of the reasoning process. Standard OPSD appears to disturb that structure.

The Teacher Signal Decomposition

The most important technical idea in the paper is a decomposition of the teacher's supervision signal. The authors compare three distributions. The first is the current student distribution, which predicts the next token from the question and the student's generated prefix. The second is the normal privileged teacher distribution, which sees the question, the generated prefix, and the reference solution. The third is a reference-only teacher distribution, which sees the generated prefix and the reference solution but not the question.

The reference-only teacher is the key diagnostic tool. If the teacher can predict certain next tokens just from the reference solution, without seeing the question, then that part of the signal is probably not transferable to test time. At inference time, the student will not have the reference solution. So any training pressure that exists even when the question is removed is suspicious. It is likely reference-induced rather than reasoning-induced.

The authors write the total teacher update as the difference between the privileged teacher and the student. Then they split it into two parts. The first part is the reference-induced component, which is the difference between the reference-only teacher and the student. The second part is the residual between the full teacher and the reference-only teacher. This residual is called the inference-transferable component because it measures what changes when the question is added on top of the reference-conditioned context.

What The Decomposition Shows

The decomposition shows that the reference-induced component dominates standard OPSD. It dominates in direction, meaning the total update points mostly where the reference-only signal points. It also dominates in magnitude, meaning the reference-only component can be larger than the total update itself. When a component is larger than the total update, it means the other component is partly canceling it rather than reinforcing it.

This is a strong diagnosis. If OPSD were working as intended, the total update should mostly align with the inference-transferable residual. That would mean the teacher is helping the student learn what is useful for solving the problem. Instead, the update mostly aligns with the reference-induced component. This means the teacher is mostly pulling the student toward information that comes from the reference solution, not toward independent reasoning that will be available at test time.

The paper also observes a training dynamic. Early in training, the reference-induced component is very strong. Later, after the model has absorbed some of that reference-driven signal, the inference-transferable component becomes more visible. But by then the model's reasoning behavior may already be damaged. The later recovery of the useful signal does not rescue performance. This supports the idea that early reference memorization can destabilize the model in a way that ordinary continued training does not fix.

The Intuition Behind Purified OPSD

The proposed solution follows directly from the diagnosis. If the bad part of the teacher signal is the part that can be explained by the reference alone, then remove that part. The reference-only teacher acts like a filter. It estimates the non-transferable shortcut signal. Subtracting the reference-only teacher from the full privileged teacher leaves a residual that is more closely tied to the question.

This residual is not yet a usable target distribution. It is a log-probability difference for each vocabulary item. A student cannot directly distill from a raw difference because a training target needs to be a valid probability distribution over tokens. The paper's method is to convert the residual into a proper target distribution using a pointwise mutual information style construction.

PMI In Simple Terms

Pointwise mutual information measures how much two pieces of information are associated beyond what would be expected separately. In this paper, the idea is adapted to token prediction. The method asks: how much more does the full teacher like this token when it has both the question and the reference, compared with when it has only the reference? If a token is favored mainly because of the reference alone, it should not get a large positive correction. If a token becomes more favored specifically when the question is present, it is more likely to represent useful problem-conditioned information.

The PMI residual is therefore the log probability from the full teacher minus the log probability from the reference-only teacher. This subtraction removes the part of the signal that the reference alone can explain. What remains is treated like a reward for tokens that are more question-relevant. The paper then anchors this reward to the base model's question-only distribution.

Why The Base Distribution Matters

The base distribution is the original model's prediction when it sees the question and the generated prefix, but not the reference. This distribution represents the model's clean reasoning prior. It is not contaminated by the privileged reference. The PMI target starts from this base distribution and then adjusts it using the cleaned residual signal. This is important because the method does not replace the model's reasoning style with a completely new teacher distribution. It nudges the model from its own question-conditioned behavior toward tokens that the cleaned signal says are useful.

This anchoring is one reason the method preserves reflective reasoning better than standard OPSD. Standard OPSD directly distills from the privileged teacher, whose distribution is dominated by the reference. Purified OPSD distills from a target that keeps the base model's question-only behavior as the foundation. The reference can still help, but only through the part of the teacher signal that survives the reference-only subtraction.

The KL-Regularized View

The paper gives a formal reason for the PMI target. It says we can view the cleaned residual as a token-level reward. We want a target distribution that gets high reward but does not move too far from the clean base distribution. This is a KL-regularized optimization problem. The solution has a familiar exponential form: start with the base distribution and multiply by an exponential of the reward divided by a temperature-like strength parameter.

In simple words, the target says: keep the model close to how it would normally reason from the question, but increase the probability of tokens that the cleaned teacher signal says are useful. The parameter beta controls how strong this correction is. A smaller beta makes the correction stronger and can be more volatile. A larger beta keeps the target closer to the base model and can be smoother. The main experiments use beta equal to one.

How The Method Is Implemented

At each token position, the method needs several forward passes. The student generates an on-policy trajectory from the question. Then the frozen base model is run in three ways: with question plus reference for the full teacher, with reference only for the reference probe, and with question only for the base distribution. The student distribution is computed with gradients so it can be trained.

The method computes the log-probability difference between the full teacher and the reference-only teacher. Then it centers this residual by subtracting the vocabulary-level mean. Centering removes global shifts that are not meaningful token preferences. Then it applies tanh soft clipping with a threshold. This bounds extreme residual values so that a few tokens do not create unstable targets. Finally, it adds the stabilized residual to the base log-probabilities and normalizes with softmax to get a valid target distribution.

The final training loss is still a Jensen-Shannon divergence style distillation loss, but the target is different. Standard OPSD uses the raw privileged teacher. Purified OPSD uses the PMI target. The architecture does not need new trainable parameters. The cost is extra frozen-model forward passes for the reference-only and question-only distributions. The paper reports less than ten percent extra wall-clock training time in its implementation, because these passes do not need backpropagation and can potentially be batched.

Main Experimental Findings

The main results compare the base model, standard OPSD, and OPSD-PMI across four models and two datasets. Standard OPSD is weak or harmful in most settings. On DASD-10K, it degrades three of the four models. On Math-CoT-20K, it gives a small gain for Qwen3-8B but hurts the other three models. This matches the earlier diagnosis that the raw teacher signal is not the right thing to copy.

OPSD-PMI improves over the base model in every listed model-dataset combination. It also consistently beats standard OPSD. The gains are not limited to one architecture or one dataset, which supports the claim that reference-induced shortcut learning is a general bottleneck for standard OPSD on long-CoT models. The method is also more stable across training checkpoints. Standard OPSD may briefly peak and then decline, making early stopping important. OPSD-PMI stays above the baseline more reliably, which is practically valuable because it reduces dependence on lucky checkpoint selection.

Preserving Reflective Reasoning

The paper returns to epistemic markers after introducing OPSD-PMI. This is important because higher benchmark scores alone would not prove that the model's reasoning style is preserved. The authors compare standard OPSD and OPSD-PMI on Qwen3-8B and R1-Distill-7B. Under standard OPSD, Qwen3-8B's epistemic marker count collapses, while R1-Distill-7B's count explodes. Under OPSD-PMI, the counts stay near the base model's levels.

The per-marker distribution also stays healthier. Standard OPSD suppresses many markers in Qwen3-8B and overconcentrates on "Wait" in R1-Distill-7B. OPSD-PMI keeps the distribution much closer to the base model. The paper interprets this as evidence that the purified target improves accuracy without disrupting the model's natural reflective behavior. This is a central claim: the method does not merely teach the model to get more answers right; it does so while preserving the process-like behavior that long-CoT models rely on.

Ablation Results

The ablations study two hyperparameters: the clipping threshold c and the correction strength beta. For c, the paper tests values such as five, ten, and twenty. All settings improve over baseline and standard OPSD. The threshold mostly acts as a numerical safety device. If it is too small, it may compress useful differences too aggressively and make training a little more volatile, but the method remains effective.

For beta, the paper tests values such as 0.5, 1, and 2. All improve over the base model and standard OPSD, but their dynamics differ. A smaller beta applies a stronger correction and can be more volatile. A larger beta keeps the target closer to the base distribution and can produce smoother curves, sometimes with strong peaks. The paper uses beta equal to one as a simple balanced default. The larger message is that the method is not extremely fragile to these hyperparameters.

How This Paper Relates To Prior Work

The paper sits between several lines of work. One line is long chain-of-thought reasoning, where models improve by spending more test-time computation on extended reasoning, self-correction, and exploration. Another line is distillation, where smaller or student models learn from teacher models. A third line is on-policy distillation, which tries to avoid off-policy mismatch by training the student on its own generated trajectories.

The paper's contribution is not simply another distillation recipe. Its main contribution is the diagnosis of why an apparently sensible recipe fails for long-CoT models. Prior work had observed that self-distillation can degrade reasoning or destabilize epistemic markers. This paper gives a mechanistic explanation: the privileged teacher's update is dominated by reference-induced supervision. It then turns that explanation into a method by using a reference-only teacher to subtract the shortcut signal and a PMI target to make the remaining signal trainable.

What The Research Was Trying To Make Possible

The research was trying to make on-policy self-distillation work for long reasoning models without destroying their ability to think. More specifically, it was trying to let a student benefit from reference solutions during training while still behaving like a model that can reason without references at inference time. This is a difficult balance. Reference solutions contain useful information, but if the student learns to depend on signals that only exist when the reference is present, the training will not transfer cleanly.

The paper is trying to make privileged supervision usable rather than harmful. It wants the reference to guide the model only through the part of the signal that is actually connected to the question. In practical terms, it tries to improve hard math reasoning benchmarks while preserving the model's reflective style. In broader terms, it tries to show that distilling reasoning is not just about giving more correct traces or denser labels. It is about making sure the training signal matches the conditions under which the model must reason later.

The Quiet Assumption The Paper Depends On

The paper quietly depends on the assumption that the reference-only teacher is a good probe for non-transferable reference-induced information. In other words, if a signal appears when the model sees the reference without the question, the paper treats that signal as something that should be removed. This is plausible, but it is still an assumption. Some information in the reference-only signal might be broadly useful, especially if the reference contains general reasoning patterns rather than only answer-specific shortcuts. Removing it might sometimes discard helpful information.

The paper also assumes that the residual between the full teacher and the reference-only teacher is more inference-transferable. That is reasonable because it isolates the effect of adding the question, but it does not guarantee that every remaining signal is truly useful at test time. The residual could still contain artifacts of the prompt format, dataset style, or reference wording. The method works empirically in the tested settings, but its conceptual foundation depends on the reference-only subtraction being a meaningful separator between shortcut and reasoning signal.

What Becomes Obvious After Reading The Paper

After reading the paper, it becomes obvious that a privileged teacher can be too privileged. Giving the teacher the answer does not automatically create better reasoning supervision. It may create a teacher that no longer has to reason in the same way the student must reason. That mismatch is easy to overlook because access to the reference sounds like an advantage. The paper shows that this advantage can dominate the training signal in the wrong way.

It also becomes obvious that preserving reasoning behavior is different from improving answer likelihood. A method can push token probabilities toward reference-like outputs while damaging the process that produces robust answers. The epistemic marker analysis makes this visible. Even though markers are imperfect proxies, their collapse or degeneration shows that training can alter the model's internal reasoning habits. For long-CoT models, the shape of the reasoning process is part of the capability.

Where The Idea Might Break Outside The Paper

The method might break if the reference-only teacher is not a clean estimate of shortcut information. For example, if the reference solution is written in a way that contains general reusable strategies, subtracting the reference-only signal might remove some valuable teaching. It might also struggle when the question and reference are deeply entangled, so that removing the question produces an unnatural context. In such cases, the reference-only distribution may be a noisy probe rather than a precise decomposition tool.

The approach may also be less straightforward outside math reasoning. In domains where references are not step-by-step solutions, or where the answer depends on facts rather than reasoning structure, the distinction between reference-induced and inference-transferable signal may be less clean. The method also requires extra forward passes through the model, which may matter at larger scale. Finally, the paper evaluates a limited set of models, datasets, and benchmarks. The idea is promising, but it would need more evidence in coding, scientific reasoning, tool use, multilingual tasks, and open-ended tasks.

The Long-Running Problem This Paper Moves

The paper moves the long-running problem of how to distill reasoning rather than just answers. Distillation has often focused on copying outputs, soft labels, or solution traces. Reasoning models make this harder because the valuable thing is not only the final answer but the ability to search, reflect, and self-correct. Standard supervised or privileged methods can accidentally teach the model to imitate the surface of a solution instead of learning a transferable reasoning process.

This paper contributes a useful way to think about that problem. It separates teacher supervision into what is available only because of privileged information and what remains tied to the question. That decomposition gives researchers a diagnostic tool, not just a training trick. Even if future methods do not use the exact PMI target, the idea of testing whether a teacher's signal survives without the question is valuable. It helps expose when training is teaching memorization under the disguise of reasoning improvement.

Final Understanding

The paper's message is that standard OPSD fails on long-CoT models because the teacher's reference access contaminates the learning signal. The model is trained on its own trajectories, which is good, but the token-level teacher distribution mostly points toward the reference solution, which is bad. This pushes the student toward reference memorization and destabilizes reflective reasoning. Purified OPSD fixes this by using a reference-only teacher to estimate the shortcut component, subtracting it from the full teacher signal, and converting the remaining question-conditioned residual into a valid PMI target anchored to the base model's own question-only distribution.

The method is appealing because it is built from the failure analysis. The diagnosis says the raw teacher is dominated by reference-induced information. The solution removes that information before distillation. The results then show better accuracy and more stable reflective behavior. The broader lesson is that when training reasoning models, the source of the supervision matters as much as the amount of supervision. A teacher that knows the answer must be handled carefully, because otherwise it may teach the student how to follow the answer rather than how to think.