---
title: "RL Foundations and PPO Notes"
pubDate: 2026-06-30
tags: ["reinforcement-learning", "ppo", "notes"]
---

# RL Foundations and PPO Notes

## Why reinforcement learning is used after supervised fine tuning

Supervised fine tuning teaches a language model to copy good examples. This is useful because it gives the model basic instruction following behavior, but it also creates a natural limit. If the model only learns to imitate examples, then it usually cannot become better than the examples it was shown. Reinforcement learning is introduced after supervised fine tuning because it gives the model a way to try new outputs, receive feedback, and shift its behavior toward outputs that get higher rewards. In simple terms, supervised fine tuning says, "write like this example," while reinforcement learning says, "try writing, get judged, and learn which choices lead to better results."

This matters for modern assistant models because an assistant must do more than imitate a training dataset. It must answer new questions, follow preferences, avoid unsafe behavior, reason through hard problems, and produce outputs that humans or automatic checkers judge as better. Reinforcement learning is the stage that turns a capable but not fully steered model into a model whose behavior is pushed toward helpfulness, accuracy, safety, and task success.

## The two main paradigms of reinforcement learning for language models

The first paradigm is alignment through human preferences. This is the family of methods usually called RLHF, and it also includes preference optimization methods such as DPO. The goal here is to make the model more helpful, harmless, and honest. Humans compare two answers to the same prompt and judge which one is better. In classic RLHF, those comparisons are used to train a reward model, which becomes a learned judge. The policy model is then optimized so that its answers receive higher scores from this reward model. The important idea is that the model is no longer only copying demonstrations. It is being pushed toward answers that humans prefer.

DPO is related to this same preference alignment idea, but it simplifies the process. Instead of training a separate reward model and then running an online reinforcement learning loop, DPO turns preference data directly into a supervised-style objective. It tells the model to raise the probability of preferred answers and lower the probability of rejected answers. This makes DPO easier to implement than full RLHF, but it is also less flexible than methods that can keep generating new answers and optimizing against a live reward signal.

The second paradigm is capability improvement through verifiable rewards. This is often called RLVR, which means reinforcement learning from verifiable rewards. Here the reward does not come from a human saying which answer feels better. Instead, the reward comes from an objective check. A math answer can be checked against the correct final value. Code can be tested against unit tests. A format can be checked by rules. This makes RLVR especially useful for reasoning, mathematics, coding, and agentic tasks where success can be verified automatically.

The key difference between the two paradigms is the source of the reward. RLHF uses human preference data or a reward model trained from human preferences. RLVR uses rule-based or programmatic verification. RLHF is mainly about making outputs align with human expectations. RLVR is mainly about teaching the model to discover strategies that solve tasks correctly. Both approaches still use the same core reinforcement learning machinery: a policy that generates text, a reward signal that scores the result, a constraint that keeps the model from drifting too far, and an optimizer such as PPO or GRPO.

## The shared machinery behind RLHF and RLVR

In both paradigms, the language model is treated as a policy. A policy is simply a rule for choosing actions. For a language model, the action is the next token, and the policy is the model's probability distribution over possible next tokens. Every time the model generates text, it repeatedly chooses one token at a time according to this distribution.

The reward signal tells the model whether the generated output was good. In RLHF, the reward may come from a learned reward model that predicts human preference. In RLVR, the reward may come from an automatic verifier, such as a math checker or a code test suite. The policy update then tries to make the model more likely to produce token sequences that receive higher rewards.

A KL constraint is usually added so the new policy does not move too far from a reference policy, often the supervised fine tuned model. This is important because reward signals are imperfect. If the model is allowed to chase reward too aggressively, it can exploit weaknesses in the reward model or become worse in ways not captured by the reward. The KL constraint acts like an anchor. It says the model may improve, but it should not abandon the behavior learned during supervised fine tuning too quickly.

The optimizer is the method used to update the model weights. PPO and GRPO are common choices. PPO uses a clipped objective and usually a value function. GRPO removes the critic and uses group-relative rewards instead. The section focuses heavily on PPO because it is one of the classic and most important algorithms for RLHF.

