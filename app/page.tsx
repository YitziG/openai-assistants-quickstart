import Chat from "@/app/components/chat";

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Welcome to Yafutzu</h1>
      <Chat />
    </div>
  );
}