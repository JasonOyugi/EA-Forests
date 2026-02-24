import { ForgotPasswordForm2 } from "./components/forgot-password-form-2"
import { Logo } from "@/components/logo"

export default function ForgotPassword2Page() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <div className="text-primary-foreground flex size-8 items-center justify-center rounded-md">
              <Logo size={24} />
            </div>
            EA Forests
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <ForgotPasswordForm2 />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="https://static.vecteezy.com/system/resources/previews/068/738/395/non_2x/line-art-dead-face-circle-with-x-eyes-emoji-illustration-vector.jpg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.95] dark:invert"
        />
      </div>
    </div>
  )
}
