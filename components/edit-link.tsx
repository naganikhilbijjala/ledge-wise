"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface EditLinkProps {
  href: string;
  size?: "sm" | "default";
}

export function EditLink({ href, size = "sm" }: EditLinkProps) {
  const buttonSize = size === "sm" ? "h-8 w-8 p-0" : "h-6 w-6 p-0";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-3 w-3";

  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
    >
      <Button variant="ghost" size="sm" className={buttonSize}>
        <Pencil className={`${iconSize} text-gray-500`} />
      </Button>
    </Link>
  );
}
