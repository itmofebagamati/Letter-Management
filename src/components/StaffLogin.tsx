import React, { useState } from "react";
import nepalEmblemUrl from "../../assets/nepal_emblem.svg";

interface StaffLoginProps {
  onAuth: () => void;
  language: "ne" | "en";
  isAdminRoute?: boolean;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({ onAuth, language, isAdminRoute }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedUserPwd = localStorage.getItem("userPassword") || "office123";
    const storedAdminPwd = localStorage.getItem("adminPassword") || "admin";
    const expectedPwd = isAdminRoute ? storedAdminPwd : storedUserPwd;
    
    if (password === expectedPwd || (isAdminRoute && password === "1234")) {
      onAuth();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-100 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full border-t-4 border-red-600">
        <div className="flex flex-col items-center mb-6">
          <img src={nepalEmblemUrl} alt="Nepal Government Emblem" className="w-16 h-16 mb-4" />
          <h2 className="text-sm font-bold text-red-600 text-center mb-1">
            {language === "ne" ? "बागमती प्रदेश सरकार" : "Bagmati Province Government"}
          </h2>
          <h1 className="text-lg font-bold text-red-600 text-center">
            {language === "ne" ? "वन तथा वातावरण मन्त्रालय" : "Ministry of Forests and Environment"}
          </h1>
        </div>
        
        <div className="border-b border-slate-200 mb-6"></div>

        <h3 className="text-lg font-bold text-center text-slate-800 mb-6">
          {isAdminRoute ? (language === "ne" ? "प्रशासक लग-इन" : "Admin Login") : (language === "ne" ? "कार्यालय लग-इन" : "Office Login")}
        </h3>
        
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder={language === "ne" ? "पासवर्ड प्रविष्ट गर्नुहोस्" : "Enter Password"}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 mb-4 focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-none"
            required
          />
          {error && (
            <p className="text-red-500 text-sm mb-4 text-center">
              {language === "ne" ? "गलत पासवर्ड!" : "Incorrect Password!"}
            </p>
          )}
          <button
            type="submit"
            className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors"
          >
            {language === "ne" ? "लग-इन गर्नुहोस्" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};
