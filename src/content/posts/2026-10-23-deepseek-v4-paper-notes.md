---
title: "DeepSeek-V4: Detailed Notes in Simple Words"
pubDate: 2026-10-23
description: "Simple, detailed notes on DeepSeek-V4: hybrid CSA and HCA attention, million-token efficiency, Muon, infrastructure, and results."
---

# DeepSeek-V4: Detailed Notes in Simple Words

These notes are based on the full parsed text of the paper "DeepSeek-V4: Towards Highly Efficient Million-Token Context Intelligence" (arXiv 2606.19348v1, April 2026, DeepSeek-AI). The aim of the paper is narrow and ambitious at the same time. It is not mainly a paper about making a smarter chatbot. It is a paper about making a very long context cheap enough that people can use it every day. Almost every design choice in the paper follows from that single goal.

## The One-Sentence Summary

DeepSeek trained two Mixture-of-Experts language models, one with 1.6 trillion total parameters and one with 284 billion, and rebuilt their attention mechanism so that a one-million-token context costs a small fraction of what it used to cost, while still being competitive with the best closed models on knowledge, reasoning, coding, and agent tasks.

## The Two Models

DeepSeek-V4-Pro has 1.6 trillion total parameters, of which 49 billion are activated for each token. DeepSeek-V4-Flash has 284 billion total parameters, of which 13 billion are activated. Both support a context window of one million tokens natively, meaning they were trained on such lengths rather than merely being configured to accept them.

The name "Flash" is worth explaining. In a Mixture-of-Experts model, total parameters are the full library of knowledge stored on disk, and activated parameters are the small slice used for any single token. Flash keeps a big library but uses a very small slice per token, so it is cheap to run. Pro uses a much bigger slice and a much bigger library, so it is more capable and more expensive.

There is also a naming layer on top of the model names. Each model can run in different reasoning-effort modes, called Non-think, Think High, and Think Max. When the paper says DeepSeek-V4-Pro-Max, it means the Pro model running in the maximum reasoning effort mode. When it says DeepSeek-V4-Flash-Max, it means the Flash model in that same mode. In the tables, "Max", "xHigh", and "High" all refer to how much internal thinking the model is allowed to do before answering.

## The Problem the Paper Attacks

Modern reasoning models get better when they are allowed to think longer. Thinking longer means generating more tokens, and generating more tokens means the context grows. On top of that, real work increasingly involves long-horizon agents that read many files, call many tools, and keep a long history, plus tasks like analyzing an entire book or a whole set of documents at once.

Standard attention has a quadratic cost. If the sequence length doubles, the attention work roughly quadruples. Even worse for serving, the model must keep a Key-Value cache, usually called the KV cache, which stores the internal representations of every past token. At a million tokens, that cache becomes enormous and eats memory bandwidth. So the practical limit on context length is not usually the model's intelligence. It is memory and compute.

The paper states this clearly: the quadratic complexity of vanilla attention is the bottleneck that limits further test-time scaling and blocks long-horizon work. DeepSeek-V4 is an attempt to remove that bottleneck without simply accepting a weaker model.

## The Headline Efficiency Numbers

At a one-million-token context, DeepSeek-V4-Pro needs only 27 percent of the single-token inference FLOPs and 10 percent of the KV cache compared with DeepSeek-V3.2. DeepSeek-V4-Flash does even better on the FLOPs side, needing about 10 percent of the FLOPs and 7 percent of the KV cache. The paper also compares against a common attention setup, BF16 GQA with 8 groups and head dimension 128, and says the KV cache can be reduced to roughly 2 percent of that baseline at one million tokens.

A useful way to read these numbers is this. The model did not get a million-token context by buying more GPUs. It got there by making each token in the context much cheaper to store and much cheaper to look at.

![Figure 1: Benchmark performance and efficiency of DeepSeek-V4](/assets/img/dsv4_fig1_overview_efficiency.webp)

*Figure 1 shows the headline trade: benchmark scores on the left, and the drop in single-token FLOPs and accumulated KV cache versus DeepSeek-V3.2 on the right.*

## The Overall Architecture

DeepSeek-V4 keeps the basic Transformer shape. The feed-forward layers are still Mixture-of-Experts. The model still predicts multiple future tokens during training, a trick called Multi-Token Prediction. On top of that foundation, the paper changes three big things.

First, it replaces the plain residual connection between blocks with something called Manifold-Constrained Hyper-Connections, or mHC. Second, it replaces ordinary attention with a hybrid of two new attention designs, Compressed Sparse Attention and Heavily Compressed Attention, written as CSA and HCA. Third, it switches the optimizer from AdamW to Muon for most of the parameters. Everything else that is not explicitly changed follows DeepSeek-V3.

The paper is honest that this makes the architecture complicated. In the conclusion it says it kept many previously validated components and tricks to reduce risk, and that a future version will try to distill the design down to something more elegant.

![Figure 2: Overall architecture of DeepSeek-V4](/assets/img/dsv4_fig2_architecture.webp)

*Figure 2 shows the full stack: embedding, interleaved CSA and HCA attention, DeepSeekMoE feed-forward layers, and the mHC residual path.*

## What Was Kept from DeepSeek-V3

The Mixture-of-Experts design is DeepSeekMoE. It uses fine-grained routed experts plus a small number of shared experts that every token uses. Routing decides which experts each token goes to.

Two changes are worth noting. The activation function that computes how strongly a token matches an expert was changed from Sigmoid to the square root of Softplus. This is a small numerical change that affects how smoothly routing scores behave. Also, load balancing still uses the auxiliary-loss-free strategy, which nudges expert assignment with a bias term instead of adding a penalty to the loss, but a small sequence-wise balance loss is added on top so that a single sequence cannot dump almost everything onto a few experts.

Another change is that the constraint on the number of routing target nodes was removed, and the parallelism strategy was redesigned to keep training efficient without that constraint.

Finally, the dense feed-forward layers in the first several blocks were replaced with MoE layers that use Hash routing. Hash routing picks an expert by applying a fixed hash function to the token ID. There is no learned router for those first layers. This is cheap and deterministic, and it is used for the first three MoE layers in both models.

Multi-Token Prediction is kept exactly as in DeepSeek-V3. The model has extra prediction heads that guess tokens further ahead, which gives a denser training signal. The depth is set to 1 in both models.

## Manifold-Constrained Hyper-Connections in Simple Words

A normal residual connection does one thing: it adds the input of a layer to the output of that layer. That simple addition is what lets very deep networks train at all, because it gives gradients a short path backward.

