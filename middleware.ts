import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { get } from '@vercel/edge-config'

type RedirectRule = {
    source: string
    destination: string
    permanent: boolean
}

export async function middleware(request: NextRequest) {
    // Fetch redirect rules from Edge Config
    const redirects = await get('redirectRules') as RedirectRule[] | null

    console.log(redirects)

    if (!redirects) {
        return NextResponse.next()
    }

    const url = request.nextUrl.clone()

    for (const rule of redirects) {
        const matchResult = matchPath(url.pathname, rule.source)
        if (matchResult) {
            // If there's a match, apply the redirect
            const destinationPath = replaceParams(rule.destination, matchResult.params)
            url.pathname = destinationPath
            return NextResponse.redirect(url, {
                status: rule.permanent ? 308 : 307
            })
        }
    }

    // If no redirect rule matches, continue to the next middleware or route handler
    return NextResponse.next()
}

// Helper function to match path with parameters
function matchPath(pathname: string, pattern: string) {
    const patternParts = pattern.split('/')
    const pathParts = pathname.split('/')

    if (patternParts.length !== pathParts.length) {
        return null
    }

    const params: Record<string, string> = {}

    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
            const paramName = patternParts[i].slice(1)
            params[paramName] = pathParts[i]
        } else if (patternParts[i] !== pathParts[i]) {
            return null
        }
    }

    return { params }
}

// Helper function to replace parameters in the destination path
function replaceParams(destination: string, params: Record<string, string>) {
    let result = destination
    for (const [key, value] of Object.entries(params)) {
        result = result.replace(`:${key}`, value)
    }
    return result
}

export const config = {
    matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
}