## Text generation as a Markov decision process

Reinforcement learning normally studies agents that interact with environments. To apply this to language models, text generation is described as a Markov decision process. The state is the prompt plus everything the model has generated so far. The action is the next token chosen from the vocabulary. The transition is simple and deterministic: after the model chooses a token, that token is appended to the text, and the new state becomes the old text plus the new token.

This mapping is powerful because a language model already has the exact structure needed to be a policy. At each position, it produces a probability distribution over the vocabulary. That distribution says how likely the model is to choose each possible next token. Reinforcement learning does not require a separate policy network. It can update the same language model so that tokens leading to better final answers become more likely.

The reward is usually sparse. This means the model often does not receive feedback at every token. Instead, the whole answer is generated first, and then the final answer is scored. For RLHF, this score may be the reward model's judgment. For RLVR, it may be correctness. Because the model receives reward mostly at the end, the algorithm must assign credit backward across the generated tokens. It has to estimate which earlier token choices helped or hurt the final score.

The discount factor is usually set to one for language model episodes because a response is finite. In many classical reinforcement learning settings, future rewards may be discounted because they are far away or uncertain. In single-response language model training, the whole episode is short and finite, so there is usually no reason to discount later rewards.

## The classic RLHF pipeline

The RLHF pipeline begins with supervised fine tuning. A base model is trained on high quality demonstrations so it can follow instructions and produce reasonable answers. This model becomes the starting policy. Without this stage, reinforcement learning would be much harder because the model would need to explore from a much weaker starting point.

The second stage is reward model training. Humans compare pairs of answers to the same prompt. One answer is marked as preferred and the other as worse. A reward model is trained to assign higher scores to preferred answers. The Bradley-Terry objective is commonly used here because it models the probability that one response is preferred over another based on their reward scores.

The third stage is reinforcement learning optimization. The policy generates answers, the reward model scores them, and an algorithm such as PPO or GRPO updates the policy toward answers with higher reward. During this stage, the policy is also constrained against the supervised fine tuned reference model so it does not drift too far.

The fourth stage is evaluation and iteration. The trained model is tested, failure cases are collected, and the process may be repeated with better data or better rewards. This is important because reward models and training data are never perfect. Real model improvement usually comes from repeated cycles of finding weaknesses and training against them.

In RLVR, the first and second stages are changed. The model may be fine tuned on reasoning traces, and the reward model may be replaced by a verifier. For example, instead of asking a human which answer is better, the system may check whether the final math answer is correct. The optimization stage remains similar because PPO or GRPO can still update the policy using the reward signal.

## How language model reinforcement learning differs from classical reinforcement learning

Language model reinforcement learning has deterministic transitions. In a game or robot environment, an action may have uncertain effects. In text generation, the next state is simply the old state plus the chosen token. The uncertainty is mostly in the model's sampling, not in the environment transition.

Rewards are usually sparse. A model may produce hundreds of tokens before receiving a single score. This makes credit assignment difficult because the training algorithm must estimate which token choices contributed to success or failure. Some systems use outcome rewards only at the end, while others use process rewards at intermediate reasoning steps.

The action space is enormous. At every step, the model may choose from tens of thousands of tokens. Classical algorithms such as DQN are not a natural fit for this setting because they are not designed for such large discrete action spaces with language-like structure. Policy gradient methods are more suitable because they directly optimize the probability of sampled actions.

Language model RL also uses a KL anchor. This is not just a minor technical detail. It is central to keeping training stable. Without it, the model can over-optimize the reward signal and lose useful general behavior from supervised fine tuning. The KL penalty reduces exploration, but it also prevents reward hacking and collapse.

Another important difference is that GRPO can remove the value function entirely. PPO usually trains a critic to estimate expected returns, but GRPO uses group-relative reward normalization instead. This is one reason GRPO has become important for reasoning model training, where generating multiple answers to the same prompt and comparing their rewards can be effective.

