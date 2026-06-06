---
title: "Recursive Language Models"
pubDate: 2026-06-06
---

- The paper, called Recursive Language Models, is about a way to make existing language models handle prompts that are far longer than their normal context windows, without needing to redesign the model architecture itself.

- The main problem the paper addresses is that even strong modern language models become less reliable as the prompt gets longer, because they may technically fit many tokens but still fail to use all of that information correctly.

- The authors call this failure mode context rot, which means the model’s answer quality gets worse when important information is spread across a long input.

- The paper argues that long-context ability is not only about the number of tokens a model can accept, because a simple search task over a million tokens can be easier than a shorter task that requires combining information from every part of the prompt.

- The key idea is a Recursive Language Model, or RLM, which is not a new model but an inference-time method that changes how an existing model works while answering a question.

- Instead of forcing the whole long prompt into the model’s context window, an RLM stores the prompt in an external environment, such as a Python REPL, where the prompt exists as a string variable that the model can inspect with code.

- A Python REPL is useful in this setup because the model can run commands to search, slice, split, count, filter, and transform the prompt, instead of needing to read the entire prompt directly as natural-language context.

- From the outside, an RLM still looks like a normal language model because it receives a string prompt and returns a string answer, but inside it uses an interactive environment to manage the prompt more like data.

- The recursive part comes from the model being able to create smaller subtasks and call language models on those smaller pieces, then combine the sub-results into a final answer.

- In simple terms, an RLM behaves like a researcher working with a huge document collection, because it does not memorize everything at once but searches the files, opens relevant parts, asks helpers to analyze sections, and then combines the findings.

- The paper compares RLMs to out-of-core algorithms in computer science, where a system with limited fast memory can still process a huge dataset by carefully deciding which parts to load and inspect.

- The analogy is that the language model’s context window is limited fast memory, while the long prompt is a large external dataset that should be accessed intelligently instead of loaded all at once.

- The authors compare RLMs against direct model calls, summary agents, CodeAct agents with BM25 retrieval, and an RLM ablation that has the REPL but does not allow recursive sub-language-model calls.

- The summary-agent baseline repeatedly compresses earlier context into summaries, which can be useful but can also lose details that later turn out to matter.

- The CodeAct with BM25 baseline lets a model use code and keyword retrieval, but unlike an RLM it does not place the whole prompt into the external programming environment as a manipulable variable.

- The no-sub-call RLM ablation is important because it tests whether the gain comes from simply storing and inspecting the long prompt externally, or whether the recursive language-model calls are also necessary.

- The paper tests RLMs on tasks with different kinds of long-context difficulty, including single needle-in-a-haystack search, multi-document question answering, semantic aggregation over many entries, pairwise aggregation over many entries, and code-repository question answering.

- The single needle-in-a-haystack task is relatively simple in terms of information complexity because the answer depends on finding one small hidden fact, even if the surrounding prompt is extremely long.

- BrowseComp-Plus is harder because the answer requires connecting evidence across multiple documents, so the model must retrieve and combine several facts rather than find only one.

- OOLONG is harder in a different way because the answer depends on examining and transforming nearly all entries in the input, which makes the required work grow roughly linearly with the input size.

- OOLONG-Pairs is even harder because the answer depends on relationships between pairs of entries, which makes the required work grow roughly quadratically and causes direct models to fail badly.

- LongBench-v2 CodeQA tests whether the system can answer multiple-choice questions about large code repositories, where the relevant evidence may be buried inside many files.

- The experiments use GPT-5 as a frontier closed model and Qwen3-Coder-480B-A35B as a frontier open model, with GPT-5-mini used for recursive sub-calls in the GPT-5 RLM setup to reduce cost.

- The paper reports that RLMs can handle inputs in the 10-million-token range, which is far beyond what direct model calls can normally fit in context.

- The main result is that RLMs often outperform direct model calls and common long-context scaffolds, especially when the input is very long or the answer requires dense reasoning over many pieces of the prompt.

- On BrowseComp-Plus, direct GPT-5 cannot handle the tested input because it exceeds the context limit, while GPT-5 RLM scores 91.33 compared with 70.47 for the summary agent and 51.00 for CodeAct with BM25.

