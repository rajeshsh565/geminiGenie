import Sidebar from "@/components/Sidebar";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { FaBarsStaggered } from "react-icons/fa6";

const DashboardLayout = ({ children }) => {
  // const {userId} = auth();
  // if(!userId){
  //   redirect("/");
  // }
  return (
    <div className="drawer lg:drawer-open">
      <input type="checkbox" id="my-drawer" className="drawer-toggle"></input>
      <div className="drawer-content min-h-screen bg-base-200">
        <label htmlFor="my-drawer" className="drawer-button lg:hidden fixed top-3 right-6 z-50">
          <FaBarsStaggered className="h-8 w-8 cursor-pointer"/>
        </label>
        <div className="px-3 sm:px-6 h-full">{children}</div>
      </div>
      <div className="drawer-side">
        <label
          htmlFor='my-drawer'
          className='drawer-overlay'
        />
        <Sidebar/>
      </div>
    </div>
  );
};
export default DashboardLayout;
