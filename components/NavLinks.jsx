"use client"

import { useChatContext } from "@/app/providers";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useState } from "react";
import { BsPencilSquare, BsThreeDotsVertical, BsCheck, BsX } from "react-icons/bs";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setChatTitle } from "@/utils/db_action";
import { useAuth } from "@clerk/nextjs";

const links = [
  {
    path: "/dashboard/chat",
    label: "New Chat",
    icon: <BsPencilSquare/>,
  },
  {
    label: "Recent Chats",
  },
  {
    path: "/dashboard/tours",
    label: "tours",
  },
  {
    path: "/dashboard/new-tour",
    label: "new tour",
  },
  {
    path: "/dashboard/member-profile",
    label: "profile",
  },
];

const ChatItem = ({ chat, isActive, isLast }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title || "");
  const queryClient = useQueryClient();

  const renameMutation = useMutation({
    mutationFn: async (title) => {
      const { success, error } = await setChatTitle(chat._id, title);
      if (!success) throw new Error(error);
      return success;
    },
    onSuccess: () => {
      toast.success("Chat renamed successfully");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to rename chat");
    }
  });

  const handleSave = () => {
    if (newTitle.trim() === "") {
      toast.error("Title cannot be empty");
      return;
    }
    if (newTitle === chat.title) {
      setIsEditing(false);
      return;
    }
    renameMutation.mutate(newTitle);
  };

  const handleCancel = () => {
    setNewTitle(chat.title || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <li className="flex flex-row items-center gap-1 px-1 py-1">
        <input 
          type="text" 
          className="input input-bordered input-xs w-full max-w-[140px]" 
          value={newTitle} 
          onChange={(e) => setNewTitle(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
             if (e.key === 'Enter') handleSave();
             if (e.key === 'Escape') handleCancel();
          }}
        />
        <button onClick={handleSave} className="btn btn-xs btn-ghost text-success px-1"><BsCheck size={18}/></button>
        <button onClick={handleCancel} className="btn btn-xs btn-ghost text-error px-1"><BsX size={18}/></button>
      </li>
    );
  }

  return (
    <li className="relative group">
      <div className={`flex items-center justify-between p-0 pr-1 ${isActive ? "menu-active" : ""}`}>
        <Link href={`/dashboard/chat/${chat?._id}`} className={`capitalize line-clamp-1 py-2 font-bold grow block w-full ${isActive ? "menu-active" : ""}`}>
          {`${chat?.title || 'Untitled Chat'}`}
        </Link>

        <div className={`dropdown dropdown-left ${isLast ? 'dropdown-top' : 'dropdown-bottom'} opacity-0 group-hover:opacity-100 transition-opacity`}>
          <div tabIndex={0} role="button" className="btn btn-ghost btn-xs p-0.5 h-auto min-h-0" onClick={(e) => e.stopPropagation()}>
             <BsThreeDotsVertical />
          </div>
          <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-base-100 rounded-box w-24 border border-base-300">
            <li><a onClick={(e) => {
              e.preventDefault(); // Prevent link navigation if nested
              setIsEditing(true);
              // Close dropdown by losing focus
              const elem = document.activeElement;
              if (elem) elem.blur();
            }}>Rename</a></li>
          </ul>
        </div>
      </div>
    </li>
  );
};

const NavLinks = () => {
  const pathname = usePathname();
  const { chatId } = useParams();
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const { chats } = useChatContext();
  
  return <ul className="menu w-full">
    {links.map((link, index)=>{
      if(link.label === "Recent Chats"){
        return (
          <li key={index}>
            <details className={`collapse capitalize font-bold overflow-visible`} onToggle={()=>{
              setHistoryOpen(!isHistoryOpen);
            }}>
              <summary className="flex items-center justify-between">
                {link.label}
              </summary>
              <div className={`w-auto max-h-38 overflow-y-auto ${isHistoryOpen ? "opacity-100":"opacity-0"}`}>                
                <ul className="menu w-auto p-0">
                  {
                    chats?.map((chat,i)=>{
                      const isLast = i >= (chats.length - 2); // Treat last 2 items as "bottom"
                      return (
                        <ChatItem key={chat._id || i} chat={chat} isActive={chatId === chat._id} isLast={isLast} />
                      )
                    })
                  }
                </ul>
              </div>
            </details>
          </li>
        )
      }
      return <li key={index}><Link href={link.path} className={`capitalize font-bold ${pathname===link.path ? "menu-active" : ""}`}>{link.label}{link.icon}</Link></li>
    })}
  </ul>;
};
export default NavLinks;