"use client";
import toast, { Toaster } from "react-hot-toast";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState, useContext, createContext } from "react";
import { useAuth } from "@clerk/nextjs";
import { getChatsList } from "@/utils/db_action";
import { useParams } from "next/navigation";

const ChatsContext = createContext();

const ChatListInitializer = ({ children }) => {
  const [chats, setChats] = useState([]);
  const { userId } = useAuth();
  const { chatId } = useParams();

  const { data } = useQuery({
    queryKey: ["chats", userId, chatId],
    queryFn: () => getChatsList(),
    enabled: !!userId,
  });

  useEffect(() => {
    if (data) {
      if(!data.success){
        toast.error(data.error || "Something went wrong! Please try again later.");
        return;
      }
      setChats(data.data);
    }
  }, [data]);

  return (
    <ChatsContext.Provider value={{ chats, setChats }}>
      {children}
    </ChatsContext.Provider>
  );
};

const Providers = ({ children }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ChatListInitializer>
        <Toaster position="top-center" />
        {children}
      </ChatListInitializer>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
};
export default Providers;

export const useChatContext = () => {
  return useContext(ChatsContext);
};
