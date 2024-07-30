import Link from "next/link";

const links = [
  {
    path: "/chat",
    label: "chat",
  },
  {
    path: "/tours",
    label: "tours",
  },
  {
    path: "/new-tour",
    label: "new tour",
  },
  {
    path: "/member-profile",
    label: "profile",
  },
];

const NavLinks = () => {
  return <ul className="menu">
    {links.map((link, index)=>{
      return <li key={index}><Link href={link.path} className="capitalize font-bold">{link.label}</Link></li>
    })}
  </ul>;
};
export default NavLinks;
