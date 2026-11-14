import type { NextConfig } from "next";

// Site 100 % statique, hébergeable sur GitHub Pages.
// Le chemin de base n'est appliqué qu'en production (défini par le workflow
// GitHub Actions) ; en local il reste vide pour que le dev serve à la racine.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
