---
title: "Meta-Harness: Detailed Explanatory Notes"
pubDate: 2026-04-10
description: "Comprehensive notes on Meta-Harness: End-to-End Optimization of Model Harnesses - covering core concepts, architecture, experiments, and key takeaways"
author: "hp"
tags: ["llm", "optimization", "harness", "ai-engineering", "meta-learning"]
draft: false
---

# Meta-Harness: Detailed Explanatory Notes

## 📋 PAPER OVERVIEW

**Title:** Meta-Harness: End-to-End Optimization of Model Harnesses  
**Authors:** Stanford, MIT, KRAFTON researchers  
**Core Problem:** How to automatically optimize the *code surrounding an LLM* (not the model itself) to make it perform better

---

## 🎯 CORE CONCEPT: WHAT IS A "HARNESS"?

### The Key Insight
Think of an LLM like an engine in a car. The **harness** is everything else that makes the car work:
- **What information to give the model** (prompts, context, examples)
- **What to remember** from previous interactions (memory/state)
- **What to retrieve** from external sources (documents, databases, code)
- **How to structure the interaction** (single prompt vs. multi-step workflow)

### Why Harnesses Matter
- Changing the harness around a **fixed LLM** can create a **6× performance gap** on the same benchmark
- The harness often matters **as much as the model itself**
- Currently, harnesses are designed **manually** (humans writing code by trial and error)

### Real-World Example
Imagine building a customer service bot:
- **Bad harness:** Just give the model the user's question
- **Good harness:** Retrieve past similar tickets → show the model the question + relevant past solutions + company policies → have the model draft a response → verify it against policies → return answer

Both use the **same model**, but the harness makes the difference.

---

## 🔴 THE PROBLEM WITH CURRENT OPTIMIZATION METHODS

### Existing Approaches (TextGrad, OPRO, GEPA, etc.)
These methods try to optimize prompts/text by:
1. Generating a candidate
2. Getting a score (e.g., 75% accuracy)
3. Using that score to generate a better candidate

### The Critical Flaw: **Compressed Feedback**
Current methods throw away most of the useful information:

| Method | Feedback Type | Information Available |
|--------|---------------|----------------------|
| **Scores-only** | "Accuracy: 75%" | Just a number |
| **Summaries** | "Failed on edge cases" | 100-30,000 tokens |
| **Meta-Harness** | Full traces | Up to **10 MILLION tokens** |

### Why Compressed Feedback Fails for Harnesses
Harnesses are **executable programs** with:
- **State** (memory that persists across steps)
- **Control flow** (if/else, loops, function calls)
- **Causal chains** (early decisions affect outcomes many steps later)

**Example of the problem:**
```
Harness A: Retrieves documents → builds prompt → model answers → WRONG
```

With **scores-only feedback**, you only know "it got 0 points."  
With **full traces**, you can see:
- Which documents were retrieved (maybe irrelevant ones?)
- How the prompt was constructed (maybe confusing format?)
- Where the model went wrong (bad context? missing info?)

**Analogy:** 
- **Compressed feedback:** Telling a chef "your dish scored 5/10"
- **Full traces:** Showing them the recipe, ingredients, cooking temperatures, customer comments, and exactly where they deviated from best practices

---

## 🚀 META-HARNESS: THE SOLUTION

### High-Level Architecture

```
┌─────────────────────────────────────────────┐
│           META-HARNESS SYSTEM               │
│                                             │
│  ┌──────────────┐                           │
│  │  PROPOSER P  │  ← AI agent (Claude Code) │
│  │  (LLM +      │     reads filesystem      │
│  │   Tools)     │     proposes new harnesses│
│  └──────┬───────┘                           │
│         │ proposes code                     │
│         ▼                                   │
│  ┌──────────────┐     ┌──────────────┐     │
│  │  HARNESS H   │────▶│  EVALUATION  │     │
│  │  (Python     │     │  (run on     │     │
│  │   code)      │     │   test data) │     │
│  └──────────────┘     └──────┬───────┘     │
│                              │ logs        │
│                    ┌─────────▼─────────┐   │
│                    │   FILESYSTEM D    │   │
│                    │   - Source code   │   │
│                    │   - Scores        │   │
│                    │   - Exec traces   │   │
│                    └─────────┬─────────┘   │
│                              │ reads       │
│                              ▼             │
│                    (back to Proposer)      │
└─────────────────────────────────────────────┘
```

