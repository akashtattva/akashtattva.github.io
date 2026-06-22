---
title: "AGENTS.md Paper Notes"
pubDate: 2026-06-22
---

# Paper Notes: Evaluating AGENTS.md — Are Repository-Level Context Files Helpful for Coding Agents?

## What is this paper about?

- This paper tests whether context files like AGENTS.md or CLAUDE.md actually help AI coding agents do their job better
- Context files are text files placed in a code repository that tell the AI agent about the project, its tools, coding style, etc.
- Over 60,000 open-source repos now have these files, and companies like Cursor, Claude Code, and OpenAI recommend creating them
- But no one had actually rigorously tested if they work — this paper does that

## How did they test it?

- They created a new benchmark called AGENTbench with 138 real coding tasks from 12 repos that already have developer-written context files
- They also used an existing benchmark (SWE-bench Lite) which has tasks from popular repos
- They tested multiple coding agents (Cursor, Claude Code, Aider, OpenHands, Codex CLI) with different AI models (GPT-4o, Claude Sonnet 4.5, Qwen3-Coder)
- For each task they compared 3 settings:
  - No context file at all (baseline)
  - An AI-generated context file (made using the agent's own /init command)
  - A human-written context file (provided by the repo's developers)

## What did they find?

- AI-generated context files make things WORSE — success rate dropped by about 3% compared to having no context file at all
- Human-written context files help only a tiny bit — about 4% improvement on average
- Both types of context files increase cost by over 20% because the agent does more unnecessary work

## Why do context files hurt more than help?

- Agents follow the instructions in context files very obediently — even when those instructions are unnecessary or bad
- Context files make agents do more exploration, more testing, and more thinking — much of it wasted effort
- The files often contain unnecessary requirements that distract the agent from the actual task
- An AI-generated context file might tell the agent "always run tests after changes" — the agent does this even when it's not relevant

## What about human-written files (real ones from developers)?

- Human-written files performed slightly better than AI-generated ones, but still barely better than no file at all
- Even real developers seem to include too many unnecessary instructions
- The small improvement from human files came mostly from repos where developers kept the file minimal

## What the paper recommends

- FOR NOW: Do NOT use AI-generated context files — they waste money and hurt performance
- If you write a context file, keep it VERY minimal — only include essential requirements that the agent absolutely needs to know
- Examples of useful minimal content: "This project uses Poetry for dependencies" or "Run tests with pytest"
- Examples of harmful content: long style guides, detailed architecture descriptions, unnecessary instructions

## Key numbers to remember

- AI-generated context files: ~3% drop in success rate
- Human-written context files: ~4% improvement in success rate
- Cost increase with any context file: >20% more AI tokens used
- Results were consistent across different AI models and different coding agents
- Over 60,000 repos have these files, but the evidence suggests most of them might be counterproductive

## Limitations (what the paper could not test)

- Only tested Python repositories — other languages might behave differently
- Only measured task completion — context files might help in other ways (code quality, security, etc.)
- The AI-generated files were made using current tools — better generation methods might work better in the future

## Bottom line in one sentence

Context files are currently overhyped — they mostly just make agents do more work and spend more money without solving tasks any better.
