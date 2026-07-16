---
title: "On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes"
pubDate: 2026-07-01
tags: ["knowledge-distillation", "llm", "paper-notes"]
---

# On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes

This paper, published at ICLR 2024 by researchers at Google DeepMind and the University of Toronto, addresses a fundamental problem in how we compress large language models into smaller ones. The core idea is deceptively simple: instead of training a small model to copy a big model's answers on a fixed dataset, let the small model practice on its own mistakes and learn from the big model's corrections. The authors call this Generalized Knowledge Distillation, or GKD, and they show it works substantially better than every existing distillation method across summarization, translation, reasoning, and general instruction following.

# What Problem This Paper Is Solving

Language models have gotten enormous. Models like GPT-4 or PaLM have hundreds of billions of parameters, making them expensive to run, slow to respond, and impossible to deploy on small devices. Knowledge distillation is the standard solution: you take a large "teacher" model and train a smaller "student" model to behave like it. The student learns to produce the same outputs and match the teacher's internal probabilities, but with far fewer parameters. This compression can reduce a model's size by 10 to 40 times while preserving most of its capabilities.

The problem is that traditional distillation methods have a hidden flaw. They train the student on a fixed dataset of outputs, either human-written ground truth or teacher-generated sequences. But at inference time, the student generates its own sequences token by token, one word at a time. The partial sequences the student encounters during real use look different from the ones it saw during training. This mismatch causes a cascading problem: if the student makes a small mistake early in its output, everything that follows is based on that mistake, and the errors compound. The paper calls this "distribution mismatch" or "exposure bias," and it is a well-known problem in sequence generation that has been studied in the imitation learning literature for decades.

# Why Standard Distillation Falls Short

There are two main flavors of standard distillation, and both have limitations. The first is supervised knowledge distillation, where the student is trained on ground-truth output sequences and learns to match the teacher's token-level probability distributions on those sequences. The second is sequence-level knowledge distillation, where the teacher first generates a large set of output sequences, and then the student is trained to maximize the likelihood of those teacher-generated sequences, essentially supervised fine-tuning on teacher outputs.

Both approaches suffer from the same fundamental issue. The student never practices generating sequences on its own during training. It only sees completed, polished sequences and tries to imitate them. But at test time, it must generate sequences from scratch, building them one token at aime. Early errors in the sequence propagate forward because each token prediction depends on all the tokens that came before it. This is analogous to learning to drive by watching someone else drive perfectly, without ever sitting behind the wheel yourself. When you finally do drive, you have no experience handling your own mistakes.

There is also a second problem. The standard objective for distillation is to minimize the forward KL divergence between the teacher and student distributions. Forward KL tries to make the student assign probability to every token the teacher considers likely. But the student is much smaller and less expressive than the teacher. When a small model tries to spread its probability mass across everything the big model likes, it ends up also assigning probability to tokens that the teacher actually considers unlikely. This can lead to hallucinations and low-quality generations, especially when the student is much smaller than the teacher.

# The Core Idea: Learning from Your Own Mistakes

The key insight of this paper is to reframe knowledge distillation as an imitation learning problem. In imitation learning, an agent learns by trying to perform a task on its own, getting feedback from an expert, and then improving based on that feedback. The paper draws on the on-policy imitation learning literature from robotics and deep reinforcement learning, where this approach has been used successfully for years.

The GKD method works as follows. Instead of training the student on a fixed dataset, GKD has the student generate its own output sequences during training. The student samples from its own distribution, producing outputs that it would naturally generate. Then, the teacher provides token-level feedback on these self-generated sequences, telling the student what probability it would have assigned at each step. The student then updates its parameters to reduce the difference between its own probabilities and the teacher's probabilities on these on-policy sequences.

This creates a feedback loop. As the student improves, the sequences it generates improve too, which means the teacher's feedback becomes more useful, which helps the student improve further. The student is always practicing on sequences it would actually produce, so there is no distribution mismatch between training and inference. The paper calls this "on-policy" distillation because the training data comes from the student's own policy, not from some external fixed source.

# How GKD Is Formally Defined