### The Search Loop (Step-by-Step)

1. **Initialize:** Start with a few hand-written harnesses
2. **Evaluate:** Run them on test data, log EVERYTHING to filesystem:
   - The source code
   - Accuracy/scores
   - Full execution traces (every function call, every retrieved document, every model input/output)
3. **Propose:** AI agent (Claude Code) examines the filesystem using tools like `grep`, `cat` to:
   - Find failed examples
   - Compare successful vs. unsuccessful harnesses
   - Identify *why* something failed (wrong retrieval? bad prompt structure?)
   - Propose new/improved harnesses
4. **Repeat:** Evaluate new candidates, add to filesystem, propose again
5. **Output:** Return the best harnesses (or trade-off curve if optimizing multiple objectives)

### Key Design Choices

#### 1. **Agent-Based Proposer**
- Uses Claude Code + Opus-4.6 (a coding agent)
- Can invoke developer tools, navigate files, edit code
- Not just a text generator—an actual **software engineer agent**

#### 2. **Full-History Filesystem Access**
- Stores ~10M tokens per evaluation run
- Proposer reads median **82 files per iteration**:
  - 41% source code of prior harnesses
  - 40% execution traces
  - 19% scores/metadata
- Can trace failures back to their root causes across many iterations

#### 3. **Code-Space Search (Not Weight-Space)**
- Modifying Python code, not neural network weights
- Small changes to retrieval/memory logic can have **delayed effects**
- Enables algorithmic restructuring, not just parameter tweaks

#### 4. **No Hard-Coded Heuristics**
- No fixed rules like "always keep the best 10%" or "mutate with probability 0.1"
- The proposer **decides** which parents to use, what to change, when to pivot strategies
- As coding agents improve, the system automatically gets better

---

## 📊 EXPERIMENTS & RESULTS

### Experiment 1: Online Text Classification

**Task:** Classify text (legal cases, medical symptoms, patents) with continuous learning

**Setup:**
- Model: GPT-OSS-120B
- 20 iterations, 2 new harnesses per iteration
- Competing against: ACE, MCE (state-of-the-art context management systems)

**Results:**
| Method | Accuracy | Context Tokens Used |
|--------|----------|---------------------|
| ACE | 40.9% | 50,800 |
| MCE | 40.0% | 28,500 |
| **Meta-Harness** | **48.6%** | **11,400** |

**Key Takeaways:**
- **+7.7 points** over best baseline
- Uses **4× fewer context tokens** (more efficient!)
- Matches OpenEvolve/TTT-Discover final accuracy in just **4 evaluations** (10× less budget)

**Ablation Study (proves full traces matter):**
| Feedback Type | Median Accuracy |
|---------------|-----------------|
| Scores only | ~34% |
| Scores + summaries | ~35% |
| **Full traces (Meta-Harness)** | **50%** |

**Pareto Frontier Discovery:**
- The proposer naturally found a smooth trade-off curve between accuracy and context cost
- You can choose: "I'll spend 20K tokens for 47% accuracy" or "I'll spend 5K tokens for 42% accuracy"
- No pre-programmed optimization for this—emerged from the search

**Out-of-Distribution (OOD) Generalization:**
- Tested on 9 completely unseen datasets (scientific citations, financial news, emotions, etc.)
- Meta-Harness: 73.1% avg accuracy (+2.9 over ACE)
- Using only 7.3K context tokens
- **The discovered harnesses generalize beyond their training data!**

---

### Experiment 2: Retrieval-Augmented Math Reasoning

**Task:** Solve IMO-level math problems by retrieving similar problems from a database

**Setup:**
- Search on 250 Olympiad problems (40 iterations)
- Test on 200 IMO-level problems
- Evaluate across 5 different held-out models (GPT variants, Gemini variants)

**Results (average accuracy improvement over no-retrieval baseline):**
| Retrieval Method | Avg Improvement |
|------------------|-----------------|
| BM25 (lexical) | +1.3 points |
| Dense retrieval (embeddings) | Sometimes **worse** than no retrieval |
| Random few-shot | Sometimes **worse** than no retrieval |
| **Meta-Harness discovered harness** | **+4.7 points** |

