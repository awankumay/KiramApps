import { GalleryVerticalEnd } from "lucide-react";
import { LoginForm } from "./Components/LoginForm";
import { DummyImage } from "@Features/Dashboard/Components/DummyImage";

export default function AuthPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            CV. Kiramana.
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:flex items-center justify-center">
        <DummyImage
          width={300}
          height={300}
          shape="image"
          className="dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
