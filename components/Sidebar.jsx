import toast from "react-hot-toast"
import MemberProfile from "./MemberProfile"
import NavLinks from "./NavLinks"
import SidebarHeader from "./SidebarHeader"

const Sidebar = () => {
  const clickme = () => {
    toast.success("asdadasd");
  }
  return (
    <div className="grid grid-rows-[auto,1fr,auto] h-full py-12 px-8 bg-base-300 w-80">
      <SidebarHeader/>
      <NavLinks/>
      <MemberProfile/>
    </div>
  )
}
export default Sidebar