**What Did Meta-Harness Discover?**

A **4-route lexical router** that:
1. **Classifies the problem** into: Combinatorics, Geometry, Number Theory, or Default
2. **Each route has custom settings:**
   - **Geometry:** 1 hard reference + 2 raw similar problems (values structural similarity)
   - **Combinatorics:** Reranks retrieved problems by difficulty (diversity matters more)
   - **Number Theory/Default:** Custom deduplication and reranking thresholds

**Why This Is Clever:**
- Different math subjects need **different retrieval strategies**
- Geometry problems are visual/structural → show solved examples
- Combinatorics problems vary wildly in difficulty → need hard problems specifically
- A one-size-fits-all retriever (like BM25 or dense embeddings) can't adapt like this

**Transfer Across Models:**
- The harness was discovered using one model
- It improved accuracy on **5 different held-out models** (GPT-4o, GPT-OSS variants, Gemini variants)
- **+1.3 to +5.3 points** improvement across models
- **The retrieval policy is model-agnostic!**

---

### Experiment 3: Agentic Coding on TerminalBench-2

**Task:** AI agents that solve long-horizon CLI tasks (89 tasks)

**Setup:**
- Started from Terminus 2 & Terminus-KIRA (existing agent frameworks)
- Evaluated on Claude Opus 4.6 & Haiku 4.5