- On OOLONG, GPT-5 RLM scores 56.50 compared with 44.00 for direct GPT-5, showing that the RLM helps even when the task is not merely about exceeding the raw context window.

- On OOLONG-Pairs, direct GPT-5 scores almost zero while GPT-5 RLM scores 58.00, which strongly suggests that recursive decomposition is useful for information-dense tasks requiring many comparisons.

- Qwen3-Coder also benefits from the RLM setup, with a large jump on OOLONG-Pairs from 0.06 for the base model to 23.11 for the RLM, although GPT-5 RLM performs better overall on that task.

- The no-sub-call RLM sometimes performs surprisingly well, which means that merely moving the prompt into an external REPL and giving the model code access is already a powerful way to extend effective context.

- Recursive sub-calls matter most on tasks where code alone is not enough, because the system needs semantic judgments over many chunks and then needs to aggregate those judgments.

- The paper finds that base language models degrade faster as both input length and task complexity increase, while RLMs also degrade but much more slowly.

- A key lesson is that effective context length is task-dependent, meaning a model’s usable context depends on what kind of reasoning the task requires rather than only on the number of tokens.

- RLMs are not always better for small or simple prompts, because their extra steps of planning, code execution, context inspection, and sub-calling can add overhead that is unnecessary when a direct model call would work well.

- The cost of RLMs is often comparable to a direct model call and can be cheaper than summarization methods that ingest the whole context, because the RLM can selectively inspect only parts of the prompt.

- The cost of RLMs can also have high variance, because some tasks lead to short efficient trajectories while others cause the model to make many code steps, repeated checks, or excessive recursive sub-calls.

- A trajectory is the full sequence of the RLM’s actions while answering, including code it runs, snippets it inspects, sub-model calls it makes, observations it receives, and final decisions it forms.

- The authors observe common RLM behavior patterns such as searching with regular expressions, probing a few snippets before deciding what to inspect next, chunking the prompt into smaller pieces, asking sub-models to analyze chunks, verifying answers, and storing partial outputs in variables.

- The ability to store partial outputs in REPL variables means RLMs can also help with long-output tasks, because the system can build a final answer piece by piece instead of depending on one model call to produce everything at once.

- The paper shows that different base models behave differently inside the RLM framework, because GPT-5 tends to use fewer and more selective sub-calls while Qwen3-Coder sometimes makes very many sub-calls unless prompted not to.

- This model-dependent behavior suggests that prompt design and training matter, because current models are not always efficient at deciding when to search, when to chunk, when to call a sub-model, and when to stop.

- The paper’s related work discussion positions RLMs as a system-level approach to long context, different from approaches that directly modify model architecture and different from lossy context-management methods that summarize or discard information.

- The main advantage over summarization is that RLMs do not have to permanently forget details, because the original prompt remains available in the external environment and can be revisited when needed.

- The main advantage over fixed retrieval workflows is that the model itself can decide how to search, filter, decompose, and verify the information instead of relying only on a predetermined retrieval pattern.

- The paper’s limitations include the fact that the main implementation uses a Python REPL, uses mostly sequential blocking calls, explores only shallow recursion, and may need sandboxing before being used safely in real applications.

- The authors suggest that asynchronous sub-calls could make RLMs faster, deeper recursion could make them more powerful, and explicit training could make models much better at using the RLM environment efficiently.

- The abstract also reports a small-scale post-training result called RLM-Qwen3-8B, which improves over the underlying Qwen3-8B model by 28.3 percent on average and approaches vanilla GPT-5 quality on three long-context tasks.

- The biggest practical risks are latency, unpredictable cost spikes, unsafe code execution, and inefficient model behavior during long trajectories.

- The biggest research opportunity is training models specifically to operate as RLMs, so they can learn better habits for external memory use, decomposition, verification, and stopping.

- The simplest takeaway is that RLMs move the long prompt out of the model’s limited context window and into a tool environment, where the model can inspect only the parts it needs and recursively ask helper models to reason over smaller pieces.

- The broader takeaway is that future long-context systems may scale not just by increasing context windows, but by teaching models to actively manage external information the way good software systems manage data that is too large to fit in memory.
