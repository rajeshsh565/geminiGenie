"use client"
import Chat from "@/components/Chat"
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query"
import { useParams } from "next/navigation";

const ChatPage = () => {
  const queryClient = new QueryClient();
  const { chatId } = useParams();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="h-full">
        <Chat chatId={chatId}/>
      </div>
    </HydrationBoundary>
  )
}
export default ChatPage