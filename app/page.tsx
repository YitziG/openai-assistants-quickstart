import Chat from "@/app/components/chat";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col">
      <div className="container mx-auto py-8 flex-grow flex flex-col">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 animate-fade-in-down">
            Welcome to Yafutzu
          </h1>
          <p className="text-lg text-white mb-4 animate-fade-in-up">
            Experience the future of AI-powered conversations
          </p>
          <Button className="bg-white text-purple-600 hover:bg-purple-100 transition-colors duration-300">
            Get Started
          </Button>
        </header>

        <div className="flex-grow flex items-center justify-center">
          <div className="w-full max-w-4xl animate-fade-in-up">
            <Chat />
          </div>
        </div>
      </div>
    </div>
  );
}