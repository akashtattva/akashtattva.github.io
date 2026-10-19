---
title: 'vLLM Paper Notes'
pubDate: 2026-10-13
description: 'Simple notes on vLLM and PagedAttention for efficient LLM serving with paged KV cache memory management and sharing.'
---

# Notes On The vLLM PagedAttention Paper

The paper is about making it cheaper and faster to serve models to many users at the same time. A large model is a huge program that writes text one word piece at a time. When many people ask it questions at once, the computer that runs the model has to do a lot of work and keep a lot of memory for each question. The authors noticed that the memory for remembering past words was being wasted in a big way, so only a small number of questions could be handled together. They invented a smarter way to store that memory by borrowing an old idea from computer operating systems called paging and virtual memory. On top of that idea they built a full serving system called vLLM. The result is that the same graphics card can handle two to four times more work with the same waiting time, without changing what the model writes. The improvement gets even bigger when the texts are long and when the system has to produce several possible answers for one question.

![Figure 1: Memory layout and throughput vs batch size](/assets/img/vllm_fig1_memory_throughput.webp)

*Figure 1 shows a 13B model using about 65 percent for weights and over 30 percent for KV cache on a 40GB A100, and how vLLM smooths the steep memory growth of older systems so batch size and throughput keep climbing.*

## The Problem vLLM Set Out To Solve

### Why Serving These Models Is So Expensive
Training a model happens once, but serving it means answering millions of questions every day on expensive graphics cards. Each answer costs much more than a normal web search, roughly ten times more by some estimates. Companies that offer chatbots and coding assistants therefore care a lot about throughput, which means how many word pieces the system can produce per second, and about cost per question. If you can pack more questions together on one card, the cost of moving the huge model weights around gets shared, and the card stays busy. So the whole paper is motivated by getting higher throughput without making users wait longer.

### How A Transformer Writes Text One Piece At A Time
The model works by guessing the next word piece from all the previous ones. It breaks language into small pieces called tokens, which can be words or parts of words. It first reads the user prompt, then it writes one new token, then it looks at the prompt plus what it just wrote and writes the next token, and it keeps going until it writes a special stop token or reaches a length limit. Inside, the most important part is self attention, where each position creates three vectors called query and key and value. The query of the current position is compared with the keys of all earlier positions to decide how much attention to pay to each earlier value, and the weighted mix becomes the output for that position. All other parts like embedding and feed forward layers work on each position separately, so attention is the only part that needs to look across the whole history.

### The Two Phases Of Work For Every Request
Every request has a prompt phase and a generation phase. In the prompt phase, the whole user input is already known, so the card can do a lot of math in parallel with big matrix multiplications, which graphics cards are very good at. It also creates the key and value vectors for all prompt tokens at once. In the generation phase, the model only gets one new token at a time, because it needs the previous result to know what to do next. This phase uses smaller math operations that cannot be parallelized across time, so the card is mostly waiting on memory and stays underused. This phase takes most of the time for a single question. Batching many questions together helps because the same model weights are reused for many questions at once.

### Why Batching Is Hard In Practice
Naive batching would wait until many questions arrive and then run them together, but questions arrive at different times, so early questions would wait too long or late questions would be delayed. Questions also have very different lengths, so padding them all to the same length would waste math and memory. Newer ideas like cellular batching and iteration level scheduling fix this by working at the level of one generation step rather than a whole request. After each step, finished questions leave the batch and new questions join, so a new question only waits for one step. Special kernels also remove the need for padding. This already helps a lot, but the paper shows that memory still limits how many questions can be together.

### What The KV Cache Is And Why It Grows So Fast
To avoid recomputing everything from scratch at each step, the system saves the key and value vectors of all past tokens. This saved memory is called the KV cache. It grows by one token at each step and shrinks when the request finishes and its memory is freed. Its size depends on all previous tokens, so the same word in a different position has a different KV cache. An example in the paper makes this concrete. For a thirteen billion parameter version of a model called OPT, one token needs about eight hundred kilobytes, because you need two vectors for key and value times a hidden size of about five thousand times forty layers times two bytes for half precision numbers. If the model allows up to two thousand and forty eight tokens, one request can need up to about one point six gigabytes just for this cache. A typical card has only tens of gigabytes, so even if all free memory went to this cache, only a few tens of requests would fit. Newer cards get much faster at math but do not grow memory as fast, so memory becomes more and more the bottleneck.

