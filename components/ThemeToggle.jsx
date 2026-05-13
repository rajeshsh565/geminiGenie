"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { BsMoonFill, BsSunFill } from "react-icons/bs";
import { useUser } from "@clerk/nextjs";

const ThemeToggle = () => {
  const { user } = useUser();
  const [theme, setTheme] = useState();

  useEffect(() => {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "cupcake";
    setTheme(currentTheme);
  }, []);

  const saveTheme = async (newTheme) => {
    try {
      if (!user) return;
      await user.update({
        unsafeMetadata: {
          theme: newTheme,
        },
      });
    } catch (error) {
      console.log("error updating theme->", error);
    }
  };
  const changeTheme = () => {
    const newTheme = theme === "dim" ? "cupcake" : "dim";
    document.documentElement.setAttribute("data-theme", newTheme);
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
    setTheme(newTheme);
    saveTheme(newTheme);
    toast.success('Theme Updated!');
  };
  if(!theme){
    return <></>
  }
  return (
    <label className="swap swap-rotate">
      {/* This log will show the boolean value passed to the 'checked' prop */}
      {console.log("Checkbox checked state:", theme === "cupcake")}
      <input
        type="checkbox"
        onChange={changeTheme}
        checked={theme === "cupcake"}
      />
      <div className="swap-on">
        <BsMoonFill />
      </div>
      <div className="swap-off">
        <BsSunFill />
      </div>
    </label>
  );
};
export default ThemeToggle;