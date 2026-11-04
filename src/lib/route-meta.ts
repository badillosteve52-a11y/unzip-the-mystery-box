export function routeMeta(nombre: string, descripcion: string) {
  const titulo = `${nombre} — Centro de Deportes ESPOCH`;
  return { meta: [
    { title: titulo },
    { name: "description", content: descripcion },
    { property: "og:title", content: titulo },
    { property: "og:description", content: descripcion },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] };
}