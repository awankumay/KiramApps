import { useState } from "react";
import { LogOut, User } from "lucide-react";
import { Button } from "@Shared/Components/UI/Button";
import { useAuth } from "../../Auth/Contexts/AuthContext";

export function UserProfileHeader() {
  const { user, logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmLogout = async () => {
    await logout();
    setShowConfirm(false);
  };

  const handleCancelLogout = () => {
    setShowConfirm(false);
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Surat Masuk Digital
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2 text-right">
                <div className="bg-primary/10 p-1.5 rounded-full">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500">@{user.username}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogoutClick}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Konfirmasi Logout
            </h3>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin keluar dari aplikasi?
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleCancelLogout}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmLogout}
                className="flex-1"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
