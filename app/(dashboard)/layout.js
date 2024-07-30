import Sidebar from "@/components/Sidebar";
import { FaBarsStaggered } from "react-icons/fa6";

const DashboardLayout = ({ children }) => {
  return (
    <div className="drawer lg:drawer-open">
      <input type="checkbox" id="my-drawer" className="drawer-toggle"></input>
      <div className="drawer-content min-h-screen bg-base-200">
        <label htmlFor="my-drawer" className="drawer-button lg:hidden fixed top-8 right-6 z-50">
        <FaBarsStaggered className="h-8 w-8 cursor-pointer"/>
        </label>
            <div className="p-6">{children}</div>
      </div>
      <div className="drawer-side">
        <label
          htmlFor='my-drawer'
          className='drawer-overlay'
        ></label>
        <Sidebar/>
        </div>
    </div>
  );
};
export default DashboardLayout;