## The roadmap of the reinforcement learning part

The extracted section briefly previews the following chapters. PPO is presented as the workhorse method behind many RLHF systems. DPO is introduced as a simpler preference optimization method that avoids a full reinforcement learning loop. GRPO is described as a critic-free method used in DeepSeek-style reasoning training. Later topics include preference optimization variants, reward modeling, supervised fine tuning practices, and systems engineering for large scale distributed training.

The main reason this roadmap matters is that reinforcement learning for language models is not a single algorithm. It is a full stack. The quality of supervised fine tuning affects how far RL can go. The reward design determines what the model learns. The optimization method determines whether training is stable. The systems engineering determines whether the process can run efficiently on large models.

## Why PPO was created

Vanilla policy gradient methods can make updates that are too large. If one batch of training data gives a noisy signal, the policy may move too far in a bad direction. For a language model, this can mean the model starts generating poor outputs. Those poor outputs then receive poor rewards, and future gradients may make the policy even worse. This kind of feedback loop can cause collapse.

TRPO was an earlier solution. It constrained the KL divergence between the old and new policy, which helped ensure that updates stayed within a trusted region. The problem was that TRPO required expensive second-order optimization. It involved machinery such as Fisher information matrices and conjugate gradients, which made it harder to implement and scale.

PPO was created as a simpler solution with similar stability benefits. Instead of enforcing a hard KL constraint through expensive optimization, PPO uses a clipped objective. The clipped objective is easy to implement with ordinary first-order gradient methods, but it still prevents updates from becoming too large. This combination of simplicity and stability is why PPO became widely used.

## The PPO clipped objective in simple words

PPO compares how likely an action is under the new policy versus how likely it was under the old policy. This comparison is called the probability ratio. If the ratio is one, the new policy assigns the same probability to the action as the old policy. If the ratio is greater than one, the new policy makes the action more likely. If the ratio is less than one, the new policy makes the action less likely.

The advantage tells whether the action was better or worse than expected. A positive advantage means the action was good relative to the baseline, so the model should become more likely to take it. A negative advantage means the action was bad relative to the baseline, so the model should become less likely to take it.

The danger is that the model might change probabilities too aggressively. If a token looked good in one batch, an unconstrained objective might push its probability much higher than is justified. If a token looked bad, it might push its probability much lower too quickly. PPO clips the probability ratio, usually to a range such as 0.8 to 1.2. This means the update receives no extra benefit from making the new policy more than about 20 percent different from the old policy for that action.

The min operation in the PPO objective makes the algorithm conservative. For good actions, it stops rewarding the model once it has increased the action probability enough. For bad actions, it stops rewarding the model once it has decreased the action probability enough. The practical effect is that PPO encourages improvement without letting one batch radically reshape the policy.

## The full PPO loss

The full PPO loss has three main parts. The first part is the clipped policy loss, which updates the policy toward actions with positive advantages and away from actions with negative advantages while limiting how large those changes can be.

The second part is the value loss. PPO usually trains a value function, also called a critic, to predict the expected return from a state. This helps estimate advantages. If the value function predicts what reward is expected, then the algorithm can compare the actual reward to that expectation. The difference tells whether the action was better or worse than expected.

The third part is the entropy bonus. Entropy measures how spread out the policy distribution is. A high entropy policy is more exploratory because it gives meaningful probability to many actions. A low entropy policy is more deterministic. The entropy bonus discourages the model from becoming too deterministic too early. In reinforcement learning, premature certainty can hurt exploration and make the model settle into weak behavior.

These three parts work together. The policy loss improves behavior, the value loss improves the baseline used for advantage estimation, and the entropy bonus keeps exploration alive. The coefficients on the value loss and entropy bonus control how much each extra term matters.

## How PPO is derived from the policy gradient idea

The starting point is the reinforcement learning objective: maximize expected cumulative reward. For a language model, this means choosing model weights that make high-reward generations more likely. The policy gradient theorem gives a practical way to compute the direction in which the model weights should move. It says that actions with positive advantage should have their log probability increased, while actions with negative advantage should have their log probability decreased.

