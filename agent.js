const GEMINI_API_KEY = window.GEMINI_API_KEY;
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent";

const sessionMemory = [];

const PLANNER_PROMPT = `You are the planning module of an AI agent called Clarity Agent.
Given the user's query and conversation history, produce a JSON plan.

Your response MUST be valid JSON only — no markdown, no explanation.

Decide which tools are needed from: ["web_search", "calculator", "none"]

Return this exact shape:
{
  "reasoning": "brief explanation of what the user needs",
  "steps": ["step 1 description", "step 2 description", ...],
  "tools": ["web_search", "calculator"],
  "search_query": "query to search if web_search is needed, else null",
  "math_expression": "JS-evaluable math expression if calculator is needed, else null"
}

Rules:
- Use web_search for factual questions, current events, research, comparisons, definitions
- Use calculator for any math: percentages, ROI, compound interest, conversions, statistics
- Use both if the query needs research AND calculation
- steps should be 2-4 items describing what the agent will do
- math_expression must be a valid JS expression (e.g. "50000 * Math.pow(1.12, 3)")`;

const RESPONDER_PROMPT = `You are Clarity Agent — a smart, direct AI research assistant.

You have completed a multi-step agentic workflow. Synthesize the gathered information into a clear, useful final response.

Guidelines:
- Be direct and informative
- Use proper structure: use ### for section headings, ** for bold key terms, - for bullet points
- Write in paragraphs where appropriate, use bullet points for lists of items
- If calculations were done, present the numbers clearly
- Do not mention the tools or workflow steps explicitly — just give the answer naturally
- Do not start with filler phrases like "Certainly!" or "Great question!"
- CRITICAL: Always write a proper conclusion or summary at the end. Never stop mid-section or mid-thought. Budget your words so you always finish completely. If a topic is broad, cover fewer sections but finish each one properly. An incomplete response is worse than a shorter complete one.`;

function getHeaders() {
  return { "Content-Type": "application/json" };
}

