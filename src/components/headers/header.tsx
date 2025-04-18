import Link from "next/link";

export function Header() {

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Link href="/" className="text-2xl font-bold text-primary">
            {process.env.NEXT_PUBLIC_APP_NAME}
        </Link>
      </div>
    </header>
  )
}
