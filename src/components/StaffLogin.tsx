import React, { useState } from "react";
import { Lock } from "lucide-react";

interface StaffLoginProps {
  onAuth: () => void;
  language: "ne" | "en";
}

export const StaffLogin: React.FC<StaffLoginProps> = ({ onAuth, language }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "office123") {
      onAuth();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-100 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full">
        <div className="flex justify-center mb-6">
          <div className="bg-slate-900 p-3 rounded-full">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-6">
          {language === "ne" ? "कार्यालय लग-इन" : "Office Login"}
        </h2>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder={language === "ne" ? "पासवर्ड प्रविष्ट गर्नुहोस्" : "Enter Password"}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 mb-4 focus:ring-2 focus:ring-slate-900 focus:outline-none"
            required
          />
          {error && (
            <p className="text-red-500 text-sm mb-4 text-center">
              {language === "ne" ? "गलत पासवर्ड!" : "Incorrect Password!"}
            </p>
          )}
          <button
            type="submit"
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors"
          >
            {language === "ne" ? "लग-इन गर्नुहोस्" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};
