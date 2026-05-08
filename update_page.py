import re

with open('app/page.tsx', 'r') as f:
    content = f.read()

# 1. Add Typewriter logic
typewriter_logic = """
function useTypewriter(texts: string[]) {
  const [currentText, setCurrentText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const text = texts[currentIndex];

    if (isDeleting) {
      if (currentText.length > 0) {
        timer = setTimeout(() => {
          setCurrentText(text.substring(0, currentText.length - 1));
        }, 50); // fast delete
      } else {
        setIsDeleting(false);
        setCurrentIndex((prev) => (prev + 1) % texts.length);
      }
    } else {
      if (currentText.length < text.length) {
        timer = setTimeout(() => {
          setCurrentText(text.substring(0, currentText.length + 1));
        }, 100); // typing speed
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2000); // pause before deleting
      }
    }
    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentIndex, texts]);

  return currentText;
}

export default function TravelAgentPage() {"""
content = content.replace("export default function TravelAgentPage() {", typewriter_logic)

# 2. Inside the component, add animatedPlaceholder
animated_placeholder = """
  const animatedPlaceholder = useTypewriter(SUGGESTIONS);
"""
content = content.replace(
    "const hasMessages = messages.length > 0;",
    "const hasMessages = messages.length > 0;\n" + animated_placeholder
)

# 3. Replace the Main Content area
# Remove the old main and replace with new structure
old_main_regex = r"<main className=\"relative z-10 flex-1 flex flex-col items-center overflow-hidden\">.*?</main>"
new_main = """<main className="relative z-10 flex-1 flex flex-col items-center overflow-hidden">
        {hasMessages ? (
          <div className="w-full flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  {/* User message */}
                  {message.role === "user" && (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-indigo-500/20 border border-indigo-400/20 px-4 py-3">
                        <p className="text-white/90 text-sm leading-relaxed">
                          {message.parts
                            .filter((p) => p.type === "text")
                            .map((p) => (p as { type: "text"; text: string }).text)
                            .join("")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Assistant message */}
                  {message.role === "assistant" && (
                    <div className="space-y-3">
                      {message.parts.map((part, partIdx) => {
                        if (part.type === "text") {
                          const textPart = part as { type: "text"; text: string };
                          if (!textPart.text) return null;
                          return (
                            <div key={partIdx} className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs">✈</span>
                              </div>
                              <div className="flex-1 pt-0.5">
                                <Streamdown isAnimating={status === "streaming"}>
                                  {textPart.text}
                                </Streamdown>
                              </div>
                            </div>
                          );
                        }
                        if (part.type === "dynamic-tool") {
                          const toolPart = part as {
                            type: "dynamic-tool";
                            toolName: string;
                            toolCallId: string;
                            state: string;
                            input: unknown;
                            output?: unknown;
                          };
                          const { toolName, toolCallId, state, input: toolInput, output } = toolPart;
                          const mappedState = mapToolState(state);

                          if (toolName === "askFollowUpQuestions") {
                            if (state === "output-available" && output) {
                              const result = output as {
                                context: string;
                                questions: Array<{
                                  id: string;
                                  question: string;
                                  type: "text" | "date" | "number" | "select";
                                  placeholder?: string;
                                  options?: string[];
                                  required: boolean;
                                }>;
                              };
                              return (
                                <div key={partIdx}>
                                  <QuestionFlow
                                    context={result.context}
                                    questions={result.questions}
                                    onSubmit={(answers) =>
                                      handleQuestionSubmit(toolCallId, answers)
                                    }
                                    isSubmitted={submittedQuestions.has(toolCallId)}
                                  />
                                </div>
                              );
                            }
                            return (
                              <div key={partIdx}>
                                <ToolCallStatus
                                  toolName={toolName}
                                  state={mappedState}
                                  input={toolInput}
                                  output={output}
                                />
                              </div>
                            );
                          }

                          if (toolName === "calculateRoute") {
                            return (
                              <div key={partIdx} className="space-y-3">
                                <ToolCallStatus
                                  toolName={toolName}
                                  state={mappedState}
                                  input={toolInput}
                                  output={output}
                                />
                                {state === "output-available" &&
                                  !!output &&
                                  !(output as Record<string, unknown>).error && (
                                    <AnimatedMap
                                      {...(output as AnimatedMapProps)}
                                    />
                                  )}
                              </div>
                            );
                          }

                          if (toolName === "searchFlights") {
                            return (
                              <div key={partIdx} className="space-y-3">
                                <ToolCallStatus
                                  toolName={toolName}
                                  state={mappedState}
                                  input={toolInput}
                                  output={output}
                                />
                                {state === "output-available" && !!output && (
                                  <FlightResults
                                    data={output as Parameters<typeof FlightResults>[0]["data"]}
                                  />
                                )}
                              </div>
                            );
                          }

                          return (
                            <div key={partIdx}>
                              <ToolCallStatus
                                toolName={toolName}
                                state={mappedState}
                                input={toolInput}
                                output={output}
                              />
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-xs">✈</span>
                  </div>
                  <div className="pt-1">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : null}

        {/* Input area, aligned to center if empty, bottom if not */}
        <div 
          className={cn(
            "w-full px-4 transition-all duration-500 ease-in-out",
            hasMessages ? "pb-6 pt-2" : "flex-1 flex flex-col justify-center"
          )}
        >
          <div className="max-w-3xl mx-auto w-full space-y-8">
            {!hasMessages && (
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl text-white/90 font-medium">Hi Vaibhav</h1>
                <h2 className="text-4xl md:text-5xl text-white font-semibold">What can I help with?</h2>
              </div>
            )}
            
            <div className="space-y-3">
              <form onSubmit={onSubmit} className="relative">
                <Input
                  ref={textareaRef}
                  value={input}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setInput(e.target.value)
                  }
                  onSubmit={onSubmit}
                  placeholder={
                    hasMessages
                      ? "Ask a follow-up or refine your search..."
                      : (animatedPlaceholder + "|")
                  }
                  disabled={isLoading}
                  rows={1}
                  className={cn(
                    "pr-14 transition-all",
                    !hasMessages && "bg-[#252528] hover:bg-[#2A2A2D] border-none text-lg py-5 px-6 min-h-[64px]"
                  )}
                />
                {(input.trim() || isLoading) && (
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-3 bottom-3 md:bottom-3.5 md:right-3.5 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed bg-indigo-500 hover:bg-indigo-400 active:scale-95 shadow-lg shadow-indigo-500/20"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 16 16">
                        <path
                          d="M2 8h12M8 2l6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                )}
              </form>

              {/* Hint text */}
              {hasMessages && (
                <p className="text-center text-white/20 text-xs">
                  Press Enter to send · Shift+Enter for new line
                </p>
              )}
            </div>
          </div>
        </div>
      </main>"""

content = re.sub(old_main_regex, new_main, content, flags=re.DOTALL)

with open('app/page.tsx', 'w') as f:
    f.write(content)