### The Three Kinds Of Waste In Older Systems
Older systems store the KV cache of each request in one long continuous chunk of memory, because most deep learning tools expect tensors to be continuous. Since they do not know how long the answer will be, they reserve space for the maximum possible length up front, for example two thousand and forty eight tokens. The paper explains three wastes with a picture of two requests. One request allows a very long maximum and another allows a shorter maximum. First there is reserved space for future tokens that sits empty most of the time and blocks other requests even though it will be used later. Second there is internal fragmentation, which is empty space inside the reservation that is never used because the real answer turns out much shorter than the maximum. Third there is external fragmentation, which comes from the memory allocator trying to fit chunks of different sizes together and leaving awkward gaps that cannot be used. Measurements show that only about twenty to thirty eight percent of that memory actually holds real token data, while the rest is wasted. Another picture breaks this into token states versus reservation versus internal and external waste for different versions of an older system called Orca and shows vLLM reaching over ninety six percent useful use.

![Figure 2: Fraction of useful KV memory in older systems vs vLLM](/assets/img/vllm_fig2_memory_waste.webp)

*Figure 2 shows only about 20 to 38 percent of KV memory holds real token states in Orca Max, Pow2 and Oracle, while vLLM reaches about 96 percent useful use by removing reservation and fragmentation waste.*

![Figure 3: Reserved and fragmented slots in contiguous allocation](/assets/img/vllm_fig3_kv_waste_types.webp)

*Figure 3 shows two requests with preallocated max lengths, where reserved future slots block others, unused tail slots become internal fragmentation, and different sized chunks leave external gaps that can never be used.*

### The Extra Problem Of Sharing Memory Between Answers
Many real uses need more than one answer from one prompt. A coding assistant may show several completions for the same code. A translation system may use beam search to keep several best guesses. A chat product may reuse a long system instruction plus examples across many users. In all these cases, the beginning part of the text is identical, so its KV cache could be shared instead of copied. Older systems cannot share because each sequence lives in its own separate continuous chunk. For parallel sampling the shared prompt part was about twelve percent of memory in one experiment, and for beam search the shareable part can be up to about fifty five percent. The sharing pattern also changes over time as some guesses get dropped and new ones branch off, so the system needs a flexible way to share and unshare quickly.

## The Paging Idea Behind PagedAttention

### The Core Idea Borrowed From Operating Systems
Operating systems faced a similar problem long ago when many programs needed memory of unknown size. Their answer was virtual memory with paging. They split memory into small fixed size pages. Each program sees a simple continuous logical address space, but the operating system maps those logical pages to scattered physical pages behind the scenes. It only gives out physical pages when actually needed, all pages have the same size so there are no awkward gaps, and different programs can point to the same physical page when they share something like a common library, with copy on write to handle the moment when one program wants to change its private copy. PagedAttention copies this idea. It splits the KV cache of each sequence into fixed size blocks, each holding the keys and values for a fixed number of tokens, for example sixteen tokens. Logical blocks look continuous to the model, but they can live anywhere in the real card memory. You can think of blocks as pages and tokens as bytes and requests as processes.

### The Manager That Maps Logical Blocks To Physical Blocks
The vLLM system has a central scheduler that decides which sequences run next and a KV cache manager that owns the mapping. There is a block engine on the graphics workers that cuts a big continuous chunk of card memory into physical blocks, and a similar allocator for central processing unit memory used for swapping. For each sequence there is a block table that says which logical block maps to which physical block and how many positions in the last block are already filled. When a new token arrives and the last block still has room, the system just writes there and updates the count. When the last block becomes full, it grabs one fresh physical block only at that moment and records the new mapping. Because growth happens on demand and every block has the same size, the waste for a request is at most one partly filled block, instead of up to thousands of empty reserved slots. When a request finishes, all its physical blocks are freed for others.

![Figure 4: vLLM system overview with scheduler and workers](/assets/img/vllm_fig4_system_overview.webp)

*Figure 4 shows the central scheduler and KV Cache Manager with block tables and CPU and GPU allocators coordinating distributed workers that each hold a model shard and a cache engine.*

