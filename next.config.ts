import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Autorise l'accès au serveur de dev depuis un appareil du réseau local
  // (téléphone qui teste via l'IP LAN). On utilise des wildcards sur les
  // plages d'IP privées plutôt qu'une IP figée : le DHCP réassigne l'IP de la
  // machine (ex. .197 → .254) et une IP codée en dur casse l'hydratation
  // (ressources `/_next` bloquées cross-origin). Sans effet en production.
  // Chaque `*` matche un segment d'IP (cf. csrf-protection isCsrfOriginAllowed).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;