**Results:**
| Model | Meta-Harness Pass Rate | Best Hand-Engineered |
|-------|------------------------|----------------------|
| Opus 4.6 | **76.4%** (#2 overall) | Terminus-KIRA: 74.7% |
| Haiku 4.5 | **37.6%** (#1 for Haiku) | Goose: 35.5% |

**The Killer Discovery: Environment Bootstrapping**

Meta-Harness added a single function that runs **before the agent starts working**:

```python
def _gather_env_snapshot():
    # Runs one compound shell command
    # Gathers: OS, installed languages, package managers, directory structure
    # Injects all this into the initial prompt
    # Takes ~15 seconds, fails silently if something goes wrong
```

**Why This Matters:**
- Without this: Agent wastes 2-4 turns exploring ("what OS am I?", "is Python installed?", "where's the code?")
- With this: Agent starts with full context of the environment
- **Largest gains on tasks requiring domain-specific tooling** (e.g., "install this specific package and run analysis")

**Qualitative Behavior: The Proposer Got Smart**

The proposer demonstrated **causal reasoning**:
1. Early iterations: Made prompt changes that masked structural bugs (confounded edits)
2. After 6 regressions (performance drops): Identified the confounds
3. Pivoted strategy: Switched to purely additive modifications
4. Isolated structural bugfixes from cosmetic changes

**This is meta-learning:** The proposer learned *how to search* based on past failures.

---

## 🔬 DEEP DIVE: DISCOVERED HARNESS ARCHITECTURES

### Text Classification: Two Winning Strategies

#### Strategy 1: Draft-Verification (2-Call Method)
```
1. Model drafts an answer
2. System retrieves counterexamples (cases where similar answers were WRONG)
3. Model verifies/edits its draft against counterexamples
4. Final answer returned
```

**Why it works:** Self-correction through adversarial retrieval

#### Strategy 2: Label-Primed Query
```
1. TF-IDF retrieval of similar examples
2. Create contrastive pairs: "This is X because... This is NOT X because..."
3. Prime the model with the label space first
4. Model classifies with better context
```

**Why it works:** Contrastive examples teach boundaries, not just prototypes

---

### Math Reasoning: The 4-Route BM25 Router

```python
# Simplified pseudocode
def math_harness(problem):
    subject = classify_subject(problem)  # Combinatorics, Geometry, NT, Default
    
    if subject == "Geometry":
        refs = bm25_search(problem, k=3)
        return f"1 hard reference:\n{refs[0]}\n\n2 raw neighbors:\n{refs[1:3]}"
    
    elif subject == "Combinatorics":
        refs = bm25_search(problem, k=10)
        refs = rerank_by_difficulty(refs)  # Hard problems first
        return deduplicate(refs[:5])
    
    elif subject == "Number Theory":
        # Custom deduplication threshold
        refs = bm25_search(problem, k=5, dedup_threshold=0.7)
        return refs
    
    else:
        return bm25_search(problem, k=3)  # Default
```

**Why this beats standard retrieval:**
- Standard BM25: Same k, same settings for all problems
- Dense retrieval: Embeddings may not capture mathematical structure
- Meta-Harness: **Subject-specific policies** with custom reranking/deduplication

---

### TerminalBench-2: Environment Bootstrapping

```python
def _gather_env_snapshot():
    cmd = """
    echo "PWD: $(pwd)"
    echo "OS: $(uname -a)"
    echo "Python: $(python3 --version 2>&1)"
    echo "Node: $(node --version 2>&1)"
    echo "Packages: $(ls /app 2>/dev/null)"
    echo "Memory: $(free -h 2>/dev/null)"
    """
    result = subprocess.run(cmd, shell=True, capture_output=True, timeout=15)
    return result.stdout  # Injected into initial prompt
```

**~80 lines added to Terminus-KIRA**  
**Eliminates 2-4 wasted exploratory turns**  
**Biggest impact on tasks needing specific tooling**

---

## 🧠 WHY META-HARNESS WORKS: THEORETICAL INSIGHTS

### 1. **Causal Hypothesis Formation**
With full traces, the proposer can form hypotheses like:
- "This harness failed because it retrieved irrelevant documents at step 2"
- "Adding verification at step 4 would have caught the error"
- "The prompt change was cosmetic; the real bug is in the retrieval logic"

**Without traces:** You can't distinguish "bad retrieval" from "bad prompting" from "bad model"

### 2. **Composing Orthogonal Improvements**
The proposer learns to:
- Isolate independent improvements (better retrieval ≠ better prompting)
- Combine them systematically
- Avoid changes that interact unpredictably

### 3. **Pareto Optimization Without Explicit Objectives**
- The search naturally finds the accuracy-vs-cost trade-off curve
- No scalar weighting like "maximize: accuracy - 0.1 × cost"
- Just raw code search → frontier emerges

### 4. **Overfitting Is Inspectable**
- In weight-space (neural nets): Overfitting is opaque (which neurons are memorizing?)
- In code-space: You can literally read the harness and see "oh, it's hardcoding answers"
- Easy to detect and penalize

---

## 📈 COMPARISON TO RELATED WORK

| Method | What It Searches | Feedback Type | History Access |
|--------|------------------|---------------|----------------|
| **TextGrad/OPRO** | Prompts (text) | Scores + gradients | Current candidate only |
| **GEPA** | Prompts | Reflection (2-8K tokens) | Single candidate |
| **AlphaEvolve/OpenEvolve** | Functions (stateless) | Fixed mutations | Memoryless |
| **DSPy/LangChain** | Templates (manual) | None (frameworks, not optimizers) | N/A |
| **Meta-Harness** | **Full harness code** | **Full traces (~10M tokens)** | **Complete history** |

**Key Differentiators:**
- Searches over **stateful, long-horizon programs** (not stateless functions)
- **Population-wide** comparison (not single-candidate reflection)
- **Unrestricted filesystem access** (not fixed mutation operators)
- **No hardcoded search heuristics** (proposer adapts strategy)

---

## 💡 PRACTICAL IMPLEMENTATION TIPS (FROM APPENDIX)

### Skill File Design
- Write **constrained skill files** for the proposer
- **Forbid:** Unsafe actions, specific hacks
- **Specify:** I/O format, filesystem navigation rules
- **Leave open:** Diagnosis methodology (let the proposer figure out how to debug)

### Search Strategy
1. **Start with a failing baseline** (easier to improve from 20% → 40% than 70% → 80%)
2. **Use small, hard search sets** (~50-100 examples, not thousands)
3. **Log in machine-readable JSON** with hierarchical naming
4. **Add lightweight validation tests** before full evaluation
5. **Keep proposer separate from evaluation script** (clean separation of concerns)

### Typical Run Statistics
- ~60 harnesses evaluated over 20 iterations
- ~4 hours wall-clock time (depends on task)
- Proposer reads ~82 files per iteration
- Generates ~3-5 new harness candidates per iteration

---

## 🎯 KEY TAKEAWAYS

### 1. **Harness Engineering Is Worth It**
- Same model + better harness = 6× performance improvement
- Automated search > manual engineering
- Discovered harnesses generalize to new data and new models

### 2. **Full Trace Access Is Critical**
- Scores-only: ~34% accuracy
- Scores + summaries: ~35% accuracy  
- **Full traces: 50% accuracy**
- 10M tokens of diagnostic data > 30K tokens of summaries

### 3. **Code-Space Search Has Unique Advantages**
- Overfitting is **inspectable** (you can read the code)
- Causal diagnosis is **possible** (trace execution step-by-step)
- Algorithmic restructuring is **expressive** (any Python code is valid)

### 4. **Emergent Behaviors Are Sophisticated**
The proposer independently discovered:
- Multi-stage verification
- Query-anchored contrastive retrieval
- Lexical routing with difficulty reranking
- Environment bootstrapping

**None of these were hardcoded**—they emerged from search.

### 5. **This Generalizes**
- OOD datasets: +2.9 points over baselines
- Unseen models: +4.7 points average on math reasoning
- Different domains: text, math, agentic coding

---

## 🔮 FUTURE DIRECTIONS (FROM DISCUSSION)

1. **Co-evolving harnesses with model weights** (joint optimization, not separate)
2. **Testing across diverse proposer agents** (not just Claude Code)
3. **Multi-objective optimization** (accuracy, cost, latency, safety)
4. **Scaling to larger search spaces** (multi-file harnesses, distributed systems)
5. **Theoretical understanding** of why full traces enable causal reasoning

---

## 📚 GLOSSARY

| Term | Definition |
|------|------------|
| **Harness** | Code that determines what info to store, retrieve, and present to an LLM |
| **Proposer** | AI agent that generates new harness candidates |
| **Execution Trace** | Full log of everything that happened when running a harness (function calls, retrieved docs, model I/O) |
| **Pareto Frontier** | Set of solutions where you can't improve one objective without hurting another |
| **OOD (Out-of-Distribution)** | Data different from what the system was optimized on |
| **BM25** | Lexical (keyword-based) retrieval algorithm |
| **Dense Retrieval** | Using embeddings to find semantically similar documents |
| **Context Tokens** | Number of tokens in the prompt given to the model (cost metric) |
| **Ablation Study** | Removing components to measure their individual contribution |

---

## ❓ COMMON QUESTIONS

### Q: Isn't this just automated programming?
**A:** Partially, but with a twist: the proposer has access to **execution traces** showing exactly where prior attempts failed. It's like debugging with a full stack trace vs. just seeing "it crashed."

### Q: How is this different from AutoML?
**A:** AutoML searches over model architectures/hyperparameters. This searches over **the code surrounding a fixed model** (retrieval logic, memory management, prompt construction).

### Q: Can I use this with any LLM?
**A:** Yes! The harness is model-agnostic. In fact, discovered harnesses transferred to unseen models in the experiments.

### Q: What's the compute cost?
**A:** Typical runs evaluate ~60 harnesses over 20 iterations, completing in **hours of wall-clock time** (not days). Much cheaper than fine-tuning.

### Q: Will this replace prompt engineers?
**A:** It automates the search process, but humans still need to:
- Define the task and evaluation metric
- Write the initial skill file (constraints for the proposer)
- Interpret and deploy the discovered harnesses

### Q: What are the limitations?
**A:** 
- Requires a good evaluation metric (if you can't measure it, you can't optimize it)
- Search space is large (can take many iterations to find good solutions)
- Depends on proposer agent quality (better coding agents = better harnesses)

---

## 🎓 ONE-PARAGRAPH SUMMARY

Meta-Harness is a system that **automates the engineering of code surrounding LLMs** (called "harnesses") by using an AI coding agent to search over Python programs, evaluate them on tasks, and iteratively propose improvements based on **full execution traces** (not just scores or summaries). By giving the proposer access to ~10M tokens of diagnostic data per evaluation (source code, scores, detailed traces), it can perform **causal diagnosis** of failures and discover sophisticated strategies like multi-stage verification, subject-specific retrieval routing, and environment bootstrapping. Across text classification, math reasoning, and agentic coding, Meta-Harness discovers harnesses that outperform hand-engineered baselines by 4-8 points while using 4× fewer context tokens, and these improvements generalize to unseen datasets and models.