GKD is defined by a few key components. First, there is a hyperparameter called the student data fraction, denoted lambda, which controls what fraction of the training data comes from the student's own generations versus a fixed dataset. When lambda equals one, all data is on-policy, meaning the student generates everything. When lambda equals zero, it is pure supervised distillation on fixed data. Values in between mix the two sources.

Second, GKD allows the choice of divergence function to be flexible. The divergence measures how different the teacher's probability distribution is from the student's at each token position. The standard choice is forward KL, which tries to cover all the modes of the teacher's distribution. But GKD also supports reverse KL, which is mode-seeking and focuses on the most likely tokens the teacher would generate, and generalized Jensen-Shannon divergence, which interpolates between forward and reverse KL depending on a parameter beta.

The full GKD objective combines both data sources. With probability one minus lambda, the student trains on sequences from the fixed dataset. With probability lambda, the student generates its own sequences and trains on those. In both cases, the training signal comes from the teacher's token-level probabilities. Importantly, the gradients are not backpropagated through the student's sampling process. The student generates a sequence, freezes it, and then treats it as a fixed input for training. This makes the training stable and computationally efficient, unlike some reinforcement learning approaches that must differentiate through the sampling process.

# Why On-Policy Training Matters

The paper provides several reasons why training on the student's own outputs is better than training on fixed data. The most intuitive is that it eliminates the distribution mismatch problem. When the student trains on sequences it would actually produce, it encounters exactly the kinds of partial sequences it will see at inference time. This means the error cascade problem is greatly reduced.

There is also a practical advantage. Generating sequences from the student is much cheaper than generating them from the teacher, because the student is much smaller. If you need to generate training data, it is far more efficient to sample from the student than from the teacher. And because the student's quality improves during training, the data it generates also improves over time, creating a virtuous cycle.

The paper also notes that this approach is analogous to the two-stage training process used in RLHF, where models are first fine-tuned on supervised data and then further fine-tuned with reinforcement learning using human feedback. GKD fits naturally into this workflow and can even be combined with RL fine-tuning, as the paper demonstrates.

# Choice of Divergence and Its Effects

The choice of divergence function matters significantly and has a direct impact on the trade-off between quality and diversity in the student's outputs. Forward KL is mode-covering, meaning it tries to assign probability to everything the teacher likes. This tends to produce more diverse outputs but can also lead the student to assign probability to unlikely tokens, causing hallucinations or quality issues. Reverse KL is mode-seeking, meaning it focuses on the tokens the teacher considers most likely. This produces more focused, higher-quality outputs but at the cost of reduced diversity.

Generalized Jensen-Shannon divergence provides a knob between these two extremes. The parameter beta controls how much the divergence behaves like forward KL versus reverse KL. When beta is close to zero, it behaves like forward KL. When beta is close to one, it behaves like reverse KL. Values in between offer a balance.

The paper finds that the optimal divergence is task-dependent. For summarization tasks evaluated with temperature sampling, mode-seeking divergences like reverse KL and JSD with high beta produce better quality. For tasks evaluated with greedy sampling, the choice of divergence matters less because greedy decoding already eliminates most diversity. For instruction tuning, reverse KL works much better than forward KL, possibly because it helps the model focus on the core behavior specified by an instruction rather than spreading attention across less relevant details.

# Experiments on Summarization

The authors evaluate GKD on abstractive summarization using the XSum dataset, where the goal is to generate a short summary that captures the main points of a news article. They use T5 models of various sizes, with a T5-XL model of about three billion parameters as the teacher and T5-small, T5-base, and T5-large as students of 77 million, 250 million, and 800 million parameters respectively.

The results are striking. On-policy GKD consistently outperforms supervised distillation, sequence-level KD, and other existing methods across all student sizes. The improvements are dramatic: a T5-small model distilled with GKD can surpass the few-shot performance of PaLM, a model that is 7000 times larger. The paper also shows that GKD is remarkably data-efficient. Training with just five percent of the XSum dataset using on-policy GKD outperforms supervised distillation using the entire dataset with ground-truth summaries.

