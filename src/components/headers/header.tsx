export function Header() {

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <a href="/" className="text-2xl font-bold text-primary">
            broke.gg
        </a>
      </div>
    </header>
  )
}