### How The Math Still Works When Memory Is Scattered
Normal attention multiplies the query of the new token with all past keys and then mixes the values. PagedAttention does the same math but block by block. It looks up where each logical block actually lives, fetches that physical block, multiplies the query with the keys inside just that block to get partial scores, and later mixes the values from each block to get the final output. A picture in the paper shows the words Four score and seven in one block and years ago our fathers in another block and brought forth in a third block, all scattered, while the query for the word forth is compared with each block separately. The kernel is written to do this efficiently on the card by giving different parallel workers different blocks and by handling sequences of different lengths in the same batch.

![Figure 5: PagedAttention over non-contiguous blocks](/assets/img/vllm_fig5_paged_attention.webp)

*Figure 5 shows the query for forth attending to keys and values scattered across three physical blocks, fetching each block separately and combining partial scores into the final output.*

### A Step By Step Walkthrough For One Sequence
The paper walks through a prompt with seven tokens. At the start, the system reserves only two logical blocks, enough for the prompt plus the first output token, and maps them to two scattered physical blocks, say number seven and number one. In the prompt step it uses normal attention to build the KV cache for the prompt and the first output, storing the first four tokens in the first logical block and the next three tokens in the second logical block, leaving one empty slot in that second block for the future. In the next generation step it uses PagedAttention on those two physical blocks to make the next token, and since there is still room, it writes the new KV data into the same last block and updates the fill count. In the following step the last block is full, so it allocates a brand new physical block, say number three, and records that the third logical block now points there. Globally, at each iteration the scheduler first picks which sequences to run and reserves physical blocks for any new logical blocks they will need, then it packs all their current input tokens together and runs the model once.

![Figure 6: Block table translation for one sequence](/assets/img/vllm_fig6_block_table.webp)

*Figure 6 shows a seven token prompt mapped to physical blocks 7 and 1, filling logical blocks on demand and allocating physical block 3 only when the last block fills, with the table tracking locations and fill counts.*

### How Many Requests Share One Card At Once
Another picture shows two different requests living side by side. One has a prompt about years ago our fathers and the other has a prompt about best of times. Their logical blocks point to completely different physical blocks inside one shared pool, and neighboring logical blocks do not need to be neighbors in real memory. The system joins the prompt tokens of new requests and the latest single tokens of ongoing requests into one batch input, runs the model, reads old KV data through the block tables, and writes new KV data into the assigned physical blocks. Keeping several tokens in one block, when block size is larger than one, lets the kernel do more parallel work and reduces delay, but it also increases the leftover empty space in the last block, so block size is a tradeoff studied later.

![Figure 7: Two requests sharing one physical pool](/assets/img/vllm_fig7_two_requests.webp)

*Figure 7 shows two sequences whose neighboring logical blocks point to scattered physical blocks in one shared pool, so memory freed by a finished request immediately fits other requests.*

## How Sharing Powers Different Decoding Styles

### Parallel Sampling With Reference Counts And Copy On Write
When one prompt needs several independent completions, the prompt part can be shared. The paper shows an example with two samples sharing the same prompt about Four score and seven years ago our fathers. Both sequences map their first two logical blocks to the same two physical blocks, and each physical block gets a reference count of two meaning two users. The last block is special because the two samples will soon diverge. When the first sample wants to write into a shared block whose count is greater than one, the system allocates a fresh physical block, copies the old contents there, lowers the old count to one, and lets the first sample write privately. The second sample can then write directly into the original block because its count is now one. In short, most of the prompt memory is stored once, and only the diverging tail triggers a single block copy. This saves a lot when prompts are long.

![Figure 8: Parallel sampling with copy on write](/assets/img/vllm_fig8_parallel_sampling.webp)

*Figure 8 shows two samples sharing prompt blocks with reference count 2, then copying one block on write when the first sample diverges and letting the second write in place, so the prompt is stored once.*

