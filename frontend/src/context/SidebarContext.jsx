import { createContext, useContext, useState } from 'react';

const SidebarContext = createContext({ open: false, toggle: () => {}, close: () => {} });
export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{
      open,
      toggle: () => setOpen((v) => !v),
      close: () => setOpen(false),
    }}>
      {children}
    </SidebarContext.Provider>
  );
}