PPO collects data using an older snapshot of the policy, then updates the current policy using that collected data. This creates a mismatch because the data came from the old policy while the update changes the new policy. Importance sampling corrects for this mismatch by multiplying the update by the probability ratio between the new and old policies.

The basic importance-sampled objective is valid, but it can be unstable because the ratio can move far from one. If the new policy makes an action much more likely than the old policy did, the importance weight can become extreme. This increases variance and may push the model into regions where the reward model is unreliable. PPO solves this by clipping the ratio.

The clipped objective can be understood as a first-order approximation to a trust-region method. It tries to get the stability benefits of staying near the old policy without the expensive machinery of TRPO. The result is not magic; it is a practical compromise. It allows multiple optimization steps on the same rollout batch while reducing the chance that those steps distort the policy too much.

## Rollouts in PPO

A rollout is a trajectory generated by running the current policy. In a language model, a rollout starts with a prompt. The model then generates a response one token at a time until it reaches a stopping condition, such as a maximum length or end-of-text token. Each token choice is treated as one step in the trajectory.

During a rollout, PPO records the information needed for later optimization. It stores the state, the action, the reward, the log probability of the action under the old policy, and the value function estimate. For language models, the state is the prompt plus the tokens generated so far, and the action is the next token.

The old log probability is especially important. PPO needs to compare the new policy to the old policy during optimization. If the old log probability is stored at rollout time, the system does not need to run the old model again for every mini-batch. This saves a large amount of computation, especially for large models.

## The rollout buffer

The rollout buffer is temporary storage for one batch of on-policy data. It is not like a replay buffer in off-policy methods such as DQN or SAC. A replay buffer can store old transitions for a long time and reuse them many times. PPO cannot safely do that because its mathematical guarantees depend on the data being generated by the recent old policy.

The rollout buffer has a strict lifecycle. First, the policy collects fresh trajectories and fills the buffer. Second, PPO computes advantages and trains for a small number of epochs using mini-batches from that buffer. Third, the buffer is purged. The next PPO cycle must generate fresh rollouts with the updated policy.

This lifecycle explains why generation is such a major bottleneck in RLHF training. After every update cycle, the system needs new model outputs. For large models, generating those outputs can take most of the wall-clock time. The training step is only one part of the cost; continuous rollout generation is often the dominant cost.

## Why vLLM is useful in RLHF training

In RLHF, vLLM is useful during the generation phase. The policy model must generate many responses so they can be scored and used for optimization. Since generation may consume most of the training time, making generation faster and more memory efficient has a large impact on the whole system.

vLLM helps by batching many generations together and using memory efficiently. It can support many concurrent generations, which improves GPU utilization. It is also useful when generating multiple responses for the same prompt, because the prompt prefix can be computed once and reused across responses. This avoids redundant prefill computation.

In large training systems, generation workers and training workers may be separated. A tool such as vLLM handles rollout generation, while frameworks such as DeepSpeed, FSDP, OpenRLHF, or TRL handle optimization. This separation is a systems engineering choice that reflects the different performance needs of generation and training.

## The full PPO loop for RLHF

A concrete PPO training step begins with a batch of prompts. The policy samples responses using settings such as temperature and top-p. Sampling is important because the model needs exploration; if it always used greedy decoding, it would see fewer alternatives and learn less from reward differences.

After generation, the reward model scores each prompt and response pair. The system also computes a KL penalty by comparing the policy's token probabilities to a reference policy's token probabilities. The final reward is often the reward model score minus a weighted KL penalty. This means an answer must be good according to the reward model, but it is penalized if it moves too far from the reference model's behavior.

Next, PPO computes advantages for each token position, often using generalized advantage estimation. The advantages may be whitened, meaning they are normalized to have zero mean and unit variance. This improves optimization stability by keeping the scale of updates more consistent.

