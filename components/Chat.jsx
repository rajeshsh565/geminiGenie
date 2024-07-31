"use client";

import { generateResponse } from "@/utils/action";
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { FaRobot, FaUser } from "react-icons/fa6";

const Chat = () => {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([]);
  // const {mutate, isPending} = useMutation({
  //   mutationFn: async ()=>{
  //    const aiRes = await generateResponse({history, query:textContent});
  //    if(!aiRes){
  //     toast.error("an error occured!");
  //     return;
  //    }
  //    setMessages((prev)=>[...prev, aiRes])
  //    setHistory([...history, {role:'user', parts:[{text:obj.query}]}, {role:'model',parts:[{text:aiRes}]}]);
  //   }
  // })
  // const handleForm = (e) => {
  //   // const query = {role:'user', parts:[{text: textContent}]}
  //   e.target.value="";
  //   setMessages((prev)=>[...prev, textContent]);
  //   mutate();
  // }
  const {mutate, isPending} = useMutation({
    mutationFn: async (query) => {
      const aiResponse = await generateResponse({messages, query});
      setMessages((prev) => [...prev, { role: "model", parts:[{text:aiResponse}] }]);
    }
  })

  const handleForm = (e) => {
    e.preventDefault();
    setMessages((prev) => [...prev, { role: "user", parts:[{text:inputText}] }]);
    e.currentTarget.children.item(0).value = "";
    mutate(inputText);
  };

  return (
    <div className="h-full grid grid-rows-[1fr,auto]">
      <div className="overflow-auto h-[calc(100vh-7rem)] mb-2">
        {messages.map((message, index) => {
          const { role, parts } = message;
          const bgc = role === "user" ? "bg-base-200" : "bg-base-100";
          const icon = role === "user" ? <FaUser /> : <FaRobot />;
          return (
            <div className={`flex items-center p-3 rounded-lg ${bgc}`} key={index}>
              <span className="mr-3">{icon}</span>
              <div>{parts[0].text.split("**").map((content, index)=>{
                if(index%2==0){
                  if(content.includes("```")){
                    const arr =content.split("```");
                  for(let i = 1; i<=arr.length; i++){
                    if(i%2!=0){
                        return <pre className="border border-primary rounded-lg p-2 mt-2 bg-primary-content text-primary"><code>{arr[i]}</code></pre>
                    }
                    else return arr[i];
                }
                  }
                  else return content;
                }
                else return <span><br /><b>{content}</b></span>
              })}</div>
            </div>
          );
        })}
        {isPending ? <div className="p-3"><span className='loading'></span></div> : null}
      </div>
      <div className="join max-h-14 h-14 items-center">
        <form className="w-full" onSubmit={handleForm}>
          <input
            type="text"
            className="input input-bordered join-item w-3/5"
            placeholder="Enter Query Here..."
            name="query"
            autoComplete="off"
            onChange={(e) => {
              setInputText(e.currentTarget.value);
            }}
          />
          <button className="join-item btn btn-secondary" disabled={isPending} type="submit">
            Send Query
          </button>
        </form>
      </div>
    </div>
  );
};
export default Chat;
