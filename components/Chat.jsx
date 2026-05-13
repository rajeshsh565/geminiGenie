import { generateTitle } from "@/utils/ai_action";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { FaRobot, FaUser, FaCircleInfo } from "react-icons/fa6";
import MarkdownViewer from "./MarkdownViewer";
import { useRouter } from "next/navigation";
import {
  createChat,
  createMessage,
  getMessageHistory,
  setChatTitle,
} from "@/utils/db_action";
import toast from "react-hot-toast";
import { useChatContext } from "@/app/providers";
import { useAuth } from "@clerk/nextjs";

const MODELS = [
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
];

const Chat = ({ chatId }) => {
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingLevel, setThinkingLevel] = useState("low");
  const [selectedModel, setSelectedModel] = useState(MODELS[2].id); // Default to Flash
  const messagesInitialized = useRef(false);
  const newMsgRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isUserScrolledUp = useRef(false);
  const marqueeTextRef = useRef(null);
  const marqueeContainerRef = useRef(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [marqueeEnd, setMarqueeEnd] = useState("0px");
  
  const queryClient = useQueryClient();

  const getModelName = (id) => MODELS.find(m => m.id === id)?.name || id;

  useEffect(() => {
    if (marqueeTextRef.current && marqueeContainerRef.current) {
       const textWidth = marqueeTextRef.current.offsetWidth;
       const containerWidth = marqueeContainerRef.current.offsetWidth;
       
       if (textWidth > containerWidth) {
         setShouldAnimate(true);
         // Calculate the exact translation needed to just show the end
         // We want to translate by -(textWidth - containerWidth)
         // Adding a small buffer (e.g. 20px) to ensure full visibility if needed, or exact.
         // User said "stop when last character is on screen".
         // So exactly -(textWidth - containerWidth).
         const offset = textWidth - containerWidth;
         setMarqueeEnd(`-${offset}px`);
       } else {
         setShouldAnimate(false);
         setMarqueeEnd("0px");
       }
    }
  }, [selectedModel]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Check if user is near the bottom (within 50px)
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    isUserScrolledUp.current = !isAtBottom;
  };

  const router = useRouter();
  const isNavigating = useRef(false);
  const isUpdatingTitle = useRef(false);
  const { userId } = useAuth();
  const { chats } = useChatContext();
  const current_chat = chats?.find((chat) => chat?._id === chatId);
  const prevMsgLen = useRef(0); // Initialize with 0

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      const { success, error, data: messages } = await getMessageHistory(chatId);
      if (!success) {
        toast.error(error || "Something went wrong! Please try again later.");
        router.push("/dashboard/chat");
        return [];
      } else {
        return messages;
      }
    },
    initialData: undefined,
    refetchOnMount: true,
    enabled: !!chatId,
  });

  const processStream = async (query, history) => {
    if (isStreaming) return;
    setIsStreaming(true);
    
    try {
      // Add placeholder message
      const placeholderMsg = {
        message: { role: "model", parts: [{ text: "" }] },
        model: selectedModel,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(["messages", chatId], (oldData) => {
        return [...(oldData || []), placeholderMsg];
      });

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, messages: history, thinkingLevel, model: selectedModel }),
      });

      if (!response.ok) throw new Error(response.statusText);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let metadataFound = false;
      let usageData = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Check for metadata delimiter in the whole stream so far if not found yet
        const fullContent = accumulatedText + chunk;
        if (fullContent.includes("__METADATA__")) {
          metadataFound = true;
          const [text, metaJSON] = fullContent.split("__METADATA__");
          accumulatedText = text;
          
          try {
            if (metaJSON) {
              usageData = JSON.parse(metaJSON);
            }
          } catch (e) {
            // Metadata might be partial, wait for next chunk
          }
        } else {
          accumulatedText += chunk;
        }

        queryClient.setQueryData(["messages", chatId], (oldData) => {
            if (!oldData) return [placeholderMsg];
            const newData = [...oldData];
            const lastIndex = newData.length - 1;
            newData[lastIndex] = { 
                ...newData[lastIndex],
                message: {
                    ...newData[lastIndex].message,
                    parts: [{ text: accumulatedText }]
                },
                usageMetadata: usageData || newData[lastIndex].usageMetadata
            };
            return newData;
        });
      }

      // Save the final message to DB
      await createMessage(chatId, { 
        role: "model", 
        parts: [{ text: accumulatedText }], 
        model: selectedModel,
        usageMetadata: usageData
      });
      
      // Trigger title update if needed
      updateChatTitle();

    } catch (error) {
      console.error("Streaming error:", error);
      toast.error("Failed to generate response");
    } finally {
      setIsStreaming(false);
    }
  };

  const newChatMutation = useMutation({
    mutationFn: async (input_text) => {
      const { success, error, data } = await createChat();
      if(!success)
        return { success, error };
      const { chat_id } = data;
      if (chat_id) {
        const new_msg_resp = await createMessage(chat_id, {
          role: "user",
          parts: [{ text: input_text }],
        });
        return { chat_id, ...new_msg_resp };
      }
      return { success: false };
    },
    onSuccess: (resp) => {
      if (!resp.success) {
        toast.error(resp.error || "Something went wrong! Please try again later.");
        return;
      }
      const { chat_id, data: new_msg_obj } = resp;
      queryClient.setQueryData(["messages", chat_id], [new_msg_obj]);
      router.push(`/dashboard/chat/${chat_id}`);
      queryClient.invalidateQueries({
        queryKey: ["messages", undefined],
      });
    },
  });

  const updateChatTitle = async () => {
    if(!current_chat){
      return;
    }
    const isDefaultTitle = current_chat?.title?.toLowerCase()==="untitled chat";
    if(current_chat?.title && !isDefaultTitle){
      return;
    }
    if(messages.length<=1 || isUpdatingTitle.current){
      return;
    }
    isUpdatingTitle.current = true;
    let history = [];
    if(messages.length<=4){
      history = messages.map((msg_obj) => {
        return msg_obj.message;
      });
    } else {
      history = messages.slice(0,4).map((msg_obj) => {
        return msg_obj.message;
      });
    }
    // generate title
    const title = await generateTitle(history);
    const { success } = await setChatTitle(chatId, title);
    if(success){
      queryClient.invalidateQueries({
        queryKey: ["chats", userId, chatId],
      })
    }
    isUpdatingTitle.current = false;
  }

  const handleForm = (e) => {
    e.preventDefault();
    let trimmedText = inputText.trim();
    if (!trimmedText) return;
    const new_msg_obj = {
      message: {
        role: "user",
        parts: [{ text: trimmedText }],
      },
      createdAt: new Date().toISOString(),
    };
    if (chatId) {
      queryClient.setQueryData(
        ["messages", chatId],
        [...messages, new_msg_obj]
      );
      createMessage(chatId, new_msg_obj.message);
      // scrollIntoView removed here, handled by useEffect
      
      const history = messages.map((msg_obj) => {
        return msg_obj.message;
      });
      
      processStream(trimmedText, history);

    } else {
      isNavigating.current = true;
      queryClient.setQueryData(
        ["messages", chatId],
        [new_msg_obj]
      );
      newChatMutation.mutate(trimmedText);
    }
    setInputText("");
  };

  useEffect(() => {
    if (chatId && messages.length === 1) {
      // Check if the last message is from user and we haven't responded yet
      const { message } = messages[0];
      if (message.role === 'user') {
         processStream(message.parts[0].text, []);
      }
    }
    if(chatId && messages.length>1){
      updateChatTitle();
    }
  }, [chatId, messages]); 

  // Auto-scroll during streaming
  const lastMessage = messages[messages.length - 1];
  const lastMessageText = lastMessage?.message?.parts?.[0]?.text;

  useEffect(() => {
    if (isStreaming && !isUserScrolledUp.current && scrollContainerRef.current) {
       scrollContainerRef.current.scrollTo({
         top: scrollContainerRef.current.scrollHeight,
         behavior: "smooth",
       });
    }
  }, [lastMessageText, isStreaming]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      if (!messagesInitialized.current) {
        messagesInitialized.current = true;
        newMsgRef.current?.scrollIntoView({ behavior: "instant", block: "end" });
        prevMsgLen.current = messages.length;
      } else {
        if (messages.length > prevMsgLen.current) {
            // New message added (User or AI placeholder)
            newMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            prevMsgLen.current = messages.length;
        }
      }
    }
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="w-full h-[90vh] flex justify-center items-center">
        <div className="loading loading-infinity w-12" />
      </div>
    );
  }
  return (
    <div className="flex flex-col h-screen">
      <header className="font-bold border-b rounded-lg flex items-center px-3 h-14 min-h-14 line-clamp-1 cursor-normal select-none">
        {chatId ? current_chat?.title??"Untitled Chat" : "New Chat"}
      </header>
      <div className="flex flex-col-reverse grow min-h-0">
        <form className="w-full join items-end" onSubmit={handleForm}>
          <textarea
            className="input input-bordered outline-none! border-b-0 rounded-lg rounded-b-none mt-3 join-item max-h-52 h-24 sm:h-28 w-full py-2 text-wrap"
            placeholder="Enter Query Here..."
            name="query"
            autoComplete="off"
            onChange={(e) => {
              setInputText(e.currentTarget.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleForm(e);
              }
            }}
            rows="2"
            value={inputText}
          />
          <div className="relative join-item border border-base-content/20 border-b-0 border-r-0 h-12 sm:h-14 w-[140px] overflow-hidden bg-base-100 flex items-center rounded-none">
            {/* Display Layer - Behind the select */}
            <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
              <div className="w-full overflow-hidden whitespace-nowrap" ref={marqueeContainerRef}>
                <span 
                  ref={marqueeTextRef}
                  className={`inline-block ${shouldAnimate ? 'animate-marquee' : ''}`}
                  style={shouldAnimate ? { '--marquee-end': marqueeEnd } : {}}
                >
                   {getModelName(selectedModel)}
                </span>
              </div>
            </div>
             {/* Actual Select - Invisible but clickable */}
            <select
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              value={selectedModel}
              disabled={isStreaming || isNavigating.current}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </div>

          {selectedModel === 'gemini-3-pro-preview' && (
            <select
              className="select select-bordered join-item border-b-0 rounded-none h-12 sm:h-14 w-24 sm:w-auto"
              value={thinkingLevel}
              disabled={isStreaming || isNavigating.current}
              onChange={(e) => setThinkingLevel(e.target.value)}
            >
              <option value="low">Low Thinking</option>
              <option value="high">High Thinking</option>
            </select>
          )}
          <button
            className="join-item btn btn-secondary border-b-0 rounded-r-lg rounded-b-none h-12 sm:h-14 w-24 sm:w-56"
            disabled={isStreaming || isNavigating.current}
            type="submit"
          >
            Send Query
          </button>
        </form>
        <div 
          className="overflow-auto grow min-h-0" 
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          {messages.map((msg_obj, index) => {
            const { message = {}, createdAt } = msg_obj ?? {};
            const { role = "user", parts = [] } = message;
            const text = parts[0]?.text;
            let formatted_timestamp;
            if (createdAt) {
              formatted_timestamp = new Date(createdAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "medium",
                timeStyle: "long",
              });
            }
            const bgc = role === "user" ? "bg-base-200" : "bg-base-100";
            const icon = role === "user" ? <FaUser /> : <FaRobot />;
            return (
              <div
                className={`flex flex-col p-3 rounded-lg ${bgc}`}
                key={index}
                ref={index === messages.length - 1 ? newMsgRef : null}
              >
                <div className="mr-3 flex justify-between items-center">
                  <div className="flex items-center font-bold text-primary">
                    {icon}&nbsp;{role === "user" ? "(You):-" : `(${getModelName(msg_obj.model || "Gemini AI")}):-`}
                  </div>
                   <div className="flex items-center gap-2">
                    {role === "model" && msg_obj.usageMetadata && (
                      <div className="dropdown dropdown-end dropdown-hover">
                        <div tabIndex={0} role="button" className="text-info cursor-help">
                          <FaCircleInfo size={14} />
                        </div>
                        <div tabIndex={0} className="dropdown-content z-[1] card card-compact w-48 p-2 shadow bg-base-300 text-base-content border border-base-content/20">
                          <div className="card-body p-1">
                            <h3 className="font-bold border-b border-base-content/10 mb-1 pb-1">Token Usage</h3>
                            <div className="flex justify-between text-[10px]">
                              <span>Prompt:</span>
                              <span className="font-mono">{msg_obj.usageMetadata.promptTokenCount || 0}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span>Response:</span>
                              <span className="font-mono">{msg_obj.usageMetadata.candidatesTokenCount || 0}</span>
                            </div>
                            {msg_obj.usageMetadata.thoughtTokenCount > 0 && (
                              <div className="flex justify-between text-[10px] text-secondary">
                                <span>Thinking:</span>
                                <span className="font-mono">{msg_obj.usageMetadata.thoughtTokenCount}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs font-bold mt-1 pt-1 border-t border-base-content/10">
                              <span>Total:</span>
                              <span>{msg_obj.usageMetadata.totalTokenCount || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <span className="text-xs ">
                      {formatted_timestamp ? formatted_timestamp : ""}
                    </span>
                  </div>
                </div>
                {role === "model" && (text === "" || !text) && isStreaming && index === messages.length - 1 ? (
                  <div className="py-2">
                     <span className="loading loading-dots loading-md text-primary"></span>
                  </div>
                ) : (
                  <MarkdownViewer content={text ?? ""} role={role ?? "user"}/>
                )}
              </div>
            );
          })}
          {isStreaming || isNavigating.current ? (
             isStreaming ? null : (
                <div className="p-3">
                  <span className="loading loading-dots"></span>
                </div>
             )
          ) : null}
        </div>
      </div>
    </div>
  );
};
export default Chat;