### Beam Search As A Changing Tree Of Shared Blocks
Beam search keeps a fixed number of best guesses called the beam width, for example four. At each step it expands every guess with many possible next tokens, scores them with the model, and keeps only the top few. Unlike parallel sampling, sharing here goes beyond the initial prompt and changes over time, like processes forking in an operating system. The paper shows four candidates sharing the first block for the prompt, then three of them sharing the next few blocks while one branches off earlier, and after the next selection step two old candidates disappear so their blocks are freed and new physical blocks are allocated for the new branches. Older systems would have to copy large amounts of KV data to move a surviving branch onto a new continuous chunk. With block sharing, most blocks stay where they are and only the block being newly written needs a copy on write, often just one block. Measurements show memory savings around thirty seven to fifty five percent on one dataset and even higher on longer texts, which directly turns into higher throughput.

![Figure 9: Beam search block sharing over time](/assets/img/vllm_fig9_beam_search.webp)

*Figure 9 shows four beam candidates sharing early blocks, freeing blocks of dropped candidates and allocating new blocks 9 to 12 for survivors, with only the newly written block needing a copy.*

### Shared Prefixes Across Different Users
Many products prepend the same long instruction and examples to every user question, for example a translation task that always starts with translate English to French plus sample pairs like sea otter and peppermint. The provider can precompute the KV cache for that common prefix once and keep it in reserved physical blocks, like a shared library. A new user prompt that starts with the same prefix simply maps its first logical blocks to those cached physical blocks, with the last shared block marked for copy on write so the user private tail does not corrupt the shared copy. The prompt phase then only needs to process the new user specific tail. The paper shows throughput gains of about one point six seven times with a short shared prefix of about eighty tokens and about three point five eight times with a longer shared prefix of about three hundred forty one tokens.

![Figure 10: Shared prefix example for translation](/assets/img/vllm_fig10_shared_prefix.webp)

*Figure 10 shows a translation system prompt with instructions and examples shared across users, where only the task input like cheese versus I love you and the task output differ.*

### Mixing Different Decoding Styles In One Batch
Because all the complexity of sharing is hidden behind the logical to physical mapping, the model execution itself only sees a list of physical block numbers per sequence. It does not need to know whether a sequence is doing simple sampling or beam search or prefix sharing. That means the scheduler can pack requests with different needs into the same batch, which older systems could not do efficiently. This widens the batching opportunity and lifts overall throughput. The implementation supports this with three simple operations called fork to create a new sequence from an existing one and append to add a new token and free to delete a finished sequence. Parallel sampling forks several children from one prompt, beam search repeatedly forks and frees as candidates come and go, and prefix sharing forks from a cached prefix.

## The Runtime Around The Cache Manager

### Scheduling Fairly And Handling Out Of Memory
The scheduler uses first come first serve to be fair and avoid starving anyone. When the card runs out of free physical blocks because outputs keep growing unpredictably, the system must preempt some sequences. It preempts the newest arrivals first so the earliest requests finish, and it treats all sequences from one request as a group that gets preempted and rescheduled together, because they may share blocks. For a whole group it either evicts all blocks or none, which the paper calls all or nothing. To bring an evicted sequence back later there are two options. Swapping copies its blocks to central processing unit memory and later copies them back, with the needed swap space bounded by the card memory size. Recomputation simply discards the blocks and rebuilds them later by feeding the prompt plus the tokens generated so far through the prompt phase in one fast parallel pass. Swapping is hurt by many tiny transfers when blocks are small, because the link between central and graphics memory cannot reach full speed. Recomputation cost does not depend on block size. In tests, recomputation wins for small blocks, swapping wins for large blocks, and both are similar for medium blocks from sixteen to sixty four, with recomputation never much worse. The system blocks new admissions while preempted sequences wait, then frees memory as old requests complete and resumes the preempted ones.

### Running Huge Models Across Many Cards
Models larger than one card must be split across several cards. vLLM supports a popular style called Megatron style tensor parallelism, where linear layers are split and every card runs the same program on different slices of data and they exchange partial results with a fast collective operation. Attention is split by attention heads, so each worker handles a subset of heads. Even with splitting, every shard still needs the keys and values for the same token positions, so there is one central KV cache manager in the scheduler that everyone shares. At each step the scheduler broadcasts the input token numbers plus the block tables, the workers run the model and read their slice of the KV cache according to those tables, they synchronize intermediate results without extra help from the scheduler, and finally they send the sampled tokens back. Workers therefore never need to coordinate about memory themselves.

