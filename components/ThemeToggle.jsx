'use client'

import { useState } from "react"
import toast from "react-hot-toast";
import { BsMoonFill, BsSunFill } from 'react-icons/bs';

const ThemeToggle = () => {
    const [theme, setTheme] = useState("cupcake");
    const changeTheme = () => {
        const newTheme = theme === "forest" ? "cupcake":"forest";
        window.document.querySelector("html").setAttribute("data-theme", newTheme);
        setTheme(newTheme);
        toast.success("Theme Updated!");
    }
  return (
    <button className="btn btn-outline" onClick={changeTheme}>
        {theme==="forest" ? <BsMoonFill className="h-4 w-4"/> : <BsSunFill className="h-4 w-4"/>}
    </button>
  )
}
export default ThemeToggle