Hyper-Connections, or HC, make this richer. Instead of carrying one copy of the hidden state, they carry several copies, called the residual stream width, controlled by a factor hc. Three small linear maps control how the copies are mixed on the way into a layer, how they are transformed, and how they are mixed on the way out. The actual layer still sees a single normal-sized vector, so the extra width costs very little compute. This gives the model an extra axis to scale along, separate from hidden size.

The problem is instability. When you stack many HC layers, the residual mixing matrix can amplify signals, and training starts to blow up numerically. DeepSeek-V4 fixes this with mHC by forcing the residual mixing matrix to be a doubly stochastic matrix. A doubly stochastic matrix has non-negative entries, every row sums to one, and every column sums to one. The set of all such matrices is called the Birkhoff polytope.

Why does this help. A doubly stochastic matrix has a spectral norm of at most one. In plain terms, it can never stretch a vector. It can only average and redistribute. So the residual transformation is non-expansive, which keeps the forward pass and the backward pass numerically calm. Also, if you multiply two doubly stochastic matrices, the result is still doubly stochastic. That closure property is what makes deep stacks safe, because the composition of many such maps cannot drift out of the safe set.

The input and output mixing maps are also constrained, using a Sigmoid, so they stay non-negative and bounded. The reason given is to avoid signal cancellation, which happens when positive and negative mixing weights cancel each other out.

The parameters of these three maps are not fixed numbers. They are generated dynamically from the input, using a small network that produces a raw value from a normalized version of the current residual state, plus a static learned bias. A learnable gate controls how much of the dynamic part is used, and it starts small so training begins near the static behavior.

The raw residual matrix then gets projected onto the Birkhoff polytope using the Sinkhorn-Knopp algorithm. That algorithm exponentiates the matrix to make everything positive, then alternately normalizes rows and columns. After enough rounds, the matrix converges to a doubly stochastic one. The paper runs 20 rounds. Twenty is a practical compromise between exactness and cost.

In the models, hc is set to 4. The engineering cost of mHC is real, because it adds memory and pipeline communication, but the paper says careful kernels and recomputation keep the wall-clock overhead to 6.7 percent of the overlapped pipeline stage.

## Why Attention Had to Be Rebuilt

The paper makes a point that is easy to miss. At extreme context lengths, attention stops being one cost among many and becomes the dominant cost. The MoE layers scale with the number of tokens, but attention scales with the number of tokens multiplied by the number of tokens each token must look at. So if you want a million tokens, you must reduce the number of things each token looks at, or make each thing much cheaper to store, or both.

DeepSeek-V4 does both, with two attention designs used in alternation.

## Compressed Sparse Attention, Step by Step

Compressed Sparse Attention combines two ideas. First, compress groups of tokens into single entries. Second, use sparse selection so each query only looks at a small chosen subset of those entries.

The compression part works like this. Start with the hidden states of the sequence. Compute two sets of Key-Value entries from them, and two sets of compression weights. Then take a block of m consecutive tokens, where m is 4 in both models. Each compressed entry is a weighted average of the entries in that block, where the weights come from a softmax over the compression weights plus a learned positional bias.

There is a subtlety. The compression is overlapped. The weights used for one compressed entry include the weights of the previous block as well as the current block. So a compressed entry is technically built from 2m raw entries, but neighbouring entries share half of their inputs. Because of that overlap, the net compression is exactly a factor of 1/m. The overlap exists to smooth the boundary between blocks, so a compressed entry does not lose the context that sits right at the edge.

The next part is the Lightning Indexer. This is a cheap scoring network that decides which compressed entries matter for each query. The query's hidden state is first squeezed down into a small latent vector, then expanded into many small indexer heads. Each indexer head compares the query to the compressed indexer keys, the results are passed through ReLU and combined with learned per-head weights. The output is one score per compressed block. The top-k scores are kept, where k is 512 for Flash and 1024 for Pro. Only those compressed entries go forward to the real attention.

The indexer is deliberately lightweight. It runs in FP4 precision, which the paper says speeds up the scoring a lot at extreme lengths. The indexer also uses compression, so the keys it compares against are already compressed.

The final part is the core attention. It uses Multi-Query Attention, which means all query heads share the same key and value. Here each selected compressed entry acts as both the key and the value. Because the entries are shared, the KV cache for core attention is tiny compared with normal multi-head attention.

One more engineering trick is the grouped output projection. The number of query heads is large, 64 in Flash and 128 in Pro, and each head has dimension 512. Projecting all of them at once back to the model dimension would be expensive. So the heads are split into groups, 8 groups in Flash and 16 in Pro. Each group is projected down to a smaller intermediate size, 1024 in both models, and then the group outputs are concatenated and projected to the final model dimension.

![Figure 3: Compressed Sparse Attention](/assets/img/dsv4_fig3_csa.webp)

*Figure 3 shows CSA compressing four tokens into one entry, then using the lightning indexer to pick the top-k compressed entries for shared key-value attention.*

## Heavily Compressed Attention, Step by Step

Heavily Compressed Attention is the same family of idea pushed much harder. It compresses by a factor of 128 instead of 4. It does not overlap its blocks. And it does not use sparse selection at all. Every query attends densely to every compressed entry.

That sounds expensive, but it is not, because after dividing by 128 there are very few entries left. At a million tokens there are only about 7812 compressed entries, which is a small attention problem. So HCA buys a cheap global view of the entire context.

HCA uses the same Multi-Query Attention and the same grouped output projection as CSA. Its queries are also produced in a low-rank way, squeezing the hidden state down and then expanding into query heads.

The division of labour between the two is the heart of the design. CSA keeps more detail, because it only compresses by 4, but it can only look at a chosen subset. HCA keeps almost no detail, but it looks at everything. Interleaving them means the model always has a cheap way to see the whole context and an affordable way to zoom into the parts that matter.

![Figure 4: Heavily Compressed Attention](/assets/img/dsv4_fig4_hca.webp)

*Figure 4 shows HCA compressing 128 tokens into one entry and attending densely over the much shorter compressed stream.*

## Small Details That Make the Hybrid Attention Work

Queries and compressed KV entries get an extra RMSNorm just before core attention, on each head. This stops attention logits from exploding, which is a common source of training instability at scale.

Rotary Positional Embedding, or RoPE, is applied only to the last 64 dimensions of each query and KV entry. This is partial RoPE. There is a subtle problem here. Because a KV entry is used as both key and value, the attention output naturally carries the absolute position of the entries it summed over. The model does not want absolute positions in its output, it wants relative ones. So the paper applies RoPE again, with the negative of the query position, to the last 64 dimensions of each output. After that, what remains in the output is the relative distance between the query and each entry.

