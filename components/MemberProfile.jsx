import { UserButton} from "@clerk/nextjs"
import { currentUser } from "@clerk/nextjs/server";

const MemberProfile = async() => {
  const user = await currentUser();
  return (
    <div className="flex flex-col items-center gap-2">
      <h1 className="text-lg">Welcome, <span className="font-semibold">{user.firstName}</span>!</h1>
      <UserButton afterSignOutUrl="/"/>
    </div>
  )
}
export default MemberProfile