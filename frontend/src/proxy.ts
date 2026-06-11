import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Make the main pages and API routes public. Anything not here will require auth.
const isPublicRoute = createRouteMatcher([
  '/', 
  '/pricing(.*)', 
  '/faq(.*)', 
  '/contact(.*)', 
  '/sign-in(.*)', 
  '/sign-up(.*)', 
  '/api(.*)'
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