Each query also has a sliding window branch. When a query is in the middle of a compressed block, it cannot see the other tokens in its own block, because compression only lets it see completed earlier blocks. That hurts, because recent tokens usually matter most in language modeling. So the model keeps the uncompressed KV entries for the most recent 128 tokens and attends to them directly alongside the compressed entries. This preserves fine-grained local dependencies and also enforces causality.

There is also an attention sink. Each attention head gets a learnable logit that is added to the denominator of the softmax but has no matching key. This lets a head reduce its total attention weight, even down to near zero. In plain terms, it gives the head a way to say "nothing here is relevant" instead of being forced to distribute attention somewhere.

## Why the Whole Thing Is Cheaper

Three things stack up. The KV cache uses a mixed format. The RoPE dimensions are stored in BF16, and the rest is stored in FP8. That alone nearly halves the cache compared with pure BF16. The indexer runs in FP4. And the attention top-k was chosen smaller than in DeepSeek-V3.2, which helps on short and medium texts where most tokens are not needed.

The result is the headline number. At a million tokens, the cache is around 2 percent of a standard BF16 grouped-query baseline, and the FLOPs are a small fraction of the previous model.

It is worth being precise about what "FLOPs" means here. The paper measures equivalent FP8 FLOPs. The routed expert weights are stored in FP4. On current hardware, FP4 times FP8 does not actually run faster than FP8 times FP8, so this is not yet a real speed win. But the paper points out that future hardware could make it up to one third more efficient, which would widen the advantage.

## The Muon Optimizer

AdamW treats every parameter as an independent number and adapts its learning rate using running averages of gradients and squared gradients. Muon treats a weight matrix as a matrix. It takes the gradient, adds momentum, and then orthogonalizes the update using Newton-Schulz iterations. Orthogonalizing means pushing all the singular values of the update matrix toward one. The effect is that every direction in the update gets a similar magnitude, which tends to produce faster and more stable convergence for hidden-layer matrices.

The paper uses Muon for most modules but keeps AdamW for the embedding, the prediction head, the static biases and gates of mHC, and all RMSNorm weights. This split is common, because those parameters are vectors or scalars where matrix orthogonalization does not make sense.

The Muon variant here includes weight decay, the Nesterov trick, and a rescaling of the update's root mean square so the same learning rate schedule as AdamW can be reused.

The interesting detail is the hybrid Newton-Schulz schedule. It runs 10 iterations split into two stages. The first 8 iterations use aggressive coefficients, 3.4445, negative 4.7750, and 2.0315, to drive the singular values quickly toward one. The last 2 iterations switch to gentler coefficients, 2, negative 1.5, and 0.5, which settle the singular values precisely at one instead of overshooting. This is a small numerical trick with a real effect on stability.

The paper also notes that it does not need QK-Clip, a technique used elsewhere to stop attention logits from exploding, because the extra RMSNorm on queries and KV entries already handles that.

![Algorithm 1: Muon optimizer for DeepSeek-V4](/assets/img/dsv4_alg1_muon.webp)

*Algorithm 1 is the Muon update: momentum, a Nesterov step, hybrid Newton-Schulz orthogonalization, RMS rescaling, and weight decay.*

## Infrastructure Part One: Making Expert Parallelism Overlap

Mixture-of-Experts is usually spread across GPUs using Expert Parallelism. Different experts live on different GPUs, so tokens must be shipped to the GPU that owns the right expert, computed there, and shipped back. That shipping is communication, and at scale it can dominate.

The paper's insight is simple and powerful. Inside one MoE layer there are four stages. Dispatch sends tokens out. Linear-1 and Linear-2 are the two matrix multiplications of the expert. Combine sends results back. Two of these are communication-bound and two are compute-bound. Profiling shows that total communication time is less than total computation time. So if you pipeline them properly, communication can hide entirely under computation, and the system can tolerate lower interconnect bandwidth without slowing down.

The scheme is finer-grained than prior work. Prior work overlaps dispatch with Linear-1 and Linear-2 with combine, which gives a theoretical 1.42 times speedup. DeepSeek-V4 splits experts into waves. Each wave holds a small set of experts. As soon as a wave's tokens arrive, its computation starts, without waiting for the rest. In steady state, the current wave computes, the next wave's tokens travel, and finished results stream back, all at the same time. That raises the theoretical speedup to 1.92 times.

In practice, on both NVIDIA GPUs and Huawei Ascend NPUs, they measure 1.50 to 1.73 times speedup for general inference, and up to 1.96 times for latency-sensitive cases like reinforcement learning rollouts and fast agent serving. The CUDA mega-kernel is open sourced as MegaMoE inside DeepGEMM.

![Figure 5: Communication-computation overlap for expert parallelism](/assets/img/dsv4_fig5_ep_overlap.webp)

*Figure 5 compares naive execution, the earlier Comet overlap, and the wave-based scheme used here, which reaches a theoretical 1.92 times speedup.*

The paper then gives hardware advice, which is unusual and useful. The key formula is that communication is fully hidden when the ratio of peak compute to bandwidth is at most the ratio of computation volume to communication volume. For DeepSeek-V4-Pro, each token-expert pair costs 6 times the hidden size in FLOPs, for the SwiGLU gate, up, and down projections, and only 3 times the hidden size in bytes, because dispatch is FP8 and combine is BF16. That simplifies to a required ratio of 2 times the hidden size, which is 6144 FLOPs per byte. In plain terms, each gigabyte per second of interconnect bandwidth can hide the communication for about 6.1 teraflops per second of compute. Past that threshold, more bandwidth stops helping, so hardware designers should aim for that balance point rather than adding bandwidth without limit.

The other advice is about power, because extreme fusion drives compute, memory, and network hard at the same time, so power throttling becomes a real limiter. It also suggests that future hardware with lower-latency cross-GPU signalling would make push-based communication viable instead of the pull-based approach they use, and it suggests replacing SwiGLU with a cheaper activation that avoids exponentials and division, so activation cost does not stall the matrix multiplication pipeline.

## Infrastructure Part Two: TileLang

The model architecture, if written naively, would need hundreds of small PyTorch operators. That is slow because each operator launch has overhead and because fusion opportunities are lost. DeepSeek-V4 uses TileLang, a domain-specific language, to write fused kernels that replace most of those operators.