### How It Is Built And The Special Kernels
The full system has a web frontend that mimics a common completion interface and lets users set sampling options like maximum length and beam width, plus a graphics engine written in several thousand lines of Python for control and a couple thousand lines of low level code for speed. Three kernel tricks matter. First, splitting and reshaping the new keys and values and writing them to the right block positions is fused into one kernel to avoid many small launches. Second, reading blocks through the table and doing attention is fused into an adapted attention kernel that gives one parallel group to each block for efficient memory access and supports variable lengths in one batch. Third, copy on write copies that touch scattered blocks are batched into one kernel instead of many tiny copies. Together these keep the overhead of indirection low.

## What The Evaluation Showed

### How It Was Tested And What The Numbers Show
Tests use three sizes of a model family called OPT with thirteen and sixty six and one hundred seventy five billion parameters, plus a thirteen billion version of LLaMA for translation, running on one or four or eight large A100 cards with forty or eighty gigabytes each. The memory left for KV cache after weights ranges from about twelve to over two hundred gigabytes, allowing from about ten thousand to sixty thousand block slots. Workloads are built from two real text collections. One called ShareGPT has long chat prompts and long answers with high variation, about eight times longer inputs and almost six times longer outputs on average. The other called Alpaca has short instructions and short answers. Arrival times follow a random Poisson process at different rates. Baselines are a latency optimized engine called FasterTransformer with a simple batch scheduler, and a reimplementation of a throughput optimized system called Orca in three variants that differ in how much output space they reserve. Max always reserves the full maximum length, Pow2 rounds up to a power of two with at most double waste, and Oracle unrealistically knows the true output length in advance and is impossible in practice. The main metric is normalized latency, which is each request end to end waiting time divided by its output length, plotted against request rate. Good systems keep this low even as the arrival rate climbs, until the rate passes capacity and the queue explodes.

![Table 1: Model sizes and server configurations](/assets/img/vllm_table1_model_configs.webp)

*Table 1 shows the 13B, 66B and 175B OPT setups on 1, 4 and 8 A100s, with parameter sizes, memory left for KV cache, and max KV slots from about 9K to 60K.*

![Figure 11: Input and output length distributions](/assets/img/vllm_fig11_length_distributions.webp)

*Figure 11 shows ShareGPT with long varied prompts averaging about 161 input and 338 output tokens versus Alpaca with short prompts averaging about 19 input and 58 output tokens.*

### Main Results For Simple Sampling And Chat
For simple single answer sampling on the long ShareGPT data, vLLM sustains about one point seven to two point seven times higher arrival rate than the impossible Oracle and about two point seven to eight times higher than Max at the same latency, and up to twenty two times higher than FasterTransformer, because that older engine lacks fine grained scheduling and wastes memory like Max. A snapshot shows vLLM processing more than twice as many requests at the same moment as Oracle and more than four times as many as Max. On the short Alpaca data the trend is similar, except for the largest model with plenty of memory and very short texts, where the workload becomes limited by math rather than memory and the advantage shrinks, as expected. For chatbot style use where history is cut to about one thousand tokens of context, vLLM sustains about two times higher rate, because the older allocator reserves a full thousand slots for outputs while vLLM only uses what it needs. Translation with shared prefixes and parallel sampling with several outputs and beam search with wider beams all show growing wins, going from about one point three times in simple sampling to about two point three times with beam width six on the same model and dataset, because more sharing means more savings.

![Figure 12: Single sequence generation throughput](/assets/img/vllm_fig12_single_sequence_results.webp)

*Figure 12 shows normalized latency versus request rate for three OPT sizes on ShareGPT and Alpaca, where vLLM sustains about 1.7 to 2.7 times the rate of Oracle and up to 22 times FasterTransformer at the same latency.*

![Figure 13: Average batched requests](/assets/img/vllm_fig13_batched_requests.webp)

*Figure 13 shows vLLM processing about 2.2 times more concurrent requests than Oracle and 4.3 times more than Max on ShareGPT, and similarly more on Alpaca, which directly lifts throughput.*

![Figure 14: Parallel sampling and beam search throughput](/assets/img/vllm_fig14_parallel_beam_results.webp)

*Figure 14 shows gains growing with parallel size and beam width on Alpaca, from about 1.3 times in simple sampling to about 2.3 times at beam width 6 over Oracle, because more sharing means more win.*

![Figure 15: Memory saved by block sharing](/assets/img/vllm_fig15_memory_saving.webp)

