"use client"
import { useEffect } from "react";

const useTitle = (title: string) => {
  useEffect(() => {
    document.title = title + " | " + process.env.NEXT_PUBLIC_APP_NAME;
  }, [title]);
};

export default useTitle;