Two TileLang improvements are described. The first is Host Codegen. Normally, the host-side part of a kernel call, the checks on shapes and data types and strides, is written in Python, and that costs tens or hundreds of microseconds per call. Host Codegen generates a lightweight host launcher at the same time as the device kernel, moving the validation and argument marshalling out of Python. That drops the overhead below one microsecond per call.

The second is integrating the Z3 SMT solver. Kernels involve complicated integer index arithmetic, and the compiler needs to prove facts about those expressions to enable optimizations like vectorization and safe memory access. Z3 can reason about these constraints formally. The paper translates TileLang integer expressions into a fragment of arithmetic that Z3 handles well, and reports that compilation overhead stays at a few seconds while unlocking better optimization.

There is also a strong stance on numerical correctness. Fast-math is off by default. Approximate exp, log, and sin are available only as explicit opt-in operators. IEEE-compliant intrinsics with explicit rounding modes exist for when strict semantics are needed. And TileLang tries to match the bit-level behavior of standard CUDA toolchains, so kernels can be validated bit-for-bit against hand-written references. The paper says this discipline does not cost performance in practice.

## Infrastructure Part Three: Batch Invariance and Determinism

This section is easy to skip and should not be. These properties are what make a model debuggable and what make training and inference behave the same way.

Batch invariance means a token's output is bit-for-bit identical no matter which position it occupies in a batch, or how many other sequences are running alongside it. This is surprisingly hard. Normal fast attention splits one long sequence across many GPU streaming multiprocessors to balance load, which is called split-KV. But that changes the order of additions, and floating-point addition is not associative, so the result changes slightly. The paper cannot use split-KV for batch-invariant decoding. Instead it uses two kernels. The first computes a whole sequence on a single SM, which is efficient when the GPU is full. The second handles the last partially filled wave, using multiple SMs to reduce latency, and is carefully written to add things in exactly the same order as the first. Distributed shared memory lets those SMs exchange data quickly. The overhead ends up negligible.

For matrix multiplication, cuBLAS cannot guarantee batch invariance, so it is replaced end to end with DeepGEMM. Split-K, a technique for small batches, also breaks invariance, so it is dropped in most cases, and other optimizations are added to recover the lost speed.

Determinism means running the same code twice gives the same bits. Non-determinism usually comes from atomic addition, where many threads add into one memory location in an unpredictable order. Three places are fixed. In attention backward, each SM gets its own accumulation buffer, followed by a deterministic global sum. In MoE backward, tokens are pre-ordered within each rank and buffers are isolated across ranks, so writes never race. In the mHC matrix multiplication, which has a tiny output dimension of 24 and must use split-K at small batch sizes, each split is written separately and reduced in a second kernel in a fixed order.

## Infrastructure Part Four: Training Framework

Muon needs the full gradient matrix to compute an update, but ZeRO, the standard memory-saving technique, works by splitting a parameter matrix across ranks. That is a conflict. The solution is a hybrid ZeRO strategy.

For dense parameters, the degree of ZeRO parallelism is capped. A knapsack algorithm assigns whole matrices to ranks so the load is balanced, and buckets are padded to equal size so reduce-scatter is efficient. Padding costs under 10 percent of memory, because each rank holds at most five matrices. If data parallelism exceeds the ZeRO limit, the extra groups simply recompute the Muon update redundantly, trading compute for memory.

For MoE parameters, each expert is handled independently. Down projections from all experts and layers are flattened first, then up projections, then gate matrices, and the whole thing is padded so it divides evenly without splitting any single logical matrix. Because there are so many experts, padding is negligible and no ZeRO cap is needed.

Two more optimizations matter. Consecutive parameters with the same shape are merged so Newton-Schulz runs in batches, which uses the hardware better. And because Newton-Schulz stays stable in BF16, the MoE gradients that get synchronized across data-parallel ranks are stochastically rounded to BF16, halving communication. To avoid the accumulation error that low-precision adders would introduce, the usual tree or ring reduce-scatter is replaced by an all-to-all exchange followed by a local FP32 sum.

The mHC implementation gets three optimizations. Fused kernels for training and inference. Selective recomputation that stores most hidden states between layers and all normalized layer inputs, while avoiding recomputation of expensive operations. And an adjusted pipeline schedule that accommodates the extra communication.

Contextual parallelism is the next problem. Normal context parallelism splits the sequence across ranks, each holding a contiguous chunk. But compression needs consecutive entries, which may straddle a rank boundary, and compressed lengths vary because trailing tokens shorter than a block get dropped. The fix is two-stage communication. Each rank first sends its last few uncompressed entries to the next rank, which compresses them together with its own, producing a fixed padded length. Then an all-gather collects the locally compressed entries, and a fused select-and-pad operator arranges them into the full set, with padding at the tail.

Finally, activation checkpointing is made finer-grained. Normally you either keep a module's output or recompute the whole module. Here, developers annotate individual tensors, the framework traces the computation graph with TorchFX, and for each annotated tensor it finds the smallest subgraph needed to recompute it and inserts that before the corresponding gradient computation. Recomputation frees the GPU memory and reuses the storage pointer, so there is no copy. Because the trace knows which tensors share storage, it also avoids recomputing the same thing twice.

## Infrastructure Part Five: The Inference Cache

The hybrid attention creates a messy cache. Different layers have different entry types and sizes. The indexer has its own keys. Sliding window layers have their own policy. And tokens that are not yet enough to fill a compression block must be buffered.

PagedAttention, the standard way to manage KV caches, assumes uniform blocks and uniform policies. That assumption breaks here. So DeepSeek-V4 splits the cache into two parts.

The state cache is a fixed pool of small blocks, one per request. Inside a request's block, one segment holds the sliding window entries for the most recent 128 tokens, and another holds the uncompressed tail tokens waiting to be compressed. Treating this as a per-sequence state, rather than as paged memory, matches how it actually behaves.

![Figure 6: KV cache layout for hybrid attention](/assets/img/dsv4_fig6_kv_cache_layout.webp)

*Figure 6 shows the two-part cache: a fixed state cache per request for sliding-window and uncompressed tail tokens, plus paged blocks of compressed CSA and HCA entries.*

The classical KV cache holds the compressed entries, with several blocks per request. Each block covers a number of original tokens equal to the least common multiple of the two compression rates, 4 and 128, which is 128 tokens. That produces 32 CSA entries and 1 HCA entry per block. The cache layout and the sparse attention kernel are designed together, so different layers can use different numbers of tokens per block without slowing down.