The paper further demonstrates that GKD can be combined with reinforcement learning to improve factual consistency in summaries. By adding a reward signal based on textual entailment, the distilled student produces summaries that are both higher quality in terms of ROUGE scores and more factually consistent with the input documents than even the teacher model.

# Experiments on Machine Translation

The paper evaluates GKD on English to German translation using the WMT14 dataset. The setup is similar: T5-XL as the teacher and smaller T5 models as students. Performance is measured using BLEU score, which compares the student's translations against high-quality reference translations.

The results mirror the summarization findings. On-policy GKD outperforms standard distillation approaches, with generalized JSD divergences performing particularly well. The paper shows detailed ablation studies across different divergences and student data fractions, consistently finding that purely on-policy training outperforms mixed or purely supervised variants. The advantage is especially pronounced when the student is much smaller than the teacher, which is exactly the scenario where distillation is most needed.

# Experiments on Arithmetic Reasoning

The reasoning experiments use GSM8K, a dataset of grade school math word problems that require multi-step logical reasoning. This is a particularly interesting test case because reasoning abilities were thought to only emerge in very large models. The paper uses chain-of-thought prompting, where models are asked to show their intermediate reasoning steps before giving a final answer, and evaluates whether the student's final answer matches the correct solution using an external calculator.

The results show that GKD with chain-of-thought distillation substantially improves reasoning abilities in smaller models. A T5-small model distilled with GKD approaches the performance of much larger models. The paper finds that using purely student-generated chain-of-thought sequences outperforms training on fixed chain-of-thought datasets, even when those datasets contain high-quality reasoning traces generated by large models. This is a strong endorsement of the on-policy approach: the student learns better by practicing on its own reasoning chains, even if those chains are imperfect, than by copying perfect examples from a teacher.

# Task-Agnostic Distillation and Instruction Tuning

Beyond task-specific distillation, the paper also evaluates GKD in a task-agnostic setting, where the goal is to distill a model that can handle many different tasks through instructions rather than being specialized for one task. The authors use FLAN T5 models, which are instruction-tuned versions of T5, and distill the FLAN T5-XL teacher into FLAN T5-Base using the massive FLAN2021 instruction tuning dataset of over five million examples.

The evaluation tests the distilled model on held-out benchmarks that were not included in the distillation data: MMLU, which covers 57 academic subjects, and BBH, which includes 23 challenging tasks that even PaLM 540B struggled with. The results show that on-policy GKD with reverse KL substantially outperforms other distillation methods on both benchmarks. The paper hypothesizes that reverse KL works especially well for instruction tuning because its mode-seeking nature helps the model focus on the core behavior specified by each instruction rather than spreading its probability mass across less relevant details.

# Combining Distillation with Reinforcement Learning

One of the most novel contributions of this paper is showing how GKD can be combined with reinforcement learning fine-tuning. The idea is straightforward: instead of just distilling the student to match the teacher, you simultaneously optimize for a reward signal while keeping the student close to the teacher through the distillation loss. This creates a regularized RL objective where one term maximizes reward and another term keeps the student's probabilities close to the teacher's.

The paper applies this to reduce hallucination in summarization. By adding a reward signal based on textual entailment, which measures whether the summary is logically supported by the input document, the combined RL plus GKD approach produces summaries that are both higher quality and more factually consistent than either approach alone. The key insight is that the distillation component prevents the RL from going too far and degrading the model's general language abilities, while the RL component pushes the model to be more factually faithful.

# Computational Cost and Practical Considerations

The paper addresses the practical concern that generating data from the student during training adds computational overhead. The overhead is modest, roughly 1.8 to 2.2 times compared to training on a fixed dataset, depending on the student-teacher size ratio. The paper argues this is a worthwhile investment because the real cost of deploying a model is in serving, not training. If a model is too expensive to generate training data from, it is probably too expensive to serve to users anyway.

The authors also note that GKD starts from a student that has already been supervised fine-tuned. This is important because the student needs to be good enough to generate reasonable sequences for the teacher to provide useful feedback on. A randomly initialized student would produce gibberish, and the teacher's feedback on gibberish would not be helpful. This mirrors the two-stage RLHF process where supervised fine-tuning precedes reinforcement learning.

