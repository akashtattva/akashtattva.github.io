---
title: "Frameworks"
pubDate: 2025-12-21
---
# Frameworks and Toolkits

The explosive interest in RAG and agents has led to many open-source tools and frameworks:

- Vector Databases and Search: Core to RAG, systems like Pinecone, Weaviate, Milvus or FAISS provide the backend for storing embeddings and quickly retrieving relevant data. Many tutorials (e.g. Pinecone’s RAG guide) show how to build pipelines using these services.
- RAG Libraries: Projects like Haystack (by deepset), LlamaIndex (formerly GPT Index) and LangChain offer components to ingest documents, perform embeddings, and assemble prompts. For example, LlamaIndex bills itself as a “framework for building agentic generative AI applications” with state-of-the-art RAG and plugin APIs. These let developers plug an LLM into documents stored in PDFs, databases, code, etc.
- Agent Frameworks: Several frameworks focus on orchestrating agents. LangChain is widely used for defining tool-using agents and has additions like LangGraph for stateful agent flows. Microsoft’s AutoGen is a conversation framework for multi-agent, event-driven interactions (with thousands of stars on GitHub). OpenAI and Google have now released SDKs: OpenAI Agents SDK (Mar 2025) supports multi-agent workflows with tracing, and Google Agent Dev Kit (ADK) (Apr 2025) provides an end-to-end multi-agent framework that integrates models (Gemini, Anthropic, etc.) and tools like search and code execution. Other notable projects include CrewAI (role-based agents, 2024) and LangGraph (a LangChain add-on).
- LLM-Specific Tools: Many language model providers offer tool interfaces. OpenAI’s function calling lets a GPT model trigger APIs like a calculator or a custom service. Anthropic’s Constitutional AI paper and blogs describe an agentic pattern of having multiple model calls for evaluation. Companies also offer prebuilt toolkits, e.g. AWS’s Kendra for enterprise search or SageMaker JumpStart for RAG pipelines.
- IDE & Development Plugins: For coding specifically, tools like GitHub Copilot or AWS CodeWhisperer embed LLMs into IDEs. These are not full agents but can be combined with prompts to query documentation. Some open-source projects (e.g. GPT-Code-Review) wrap LLMs as bots for code review.

Each of these tools provides building blocks for RAG and agents. For instance, in a single agent application you might use LangChain to define steps, Pinecone for retrieval, and an LLM API for text generation. The ecosystem is rapidly maturing with well-documented libraries and tutorials from labs and companies (e.g. Google, OpenAI, Anthropic) on how to construct such systems.

# Practical Applications

### Software Development and Coding

AI agents with RAG are already reshaping software engineering. The most visible examples are AI pair programmers like GitHub Copilot, which suggest code completions in real-time. Under the hood, these systems can be seen as lightweight agents: they generate code based on the developer’s context and may query documentation or the codebase (RAG) to make suggestions. More advanced coding agents are emerging:

- Repo-Level Code Generation: Projects like CodeAgent or frameworks like GitHub’s upcoming “Copilot Chat” mode allow LLMs to browse entire repositories. These agents can automatically read existing code, search for related functions, and write new code snippets or full functions, effectively automating parts of development tasks.
- Bug Detection and Debugging: LLMs are surprisingly good at finding errors. Agents can accept a stack trace or failing test, use RAG to find similar bug fixes or docs, and iteratively propose patches. For example, an agent might retrieve relevant documentation on a programming language feature and then rewrite a buggy loop to fix a “divide by zero” error.
- Automated Refactoring and Testing: Agents can help refactor code or write tests. By planning across multiple files, an agent can insert logging statements, rename variables consistently, or generate unit tests for given functions. RAG can assist by pulling in style guidelines or code examples from large code corpora.
- DevOps Automation: Agents can automate deployment scripts, infrastructure-as-code, or system administration tasks. For instance, given a server configuration prompt, an agent could retrieve the latest configuration from company docs and then generate the corresponding Terraform or Kubernetes code.

### Beyond Coding

The RAG+agent paradigm also shines in other domains:

- Customer Support: AI agents can handle support tickets by searching a company’s knowledge base (RAG) for relevant articles, then summarizing answers or creating troubleshooting steps. Multi-turn dialogs can be handled by having the agent ask clarifying questions or escalate to humans as needed.
- Research and Data Analysis: Agents like AlphaEvolve are designed to explore scientific or mathematical problems. An agent could retrieve recent papers or datasets and propose new hypotheses or algorithms. For general research, an agent might be tasked with writing a literature review: it could search academic databases, read abstracts, and compile a summary.
- Content Creation and Writing: A creative agent could plan and generate multi-part content. For example, to write a blog series, the agent could retrieve reference materials, outline sections, generate drafts, and iteratively refine them while checking facts via RAG.
- Conversational AI: Chatbots become more knowledgeable when agentic. For example, a virtual travel assistant could book hotels by interacting with booking APIs, use RAG to fetch flight information, and maintain a dialogue with the user over multiple messages (memo and context management).
- Automation Workflows: Agents can automate spreadsheet or email tasks. An agent might retrieve a list of customer names from a database and then generate personalized emails, executing each send via an email API (agent calling a tool).

In the coding realm specifically, Google’s DeepMind team demonstrated that LLM agents can tackle math and algorithm design (AlphaEvolve), and industry tools are emerging that let developers query codebases in natural language. Each success story underscores the value of blending retrieval (for facts, docs, or existing code) with generative planning.