## On-Disk KV Cache

For a chat service, many requests share the same prefix, such as a long system prompt or a shared document. Recomputing that prefix every time is wasteful. DeepSeek-V4 stores compressed KV entries on disk and reuses them when a prefix is hit, up to the last complete compression block. The incomplete tail must be recomputed, because uncompressed entries are not stored.

Sliding window entries are a problem because they are not compressed and exist in every layer, making them about 8 times larger than the compressed cache. The paper offers three strategies. Full caching stores everything, giving zero recomputation but a very write-heavy and unbalanced access pattern on SSDs. Periodic checkpointing stores the last window of entries every N tokens, so you load the nearest checkpoint and recompute the tail, trading storage against compute. Zero caching stores nothing and recomputes the last window times the number of layers, using the stored compressed entries as a starting point. The right choice depends on deployment.

## Pre-Training Data

The corpus builds on DeepSeek-V3 data but is larger and cleaner. Web data is filtered to remove mass-produced and templated content, which reduces the risk of model collapse from training on model-generated sludge. Math and code remain central, and agentic data is added during mid-training to improve coding. Multilingual coverage is expanded to capture long-tail cultural knowledge. Long documents get special attention, with priority on scientific papers and technical reports.

The total is over 32 trillion tokens. Tokenization keeps the DeepSeek-V3 tokenizer and 128K vocabulary, with a few new special tokens for context construction. Document packing and fill-in-the-middle are inherited. One change is that sample-level attention masking is used during pre-training, so packed documents do not leak into each other.

## Model Configurations

DeepSeek-V4-Flash has 43 Transformer layers and hidden dimension 4096. The first two layers use pure sliding window attention. After that, CSA and HCA alternate. CSA uses compression rate 4, 64 indexer query heads, indexer head dimension 128, and top-k 512. HCA uses compression rate 128. Both use 64 query heads, head dimension 512, and query compression dimension 1024. There are 8 output projection groups, each producing an intermediate attention output of size 1024. The sliding window is 128 tokens. Every block is MoE, with Hash routing in the first 3 MoE layers. Each MoE layer has 1 shared expert and 256 routed experts, each expert with intermediate dimension 2048, and 6 experts activate per token. MTP depth is 1. mHC expansion is 4, with 20 Sinkhorn iterations. Total parameters 284 billion, active 13 billion.

DeepSeek-V4-Pro has 61 layers and hidden dimension 7168. The first two layers use HCA rather than sliding window. CSA also uses rate 4 but top-k 1024. HCA uses rate 128. There are 128 query heads, head dimension 512, query compression dimension 1536, 16 output groups, and intermediate attention output 1024. Window size is 128. Every block is MoE, Hash routing in the first 3. Each layer has 1 shared expert and 384 routed experts with intermediate dimension 3072, and 6 activate per token. MTP depth 1. mHC expansion 4, 20 Sinkhorn iterations. Total 1.6 trillion, active 49 billion.

## Training Setups

Flash trains on 32 trillion tokens. Batch size ramps up to 75.5 million tokens and stays there for most of training. Learning rate warms up over 2000 steps, holds at 2.7 times ten to the minus four, then cosine-decays to 2.7 times ten to the minus five. Sequence length starts at 4 thousand, then extends to 16 thousand, 64 thousand, and 1 million.

Pro trains on 33 trillion tokens, with max batch 94.4 million, peak learning rate 2.0 times ten to the minus four, and final 2.0 times ten to the minus five. Otherwise the recipe is the same, except Pro spends longer in the dense-attention stage.

Both use AdamW with beta values 0.9 and 0.95, epsilon ten to the minus twenty, weight decay 0.1. Muon uses momentum 0.95, weight decay 0.1, and rescales update RMS to 0.18 so the AdamW learning rate can be reused. Sparse attention is introduced in two stages. Dense attention is used first, then the indexer is warmed up, then sparse attention runs for most of training at 64 thousand tokens and above. Load balancing uses a bias update speed of 0.001 and a balance loss weight of 0.0001. The MTP loss weight is 0.3, dropping to 0.1 when the learning rate starts decaying.

## The Training Instability Story

Training a trillion-parameter MoE is unstable. The team hit loss spikes. Simple rollbacks restored the state but did not prevent the spike from coming back. They noticed spikes were consistently tied to outliers in MoE layers, and that the routing mechanism itself makes outliers worse. That creates a feedback loop. An outlier changes routing, routing sends more tokens to a few experts, those experts grow, and the problem compounds.

They fixed it with two techniques and admit they do not fully understand why either works.

Anticipatory Routing decouples the backbone from the router in time. At step t, the features are computed with the current parameters, but the routing indices come from parameters that are delta steps older. To avoid loading parameters twice, the data for step t is fetched early, at step t minus delta, and the routing indices are computed and cached in advance. That single forward pass costs about 20 percent extra wall time if run all the time, so it is triggered only when a spike is detected, and the system reverts to normal training afterward. This keeps the average overhead near zero.

SwiGLU Clamping simply clamps the linear part of SwiGLU to the range minus 10 to 10, and caps the gate's upper bound at 10. This removes extreme values. The paper says it eliminated outliers and stabilized training without hurting performance.

## Base Model Results

The base models are compared in one internal framework with consistent settings. The interesting result is that Flash-Base, with 13 billion active and 284 billion total parameters, beats V3.2-Base, which has 37 billion active and 671 billion total, on most benchmarks. Examples are MMLU-Pro rising from 65.5 to 68.3, MMLU-Redux from 87.5 to 89.4, C-Eval from 90.4 to 92.1, and LongBench-V2 from 40.2 to 44.7. That is a strong statement that the architecture and data work, not just the parameter count.

Pro-Base then goes further, with MMLU-Pro 73.5, Simple-QA verified 55.2 versus 28.3 for V3.2, FACTS Parametric 62.6 versus 27.1, LongBench-V2 51.5, and HumanEval 76.8 versus 62.8.

![Table 1: Base model comparison](/assets/img/dsv4_table1_base.webp)

*Table 1 compares the base models. Note that Flash-Base, with far fewer parameters, beats V3.2-Base on most rows.*

## Post-Training: The Two-Stage Idea

The old DeepSeek pipeline mixed reinforcement learning across domains in one stage. DeepSeek-V4 replaces that mixed RL stage entirely with on-policy distillation. The structure is now two stages. First, train separate specialists, one per domain, such as math, coding, agent, and instruction following. Second, merge them into one model by distillation.

