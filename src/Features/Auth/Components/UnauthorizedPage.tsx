import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { Button } from "@Shared/Components/UI/Button";
import { useAuth } from "../Contexts/AuthContext";
import { ROLE_LANDING_PAGES } from "@Shared/Types/RBAC";

interface UnauthorizedPageProps {
  /** Custom message to display */
  message?: string;
}

/**
 * Page displayed when user attempts to access a route they don't have permission for
 */
export function UnauthorizedPage({
  message = "Anda tidak memiliki izin untuk mengakses halaman ini.",
}: UnauthorizedPageProps) {
  const { roles } = useAuth();

  // Get the first role's landing page for home navigation
  const primaryRole = roles[0] as keyof typeof ROLE_LANDING_PAGES | undefined;
  const homePath = primaryRole ? ROLE_LANDING_PAGES[primaryRole] : "/dashboard";

  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    // Use window.location for navigation since we might not have router context
    window.location.hash = homePath;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <ShieldX className="w-10 h-10 text-destructive" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Akses Ditolak
        </h1>

        {/* Message */}
        <p className="text-muted-foreground mb-6">{message}</p>

        {/* Current role info */}
        {roles.length > 0 && (
          <div className="bg-muted rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-1">
              Role Anda saat ini:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={handleGoBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <Button onClick={handleGoHome}>
            <Home className="w-4 h-4 mr-2" />
            Ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
