import React, { useState } from "react";
import { KeyRound, X } from "lucide-react";

interface PasswordSettingsModalProps {
  onClose: () => void;
  language: "ne" | "en";
}

export const PasswordSettingsModal: React.FC<PasswordSettingsModalProps> = ({ onClose, language }) => {
  const [userPassword, setUserPassword] = useState(localStorage.getItem("userPassword") || "office123");
  const [adminPassword, setAdminPassword] = useState(localStorage.getItem("adminPassword") || "admin");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("userPassword", userPassword);
    localStorage.setItem("adminPassword", adminPassword);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-slate-900">
            <KeyRound className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold">
              {language === "ne" ? "पासवर्ड परिवर्तन गर्नुहोस्" : "Change Passwords"}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              {language === "ne" ? "प्रयोगकर्ता पासवर्ड (User Password)" : "User Password"}
            </label>
            <input
              type="text"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              {language === "ne" ? "प्रशासक पासवर्ड (Admin Password)" : "Admin Password"}
            </label>
            <input
              type="text"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {isSaved 
            ? (language === "ne" ? "सुरक्षित गरियो ✓" : "Saved ✓")
            : (language === "ne" ? "सुरक्षित गर्नुहोस्" : "Save Changes")
          }
        </button>
      </div>
    </div>
  );
};
