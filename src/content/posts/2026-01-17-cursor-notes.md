---
title: "Working with Cursor: Rules, Commands, MCP servers, Modes, Hooks, Skills"
pubDate: 2026-01-17
---

## What are Rules, Commands, MCP servers, Modes, Hooks, Skills.

These notes cover techniques for working with Cursor focusing on how to maximize their effectiveness.

## Some clear definitions first.

## 1. Cursor Rules

Static instructions defined in `.cursor/rules/` that apply to every conversation. They provide persistent context like code style preferences, project-specific conventions, and common workflows to guide the agent's behavior consistently across all interactions.

Eg: A rule in `.cursor/rules/style.md` specifying "Always use functional components with TypeScript interfaces for props" ensures the agent never generates class-based components.

## 2. Cursor Skills

Dynamic capabilities defined in `SKILL.md` files that package domain-specific knowledge or workflows. Unlike rules, skills are loaded only when relevant to the current task, keeping the context window clean while extending the agent's abilities with specialized information.

## 3. Custom Commands

Reusable workflows triggered by specific slash commands (e.g., `/pr`) defined in markdown files. They allow agents to execute multi-step processes autonomously, such as creating pull requests, reviewing code, or fixing issues, thereby standardizing complex tasks.

Eg: A `/pr` command defined in `.cursor/commands/pr.md` that instructs the agent to run `git diff`, write a commit message, push changes, and use `gh pr create` to open a pull request.

## 4. Hooks

Scripts configured in `.cursor/hooks.json` that execute before or after agent actions. They enable long-running loops or integration with external systems, allowing agents to iterate automatically until a specific condition, such as all tests passing, is met.

Eg: A "stop" hook pointing to `.cursor/hooks/grind.ts` that checks if tests are passing after an agent's edit; if they fail, it feeds the error back to the agent to try again automatically.

## 5. Cloud Agents

Agents that run in remote sandboxes rather than locally. They are ideal for long-running, asynchronous tasks like large refactors or bug fixes, allowing users to offload work and close their laptop while the agent continues in the background.

Eg: Asking a cloud agent to "Migrate all Button components to the new design system," which involves finding, editing, and verifying hundreds of files without blocking your local editor.

## 6. MCP Servers for Tools & Actions

Integrations using the Model Context Protocol that connect agents to external tools and services. This allows agents to interact directly with third-party platforms like Slack, databases, Sentry, or Datadog to fetch context or perform actions outside the editor.

Eg. An MCP server for Figma that allows the agent to read a design file directly from a URL and generate the corresponding React code with accurate CSS values.

---

## Understanding Agent Harnesses

An agent harness consists of three core components:

- **Instructions:** System prompts and rules guiding agent behavior.
- **Tools:** Capabilities like file editing, codebase search, and terminal execution.
- **User Messages:** Your prompts and follow-ups that direct the work.

The harness orchestrates these components, tuning them for different models to ensure optimal responses to prompts and efficient tool utilization.

## Start with Plans

Planning before coding is crucial for effective agent use. It forces clear thinking and provides the agent with concrete goals.

### Using Plan Mode

- Toggle Plan Mode by pressing `Shift+Tab` in the agent input.
- In Plan Mode, the agent will:
  - Research the codebase.
  - Ask clarifying questions.
  - Create a detailed implementation plan with file paths and code references.
  - Wait for your approval before building.
- Plans open as Markdown files, allowing direct editing to refine steps or add context.
- **Tip:** Save plans to `.cursor/plans/` to document work, resume interrupted tasks, and provide context for future agents.
- Not all tasks require detailed plans; quick changes can bypass Plan Mode.

### Starting Over from a Plan

## If an agent's output doesn't meet expectations, revert changes, refine the original plan to be more specific, and rerun it. This often yields cleaner and faster results than trying to fix an in-progress agent.

## Managing Context

Effectively managing context is key to guiding agents.

### Let the Agent Find Context

- Agents have powerful search tools (e.g., `grep`, semantic search) and can pull context on demand. You don't need to manually tag every file.
- **Keep it simple:** Tag exact files if known; otherwise, let the agent find them. Including irrelevant files can confuse the agent.
- Tools like `@Branch` allow you to provide context about your current work (e.g., "Review the changes on this branch").

### When to Start a New Conversation

