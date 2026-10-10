import os
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="QUN AI API", version="0.1.0")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

SYSTEM_PROMPT = """Ты — QUN AI, помощник экосистемы QUN. Отвечай по-русски, ясно и честно.
Не утверждай, что транзакция выполнена, если ты не проверил её в блокчейне.
Не проси seed-фразы, приватные ключи, пароли или секретные recovery-коды.
Не обещай доходность токенов и не представляй тестовые активы как деньги."""

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    mode: Literal["general", "marketplace", "developer"] = "general"

class ChatResponse(BaseModel):
    model: str
    response: str

@app.get("/health")
def health():
    return {"service": "qun-ai", "version": "0.1.0", "configured_model": OLLAMA_MODEL}

@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    mode_hint = {
        "general": "Помогай пользователю в рамках экосистемы QUN.",
        "marketplace": "Помогай создавать честные и информативные карточки товаров и услуг.",
        "developer": "Помогай разработчику; отмечай предположения и риски безопасности."
    }[body.mode]
    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT + "\n" + mode_hint},
            {"role": "user", "content": body.message}
        ],
        "options": {"temperature": 0.3}
    }
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            result = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload)
            result.raise_for_status()
            data = result.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"LLM backend unavailable: {type(exc).__name__}") from exc
    return ChatResponse(model=OLLAMA_MODEL, response=data.get("message", {}).get("content", ""))
