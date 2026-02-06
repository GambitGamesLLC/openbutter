# OpenButter Architecture Overview

## 1. System Architecture

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────────┐     ┌────────────┐
│  User   │────▶│   UI    │────▶│ Gateway │────▶│ Orchestrator│────▶│ Sub-agents │
└─────────┘     └─────────┘     └─────────┘     └─────────────┘     └────────────┘
                                       │                    │              │
                                       ▼                    ▼              ▼
                                 ┌─────────┐          ┌──────────┐   ┌──────────┐
                                 │ Channels│          │  Memory  │   │  Tools   │
                                 │(Discord,│          │  (Files) │   │  (Web,   │
                                 │ WhatsApp│          └──────────┘   │  Shell)  │
                                 │  etc.)  │                          └──────────┘
                                 └─────────┘
```

## 2. Data Flow

```
User Command
      │
      ▼
┌─────────────────────────────────────┐
│ UI Layer (Discord, WhatsApp, Web)   │───▶ Format/parse message
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ Gateway                             │───▶ Route to orchestrator
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ Orchestrator                        │───▶ Load context, plan task
│                                     │
│  ├─▶ Simple? Handle directly        │
│  └─▶ Complex? Spawn sub-agent       │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ Sub-agent Execution                 │───▶ Use tools, return result
└─────────────────────────────────────┘
      │
      ▼
Response Stream ◄─────────────────────┘
```

## 3. Core Modules

| Module | Description |
|--------|-------------|
| **Gateway** | Entry point that receives messages from all channels and routes to the orchestrator |
| **Orchestrator** | Main agent that plans tasks, manages context, and delegates to sub-agents |
| **Sub-agents** | Specialized agents spawned for specific tasks (research, code, file ops) |
| **Channels** | Platform integrations (Discord, WhatsApp, Slack, etc.) |
| **Memory** | File-based persistence for context, knowledge, and conversation history |
| **Tools** | Executable capabilities (web search, browser, shell, file operations) |
| **Provider** | LLM routing and management (OpenRouter, local models) |
