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

Since this is a static HTML/CSS/JS project with no build step, Vercel deploys it as-is. The only thing to handle is the API key — `config.js` is gitignored so it won't be on GitHub, which means you need to inject the key differently on Vercel.

**Step 1 — Add a vercel.json file**

Create a file called `vercel.json` in the root of your project with this content:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This tells Vercel to serve your static files correctly.

**Step 2 — Update config.js handling for production**

Since `config.js` won't exist on Vercel, update the top of `agent.js` to fall back gracefully:

```js
const GEMINI_API_KEY = window.GEMINI_API_KEY || "";
```

Then create a file called `config.js` locally (already gitignored) for local dev, and on Vercel you will set the key as an environment variable — but since this is a frontend-only app with no server, the cleanest approach is to generate `config.js` at build time using a Vercel build command.

**Step 3 — Add a build script**

In `vercel.json`, update it to:

```json
{
  "buildCommand": "echo \"window.GEMINI_API_KEY='$GEMINI_API_KEY';\" > config.js",
  "outputDirectory": ".",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This tells Vercel to generate `config.js` from the environment variable before deploying.

**Step 4 — Deploy on Vercel**

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click **Add New Project**
3. Import your `clarity-agent` repository
4. Before clicking deploy, go to **Environment Variables** and add:
   - Key: `GEMINI_API_KEY`
   - Value: your actual Gemini API key
5. Click **Deploy**

Vercel will run the build command, generate `config.js` with your key baked in, and serve the site. Your key never appears in your GitHub repo.

**After deployment**, every push to your `main` branch will automatically redeploy.

---

## Note on API Key

`config.js` is listed in `.gitignore` and will not be pushed to GitHub. Never paste your API key directly into `agent.js` or any other tracked file. On Vercel, the key is stored as an environment variable and injected at build time.
