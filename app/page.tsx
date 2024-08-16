import Chat from "@/app/components/chat";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="container mx-auto py-12">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 animate-fade-in-down">
            Welcome to Yafutzu
          </h1>
          <p className="text-xl text-white mb-8 animate-fade-in-up">
            Experience the future of AI-powered conversations
          </p>
          <Button className="bg-white text-purple-600 hover:bg-purple-100 transition-colors duration-300">
            Get Started
          </Button>
        </header>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-4 animate-fade-in-left">
            <h2 className="text-3xl font-semibold text-white">Powerful AI Chat</h2>
            <p className="text-white">
              Engage in intelligent conversations, get answers to your questions, and explore new ideas with our advanced AI.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-xl p-6 animate-fade-in-right">
            <Chat />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-white">
          {['Natural Language', 'Real-time Responses', 'Continuous Learning'].map((feature, index) => (
            <div key={index} className="bg-white bg-opacity-20 rounded-lg p-6 backdrop-blur-lg animate-fade-in-up" style={{animationDelay: `${index * 0.2}s`}}>
              <h3 className="text-xl font-semibold mb-2">{feature}</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}