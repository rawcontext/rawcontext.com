+++
title = "Engram"
description = "Persistent memory for AI agents. Give your agents the ability to learn, remember, and build on past work."
weight = 2

[extra]
status = "coming-soon"
github_url = "https://github.com/rawcontext/engram"
short_description = "Persistent memory for AI agents. Give your agents the ability to learn, remember, and build on past work."
+++

Engram is a persistent memory system for AI coding agents that transforms how you work with tools like Claude Code, Codex CLI, and other LLM-powered development assistants. Instead of starting every session from scratch, your agent remembers past decisions, learns from previous interactions, and builds institutional knowledge over time.

## The Problem With Stateless AI Agents

Every time you start a new session with an AI coding assistant, you're working with a blank slate. The agent has no memory of your codebase conventions, no recollection of architectural decisions you've discussed, no awareness of debugging insights from previous sessions.

This means constant repetition. You explain the same context over and over. You re-establish preferences that should be obvious. You watch your agent make suggestions you've already rejected in past conversations.

Engram eliminates this friction by giving your AI agent persistent, searchable memory that grows smarter with every interaction.

## Stop Repeating Yourself

Without persistent memory, you waste time re-explaining context at the start of every session. Why does your project use this architecture? What naming conventions do you follow? Why did you choose one approach over another?

Engram remembers all of this. Your agent recalls previous conversations, understands established patterns, and applies lessons learned from past work. The more you use it, the less you need to explain.

## Institutional Knowledge That Compounds

Every decision you make, every preference you establish, every insight you discover—Engram captures it all. This knowledge compounds over time, creating an ever-growing understanding of your codebase, your team's conventions, and your project's unique requirements.

New team members can query the accumulated knowledge. Complex decisions are documented automatically. Debugging discoveries are preserved and applied to future problems. Your AI assistant becomes genuinely smarter the longer you work together.

## Semantic Search Across All Memories

Finding relevant context shouldn't require remembering exact phrases. Engram uses vector embeddings and semantic search to surface relevant memories based on meaning, not just keywords.

Ask "why do we use this pattern?" and Engram retrieves related architectural decisions, past discussions, and documented rationale—even if you never used those exact words before.

## Time-Travel Queries

Software evolves, and so do decisions. What made sense six months ago might not apply today. But understanding why past decisions were made—in their original context—is invaluable.

Engram maintains complete bitemporal history, tracking both when information was recorded and when it was relevant. Query what your agent knew at any point in time. Understand the context behind legacy decisions. See how your codebase's understanding has evolved.

## Memory Types

Engram organizes memories into distinct categories, making retrieval more precise and context more relevant:

### Decisions
Architectural choices, technology selections, and design patterns—along with the reasoning behind them. When your agent suggests an approach, it's informed by decisions you've already made.

### Preferences
Your coding conventions, style choices, and established patterns. Tabs vs spaces, naming conventions, file organization—Engram remembers so you don't have to repeat yourself.

### Insights
Hard-won learnings from debugging sessions, performance investigations, and problem-solving. When similar issues arise, your agent recalls what worked before.

### Facts
Objective information about your codebase: API endpoints, configuration details, dependency relationships, and documented behaviors. Your agent maintains an accurate mental model of your project.

## Claude Code Plugin

The [Engram plugin for Claude Code](https://github.com/rawcontext/engram-claude-plugin) brings persistent memory directly into your development workflow. Install once and your Claude Code sessions automatically benefit from accumulated knowledge.

### Quick Start

```bash
/plugin marketplace add rawcontext/engram-claude-plugin
/plugin install engram@rawcontext-engram
```

### Commands

| Command | What it does |
|---------|--------------|
| `/engram:prime [task]` | Load relevant context before starting work |
| `/engram:recall <query>` | Search your agent's memory semantically |
| `/engram:remember <content>` | Save something important for later |
| `/engram:why <topic>` | Understand the reasoning behind past decisions |

### Priming Sessions

Start each session with `/engram:prime` followed by a description of what you're working on. Engram loads relevant memories—past decisions about this area of code, related debugging insights, applicable preferences—giving your agent full context before you begin.

No more lengthy explanations. No more re-establishing context. Just productive work from the first message.

## Works Across Your Entire Toolchain

Engram isn't locked to a single tool. Memory persists across Claude Code, Codex CLI, Cline, and 8+ other LLM providers and coding assistants. Switch tools without losing context. Your institutional knowledge travels with you.

## Perfect For

### Solo Developers
Build a personal knowledge base that makes your AI assistant increasingly effective over time. Every debugging session, every architectural decision, every preference—captured and reused.

### Development Teams
Share institutional knowledge across the team. New developers can query why decisions were made. Established patterns are documented automatically. Onboarding becomes dramatically faster.

### Complex Codebases
Large projects accumulate nuanced decisions that are difficult to document manually. Engram captures this context organically through normal conversations, making it searchable and actionable.

### Long-Running Projects
Software projects span months or years. Decisions made early need context to understand later. Engram's temporal history preserves not just what was decided, but when and why.

### AI-Augmented Workflows
If you're using AI coding assistants daily, Engram multiplies their effectiveness. Less time explaining context means more time building. Better memory means better suggestions.

## Key Capabilities

- **Persistent memory** — Context survives across sessions and conversations
- **Semantic search** — Find relevant memories by meaning, not just keywords
- **Bitemporal history** — Query what was known at any point in time
- **Memory categorization** — Decisions, preferences, insights, and facts organized separately
- **Cross-tool compatibility** — Works with Claude Code, Codex CLI, and more
- **Team knowledge sharing** — Institutional memory accessible to everyone
- **Automatic enrichment** — Memories are summarized and tagged for better retrieval
