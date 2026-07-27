---
title: "Natural-Language Agent Harnesses"
pubDate: 2026-06-22
---

## Natural-Language Agent Harnesses (2603.25723v2) â€” Notes

## What is a Harness

A harness is the external execution system wrapped around a language model that turns it into an agent. It decides what the model sees, what tools it can call, where state is stored, how observations are returned, when validation runs, how failures are recovered, and when execution stops. Harness engineering covers eleven aspects: agent loops, tool design, context engineering, filesystem and workspace management, memory and state, validation and stopping conditions, safety and permissions, runtime defaults, observability and replay, retry and recovery, and budget control. The problem is that harness logic is usually buried inside tightly coupled controller code, making harnesses hard to inspect, compare, port, and ablate.

## NLAH (Natural-Language Agent Harness)

An NLAH is an editable natural-language document that describes run-level harness policy. It specifies the stages of a run, the roles of different agents, state rules, verification rules, recovery rules, and stopping conditions. The key insight is a division of labor: natural language carries the harness policy (roles, contracts, evidence requirements, retry rules, validation strategy), while code carries exact mechanisms (tool execution, parsing, sandboxing, logging, deterministic validators). An NLAH is not a prompt; it describes the lifecycle of a full task run across multiple steps.

## IHR (Intelligent Harness Runtime)

IHR is a shared runtime that interprets NLAH documents and materializes them into concrete agent calls, handoffs, state updates, validation gates, and artifact contracts. It is built on a minimal base agent that only has an LLM loop and terminal access. The runtime policy is a fixed instruction that tells the base agent how to interpret and execute harness documents. IHR intentionally uses a parent orchestrator plus child executor pattern so the boundary between harness control and task execution stays visible. It is not a large bespoke controller for one benchmark but a shared substrate.

## Four-Layer Architecture

The system has four layers. The base agent is a minimal executable substrate: an LLM loop with terminal access only. The runtime policy is a fixed instruction that turns the base agent into IHR by defining how it interprets harness documents. The NLAH is the per-harness policy document that changes from one harness to another. Scripts and adapters are deterministic code for exact operations such as running tests, parsing results, and calling benchmark tools.

## Three Ways to Control an Agent Run

Code harnesses impose hard external control through program logic. NLAH plus IHR moves the policy into readable natural language while a shared runtime executes it through child-agent calls. Self-harnessing is a possible future design where a controller model directly harnesses other models without any external harness.

## Key Writing Principles for NLAHs

State the task contract first: define input, expected output, allowed tools, and completion condition. Separate stages from mechanisms: name the stages but do not reimplement low-level tool operations in prose. Make state and evidence explicit: specify where state is stored and what artifacts support a claim. Write module boundaries so they can be ablated: use clear module names like verifier or self-evolution. Prefer simple and enforceable language: short clauses and concrete conditions beat vague advice.

## Three Research Questions

RQ1 asks whether harness policy can be moved from code into an NLAH without losing the ability to control real agent runs. RQ2 asks whether IHR-executed NLAHs materialize the intended harness mechanisms beyond matching task scores. RQ3 asks whether explicit NLAH modules support clean ablation and analysis under a shared runtime.

## Three Benchmark Families

SWE-bench Verified evaluates repository-grounded issue resolution in coding tasks. Terminal-Bench 2.0 evaluates long-horizon command-line tasks in Linux environments. OSWorld evaluates computer-use behavior grounded in real desktop environments.

## RQ1 Results

NLAHs achieve competitive task performance across all three benchmarks. On SWE-bench, IHR-executed NLAH reaches 73.0 percent versus the code harness at 67.0 percent. On Terminal-Bench, NLAH reaches 53.9 percent versus the code harness at 36.0 percent. On OSWorld, NLAH reaches 46.3 percent versus the code harness at 47.1 percent. NLAHs also dramatically shorten the inspectable policy surface: from 60.1k tokens of code to a 2.9k-token NLAH on SWE-bench. The cost profile shows more model calls and tokens, which is expected prototype overhead.

## RQ2 Results

