import { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const AppLayout = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className={isMobile ? "pt-14" : "ml-16 lg:ml-64 transition-all duration-300"}>
        <div className="p-3 md:p-6 lg:p-8 max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