async function callGemini(systemPrompt, userMessage, includeHistory = false) {
  const contents = [];

  if (includeHistory && sessionMemory.length > 0) {
    for (const msg of sessionMemory) {
      contents.push({ role: "user", parts: [{ text: msg.user }] });
      contents.push({ role: "model", parts: [{ text: msg.assistant }] });
    }
  }

  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192 }
  };

  const res = await fetch(`${GEMINI_BASE}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Gemini API error");
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function planTask(query) {
  const historyStr = sessionMemory.length > 0
    ? "Previous conversation:\n" + sessionMemory.map(m => `User: ${m.user}\nAgent: ${m.assistant}`).join("\n\n") + "\n\n"
    : "";

  const text = await callGemini(PLANNER_PROMPT, historyStr + "User query: " + query);
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

async function toolWebSearch(query) {
  const searchPrompt = `You are a web search simulation tool. The user wants to search for: "${query}"

Provide a realistic, accurate, factual summary of what would be found when searching for this topic. Include specific facts, statistics, recent developments, and key points. Be thorough and factual. This is used as research input for an AI agent.`;

  return await callGemini(searchPrompt, `Search: ${query}`);
}

function toolCalculator(expression) {
  try {
    const safeExpr = expression.replace(/[^0-9+\-*/().,\s%MathPIEpowsqrtlogroundfloorabs]/g, "");
    const result = Function('"use strict"; return (' + safeExpr + ')')();
    if (typeof result !== "number" || !isFinite(result)) throw new Error("Invalid result");
    return { expression, result: Math.round(result * 10000) / 10000 };
  } catch {
    return { expression, result: null, error: "Could not evaluate expression" };
  }
}

async function synthesizeResponse(query, plan, searchResult, calcResult) {
  let context = `User query: ${query}\n\nAgent reasoning: ${plan.reasoning}\n\n`;

  if (searchResult) {
    context += `Web search results for "${plan.search_query}":\n${searchResult}\n\n`;
  }

  if (calcResult && calcResult.result !== null) {
    context += `Calculator result: ${calcResult.expression} = ${calcResult.result}\n\n`;
  }

  const historyContext = sessionMemory.length > 0
    ? "Conversation history:\n" + sessionMemory.map(m => `User: ${m.user}\nAgent: ${m.assistant}`).join("\n\n") + "\n\n"
    : "";

  return await callGemini(RESPONDER_PROMPT, historyContext + context, false);
}

function scrollChat() {
  const panel = document.getElementById("chatPanel");
  panel.scrollTop = panel.scrollHeight;
}

function addUserMessage(text) {
  const el = document.getElementById("emptyState");
  if (el) el.remove();

  const div = document.createElement("div");
  div.className = "msg-user";
  div.textContent = text;
  document.getElementById("messages").appendChild(div);
  scrollChat();
}

function showLoading() {
  const div = document.createElement("div");
  div.className = "loading-indicator";
  div.id = "loadingBlock";
  div.innerHTML = `<div class="spinner"></div><span>generating your response...</span>`;
  document.getElementById("messages").appendChild(div);
  scrollChat();
}

function removeLoading() {
  const el = document.getElementById("loadingBlock");
  if (el) el.remove();
}

function formatAnswer(text) {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  const lines = html.split('\n');
  const result = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) { result.push('<ul>'); inList = true; }
      result.push(`<li>${trimmed.slice(2)}</li>`);
    } else {
      if (inList) { result.push('</ul>'); inList = false; }
      if (trimmed === '') {
        result.push('');
      } else if (trimmed.startsWith('<h')) {
        result.push(trimmed);
      } else {
        result.push(`<p>${trimmed}</p>`);
      }
    }
  }

  if (inList) result.push('</ul>');
  return result.filter((l, i, arr) => !(l === '' && arr[i-1] === '')).join('\n');
}

function addAgentResponse(plan, searchResult, calcResult, finalAnswer) {
  const wrapper = document.createElement("div");
  wrapper.className = "msg-agent-wrapper";

  const label = document.createElement("div");
  label.className = "agent-label";
  label.textContent = "clarity agent";
  wrapper.appendChild(label);

  const trace = document.createElement("div");
  trace.className = "trace-block";

  const traceHeader = document.createElement("div");
  traceHeader.className = "trace-header";
  traceHeader.innerHTML = `<span>agent reasoning</span><span class="trace-toggle">show</span>`;

  const traceContent = document.createElement("div");
  traceContent.className = "trace-content";
  traceContent.style.display = "none";

  traceHeader.onclick = () => {
    const isHidden = traceContent.style.display === "none";
    traceContent.style.display = isHidden ? "block" : "none";
    traceHeader.querySelector(".trace-toggle").textContent = isHidden ? "hide" : "show";
  };

  const reasoningEl = document.createElement("div");
  reasoningEl.className = "trace-reasoning";
  reasoningEl.textContent = plan.reasoning;
  traceContent.appendChild(reasoningEl);

  plan.steps.forEach(step => {
    const s = document.createElement("div");
    s.className = "trace-step";
    s.innerHTML = `<div class="step-dot"></div><span>${step}</span>`;
    traceContent.appendChild(s);
  });

  trace.appendChild(traceHeader);
  trace.appendChild(traceContent);
  wrapper.appendChild(trace);

  if (searchResult) {
    const toolEl = document.createElement("div");
    toolEl.className = "tool-block";
    toolEl.innerHTML = `
      <div class="tool-header">web search — ${plan.search_query}</div>
      <div class="tool-result">${searchResult.substring(0, 350)}${searchResult.length > 350 ? "..." : ""}</div>
    `;
    wrapper.appendChild(toolEl);
  }

  if (calcResult && calcResult.result !== null) {
    const calcEl = document.createElement("div");
    calcEl.className = "tool-block";
    calcEl.innerHTML = `
      <div class="tool-header">calculator</div>
      <div class="tool-result"><code>${calcResult.expression} = ${calcResult.result}</code></div>
    `;
    wrapper.appendChild(calcEl);
  }

  const answer = document.createElement("div");
  answer.className = "msg-answer";
  answer.innerHTML = formatAnswer(finalAnswer);
  wrapper.appendChild(answer);

  document.getElementById("messages").appendChild(wrapper);
  scrollChat();
}

function addErrorMessage(msg) {
  const div = document.createElement("div");
  div.className = "msg-error";
  div.textContent = msg;
  document.getElementById("messages").appendChild(div);
  scrollChat();
}

function updateMemoryBadge() {
  const badge = document.getElementById("memoryBadge");
  badge.textContent = `${sessionMemory.length} ${sessionMemory.length === 1 ? "memory" : "memories"}`;
}

async function runAgent() {
  const input = document.getElementById("userInput");
  const query = input.value.trim();
  if (!query) return;

  const sendBtn = document.getElementById("sendBtn");
  sendBtn.disabled = true;
  input.value = "";
  input.style.height = "auto";

  addUserMessage(query);
  showLoading();

  try {
    const plan = await planTask(query);

    let searchResult = null;
    let calcResult = null;

    if (plan.tools.includes("web_search") && plan.search_query) {
      searchResult = await toolWebSearch(plan.search_query);
    }

    if (plan.tools.includes("calculator") && plan.math_expression) {
      calcResult = toolCalculator(plan.math_expression);
    }

    const finalAnswer = await synthesizeResponse(query, plan, searchResult, calcResult);

    removeLoading();
    addAgentResponse(plan, searchResult, calcResult, finalAnswer);

    sessionMemory.push({ user: query, assistant: finalAnswer });
    updateMemoryBadge();

  } catch (err) {
    removeLoading();
    addErrorMessage(err.message || "Something went wrong. Check your API key.");
  }

  sendBtn.disabled = false;
  input.focus();
}

function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    runAgent();
  }

  const ta = document.getElementById("userInput");
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
}

function useExample(btn) {
  const input = document.getElementById("userInput");
  input.value = btn.textContent;
  input.focus();
}

function getEmptyStateHTML() {
  return `
    <div class="empty-state" id="emptyState">
      <p>Ask anything. The agent will figure out the rest.</p>
      <div class="example-chips">
        <button class="chip" onclick="useExample(this)">Explain statistics of unemployment</button>
        <button class="chip" onclick="useExample(this)">Explain scope of AI/ML for future careers</button>
        <button class="chip" onclick="useExample(this)">Explain possible recession indicators</button>
      </div>
    </div>
    <div id="messages"></div>
  `;
}

document.getElementById("clearBtn").onclick = () => {
  sessionMemory.length = 0;
  document.getElementById("chatPanel").innerHTML = getEmptyStateHTML();
  updateMemoryBadge();
};
