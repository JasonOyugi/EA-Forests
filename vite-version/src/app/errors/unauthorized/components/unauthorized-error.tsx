"use client"

import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

export function UnauthorizedError() {
  const navigate = useNavigate()

  return (
    <div className='mx-auto flex min-h-dvh flex-col items-center justify-center gap-8 p-8 md:gap-12 md:p-16'>
      <img
        src='https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/5111f863-8c28-48c0-b838-f6d4bb424848/d76w0hn-2942d2bf-f488-4aad-9176-38e16fa3c965.png/v1/fill/w_1024,h_576,q_80,strp/eggman_vector_logo_by_abcice_d76w0hn-fullview.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9NTc2IiwicGF0aCI6IlwvZlwvNTExMWY4NjMtOGMyOC00OGMwLWI4MzgtZjZkNGJiNDI0ODQ4XC9kNzZ3MGhuLTI5NDJkMmJmLWY0ODgtNGFhZC05MTc2LTM4ZTE2ZmEzYzk2NS5wbmciLCJ3aWR0aCI6Ijw9MTAyNCJ9XV0sImF1ZCI6WyJ1cm46c2VydmljZTppbWFnZS5vcGVyYXRpb25zIl19.cm-B1zUvPsFSBpB4EyJO8zacYUbY7X7d_jHk2bVINIU'
        alt='placeholder image'
        className='aspect-video w-240 rounded-xl object-cover dark:brightness-[0.95] dark:invert'
      />
      <div className='text-center'>
        <h1 className='mb-4 text-3xl font-bold'>401</h1>
        <h2 className="mb-3 text-2xl font-semibold">Unauthorized</h2>
        <p>You don't have permission to access this resource. Please sign in or contact your administrator.</p>
        <div className='mt-6 flex items-center justify-center gap-4 md:mt-8'>
          <Button className='cursor-pointer' onClick={() => navigate('/dashboard')}>Go Back Home</Button>
          <Button variant='outline' className='flex cursor-pointer items-center gap-1' onClick={() => navigate('#')}>
            Contact Us
          </Button>
        </div>
      </div>
    </div>
  )
}
