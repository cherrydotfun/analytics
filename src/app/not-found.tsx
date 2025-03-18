import Link from 'next/link'
 import React from 'react';

import { Header } from "@/components/headers/header"
import { Footer } from "@/components/footer"


export default function NotFound() {
  return (
    <div className="[--header-height:calc(--spacing(14))] flex flex-col h-screen">
        <Header />
        <div className="flex flex-1 grow bg-gradient-to-br from-[#020618] to-[#140033]" >
            <div className="flex flex-1 flex-col gap-4 p-4 justify-center items-center">
            <div className="text-3xl font-bold">Not Found</div>
              <div className="mb-2">
              <p>The page you requested could not be found.</p>
              </div>
              <div>
                <Link href="/">
                  Return home
                </Link>
              </div>
            </div>
        </div>
        <Footer />
    </div>
  )
}

