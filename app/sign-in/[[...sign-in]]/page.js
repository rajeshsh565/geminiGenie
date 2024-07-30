import { SignIn } from "@clerk/nextjs"

const SignInPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200">
        <SignIn afterSignOutUrl="/"/>
    </div>
  )
}
export default SignInPage