Each specialist starts from the base model, gets supervised fine-tuning on high-quality domain data, then gets reinforcement learning with GRPO, guided by reward signals designed for that domain. GRPO compares a group of sampled answers for the same prompt and rewards the ones that do better than the group average, which avoids needing a separate value network.

The merge is the hard part. Merging weights directly tends to damage skills. Mixed RL across all domains at once tends to be unstable and to trade one skill against another. On-policy distillation avoids both by training a single student on its own generated trajectories, while matching the output distribution of the relevant teacher at each token.

The loss is a weighted sum of reverse KL divergences between the student and each teacher. Reverse KL means the student is penalized for putting probability where the teacher does not, which tends to make the student concentrate on the teacher's high-probability behavior. Because the trajectories come from the student, the student is learning on the distribution it will actually visit, which is why it is called on-policy. More than ten teachers are used for one student.

A key engineering choice is full-vocabulary distillation. A cheaper approach estimates the KL at each token position with a single scalar, which is what you do when you reuse an RL framework. That is noisy and unstable. DeepSeek-V4 computes the KL over the entire vocabulary instead, which gives a lower-variance gradient and a more faithful transfer.

## Reasoning Modes

The model supports three modes. Non-think answers quickly and intuitively, for routine tasks and low-risk decisions. Think High does deliberate analysis, slower but more accurate, for complex problem solving and planning. Think Max pushes reasoning to the limit, for exploring the boundary of capability.

The mode is implemented with length penalties and context windows during RL, plus response formatting with think tags. Max also gets a special system prompt that instructs the model to be extremely thorough, decompose the problem, stress-test its logic, consider alternatives and edge cases, and write out its full deliberation. The Max mode uses a 384 thousand token context, High uses 128 thousand, and Non-think uses 8 thousand, with temperature 1.0 for knowledge and reasoning tasks.

![Table 2: The three reasoning modes](/assets/img/dsv4_table2_reasoning_modes.webp)

*Table 2 compares the three reasoning modes and the response format each one uses.*

## The Generative Reward Model

For tasks that are easy to check, like math with a known answer or code with tests, rule-based rewards work. For open-ended tasks, the usual approach is to train a separate scalar reward model from human ratings, which is expensive and lossy. DeepSeek-V4 instead uses a Generative Reward Model. The actor model itself acts as the judge. It is trained on rubric-guided data to evaluate trajectories in text, and the same model is also optimized for its normal generation task. The claim is that the model's reasoning ability then feeds into its judging, making the scores more robust, and that only a small amount of human annotation is needed because the model generalizes with its own logic.

## Tool Calls, Interleaved Thinking, and Quick Instruction

The new tool-call format uses an XML-like syntax with a special token called DSML. Instead of JSON, the model writes an invoke block with named parameters. The paper says XML reduces escaping failures and tool-call errors compared with JSON in strings.

Interleaved thinking is improved. In DeepSeek-V3.2, reasoning traces were kept across tool-result rounds but thrown away when a new user message arrived. That wastes work, because the model has to rebuild its state. With a million-token context, V4 can keep the whole reasoning history across user turns in tool-calling scenarios, so the chain of thought stays cumulative over a long agent task. In ordinary conversation, the old behavior is kept, discarding old reasoning to keep the context clean.

![Figure 7: Thinking management with and without tools](/assets/img/dsv4_fig7_thinking.webp)

*Figure 7 shows the two thinking policies: with tools, the full reasoning history is kept across turns; without tools, old reasoning is dropped when a new user message arrives.*

Quick Instruction is a neat latency trick. Chatbots usually need small auxiliary decisions before answering, like whether to search the web, what the conversation title should be, and what queries to issue. Normally a separate small model does this, which means prefill the prompt twice. Instead, V4 appends special tokens to the same input, one per task, and reads the answers from the same forward pass. That reuses the KV cache, avoids a second prefill, lets several tasks run in parallel, and removes the need to maintain a second model. The tokens cover action, title, query, authority, domain, extracted URL, and read URL.

![Table 5: Quick Instruction special tokens](/assets/img/dsv4_table5_quick_instruction.webp)

*Table 5 lists the Quick Instruction tokens that turn small auxiliary tasks into one extra read of the same forward pass.*

## Post-Training Infrastructure

FP4 quantization-aware training is applied to two things. MoE expert weights, which dominate memory, and the query-key path of the CSA indexer, where activations are cached, loaded, and multiplied entirely in FP4. The index scores are also dropped from FP32 to BF16, which gives twice the speed in the top-k selector while keeping 99.7 percent recall of the chosen entries.

The FP4 to FP8 dequantization is lossless, which is a nice detail. FP8 has two more exponent bits than FP4, so it has much more dynamic range. As long as the ratio between the largest and smallest FP4 scale factors inside an FP8 block stays under a threshold, the finer scales fit inside FP8's range. The paper checks that current weights satisfy this. Because of that, the whole QAT pipeline reuses the existing FP8 training code unchanged. In the backward pass, gradients are taken with respect to the same FP8 weights used in the forward pass, which is equivalent to a straight-through estimator, and they flow back to the FP32 master weights. During inference and rollout, native FP4 weights are used directly, so sampling matches deployment exactly.

Teacher scheduling for distillation is a memory problem. Teachers can each be trillions of parameters, and there can be more than ten. All teacher weights live in centralized storage and are loaded on demand with ZeRO-like sharding. Materializing logits over a vocabulary above 100 thousand for every teacher is impossible, so only the last-layer hidden states are cached during the teacher forward pass, and the logits are reconstructed on the fly by running those states through the right prediction head. Samples are ordered by teacher so each head is loaded once per mini-batch and at most one head is on the GPU. A custom TileLang kernel computes the exact KL divergence.

The rollout service is preemptible and fault tolerant, which matters because the cluster is shared and hardware fails. Every generated token is appended to a write-ahead log, so a request can be paused, its KV cache saved, and decoding resumed later. After a hard failure, the prefill can be rerun from the logged tokens. The paper makes a sharp point about correctness. Regenerating unfinished requests from scratch is mathematically wrong because it introduces length bias. Short responses are more likely to have finished before the interruption, so restarting makes the model look like it prefers shorter answers. A deterministic sampler with a fixed seed would fix the bias but still wastes the work already done.

For million-token RL, rollout data is split into light metadata and heavy per-token fields. Metadata is loaded globally for shuffling and packing, while heavy fields stream through a shared-memory loader and are freed as soon as a mini-batch consumes them. The number of on-device mini-batches adapts to the workload.

