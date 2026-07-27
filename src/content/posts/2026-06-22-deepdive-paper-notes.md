---
title: "DeepDive Paper Notes"
pubDate: 2026-06-22
---

## What Problem Does DeepDive Solve

Large language models like GPT-4 or DeepSeek are very good at answering questions from what they already know. But when you ask them something that requires searching the internet, reading multiple pages, and piecing together scattered clues, they struggle. This is especially true for open-source models which are freely available. Proprietary models like OpenAI's DeepResearch can do this fairly well, but open-source models lag far behind. The paper identifies two main reasons for this gap. First, there is not enough training data that contains truly hard-to-find questions. Most existing datasets have simple questions where you can find the answer by just searching for a clear entity name. Second, there is no good way to train models to reason and search over many steps in a loop. The paper introduces DeepDive, a system that solves both problems.

## How DeepDive Creates Hard Training Questions Automatically

The authors use something called knowledge graphs to generate training questions. A knowledge graph is essentially a giant structured map of facts. For example, it might store that a person was born in a certain year, that they founded a company, and that the company is headquartered in a certain city. These facts are stored as connections between entities. DeepDive takes random walks through this graph, meaning it starts at one entity and follows connections for several steps to create a path. If you walk five or more steps, you get a chain of facts that can form the backbone of a complex question.

But a simple chain of facts would be too easy. The model could just search for the named entities and find the answer directly. To make the question truly hard, DeepDive blurs the information. It takes specific facts and makes them vague. Instead of saying a company was founded in 1948, it says the company was founded in the late 1940s. Instead of naming a person directly, it describes them by attributes like someone born in the mid-1980s. This forces the model to search, find candidates, verify them against the clues, and narrow down to the correct answer. The process is called obfuscation and it is done automatically by another language model.

To ensure the questions are genuinely difficult, DeepDive runs each question through a powerful frontier model like GPT-4o with search capabilities. If the model can answer the question in any of four attempts, the question is discarded. Only questions that stump the model all four times are kept. This filter guarantees the dataset contains only challenging tasks.

## How Multi-Turn Reinforcement Learning Works

Once the hard questions are ready, DeepDive trains the model using a technique called multi-turn reinforcement learning. In normal single-turn setups, the model gives one answer and gets feedback. In multi-turn settings, the model can reason, search the web, read results, reason again, search more, and so on until it decides it has enough information to answer. This cycle of reasoning and acting is called ReAct.

The training algorithm is called GRPO. For each question, the model generates several different search trajectories. Each trajectory is scored based on whether it arrived at the correct answer. The model learns to favor trajectories that lead to correct answers and avoid trajectories that lead to wrong ones. Over time, the model learns not just what to search for, but also how to search strategically across multiple steps.

## The Redundancy Penalty

One problem that emerged during training was that the model would sometimes repeat the same or very similar search queries over and over. This wastes time and does not surface new information. DeepDive introduces a redundancy penalty to fix this. It measures how similar all the search queries in a trajectory are using something called Jaccard similarity, which compares the overlap between sets of words. If all queries look very similar, the model gets a penalty subtracted from its reward. This encourages the model to explore diverse search angles, much like a good human researcher who tries different keywords and approaches.

## Training Setup and Results

DeepDive trains on two open-source models: a smaller 9-billion-parameter model and a larger 32-billion-parameter model. The training data consists of about 3,090 questions generated from two public knowledge graphs called KILT and AMiner. The training happens in two stages. First, supervised fine-tuning where the model learns from example trajectories created by a more capable model. Second, reinforcement learning where the model explores on its own and learns from its mistakes.

On the BrowseComp benchmark, which is widely considered the hardest web search test for AI, DeepDive-32B achieves 15.3% accuracy. This may sound low, but it is far ahead of other open-source models which typically score under 10%. It even beats some proprietary models. When the authors added more data from a semi-automated process involving human annotators, the score jumped to 22.2%.

## What Test-Time Scaling Means

DeepDive shows an interesting property called test-time scaling. If you give the model more tool calls during evaluation, its performance steadily improves. This means the model actually knows how to use extra search steps productively rather than wasting them. Further, if you run the model multiple times in parallel on the same question and pick the answer that required the fewest tool calls, you get much better results than picking the most common answer. The reasoning is that when the model is confident, it stops searching early. When it is uncertain, it keeps searching and often ends up with a worse answer.

## Generalization to Simpler Tasks

Even though DeepDive was trained on hard questions, it also performs well on simpler search benchmarks like HotpotQA, Frames, and WebWalker. It outperforms both GPT-4o and Claude on these easier tasks, suggesting that training on hard problems teaches general search skills that transfer to simpler settings.

## The Semi-Automated Data Pipeline