- **Start a new conversation when:**
  - Moving to a a different task or feature.
  - The agent is confused or repeating mistakes.
  - A logical unit of work is complete.
- **Continue the conversation when:**
  - Iterating on the same feature.
  - The agent needs context from earlier in the discussion.
  - Debugging something it just built.
- Long conversations can lead to context accumulation, noise, and decreased agent effectiveness.

### Reference Past Work

## When starting a new conversation, use `@Past Chats` to reference previous work instead of copy-pasting entire conversations. This allows the agent to selectively pull in relevant context, improving efficiency.

## Extending the Agent

Customize agent behavior using **Rules** for static context and **Skills** for dynamic capabilities.

### Rules: Static Context for Your Project

- Rules provide persistent instructions that apply to every conversation.
- Create rules as Markdown files in `.cursor/rules/`.
- **Example Rule Structure:**
  ```markdown
  # Commands
  - `npm run build`: Build the project
  - `npm run typecheck`: Run the typechecker
  - `npm run test`: Run tests (prefer single test files for speed)
  # Code style
  - Use ES modules (import/export), not CommonJS (require)
  - Destructure imports when possible: `import { foo } from 'bar'`
  - See `components/Button.tsx` for canonical component structure
  # Workflow
  - Always typecheck after making a series of code changes
  - API routes go in `app/api/` following existing patterns
  ```
- **Focus on essentials:** Commands, patterns, and pointers to canonical examples. Reference files instead of copying content to prevent staleness.
- **Avoid:** Copying entire style guides, documenting every command, or adding instructions for rare edge cases.
- **Tip:** Start simple. Add rules only when the agent repeatedly makes the same mistake. Check rules into Git for team benefit.

### Skills: Dynamic Capabilities and Workflows

- Skills extend agent capabilities by packaging domain-specific knowledge, workflows, and scripts.
- Defined in `SKILL.md` files, they can include:
  - **Custom commands:** Reusable workflows triggered with `/` (e.g., `/pr`).
  - **Hooks:** Scripts that run before or after agent actions.
  - **Domain knowledge:** Instructions for specific tasks.
- Unlike Rules, Skills are loaded dynamically when relevant, keeping the context window clean.

---

### Long-running Agent Loop (using Hooks)

This pattern allows agents to iterate until a goal is achieved (e.g., all tests pass).

- **Configure the hook in `.cursor/hooks.json`:**
  ```json
  {
    "version": 1,
    "hooks": {
      "stop": [{ "command": "bun run .cursor/hooks/grind.ts" }]
    }
  }
  ```
- **Hook script (`.cursor/hooks/grind.ts`):** Receives context from stdin and returns a `followup_message` to continue the loop.
  ```typescript
  import { readFileSync, existsSync } from "fs";
  interface StopHookInput {
    conversation_id: string;
    status: "completed" | "aborted" | "error";
    loop_count: number;
  }
  const input: StopHookInput = await Bun.stdin.json();
  const MAX_ITERATIONS = 5;
  if (input.status !== "completed" || input.loop_count >= MAX_ITERATIONS) {
    console.log(JSON.stringify({}));
    process.exit(0);
  }
  const scratchpad = existsSync(".cursor/scratchpad.md") ? readFileSync(".cursor/scratchpad.md", "utf-8") : "";
  if (scratchpad.includes("DONE")) {
    console.log(JSON.stringify({}));
  } else {
    console.log(JSON.stringify({ followup_message: `[Iteration ${input.loop_count + 1}/${MAX_ITERATIONS}] Continue working. Update .cursor/scratchpad.md with DONE when complete.` }));
  }
  ```
- **Useful for:** Running until tests pass, iterating on UI, or any verifiable goal-oriented task.
- **Tip:** Skills with hooks can integrate with security tools, secrets managers, and observability platforms.
- **MCP (Model Context Protocol):** Connects agents to external tools like Slack, Datadog, Sentry, and databases.

---

## Including Images

Agents can process images directly from prompts.

- **Design to Code:** Paste design mockups for the agent to implement, matching layouts, colors, and spacing. Figma MCP server can also be used.
- **Visual Debugging:** Screenshot error states or unexpected UI for the agent to investigate. The agent can also control a browser to take screenshots and verify visual changes.

## Common Workflows

### Test-Driven Development (TDD)