NLAH runs preserve recognizable workflow structure, high artifact-contract compliance, high tool-call success, and high continuation after failed tool calls. The main weakness is handoff reliability: information is lost across parent-child boundaries in the prototype runtime, lowering orchestration reliability and information handoff recall compared to prompted execution.

## RQ3 Results

File-backed state improves both benchmarks: plus 2.6 on SWE and plus 13.9 on OSWorld. Self-evolution is even stronger, reaching plus 5.8 on SWE and plus 8.4 on OSWorld. Evidence-backed answering is consistently positive. Multi-candidate search increases agent calls significantly but yields only plus 2.8 on OSWorld and a negative result on SWE. Context compression hurts both benchmarks, especially OSWorld at minus 8.3. Markdown memory is mixed, helping OSWorld but hurting SWE. The overall pattern is that modules that shorten the path from intermediate work to auditable evidence and final acceptance are most useful.

## The MHTBA Portability Finding

A code harness discovered for one model (Claude Opus 4.6) encoded latent assumptions about that models tool-calling and stopping behavior. When transplanted to a different model (GPT), those assumptions caused repeated timeout loops even when task state was already correct. This illustrates a general risk: code harnesses can be more brittle than natural-language policies.

## Natural-Language Code Boundary

Base runtime code handles model APIs, tool schemas, bash execution, timeouts, event streams, and message history. Runtime policy or fixed charter carries IHR interpretation semantics, parent-child boundaries, and shared rules. NLAH carries replaceable harness roles, stages, validation policy, recovery policy, and module composition. Scripts or adapters handle tests, validators, parsers, and benchmark wrappers that require exact execution. Model internals such as constrained decoding are outside NLAH scope.

## Chase Questions

## What was the paper trying to make possible

The paper was trying to make agent harnesses into first-class research objects instead of incidental glue buried inside controller code. It wanted harness policy to be readable, editable, portable, comparable, and ablatable, while still being executable. It proposed using natural language at the harness-policy level rather than at the prompt level.

## What assumption does it quietly depend on

It quietly depends on the assumption that a shared runtime can reliably interpret free-form natural-language policy documents across diverse tasks and produce consistent behavior. This is a big assumption because natural language is inherently ambiguous, and the paper acknowledges that interpretation uncertainty is a key limitation. It also depends on the specific capability of the underlying model to follow complex multi-step instructions.

## What becomes obvious after reading it that was not obvious before

That harness design is its own engineering discipline separate from model capability. Many results attributed to better models may actually be driven by harness choices. The MHTBA portability finding makes this concrete: a state-of-the-art code harness failed when the model changed, while natural-language policies transferred more gracefully. Also obvious is that not all modularity helps: extra branching from multi-candidate search can be worse than simple state discipline.

## Where does the idea break if you push it outside the paper

It breaks when tasks require hard real-time guarantees, safety-critical deterministic behavior, or extremely low latency, because natural-language interpretation introduces variance and overhead. It also breaks if the underlying model is too weak to follow multi-step policy documents reliably. The handoff weakness in IHR suggests the idea frays at scale as the number of child agents grows and information loss across boundaries accumulates. It also struggles when the policy document and the benchmark acceptance criterion are mismatched, as seen with modules like context compression.

## What long-running problem did this paper move, even slightly

It moved the problem of harness intransparency. Before this paper, harness design was largely an engineering craft with hard-to-compare implementations. After it, there is a concrete representation scheme, a shared runtime, modular ablation methodology, and mechanism-level metrics that make harnesses analyzable. It moved the field from asking which system wins to asking which policy choices cause the difference.

## What idea from it could travel into writing, products, systems, or life

The core idea that policy should be separated from mechanism and written in an inspectable, editable, natural-language layer applies broadly. In product development, it suggests writing explicit run-level policies for agent features that state goals, evidence requirements, and stopping conditions rather than wiring logic into code. In writing, it validates the idea that declarative documents can be executable. In systems, the parent-child orchestration pattern and the finding that explicit state discipline beats clever branching are practical architectural principles. In life, the idea that you should externalize your decision policy so it can be inspected, ablated, and improved rather than keeping it implicit in your habits is a useful reframe.