Beyond the fully automated knowledge graph approach, the authors experimented with a semi-automated method. Human annotators worked with an AI model to browse the web and construct extremely hard questions inspired by the structure of BrowseComp. This yielded about 3,000 additional high-quality questions. Using this data, DeepDive-32B reached 22.2% on BrowseComp, a 40% improvement over the 15.3% from knowledge graph data alone. This shows that combining automated and human-guided data creation is powerful.

## Limitations

The paper honestly acknowledges several limitations. The synthesized questions are still not as hard as the real BrowseComp questions. This gap in difficulty means DeepDive-32B still falls far short of the most advanced models like OpenAI's o3 with browsing, which scores around 51%. The model also shows an over-search phenomenon where it sometimes searches too much even when it already has the answer. Designing better reward mechanisms to know when to stop is an open problem for future work.

## Key Techniques Summary

Knowledge graph random walks create multi-hop reasoning chains. Attribute obfuscation turns clear facts into blurry clues that force real search. Difficulty filtering with GPT-4o ensures only truly hard questions survive. Multi-turn GRPO trains the model to reason and search over many steps. The Jaccard-based redundancy penalty prevents repetitive searching and encourages diverse exploration. Test-time scaling shows that tool calls and parallel sampling both improve results. The fewest-tool-calls voting strategy is a surprisingly effective way to select answers from multiple parallel runs.

## Chase Questions

## What was the research trying to make possible

The research was trying to make open-source language models capable of acting as deep search agents that can reason and browse the web over many steps to find answers to complex, hard-to-find questions. Currently, only proprietary models like OpenAI's DeepResearch can do this well. DeepDive aims to close that gap by showing that open-source models, when given the right training data and the right reinforcement learning approach, can also develop this ability. The ultimate goal is to democratize deep search capability so that anyone with access to open models can build agents that research like human experts.

## What assumption does it quietly depend on

DeepDive quietly depends on the assumption that knowledge graphs capture enough of the world's factual information to generate training questions that transfer to real web search scenarios. The questions are synthesized from structured graphs like KILT and AMiner, but real BrowseComp questions come from the open web and involve messy, unstructured, and sometimes conflicting information from across the internet. The paper assumes that the skills learned from searching for facts in a graph-like pattern will generalize to the chaotic nature of real web search. It also assumes that the difficulty filter using GPT-4o is a reliable proxy for true question difficulty, but GPT-4o's failure to answer a question does not necessarily mean the question is well-constructed or unambiguous.

## What becomes obvious after reading it that was not obvious before

It becomes obvious that the key bottleneck in building deep search agents is not the model architecture or the reinforcement learning algorithm itself, but the quality and structure of the training data. The paper shows that existing datasets like HotpotQA are too simple because the entities are clearly named and the reasoning steps are short. The real breakthrough is the automated data synthesis pipeline that uses knowledge graphs to create questions with blurry entities and long multi-hop paths. Without this hard data, even multi-turn RL does not help much. Another insight that becomes obvious is that a simple redundancy penalty based on Jaccard similarity is remarkably effective at improving search efficiency, suggesting that naive models naturally fall into repetitive search patterns and need explicit discouragement from doing so.

## Where does the idea break if you push it outside the paper

The idea breaks if you push it into domains where knowledge graphs do not exist or are incomplete. DeepDive relies heavily on having a structured knowledge graph to walk through and obfuscate. For highly specialized or emerging fields where no curated knowledge graph exists, the data synthesis pipeline cannot produce useful questions. It also breaks if the web itself changes. The training was done using specific search and content APIs. If the search engine behavior or the structure of web pages shifts significantly, the model's learned search strategies may become less effective. Another breaking point is scale of difficulty. The paper acknowledges that the synthesized questions are not as hard as real BrowseComp questions, so the model tops out at 15-22% on that benchmark while proprietary models reach 51%. The approach seems to hit a ceiling where the gap between synthetic data difficulty and real-world difficulty becomes hard to bridge with current methods.

## What long-running problem did this paper move even slightly

This paper moved the problem of training open-source deep search agents by demonstrating that automated data synthesis from knowledge graphs combined with multi-turn reinforcement learning can produce meaningful gains. Before this paper, open-source models scored under 10% on BrowseComp and there was no clear recipe for improvement. DeepDive showed a concrete, reproducible pipeline that lifted performance to 15.3%, and with additional semi-automated data to 22.2%. It also showed that test-time scaling works for open models in search tasks, which was previously mostly demonstrated for proprietary systems. The paper contributed the insight that a redundancy penalty is needed for multi-turn search training, which will likely become a standard component in future work. While the absolute numbers are still far behind the best proprietary models, the paper established a baseline methodology that the open-source community can build on, iterate on, and eventually close the gap.
