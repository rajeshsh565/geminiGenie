import Chat from "@/components/Chat"
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query"

const ChatPage = () => {
  const queryClient = new QueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
    <div className="h-full">
      <Chat/>
    </div>
    </HydrationBoundary>
  )
}
export default ChatPage