*Figure 15 shows about 6 to 10 percent memory saved in parallel sampling and about 38 to 55 percent in beam search on Alpaca, with even higher savings on longer ShareGPT texts.*

![Figure 16: Translation with shared prefix](/assets/img/vllm_fig16_translation_prefix.webp)

*Figure 16 shows about 1.67 times higher throughput with a short 80 token shared prefix and about 3.58 times with a longer 341 token prefix over Oracle, because the prefix KV is computed once and reused.*

![Figure 17: Chatbot workload](/assets/img/vllm_fig17_chatbot.webp)

*Figure 17 shows chatbot serving with about 1024 token history where vLLM sustains about 2 times higher request rate than Orca variants, which must reserve a full thousand slots for outputs.*

### Ablation Details On Block Size Kernels And Recovery
A dedicated kernel test shows PagedAttention adds about twenty to twenty six percent extra time to the attention kernel alone compared with a highly tuned baseline, because of table lookups and extra branches, but attention is only one part of the model, so end to end performance still wins by a large margin. Block size matters in both directions. Tiny blocks use the card parallelism poorly and cause many tiny transfers for swapping. Huge blocks waste more space in the last partly filled block and reduce sharing chances, which hurts short texts badly when the block is larger than the whole sequence. Tests across sizes find sixteen to one hundred twenty eight works best for long texts, while sixteen to thirty two works best for short texts, so sixteen is chosen as the default that balances speed and waste. Recovery tests show swapping needs tens to over a hundred milliseconds depending on block size, while recomputation stays steady and never much slower, and end to end both are close for medium blocks.

![Figure 18: Attention kernel and block size ablations](/assets/img/vllm_fig18_ablation_kernels.webp)

*Figure 18 shows PagedAttention adding about 20 to 26 percent to attention kernel time yet winning end to end, with block size 16 balancing parallelism and fragmentation for both long and short traces.*

![Figure 19: Swapping vs recomputation for preempted sequences](/assets/img/vllm_fig19_swap_recompute.webp)

*Figure 19 shows recomputation winning for small blocks, swapping winning for large blocks, and both similar for medium blocks 16 to 64, with recomputation never much worse and avoiding tiny PCIe transfers.*

## What The Paper Leaves Behind

### What Was The Research Trying To Make Possible
The research was trying to make high throughput low cost serving of large language models practical on limited graphics memory. The team wanted a system where many requests with unknown and varied lengths could be packed together safely, where memory waste from over reservation and awkward gaps would nearly disappear, where common prompt parts could be stored once and shared within and across requests, and where huge models split across many cards could still share one simple memory view. In other words, they wanted the serving layer to stop being the bottleneck so that powerful models could be offered as affordable hosted services like coding helpers and chatbots and translation tools.

### What Becomes Obvious After Reading It That Was Not Obvious Before
After reading it, it becomes obvious that the KV cache, not the model weights or the math, is the true limiter for how many users one card can serve, and that the way you manage that cache matters more than raw kernel speed. It also becomes obvious that attention does not need continuous memory at all if you rewrite it to chase block pointers, which then unlocks operating system tricks that seemed unrelated to deep learning. Another non obvious point is that fancy decoding methods are really just different patterns of forking and sharing and freeing blocks, so one mapping layer can support them all and even mix them in one batch. Finally, it becomes obvious that knowing the true output length in advance would still not fix older designs, because reservation and lack of sharing would still waste a lot, while on demand paging plus copy on write fixes both at once.

### What Long Running Problem Did This Paper Move Even Slightly
The paper moves the long running problem of dynamic memory management for unpredictable workloads on accelerators. For years, deep learning frameworks assumed tensors live in continuous memory allocated up front, which works for training with fixed shapes but fails for autoregressive serving where lifetimes and lengths are unknown and highly variable. By showing that virtual memory and paging and copy on write and swapping and all or nothing eviction can be adapted with small overhead and large throughput gains, and that the same manager works across distributed workers, the paper gives a concrete pattern for other memory bound generative workloads. It also narrows the gap between compute growth and memory capacity growth by using memory far more efficiently, which matters as cards get faster without getting proportionally larger, and it turns memory sharing from a special case hack into a general primitive for future decoding algorithms.
