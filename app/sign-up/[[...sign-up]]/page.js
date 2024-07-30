import { SignUp } from "@clerk/nextjs"

const SignUpPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200">
        <SignUp fallbackRedirectUrl="/sign-in"/>
    </div>
  )
}
export default SignUpPage;