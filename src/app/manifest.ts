import type { MetadataRoute } from "next";

/**
 * Манифест нужен ради одного: мастер добавляет CRM на домашний экран
 * и получает иконку, а не закладку. `display: standalone` убирает
 * адресную строку — визуально это приложение, а не сайт.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Честный сервис · CRM",
    short_name: "Честный сервис",
    description: "Заявки, мастера и аналитика сервиса ремонта бытовой техники",
    lang: "ru",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f7fb",
    theme_color: "#1550e4",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
