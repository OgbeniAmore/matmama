import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, MessageCircle, Send, X, Sparkles } from "lucide-react";
import thelmaAvatar from "@/assets/thelma-avatar.jpeg";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getPageContext, getSuggestionsForRole } from "./chatbotContext";

type Msg = { role: "user" | "assistant"; content: string };

const LANGUAGES = [
  { value: "auto", label: "🌐 Auto-detect" },
  { value: "English", label: "🇬🇧 English" },
  { value: "Yoruba", label: "🇳🇬 Yoruba" },
  { value: "Hausa", label: "🇳🇬 Hausa" },
  { value: "Igbo", label: "🇳🇬 Igbo" },
  { value: "French", label: "🇫🇷 French" },
  { value: "Pidgin English", label: "🗣️ Pidgin" },
];

const ROLE_LABELS: Record<string, string> = {
  system_admin: "System Admin",
  program_manager: "Program Manager",
  facility_officer: "Facility Officer",
  data_entry_officer: "Data Entry Officer",
};

const ROLE_GREETINGS: Record<string, string> = {
  system_admin: "Ask me about managing facilities, teams, audit logs, or platform-wide settings.",
  program_manager: "Ask me about transfers, defaulters, team coordination, or analytics.",
  facility_officer: "Ask me how to register clients, send reminders, or handle transfers.",
  data_entry_officer: "Ask me how to register clients or record visits accurately.",
};

export function ChatbotWidget() {
  const { role, profile } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState("auto");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userName = profile?.first_name || undefined;
  const roleLabel = role ? ROLE_LABELS[role] : "Guest";
  const greeting = role ? ROLE_GREETINGS[role] : "Ask me anything about Matmama.";
  const pageContext = useMemo(() => getPageContext(location.pathname), [location.pathname]);
  const suggestions = useMemo(() => getSuggestionsForRole(role), [role]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;
    if (!overrideText) setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: next,
          role,
          language,
          userName,
          pageContext,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errBody = await resp.json().catch(() => ({}));
        const msg =
          resp.status === 429
            ? "Too many requests. Please wait a moment."
            : resp.status === 402
            ? "AI credits exhausted. Please top up in workspace settings."
            : errBody.error || "Could not reach the assistant.";
        toast({ title: "Assistant unavailable", description: msg, variant: "destructive" });
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (err) {
      console.error("chat error:", err);
      toast({
        title: "Connection error",
        description: "Could not reach the assistant.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating bubble */}
      <Button
        onClick={() => setOpen((v) => !v)}
        size="icon"
        className={cn(
          "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90"
        )}
        aria-label={open ? "Close assistant" : "Open assistant"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed z-50 flex flex-col bg-background border shadow-2xl",
            "bottom-36 right-4 md:bottom-24 md:right-6",
            "w-[calc(100vw-2rem)] sm:w-96 h-[28rem] max-h-[calc(100vh-10rem)] rounded-lg overflow-hidden"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b px-3 py-2 bg-muted/40">
            <img
              src={thelmaAvatar}
              alt="Thelma"
              className="h-8 w-8 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Thelma — Your Assistant</p>
              <p className="text-xs text-muted-foreground truncate">Helping {roleLabel}s</p>
            </div>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value} className="text-xs">
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1">
            <div ref={scrollRef} className="p-3 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="font-medium mb-1">
                      👋 Hi{userName ? ` ${userName}` : ""}!
                    </p>
                    <p className="text-muted-foreground text-xs mb-1">{greeting}</p>
                    <p className="text-muted-foreground text-[11px]">
                      📍 You're on <span className="font-medium text-foreground">{pageContext.name}</span>
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      <Sparkles className="h-3 w-3" /> Try asking
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => send(s.prompt)}
                          disabled={isLoading}
                          className="rounded-full border bg-background hover:bg-accent hover:text-accent-foreground px-3 py-1 text-xs transition-colors disabled:opacity-50"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
                        <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t p-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Thelma anything about Matmama…"
              disabled={isLoading}
              className="text-sm"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
