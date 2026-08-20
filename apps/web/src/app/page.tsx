import { dictionary } from "@/lib/dictionary";

export default function HomePage() {
  return (
    <main>
      <h1>{dictionary.home.title}</h1>
      <p>{dictionary.home.status}</p>
    </main>
  );
}