Finally, PPO updates the model for several epochs using mini-batches. The clipped objective controls policy movement, gradient clipping prevents unusually large gradients, and the KL penalty keeps the model near the reference. Over many steps, these small stable updates can improve win rate over the supervised fine tuned model.

## PPO end to end diagram

![PPO end to end diagram from page 141](figures/ppo-end-to-end-figure-5-1-page-141.png)

This diagram shows the whole PPO training loop in one view. The trainable policy generates responses. The reward model scores those responses. A reference policy supplies the KL penalty, which discourages the trainable policy from moving too far away from the original supervised fine tuned behavior. The reward after the KL penalty is used to compute GAE advantages. PPO then uses those advantages to update the policy for several epochs. After the update, the improved policy becomes the model used for the next generation step, so the loop repeats.

## Tokenization pitfalls in language model reinforcement learning

In language model RL, the token is the action. This creates subtle problems because tokens do not always match human concepts such as words, numbers, or reasoning steps. A simple-looking output like a year may be one token in one tokenizer and several tokens in another. Because PPO applies probabilities, KL penalties, and advantages at the token level, tokenization affects the training signal.

One issue is KL accounting. If the same semantic content is split into more tokens, it may receive more total KL penalty because the penalty is added across token positions. Rare words or unusual strings that split into many subword tokens can therefore be penalized more heavily than common words that fit into one token.

Another issue is credit assignment. GAE assigns advantage to token positions, but a real decision may span several tokens. Often the meaningful decision happens at the first token of a word or phrase, while later subword tokens are mostly forced by the first choice. Token-level credit assignment can therefore be a noisy approximation of semantic decision making.

Reward placement also matters. If the reward is placed only on the final token, the algorithm must propagate credit backward through the entire sequence. Longer responses can receive a more diluted signal because many tokens share responsibility for one final outcome. Some systems reduce these problems by normalizing KL by sequence length, shaping rewards at word or step boundaries, or applying rewards at semantic checkpoints.

## Live policy and old policy in PPO

PPO uses two policy states during training. The live policy is the model currently being updated. The old policy is a frozen snapshot of the model that generated the rollout data. Both have the same architecture, but their weights differ during the optimization phase.

At the start of a rollout cycle, the live policy and old policy are the same. The model generates responses, and the system records the old policy's log probabilities for the sampled tokens. Once optimization begins, the live policy changes after each gradient step, but the old policy remains fixed. This fixed reference is necessary for computing the probability ratio.

The probability ratio tells how much the live policy has changed relative to the rollout policy for a specific action in a specific state. If the live policy now assigns much higher probability to a token than the old policy did, the ratio is above one. If it assigns lower probability, the ratio is below one. PPO clipping uses this ratio to decide whether the update should continue or stop for that token.

At the end of the optimization cycle, the old policy snapshot is discarded. The newly updated live policy becomes the starting point for the next rollout cycle. The ratio resets to one at the beginning of the new cycle because the fresh rollout is generated by the current policy.

## Logits, log probabilities, and the PPO ratio

A language model first produces logits, which are raw scores for every token in the vocabulary. These logits are converted into probabilities with softmax. The probability of the sampled token is the policy probability for that action. PPO needs this probability under both the old policy and the live policy.

In practice, systems usually work in log probability space. Directly dividing tiny probabilities can cause numerical underflow or overflow. Instead, the system computes the new log probability minus the old log probability, then exponentiates the difference. This gives the same ratio in a more numerically stable way.

This ratio is then placed inside the clipped PPO objective. If the action had positive advantage, PPO allows the live policy to increase its probability only up to the clipping limit. If the action had negative advantage, PPO allows the live policy to decrease its probability only down to the clipping limit. This is how PPO keeps policy updates within a controlled range.

## The PPO weight lifecycle

The PPO weight lifecycle begins with the live policy and old policy identical. During rollout, the model generates data, and the ratio between old and live policies is effectively one because they are the same. During optimization, the old policy stays frozen while the live policy changes.

As mini-batch updates continue, the live policy may assign different probabilities to the rollout actions. The ratio begins to deviate from one. If it remains within the allowed range, gradients continue to flow normally. If it moves beyond the clipping range, PPO blocks further benefit from pushing in that same direction.

