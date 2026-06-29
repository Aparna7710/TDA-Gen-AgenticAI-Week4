# Clarity Agent

**Week 4 — Agentic AI | AI Summer School**

Clarity Agent is an agentic AI web application built with HTML, CSS, and JavaScript using the Gemini 1.5 Flash API. Unlike a basic chatbot, it follows a multi-step workflow — planning, tool usage, and synthesis — before returning a final response.

---

## What it does

The agent takes a user query and runs it through a structured pipeline:

1. **Planner** — An LLM call that reasons about the query and decides which tools are needed
2. **Tool execution** — Runs web search and/or calculator depending on the plan
3. **Synthesizer** — A second LLM call that combines tool outputs into a coherent final answer

This is not a single prompt-to-response flow. Every query goes through at least two model calls and optional tool usage.

---

## Agent Workflow

```
User Query
    |
    v
Planner (Gemini)
    |
    |-- decides tools needed
    v
Tool 1: Web Search      Tool 2: Calculator
(research & facts)      (math expressions)
    |                        |
    v                        v
        Synthesizer (Gemini)
                |
                v
        Final Response
```

---

## Tools Used

**Web Search** — The agent queries Gemini to simulate a web search and retrieve factual, current information on a topic. Used for research questions, definitions, comparisons, and current events.

**Calculator** — Evaluates JavaScript math expressions for any numerical computation — ROI, compound interest, percentages, statistical calculations, and so on. The planner extracts the math expression from the query and passes it to the calculator tool.

---

## Memory Implementation

Session memory is maintained as a JavaScript array (`sessionMemory`) that stores every user query and agent response as an object. This array is passed back to Gemini on each subsequent call, giving the model full context of the conversation. Memory resets when the user clears the session or closes the tab.

---

## Tech Stack

- HTML, CSS, JavaScript (no frameworks)
- Gemini 1.5 Flash API
- Google Fonts (Fraunces, DM Sans)

---

## Project Structure

```
clarity-agent/
├── index.html          # Main UI
├── style.css           # Styling
├── agent.js            # Agent logic, tools, memory, API calls
├── config.js           # API key — gitignored, not uploaded
├── config.example.js   # Template for config.js
├── .gitignore
└── README.md
```

---

## Running Locally

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/clarity-agent.git
   cd clarity-agent
   ```

2. Copy `config.example.js` and rename it to `config.js`:
   ```
   cp config.example.js config.js
   ```

3. Open `config.js` and replace the placeholder with your Gemini API key:
   ```js
   window.GEMINI_API_KEY = "your-api-key-here";
   ```
   Get a free key at [aistudio.google.com](https://aistudio.google.com)

4. Open `index.html` in a browser. No server or build step required.

---

## Deploying to Vercel

This project has also been deployed to vercel on the link: https://tda-gen-agentic-ai-week4.vercel.app/

---

## Note on API Key

`config.js` is listed in `.gitignore` and will not be pushed to GitHub. Never paste your API key directly into `agent.js` or any other tracked file. On Vercel, the key is stored as an environment variable and injected at build time.
