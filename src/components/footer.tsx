import Image from "next/image";

export function Footer() {

  return (
    <header className="bg-background sticky bottom-0 z-50 flex w-full items-center border-t flex-col">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4 justify-center">
      
        <a href="https://t.me/" target="_blank" className="text-secondary mr-4">
            <Image src="/icons/tg-logo.svg" alt="Telegram" width="24" height="24" />
        </a>

        <a href="https://x.com/" target="_blank" className="text-secondary mr-4">
            <Image src="/icons/x-logo.svg" alt="X" width="20" height="20" />
        </a>
        
      </div>
    </header>
  )
}
