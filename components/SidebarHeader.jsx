import { SiGooglegemini } from "react-icons/si"
import ThemeToggle from "./ThemeToggle"

const SidebarHeader = () => {
  return (
    <div className="flex justify-between mb-4">
      <div className="flex items-center">
        <SiGooglegemini className="h-6 w-6"/>
        <h1 className="font-extrabold text-2xl ms-1">GeminiGenie</h1>
      </div>
      <ThemeToggle/>
    </div>
  )
}
export default SidebarHeader;