The sandbox platform is called DSec, short for DeepSeek Elastic Compute. It is written in Rust with an API gateway, a per-host agent, and a cluster monitor, all on top of the 3FS distributed filesystem, and a single cluster runs hundreds of thousands of sandboxes. It exposes one Python interface over four execution substrates. Function Call runs stateless code in a pre-warmed container pool. Container is Docker-compatible with on-demand image loading through EROFS. microVM uses Firecracker for stronger isolation at high density. fullVM uses QEMU for arbitrary operating systems. Images load in layers, with read-only bases shared across instances and writes going to local copy-on-write layers. Each sandbox keeps an ordered trajectory log, which allows fast-forwarding after preemption, provenance tracking, and deterministic replay.

## Benchmark Results

The paper evaluates against Opus 4.6 Max, GPT-5.4 xHigh, Gemini 3.1 Pro High, Kimi K2.6 Thinking, and GLM-5.1 Thinking. The comparison is not a clean sweep, and the paper does not pretend it is.

![Table 6: Main comparison against frontier models](/assets/img/dsv4_table6_results.webp)

*Table 6 is the main comparison against closed and open frontier models at maximum reasoning effort.*

On knowledge, DeepSeek-V4-Pro-Max reaches 57.9 on SimpleQA-Verified, far above the open models at 36 to 38, but below Gemini at 75.6. On Chinese-SimpleQA it reaches 84.4, close to Gemini's 85.9. On MMLU-Pro it is 87.5, behind Gemini at 91.0 and Opus at 89.1. On GPQA it is 90.1, behind Opus at 91.3 and Gemini at 94.3. On HLE it is 37.7, behind all three closed models. The pattern is clear. V4-Pro-Max is the best open model on world knowledge by a wide margin, but still trails the best closed model.

On reasoning and coding, the picture is stronger. LiveCodeBench is 93.5, the best in the table. Codeforces rating is 3206, the best in the table, and the paper says it would rank 23rd among human competitors. HMMT is 95.2, close to GPT-5.4 at 97.7. IMOAnswerBench is 89.8. Apex Shortlist is 90.2, the best in the table, though on full Apex it is 38.3, behind GPT and Gemini. The paper says this puts it about three to six months behind the frontier.

On long context, the results are the point of the paper. On MRCR at one million tokens it scores 83.5, ahead of Gemini at 76.3 but behind Opus at 92.9. On CorpusQA at one million tokens it scores 62.0, ahead of Gemini at 53.8 but behind Opus at 71.7. The paper emphasizes that retrieval stays stable to 128 thousand tokens and degrades gracefully beyond that.

![Figure 9: Retrieval accuracy on MRCR up to one million tokens](/assets/img/dsv4_fig9_retrieval.webp)

*Figure 9 shows retrieval accuracy on MRCR from 8K to 1M tokens. It stays flat to about 128K and then degrades gradually.*

On agents, Terminal Bench 2.0 is 67.9, below Opus at 75.1 and Gemini at 68.5, and roughly level with K2.6 and GLM. SWE Verified is 80.6, essentially tied with Opus and Gemini. SWE Pro is 55.4, behind most rivals. BrowseComp is 83.4. HLE with tools is 48.2. GDPval-AA Elo is 1554, behind Opus and GPT. MCPAtlas is 73.6, near the top. Toolathlon is 51.8, behind GPT at 54.6.

Within the family, the gap between Flash and Pro is largest on knowledge, which makes sense because knowledge lives in parameters. Flash catches up substantially on reasoning when given a bigger thinking budget. On Apex, for example, Flash-Max gets 33.0 against Pro-Max at 38.3, while Non-think modes get 1.0 and 0.4.

![Table 7: Flash and Pro across reasoning modes](/assets/img/dsv4_table7_modes.webp)

*Table 7 compares Flash and Pro across Non-think, High, and Max modes.*

![Figure 10: Performance versus generated tokens](/assets/img/dsv4_fig10_reasoning_effort.webp)

*Figure 10 shows how performance scales with total generated tokens on HLE and Terminal Bench 2.0.*

The formal math results deserve their own mention. In the practical regime, Putnam-200 Pass@8 with minimal tools, Flash-Max scores 81.00 against 35.50 for Seed-2.0-Pro. In the frontier regime, Putnam 2025 with hybrid formal and informal reasoning and heavy compute, DeepSeek-V4 solves all 120 problems, tying Axiom and beating Aristotle at 100 of 120.

![Figure 8: Formal reasoning on Putnam problems](/assets/img/dsv4_fig8_formal_math.webp)

*Figure 8 shows formal mathematics results: a bounded practical setting on the left and a compute-heavy hybrid formal-informal setting on the right.*

## Real-World Task Evaluations

The paper argues that standard benchmarks miss real usage, so it also runs internal evaluations that mirror the actual product.

For Chinese functional writing, V4-Pro beats Gemini 3.1 Pro with a 62.7 percent win rate against 34.1 percent, with the rest ties. The stated reason is that Gemini sometimes lets its own style override the user's explicit instructions. For creative writing, V4-Pro wins 60.0 percent on instruction following and 77.5 percent on writing quality. On the hardest prompts, involving complex constraints and multi-turn work, Claude Opus 4.5 still wins, 52.0 percent to 45.9 percent.

For white-collar Chinese tasks, the team built 30 advanced tasks across 13 industries, judged by humans on task completion, instruction following, content quality, and formatting. V4-Pro-Max has a 63 percent non-loss rate, with 53 percent wins, 10 percent ties, and 37 percent losses against Opus 4.6-Max. Its strengths are completing the task and content quality, including anticipating implicit intent and writing long coherent documents instead of bullet fragments. Its weaknesses are occasionally missing formatting constraints, summarizing long inputs, and slide design.

![Figures 11 and 12: White-collar task evaluation](/assets/img/dsv4_fig11_12_white_collar.webp)

*Figures 11 and 12 show the white-collar evaluation: win rate by task type on the left, per-dimension scores on the right.*

For search, agentic search beats retrieval-augmented search in 61.7 percent of 869 comparisons, at only slightly higher cost, with about 16 tool calls per query on average versus none.

For internal R&D coding, the team collected about 200 tasks from 50 or more engineers and kept 30 after filtering. On this benchmark V4-Pro-Max passes 67 percent, compared with 47 percent for Claude Sonnet 4.5, 70 percent for Opus 4.5, and 80 percent for Opus 4.6 in thinking mode. In an internal survey of 85 developers, 52 percent said V4-Pro is ready to be their default coding model, 39 percent leaned yes, and fewer than 9 percent said no. Common complaints were small mistakes, misreading vague prompts, and over-thinking.

