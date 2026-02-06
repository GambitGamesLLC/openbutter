# 🧈 OpenButter

> *The only thing better than one AI agent is a whole team of them — and a big pat of butter to smooth things out.*

OpenButter is the friendly face for your [OpenClaw](https://openclaw.ai/) AI orchestrators. No terminals. No cryptic commands. Just you, your AI team, and a big text box where you tell them what to do.

## What Is This?

Imagine ChatGPT, but instead of talking to a single AI, you're talking to **your** AI team — Chip, Cookie, and any other orchestrators you've set up. They handle the heavy lifting (spawning sub-agents, managing tasks, tracking costs). You just tell them what you want.

It's like having a really smart, really fast team that never sleeps — and OpenButter is the lobby where you check in.

## Why "Butter"?

Because:
1. Lobsters go with butter 🦞🧈
2. Butter makes everything better
3. It's silly and memorable
4. You try finding a good, available name in 2026

Plus, "OpenButter" sounds like it should be a real thing, right? Well, now it is.

> ⚠️ **Note:** You need a local web server to run OpenButter (ES modules + CORS). See Quick Start below for easy options.

## Quick Start

**Important:** ES modules require a local server (CORS restrictions). Pick one:

**Option 1: NPM (if you have Node.js)**
```bash
git clone https://github.com/derrickbarra/openbutter.git
cd openbutter
npm install
npm run dev        # Opens on http://localhost:3000
```

**Option 2: Python**
```bash
cd openbutter
python3 -m http.server 8080
# Open http://localhost:8080
```

**Option 3: VS Code**
Install the "Live Server" extension, right-click `index.html` → "Open with Live Server"

**Then:**
1. Make sure your OpenClaw Gateway is running
2. Open the URL in your browser
3. **Disable browser security/ad blockers** for localhost (see Troubleshooting)
4. Start chatting with your orchestrators!

## Troubleshooting

### Connection Issues

**"Connection failed" or WebSocket errors:**

1. **Check browser security settings** — Ad blockers and privacy shields (Brave Shields, uBlock, etc.) often block WebSocket connections to localhost:
   - **Brave**: Click the lion icon → Disable "Shields" for localhost
   - **Firefox/Chrome**: Disable ad blockers for `http://localhost:8080`
   
2. **Verify Gateway is running:**
   ```bash
   openclaw gateway status
   # or
   openclaw gateway start
   ```

3. **Check port 18789 is not blocked:**
   ```bash
   curl http://localhost:18789
   # Should return Gateway info
   ```

### Still Stuck?

- Check the [OpenClaw Troubleshooting Guide](https://docs.openclaw.ai/troubleshooting)
- File an issue with your browser and any error messages

## Features

- 🎯 **Simple Chat Interface** — Like every chat app you already know
- 👥 **Orchestrator Sidebar** — See your AI team at a glance
- 📝 **Truth Management** — Define what your agents should work toward
- 💰 **Cost Tracking** — Watch your token spend (so you don't cry later)
- 🎨 **Light & Dark Themes** — Because we care about your eyes

## Philosophy

- **Zero build steps** — It's just HTML, JS, and CSS
- **OpenClaw-native** — Built on OpenClaw standards, not generic APIs
- **Human-first** — You talk to orchestrators, they handle the rest
- **Silly but serious** — Fun name, solid engineering

## Tech Stack

- **Vanilla JS** — No frameworks, no build tools, no nonsense
- **Web Components** — Modern, encapsulated, reusable
- **JSDoc** — Type hints without TypeScript overhead
- **TDD** — Tests first, code second, bugs never

## Development

```bash
git clone https://github.com/derrickbarra/openbutter.git
cd openbutter
# Open index.html in your browser
# Or run a local server:
python3 -m http.server 8080
```

## Contributing

This is early days. If you want to spread some Butter, PRs welcome!

## License

MIT — Spread it on everything.

---

*Made with 🧈 by humans and their AI friends.*