Agents can write code, run tests, and iterate automatically.

1. Ask the agent to write tests based on expected input/output. Be explicit about TDD to avoid mock implementations.
2. Instruct the agent to run tests and confirm they fail, without writing implementation code yet.
3. Commit tests when satisfied.
4. Ask the agent to write code that passes the tests, instructing it not to modify tests.
5. Iterate until all tests pass.
6. Commit the implementation.

- Tests provide clear targets for agents to iterate against.

---

## Codebase Understanding

Use agents for learning and exploration in new codebases.

- Ask questions like: "How does logging work?", "How do I add a new API endpoint?", "What edge cases does `CustomerOnboardingFlow` handle?", "Why are we calling `setUser()` instead of `createUser()` on line 1738?".
- Agents use `grep` and semantic search to find answers, accelerating onboarding.

### Git Workflows

Agents can search Git history, resolve merge conflicts, and automate Git workflows.

- **Example `/pr` command:**
  ```markdown
  Create a pull request for the current changes.
  1. Look at the staged and unstaged changes with `git diff`
  2. Write a clear commit message based on what changed
  3. Commit and push to the current branch
  4. Use `gh pr create` to open a pull request with title/description
  5. Return the PR URL when done
  ```
- Store commands as Markdown files in `.cursor/commands/` and check them into Git.
- Other examples: `/fix-issue [number]`, `/review`, `/update-deps`.
- Agents can use these commands autonomously for multi-step workflows.

### Reviewing Code

AI-generated code requires review.

- **During generation:** Watch the diff view and press `Escape` to interrupt and redirect if the agent goes off track.
- **Agent review:** After completion, click `Review → Find Issues` for a dedicated line-by-line analysis. For local changes, use the Source Control tab.
- **Bugbot for pull requests:** Automated reviews on PRs catch issues early and suggest improvements.

### Architecture Diagrams

### For significant changes, ask the agent to generate architecture diagrams (e.g., Mermaid diagrams) to visualize data flow and identify architectural issues.

## Running Agents in Parallel

Running multiple agents in parallel can significantly improve output quality for harder tasks.

### Native Worktree Support

- Cursor automatically creates and manages Git worktrees for parallel agents, isolating files and changes.
- Select the worktree option from the agent dropdown.
- When an agent finishes, click `Apply` to merge changes to your working branch.

### Run Multiple Models at Once

- Submit the same prompt to multiple models simultaneously and compare results side-by-side. Cursor can suggest the best solution.
- **Useful for:** Hard problems, comparing code quality across models, and finding edge cases.

---

## Delegating to Cloud Agents

Cloud agents are suitable for tasks that can be offloaded.

- **Use cases:** Bug fixes, refactors, generating tests, documentation updates.
- Switch between local and cloud agents as needed.
- Cloud agents run in remote sandboxes, allowing you to close your laptop and check results later.
- **Workflow:** Describe the task, agent clones repo, creates a branch, works autonomously, opens a PR, and notifies you upon completion.
- **Tip:** Trigger agents from Slack with `@Cursor`.

---

## Debug Mode for Tricky Bugs

Debug Mode provides a structured approach to complex bugs.

- **Instead of guessing, Debug Mode:**
  - Generates multiple hypotheses.
  - Instruments code with logging.
  - Asks you to reproduce the bug while collecting runtime data.
  - Analyzes actual behavior to pinpoint the root cause.
  - Makes targeted fixes based on evidence.
- **Best for:** Reproducible bugs, race conditions, timing issues, performance problems, memory leaks, and regressions.
- Provide detailed context on how to reproduce the issue for more effective instrumentation.

---

## Developing Your Workflow

Effective agent users share common traits:

- **Specific Prompts:** Write detailed instructions (e.g., "Write a test case for `auth.ts` covering the logout edge case, using the patterns in `__tests__/` and avoiding mocks.").
- **Iterate on Setup:** Start simple, add rules and commands only when patterns emerge or mistakes repeat.
- **Review Carefully:** AI-generated code needs thorough review. The faster the agent works, the more critical your review process becomes.
- **Provide Verifiable Goals:** Use typed languages, linters, and tests to give agents clear signals for correctness.
- **Treat Agents as Collaborators:** Ask for plans, request explanations, and push back on undesirable approaches.