![Table 8: Internal R&D coding benchmark](/assets/img/dsv4_table8_rd_coding.webp)

*Table 8 compares pass rates on the internal R&D coding benchmark.*

## Honest Limitations the Paper Admits

The architecture is complex because it kept many validated tricks to reduce risk. The team wants to distill it to something more essential in future work.

Anticipatory Routing and SwiGLU Clamping work, but nobody fully understands why. The team wants a more principled theory of training stability.

The model still trails the frontier on knowledge and on the hardest agent tasks, by roughly three to six months by their own estimate.

Future directions include sparsity in new places, such as sparse embedding modules, low-latency architectures for interactive long-context use, better long-horizon multi-round agents, multimodal capability, and better data curation and synthesis.

## What the Research Was Trying to Make Possible

The paper is trying to make million-token context ordinary. Not a demo, not a benchmark entry, but a context length you can serve to real users at a real price.

That matters because the current way to make models smarter is to let them think longer, and the current way to make them useful for real work is to let them see more. Both of those push context length up. If every extra token costs quadratically more compute and linearly more memory, then test-time scaling and long-horizon agents stay expensive experiments. If a million tokens becomes cheap, then an agent can read a whole repository, keep a full day of tool history, or work through a stack of papers in one pass, and reasoning can run for a very long time without hitting a wall.

So the research is really trying to make the next stage of scaling affordable, not to win a benchmark by a point. The efficiency numbers are the actual contribution. 27 percent of the FLOPs and 10 percent of the cache at a million tokens is the claim that changes what is practical.

## What Becomes Obvious After Reading It

The first thing that becomes obvious is that long context is mostly a memory problem, not a parameter problem. The paper barely changes the feed-forward design. Almost all the work goes into how past tokens are stored and how many of them each new token looks at. The KV cache is the real enemy, and compression is the real weapon.

The second is that compression and sparsity are not competing ideas, they are sequential steps that multiply. Compress first, then select. Compression reduces the number of things to look at, and sparsity reduces the number of things you actually look at. Doing only one leaves a lot of cost on the table.

The third is that a hybrid of a detailed-but-selective branch and a coarse-but-complete branch is a better answer than either alone. CSA alone risks dropping the one entry that mattered. HCA alone loses detail. Alternating them means the model always has a cheap global view and an affordable close-up. This is a general design pattern, not a DeepSeek-specific trick.

The fourth is that most of the difficulty in a frontier model is infrastructure, not math. The genuinely novel equations in this paper would fit on a few pages. The rest is kernels, determinism, cache layout, pipeline scheduling, teacher scheduling, and sandbox orchestration. That is not padding. At this scale, a ten percent inefficiency in the systems layer costs more than a clever architectural tweak gains.

The fifth is that reproducibility is a design constraint, not a debugging afterthought. Making a model bitwise batch-invariant and deterministic changes which algorithms you are allowed to use, and they chose to pay that price so training and inference match and so loss spikes can be diagnosed.

The sixth is that training instability at trillion scale is a routing feedback problem, and the fix can be as crude as clamping a value to a range. It is striking that two of the paper's stability techniques are admitted to be empirically effective but theoretically unexplained.

The seventh is that distillation has become the way to merge specialists. Mixed RL forces domains to compete inside one policy. Distillation lets each expert stay specialized and transfers the behavior into a single student at the logit level, which sidesteps the damage that weight merging causes.

The eighth is that a context-length number is a systems claim. Supporting a million tokens required on-disk caches, preemptible rollouts, write-ahead logs, token-granular recovery, and a sandbox platform for hundreds of thousands of environments. The number in the abstract is backed by a lot of engineering that never appears in the abstract.

## What Long-Running Problem This Paper Moved

The clearest one is the quadratic cost of attention. This is a problem the field has been chipping at since the original Transformer, through sparse attention, linear attention, sliding windows, retrieval, state-space models, and compression. DeepSeek-V4 moves it by combining compression, sparsity, and hybrid layer design in one trained model, and by proving the combination survives at trillion-parameter scale with real benchmark results. A million-token context at a tenth of the cache is a genuine step, even if the underlying ideas are each borrowed.

The second is the cost of long-context serving. Storing compressed KV caches on disk and reusing shared prefixes turns long context from a per-request recomputation into something closer to a cached asset. That shifts the economics of a chat product.

The third is the open-versus-closed gap. On Codeforces the paper claims an open model matching a closed frontier model for the first time, and on formal mathematics it reaches a perfect score on Putnam 2025 under a heavy-compute hybrid regime. Those are narrow claims, but they are the kind of narrow claim that used to be impossible.

The fourth is the problem of combining many specialist models without losing their skills. Full-vocabulary on-policy distillation from more than ten teachers, made affordable by caching teacher hidden states and reconstructing logits on the fly, is a practical answer to a question that has mostly been answered with weight averaging or unstable mixed RL.

The fifth, and maybe the most underrated, is deterministic and batch-invariant training at scale. If a token's output does not depend on its batch position, and a rerun gives identical bits, then bugs become reproducible and training and inference stop diverging. That is a quiet contribution that makes everything else easier to trust.

## A Short Critical Read

It is worth keeping three things in mind while reading the numbers. First, many of the strongest results are on internal benchmarks built by the same team, such as the R&D coding set, the white-collar tasks, the Chinese writing comparisons, and the Codeforces harness. These are legitimate but not independently reproducible. Second, some competitor entries are blank because APIs were busy or failed, which weakens head-to-head claims on those rows. Third, the efficiency claims are estimates of equivalent FP8 FLOPs, and the FP4 advantage is explicitly described as theoretical until future hardware supports it.

None of that undermines the core result. The KV cache reduction is a structural consequence of the architecture, not a measurement artifact. The 10 percent cache figure at a million tokens follows from compressing by 4 with sparsity and by 128 with dense attention, plus FP8 storage. That part is solid.

## The Mental Model to Keep

If you remember one picture, remember this. A token at position one million does not read one million other tokens. It reads a small window of recent tokens directly, a few hundred chosen compressed blocks from a lightly compressed branch, and a few thousand heavily compressed blocks from a dense branch. Everything else is summarized or skipped. The model's job is to make sure the summarization and the choosing are good enough that nothing important is lost.

That is the whole paper in one sentence, and every equation, kernel, and cache layout in it exists to make that sentence true at a price people can pay.
