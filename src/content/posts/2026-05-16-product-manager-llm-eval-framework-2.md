---
title: Updated - Every Product Manager should have a personal LLM Eval Framework
pubDate: 2026-05-16
---

When I wrote the first version of this in December 2025, a practical PM eval could be pretty simple: keep a small set of prompts, run the old model against the new one, and mark win, loss, or tie.

Still useful, and too thin for the way AI products work in May 2026.

A model upgrade today might bring automatic routing between fast and deeper reasoning, a much larger context window, better tool use, web search, file search, memory, code execution, structured outputs, citations, or an agent loop that can take action. The user does not care which piece changed. They care whether the product helped them finish the job without wasting time, inventing facts, leaking data, or doing something they did not approve.

So the PM eval has to grow up a little. The prompt alone is too small. The workflow is the unit.

Engineering still owns formal benchmarks, regression tests, load testing, and safety reviews. Your job as a PM or designer is different. You need a lightweight way to answer a product question:

## Does this upgrade make the product better for the people using it?

Here is the framework I would use now.

---

## 1. Build a Golden Workflow Set

Do not start with random prompts. Start with the jobs users actually come to your product to finish.

In 2025, I would have said to keep around 10 prompts. Now I would keep 15 to 20 golden workflows. That sounds heavier, though each one can still be short. The point is to capture the full situation, beyond the opening sentence.

For every workflow, write down:

- The user goal
- The input data
- The expected output
- The thing that would make this answer unacceptable
- Any files, tools, memory, retrieval, or web access involved
- The severity if it fails

Your set should have a mix like this:

- 4 everyday workflows: the boring, high-volume jobs your product handles all the time.
- 3 known failures: cases where the current model hallucinated, rambled, refused too much, or broke format.
- 3 edge cases: messy input, long context, conflicting constraints, multilingual text, strange formatting.
- 3 tool or retrieval cases: search, citations, database lookup, file search, CRM actions, ticket updates.
- 2 multi-turn cases: the user corrects the assistant, changes the goal, or expects it to remember a constraint.
- 2 trust and safety cases: privacy, prompt injection, regulated claims, unsafe actions, sensitive user state.
- 1 or 2 cost and latency cases: jobs where the answer might be good while the product feels too slow or expensive.

This becomes your personal PM test suite. Keep it in a document, spreadsheet, eval tool, or whatever your team will actually use.

The important detail: save the whole scenario. A prompt alone is often missing the product context that caused the real bug.

---

## 2. Compare Configurations, Not Model Names

The challenger is rarely just a new model now.

You might be testing a newer frontier model. You might be testing a cheaper fast model for simple cases. You might be turning on a deeper reasoning mode only when the task looks hard. You might be changing the system prompt, retrieval index, memory setting, tool permissions, or structured-output strategy.

Treat each run as a product configuration.

Log the basics:

- Model name and version
- Reasoning or thinking level, if the product exposes one
- System prompt or instruction version
- Temperature and other sampling settings
- Retrieval source and index version
- Tool permissions
- Memory on or off
- Date of the run
- Latency and cost, if you can get them

This sounds fussy until you hit the first confusing result. A model looked great yesterday, worse today, and nobody knows whether the model changed, the prompt changed, or the retrieval index changed. Good eval notes prevent that argument.

---

## 3. Decide What Better Means

Do this before you run the cases.

Newer models can feel smarter while making the product worse. They may write more fluently and still miss the source document. They may reason longer and make the product feel slow. They may call tools when a simple answer would have been enough. They may sound confident when they should ask a follow-up question.

Pick the criteria that matter for your product. I usually score these:

- Task success: did the user get the job done?
- Accuracy: are facts, dates, numbers, names, and extracted fields correct?
- Grounding: did it use the right document, source, or citation?
- Tool behavior: did it call the right tool with the right arguments?
- Format: did it follow the requested JSON, table, Markdown, tone, or length?
- Latency: did it feel fast enough in the actual product moment?
- Cost: is the quality gain worth the spend?
- Conciseness: did it answer at the right depth?
- Safety and privacy: did it stay inside the boundaries of the product?
- Recovery: when it got stuck, did it ask, hand off, or fail cleanly?

Use a simple result label:

