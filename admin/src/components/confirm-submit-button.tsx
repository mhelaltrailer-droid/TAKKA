"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { confirmDestructive } from "@/lib/confirm-destructive";

type ConfirmSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  message: string;
  children: ReactNode;
};

/** Submit button that asks for confirmation before the form posts. */
export function ConfirmSubmitButton({
  message,
  children,
  onClick,
  type = "submit",
  ...props
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type={type}
      {...props}
      onClick={(event) => {
        if (!confirmDestructive(message)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}
