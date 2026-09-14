import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /*
    Номер выкладки. Когда страница на телефоне открыта со старой версии,
    а на сервере уже новая, Next по нему видит расхождение и перезагружает
    страницу сам — вместо ошибки на первой же кнопке. Vercel подставляет
    номер при каждой сборке; локально его нет, и защита просто не включается.
  */
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  // сокращает клиентский бандл: тянутся только используемые иконки и графики
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