- Pass: good enough to ship for this workflow.
- Concern: promising, needs prompt, tool, UX, or guardrail work.
- Fail: blocks this workflow.

Then add severity:

- P0: unsafe action, data leak, unauthorized tool use, or a false high-stakes claim.
- P1: wrong answer in a core workflow.
- P2: user-visible issue that can be recovered from.
- P3: style or preference issue.

A challenger can win most cases and still be blocked by one P0. That is product judgment, not over-caution.

---

## 4. Capture the Trace and the Answer

Side-by-side review is still a good habit. Put the baseline on the left, the challenger on the right, and run the same case through both.

For simple chat workflows, a spreadsheet is enough. For tool-using or agentic workflows, capture the path as well as the answer.

Save:

- Final user-facing answer
- Retrieved documents or cited sources
- Tool calls and arguments
- Intermediate plan, if visible
- Latency
- Token or cost estimate
- Human correction needed
- Any moment that would confuse the user

This is where tools like OpenAI Evals, promptfoo, Braintrust, Phoenix, LangSmith, or an internal harness can help. The specific tool is less important than repeatability. You want fixed cases, clear rubrics, comparable runs, and a record of regressions.

LLM-as-judge is useful, with limits. It can do a first pass on tone, completeness, and relevance. I would not let it be the only judge for exact values, schemas, policy decisions, citations, or tool actions. Use deterministic checks wherever you can, then use human review for the product calls.

For workflows with randomness, run the same case more than once. The best answer is not the only thing that matters. The product has to be reliable on a normal Tuesday.

---

## 5. Review Blind, Then Review the Path

The blind review trick still works.

Paste both outputs into your sheet without model labels. Pick the better answer before you reveal which model produced it. This keeps you honest when you secretly want the new model to win.

After that, look at the trace.

An agent can land on a decent final answer through a path you would never ship. Maybe it used an old policy document. Maybe it called an expensive tool three times. Maybe it nearly took an irreversible action. Maybe it ignored a permission boundary and only got lucky because the tool failed.

Score two things separately:

- Outcome quality: was the final answer good?
- Workflow quality: was the route safe, efficient, and controllable?

This is the biggest change from the older version of the framework. The question has shifted from prose to behavior.

---

## 6. Give Engineers a Release Decision

Avoid vague feedback like the new model seems better. Give a decision the team can act on.

For example:

| Workflow | Verdict | Severity | PM Notes |
| --- | --- | --- | --- |
| Meeting summary | Win | P3 | Clearer structure, less filler, no noticeable latency hit |
| Policy Q&A with retrieval | Concern | P1 | Correct answer, wrong citation source |
| JSON extraction | Loss | P1 | Broke schema on 2 of 3 runs |
| Refund assistant | Block | P0 | Tried to call refund tool before explicit confirmation |
| Long onboarding document | Win | P2 | Better long-context handling, needs tighter headings |
| Tone rewrite | Tie | P3 | No meaningful user benefit over current model |

Then send the team a short note:

I ran the May 2026 PM eval against 18 golden workflows. The challenger had 9 wins, 5 ties, and 4 losses. It looks clearly better for long-context summarization and support drafting. It still regresses on structured extraction and one refund workflow. My recommendation: pilot it only for summarization and drafting. Block rollout for action-taking workflows until confirmation checks and schema validation pass.

Much more useful than a vibes-based yes.

---

## 7. Keep the Suite Alive

The suite should change when the product changes.

Add a case when:

- A user reports a bad answer
- A model update changes tone, refusal behavior, or tool use
- You add memory, retrieval, a connector, or a new tool
- You change the system prompt
- You launch a new workflow
- A competitor changes what users expect
- A high-cost workflow starts showing up more often

Remove stale cases that do not represent the product. A bloated eval suite becomes theater. Keep it small enough that you will actually run it.

The goal is not to create a perfect benchmark. The goal is to keep your product taste from going stale while the model layer keeps moving.

---

The May 2026 version is simple:

- Benchmarks give context. They are not product evidence.
- The smartest model is not always the best product model.
- The workflow is the system.
- Faster, cheaper, and more controllable often beats more intelligent.
- Evals are product maintenance, not a launch ritual.

A personal PM eval gives you a way to say, with evidence, this upgrade helps users, or this looks impressive and breaks the product.

That is the difference between chasing model releases and shipping better AI products.
