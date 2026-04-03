"use client";

import type { ReactNode } from "react";
import { ModalRegistry } from "./modal-registry";

type GlobalModalProviderProps = {
  children: ReactNode;
};

export function GlobalModalProvider({ children }: GlobalModalProviderProps) {
  return (
    <>
      {children}
      <ModalRegistry />
    </>
  );
}

