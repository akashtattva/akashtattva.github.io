---
title: "Every Product Manager should have a personal LLM Eval Framework"
pubDate: 2025-12-26
---

The rate of progress is currently faster than the rate of human adjustment. If you haven't checked the benchmarks or the latent space capabilities in the last 10-15 days, your mental model of what is possible has already deprecated, a legacy system running on fumes.

As a PM or designer, your goal with a personal eval isn't to replace the engineering team's benchmarks. Your goal is to get a qualitative vibe check to see if the new model actually solves user problems better or if it has regressed on key behaviors.

Here are some ways to run these evaluations efficiently.

---

## 1 Curate Your Golden Selection (The Data)

Don't just pick random questions. You need a representative mix of your actual traffic. Since you are only picking around 10 inputs, every single one must have a specific purpose.

Select your ~10 prompts using this distribution:

3 Common Use Case Prompts: These are the most common use cases your product handles (e.g., "Summarize this meeting note" or "Generate an SQL query"). If the model fails here, it's a no-go.

2 Known Failure Prompts: Prompts where the *previous* model struggled or hallucinated. You want to see if the new model fixed them.

2 Edge Case Prompts: Long contexts, messy input data, or instructions with conflicting constraints.

Keep these 10 prompts in a persistent document. This becomes your personal "PM Test Suite" that you use for every new model release.

---

## 2 The Setup

Do a side-by-side comparison. Open two browser tabs/windows:

Left: The current production model (Baseline).

Right: The new model candidate (Challenger).

Prepare a Spreadsheet: Create a simple Google Sheet or Excel file with the following columns:

Input Prompt
Old Model Response
New Model Response
Verdict (Win/Loss/Tie)
Notes (Why?)

---

## 3 Define Your Success Criteria

Before you run the first prompt, decide what "better" looks like for your specific product.

Accuracy: Did it follow the instruction perfectly?

Latency: Did it feel significantly faster or slower? (Visibly slower generation is a UX risk).

Conciseness: Did it ramble? (Newer models sometimes get chatty).

Formatting: Did it output the JSON/Markdown/Table correctly?

---

## 4 Run the Execution

Copy and paste your specific prompt into both windows simultaneously (or strictly one after another).

The "Blind" Review Trick:

If possible, paste the outputs into your spreadsheet without looking at which model produced which (hide the header if you can). Read both responses. Pick the winner based only on the content. This removes your bias of hoping the new, shiny model is better.

---

## 5 Analysis & Verdict

Tally up your score.

Tie: The new model behaves exactly like the old one. (Safe to deploy, but maybe not worth the cost/effort if it's more expensive).

Win: The new model fixed a bug or gave a better answer.

Loss: The new model hallucinated or refused a safe prompt.

Example Spreadsheet:


| Prompt Type    | Input Snippet               | Verdict  | PM Notes                                                                     |
| -------------- | --------------------------- | -------- | ---------------------------------------------------------------------------- |
| Bread & Butter | "Summarize this email..."   | **Tie**  | Both missed the attachment context, but summary was okay.                    |
| Known Failure  | "Extract the date from..."  | **Win**  | Old model said "tomorrow", New model correctly said "Oct 12".                |
| Edge Case      | [Malformatted JSON snippet] | **Loss** | New model tried to "fix" the JSON but hallucinated a key. **CRITICAL FLAG.** |
| Tone Check     | "Explain error to user..."  | **Win**  | New model was much more empathetic and less robotic.                         |


---

Once done, you don't just say "it looks good." You provide a structured specific update to your engineers:

*"I ran my personal 10-point eval. The new model is significantly better at reasoning (fixed the date extraction bug), but it seems to have a regression on handling malformed JSON inputs. We need to add a few-shot example to the system prompt to fix that before we can ship."*

---