After optimization ends, the old snapshot is no longer useful because it corresponds to the previous rollout cycle. The updated live policy becomes the basis for new rollouts. This repeated pattern of snapshot, collect, train, discard, and resnapshot is central to PPO.

## Continuous action spaces

The section briefly explains that PPO can also work with continuous action spaces, even though language models use discrete token actions. In robotics, for example, an action might be a real-valued movement command rather than a vocabulary token. In that case, the policy network outputs parameters of a probability distribution, such as a mean and standard deviation for a Gaussian.

The log probability of the chosen continuous action is computed using the Gaussian log probability formula. Once the old and new log probabilities are available, the PPO ratio is computed in the same way as in the discrete case. The clipping objective does not depend on whether the action was a token or a continuous value. It only needs the probability ratio and the advantage.

## The TRL implementation

The HuggingFace TRL library provides practical tools for running PPO and related methods on language models. The example in the section uses a causal language model with a value head. The value head is needed for PPO because PPO estimates the expected return from each state and uses that estimate to compute advantages.

The example also uses LoRA adapters. LoRA makes training more efficient by updating a smaller set of low-rank adapter parameters instead of all model weights. This is useful for large models because full fine tuning can be expensive in memory and compute.

The PPO configuration includes the learning rate, batch size, mini-batch size, number of PPO epochs, discount factor, GAE lambda, clipping ranges, value loss coefficient, KL coefficient, target KL, reward whitening, gradient accumulation, and gradient norm clipping. These settings control stability, compute cost, and learning speed.

The training loop follows the same conceptual PPO process described earlier. It takes a batch of prompts, generates responses, scores them with a reward model, and then calls the PPO step function. The library handles internal details such as KL computation, advantage estimation, clipping, and statistics tracking.

## Critical hyperparameters

The clipping range controls how far the policy can move from the old policy on each update. A common value is 0.2. If it is too low, the model may barely learn because updates are overly restricted. If it is too high, training may become unstable because the policy can shift too aggressively.

The initial KL coefficient controls how strongly the model is penalized for moving away from the reference policy. If it is too low, the model may exploit the reward model or drift into strange behavior. If it is too high, the model may stay too close to supervised fine tuning and fail to improve.

The target KL is used by adaptive KL controllers to decide how conservative training should be. A lower target KL means the system tries to keep the policy closer to the reference. A higher target allows more movement, which can improve learning but also increases risk.

The number of PPO epochs determines how many times the algorithm reuses the same rollout batch. Too few epochs waste expensive generation data because the model does not learn enough from it. Too many epochs can overfit to that batch and break the on-policy assumption.

The learning rate must be small for large language model RL. If it is too high, the model can forget useful behavior or collapse. If it is too low, training becomes slow and may not produce meaningful improvement. PPO for LLMs often uses very small learning rates because the models are large and sensitive.

The batch size affects gradient smoothness and generation cost. Larger batches give more stable advantage estimates and smoother gradients, but they require more generation compute. Smaller batches are cheaper per step but noisier.

The sampling temperature controls exploration during response generation. A lower temperature produces safer and more predictable outputs but gives less exploration. A higher temperature gives more diverse samples but can make rewards and advantages noisier. PPO needs enough exploration to discover better behavior, but not so much randomness that the training signal becomes chaotic.

## The main takeaway

The section explains that reinforcement learning for language models is about turning text generation into a reward-driven decision process. The model is the policy, each token is an action, and the response is an episode. RLHF uses human preference rewards to align the model with human expectations, while RLVR uses verifiable rewards to improve reasoning and task success.

PPO is important because it gives a practical way to improve the policy without changing it too much at once. Its clipped objective, value function, entropy bonus, rollout buffer, KL penalty, and old-policy snapshot all work together to keep training stable. The central idea is controlled improvement: make good outputs more likely and bad outputs less likely, but keep each update small enough that the model does not collapse or exploit the reward signal.