# How GKD Relates to Prior Work

GKD unifies several existing distillation methods while introducing important new ones. Supervised distillation is simply GKD with lambda set to zero. Sequence-level KD can be viewed as a variant where the fixed dataset is generated by the teacher. ImitKD, a prior method that connects distillation to imitation learning, uses a mix of student and fixed data but always with forward KL divergence and does not explore purely on-policy training. The f-distill method formulates sequence-level KD using f-divergences and can also be seen as a specific instance of GKD.

The concurrent MiniLLM work frames distillation as a reinforcement learning problem and optimizes reverse KL at the sequence level using policy gradients. The paper argues GKD is simpler and more stable because it does not backpropagate through the student's sampling process, avoiding the high variance and reward hacking issues that plague policy gradient methods. GKD is also more general because it supports forward KL, reverse KL, and JSD, whereas MiniLLM only supports reverse KL.

# Limitations and Open Questions

The paper acknowledges several limitations. GKD requires the student to be good enough to generate reasonable sequences before training begins, which means it cannot be applied to randomly initialized students. The optimal divergence choice is task-dependent, requiring some experimentation. The computational overhead of on-policy generation, while modest, is not zero.

The paper suggests several directions for future work. Extending GKD to other auto-regressive sequence models beyond text, such as audio, video, and image generation, is a natural next step. The combination of distillation and RL fine-tuning could be further explored, particularly in the context of RLHF training pipelines for large language models.

# What This Paper Makes Possible

After reading this paper, several things become obvious that were not obvious before. The most fundamental is that training a model on its own mistakes, even imperfect ones, can be better than training it on perfect examples from a teacher. This challenges the intuition that you should always learn from the best possible demonstrations. The student benefits from practicing on sequences it would naturally produce because it learns to recover from its own errors rather than never encountering them.

It also becomes clear that the choice of how to measure the difference between teacher and student matters enormously, and there is no single best choice. The diversity versus quality trade-off is real and task-dependent, and having a flexible divergence lets you tune this trade-off for your specific application.

Finally, the paper shows that distillation and reinforcement learning are not separate processes that must be done sequentially. They can be combined in a single training loop, where the distillation prevents catastrophic forgetting and the RL pushes for specific desirable behaviors like factual consistency.

# Where This Idea Breaks If You Push It Outside the Paper

The on-policy approach has a bootstrapping problem. If the student is too bad to generate reasonable sequences, the teacher's feedback on those sequences is not useful. The paper sidesteps this by starting from supervised fine-tuned students, but this means GKD cannot be applied from scratch to a randomly initialized model. The student must already be good enough to produce sequences worth learning from.

The approach also assumes access to the teacher's full probability distribution at every token, not just sampled outputs. In many real-world scenarios, you might only have access to a teacher's generated text, not its internal probabilities. In those cases, GKD cannot be applied in its current form.

The computational overhead, while described as modest, could become significant at very large scales. If both teacher and student are huge, even generating from the student might be expensive. And the approach assumes the teacher is stationary and reliable, but in practice teachers can hallucinate or be inconsistent, which would propagate errors into the student.

# What Long-Running Problem This Paper Moved

This paper made meaningful progress on the exposure bias problem in sequence generation, which has been studied since at least the early 2010s. The problem of training-inference mismatch in auto-regressive models has been recognized for over a decade, with various proposed solutions like scheduled sampling that never quite achieved widespread adoption. GKD provides a clean, practical solution that connects this long-standing problem to the well-studied imitation learning literature and demonstrates substantial empirical improvements across multiple tasks.

The paper also advanced the practice of combining distillation with reinforcement learning, which had not been previously explored in this way. By showing that distillation and RL can be performed simultaneously rather than sequentially, the paper opened up a new training paradigm that could improve the widely-used RLHF pipeline for aligning language models with human preferences. This combination addresses the alignment tax problem, where aligning a model with human feedback can degrade its general capabilities, by using distillation to preserve those capabilities while the RL pushes for specific behaviors.
